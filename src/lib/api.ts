const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:4000' 
    : 'https://hive-emd5.onrender.com');
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
    badges?: { id: string; name: string; icon: string }[];
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
    mediaUrl?: string;
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
    mediaUrl?: string;
    createdAt: string;
    author?: User | null;
}

export interface Channel {
    id: string;
    name: string;
    category: string;
    createdBy?: string | null;
    createdAt: string;
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
    certificateData?: string;
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

type DemoUser = User & {
    email: string;
    password: string;
};

type DemoClubApplication = ClubApplication & {
    password: string;
};

interface DemoDb {
    users: DemoUser[];
    sessions: Record<string, string>;
    otps: Record<string, string>;
    posts: Post[];
    events: HiveEvent[];
    stories: TopStory[];
    clubApplications: DemoClubApplication[];
    conversations: Conversation[];
    channelMessages: Record<string, ChannelMessage[]>;
    channels: Channel[];
    reports?: any[];
}

const DEMO_DB_STORAGE_KEY = 'hive-demo-db-v1';
const isHostedDemo = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io') && !import.meta.env.VITE_API_URL;

const nowIso = () => new Date().toISOString();

const readDemoDb = (): DemoDb => {
    const saved = localStorage.getItem(DEMO_DB_STORAGE_KEY);
    let parsed: DemoDb | null = null;
    if (saved) {
        try {
            parsed = JSON.parse(saved) as DemoDb;
        } catch {
            localStorage.removeItem(DEMO_DB_STORAGE_KEY);
        }
    }

    const defaultDb: DemoDb = {
        users: [],
        sessions: {},
        otps: {},
        posts: [],
        events: [],
        stories: [],
        clubApplications: [],
        conversations: [],
        channelMessages: { global: [], professional: [], placements: [] },
        channels: [
            { id: 'global', name: 'global-college-chat', category: 'academic', createdAt: nowIso() },
            { id: 'professional', name: 'professional-chats', category: 'academic', createdAt: nowIso() },
            { id: 'placements', name: 'placement-talks', category: 'academic', createdAt: nowIso() },
            { id: 'division-a', name: 'Division A Chat', category: 'academic', createdAt: nowIso() },
            { id: 'department-cs', name: 'Computer Science Chat', category: 'academic', createdAt: nowIso() },
            { id: 'year-3', name: 'Third Year Chat', category: 'academic', createdAt: nowIso() },
            { id: 'club-coding', name: 'Coding Club Chat', category: 'club', createdAt: nowIso() },
            { id: 'club-sports', name: 'Sports Club Chat', category: 'club', createdAt: nowIso() },
        ],
        reports: [],
    };

    if (parsed) {
        if (!parsed.channels || parsed.channels.length === 0) {
            parsed.channels = defaultDb.channels;
        }
        if (!parsed.reports) {
            parsed.reports = [];
        }
        return parsed;
    }

    return defaultDb;
};

const writeDemoDb = (db: DemoDb) => {
    localStorage.setItem(DEMO_DB_STORAGE_KEY, JSON.stringify(db));
};

const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase();

const isDemoCollegeEmail = (email: string) => {
    const domain = normalizeEmail(email).split('@')[1] || '';
    return domain === 'raisoni.net'
        || domain.endsWith('.raisoni.net')
        || domain === 'raisoni.edu'
        || domain.endsWith('.raisoni.edu')
        || domain === 'highschool.net'
        || domain.endsWith('.highschool.net')
        || domain.endsWith('.edu')
        || domain === 'ghrcem.edu'
        || domain.endsWith('.ghrcem.edu');
};

const createDemoId = (email: string, users: DemoUser[]) => {
    const base = normalizeEmail(email).split('@')[0].replace(/[^a-z0-9]/g, '') || 'user';
    let candidate = base;
    let suffix = 1;

    while (users.some((user) => user.id === candidate || user.handle === candidate)) {
        suffix += 1;
        candidate = `${base}${suffix}`;
    }

    return candidate;
};

const demoAvatar = (name: string) => `https://placehold.co/100x100/EFEFEF/333?text=${encodeURIComponent(name.slice(0, 2).toUpperCase())}`;

const publicDemoUser = (user?: DemoUser | null): User | null => {
    if (!user) return null;
    const { password, ...safeUser } = user;
    try {
        const db = readDemoDb();
        const postCount = (db.posts || []).filter((p) => p.authorId === user.id).length;
        const regCount = (db.events || []).filter((e) => e.registeredUserIds?.includes(user.id)).length;
        const msgCount = (db.conversations || []).reduce((acc, c) => acc + (c.participantIds?.includes(user.id) ? (c.messages || []).filter((m) => m.senderId === user.id).length : 0), 0);
        
        const badges: { id: string; name: string; icon: string }[] = [];
        if (regCount >= 5) badges.push({ id: 'event-explorer', name: 'Event Explorer', icon: '📅' });
        else if (regCount >= 1) badges.push({ id: 'early-joiner', name: 'Early Joiner', icon: '🌟' });

        if (postCount >= 15) badges.push({ id: 'top-contributor', name: 'Top Contributor', icon: '🔥' });
        else if (postCount >= 5) badges.push({ id: 'rising-writer', name: 'Rising Writer', icon: '✍️' });

        if (msgCount >= 20) badges.push({ id: 'social-butterfly', name: 'Social Butterfly', icon: '🦋' });

        if ((user.points || 0) >= 100) badges.push({ id: 'academic-elite', name: 'Academic Elite', icon: '🎓' });
        
        return { ...safeUser, badges };
    } catch {
        return safeUser;
    }
};

const publicDemoClubApplication = (application?: DemoClubApplication | null): ClubApplication | null => {
    if (!application) return null;
    const { password, ...safeApplication } = application;
    return safeApplication;
};

const createDemoUser = (db: DemoDb, email: string, password: string, name?: string, role: UserRole = 'student') => {
    const normalizedEmail = normalizeEmail(email);
    const userName = String(name || normalizedEmail.split('@')[0] || 'HIVE User').trim();
    const id = createDemoId(normalizedEmail, db.users);
    const user: DemoUser = {
        id,
        name: userName,
        email: normalizedEmail,
        password,
        role,
        handle: id,
        bio: '',
        avatarUrl: demoAvatar(userName),
        coverUrl: 'https://placehold.co/600x200/374151/E5E7EB?text=Cover+Photo',
        points: 0,
        blockedAt: null,
        followers: [],
        following: [],
    };

    db.users.push(user);
    return user;
};

const createDemoSession = (db: DemoDb, user: DemoUser) => {
    const token = `demo-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    db.sessions[token] = user.id;
    return token;
};

const requireDemoUser = (db: DemoDb) => {
    const token = getAuthToken();
    const userId = token ? db.sessions[token] : '';
    const user = db.users.find((candidate) => candidate.id === userId);

    if (!user || user.blockedAt) {
        throw new Error('Authentication required');
    }

    return user;
};

const demoPost = (db: DemoDb, post: Post): Post => {
    const author = publicDemoUser(db.users.find((user) => user.id === post.authorId));
    const comments = (post.comments || []).map((comment) => ({
        ...comment,
        author: publicDemoUser(db.users.find((user) => user.id === comment.authorId)),
    }));

    return {
        ...post,
        author,
        comments,
        likesCount: post.likes?.length || 0,
        savedCount: post.savedBy?.length || 0,
        commentsCount: comments.length,
    };
};

const demoEvent = (db: DemoDb, event: HiveEvent): HiveEvent => ({
    ...event,
    organizerUser: publicDemoUser(db.users.find((user) => user.id === event.organizerId)),
    registeredCount: event.registeredUserIds.length,
});

const conversationIdFor = (userA: string, userB: string) => `chat-${[userA, userB].sort().join('-')}`;

const demoReply = (message: string, user: DemoUser) => {
    const text = String(message || '').trim().toLowerCase();
    if (text.includes('event')) return `There are ${readDemoDb().events.length} demo events right now.`;
    if (text.includes('point') || text.includes('leaderboard')) return `You have ${user.points || 0} points in this demo browser.`;
    if (text.includes('post') || text.includes('like')) return 'Demo feed is local to this browser. You can create, like, save, and comment.';
    if (text.includes('chat')) return 'Social Chat stores demo channel messages in this browser.';
    return 'This hosted GitHub Pages demo uses local browser storage. Create a college-email account, explore the UI, and deploy the backend later for a shared database.';
};

async function demoRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const db = readDemoDb();
    const method = String(options.method || 'GET').toUpperCase();
    const url = new URL(path, window.location.origin);
    const parts = url.pathname.split('/').filter(Boolean);
    const body = (options.body || {}) as Record<string, string | number | boolean | undefined>;

    const finish = <R,>(payload: R): R => {
        writeDemoDb(db);
        return payload;
    };

    if (url.pathname === '/api/auth/request-otp' && method === 'POST') {
        const email = normalizeEmail(String(body.email || ''));
        if (!isDemoCollegeEmail(email)) throw new Error('Use your college email address to continue');
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        db.otps[email] = otp;
        return finish({
            ok: true,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            delivery: 'development',
            devOtp: otp,
            message: 'Demo OTP created and filled automatically.',
        } as T);
    }

    if (url.pathname === '/api/auth/student/set-password' && method === 'POST') {
        const email = normalizeEmail(String(body.email || ''));
        if (!isDemoCollegeEmail(email)) throw new Error('Use your college email address to continue');
        if (db.otps[email] !== String(body.otp || '').trim()) throw new Error('Invalid OTP');
        let user = db.users.find((candidate) => candidate.email === email);
        if (user) {
            user.password = String(body.password || '');
            user.name = String(body.name || user.name);
        } else {
            user = createDemoUser(db, email, String(body.password || ''), String(body.name || ''), 'student');
        }
        delete db.otps[email];
        const token = createDemoSession(db, user);
        return finish({ token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), user: publicDemoUser(user) } as T);
    }

    if ((url.pathname === '/api/auth/login' || url.pathname === '/api/auth/student-login') && method === 'POST') {
        const email = normalizeEmail(String(body.email || ''));
        const user = db.users.find((candidate) => candidate.email === email);
        if (!user) throw new Error('Account not found. Use Forgot Password to verify email and set your password.');
        if (user.blockedAt) throw new Error('This account is blocked. Contact college admin.');
        if (user.password !== String(body.password || '')) throw new Error('Invalid email or password');
        const token = createDemoSession(db, user);
        return finish({ token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), user: publicDemoUser(user) } as T);
    }

    if (url.pathname === '/api/auth/admin-login' && method === 'POST') {
        if (String(body.adminId || '').trim() !== 'admin' || String(body.password || '') !== 'admin123') {
            throw new Error('Invalid admin ID or password');
        }
        let admin = db.users.find((user) => user.id === 'college-admin');
        if (!admin) admin = createDemoUser(db, 'college.admin@ghrcemp.raisoni.net', 'admin123', 'College Admin', 'Admin');
        admin.role = 'Admin';
        const token = createDemoSession(db, admin);
        return finish({ token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), user: publicDemoUser(admin) } as T);
    }

    if (url.pathname === '/api/auth/club/register' && method === 'POST') {
        const email = normalizeEmail(String(body.email || ''));
        if (!isDemoCollegeEmail(email)) throw new Error('Use your club official college email');
        if (!body.clubName || !body.certificateName || !body.certificateData) throw new Error('Club name and registration certificate are required');
        if (db.users.some((user) => user.email === email)) throw new Error('This email already belongs to another HIVE account.');
        let application = db.clubApplications.find((candidate) => candidate.officialEmail === email);
        if (!application) {
            application = {
                id: crypto.randomUUID(),
                clubName: String(body.clubName),
                officialEmail: email,
                password: String(body.password || ''),
                certificateName: String(body.certificateName),
                status: 'pending',
                submittedAt: nowIso(),
                reviewedAt: null,
                reviewedBy: null,
                note: '',
            };
            db.clubApplications.push(application);
        } else {
            application.clubName = String(body.clubName);
            application.password = String(body.password || '');
            application.certificateName = String(body.certificateName);
            application.status = 'pending';
            application.submittedAt = nowIso();
        }
        return finish({ application: publicDemoClubApplication(application) } as T);
    }

    if (url.pathname === '/api/auth/club/status' && method === 'GET') {
        const email = normalizeEmail(url.searchParams.get('email') || '');
        const user = db.users.find((candidate) => candidate.email === email && candidate.role === 'club_admin');
        if (user) return finish({ status: 'approved', user: publicDemoUser(user) } as T);
        const application = db.clubApplications.find((candidate) => candidate.officialEmail === email);
        if (!application) throw new Error('No club verification request found');
        return finish({ status: application.status, application: publicDemoClubApplication(application) } as T);
    }

    if (url.pathname === '/api/auth/google' && method === 'POST') throw new Error('Google login is disabled in hosted demo mode.');

    if (url.pathname === '/api/auth/logout' && method === 'POST') {
        const token = getAuthToken();
        if (token) delete db.sessions[token];
        return finish({ ok: true } as T);
    }

    if (url.pathname === '/api/auth/me' && method === 'GET') {
        return finish({ user: publicDemoUser(requireDemoUser(db)) } as T);
    }

    if (url.pathname === '/api/users/online' && method === 'GET') {
        const demoOnline = ['arjun', 'tausif', 'founder'];
        const token = getAuthToken();
        const currentUser = token ? db.sessions[token] : null;
        if (currentUser) demoOnline.push(currentUser);
        return finish({ success: true, onlineUserIds: Array.from(new Set(demoOnline)) } as T);
    }

    if (url.pathname === '/api/users/me' && method === 'PATCH') {
        const user = requireDemoUser(db);
        user.name = String(body.name || user.name);
        user.bio = String(body.bio ?? user.bio ?? '');
        user.avatarUrl = String(body.avatarUrl ?? user.avatarUrl ?? '');
        user.coverUrl = String(body.coverUrl ?? user.coverUrl ?? '');
        return finish({ user: publicDemoUser(user) } as T);
    }

    if (url.pathname === '/api/users' && method === 'GET') return finish({ users: db.users.map(publicDemoUser) } as T);

    if (parts[0] === 'api' && parts[1] === 'users' && parts[2] && method === 'GET') {
        const user = db.users.find((candidate) => candidate.id === parts[2] || candidate.handle === parts[2]);
        if (!user) throw new Error('Not found');
        return finish({ user: publicDemoUser(user) } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'users' && parts[3] === 'follow' && method === 'POST') {
        const currentUser = requireDemoUser(db);
        const targetUser = db.users.find((candidate) => candidate.id === parts[2]);
        if (!targetUser) throw new Error('Not found');
        currentUser.following = Array.from(new Set([...(currentUser.following || []), targetUser.id]));
        targetUser.followers = Array.from(new Set([...(targetUser.followers || []), currentUser.id]));
        return finish({ user: publicDemoUser(targetUser), currentUser: publicDemoUser(currentUser) } as T);
    }

    if (url.pathname === '/api/posts' && method === 'GET') {
        return finish({ posts: db.posts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((post) => demoPost(db, post)) } as T);
    }

    if (url.pathname === '/api/posts' && method === 'POST') {
        const user = requireDemoUser(db);
        if (!body.content && !body.mediaUrl) throw new Error('content or mediaUrl is required');
        const post: Post = {
            id: crypto.randomUUID(),
            authorId: user.id,
            content: String(body.content || ''),
            mediaUrl: String(body.mediaUrl || ''),
            likes: [],
            savedBy: [],
            comments: [],
            likesCount: 0,
            savedCount: 0,
            commentsCount: 0,
            createdAt: nowIso(),
        };
        db.posts.unshift(post);
        return finish({ post: demoPost(db, post) } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'posts' && parts[2]) {
        const user = requireDemoUser(db);
        const post = db.posts.find((candidate) => candidate.id === parts[2]);
        if (!post) throw new Error('Not found');

        if (!parts[3]) {
            if (method === 'DELETE') {
                if (post.authorId !== user.id && user.role !== 'Admin') throw new Error('Forbidden');
                db.posts = db.posts.filter((candidate) => candidate.id !== parts[2]);
                writeDemoDb(db);
                return finish({ ok: true } as T);
            }
            if (method === 'PATCH') {
                if (post.authorId !== user.id) throw new Error('Forbidden');
                post.content = String(body.content || '');
                writeDemoDb(db);
                return finish({ post: demoPost(db, post) } as T);
            }
        }

        if (parts[3] === 'like' && method === 'POST') {
            post.likes = post.likes.includes(user.id) ? post.likes.filter((id) => id !== user.id) : [...post.likes, user.id];
            return finish({ post: demoPost(db, post) } as T);
        }
        if (parts[3] === 'save' && method === 'POST') {
            post.savedBy = post.savedBy.includes(user.id) ? post.savedBy.filter((id) => id !== user.id) : [...post.savedBy, user.id];
            return finish({ post: demoPost(db, post) } as T);
        }
        if (parts[3] === 'comments' && method === 'POST') {
            const comment: PostComment = { id: crypto.randomUUID(), authorId: user.id, content: String(body.content || ''), createdAt: nowIso() };
            post.comments.push(comment);
            return finish({ post: demoPost(db, post), comment } as T);
        }
    }

    if (url.pathname === '/api/events' && method === 'GET') return finish({ events: db.events.map((event) => demoEvent(db, event)) } as T);

    if (url.pathname === '/api/events' && method === 'POST') {
        const user = requireDemoUser(db);
        if (!['club_admin', 'Admin'].includes(user.role)) throw new Error('Only club admins can create events');
        const event: HiveEvent = {
            id: crypto.randomUUID(),
            title: String(body.title || ''),
            description: String(body.description || ''),
            category: String(body.category || 'General'),
            date: String(body.date || nowIso()),
            venue: String(body.venue || ''),
            organizer: String(body.organizer || user.name),
            organizerId: user.id,
            capacity: Number(body.capacity || 100),
            points: Number(body.points || 0),
            imageUrl: String(body.imageUrl || 'https://placehold.co/400x200/cccccc/ffffff?text=Event+Image'),
            registeredUserIds: [],
            registeredCount: 0,
            createdAt: nowIso(),
        };
        db.events.push(event);
        return finish({ event: demoEvent(db, event) } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'events' && parts[2] && method === 'GET') {
        const event = db.events.find((candidate) => candidate.id === parts[2]);
        if (!event) throw new Error('Not found');
        return finish({ event: demoEvent(db, event) } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'events' && parts[3] === 'register' && method === 'POST') {
        const user = requireDemoUser(db);
        const event = db.events.find((candidate) => candidate.id === parts[2]);
        if (!event) throw new Error('Not found');
        if (!event.registeredUserIds.includes(user.id)) {
            event.registeredUserIds.push(user.id);
            user.points = Number(user.points || 0) + Number(event.points || 0);
        }
        return finish({ event: demoEvent(db, event), user: publicDemoUser(user) } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'events' && parts[3] === 'attendance' && method === 'POST') {
        const user = requireDemoUser(db);
        if (!['club_admin', 'Admin'].includes(user.role)) throw new Error('Forbidden');
        const event = db.events.find((candidate) => candidate.id === parts[2]);
        if (!event) throw new Error('Event not found');
        const targetUser = db.users.find((candidate) => candidate.id === body.userId || candidate.handle === body.userId);
        if (!targetUser) throw new Error('Student not found. Double check their student ID/username.');
        
        if (!event.registeredUserIds.includes(targetUser.id)) {
            event.registeredUserIds.push(targetUser.id);
            targetUser.points = Number(targetUser.points || 0) + Number(event.points || 0);
        }
        return finish({
            success: true,
            event: demoEvent(db, event),
            user: publicDemoUser(targetUser)
        } as T);
    }

    if (url.pathname === '/api/leaderboard' && method === 'GET') {
        return finish({ users: db.users.slice().sort((a, b) => Number(b.points || 0) - Number(a.points || 0)).map((user, index) => ({ ...publicDemoUser(user), rank: index + 1 })) } as T);
    }

    if (url.pathname === '/api/conversations' && method === 'GET') {
        const user = requireDemoUser(db);
        const conversations = db.conversations
            .filter((candidate) => candidate.participantIds.includes(user.id))
            .map((convo) => {
                const otherId = convo.participantIds.find((id) => id !== user.id);
                const otherUser = db.users.find((u) => u.id === otherId);
                return {
                    ...convo,
                    otherUser: publicDemoUser(otherUser),
                };
            })
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return finish({ conversations } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'conversations' && parts[2] && method === 'GET') {
        const user = requireDemoUser(db);
        const otherUser = db.users.find((candidate) => candidate.id === parts[2]);
        if (!otherUser) throw new Error('Not found');
        const id = conversationIdFor(user.id, otherUser.id);
        let conversation = db.conversations.find((candidate) => candidate.id === id);
        if (!conversation) {
            conversation = { id, participantIds: [user.id, otherUser.id], messages: [], updatedAt: nowIso() };
            db.conversations.push(conversation);
        }
        return finish({ conversation } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'conversations' && parts[3] === 'messages' && method === 'POST') {
        const user = requireDemoUser(db);
        const conversation = db.conversations.find((candidate) => candidate.id === parts[2]);
        if (!conversation || !conversation.participantIds.includes(user.id)) throw new Error('Not found');
        const message: ConversationMessage = { 
            id: crypto.randomUUID(), 
            senderId: user.id, 
            content: String(body.content || ''), 
            mediaUrl: String(body.mediaUrl || ''), 
            createdAt: nowIso() 
        };
        conversation.messages.push(message);
        conversation.updatedAt = message.createdAt;

        // Dispatch local event for real-time behavior in demo mode
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('demo-message', {
                detail: { conversationId: conversation.id, message }
            }));
        }

        return finish({ conversation, message } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'conversations' && parts[3] === 'typing' && method === 'POST') {
        const user = requireDemoUser(db);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('demo-typing', {
                detail: {
                    conversationId: parts[2],
                    userId: user.id,
                    name: user.name,
                    isTyping: Boolean(body.isTyping),
                }
            }));
        }
        return finish({ ok: true } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'chat' && parts[2] === 'channels' && parts[3] && parts[4] === 'messages') {
        const user = requireDemoUser(db);
        const channelId = parts[3];
        db.channelMessages[channelId] = db.channelMessages[channelId] || [];
        if (method === 'GET') return finish({ messages: db.channelMessages[channelId] } as T);
        if (method === 'POST') {
            const message: ChannelMessage = { 
                id: crypto.randomUUID(), 
                channelId, 
                senderId: user.id, 
                content: String(body.content || ''), 
                mediaUrl: String(body.mediaUrl || ''), 
                createdAt: nowIso(), 
                author: publicDemoUser(user) 
            };
            db.channelMessages[channelId].push(message);

            // Dispatch local event for real-time behavior in demo mode
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('demo-channel-message', {
                    detail: { channelId, message }
                }));
            }

            return finish({ messages: db.channelMessages[channelId], message } as T);
        }
    }

    if (url.pathname === '/api/assistant/message' && method === 'POST') {
        const user = requireDemoUser(db);
        return finish({ reply: { id: `assistant-${Date.now()}`, sender: 'assistant', content: demoReply(String(body.message || ''), user), createdAt: nowIso() } } as T);
    }

    if (url.pathname === '/api/stories' && method === 'GET') return finish({ stories: db.stories } as T);

    if (url.pathname === '/api/stories' && method === 'POST') {
        const user = requireDemoUser(db);
        if (user.role !== 'Admin') throw new Error('You do not have permission for this action');
        const story: TopStory = { id: crypto.randomUUID(), title: String(body.title || ''), summary: String(body.summary || ''), body: String(body.body || body.summary || ''), category: String(body.category || 'Official'), authorId: user.id, createdAt: nowIso(), author: publicDemoUser(user) };
        db.stories.unshift(story);
        return finish({ story } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'stories' && parts[2] && method === 'GET') {
        const story = db.stories.find((candidate) => candidate.id === parts[2]);
        if (!story) throw new Error('Not found');
        return finish({ story } as T);
    }

    if (url.pathname === '/api/admin/users' && method === 'GET') {
        const user = requireDemoUser(db);
        if (user.role !== 'Admin') throw new Error('You do not have permission for this action');
        return finish({ users: db.users.map(publicDemoUser) } as T);
    }

    if (url.pathname === '/api/admin/club-applications' && method === 'GET') {
        const user = requireDemoUser(db);
        if (user.role !== 'Admin') throw new Error('You do not have permission for this action');
        return finish({ applications: db.clubApplications.map(publicDemoClubApplication) } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'admin' && parts[2] === 'club-applications' && parts[4] === 'review' && method === 'PATCH') {
        const user = requireDemoUser(db);
        if (user.role !== 'Admin') throw new Error('You do not have permission for this action');
        const application = db.clubApplications.find((candidate) => candidate.id === parts[3]);
        if (!application) throw new Error('Not found');
        application.status = String(body.status || 'pending') as ClubApplication['status'];
        application.reviewedAt = nowIso();
        application.reviewedBy = user.id;
        if (application.status === 'approved') {
            let clubUser = db.users.find((candidate) => candidate.email === application.officialEmail);
            if (!clubUser) clubUser = createDemoUser(db, application.officialEmail, application.password, application.clubName, 'club_admin');
            clubUser.role = 'club_admin';
            clubUser.password = application.password;
            clubUser.name = application.clubName;
        }
        return finish({ application: publicDemoClubApplication(application) } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'admin' && parts[2] === 'users' && parts[3]) {
        const admin = requireDemoUser(db);
        if (admin.role !== 'Admin') throw new Error('You do not have permission for this action');
        const targetUser = db.users.find((candidate) => candidate.id === parts[3]);
        if (!targetUser) throw new Error('Not found');
        if (parts[4] === 'role' && method === 'PATCH') {
            targetUser.role = String(body.role || targetUser.role) as UserRole;
            return finish({ user: publicDemoUser(targetUser) } as T);
        }
        if (parts[4] === 'block' && method === 'PATCH') {
            targetUser.blockedAt = body.blocked ? nowIso() : null;
            return finish({ user: publicDemoUser(targetUser) } as T);
        }
        if (method === 'DELETE') {
            db.users = db.users.filter((candidate) => candidate.id !== targetUser.id);
            return finish({ ok: true } as T);
        }
    }

    if (parts[0] === 'api' && parts[1] === 'posts' && parts[3] === 'report' && method === 'POST') {
        const user = requireDemoUser(db);
        db.reports = db.reports || [];
        const report = {
            id: crypto.randomUUID(),
            postId: parts[2],
            reportedBy: user.id,
            reason: String(body.reason || ''),
            createdAt: nowIso()
        };
        db.reports.push(report);
        return finish({ success: true, report } as T);
    }

    if (url.pathname === '/api/admin/reports' && method === 'GET') {
        const user = requireDemoUser(db);
        if (user.role !== 'Admin') throw new Error('Forbidden');
        db.reports = db.reports || [];
        const results = db.reports.map((r: any) => {
            const post = db.posts.find((p) => p.id === r.postId) || { content: '[Deleted Post]', authorId: '' };
            const postAuthor = db.users.find((u) => u.id === post.authorId);
            const reporter = db.users.find((u) => u.id === r.reportedBy);
            return {
                id: r.id,
                postId: r.postId,
                postContent: post.content,
                postAuthor: publicDemoUser(postAuthor),
                reportedBy: r.reportedBy,
                reporterName: reporter?.name || 'User',
                reporterHandle: reporter?.handle || r.reportedBy,
                reason: r.reason,
                createdAt: r.createdAt
            };
        });
        return finish({ reports: results } as T);
    }

    if (parts[0] === 'api' && parts[1] === 'admin' && parts[2] === 'reports' && parts[3] && method === 'DELETE') {
        const user = requireDemoUser(db);
        if (user.role !== 'Admin') throw new Error('Forbidden');
        db.reports = db.reports || [];
        db.reports = db.reports.filter((r: any) => r.id !== parts[3]);
        return finish({ ok: true } as T);
    }

    throw new Error('Demo route is not available yet');
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (isHostedDemo) {
        return demoRequest<T>(path, options);
    }

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

export const getOnlineUsers = () =>
    apiRequest<{ success: boolean; onlineUserIds: string[] }>('/api/users/online');

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

export const deletePost = (postId: string) =>
    apiRequest<{ ok: boolean }>(`/api/posts/${postId}`, {
        method: 'DELETE',
    });

export const updatePost = (postId: string, content: string) =>
    apiRequest<{ post: Post }>(`/api/posts/${postId}`, {
        method: 'PATCH',
        body: { content },
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

export const getConversations = () =>
    apiRequest<{ conversations: (Conversation & { otherUser?: User | null })[] }>('/api/conversations');

export const getConversation = (otherUserId: string) =>
    apiRequest<{ conversation: Conversation }>(`/api/conversations/${otherUserId}`);

export const sendConversationMessage = (conversationId: string, content: string, mediaUrl?: string) =>
    apiRequest<{ conversation: Conversation; message: ConversationMessage }>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content, mediaUrl },
    });

export const sendTypingStatus = (conversationId: string, isTyping: boolean) =>
    apiRequest<{ ok: boolean }>(`/api/conversations/${conversationId}/typing`, {
        method: 'POST',
        body: { isTyping },
    });

export const getChannels = () =>
    apiRequest<{ channels: Channel[] }>('/api/chat/channels');

export const createChannel = (body: { name: string; category: string }) =>
    apiRequest<{ channel: Channel }>('/api/chat/channels', {
        method: 'POST',
        body,
    });

export const getChannelMessages = (channelId: string) =>
    apiRequest<{ messages: ChannelMessage[] }>(`/api/chat/channels/${channelId}/messages`);

export const sendChannelMessage = (channelId: string, content: string, mediaUrl?: string) =>
    apiRequest<{ messages: ChannelMessage[]; message: ChannelMessage }>(`/api/chat/channels/${channelId}/messages`, {
        method: 'POST',
        body: { content, mediaUrl },
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

export const verifyEventAttendance = (eventId: string, userId: string) =>
    apiRequest<{ success: boolean; event: HiveEvent; user: User }>(`/api/events/${eventId}/attendance`, {
        method: 'POST',
        body: { userId },
    });

export const reportPost = (postId: string, reason: string) =>
    apiRequest<{ success: boolean; report: any }>(`/api/posts/${postId}/report`, {
        method: 'POST',
        body: { reason },
    });

export const getAdminReports = () =>
    apiRequest<{ reports: any[] }>('/api/admin/reports');

export const deleteAdminReport = (reportId: string) =>
    apiRequest<{ ok: boolean }>(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
    });
