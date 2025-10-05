import React from 'react';
// Naye hooks aur link ke liye imports
import { Link, useParams } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Auth context ko import kiya

const ProfilePage = () => {
    // Auth context se current user ki jaankari li
    const { user: currentUser } = useAuth();
    // URL se userId nikaali (e.g., /profile/yashparse)
    const { userId } = useParams<{ userId: string }>();

    // Check kar rahe hain ki yeh mera profile hai ya kisi aur ka
    const isMyProfile = !userId || userId === currentUser?.id;

    return (
        <div style={styles.container}>
            {/* Header pehle jaisa hi hai */}
            <header style={styles.header}>
                <div style={styles.coverPhoto}></div>
                <div style={styles.profilePictureContainer}>
                    <img 
                        src="https://placehold.co/100x100/EFEFEF/333?text=YP" 
                        alt="Profile" 
                        style={styles.profilePicture}
                    />
                </div>
            </header>

            {/* User Info Section */}
            <section style={styles.userInfo}>
                <div style={styles.nameAndHandle}>
                    {/* Data abhi ke liye hardcoded hai, baad mein backend se aayega */}
                    <h1 style={styles.name}>Yash Parse</h1>
                    <span style={styles.handle}>@yashparse</span>
                </div>
                <p style={styles.bio}>
                    Student at GHRCEM, Pune | Elevating brands through stunning web design ✨
                </p>
                <div style={styles.stats}>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>22</span>
                        <span style={styles.statLabel}>Posts</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>1</span>
                        <span style={styles.statLabel}>Followers</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statValue}>0</span>
                        <span style={styles.statLabel}>Following</span>
                    </div>
                </div>

                {/* YEH NAYI LOGIC HAI: Role ke hisaab se buttons dikhayenge */}
                <div style={styles.buttonContainer}>
                    {isMyProfile ? (
                        // Agar yeh mera profile hai, to "Edit" aur "Settings" dikhao
                        <>
                            <button style={styles.editButton}>Edit Profile</button>
                            <Link to="/messages/yashparse" style={styles.shareButton}>Message</Link>
                            <Link to="/settings" style={styles.moreButton}>
                                <MoreHorizontal size={24} color="#374151" />
                            </Link>
                        </>
                    ) : (
                        // Agar yeh kisi aur ka profile hai, to "Follow" aur "Message" dikhao
                        <>
                            <button style={{...styles.editButton, flex: 2, backgroundColor: 'var(--brand-purple)', color: 'white'}}>Follow</button>
                            <Link to={`/messages/${userId}`} style={{...styles.shareButton, flex: 2}}>Message</Link>
                        </>
                    )}
                </div>
            </section>
            
            {/* Baaki sab pehle jaisa hi hai */}
            <nav style={styles.tabNav}>
                <button style={{...styles.tabButton, ...styles.activeTab}}>Posts</button>
                <button style={styles.tabButton}>Events</button>
            </nav>

            <div style={styles.tabContent}>
                <p>Posts will be displayed here...</p>
            </div>
        </div>
    );
};

// Styles object (saare styles yahan hain)
const styles: { [key: string]: React.CSSProperties } = {
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
        backgroundColor: '#D1D5DB', // Light grey for placeholder
        backgroundImage: 'url(https://placehold.co/600x200/374151/E5E7EB?text=Cover+Photo)',
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
    shareButton: { // Style wahi hai, bas ab yeh Link hai
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
};

export default ProfilePage;

