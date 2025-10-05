import React from 'react';
import { Link } from 'react-router-dom'; // Link import kiya
import { UserCircle } from 'lucide-react';

const TopNav = () => {
    return (
        <header style={styles.header}>
            <div style={styles.logoContainer}>
                <div style={styles.logoIcon}>H</div>
                <h1 style={styles.logoText}>HIVE</h1>
            </div>
            {/* Ab yeh icon ek link hai */}
            <Link to="/profile" style={styles.iconContainer}>
                <UserCircle size={28} color="var(--primary-dark)" />
            </Link>
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
};

export default TopNav;

