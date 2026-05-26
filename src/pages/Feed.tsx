import { useEffect, useState } from 'react';
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

    return (
        <div style={styles.feedContainer}>
            <TopStoryCard />
            <CreatePost onPostCreated={handlePostCreated} />

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
            ) : posts.length === 0 ? (
                <div style={styles.messageBox}>No posts yet. Create the first post for HIVE.</div>
            ) : (
                posts.map((post) => (
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
};

export default Feed;
