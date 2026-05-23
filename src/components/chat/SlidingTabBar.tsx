import React from 'react';

export const chatChannels = [
    { id: 'global', name: 'global-college-chat' },
    { id: 'professional', name: 'professional-chats' },
    { id: 'placements', name: 'placement-talks' },
    { id: 'soon', name: 'Coming Soon', disabled: true },
];

const SlidingTabBar = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tabId: string) => void }) => {
    return (
        <div style={styles.container}>
            {chatChannels.map(channel => (
                <button
                    key={channel.id}
                    onClick={() => !channel.disabled && onTabChange(channel.id)}
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
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
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
        whiteSpace: 'nowrap',
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

export default SlidingTabBar;
