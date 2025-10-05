import React, { useState, useEffect } from 'react';
import TopStoryCard from '../components/feed/TopStoryCard';
import CreatePost from '../components/feed/CreatePost';
import PostCard from '../components/feed/PostCard';

// Post card ke liye ek alag loading skeleton
const PostSkeleton = () => (
    <div style={styles.skeletonCard}>
        <div style={styles.skeletonHeader}>
            <div style={styles.skeletonAvatar}></div>
            <div style={styles.skeletonAuthorInfo}>
                <div style={styles.skeletonLine}></div>
                <div style={{...styles.skeletonLine, width: '60%'}}></div>
            </div>
        </div>
        <div style={{...styles.skeletonLine, height: '40px'}}></div>
    </div>
);

const Feed = () => {
    // Nayi states loading aur posts ke liye
    const [isLoading, setIsLoading] = useState(true);
    // Note: Ab hum posts state ko use nahi kar rahe, lekin backend ke liye ready hai
    // const [posts, setPosts] = useState<any[]>([]); 

    // Backend se data aane ki acting
    useEffect(() => {
        setIsLoading(true);
        // 2 second baad loading band ho jayegi
        setTimeout(() => {
            setIsLoading(false);
        }, 2000);
    }, []);

    return (
        <div style={styles.feedContainer}>
            <TopStoryCard />
            <CreatePost />
            
            {/* YEH NAYA CHANGE HAI: Loading ke hisaab se content dikhega */}
            {isLoading ? (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            ) : (
                <>
                    {/* YEH AAPKA SIMPLE LAYOUT HAI, BILKUL WAISA HI */}
                    <PostCard hasMedia={true} />
                    <PostCard />
                    <PostCard />
                    <PostCard hasMedia={true} />
                </>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    feedContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    // Skeleton styles (baaki styles waise hi hain)
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
};

export default Feed;

