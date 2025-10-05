import React from 'react';

// Ek chota component ek single story card ke liye
const StoryCard = ({ title, summary }: { title: string, summary: string }) => (
    <div style={styles.storyCard}>
        <h2 style={styles.storyTitle}>{title}</h2>
        <p style={styles.storySummary}>{summary}</p>
        <button style={styles.readMoreButton}>Read More</button>
    </div>
);

const TopStoriesPage = () => {
    return (
        <div style={styles.container}>
            <h1 style={styles.pageTitle}>Top Stories</h1>
            <p style={styles.pageSubtitle}>All the latest news and announcements from the college.</p>
            <div style={styles.storiesGrid}>
                {/* Yahan backend se data aane ke baad .map() use karenge */}
                <StoryCard title="Annual Tech Fest 'Innovate 2025' Announced" summary="Get ready for the biggest tech event of the year, featuring coding competitions, workshops, and guest lectures from industry experts." />
                <StoryCard title="New Campus Library Now Open 24/7" summary="The new state-of-the-art library is now accessible to all students around the clock for their academic needs." />
                <StoryCard title="Sports Day Trials Begin Next Week" summary="Registrations are now open for all athletic events. Showcase your talent and bring glory to your department!" />
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '16px',
    },
    pageTitle: {
        fontSize: '28px',
        fontWeight: 'bold',
        margin: '0 0 4px 0',
    },
    pageSubtitle: {
        fontSize: '16px',
        color: 'var(--text-secondary)',
        margin: '0 0 24px 0',
    },
    storiesGrid: {
        display: 'grid',
        gap: '16px',
    },
    storyCard: {
        backgroundColor: 'var(--background-light)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    storyTitle: {
        fontSize: '18px',
        fontWeight: '600',
        margin: '0 0 8px 0',
    },
    storySummary: {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        margin: '0 0 16px 0',
        lineHeight: 1.5,
    },
    readMoreButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: '500',
        cursor: 'pointer',
    },
};

export default TopStoriesPage;
