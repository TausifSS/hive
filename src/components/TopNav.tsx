import React from 'react';
import { Link } from 'react-router-dom'; // Link import kiya
import { LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
    student: 'Student',
    club_admin: 'Club Lead / Teacher',
    Admin: 'College Admin',
};

const TopNav = () => {
    const { user, logout } = useAuth();

    return (
        <header style={styles.header}>
            <div style={styles.logoContainer}>
                <div style={styles.logoIcon}>H</div>
                <h1 style={styles.logoText}>HIVE</h1>
            </div>
            <div style={styles.actions}>
                {user && <span style={styles.roleBadge}>{roleLabels[user.role]}</span>}
                <Link to="/profile" style={styles.iconContainer}>
                    <UserCircle size={28} color="var(--primary-dark)" />
                </Link>
                <button style={styles.logoutButton} onClick={logout} title="Logout">
                    <LogOut size={20} />
                </button>
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

