import React, { useState } from 'react';
import LeaderboardItem from '../components/leaderboard/LeaderboardItem';

const LeaderboardPage = () => {
    const [activeFilter, setActiveFilter] = useState('weekly');

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Leaderboard</h1>
                <p style={styles.subtitle}>See who's on top of the game!</p>
            </div>

            <div style={styles.filterContainer}>
                <button 
                    onClick={() => setActiveFilter('weekly')}
                    style={{...styles.filterButton, ...(activeFilter === 'weekly' ? styles.activeFilter : {})}}>
                    Weekly
                </button>
                <button 
                    onClick={() => setActiveFilter('monthly')}
                    style={{...styles.filterButton, ...(activeFilter === 'monthly' ? styles.activeFilter : {})}}>
                    Monthly
                </button>
                <button 
                    onClick={() => setActiveFilter('all-time')}
                    style={{...styles.filterButton, ...(activeFilter === 'all-time' ? styles.activeFilter : {})}}>
                    All Time
                </button>
            </div>

            <div style={styles.listContainer}>
                {/* Yahan backend se data aane ke baad hum .map() use karenge */}
                {/* Abhi ke liye, structure dikhane ke liye aese add kar rahe hain */}
                <LeaderboardItem rank={1} name="Yash Parse" points={1250} isCurrentUser={true} />
                <LeaderboardItem rank={2} name="Alex Chen" points={1180} />
                <LeaderboardItem rank={3} name="Shraddha K" points={1150} />
                <LeaderboardItem rank={4} name="Tausif Shaikh" points={1020} />
                <LeaderboardItem rank={5} name="Vaibhav P" points={980} />
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
    listContainer: {
        // Future use
    }
};

export default LeaderboardPage;
