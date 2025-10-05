import React, { useState } from 'react';
import { Heart, MessageSquare, Repeat, BookmarkPlus, X } from 'lucide-react';

// Chota component har action button ke liye
const ActionButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
    <div style={styles.actionButton} onClick={onClick}>
        {icon}
        <span style={styles.actionLabel}>{label}</span>
    </div>
);

// Naye props add kiye hain media ke liye
interface PostCardProps {
    hasMedia?: boolean; // Simple flag to show/hide media
}

const PostCard = ({ hasMedia = false }: PostCardProps) => {
    // --- NAYI LOGIC YAHAN HAI ---
    const [likes, setLikes] = useState(145); // Shuruwati likes
    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false); // Comment popup ke liye state

    const handleLike = () => {
        setIsLiked(!isLiked);
        setLikes(isLiked ? likes - 1 : likes + 1);
    };
    // --- LOGIC END ---

    return (
        <>
            <div style={styles.card}>
                {/* Post ka Header (No Change) */}
                <div style={styles.header}>
                    <div style={styles.profilePic}></div>
                    <div style={styles.authorInfo}>
                        <p style={styles.authorName}>Student Name</p>
                        <p style={styles.timestamp}>Just now</p>
                    </div>
                </div>
                {/* Post ka Content (No Change) */}
                <p style={styles.content}>
                    This is where the post content will go. It will come from the backend automatically. #Placeholder #Success
                </p>
                
                {/* Media (No Change) */}
                {hasMedia && (
                    <div style={styles.mediaContainer}>
                        <img 
                            src="https://placehold.co/600x400/E5E7EB/9CA3AF?text=Post+Image"
                            alt="Post media"
                            style={styles.mediaImage}
                        />
                    </div>
                )}
                
                {/* YEH NAYI CHEEZ HAI: Likes aur Comments ka count */}
                <div style={styles.statsContainer}>
                    <span style={styles.likesCount}>{likes} likes</span>
                    <span style={styles.commentsCount} onClick={() => setShowComments(true)}>View all comments</span>
                </div>

                <hr style={styles.divider} />

                {/* Action Buttons (Ab inmein onClick hai) */}
                <div style={styles.actionsContainer}>
                    <div style={styles.leftActions}>
                        <ActionButton 
                            icon={<Heart size={22} color={isLiked ? '#FF3040' : '#4B5563'} fill={isLiked ? '#FF3040' : 'none'} />} 
                            label="Like" 
                            onClick={handleLike} 
                        />
                        <ActionButton 
                            icon={<MessageSquare size={22} />} 
                            label="Comment" 
                            onClick={() => setShowComments(true)}
                        />
                        <ActionButton icon={<Repeat size={22} />} label="Share" />
                    </div>
                    <button style={styles.saveButton}>
                        <BookmarkPlus size={18} />
                    </button>
                </div>
            </div>

            {/* --- YEH NAYA COMMENT POPUP HAI --- */}
            {showComments && (
                <div style={styles.modalBackdrop} onClick={() => setShowComments(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{margin: 0}}>Comments</h3>
                            <button style={styles.closeButton} onClick={() => setShowComments(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={styles.commentsList}>
                            {/* Yahan comments aayenge */}
                            <p>This is a comment...</p>
                            <p>This is another comment...</p>
                        </div>
                        <div style={styles.commentInputContainer}>
                            <input type="text" placeholder="Add a comment..." style={styles.commentInput} />
                            <button style={styles.postCommentButton}>Post</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};


const styles: { [key: string]: React.CSSProperties } = {
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '12px',
        fontFamily: 'system-ui, sans-serif',
        border: '1px solid #E5E7EB',
        marginBottom: '16px',
    },
    header: { display: 'flex', alignItems: 'center', marginBottom: '10px' },
    profilePic: { width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#F3F4F6' },
    authorInfo: { display: 'flex', flexDirection: 'column' },
    authorName: { margin: 0, fontWeight: '600', fontSize: '15px' },
    timestamp: { margin: 0, fontSize: '12px', color: '#6B7280' },
    content: { margin: '0 0 10px 0', fontSize: '15px', color: '#374151', lineHeight: 1.5 },
    mediaContainer: { margin: '10px 0', borderRadius: '8px', overflow: 'hidden' },
    mediaImage: { width: '100%', display: 'block' },
    statsContainer: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#6B7280' },
    likesCount: { fontWeight: '600' },
    commentsCount: { cursor: 'pointer' },
    divider: { border: 'none', borderTop: '1px solid #F3F4F6', margin: '8px 0' },
    actionsContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    leftActions: { display: 'flex', alignItems: 'center', gap: '20px' },
    actionButton: { display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563', cursor: 'pointer', fontSize: '14px' },
    actionLabel: { fontWeight: 500 },
    saveButton: { padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', },
    
    // --- Comment Modal Styles ---
    modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 1000, },
    modalContent: { backgroundColor: 'white', width: '100%', maxWidth: '450px', height: '70vh', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #E5E7EB' },
    closeButton: { background: 'none', border: 'none', cursor: 'pointer' },
    commentsList: { flexGrow: 1, overflowY: 'auto', padding: '16px' },
    commentInputContainer: { display: 'flex', padding: '12px', borderTop: '1px solid #E5E7EB' },
    commentInput: { flexGrow: 1, border: '1px solid #E5E7EB', borderRadius: '20px', padding: '8px 12px', marginRight: '8px' },
    postCommentButton: { background: 'var(--brand-purple, #8B5CF6)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' },
};

export default PostCard;

