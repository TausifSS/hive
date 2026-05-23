import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { followUser, getUser, updateCurrentUserProfile } from '../lib/api';
import type { User } from '../lib/api';

const ProfilePage = () => {
    const { user: currentUser, setUser } = useAuth();
    const { userId } = useParams<{ userId: string }>();
    const targetUserId = userId || currentUser?.id;
    const [profileUser, setProfileUser] = useState<User | null>(currentUser);
    const [isLoading, setIsLoading] = useState(Boolean(targetUserId));
    const [error, setError] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'events'>('activity');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', bio: '', avatarUrl: '', coverUrl: '' });

    useEffect(() => {
        const loadProfile = async () => {
            if (!targetUserId) {
                setProfileUser(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');

            try {
                const response = await getUser(targetUserId);
                setProfileUser(response.user);
            } catch (profileError) {
                setError(profileError instanceof Error ? profileError.message : 'Unable to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        void loadProfile();
    }, [targetUserId]);

    const isMyProfile = Boolean(profileUser && currentUser && profileUser.id === currentUser.id);
    const alreadyFollowing = Boolean(profileUser && currentUser && profileUser.followers?.includes(currentUser.id));

    const handleFollow = async () => {
        if (!profileUser || isMyProfile || alreadyFollowing || isFollowing) return;

        setIsFollowing(true);
        setError('');

        try {
            const response = await followUser(profileUser.id);
            setProfileUser(response.user);
            setUser(response.currentUser);
        } catch (followError) {
            setError(followError instanceof Error ? followError.message : 'Unable to follow user');
        } finally {
            setIsFollowing(false);
        }
    };

    const openEditProfile = () => {
        if (!profileUser) return;
        setEditForm({
            name: profileUser.name,
            bio: profileUser.bio || '',
            avatarUrl: profileUser.avatarUrl || '',
            coverUrl: profileUser.coverUrl || '',
        });
        setIsEditOpen(true);
    };

    const handleSaveProfile = async () => {
        setError('');
        try {
            const response = await updateCurrentUserProfile(editForm);
            setProfileUser(response.user);
            setUser(response.user);
            setIsEditOpen(false);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to update profile');
        }
    };

    if (isLoading) {
        return <div style={styles.stateBox}>Loading profile...</div>;
    }

    if (error || !profileUser) {
        return <div style={styles.errorBox}>{error || 'Profile not found'}</div>;
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={{ ...styles.coverPhoto, backgroundImage: `url(${profileUser.coverUrl || 'https://placehold.co/600x200/374151/E5E7EB?text=Cover+Photo'})` }}></div>
                <div style={styles.profilePictureContainer}>
                    <img
                        src={profileUser.avatarUrl || 'https://placehold.co/100x100/EFEFEF/333?text=HV'}
                        alt={profileUser.name}
                        style={styles.profilePicture}
                    />
                </div>
            </header>

            <section style={styles.userInfo}>
                <div style={styles.nameAndHandle}>
                    <h1 style={styles.name}>{profileUser.name}</h1>
                    <span style={styles.handle}>@{profileUser.handle || profileUser.id}</span>
                </div>
                <p style={styles.bio}>{profileUser.bio || 'HIVE community member'}</p>
                <div style={styles.stats}>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>{profileUser.points || 0}</span>
                        <span style={styles.statLabel}>Points</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>{profileUser.followers?.length || 0}</span>
                        <span style={styles.statLabel}>Followers</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>{profileUser.following?.length || 0}</span>
                        <span style={styles.statLabel}>Following</span>
                    </div>
                </div>

                <div style={styles.buttonContainer}>
                    {isMyProfile ? (
                        <>
                            <button style={styles.editButton} onClick={openEditProfile}>Edit Profile</button>
                            <Link to={`/messages/${profileUser.id}`} style={styles.shareButton}>Message</Link>
                            <Link to="/settings" style={styles.moreButton}>
                                <MoreHorizontal size={24} color="#374151" />
                            </Link>
                        </>
                    ) : (
                        <>
                            <button
                                style={{ ...styles.editButton, ...styles.followButton, ...(alreadyFollowing ? styles.followingButton : {}) }}
                                onClick={handleFollow}
                                disabled={alreadyFollowing || isFollowing}
                            >
                                {alreadyFollowing ? 'Following' : isFollowing ? 'Following...' : 'Follow'}
                            </button>
                            <Link to={`/messages/${profileUser.id}`} style={{ ...styles.shareButton, flex: 2 }}>Message</Link>
                        </>
                    )}
                </div>
            </section>

            <nav style={styles.tabNav}>
                <button style={{ ...styles.tabButton, ...(activeTab === 'activity' ? styles.activeTab : {}) }} onClick={() => setActiveTab('activity')}>Activity</button>
                <button style={{ ...styles.tabButton, ...(activeTab === 'events' ? styles.activeTab : {}) }} onClick={() => setActiveTab('events')}>Events</button>
            </nav>

            <div style={styles.tabContent}>
                {activeTab === 'activity'
                    ? <p>Activity is connected to your live HIVE account. Posts and comments will be listed here after the activity endpoint pass.</p>
                    : <p>Registered campus events will appear here after the profile events endpoint pass.</p>}
            </div>

            {isEditOpen && (
                <div style={styles.modalBackdrop} onClick={() => setIsEditOpen(false)}>
                    <div style={styles.modalContent} onClick={(event) => event.stopPropagation()}>
                        <h2 style={styles.modalTitle}>Edit Profile</h2>
                        <input style={styles.input} placeholder="Name" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
                        <textarea style={{ ...styles.input, ...styles.textarea }} placeholder="Bio" value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} />
                        <input style={styles.input} placeholder="Avatar URL" value={editForm.avatarUrl} onChange={(event) => setEditForm({ ...editForm, avatarUrl: event.target.value })} />
                        <input style={styles.input} placeholder="Cover URL" value={editForm.coverUrl} onChange={(event) => setEditForm({ ...editForm, coverUrl: event.target.value })} />
                        <div style={styles.modalActions}>
                            <button style={styles.cancelButton} onClick={() => setIsEditOpen(false)}>Cancel</button>
                            <button style={styles.saveProfileButton} onClick={handleSaveProfile}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
    },
    header: {
        position: 'relative',
        marginBottom: '60px',
    },
    coverPhoto: {
        height: '180px',
        backgroundColor: '#D1D5DB',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
    profilePictureContainer: {
        position: 'absolute',
        bottom: '-50px',
        left: '16px',
        border: '4px solid white',
        borderRadius: '50%',
        backgroundColor: 'white',
    },
    profilePicture: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        objectFit: 'cover',
    },
    userInfo: {
        padding: '16px',
    },
    nameAndHandle: {
        marginBottom: '8px',
    },
    name: {
        fontSize: '24px',
        fontWeight: 'bold',
        margin: '0',
    },
    handle: {
        fontSize: '15px',
        color: '#6B7280',
    },
    bio: {
        fontSize: '15px',
        margin: '0 0 16px 0',
        lineHeight: 1.5,
    },
    stats: {
        display: 'flex',
        gap: '24px',
        marginBottom: '16px',
    },
    statItem: {
        display: 'flex',
        gap: '4px',
        alignItems: 'baseline',
    },
    statValue: {
        fontWeight: 'bold',
        fontSize: '15px',
    },
    statLabel: {
        fontSize: '15px',
        color: '#6B7280',
    },
    buttonContainer: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    editButton: {
        flex: 1,
        padding: '10px',
        backgroundColor: '#F3F4F6',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '15px',
        cursor: 'pointer',
    },
    followButton: {
        flex: 2,
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
    },
    followingButton: {
        backgroundColor: '#F3F4F6',
        color: '#374151',
        cursor: 'default',
    },
    shareButton: {
        flex: 1,
        padding: '10px',
        backgroundColor: '#F3F4F6',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '15px',
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'none',
        color: '#1F2937',
    },
    moreButton: {
        padding: '8px',
        backgroundColor: '#F3F4F6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    tabNav: {
        display: 'flex',
        justifyContent: 'space-around',
        borderTop: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
    },
    tabButton: {
        padding: '14px 0',
        border: 'none',
        backgroundColor: 'transparent',
        fontWeight: '600',
        fontSize: '16px',
        color: '#6B7280',
        cursor: 'pointer',
        flex: 1,
    },
    activeTab: {
        color: 'var(--primary-dark)',
        borderBottom: '2px solid var(--primary-dark)',
    },
    tabContent: {
        padding: '16px',
        textAlign: 'center',
        color: '#6B7280',
    },
    modalBackdrop: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
    },
    modalContent: {
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #E5E7EB',
    },
    modalTitle: {
        margin: '0 0 16px 0',
        fontSize: '20px',
    },
    input: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #D1D5DB',
        borderRadius: '10px',
        padding: '12px 14px',
        fontSize: '15px',
        marginBottom: '12px',
    },
    textarea: {
        minHeight: '90px',
        resize: 'vertical',
        fontFamily: 'inherit',
    },
    modalActions: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
    },
    cancelButton: {
        border: 'none',
        borderRadius: '8px',
        padding: '10px 14px',
        backgroundColor: '#F3F4F6',
        fontWeight: 700,
        cursor: 'pointer',
    },
    saveProfileButton: {
        border: 'none',
        borderRadius: '8px',
        padding: '10px 16px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: 700,
        cursor: 'pointer',
    },
    stateBox: {
        padding: '24px',
        color: '#6B7280',
    },
    errorBox: {
        margin: '16px',
        padding: '16px',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        color: '#DC2626',
    },
};

export default ProfilePage;
