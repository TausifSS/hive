import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Yeh ek simple details page hai
const EventDetailsPage = () => {
    // URL se event ID nikalne ke liye
    const { eventId } = useParams();

    return (
        <div style={styles.container}>
            <Link to="/events" style={styles.backLink}>
                <ArrowLeft size={20} />
                <span>Back to Events</span>
            </Link>
            <h1 style={styles.title}>Event Title #{eventId}</h1>
            <p style={styles.subtitle}>
                This is the detailed description for the event. More information about the schedule, speakers, and venue will be displayed here once we connect to the backend.
            </p>
            {/* Yahan event ki baaki details aayengi */}
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
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        margin: '0 0 16px 0',
    },
    subtitle: {
        fontSize: '18px',
        lineHeight: 1.6,
        color: '#374151',
    }
};

export default EventDetailsPage;
