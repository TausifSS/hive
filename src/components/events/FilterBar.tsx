import React from 'react';
import { Rocket, Trophy, Monitor, Drama, BookOpen, Wrench, Globe } from 'lucide-react';

const FilterBar = () => {
    const [activeFilter, setActiveFilter] = React.useState('All Events');
    
    const filters = [
        { name: 'All Events', icon: <Rocket size={20} /> },
        { name: 'Tech', icon: <Monitor size={20} /> },
        { name: 'Sports', icon: <Globe size={20} /> },
        { name: 'Cultural', icon: <Drama size={20} /> },
        { name: 'Academic', icon: <BookOpen size={20} /> },
        { name: 'Workshop', icon: <Wrench size={20} /> },
        { name: 'Competition', icon: <Trophy size={20} /> },
    ];

    return (
        <div style={styles.container}>
            {filters.map(filter => (
                <button
                    key={filter.name}
                    style={{
                        ...styles.button,
                        ...(activeFilter === filter.name ? styles.activeButton : {})
                    }}
                    onClick={() => setActiveFilter(filter.name)}
                >
                    {filter.icon}
                    <span style={styles.label}>{filter.name}</span>
                </button>
            ))}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        gap: '10px',
        padding: '8px',
        backgroundColor: '#F3F4F6',
        borderRadius: '12px',
        overflowX: 'auto',
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        fontWeight: '600',
        cursor: 'pointer',
        color: '#4B5563',
        fontSize: '14px',
        whiteSpace: 'nowrap',
    },
    activeButton: {
        backgroundColor: 'white',
        color: 'var(--brand-purple)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    label: {
        // Aap chaho to mobile par label hide kar sakte ho
    }
};

export default FilterBar;
