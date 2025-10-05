import React from 'react';
import { Crown } from 'lucide-react';

// Yeh component props lega taaki hum isse baar-baar use kar sakein
interface LeaderboardItemProps {
    rank: number;
    name: string;
    points: number;
    isCurrentUser?: boolean;
}

const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ rank, name, points, isCurrentUser = false }) => {
    
    const getRankIcon = () => {
        if (rank === 1) return <Crown size={24} color="#FFD700" />;
        if (rank === 2) return <Crown size={24} color="#C0C0C0" />;
        if (rank === 3) return <Crown size={24} color="#CD7F32" />;
        return <span style={styles.rankNumber}>{rank}</span>;
    };

    return (
        <div style={{ ...styles.itemContainer, ...(isCurrentUser ? styles.currentUser : {}) }}>
            <div style={styles.rankSection}>
                {getRankIcon()}
            </div>
            <div style={styles.profileSection}>
                <div style={styles.profilePic}></div>
                <span style={styles.name}>{name}</span>
            </div>
            <div style={styles.pointsSection}>
                <span style={styles.points}>{points}</span>
                <span style={styles.pointsLabel}>points</span>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    itemContainer: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: 'var(--background-light)',
        borderRadius: '12px',
        marginBottom: '10px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    currentUser: {
        border: '2px solid var(--brand-purple)',
        boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
    },
    rankSection: {
        width: '40px',
        display: 'flex',
        justifyContent: 'center',
    },
    rankNumber: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: 'var(--text-secondary)',
    },
    profileSection: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    profilePic: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#E0E0E0',
    },
    name: {
        fontWeight: '600',
        fontSize: '16px',
    },
    pointsSection: {
        textAlign: 'right',
    },
    points: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'var(--brand-purple)',
    },
    pointsLabel: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        marginLeft: '4px',
    }
};

export default LeaderboardItem;
