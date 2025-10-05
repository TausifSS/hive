import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageSquare, Trophy } from 'lucide-react';

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
    return (
        <footer style={styles.footer}>
            <NavItem icon={<Home />} label="Home" to="/" />
            <NavItem icon={<Calendar />} label="Events" to="/events" />
            <AiButton />
            <NavItem icon={<MessageSquare />} label="Chat" to="/chat" />
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
        marginTop: 'auto'
    },
    navItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '12px',
        transition: 'all 0.2s ease-in-out',
        textDecoration: 'none',
    },
    activeItem: {
        color: 'var(--text-light)',
        backgroundColor: 'var(--secondary-dark)'
    },
    navLabel: {
        fontSize: '12px',
        marginTop: '4px',
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

