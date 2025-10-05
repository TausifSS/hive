import React, { useState } from 'react';

const channels = [
    { id: 'global', name: 'global-college-chat' },
    { id: 'professional', name: 'professional-chats' },
    { id: 'placements', name: 'placement-talks' },
    { id: 'soon', name: 'Coming Soon', disabled: true },
];

const SlidingTabBar = () => {
    const [activeTab, setActiveTab] = useState('global');

    return (
        <div style={styles.container}>
            {channels.map(channel => (
                <button
                    key={channel.id}
                    onClick={() => !channel.disabled && setActiveTab(channel.id)}
                    style={{
                        ...styles.tab,
                        ...(activeTab === channel.id ? styles.activeTab : {}),
                        ...(channel.disabled ? styles.disabledTab : {})
                    }}
                    disabled={channel.disabled}
                >
                    {channel.name}
                </button>
            ))}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        overflowX: 'auto',
        padding: '12px 16px',
        gap: '12px',
        borderBottom: '1px solid var(--border-color)',
        // Scrollbar ko chhipane ke liye
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none',  // IE and Edge
    },
    tab: {
        padding: '8px 16px',
        borderRadius: '18px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        fontWeight: '500',
        fontSize: '14px',
        cursor: 'pointer',
        whiteSpace: 'nowrap', // Text ko wrap hone se rokne ke liye
        transition: 'all 0.2s ease-in-out',
    },
    activeTab: {
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        borderColor: 'var(--brand-purple)',
    },
    disabledTab: {
        color: '#9CA3AF',
        cursor: 'not-allowed',
        opacity: 0.6,
    }
};

// Scrollbar ko Webkit browsers (Chrome, Safari) mein chhipane ke liye
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(styleSheet);


export default SlidingTabBar;
