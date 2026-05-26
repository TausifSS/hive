import React from 'react';
import { Link } from 'react-router-dom'; // Link import kiya
import { MessageSquare, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
    student: 'Student',
    club_admin: 'Club Lead / Teacher',
    Admin: 'College Admin',
};

const TopNav = () => {
    const { user, unreadCount } = useAuth();

    return (
        <header style={styles.header}>
            <div style={styles.logoContainer}>
                <div style={styles.logoIcon}>H</div>
                <h1 style={styles.logoText}>HIVE</h1>
            </div>
            <div style={styles.actions}>
                {user && <span style={styles.roleBadge}>{roleLabels[user.role]}</span>}
                <Link to="/messages" style={styles.iconContainer} title="Direct Messages">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <MessageSquare size={24} color="var(--primary-dark)" style={{ marginRight: '4px' }} />
                        {unreadCount > 0 && (
                            <span style={styles.badge}>
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </Link>
                <Link to="/profile" style={styles.iconContainer} title="Profile">
                    <UserCircle size={28} color="var(--primary-dark)" />
                </Link>
            </div>
        </header>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    header: {
        position: 'sticky',
        top: 0,
        zIndex: 10,
        height: '60px',
        backgroundColor: 'var(--background-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        width: '100%',
        boxSizing: 'border-box',
    },
    logoContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    logoIcon: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 'bold',
    },
    logoText: {
        fontSize: '22px',
        fontWeight: 'bold',
        color: 'var(--primary-dark)',
        margin: 0,
    },
    iconContainer: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        color: 'inherit', // Link ka default blue color hatane ke liye
    },
    badge: {
        position: 'absolute',
        top: '-6px',
        right: '-4px',
        backgroundColor: '#EF4444',
        color: 'white',
        borderRadius: '999px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 'bold',
        minWidth: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 2px var(--background-light)',
    },
    actions: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    roleBadge: {
        padding: '6px 9px',
        backgroundColor: '#F3F4F6',
        color: '#374151',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '700',
    },
    logoutButton: {
        width: '36px',
        height: '36px',
        border: 'none',
        borderRadius: '50%',
        backgroundColor: '#F3F4F6',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
};

export default TopNav;

