import React, { createContext, useState, useContext, ReactNode } from 'react';

// User ka type define karte hain
type User = {
    name: string;
    role: 'student' | 'club_admin' | 'Admin';
};

// Context ka type define karte hain
interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    // Test karne ke liye role badalne ka function
    switchRole: (role: 'student' | 'club_admin' | 'Admin') => void;
}

// Context banate hain
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component banate hain
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Shuru mein user ko 'student' set karte hain
    const [user, setUser] = useState<User | null>({ name: 'Yash Parse', role: 'student' });

    // Role badalne ki logic (sirf testing ke liye)
    const switchRole = (role: 'student' | 'club_admin' | 'Admin') => {
        setUser({ name: 'Yash Parse', role });
    };

    return (
        <AuthContext.Provider value={{ user, setUser, switchRole }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook banate hain, isse context use karna aasan ho jayega
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
