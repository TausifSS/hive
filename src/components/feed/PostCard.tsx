import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, Repeat, BookmarkPlus, X, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { addPostComment, likePost, savePost, deletePost, updatePost, reportPost } from '../../lib/api';
import type { Post } from '../../lib/api';

const parseContent = (text: string) => {
    if (!text) return '';
    const parts = text.split(/([#@][\w-]+)/g);
    return parts.map((part, index) => {
        if (part.startsWith('#')) {
            const tag = part.slice(1);
            return (
                <Link key={index} to={`/?tag=${tag}`} style={{ color: 'var(--brand-purple, #8B5CF6)', fontWeight: '600', textDecoration: 'none' }}>
                    {part}
                </Link>
            );
        }
        if (part.startsWith('@')) {
            const handle = part.slice(1);
            return (
                <Link key={index} to={`/profile/${handle}`} style={{ color: 'var(--brand-purple, #8B5CF6)', fontWeight: '600', textDecoration: 'none' }}>
                    {part}
                </Link>
            );
        }
        return part;
    });
};

const ActionButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => (
    <button type="button" style={styles.actionButton} onClick={onClick}>
        {icon}
        <span style={styles.actionLabel}>{label}</span>
    </button>
);

interface PostCardProps {
    post: Post;
    onPostUpdated: (post: Post) => void;
    onPostDeleted?: (postId: string) => void;
}

const formatTimestamp = (value: string) => {
    const createdAt = new Date(value).getTime();
    const diffMinutes = Math.max(1, Math.round((Date.now() - createdAt) / 60000));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const PostCard = ({ post, onPostUpdated, onPostDeleted }: PostCardProps) => {
    const { user } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [error, setError] = useState('');
    const [statusText, setStatusText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Edit and Delete states
    const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);

    const isLiked = Boolean(user && post.likes.includes(user.id));
    const isSaved = Boolean(user && post.savedBy.includes(user.id));
    const authorProfilePath = `/profile/${post.author?.id || post.authorId}`;

    const handleLike = async () => {
        setError('');
        try {
            const response = await likePost(post.id);
            onPostUpdated(response.post);
        } catch (likeError) {
            setError(likeError instanceof Error ? likeError.message : 'Unable to update like');
        }
    };

    const handleSave = async () => {
        setError('');
        setStatusText('');
        try {
            const response = await savePost(post.id);
            onPostUpdated(response.post);
            setStatusText(isSaved ? 'Removed from saved posts' : 'Saved post');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save post');
        }
    };

    const handleShare = async () => {
        const shareText = `${post.author?.name || 'HIVE'} on HIVE: ${post.content}`;
        setError('');
        setStatusText('');

        try {
            if (navigator.share) {
                await navigator.share({ title: 'HIVE post', text: shareText });
                setStatusText('Share sheet opened');
                return;
            }

            await navigator.clipboard.writeText(shareText);
            setStatusText('Post text copied');
        } catch {
            setError('Unable to share from this browser');
        }
    };

    const handleAddComment = async () => {
        const content = commentText.trim();
        if (!content) return;

        setError('');
        setIsSaving(true);

        try {
            const response = await addPostComment(post.id, content);
            onPostUpdated(response.post);
            setCommentText('');
        } catch (commentError) {
            setError(commentError instanceof Error ? commentError.message : 'Unable to add comment');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditContent(post.content);
        setIsActionsDropdownOpen(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(post.content);
    };

    const handleSaveEdit = async () => {
        const content = editContent.trim();
        if (!content) return;
        setError('');
        setIsSaving(true);
        try {
            const response = await updatePost(post.id, content);
            onPostUpdated(response.post);
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update post');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsActionsDropdownOpen(false);
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        setError('');
        try {
            await deletePost(post.id);
            if (onPostDeleted) {
                onPostDeleted(post.id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete post');
        }
    };

    const handleReport = async () => {
        setIsActionsDropdownOpen(false);
        const reason = window.prompt('Enter reason for reporting this post:');
        if (reason === null) return;
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            alert('Reason is required to report a post.');
            return;
        }
        setError('');
        setStatusText('');
        try {
            await reportPost(post.id, trimmedReason);
            setStatusText('Post reported successfully.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to report post');
        }
    };

    return (
        <>
            <div style={styles.card}>
                <div style={styles.header}>
                    <Link to={authorProfilePath} style={styles.authorLink}>
                        {post.author?.avatarUrl ? (
                            <img src={post.author.avatarUrl} alt={post.author.name} style={styles.profilePicImage} />
                        ) : (
                            <div style={styles.profilePic}></div>
                        )}
                        <div style={styles.authorInfo}>
                            <p style={styles.authorName}>{post.author?.name || 'Student Name'}</p>
                            <p style={styles.timestamp}>{formatTimestamp(post.createdAt)}</p>
                        </div>
                    </Link>
                    {user && (
                        <div style={{ position: 'relative', marginLeft: 'auto' }}>
                            <button
                                type="button"
                                onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                                style={styles.threeDotButton}
                                title="Post Actions"
                            >
                                <MoreHorizontal size={20} />
                            </button>
                            {isActionsDropdownOpen && (
                                <div style={styles.actionsDropdown}>
                                    {post.authorId === user.id && (
                                        <button type="button" onClick={handleStartEdit} style={styles.dropdownBtn}>Edit</button>
                                    )}
                                    {(post.authorId === user.id || user.role === 'Admin') && (
                                        <button type="button" onClick={handleDelete} style={{ ...styles.dropdownBtn, color: '#EF4444' }}>Delete</button>
                                    )}
                                    {post.authorId !== user.id && (
                                        <button type="button" onClick={handleReport} style={{ ...styles.dropdownBtn, color: '#EF4444' }}>Report</button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div style={styles.editContainer}>
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            style={styles.editTextarea}
                            placeholder="Edit your post..."
                        />
                        <div style={styles.editActions}>
                            <button type="button" onClick={handleCancelEdit} style={styles.cancelEditBtn}>Cancel</button>
                            <button type="button" onClick={handleSaveEdit} style={styles.saveEditBtn} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p style={styles.content}>{parseContent(post.content)}</p>
                )}

                {post.mediaUrl && (
                    <div style={styles.mediaContainer}>
                        {post.mediaUrl.startsWith('data:video/') ? (
                            <video src={post.mediaUrl} style={styles.mediaImage} controls />
                        ) : (
                            <img
                                src={post.mediaUrl}
                                alt="Post media"
                                style={styles.mediaImage}
                            />
                        )}
                    </div>
                )}

                <div style={styles.statsContainer}>
                    <span style={styles.likesCount}>{post.likesCount} likes</span>
                    <span>{post.savedCount} saved</span>
                    <span style={styles.commentsCount} onClick={() => setShowComments(true)}>
                        {post.commentsCount === 0 ? 'No comments yet' : `View ${post.commentsCount} comments`}
                    </span>
                </div>

                {error && <p style={styles.errorText}>{error}</p>}
                {statusText && <p style={styles.statusText}>{statusText}</p>}

                <hr style={styles.divider} />

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
                        <ActionButton icon={<Repeat size={22} />} label="Share" onClick={handleShare} />
                    </div>
                    <button
                        type="button"
                        aria-label={isSaved ? 'Unsave post' : 'Save post'}
                        style={{ ...styles.saveButton, ...(isSaved ? styles.savedButton : {}) }}
                        onClick={handleSave}
                    >
                        <BookmarkPlus size={18} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                </div>
            </div>

            {showComments && (
                <div style={styles.modalBackdrop} onClick={() => setShowComments(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Comments</h3>
                            <button style={styles.closeButton} onClick={() => setShowComments(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={styles.commentsList}>
                            {post.comments.length === 0 ? (
                                <p style={styles.emptyComments}>Start the conversation.</p>
                            ) : (
                                post.comments.map((comment) => (
                                    <div key={comment.id} style={styles.commentItem}>
                                        <Link to={`/profile/${comment.author?.id || comment.authorId}`} style={styles.commentAuthor}>
                                            {comment.author?.name || 'Student'}
                                        </Link>
                                        <p style={styles.commentContent}>{comment.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={styles.commentInputContainer}>
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={(event) => setCommentText(event.target.value)}
                                style={styles.commentInput}
                            />
                            <button
                                style={{ ...styles.postCommentButton, ...(isSaving ? styles.disabledButton : {}) }}
                                onClick={handleAddComment}
                                disabled={isSaving}
                            >
                                Post
                            </button>
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
    authorLink: { display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' },
    profilePic: { width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#F3F4F6' },
    profilePicImage: { width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' },
    authorInfo: { display: 'flex', flexDirection: 'column' },
    authorName: { margin: 0, fontWeight: '600', fontSize: '15px' },
    timestamp: { margin: 0, fontSize: '12px', color: '#6B7280' },
    content: { margin: '0 0 10px 0', fontSize: '15px', color: '#374151', lineHeight: 1.5 },
    mediaContainer: { margin: '10px 0', borderRadius: '8px', overflow: 'hidden' },
    mediaImage: { width: '100%', display: 'block', maxHeight: '520px', objectFit: 'cover' },
    statsContainer: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#6B7280' },
    likesCount: { fontWeight: '600' },
    commentsCount: { cursor: 'pointer' },
    errorText: { color: '#DC2626', fontSize: '13px', margin: '4px 0' },
    statusText: { color: '#047857', fontSize: '13px', margin: '4px 0' },
    divider: { border: 'none', borderTop: '1px solid #F3F4F6', margin: '8px 0' },
    actionsContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    leftActions: { display: 'flex', alignItems: 'center', gap: '20px' },
    actionButton: { display: 'flex', alignItems: 'center', gap: '6px', color: '#4B5563', cursor: 'pointer', fontSize: '14px', border: 'none', backgroundColor: 'transparent', padding: 0 },
    actionLabel: { fontWeight: 500 },
    saveButton: { padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
    savedButton: { color: 'var(--brand-purple)' },
    modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', width: '100%', maxWidth: '450px', height: '70vh', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #E5E7EB' },
    modalTitle: { margin: 0 },
    closeButton: { background: 'none', border: 'none', cursor: 'pointer' },
    commentsList: { flexGrow: 1, overflowY: 'auto', padding: '16px' },
    commentItem: { padding: '10px 0', borderBottom: '1px solid #F3F4F6' },
    commentAuthor: { color: '#111827', fontWeight: 700, textDecoration: 'none' },
    commentContent: { margin: '4px 0 0 0', color: '#374151' },
    emptyComments: { color: '#6B7280', textAlign: 'center' },
    commentInputContainer: { display: 'flex', padding: '12px', borderTop: '1px solid #E5E7EB' },
    commentInput: { flexGrow: 1, border: '1px solid #E5E7EB', borderRadius: '20px', padding: '8px 12px', marginRight: '8px' },
    postCommentButton: { background: 'var(--brand-purple, #8B5CF6)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' },
    disabledButton: { opacity: 0.65, cursor: 'not-allowed' },
    threeDotButton: {
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#4B5563',
        transition: 'background-color 0.2s',
    },
    actionsDropdown: {
        position: 'absolute',
        top: '32px',
        right: 0,
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 50,
        minWidth: '120px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    dropdownBtn: {
        padding: '10px 16px',
        border: 'none',
        backgroundColor: 'transparent',
        textAlign: 'left',
        fontSize: '14px',
        cursor: 'pointer',
        fontWeight: '600',
        width: '100%',
        color: '#374151',
    },
    editContainer: {
        marginTop: '8px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    editTextarea: {
        width: '100%',
        minHeight: '80px',
        boxSizing: 'border-box',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '15px',
        fontFamily: 'inherit',
        resize: 'vertical',
        outline: 'none',
    },
    editActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
    },
    cancelEditBtn: {
        padding: '6px 12px',
        backgroundColor: '#F3F4F6',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '13px',
    },
    saveEditBtn: {
        padding: '6px 12px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '13px',
    },
};

export default PostCard;
