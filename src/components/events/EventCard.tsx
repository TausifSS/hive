import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Users } from 'lucide-react';
import type { HiveEvent } from '../../lib/api';

interface EventCardProps {
    event: HiveEvent;
    isRegistered: boolean;
    onRegister: (eventId: string) => void;
}

const formatEventDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

const EventCard = ({ event, isRegistered, onRegister }: EventCardProps) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/event/${event.id}`);
    };

    const handleRegister = (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        onRegister(event.id);
    };

    return (
        <div style={styles.card} onClick={handleCardClick}>
            <div style={{ ...styles.imagePlaceholder, backgroundImage: `url(${event.imageUrl})` }}>
                <div style={styles.tag}>{event.category}</div>
                <div style={styles.pointsTag}>
                    <Trophy size={14} color="#FBBF24" />
                    <span>{event.points}</span>
                </div>
            </div>
            <div style={styles.content}>
                <h3 style={styles.title}>{event.title}</h3>
                <p style={styles.description}>{event.description}</p>
                <div style={styles.details}>
                    <div style={styles.detailItem}>
                        <Calendar size={16} color="#6B7280" />
                        <span>{formatEventDate(event.date)}</span>
                    </div>
                    <div style={styles.detailItem}>
                        <MapPin size={16} color="#6B7280" />
                        <span>{event.venue}</span>
                    </div>
                    <div style={styles.detailItem}>
                        <Users size={16} color="#6B7280" />
                        <span>{event.registeredCount} registered / {event.capacity}</span>
                    </div>
                </div>
                <div style={styles.footer}>
                    <span style={styles.organizer}>by {event.organizer}</span>
                    <button
                        style={isRegistered ? styles.registeredButton : styles.registerButton}
                        onClick={handleRegister}
                    >
                        {isRegistered ? 'Registered' : 'Register'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    link: {
        textDecoration: 'none',
        color: 'inherit',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid #E5E7EB',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        cursor: 'pointer',
    },
    imagePlaceholder: {
        height: '180px',
        backgroundColor: '#F3F4F6',
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '12px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    },
    tag: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        color: '#DC2626',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
    },
    pointsTag: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '600',
    },
    content: {
        padding: '16px',
    },
    title: {
        fontSize: '18px',
        fontWeight: 'bold',
        margin: '0 0 8px 0',
        color: '#1F2937',
    },
    description: {
        fontSize: '14px',
        color: '#4B5563',
        margin: '0 0 16px 0',
        lineHeight: 1.5,
    },
    details: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
        borderTop: '1px solid #F3F4F6',
        paddingTop: '16px',
    },
    detailItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6B7280',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
    },
    organizer: {
        fontSize: '13px',
        color: '#6B7280',
        fontWeight: '500',
    },
    registerButton: {
        padding: '8px 16px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '14px',
        cursor: 'pointer',
    },
    registeredButton: {
        padding: '8px 16px',
        backgroundColor: '#F3F4F6',
        color: '#374151',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '14px',
        cursor: 'default',
    }
};

export default EventCard;
