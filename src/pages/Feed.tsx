import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import TopStoryCard from '../components/feed/TopStoryCard';
import CreatePost from '../components/feed/CreatePost';
import PostCard from '../components/feed/PostCard';
import { getPosts } from '../lib/api';
import type { Post } from '../lib/api';

const PostSkeleton = () => (
    <div style={styles.skeletonCard}>
        <div style={styles.skeletonHeader}>
            <div style={styles.skeletonAvatar}></div>
            <div style={styles.skeletonAuthorInfo}>
                <div style={styles.skeletonLine}></div>
                <div style={{ ...styles.skeletonLine, width: '60%' }}></div>
            </div>
        </div>
        <div style={{ ...styles.skeletonLine, height: '40px' }}></div>
    </div>
);

const Feed = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [error, setError] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const tag = searchParams.get('tag');

    const loadPosts = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await getPosts();
            setPosts(response.posts);
        } catch (feedError) {
            setError(feedError instanceof Error ? feedError.message : 'Unable to load posts');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadPosts();
    }, []);

    const handlePostCreated = (post: Post) => {
        setPosts((currentPosts) => [post, ...currentPosts]);
    };

    const handlePostUpdated = (post: Post) => {
        setPosts((currentPosts) => currentPosts.map((item) => item.id === post.id ? post : item));
    };

    const handlePostDeleted = (postId: string) => {
        setPosts((currentPosts) => currentPosts.filter((item) => item.id !== postId));
    };

    const getTrendingTags = (allPosts: Post[]) => {
        const counts: Record<string, number> = {};
        allPosts.forEach((p) => {
            const matches = p.content.match(/#(\w+)/g);
            if (matches) {
                matches.forEach((m) => {
                    const clean = m.slice(1).toLowerCase();
                    counts[clean] = (counts[clean] || 0) + 1;
                });
            }
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map((entry) => entry[0]);
    };

    const trending = getTrendingTags(posts);
    const filteredPosts = tag
        ? posts.filter((post) => post.content.toLowerCase().includes(`#${tag.toLowerCase()}`))
        : posts;

    return (
        <div style={styles.feedContainer}>
            <TopStoryCard />
            <CreatePost onPostCreated={handlePostCreated} />

            {trending.length > 0 && (
                <div style={styles.trendingContainer}>
                    <span style={styles.trendingLabel}>Trending:</span>
                    <div style={styles.trendingPills}>
                        {trending.map((t) => (
                            <button
                                key={t}
                                onClick={() => setSearchParams({ tag: t })}
                                style={{
                                    ...styles.trendingPill,
                                    backgroundColor: tag === t ? 'var(--brand-purple, #8B5CF6)' : '#F3F4F6',
                                    color: tag === t ? '#FFFFFF' : '#4B5563',
                                }}
                            >
                                #{t}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {tag && (
                <div style={styles.filterBanner}>
                    <span>Showing posts matching <strong style={{ color: 'var(--brand-purple, #8B5CF6)' }}>#{tag}</strong></span>
                    <button style={styles.clearFilterBtn} onClick={() => setSearchParams({})}>Clear filter</button>
                </div>
            )}

            {isLoading ? (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            ) : error ? (
                <div style={styles.messageBox}>
                    <p style={styles.errorText}>{error}</p>
                    <button style={styles.retryButton} onClick={loadPosts}>Try Again</button>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div style={styles.messageBox}>
                    {tag ? `No posts found matching #${tag}.` : 'No posts yet. Create the first post for HIVE.'}
                </div>
            ) : (
                filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} onPostUpdated={handlePostUpdated} onPostDeleted={handlePostDeleted} />
                ))
            )}
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    feedContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    skeletonCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid #E5E7EB',
    },
    skeletonHeader: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
    },
    skeletonAvatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#F3F4F6',
        marginRight: '12px',
    },
    skeletonAuthorInfo: {
        flex: 1,
    },
    skeletonLine: {
        height: '16px',
        backgroundColor: '#F3F4F6',
        borderRadius: '4px',
        marginBottom: '8px',
    },
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
    filterBanner: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#374151',
    },
    clearFilterBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--brand-purple, #8B5CF6)',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
        padding: 0,
    },
    trendingContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        padding: '8px 0',
        scrollbarWidth: 'none',
    },
    trendingLabel: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
    },
    trendingPills: {
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
    },
    trendingPill: {
        border: 'none',
        borderRadius: '20px',
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
    },
};

export default Feed;
