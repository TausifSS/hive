import { createContext, useEffect, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import { clearAuthToken, getAuthToken, getCurrentUser, logoutUser, setAuthToken, getConversations } from '../lib/api';
import type { User } from '../lib/api';

const USER_STORAGE_KEY = 'hive-user';

interface AuthContextType {
    user: User | null;
    isAuthLoading: boolean;
    setUser: (user: User | null) => void;
    login: (user: User, token?: string) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    unreadCount: number;
    refreshUnread: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialUser = () => {
    const token = getAuthToken();
    if (!token) {
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
    }
    if (token.length < 40) {
        clearAuthToken();
        localStorage.removeItem(USER_STORAGE_KEY);
        return null;
    }

    const savedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (savedUser) {
        try {
            return JSON.parse(savedUser) as User;
        } catch {
            localStorage.removeItem(USER_STORAGE_KEY);
        }
    }

    return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUserState] = useState<User | null>(getInitialUser);
    const [isAuthLoading, setIsAuthLoading] = useState(Boolean(getAuthToken()));
    const [unreadCount, setUnreadCount] = useState(0);

    const setUser = (nextUser: User | null) => {
        setUserState(nextUser);
        if (nextUser) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
        } else {
            localStorage.removeItem(USER_STORAGE_KEY);
        }
    };

    const login = (nextUser: User, token = nextUser.id) => {
        setAuthToken(token);
        setUser(nextUser);
    };

    const logout = () => {
        void logoutUser().catch(() => undefined);
        clearAuthToken();
        setUser(null);
    };

    const refreshUser = async () => {
        const token = getAuthToken();
        if (!token) {
            setUser(null);
            setIsAuthLoading(false);
            return;
        }

        try {
            const response = await getCurrentUser();
            setUser(response.user);
        } catch {
            clearAuthToken();
            setUser(null);
        } finally {
            setIsAuthLoading(false);
        }
    };

    const refreshUnread = async () => {
        if (!user) {
            setUnreadCount(0);
            return;
        }
        try {
            const response = await getConversations();
            let count = 0;
            for (const convo of response.conversations) {
                if (convo.messages && convo.messages.length > 0) {
                    const lastMsg = convo.messages[convo.messages.length - 1];
                    if (lastMsg.senderId !== user.id) {
                        const readTime = localStorage.getItem(`convo-read-${convo.id}`);
                        if (!readTime) {
                            count++;
                        } else {
                            const lastMsgTime = new Date(lastMsg.createdAt).getTime();
                            const readTimeMs = new Date(readTime).getTime();
                            if (lastMsgTime > readTimeMs) {
                                count++;
                            }
                        }
                    }
                }
            }
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to check unread messages:', error);
        }
    };

    useEffect(() => {
        void refreshUser();
    }, []);

    useEffect(() => {
        if (user) {
            void refreshUnread();
            const interval = setInterval(() => {
                void refreshUnread();
            }, 6000);
            return () => clearInterval(interval);
        } else {
            setUnreadCount(0);
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, isAuthLoading, setUser, login, logout, refreshUser, unreadCount, refreshUnread }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
