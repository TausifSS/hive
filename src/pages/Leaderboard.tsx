import React, { useEffect, useState } from 'react';
import LeaderboardItem from '../components/leaderboard/LeaderboardItem';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard } from '../lib/api';
import type { LeaderboardUser } from '../lib/api';

const LeaderboardPage = () => {
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState('weekly');
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadLeaderboard = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await getLeaderboard();
            setUsers(response.users);
        } catch (leaderboardError) {
            setError(leaderboardError instanceof Error ? leaderboardError.message : 'Unable to load leaderboard');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadLeaderboard();
    }, [activeFilter]);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Leaderboard</h1>
                <p style={styles.subtitle}>See who's on top of the game!</p>
            </div>

            <div style={styles.filterContainer}>
                <button
                    onClick={() => setActiveFilter('weekly')}
                    style={{ ...styles.filterButton, ...(activeFilter === 'weekly' ? styles.activeFilter : {}) }}>
                    Weekly
                </button>
                <button
                    onClick={() => setActiveFilter('monthly')}
                    style={{ ...styles.filterButton, ...(activeFilter === 'monthly' ? styles.activeFilter : {}) }}>
                    Monthly
                </button>
                <button
                    onClick={() => setActiveFilter('all-time')}
                    style={{ ...styles.filterButton, ...(activeFilter === 'all-time' ? styles.activeFilter : {}) }}>
                    All Time
                </button>
            </div>

            <div style={styles.listContainer}>
                {isLoading ? (
                    <div style={styles.messageBox}>Loading leaderboard...</div>
                ) : error ? (
                    <div style={styles.messageBox}>
                        <p style={styles.errorText}>{error}</p>
                        <button style={styles.retryButton} onClick={loadLeaderboard}>Try Again</button>
                    </div>
                ) : users.length === 0 ? (
                    <div style={styles.messageBox}>No points yet.</div>
                ) : (
                    users.map((leaderboardUser) => (
                        <LeaderboardItem
                            key={leaderboardUser.id}
                            rank={leaderboardUser.rank}
                            name={leaderboardUser.name}
                            points={leaderboardUser.points || 0}
                            isCurrentUser={leaderboardUser.id === user?.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '16px',
        backgroundColor: 'var(--background-main)',
        minHeight: '100%'
    },
    header: {
        marginBottom: '24px',
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        margin: '0 0 4px 0',
    },
    subtitle: {
        fontSize: '16px',
        color: 'var(--text-secondary)',
        margin: 0,
    },
    filterContainer: {
        display: 'flex',
        gap: '10px',
        backgroundColor: 'var(--background-light)',
        padding: '6px',
        borderRadius: '12px',
        marginBottom: '24px',
    },
    filterButton: {
        flex: 1,
        padding: '10px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        fontWeight: '600',
        fontSize: '15px',
        cursor: 'pointer',
    },
    activeFilter: {
        backgroundColor: 'white',
        color: 'var(--brand-purple)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    listContainer: {},
    messageBox: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        color: '#6B7280',
        padding: '20px',
        textAlign: 'center',
    },
    errorText: {
        color: '#DC2626',
        margin: '0 0 12px 0',
    },
    retryButton: {
        padding: '8px 14px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default LeaderboardPage;
