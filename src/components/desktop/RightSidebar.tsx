import React from 'react';
import { UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom'; // Link import kiya
import { useAuth } from '../../context/AuthContext';

const roleLabels = {
    student: 'Student',
    club_admin: 'Club Lead / Teacher',
    Admin: 'College Admin',
};

const RightSidebar = () => {
    const { user, logout } = useAuth();

    return (
        <aside style={styles.sidebar}>
            {/* Profile Section - Ab yeh poora section ek link hai */}
            <Link to="/PCprofile" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={styles.profileContainer}>
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} style={styles.profileAvatar} />
                    ) : (
                        <UserCircle size={56} color="#4B5563" strokeWidth={1} />
                    )}
                    <div>
                        <p style={styles.profileName}>{user?.name || 'HIVE User'}</p>
                        <p style={styles.profileHandle}>@{user?.handle || user?.id}</p>
                    </div>
                </div>
            </Link>

            <div style={styles.suggestionsContainer}>
                <div style={styles.suggestionsHeader}>
                    <p style={styles.suggestionsTitle}>{roleLabels[user?.role || 'student']}</p>
                    <button onClick={logout} style={styles.seeAllLink}>Logout</button>
                </div>
                <div style={styles.infoCard}>
                    {user?.role === 'Admin' && 'You can manage users, block accounts, and assign roles from the Admin panel.'}
                    {user?.role === 'club_admin' && 'You can create and manage campus events as a Club Lead or teacher.'}
                    {user?.role === 'student' && 'Participate in events, post updates, and grow your leaderboard points.'}
                </div>
            </div>
        </aside>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    sidebar: {
        width: '350px',
        minWidth: '350px',
        height: '100vh',
        padding: '24px',
        boxSizing: 'border-box',
        backgroundColor: '#F9FAFB',
    },
    profileContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        cursor: 'pointer', // Taaki user ko pata chale ki yeh clickable hai
    },
    profileName: {
        fontSize: '15px',
        fontWeight: '600',
        margin: 0,
    },
    profileHandle: {
        fontSize: '14px',
        color: '#6B7280',
        margin: 0,
    },
    profileAvatar: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        objectFit: 'cover',
    },
    suggestionsContainer: {
        // Container ke liye styles agar zaroorat pade
    },
    suggestionsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    suggestionsTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#6B7280',
        margin: 0,
    },
    seeAllLink: {
        fontSize: '13px',
        fontWeight: '600',
        background: 'none',
        border: 'none',
        color: 'var(--brand-purple)',
        cursor: 'pointer',
    },
    infoCard: {
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        color: '#374151',
        lineHeight: 1.5,
        fontSize: '14px',
    },
};

export default RightSidebar;

