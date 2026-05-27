import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Plus, X } from 'lucide-react';
import { getTopStories, createTopStory } from '../lib/api';
import type { TopStory } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
    const { user } = useAuth();
    const [stories, setStories] = useState<TopStory[]>([]);
    const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Create story form state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [category, setCategory] = useState('Official');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleCreateStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !summary.trim()) return;

        setIsSubmitting(true);
        try {
            await createTopStory({
                title: title.trim(),
                summary: summary.trim(),
                body: bodyText.trim() || summary.trim(),
                category: category
            });
            setTitle('');
            setSummary('');
            setBodyText('');
            setCategory('Official');
            setIsCreateOpen(false);
            await loadStories();
        } catch (err) {
            alert('Failed to publish story: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.pageTitle}>Top Stories</h1>
                    <p style={styles.pageSubtitle}>Official updates from the HIVE backend.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {user && (user.role === 'Admin' || user.role === 'club_admin') && (
                        <button style={styles.createButton} onClick={() => setIsCreateOpen(!isCreateOpen)}>
                            <Plus size={16} />
                            Create Update
                        </button>
                    )}
                    <button style={styles.refreshButton} onClick={loadStories} disabled={isLoading}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {isCreateOpen && (
                <form onSubmit={handleCreateStory} style={styles.createForm}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Create Announcement / Update</h3>
                        <button type="button" onClick={() => setIsCreateOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                            <X size={18} color="#4B5563" />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={styles.formLabel}>Title</label>
                            <input 
                                type="text" 
                                placeholder="e.g. End Semester Exam Schedule Announced" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={styles.formInput}
                                required
                            />
                        </div>
                        <div>
                            <label style={styles.formLabel}>Category</label>
                            <select 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)} 
                                style={styles.formSelect}
                            >
                                <option value="Official">Official</option>
                                <option value="Events">Events</option>
                                <option value="Placements">Placements</option>
                                <option value="Clubs">Clubs</option>
                                <option value="Platform">Platform</option>
                            </select>
                        </div>
                        <div>
                            <label style={styles.formLabel}>Short Summary</label>
                            <input 
                                type="text" 
                                placeholder="Brief 1-sentence summary of the update..." 
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                style={styles.formInput}
                                required
                            />
                        </div>
                        <div>
                            <label style={styles.formLabel}>Full Content (Optional)</label>
                            <textarea 
                                placeholder="Detailed details/body of the update..." 
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                style={styles.formTextarea}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !title.trim() || !summary.trim()} 
                            style={{ ...styles.submitButton, ...(isSubmitting ? styles.disabledBtn : {}) }}
                        >
                            {isSubmitting ? 'Publishing...' : 'Publish Update'}
                        </button>
                    </div>
                </form>
            )}

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
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderRadius: '10px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        border: 'none',
        padding: '10px 16px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    createForm: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        marginBottom: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        textAlign: 'left',
    },
    formLabel: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#4B5563',
        marginBottom: '6px',
    },
    formInput: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: '#F9FAFB',
        boxSizing: 'border-box',
    },
    formSelect: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: '#F9FAFB',
        boxSizing: 'border-box',
    },
    formTextarea: {
        width: '100%',
        height: '100px',
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: '#F9FAFB',
        resize: 'vertical',
        boxSizing: 'border-box',
    },
    submitButton: {
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
        marginTop: '8px',
    },
    disabledBtn: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
};

export default TopStoriesPage;
