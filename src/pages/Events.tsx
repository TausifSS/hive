import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../context/AuthContext';
import { createEvent, getEvents, registerForEvent } from '../lib/api';
import type { HiveEvent } from '../lib/api';

const LoadingSkeleton = () => (
    <div style={{ ...styles.card, backgroundColor: '#f9f9f9' }}>
        <div style={{ ...styles.imagePlaceholder, backgroundColor: '#e0e0e0' }}></div>
        <div style={styles.content}>
            <div style={{ height: '20px', backgroundColor: '#e0e0e0', marginBottom: '10px', width: '80%' }}></div>
            <div style={{ height: '40px', backgroundColor: '#e0e0e0' }}></div>
        </div>
    </div>
);

const EventsPage = () => {
    const { user, setUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [events, setEvents] = useState<HiveEvent[]>([]);
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        category: 'General',
        date: '',
        venue: '',
        capacity: '80',
        points: '20',
        imageUrl: '',
    });

    const loadEvents = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await getEvents();
            setEvents(response.events);
        } catch (eventsError) {
            setError(eventsError instanceof Error ? eventsError.message : 'Unable to load events');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadEvents();
    }, []);

    const handleRegister = async (eventId: string) => {
        if (!user) return;

        const targetEvent = events.find((event) => event.id === eventId);
        if (targetEvent?.registeredUserIds.includes(user.id)) return;

        setError('');

        try {
            const response = await registerForEvent(eventId);
            setEvents((currentEvents) => currentEvents.map((event) => event.id === eventId ? response.event : event));
            setUser(response.user);
        } catch (registerError) {
            setError(registerError instanceof Error ? registerError.message : 'Unable to register for event');
        }
    };

    const handleCreateEvent = async (event: FormEvent) => {
        event.preventDefault();
        if (!user) return;

        setIsCreating(true);
        setError('');

        try {
            const parsedDate = new Date(eventForm.date.replace(' ', 'T'));
            if (Number.isNaN(parsedDate.getTime())) {
                setError('Enter a valid event date like 2026-06-01 10:30');
                setIsCreating(false);
                return;
            }

            const response = await createEvent({
                title: eventForm.title,
                description: eventForm.description,
                category: eventForm.category,
                date: parsedDate.toISOString(),
                venue: eventForm.venue,
                organizer: user.name,
                capacity: Number(eventForm.capacity),
                points: Number(eventForm.points),
                imageUrl: eventForm.imageUrl || undefined,
            });
            setEvents((currentEvents) => [response.event, ...currentEvents]);
            setIsCreateOpen(false);
            setEventForm({
                title: '',
                description: '',
                category: 'General',
                date: '',
                venue: '',
                capacity: '80',
                points: '20',
                imageUrl: '',
            });
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : 'Unable to create event');
        } finally {
            setIsCreating(false);
        }
    };

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
                {events.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        isRegistered={Boolean(user && event.registeredUserIds.includes(user.id))}
                        onRegister={handleRegister}
                    />
                ))}
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
                    <button style={styles.createButton} onClick={() => setIsCreateOpen(true)} disabled={isCreating}>
                        + Create Event
                    </button>
                )}
            </div>

            {error && (
                <div style={styles.errorBox}>
                    <span>{error}</span>
                    <button style={styles.retryButton} onClick={loadEvents}>Refresh</button>
                </div>
            )}

            {renderContent()}

            {isCreateOpen && (
                <div style={styles.modalBackdrop} onClick={() => setIsCreateOpen(false)}>
                    <form style={styles.modalContent} onSubmit={handleCreateEvent} onClick={(clickEvent) => clickEvent.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Create Campus Event</h2>
                            <button type="button" style={styles.closeButton} onClick={() => setIsCreateOpen(false)}>Close</button>
                        </div>
                        <div style={styles.formGrid}>
                            <input
                                style={styles.input}
                                placeholder="Event title"
                                value={eventForm.title}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, title: inputEvent.target.value })}
                                required
                            />
                            <input
                                style={styles.input}
                                placeholder="Category"
                                value={eventForm.category}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, category: inputEvent.target.value })}
                                required
                            />
                            <input
                                style={styles.input}
                                type="datetime-local"
                                value={eventForm.date}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, date: inputEvent.target.value })}
                                required
                            />
                            <input
                                style={styles.input}
                                placeholder="Venue"
                                value={eventForm.venue}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, venue: inputEvent.target.value })}
                                required
                            />
                            <input
                                style={styles.input}
                                type="number"
                                min="1"
                                placeholder="Capacity"
                                value={eventForm.capacity}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, capacity: inputEvent.target.value })}
                                required
                            />
                            <input
                                style={styles.input}
                                type="number"
                                min="0"
                                placeholder="Points"
                                value={eventForm.points}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, points: inputEvent.target.value })}
                                required
                            />
                            <input
                                style={{ ...styles.input, ...styles.fullWidth }}
                                placeholder="Image URL optional"
                                value={eventForm.imageUrl}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, imageUrl: inputEvent.target.value })}
                            />
                            <textarea
                                style={{ ...styles.input, ...styles.textarea, ...styles.fullWidth }}
                                placeholder="Description"
                                value={eventForm.description}
                                onChange={(inputEvent) => setEventForm({ ...eventForm, description: inputEvent.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" style={styles.submitButton} disabled={isCreating}>
                            {isCreating ? 'Creating...' : 'Publish Event'}
                        </button>
                    </form>
                </div>
            )}
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
        gap: '16px',
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
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
    },
    retryButton: {
        padding: '8px 12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#DC2626',
        color: 'white',
        fontWeight: '600',
        cursor: 'pointer',
    },
    modalBackdrop: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    modalContent: {
        width: '100%',
        maxWidth: '720px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
    },
    modalHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '18px',
    },
    modalTitle: {
        margin: 0,
        fontSize: '20px',
        color: '#111827',
    },
    closeButton: {
        border: 'none',
        backgroundColor: '#F3F4F6',
        borderRadius: '8px',
        padding: '8px 12px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '12px',
    },
    input: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #D1D5DB',
        borderRadius: '10px',
        padding: '12px 14px',
        fontSize: '15px',
    },
    fullWidth: {
        gridColumn: '1 / -1',
    },
    textarea: {
        minHeight: '120px',
        resize: 'vertical',
        fontFamily: 'inherit',
    },
    submitButton: {
        width: '100%',
        marginTop: '16px',
        padding: '13px 18px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontWeight: 800,
        cursor: 'pointer',
    },
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
