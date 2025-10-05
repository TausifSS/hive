import React from 'react';
import { UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom'; // Link import kiya

const SuggestionItem = ({ name, handle }: { name: string, handle: string }) => (
    <div style={styles.suggestionItem}>
        <div style={styles.suggestionAvatar}></div>
        <div>
            <p style={styles.suggestionName}>{name}</p>
            <p style={styles.suggestionHandle}>@{handle}</p>
        </div>
        <button style={styles.followButton}>Follow</button>
    </div>
);

const RightSidebar = () => {
    return (
        <aside style={styles.sidebar}>
            {/* Profile Section - Ab yeh poora section ek link hai */}
            <Link to="/PCprofile" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={styles.profileContainer}>
                    <UserCircle size={56} color="#4B5563" strokeWidth={1} />
                    <div>
                        <p style={styles.profileName}>Yash Parse</p>
                        <p style={styles.profileHandle}>@yashparse</p>
                    </div>
                    <button style={styles.switchButton}>Switch</button>
                </div>
            </Link>

            {/* Suggestions Section */}
            <div style={styles.suggestionsContainer}>
                <div style={styles.suggestionsHeader}>
                    <p style={styles.suggestionsTitle}>Suggested for you</p>
                    <a href="#" style={styles.seeAllLink}>See All</a>
                </div>
                <SuggestionItem name="Tausif Shaikh" handle="tausifshaikh" />
                <SuggestionItem name="Shraddha K" handle="shraddhak" />
                <SuggestionItem name="Vaibhav P" handle="vaibhavp" />
            </div>
        </aside>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    sidebar: {
        width: '350px',
        minWidth: '350px',
        height: '100vh',
        padding: '24px',
        boxSizing: 'border-box',
        backgroundColor: '#F9FAFB',
    },
    profileContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        cursor: 'pointer', // Taaki user ko pata chale ki yeh clickable hai
    },
    profileName: {
        fontSize: '15px',
        fontWeight: '600',
        margin: 0,
    },
    profileHandle: {
        fontSize: '14px',
        color: '#6B7280',
        margin: 0,
    },
    switchButton: {
        marginLeft: 'auto',
        background: 'none',
        border: 'none',
        color: 'var(--brand-purple)',
        fontWeight: '600',
        cursor: 'pointer',
    },
    suggestionsContainer: {
        // Container ke liye styles agar zaroorat pade
    },
    suggestionsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    suggestionsTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#6B7280',
        margin: 0,
    },
    seeAllLink: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#111827',
        textDecoration: 'none',
    },
    suggestionItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
    },
    suggestionAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#E5E7EB',
    },
    suggestionName: {
        fontSize: '14px',
        fontWeight: '600',
        margin: 0,
    },
    suggestionHandle: {
        fontSize: '13px',
        color: '#6B7280',
        margin: 0,
    },
    followButton: {
        marginLeft: 'auto',
        background: 'none',
        border: 'none',
        color: 'var(--brand-purple)',
        fontWeight: '600',
        cursor: 'pointer',
    }
};

export default RightSidebar;

