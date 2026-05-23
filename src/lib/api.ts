const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_STORAGE_KEY = 'hive-token';

export type UserRole = 'student' | 'club_admin' | 'Admin';

export interface User {
    id: string;
    name: string;
    email?: string;
    role: UserRole;
    handle?: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
    points?: number;
    blockedAt?: string | null;
    followers?: string[];
    following?: string[];
}

export interface AuthResponse {
    token: string;
    expiresAt?: string;
    user: User;
}

export interface OtpResponse {
    ok: boolean;
    expiresAt: string;
    delivery?: string;
    devOtp?: string;
    message: string;
}

export interface PostComment {
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
    author?: User | null;
}

export interface Post {
    id: string;
    authorId: string;
    content: string;
    mediaUrl?: string;
    likes: string[];
    savedBy: string[];
    comments: PostComment[];
    createdAt: string;
    author?: User | null;
    likesCount: number;
    savedCount: number;
    commentsCount: number;
}

export interface HiveEvent {
    id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    venue: string;
    organizer: string;
    organizerId: string;
    capacity: number;
    points: number;
    imageUrl: string;
    registeredUserIds: string[];
    registeredCount: number;
    createdAt: string;
    organizerUser?: User | null;
}

export interface LeaderboardUser extends User {
    rank: number;
}

export interface ConversationMessage {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
}

export interface Conversation {
    id: string;
    participantIds: string[];
    messages: ConversationMessage[];
    updatedAt: string;
}

export interface ChannelMessage {
    id: string;
    channelId: string;
    senderId: string;
    content: string;
    createdAt: string;
    author?: User | null;
}

export interface AssistantReply {
    id: string;
    sender: 'assistant';
    content: string;
    createdAt: string;
}

export interface TopStory {
    id: string;
    title: string;
    summary: string;
    body: string;
    category: string;
    authorId?: string | null;
    createdAt: string;
    author?: User | null;
}

export interface ClubApplication {
    id: string;
    clubName: string;
    officialEmail: string;
    certificateName: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    note?: string;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
    body?: unknown;
};

export const roleHomePath = (role: UserRole) => {
    if (role === 'Admin') return '/admin';
    if (role === 'club_admin') return '/club';
    return '/';
};

export const getAuthToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const setAuthToken = (token: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = getAuthToken();
    const headers = new Headers(options.headers);

    if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = typeof payload.error === 'string' ? payload.error : 'Something went wrong';
        throw new Error(message);
    }

    return payload as T;
}

export const loginUser = (email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
    });

export const registerUser = (name: string, email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
    });

export const setStudentPasswordWithOtp = (body: { email: string; otp: string; password: string; name?: string }) =>
    apiRequest<AuthResponse>('/api/auth/student/set-password', {
        method: 'POST',
        body,
    });

export const googleLogin = (idToken: string) =>
    apiRequest<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: { idToken },
    });

export const clubLogin = (email: string, password: string) =>
    apiRequest<AuthResponse & { application?: ClubApplication }>('/api/auth/club-login', {
        method: 'POST',
        body: { email, password },
    });

export const registerClub = (body: {
    clubName: string;
    email: string;
    password: string;
    certificateName: string;
    certificateData: string;
}) =>
    apiRequest<{ application: ClubApplication }>('/api/auth/club/register', {
        method: 'POST',
        body,
    });

export const getClubStatus = (email: string) =>
    apiRequest<{ status: ClubApplication['status']; application?: ClubApplication; user?: User }>(`/api/auth/club/status?email=${encodeURIComponent(email)}`);

export const adminLogin = (adminId: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/admin-login', {
        method: 'POST',
        body: { adminId, password },
    });

export const requestLoginOtp = (email: string) =>
    apiRequest<OtpResponse>('/api/auth/request-otp', {
        method: 'POST',
        body: { email },
    });

export const verifyLoginOtp = (body: { email: string; otp: string; name?: string }) =>
    apiRequest<AuthResponse>('/api/auth/verify-otp', {
        method: 'POST',
        body,
    });

export const logoutUser = () =>
    apiRequest<{ ok: boolean }>('/api/auth/logout', {
        method: 'POST',
    });

export const getCurrentUser = () =>
    apiRequest<{ user: User }>('/api/auth/me');

