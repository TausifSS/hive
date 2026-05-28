import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Trophy, Users, Trash2, Download, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEvent, registerForEvent, deleteEvent, getEventRegistrations, updateEvent } from '../lib/api';
import type { HiveEvent, EventAttendance } from '../lib/api';

const EventDetailsPage = () => {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const { user, setUser } = useAuth();
    const [event, setEvent] = useState<HiveEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [registrations, setRegistrations] = useState<EventAttendance[]>([]);
    const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
    
    // Menu & Edit states
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        category: 'General',
        date: '',
        venue: '',
        capacity: 100,
        points: 0,
        imageUrl: '',
    });

    useEffect(() => {
        const loadEvent = async () => {
            if (!eventId) return;

            setIsLoading(true);
            setError('');

            try {
                const response = await getEvent(eventId);
                if (response && response.event) {
                    setEvent(response.event);
                    const isOrgOrAdmin = response.event.organizerId === user?.id || user?.role === 'Admin';
                    if (isOrgOrAdmin) {
                        setIsLoadingRegistrations(true);
                        const res = await getEventRegistrations(eventId);
                        if (res && res.registrations) {
                            setRegistrations(res.registrations);
                        } else {
                            setRegistrations([]);
                        }
                        setIsLoadingRegistrations(false);
                    }
                } else {
                    setError('Event details could not be parsed.');
                }
            } catch (eventError) {
                setError(eventError instanceof Error ? eventError.message : 'Unable to load event');
            } finally {
                setIsLoading(false);
            }
        };

        void loadEvent();
    }, [eventId, user?.id, user?.role]);

    const handleRegister = async () => {
        if (!event || !user || !event.registeredUserIds || event.registeredUserIds.includes(user.id)) return;

        setError('');

        try {
            const response = await registerForEvent(event.id);
            if (response && response.event) {
                setEvent(response.event);
                setUser(response.user);
                
                // Reload registrations list
                const isOrgOrAdmin = response.event.organizerId === user?.id || user?.role === 'Admin';
                if (isOrgOrAdmin) {
                    const res = await getEventRegistrations(event.id);
                    if (res && res.registrations) {
                        setRegistrations(res.registrations);
                    }
                }
            }
        } catch (registerError) {
            setError(registerError instanceof Error ? registerError.message : 'Unable to register for event');
        }
    };

    const handleDeleteEvent = async () => {
        if (!event) return;
        if (!window.confirm(`Are you sure you want to delete "${event.title}" from HIVE? This cannot be undone.`)) return;

        setError('');
        try {
            await deleteEvent(event.id);
            navigate('/events');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete event');
        }
    };

    const openEditModal = () => {
        if (!event) return;
        try {
            let formattedDate = '';
            if (event.date) {
                const parsedDate = new Date(event.date);
                if (!isNaN(parsedDate.getTime())) {
                    formattedDate = parsedDate.toISOString().slice(0, 16);
                }
            }
            setEditForm({
                title: event.title || '',
                description: event.description || '',
                category: event.category || 'General',
                date: formattedDate,
                venue: event.venue || '',
                capacity: event.capacity || 100,
                points: event.points || 0,
                imageUrl: event.imageUrl || '',
            });
        } catch (e) {
            console.error("Failed to format event date for edit modal", e);
            setEditForm({
                title: event.title || '',
                description: event.description || '',
                category: event.category || 'General',
                date: '',
                venue: event.venue || '',
                capacity: event.capacity || 100,
                points: event.points || 0,
                imageUrl: event.imageUrl || '',
            });
        }
        setIsEditOpen(true);
        setIsMenuOpen(false);
    };

    const handleSaveEvent = async () => {
        if (!event) return;
        try {
            const res = await updateEvent(event.id, editForm);
            if (res && res.event) {
                setEvent(res.event);
            }
            setIsEditOpen(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update event');
        }
    };

    const handleDownloadCSV = () => {
        if (!event) return;
        const headers = ['Student ID', 'Name', 'Email', 'Handle', 'Year', 'Division', 'Department', 'Status', 'Registered At'];
        const rows = registrations.map((r) => [
            r.userId,
            r.name,
            r.email,
            `@${r.handle}`,
            r.year || '',
            r.div || '',
            r.department || '',
            r.attended ? 'Attended (Checked-in)' : 'Registered Only',
            new Date(r.registeredAt).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Attendance_${event.title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isRegistered = Boolean(user && event && event.registeredUserIds && event.registeredUserIds.includes(user.id));

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
                    <div style={{ ...styles.hero, backgroundImage: `url(${event.imageUrl})`, position: 'relative' }}>
                        <div style={styles.tag}>{event.category}</div>
                        {user && (event.organizerId === user.id || user.role === 'Admin') && (
                            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                                <button 
                                    style={{
                                        border: 'none',
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    }}
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                >
                                    <MoreHorizontal size={20} color="#1F2937" />
                                </button>
                                {isMenuOpen && (
                                    <>
                                        <div 
                                            style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                                            onClick={() => setIsMenuOpen(false)} 
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: '46px',
                                            right: 0,
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            border: '1px solid #E5E7EB',
                                            zIndex: 100,
                                            minWidth: '150px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden'
                                        }}>
                                            <button 
                                                style={{
                                                    padding: '10px 16px',
                                                    border: 'none',
                                                    backgroundColor: 'transparent',
                                                    textAlign: 'left',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    color: '#374151'
                                                }}
                                                onClick={openEditModal}
                                            >
                                                Edit Event
                                            </button>
                                            <button 
                                                style={{
                                                    padding: '10px 16px',
                                                    border: 'none',
                                                    backgroundColor: 'transparent',
                                                    textAlign: 'left',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    color: '#DC2626',
                                                    borderTop: '1px solid #F3F4F6'
                                                }}
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    void handleDeleteEvent();
                                                }}
                                            >
                                                Delete Event
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={styles.header}>
                        <div>
                            <h1 style={styles.title}>{event.title}</h1>
                            <p style={styles.organizer}>by {event.organizer}</p>
                        </div>
                        <div style={styles.actionButtonsContainer}>
                            {user?.role === 'student' && (
                                <button
                                    style={isRegistered ? styles.registeredButton : styles.registerButton}
                                    onClick={handleRegister}
                                    disabled={isRegistered || event.registeredCount >= event.capacity}
                                >
                                    {isRegistered ? 'Registered' : 'Register'}
                                </button>
                            )}
                            <a
                                href={getGoogleCalendarUrl(event)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.calendarButton}
                                title="Add to Google Calendar"
                            >
                                Add to Calendar
                            </a>
                            {user && (event.organizerId === user.id || user.role === 'Admin') && (
                                <button
                                    onClick={handleDeleteEvent}
                                    style={styles.deleteButton}
                                    title="Delete Event"
                                >
                                    <Trash2 size={16} />
                                    <span>Delete</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <p style={styles.subtitle}>{event.description}</p>

                    <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                            <Calendar size={18} color="#6B7280" />
                            <span>{event.date && !isNaN(new Date(event.date).getTime()) ? new Date(event.date).toLocaleString() : 'No date set'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <MapPin size={18} color="#6B7280" />
                            <span>{event.venue || 'No venue set'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <Users size={18} color="#6B7280" />
                            <span>{event.registeredCount || 0} registered / {event.capacity || 100}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <Trophy size={18} color="#FBBF24" />
                            <span>{event.points || 0} points</span>
                        </div>
                    </div>

                    {user && (event.organizerId === user.id || user.role === 'Admin') && (
                        <div style={styles.attendancePanel}>
                            <div style={styles.attendanceHeader}>
                                <div>
                                    <h3 style={styles.attendanceTitle}>Registrations & Attendance</h3>
                                    <p style={styles.attendanceSubtitle}>
                                        {(registrations || []).filter((r) => r.attended).length} checked in / {(registrations || []).length} registered students
                                    </p>
                                </div>
                                {(registrations || []).length > 0 && (
                                    <button onClick={handleDownloadCSV} style={styles.downloadButton}>
                                        <Download size={16} />
                                        <span>Download Excel (CSV)</span>
                                    </button>
                                )}
                            </div>

                            {isLoadingRegistrations ? (
                                <p style={{ color: '#6B7280', fontSize: '14px', margin: '12px 0' }}>Loading registrations...</p>
                            ) : (registrations || []).length === 0 ? (
                                <p style={{ color: '#6B7280', fontSize: '14px', margin: '12px 0' }}>No students registered for this event yet.</p>
                            ) : (
                                <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '12px', marginTop: '12px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                                <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Student</th>
                                                <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Email</th>
                                                <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Class Info</th>
                                                <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Status</th>
                                                <th style={{ padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Registered At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(registrations || []).map((reg) => (
                                                <tr key={reg.userId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#111827' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{reg.name}</div>
                                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>@{reg.handle}</div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#4B5563' }}>{reg.email}</td>
                                                    <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                                                        {reg.div ? `${reg.year} - ${reg.div} (${reg.department})` : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '4px 8px',
                                                            borderRadius: '999px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            backgroundColor: reg.attended ? '#ECFDF5' : '#FFF7ED',
                                                            color: reg.attended ? '#047857' : '#C2410C',
                                                            border: `1px solid ${reg.attended ? '#A7F3D0' : '#FED7AA'}`
                                                        }}>
                                                            {reg.attended ? 'Attended' : 'Registered'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                                                        {reg.registeredAt && !isNaN(new Date(reg.registeredAt).getTime()) ? new Date(reg.registeredAt).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div style={styles.errorBox}>Event not found</div>
            )}

            {isEditOpen && (
                <div style={styles.modalBackdrop} onClick={() => setIsEditOpen(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>Edit Event</h2>
                        
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Event Title</label>
                        <input 
                            style={styles.input} 
                            placeholder="Event Title" 
                            value={editForm.title} 
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} 
                        />
                        
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Category</label>
                        <select 
                            style={styles.input} 
                            value={editForm.category} 
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        >
                            <option value="General">General</option>
                            <option value="Technical">Technical</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Sports">Sports</option>
                            <option value="Seminar">Seminar</option>
                            <option value="Workshop">Workshop</option>
                        </select>
                        
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Date & Time</label>
                        <input 
                            type="datetime-local" 
                            style={styles.input} 
                            value={editForm.date} 
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} 
                        />
                        
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Venue</label>
                        <input 
                            style={styles.input} 
                            placeholder="Venue / Room" 
                            value={editForm.venue} 
                            onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })} 
                        />

                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Max Capacity</label>
                        <input 
                            type="number" 
                            style={styles.input} 
                            placeholder="Max capacity" 
                            value={editForm.capacity} 
                            onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })} 
                        />

                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Points Awarded</label>
                        <input 
                            type="number" 
                            style={styles.input} 
                            placeholder="Points" 
                            value={editForm.points} 
                            onChange={(e) => setEditForm({ ...editForm, points: Number(e.target.value) })} 
                        />

                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Poster Image URL</label>
                        <input 
                            style={styles.input} 
                            placeholder="Image URL" 
                            value={editForm.imageUrl} 
                            onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} 
                        />

                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151', textAlign: 'left' }}>Description</label>
                        <textarea 
                            style={{ ...styles.input, ...styles.textarea }} 
                            placeholder="Description of the event" 
                            value={editForm.description} 
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} 
                        />
                        
                        <div style={styles.modalActions}>
                            <button style={styles.cancelButton} onClick={() => setIsEditOpen(false)}>Cancel</button>
                            <button style={styles.saveProfileButton} onClick={handleSaveEvent}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const getGoogleCalendarUrl = (event: HiveEvent) => {
    try {
        const startDate = new Date(event.date);
        if (isNaN(startDate.getTime())) return '';
        // Default duration is 2 hours
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        
        const formatToGCal = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const dates = `${formatToGCal(startDate)}/${formatToGCal(endDate)}`;
        const text = encodeURIComponent(event.title || 'Event');
        const details = encodeURIComponent(`${event.description || ''}\n\nOrganizer: ${event.organizer || ''}\nPoints: ${event.points || 0}`);
        const location = encodeURIComponent(event.venue || '');
        
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
    } catch (e) {
        console.error("Failed to generate Google Calendar URL", e);
        return '';
    }
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
    actionButtonsContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    calendarButton: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 20px',
        backgroundColor: '#FFFFFF',
        color: 'var(--brand-purple, #8B5CF6)',
        border: '1px solid var(--brand-purple, #8B5CF6)',
        borderRadius: '10px',
        fontWeight: 'bold',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
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
    deleteButton: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 20px',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        border: '1px solid #FEE2E2',
        borderRadius: '10px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    attendancePanel: {
        marginTop: '32px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '16px',
        padding: '24px',
    },
    attendanceHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        borderBottom: '1px solid #F3F4F6',
        paddingBottom: '16px',
    },
    attendanceTitle: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#111827',
        margin: '0 0 4px 0',
    },
    attendanceSubtitle: {
        fontSize: '14px',
        color: '#6B7280',
        margin: 0,
    },
    downloadButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: '#F3F4F6',
        color: '#374151',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    modalBackdrop: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
    },
    modalContent: {
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #E5E7EB',
        maxHeight: '90vh',
        overflowY: 'auto',
    },
    modalTitle: {
        margin: '0 0 20px 0',
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#111827',
    },
    input: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '15px',
        marginBottom: '16px',
        outline: 'none',
        fontFamily: 'inherit',
    },
    textarea: {
        minHeight: '80px',
        resize: 'vertical',
    },
    modalActions: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '8px',
    },
    cancelButton: {
        border: 'none',
        borderRadius: '8px',
        padding: '10px 16px',
        backgroundColor: '#F3F4F6',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '15px',
    },
    saveProfileButton: {
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '15px',
    },
};

export default EventDetailsPage;
