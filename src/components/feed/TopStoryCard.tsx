import React from 'react';
import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom'; // Link import kiya

const TopStoryCard = () => {
    return (
        // Poore card ko Link se wrap kiya
        <Link to="/top-stories" style={{ textDecoration: 'none' }}>
            <div style={styles.card}>
                <div style={styles.iconContainer}>
                    <Megaphone size={20} color="#FFA726" />
                </div>
                <div style={styles.textContainer}>
                    <h2 style={styles.title}>Top Stories</h2>
                    <p style={styles.subtitle}>Official news & announcements</p>
                </div>
                <div style={styles.badge}>
                    New
                </div>
            </div>
        </Link>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(90deg, #4A00E0 0%, #8E2DE2 100%)',
        borderRadius: '16px',
        padding: '16px',
        color: 'white',
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out',
    },
    iconContainer: {
        marginRight: '12px',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 'bold',
    },
    subtitle: {
        margin: 0,
        fontSize: '13px',
        opacity: 0.8,
    },
    badge: {
        backgroundColor: '#FF4081',
        borderRadius: '12px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 'bold',
    },
};

export default TopStoryCard;

