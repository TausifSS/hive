import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, MessageSquare, Newspaper, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEvents } from '../lib/api';
import type { HiveEvent } from '../lib/api';

const ClubPanelPage = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<HiveEvent[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const response = await getEvents();
                setEvents(response.events.filter((event) => event.organizerId === user?.id));
            } catch (eventsError) {
                setError(eventsError instanceof Error ? eventsError.message : 'Unable to load club events');
            }
        };

        void load();
    }, [user?.id]);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <p style={styles.kicker}>Club Panel</p>
                    <h1 style={styles.title}>{user?.name || 'Club'} workspace</h1>
                    <p style={styles.subtitle}>Create events, watch registrations, and talk with students.</p>
                </div>
                <div style={styles.verifiedBadge}>
                    <ShieldCheck size={18} />
                    Verified Club
                </div>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.grid}>
                <Link to="/events" style={styles.actionCard}>
                    <CalendarPlus size={28} />
                    <strong>Create campus event</strong>
                    <span>{events.length} events by this club</span>
                </Link>
                <Link to="/chat" style={styles.actionCard}>
                    <MessageSquare size={28} />
                    <strong>Open social chat</strong>
                    <span>Coordinate with students</span>
                </Link>
                <Link to="/top-stories" style={styles.actionCard}>
                    <Newspaper size={28} />
                    <strong>Official updates</strong>
                    <span>Read college announcements</span>
                </Link>
            </div>

            <section style={styles.panel}>
                <h2 style={styles.panelTitle}>Your Events</h2>
                {events.length === 0 ? (
                    <p style={styles.emptyText}>No events published by this club yet.</p>
                ) : (
                    events.map((event) => (
                        <Link key={event.id} to={`/event/${event.id}`} style={styles.eventRow}>
                            <div>
                                <strong>{event.title}</strong>
                                <p>{new Date(event.date).toLocaleString()} - {event.venue}</p>
                            </div>
                            <span>{event.registeredCount}/{event.capacity}</span>
                        </Link>
                    ))
                )}
            </section>
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        padding: '24px',
        minHeight: '100%',
        backgroundColor: 'var(--background-main)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '22px',
    },
    kicker: {
        margin: 0,
        color: 'var(--brand-purple)',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0,
        fontSize: '13px',
    },
    title: {
        margin: '4px 0',
        fontSize: '30px',
        color: '#111827',
    },
    subtitle: {
        margin: 0,
        color: '#6B7280',
    },
    verifiedBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ECFDF5',
        color: '#047857',
        border: '1px solid #A7F3D0',
        borderRadius: '999px',
        padding: '10px 14px',
        fontWeight: 900,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '22px',
    },
    actionCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '18px',
        color: '#111827',
        textDecoration: 'none',
    },
    panel: {
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '18px',
    },
    panelTitle: {
        margin: '0 0 14px 0',
        fontSize: '20px',
    },
    eventRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 0',
        borderTop: '1px solid #F3F4F6',
        color: '#111827',
        textDecoration: 'none',
    },
    emptyText: {
        color: '#6B7280',
        margin: 0,
    },
    errorBox: {
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '16px',
    },
};

export default ClubPanelPage;
