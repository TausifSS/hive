import React from 'react';
import { Link } from 'react-router-dom';
// YEH FIX HAI: Trophy icon ko import kiya
import { MapPin, Calendar, Users, Trophy } from 'lucide-react';

// Is component ko eventId prop chahiye
const EventCard = ({ eventId }: { eventId: number }) => {
    return (
        // Poora card ab ek link hai
        <Link to={`/event/${eventId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={styles.card}>
                <div style={styles.imagePlaceholder}>
                    <div style={styles.tag}>Competition</div>
                    <div style={styles.pointsTag}>
                        <Trophy size={14} color="#FBBF24" />
                        <span>35</span>
                    </div>
                </div>
                <div style={styles.content}>
                    <h3 style={styles.title}>Entrepreneurship Summit 2024</h3>
                    <p style={styles.description}>
                        Meet successful entrepreneurs, attend keynote sessions, and participate in startup pitch...
                    </p>
                    <div style={styles.details}>
                        <div style={styles.detailItem}>
                            <Calendar size={16} color="#6B7280" />
                            <span>Feb 25, 2024</span>
                        </div>
                        <div style={styles.detailItem}>
                            <MapPin size={16} color="#6B7280" />
                            <span>Convention Center</span>
                        </div>
                        <div style={styles.detailItem}>
                            <Users size={16} color="#6B7280" />
                            <span>124 registered / 200</span>
                        </div>
                    </div>
                    <div style={styles.footer}>
                        <span style={styles.organizer}>by E-Cell GHRCEM</span>
                        <button style={styles.registerButton}>Register</button>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
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
        backgroundImage: 'url(https://placehold.co/400x200/cccccc/ffffff?text=Event+Image)',
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
    }
};

export default EventCard;

