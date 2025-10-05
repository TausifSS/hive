import React from 'react';

const SlidingTabBar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
    const tabs = ['Local', 'Global'];

    return (
        <div style={styles.container}>
            {tabs.map(tab => (
                <div key={tab} style={styles.tabContainer} onClick={() => setActiveTab(tab)}>
                    <span style={{ ...styles.tabText, ...(activeTab === tab ? styles.activeTabText : {}) }}>
                        {tab}
                    </span>
                    {activeTab === tab && <div style={styles.activeIndicator}></div>}
                </div>
            ))}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '16px',
    },
    tabContainer: {
        padding: '12px 16px',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    tabText: {
        fontSize: '16px',
        fontWeight: '500',
        color: 'var(--text-secondary)',
        transition: 'color 0.2s',
    },
    activeTabText: {
        color: 'var(--brand-purple)',
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        height: '3px',
        width: '100%',
        backgroundColor: 'var(--brand-purple)',
        borderRadius: '3px 3px 0 0',
    }
};

export default SlidingTabBar;
