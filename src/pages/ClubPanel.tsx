import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, MessageSquare, Newspaper, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEvents, verifyEventAttendance } from '../lib/api';
import type { HiveEvent } from '../lib/api';

const ClubPanelPage = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<HiveEvent[]>([]);
    const [error, setError] = useState('');

    const [selectedEventId, setSelectedEventId] = useState('');
    const [attendanceStudentId, setAttendanceStudentId] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [attendanceMessage, setAttendanceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleVerifyAttendance = async () => {
        if (!selectedEventId || !attendanceStudentId.trim()) return;
        setIsVerifying(true);
        setAttendanceMessage(null);
        try {
            const res = await verifyEventAttendance(selectedEventId, attendanceStudentId.trim());
            if (res.success) {
                setAttendanceMessage({
                    type: 'success',
                    text: `Successfully verified attendance! Credited ${res.user.name} (${res.user.id}) with points.`
                });
                setAttendanceStudentId('');
                const response = await getEvents();
                setEvents(response.events.filter((event) => event.organizerId === user?.id));
            }
        } catch (err) {
            setAttendanceMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to verify attendance'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSimulateScan = () => {
        const simulatedId = prompt("Scan Student QR ticket code (Simulated check-in). Enter Student ID/Handle:", user?.id || "yash");
        if (simulatedId) {
            setAttendanceStudentId(simulatedId);
        }
    };

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

            <section style={{ ...styles.panel, marginTop: '20px' }}>
                <h2 style={styles.panelTitle}>Scan/Verify Event Attendance</h2>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                    Verify a student's check-in QR ticket or manual ID to award event points.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>Select Event</label>
                        <select 
                            value={selectedEventId} 
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">-- Choose an Event --</option>
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>Student ID or Handle</label>
                        <input 
                            type="text" 
                            placeholder="e.g. yash12" 
                            value={attendanceStudentId}
                            onChange={(e) => setAttendanceStudentId(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <button 
                        onClick={handleVerifyAttendance} 
                        disabled={isVerifying || !selectedEventId || !attendanceStudentId.trim()}
                        style={{ ...styles.verifyButton, ...((isVerifying || !selectedEventId || !attendanceStudentId.trim()) ? styles.disabledButton : {}) }}
                    >
                        {isVerifying ? 'Verifying...' : 'Verify & Credit Points'}
                    </button>
                    <button 
                        onClick={handleSimulateScan}
                        disabled={isVerifying || !selectedEventId}
                        style={{ ...styles.scanButton, ...((isVerifying || !selectedEventId) ? styles.disabledButton : {}) }}
                    >
                        📸 Simulate QR Scan
                    </button>
                </div>
                {attendanceMessage && (
                    <div style={{ 
                        marginTop: '16px', 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        backgroundColor: attendanceMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                        color: attendanceMessage.type === 'success' ? '#065F46' : '#991B1B',
                        border: `1px solid ${attendanceMessage.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        {attendanceMessage.text}
                    </div>
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
    select: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white',
        height: '42px'
    },
    input: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: 'white',
        height: '42px'
    },
    verifyButton: {
        border: 'none',
        borderRadius: '8px',
        padding: '0 20px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
        height: '42px',
        whiteSpace: 'nowrap'
    },
    scanButton: {
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '0 16px',
        backgroundColor: '#F9FAFB',
        color: '#374151',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
        height: '42px',
        whiteSpace: 'nowrap'
    },
    disabledButton: {
        opacity: 0.6,
        cursor: 'not-allowed'
    }
};

export default ClubPanelPage;
