import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Bot, MessageSquare, MessageCircle, Trophy, Newspaper, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// NavItem component ab Link ban jayega
const NavItem = ({ icon, title, subtitle, to, badgeCount }: { icon: React.ReactNode, title: string, subtitle: string, to: string, badgeCount?: number }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} style={{ ...styles.navItem, ...(isActive ? styles.activeNavItem : {}), textDecoration: 'none', position: 'relative' }}>
            <div style={styles.navIcon}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={styles.navTitle}>{title}</div>
                <div style={styles.navSubtitle}>{subtitle}</div>
            </div>
            {badgeCount !== undefined && badgeCount > 0 && (
                <span style={styles.sidebarBadge}>
                    {badgeCount}
                </span>
            )}
        </Link>
    );
};

const LeftSidebar = () => {
    const { user, unreadCount } = useAuth();
    const navItems = [
        { icon: <Home size={24} />, title: 'Home', subtitle: 'Student Feed', to: '/' },
        ...(['club_admin', 'Admin'].includes(user?.role || '') ? [{ icon: <Building2 size={24} />, title: 'Club Panel', subtitle: 'Club Tools', to: '/club' }] : []),
        { icon: <Calendar size={24} />, title: 'Events', subtitle: 'Campus Events', to: '/events' },
        { icon: <Bot size={24} />, title: 'Hey GHR', subtitle: 'AI Assistant', to: '/ai' },
        { icon: <MessageSquare size={24} />, title: 'Community', subtitle: 'Channels', to: '/chat' },
        { icon: <MessageCircle size={24} />, title: 'Direct Messages', subtitle: 'Private Chats', to: '/messages', badgeCount: unreadCount },
        { icon: <Newspaper size={24} />, title: 'Top Stories', subtitle: 'Official Updates', to: '/top-stories' },
    ];
    if (user?.role === 'Admin') {
        navItems.push({ icon: <Shield size={24} />, title: 'Admin', subtitle: 'User Control', to: '/admin' });
    }
    
    return (
        <aside style={styles.sidebar}>
            <div>
                <div style={styles.logoContainer}>
                    <div style={styles.logo}>H</div>
                    <div>
                        <h1 style={styles.logoTitle}>HIVE</h1>
                        <p style={styles.logoSubtitle}>GHRCEM Digital Hub</p>
                    </div>
                </div>
                <nav style={styles.nav}>
                    {navItems.map(item => <NavItem key={item.title} {...item} />)}
                </nav>
            </div>
            <Link to="/leaderboard" style={{ ...styles.pointsCard, textDecoration: 'none', cursor: 'pointer' }}>
                <Trophy size={24} color="#F97316" />
                <div style={{ flex: 1 }}>
                    <p style={styles.pointsTitle}>Your Points</p>
                    <p style={styles.pointsValue}>{user?.points || 0}</p>
                </div>
                <p style={styles.pointsSubtitle}>{user?.role === 'club_admin' ? 'Club Lead tools active' : user?.role === 'Admin' ? 'College Admin mode' : 'Keep participating!'}</p>
            </Link>
        </aside>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    sidebar: {
        width: '280px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        backgroundColor: 'white',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px',
    },
    sidebarBadge: {
        backgroundColor: '#EF4444',
        color: 'white',
        borderRadius: '999px',
        padding: '2px 6px',
        fontSize: '11px',
        fontWeight: 'bold',
        minWidth: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px'
    },
    logo: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
    },
    logoTitle: {
        fontSize: '22px',
        fontWeight: 'bold',
        margin: 0,
    },
    logoSubtitle: {
        fontSize: '14px',
        color: '#6B7280',
        margin: 0,
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        borderRadius: '12px',
        color: '#374151',
    },
    activeNavItem: {
        background: 'linear-gradient(90deg, rgba(139,92,246,1) 0%, rgba(167,139,250,1) 100%)',
        color: 'white',
    },
    navIcon: {},
    navTitle: {
        fontWeight: 'bold',
        fontSize: '16px',
    },
    navSubtitle: {
        fontSize: '13px',
    },
    pointsCard: {
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    pointsTitle: {
        margin: 0,
        fontSize: '15px',
        fontWeight: '600',
        color: '#B45309'
    },
    pointsValue: {
        margin: 0,
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#D97706'
    },
    pointsSubtitle: {
        margin: 0,
        fontSize: '13px',
        color: '#B45309',
        alignSelf: 'flex-end'
    },
};

export default LeftSidebar;

