import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageSquare, Shield, Trophy, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} style={{ ...styles.navItem, ...(isActive ? styles.activeItem : {}), textDecoration: 'none' }}>
            {icon}
            <span style={styles.navLabel}>{label}</span>
        </Link>
    );
};

const AiButton = () => (
    <Link to="/ai" style={styles.aiButton}>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>AI</span>
    </Link>
);

const BottomNav = () => {
    const { user } = useAuth();

    return (
        <footer style={styles.footer}>
            <NavItem icon={<Home />} label="Home" to="/" />
            <NavItem icon={<Calendar />} label="Events" to="/events" />
            <AiButton />
            {user?.role === 'Admin' ? (
                <NavItem icon={<Shield />} label="Admin" to="/admin" />
            ) : user?.role === 'club_admin' ? (
                <NavItem icon={<Building2 />} label="Club" to="/club" />
            ) : (
                <NavItem icon={<MessageSquare />} label="Community" to="/chat" />
            )}
            <NavItem icon={<Trophy />} label="Leaderboard" to="/leaderboard" />
        </footer>
    );
};


const styles: { [key: string]: React.CSSProperties } = {
    footer: {
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        height: '80px',
        backgroundColor: 'var(--primary-dark)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 10px',
        boxShadow: '0 -4px 15px rgba(0,0,0,0.1)',
        marginTop: 'auto',
        width: '100%',
        boxSizing: 'border-box',
    },
    navItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '8px 4px',
        borderRadius: '12px',
        transition: 'all 0.2s ease-in-out',
        textDecoration: 'none',
        flex: 1,
        minWidth: 0,
    },
    activeItem: {
        color: 'var(--text-light)',
        backgroundColor: 'var(--secondary-dark)'
    },
    navLabel: {
        fontSize: '10px',
        marginTop: '4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: '100%',
        textAlign: 'center',
    },
    aiButton: {
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'var(--background-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--primary-dark)',
        marginBottom: '30px',
        border: '5px solid var(--background-main)',
        cursor: 'pointer',
        boxShadow: '0 0 0 3px black, 0 -2px 10px rgba(0, 0, 0, 0.1)',
        textDecoration: 'none'
    }
};

export default BottomNav;

