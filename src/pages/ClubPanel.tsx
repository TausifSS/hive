import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, MessageSquare, Newspaper, ShieldCheck } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
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
    const [fastTrackEnabled, setFastTrackEnabled] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

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
                if (fastTrackEnabled) {
                    setTimeout(() => {
                        const input = document.getElementById('attendance-input');
                        if (input) {
                            (input as HTMLInputElement).focus();
                        }
                    }, 50);
                }
            }
        } catch (err) {
            setAttendanceMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Failed to verify attendance'
            });
            if (fastTrackEnabled) {
                setTimeout(() => {
                    const input = document.getElementById('attendance-input');
                    if (input) {
                        (input as HTMLInputElement).focus();
                    }
                }, 50);
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleVerifyAttendance();
        }
    };

    const handleDecodedQr = (text: string) => {
        try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object' && data.id) {
                setAttendanceStudentId(data.id);
                setAttendanceMessage({
                    type: 'success',
                    text: `Scanned user: ${data.name || data.id} (Div: ${data.div || '-'}, Year: ${data.year || '-'}, Dept: ${data.dept || '-'})`
                });
                void verifyScannedAttendance(data.id);
            } else {
                setAttendanceStudentId(text);
                void verifyScannedAttendance(text);
            }
        } catch {
            setAttendanceStudentId(text);
            void verifyScannedAttendance(text);
        }
    };

    const verifyScannedAttendance = async (studentId: string) => {
        if (!selectedEventId || !studentId.trim()) return;
        setIsVerifying(true);
        try {
            const res = await verifyEventAttendance(selectedEventId, studentId.trim());
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
        const simulatedId = prompt("Scan Student QR ticket code (Simulated check-in). Enter Student ID/Handle or JSON:", user?.id || "yash");
        if (simulatedId) {
            handleDecodedQr(simulatedId);
        }
    };

    useEffect(() => {
        if (!isCameraOpen) return;
        
        let html5QrCode: Html5Qrcode | null = null;
        const qrId = 'qr-camera-element';
        
        const startScanner = async () => {
            try {
                html5QrCode = new Html5Qrcode(qrId);
                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText) => {
                        handleDecodedQr(decodedText);
                        stopScanner();
                    },
                    () => {
                        // scanning
                    }
                );
            } catch (err) {
                console.error("Camera access failed", err);
                alert("Failed to access camera. Please ensure permissions are granted.");
                setIsCameraOpen(false);
            }
        };
        
        const stopScanner = () => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop()
                    .then(() => {
                        setIsCameraOpen(false);
                    })
                    .catch((err) => {
                        console.error("Failed to stop scanner", err);
                        setIsCameraOpen(false);
                    });
            } else {
                setIsCameraOpen(false);
            }
        };

        void startScanner();
        
        return () => {
            if (html5QrCode && html5QrCode.isScanning) {
                void html5QrCode.stop().catch(err => console.error("Failed to stop scanner on unmount", err));
            }
        };
    }, [isCameraOpen]);

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
                            id="attendance-input"
                            type="text" 
                            placeholder="e.g. yash12" 
                            value={attendanceStudentId}
                            onChange={(e) => setAttendanceStudentId(e.target.value)}
                            onKeyDown={handleKeyDown}
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
                        onClick={() => setIsCameraOpen(true)}
                        disabled={isVerifying || !selectedEventId}
                        style={{ ...styles.verifyButton, backgroundColor: '#10B981', ...((isVerifying || !selectedEventId) ? styles.disabledButton : {}) }}
                    >
                        📸 Scan QR Code
                    </button>
                    <button 
                        onClick={handleSimulateScan}
                        disabled={isVerifying || !selectedEventId}
                        style={{ ...styles.scanButton, ...((isVerifying || !selectedEventId) ? styles.disabledButton : {}) }}
                    >
                        Simulate Scan
                    </button>
                </div>

                {isCameraOpen && (
                    <div style={styles.modalBackdrop} onClick={() => setIsCameraOpen(false)}>
                        <div style={{ ...styles.modalContent, maxWidth: '480px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                                Scan Student QR Ticket
                            </h3>
                            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
                                Center the QR code in the camera frame below to automatically verify attendance.
                            </p>
                            <div style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '320px',
                                aspectRatio: '1',
                                margin: '0 auto 20px auto',
                                backgroundColor: 'black',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '2px solid var(--brand-purple)'
                            }}>
                                <div id="qr-camera-element" style={{ width: '100%', height: '100%' }} />
                            </div>
                            <button 
                                onClick={() => setIsCameraOpen(false)}
                                style={{
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    backgroundColor: '#EF4444',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                Cancel / Close Camera
                            </button>
                        </div>
                    </div>
                )}
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: 'var(--brand-purple)' }}>
                        <input 
                            type="checkbox"
                            checked={fastTrackEnabled}
                            onChange={(e) => setFastTrackEnabled(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        ⚡ Fast-Track Scan Mode (Auto-verify & refocus on Enter)
                    </label>
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
    }
};

export default ClubPanelPage;
