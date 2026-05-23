import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Trophy, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEvent, registerForEvent } from '../lib/api';
import type { HiveEvent } from '../lib/api';

const EventDetailsPage = () => {
    const { eventId } = useParams();
    const { user, setUser } = useAuth();
    const [event, setEvent] = useState<HiveEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadEvent = async () => {
            if (!eventId) return;

            setIsLoading(true);
            setError('');

            try {
                const response = await getEvent(eventId);
                setEvent(response.event);
            } catch (eventError) {
                setError(eventError instanceof Error ? eventError.message : 'Unable to load event');
            } finally {
                setIsLoading(false);
            }
        };

        void loadEvent();
    }, [eventId]);

    const handleRegister = async () => {
        if (!event || !user || event.registeredUserIds.includes(user.id)) return;

        setError('');

        try {
            const response = await registerForEvent(event.id);
            setEvent(response.event);
            setUser(response.user);
        } catch (registerError) {
            setError(registerError instanceof Error ? registerError.message : 'Unable to register for event');
        }
    };

    const isRegistered = Boolean(user && event?.registeredUserIds.includes(user.id));

    return (
        <div style={styles.container}>
            <Link to="/events" style={styles.backLink}>
                <ArrowLeft size={20} />
                <span>Back to Events</span>
            </Link>

            {isLoading ? (
                <div style={styles.loadingBox}>Loading event...</div>
            ) : error ? (
                <div style={styles.errorBox}>{error}</div>
            ) : event ? (
                <>
                    <div style={{ ...styles.hero, backgroundImage: `url(${event.imageUrl})` }}>
                        <div style={styles.tag}>{event.category}</div>
                    </div>
                    <div style={styles.header}>
                        <div>
                            <h1 style={styles.title}>{event.title}</h1>
                            <p style={styles.organizer}>by {event.organizer}</p>
                        </div>
                        <button
                            style={isRegistered ? styles.registeredButton : styles.registerButton}
                            onClick={handleRegister}
                        >
                            {isRegistered ? 'Registered' : 'Register'}
                        </button>
                    </div>

                    <p style={styles.subtitle}>{event.description}</p>

                    <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                            <Calendar size={18} color="#6B7280" />
                            <span>{new Date(event.date).toLocaleString()}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <MapPin size={18} color="#6B7280" />
                            <span>{event.venue}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <Users size={18} color="#6B7280" />
                            <span>{event.registeredCount} registered / {event.capacity}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <Trophy size={18} color="#FBBF24" />
                            <span>{event.points} points</span>
                        </div>
                    </div>
                </>
            ) : (
                <div style={styles.errorBox}>Event not found</div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '24px',
    },
    backLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
        color: '#6B7280',
        marginBottom: '24px',
        fontWeight: '500',
    },
    hero: {
        height: '260px',
        borderRadius: '16px',
        backgroundColor: '#E5E7EB',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '16px',
        marginBottom: '24px',
    },
    tag: {
        display: 'inline-block',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        color: '#DC2626',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '16px',
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        margin: '0 0 8px 0',
    },
    organizer: {
        margin: 0,
        color: '#6B7280',
        fontWeight: '600',
    },
    subtitle: {
        fontSize: '18px',
        lineHeight: 1.6,
        color: '#374151',
    },
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
        marginTop: '24px',
    },
    detailItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '14px',
        color: '#374151',
    },
    registerButton: {
        padding: '12px 20px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    registeredButton: {
        padding: '12px 20px',
        backgroundColor: '#F3F4F6',
        color: '#374151',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'default',
    },
    loadingBox: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        color: '#6B7280',
        padding: '24px',
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        color: '#DC2626',
        padding: '16px',
    },
};

export default EventDetailsPage;
