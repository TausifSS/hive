import React, { useState, useEffect } from 'react';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../context/AuthContext';

// Ek simple loading component
const LoadingSkeleton = () => (
    <div style={{...styles.card, backgroundColor: '#f9f9f9'}}>
        <div style={{...styles.imagePlaceholder, backgroundColor: '#e0e0e0'}}></div>
        <div style={styles.content}>
            <div style={{height: '20px', backgroundColor: '#e0e0e0', marginBottom: '10px', width: '80%'}}></div>
            <div style={{height: '40px', backgroundColor: '#e0e0e0'}}></div>
        </div>
    </div>
);

const EventsPage = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        setIsLoading(true);
        setTimeout(() => {
            // Empty state test karne ke liye: setEvents([])
            setEvents([ {id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6} ]); 
            setIsLoading(false);
        }, 1500);
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div style={styles.grid}>
                    {[...Array(6)].map((_, index) => <LoadingSkeleton key={index} />)}
                </div>
            );
        }
        if (events.length === 0) {
            return (
                <div style={styles.emptyState}>
                    <h2>No Events Found</h2>
                    <p>There are currently no events scheduled. Please check back later!</p>
                </div>
            );
        }
        return (
            <div style={styles.grid}>
                {events.map(event => <EventCard key={event.id} eventId={event.id} />)}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Campus Events</h1>
                    <p style={styles.subtitle}>Discover and join exciting events</p>
                </div>
                {user && (user.role === 'club_admin' || user.role === 'Admin') && (
                    <button style={styles.createButton}>+ Create Event</button>
                )}
            </div>
            
            {renderContent()}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { 
        padding: '24px' 
    },
    header: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
    },
    title: { 
        fontSize: '28px', 
        fontWeight: 'bold', 
        margin: 0,
        color: '#111827'
    },
    subtitle: { 
        fontSize: '16px', 
        color: '#6B7280', 
        margin: '4px 0 0 0' 
    },
    createButton: { 
        padding: '12px 20px', 
        backgroundColor: 'var(--brand-purple)', 
        color: 'white', 
        border: 'none', 
        borderRadius: '12px', 
        fontWeight: 'bold', 
        fontSize: '15px', 
        cursor: 'pointer' 
    },
    grid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '24px' 
    },
    emptyState: { 
        textAlign: 'center', 
        padding: '80px 20px', 
        color: '#6B7280',
        backgroundColor: '#F9FAFB',
        borderRadius: '16px'
    },
    // Styles for Loading Skeleton
    card: { 
        backgroundColor: 'white', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        border: '1px solid #E5E7EB' 
    },
    imagePlaceholder: { 
        height: '180px' 
    },
    content: { 
        padding: '16px' 
    },
};

export default EventsPage;