export const updateCurrentUserProfile = (body: { name: string; bio?: string; avatarUrl?: string; coverUrl?: string }) =>
    apiRequest<{ user: User }>('/api/users/me', {
        method: 'PATCH',
        body,
    });

export const getUser = (userId: string) =>
    apiRequest<{ user: User }>(`/api/users/${userId}`);

export const followUser = (userId: string) =>
    apiRequest<{ user: User; currentUser: User }>(`/api/users/${userId}/follow`, {
        method: 'POST',
    });

export const getPosts = () =>
    apiRequest<{ posts: Post[] }>('/api/posts');

export const createPost = (body: { content: string; mediaUrl?: string }) =>
    apiRequest<{ post: Post }>('/api/posts', {
        method: 'POST',
        body,
    });

export const likePost = (postId: string) =>
    apiRequest<{ post: Post }>(`/api/posts/${postId}/like`, {
        method: 'POST',
    });

export const savePost = (postId: string) =>
    apiRequest<{ post: Post }>(`/api/posts/${postId}/save`, {
        method: 'POST',
    });

export const addPostComment = (postId: string, content: string) =>
    apiRequest<{ post: Post; comment: PostComment }>(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: { content },
    });

export const getEvents = () =>
    apiRequest<{ events: HiveEvent[] }>('/api/events');

export const getEvent = (eventId: string) =>
    apiRequest<{ event: HiveEvent }>(`/api/events/${eventId}`);

export const createEvent = (body: {
    title: string;
    description?: string;
    category?: string;
    date: string;
    venue: string;
    organizer?: string;
    capacity?: number;
    points?: number;
    imageUrl?: string;
}) =>
    apiRequest<{ event: HiveEvent }>('/api/events', {
        method: 'POST',
        body,
    });

export const registerForEvent = (eventId: string) =>
    apiRequest<{ event: HiveEvent; user: User }>(`/api/events/${eventId}/register`, {
        method: 'POST',
    });

export const getLeaderboard = () =>
    apiRequest<{ users: LeaderboardUser[] }>('/api/leaderboard');

export const getConversation = (otherUserId: string) =>
    apiRequest<{ conversation: Conversation }>(`/api/conversations/${otherUserId}`);

export const sendConversationMessage = (conversationId: string, content: string) =>
    apiRequest<{ conversation: Conversation; message: ConversationMessage }>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content },
    });

export const getChannelMessages = (channelId: string) =>
    apiRequest<{ messages: ChannelMessage[] }>(`/api/chat/channels/${channelId}/messages`);

export const sendChannelMessage = (channelId: string, content: string) =>
    apiRequest<{ messages: ChannelMessage[]; message: ChannelMessage }>(`/api/chat/channels/${channelId}/messages`, {
        method: 'POST',
        body: { content },
    });

export const askAssistant = (message: string) =>
    apiRequest<{ reply: AssistantReply }>('/api/assistant/message', {
        method: 'POST',
        body: { message },
    });

export const getTopStories = () =>
    apiRequest<{ stories: TopStory[] }>('/api/stories');

export const createTopStory = (body: { title: string; summary: string; body?: string; category?: string }) =>
    apiRequest<{ story: TopStory }>('/api/stories', {
        method: 'POST',
        body,
    });

export const getAdminUsers = () =>
    apiRequest<{ users: User[] }>('/api/admin/users');

export const getClubApplications = () =>
    apiRequest<{ applications: ClubApplication[] }>('/api/admin/club-applications');

export const reviewClubApplication = (applicationId: string, status: 'approved' | 'rejected', note?: string) =>
    apiRequest<{ application: ClubApplication }>(`/api/admin/club-applications/${applicationId}/review`, {
        method: 'PATCH',
        body: { status, note },
    });

export const updateAdminUserRole = (userId: string, role: UserRole) =>
    apiRequest<{ user: User }>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: { role },
    });

export const setAdminUserBlocked = (userId: string, blocked: boolean) =>
    apiRequest<{ user: User }>(`/api/admin/users/${userId}/block`, {
        method: 'PATCH',
        body: { blocked },
    });

export const deleteAdminUser = (userId: string) =>
    apiRequest<{ ok: boolean }>(`/api/admin/users/${userId}`, {
        method: 'DELETE',
    });
