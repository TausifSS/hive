import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getTopStories } from '../lib/api';
import type { TopStory } from '../lib/api';

const formatStoryDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const StoryCard = ({ story, isExpanded, onToggle }: { story: TopStory; isExpanded: boolean; onToggle: () => void }) => (
    <article style={styles.storyCard}>
        <div style={styles.storyMeta}>
            <span style={styles.category}>{story.category}</span>
            <span>{formatStoryDate(story.createdAt)}</span>
        </div>
        <h2 style={styles.storyTitle}>{story.title}</h2>
        <p style={styles.storySummary}>{story.summary}</p>
        {isExpanded && <p style={styles.storyBody}>{story.body}</p>}
        <button style={styles.readMoreButton} onClick={onToggle}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {isExpanded ? 'Show Less' : 'Read More'}
        </button>
    </article>
);

const TopStoriesPage = () => {
    const [stories, setStories] = useState<TopStory[]>([]);
    const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadStories = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await getTopStories();
            setStories(response.stories);
        } catch (storyError) {
            setError(storyError instanceof Error ? storyError.message : 'Unable to load top stories');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadStories();
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Top Stories</h1>
                    <p style={styles.pageSubtitle}>Official updates from the HIVE backend.</p>
                </div>
                <button style={styles.refreshButton} onClick={loadStories} disabled={isLoading}>
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {isLoading ? (
                <div style={styles.messageBox}>Loading stories...</div>
            ) : error ? (
                <div style={styles.errorBox}>{error}</div>
            ) : stories.length === 0 ? (
                <div style={styles.messageBox}>No official updates published yet.</div>
            ) : (
                <div style={styles.storiesGrid}>
                    {stories.map((story) => (
                        <StoryCard
                            key={story.id}
                            story={story}
                            isExpanded={expandedStoryId === story.id}
                            onToggle={() => setExpandedStoryId((currentId) => currentId === story.id ? null : story.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        padding: '24px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
    },
    pageTitle: {
        fontSize: '28px',
        fontWeight: 'bold',
        margin: '0 0 4px 0',
    },
    pageSubtitle: {
        fontSize: '16px',
        color: 'var(--text-secondary)',
        margin: 0,
    },
    refreshButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        backgroundColor: 'white',
        color: '#374151',
        padding: '10px 14px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    storiesGrid: {
        display: 'grid',
        gap: '16px',
    },
    storyCard: {
        backgroundColor: 'var(--background-light)',
        borderRadius: '12px',
        padding: '18px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    storyMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#6B7280',
        fontSize: '13px',
        marginBottom: '10px',
    },
    category: {
        backgroundColor: '#EEF2FF',
        color: 'var(--brand-purple)',
        borderRadius: '999px',
        padding: '4px 10px',
        fontWeight: 700,
    },
    storyTitle: {
        fontSize: '18px',
        fontWeight: '700',
        margin: '0 0 8px 0',
    },
    storySummary: {
        fontSize: '14px',
        color: 'var(--text-secondary)',
        margin: '0 0 14px 0',
        lineHeight: 1.5,
    },
    storyBody: {
        fontSize: '15px',
        color: '#374151',
        margin: '0 0 14px 0',
        lineHeight: 1.6,
    },
    readMoreButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: '700',
        cursor: 'pointer',
    },
    messageBox: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        color: '#6B7280',
        padding: '24px',
        textAlign: 'center',
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        color: '#DC2626',
        padding: '16px',
    },
};

export default TopStoriesPage;
