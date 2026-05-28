import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, Shield, Trash2, UserX, UserCheck, XCircle, Plus, Edit } from 'lucide-react';
import { deleteAdminUser, getAdminUsers, getClubApplications, reviewClubApplication, setAdminUserBlocked, updateAdminUserRole, getAdminReports, deleteAdminReport, verifyEventAttendance, getEvents, deletePost, getTopStories, createTopStory, updateTopStory, deleteTopStory } from '../lib/api';
import type { ClubApplication, User, UserRole, HiveEvent, TopStory } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const roleLabels: Record<UserRole, string> = {
    student: 'Student',
    club_admin: 'Club Lead / Teacher',
    Admin: 'College Admin',
};

const AdminDashboardPage = () => {
    const { user: currentUser, refreshUser } = useAuth();
    const isTechAdmin = currentUser?.email === 'hive@team.in';
    const [users, setUsers] = useState<User[]>([]);
    const [applications, setApplications] = useState<ClubApplication[]>([]);
    const [activeTab, setActiveTab] = useState<'students' | 'clubs' | 'reports' | 'attendance' | 'stories'>('students');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [reports, setReports] = useState<any[]>([]);
    const [events, setEvents] = useState<HiveEvent[]>([]);
    const [stories, setStories] = useState<TopStory[]>([]);

    // Story Management form states
    const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
    const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
    const [storyForm, setStoryForm] = useState({ title: '', summary: '', body: '', category: 'Official' });
    const [isSubmittingStory, setIsSubmittingStory] = useState(false);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [previewDoc, setPreviewDoc] = useState<{ name: string; data: string } | null>(null);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Attendance desk states
    const [selectedEventId, setSelectedEventId] = useState('');
    const [attendanceStudentId, setAttendanceStudentId] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [attendanceMessage, setAttendanceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [fastTrackEnabled, setFastTrackEnabled] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const studentUsers = users.filter((user) => user.role === 'student');
    const clubUsers = users.filter((user) => user.role !== 'student');
    const visibleUsers = activeTab === 'students' ? studentUsers : clubUsers;

    const loadUsers = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await getAdminUsers();
            setUsers(response.users);
            const applicationResponse = await getClubApplications();
            setApplications(applicationResponse.applications);
            const reportsRes = await getAdminReports();
            setReports(reportsRes.reports);
            const eventsRes = await getEvents();
            setEvents(eventsRes.events);
            const storiesRes = await getTopStories();
            setStories(storiesRes.stories);
        } catch (adminError) {
            setError(adminError instanceof Error ? adminError.message : 'Unable to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storyForm.title.trim() || !storyForm.summary.trim()) return;
        setIsSubmittingStory(true);
        try {
            if (editingStoryId) {
                await updateTopStory(editingStoryId, storyForm);
            } else {
                await createTopStory(storyForm);
            }
            setIsStoryModalOpen(false);
            setEditingStoryId(null);
            setStoryForm({ title: '', summary: '', body: '', category: 'Official' });
            await loadUsers();
        } catch (err) {
            alert('Failed to save story');
        } finally {
            setIsSubmittingStory(false);
        }
    };

    const handleEditStoryClick = (story: TopStory) => {
        setEditingStoryId(story.id);
        setStoryForm({
            title: story.title,
            summary: story.summary,
            body: story.body || '',
            category: story.category
        });
        setIsStoryModalOpen(true);
    };

    const handleDeleteStoryClick = async (storyId: string) => {
        if (!window.confirm('Are you sure you want to delete this story?')) return;
        try {
            await deleteTopStory(storyId);
            await loadUsers();
        } catch (err) {
            alert('Failed to delete story');
        }
    };

    const handleDismissReport = async (reportId: string) => {
        setError('');
        try {
            await deleteAdminReport(reportId);
            setReports((prev) => prev.filter((r) => r.id !== reportId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to dismiss report');
        }
    };

    const handleDeleteReportedPost = async (reportId: string, postId: string) => {
        if (!window.confirm("Are you sure you want to delete this post? This will delete the post from HIVE and dismiss the report.")) return;
        setError('');
        try {
            await deletePost(postId);
            await deleteAdminReport(reportId);
            setReports((prev) => prev.filter((r) => r.id !== reportId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete post');
        }
    };

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
                if (fastTrackEnabled) {
                    setTimeout(() => {
                        const input = document.getElementById('attendance-input-admin');
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
                    const input = document.getElementById('attendance-input-admin');
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
        const simulatedId = prompt("Scan Student QR ticket code (Simulated check-in). Enter Student ID/Handle or JSON:", "yash");
        if (simulatedId) {
            handleDecodedQr(simulatedId);
        }
    };

    useEffect(() => {
        if (!isCameraOpen) return;
        
        let html5QrCode: Html5Qrcode | null = null;
        const qrId = 'qr-camera-element-admin';
        
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
        void loadUsers();
    }, []);

    const updateLocalUser = (updatedUser: User) => {
        setUsers((currentUsers) => currentUsers.map((user) => user.id === updatedUser.id ? updatedUser : user));
        if (updatedUser.id === currentUser?.id) {
            void refreshUser();
        }
    };

    const handleRoleChange = async (userId: string, role: UserRole) => {
        setError('');
        try {
            const response = await updateAdminUserRole(userId, role);
            updateLocalUser(response.user);
        } catch (roleError) {
            setError(roleError instanceof Error ? roleError.message : 'Unable to update role');
        }
    };

    const handleBlockToggle = async (user: User) => {
        setError('');
        try {
            const response = await setAdminUserBlocked(user.id, !user.blockedAt);
            updateLocalUser(response.user);
        } catch (blockError) {
            setError(blockError instanceof Error ? blockError.message : 'Unable to update block status');
        }
    };

    const handleDelete = async (user: User) => {
        if (!window.confirm(`Delete ${user.name} from HIVE? This removes their posts, comments, messages, and event registrations.`)) {
            return;
        }

        setError('');
        try {
            await deleteAdminUser(user.id);
            setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete user');
        }
    };

    const handleApplicationReview = async (application: ClubApplication, status: 'approved' | 'rejected') => {
        setError('');
        try {
            const response = await reviewClubApplication(application.id, status);
            setApplications((currentApplications) => currentApplications.map((item) => item.id === application.id ? response.application : item));
            if (status === 'approved') {
                await loadUsers();
                setActiveTab('clubs');
            }
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : 'Unable to review club request');
        }
    };

    return (
        <div style={{ ...styles.container, padding: isMobile ? '12px' : '24px' }}>
            <div style={{
                ...styles.header,
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div>
                    <h1 style={styles.title}>{isTechAdmin ? 'HIVE Tech Admin' : 'College Admin'}</h1>
                    <p style={styles.subtitle}>
                        {isTechAdmin 
                            ? 'Super Admin panel for account suspensions, user blocking, and system announcements.' 
                            : 'Manage HIVE users, roles, and blocked accounts'}
                    </p>
                </div>
                <div style={{ ...styles.adminBadge, alignSelf: isMobile ? 'stretch' : 'auto', justifyContent: 'center' }}>
                    <Shield size={18} />
                    <span>{currentUser?.name}</span>
                </div>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.panel}>
                <div style={styles.segmentedTabs}>
                    <button
                        style={{
                            ...styles.segmentButton,
                            ...(activeTab === 'students' ? styles.activeSegment : {}),
                            fontSize: isMobile ? '12px' : '14px',
                            padding: isMobile ? '8px 10px' : '11px 14px',
                            flex: isMobile ? '0 0 auto' : 1,
                            whiteSpace: 'nowrap',
                        }}
                        onClick={() => setActiveTab('students')}
                    >
                        Students
                        <span style={styles.segmentCount}>{studentUsers.length}</span>
                    </button>
                    {!isTechAdmin && (
                        <button
                            style={{
                                ...styles.segmentButton,
                                ...(activeTab === 'clubs' ? styles.activeSegment : {}),
                                fontSize: isMobile ? '12px' : '14px',
                                padding: isMobile ? '8px 10px' : '11px 14px',
                                flex: isMobile ? '0 0 auto' : 1,
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => setActiveTab('clubs')}
                        >
                            Clubs
                            <span style={styles.segmentCount}>{clubUsers.length}</span>
                        </button>
                    )}
                    <button
                        style={{
                            ...styles.segmentButton,
                            ...(activeTab === 'reports' ? styles.activeSegment : {}),
                            fontSize: isMobile ? '12px' : '14px',
                            padding: isMobile ? '8px 10px' : '11px 14px',
                            flex: isMobile ? '0 0 auto' : 1,
                            whiteSpace: 'nowrap',
                        }}
                        onClick={() => setActiveTab('reports')}
                    >
                        Flags
                        <span style={styles.segmentCount}>{reports.length}</span>
                    </button>
                    {!isTechAdmin && (
                        <button
                            style={{
                                ...styles.segmentButton,
                                ...(activeTab === 'attendance' ? styles.activeSegment : {}),
                                fontSize: isMobile ? '12px' : '14px',
                                padding: isMobile ? '8px 10px' : '11px 14px',
                                flex: isMobile ? '0 0 auto' : 1,
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => setActiveTab('attendance')}
                        >
                            Verify Check-in
                        </button>
                    )}
                    <button
                        style={{
                            ...styles.segmentButton,
                            ...(activeTab === 'stories' ? styles.activeSegment : {}),
                            fontSize: isMobile ? '12px' : '14px',
                            padding: isMobile ? '8px 10px' : '11px 14px',
                            flex: isMobile ? '0 0 auto' : 1,
                            whiteSpace: 'nowrap',
                        }}
                        onClick={() => setActiveTab('stories')}
                    >
                        Top Stories
                        <span style={styles.segmentCount}>{stories.length}</span>
                    </button>
                </div>
                {isLoading ? (
                    <div style={styles.stateBox}>Loading details...</div>
                ) : activeTab === 'reports' ? (
                    <div style={{ padding: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#111827' }}>Flagged Posts for Moderation</h2>
                        {reports.length === 0 ? (
                            <p style={{ color: '#6B7280', margin: '20px 0', textAlign: 'center' }}>No flagged reports found.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {reports.map((report) => (
                                    <div key={report.id} style={{ display: 'flex', flexDirection: 'column', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', backgroundColor: '#F9FAFB' }}>
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                                            <div>
                                                <span style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>Reason: "{report.reason}"</span>
                                                <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginTop: '2px' }}>
                                                    Reported by @{report.reporterHandle || report.reportedBy} on {new Date(report.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignSelf: isMobile ? 'flex-end' : 'auto' }}>
                                                <button 
                                                    style={{ border: 'none', borderRadius: '8px', padding: '6px 12px', backgroundColor: '#F3F4F6', color: '#374151', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                    onClick={() => handleDismissReport(report.id)}
                                                >
                                                    Dismiss
                                                </button>
                                                <button 
                                                    style={{ border: 'none', borderRadius: '8px', padding: '6px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                    onClick={() => handleDeleteReportedPost(report.id, report.postId)}
                                                >
                                                    Delete Post
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', borderLeft: '3px solid #8B5CF6', fontSize: '14px', color: '#374151', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                                                Original Author: {report.postAuthor?.name || 'User'} (@{report.postAuthor?.handle || report.postAuthor?.id})
                                            </div>
                                            {report.postContent || '[Post content missing]'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'attendance' ? (
                    <div style={{ padding: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>Event Attendance Check-in Desk</h2>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
                            Simulate scanner check-in tickets or select a campus event and enter a student ID manually.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px', textAlign: 'left' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>Select Campus Event</label>
                                <select 
                                    value={selectedEventId} 
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: 'white',
                                        height: '42px'
                                    }}
                                >
                                    <option value="">-- Choose an Event --</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.title}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>Student ID or Handle</label>
                                <input 
                                    id="attendance-input-admin"
                                    type="text" 
                                    placeholder="e.g. yash12" 
                                    value={attendanceStudentId}
                                    onChange={(e) => setAttendanceStudentId(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: 'white',
                                        height: '42px'
                                    }}
                                />
                            </div>
 
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button 
                                    onClick={handleVerifyAttendance} 
                                    disabled={isVerifying || !selectedEventId || !attendanceStudentId.trim()}
                                    style={{
                                        flex: 2,
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0 20px',
                                        backgroundColor: 'var(--brand-purple)',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        height: '42px',
                                        opacity: (isVerifying || !selectedEventId || !attendanceStudentId.trim()) ? 0.6 : 1
                                    }}
                                >
                                    {isVerifying ? 'Crediting...' : 'Verify & Credit Points'}
                                </button>
                                <button 
                                    onClick={() => setIsCameraOpen(true)}
                                    disabled={isVerifying || !selectedEventId}
                                    style={{
                                        flex: 2,
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0 20px',
                                        backgroundColor: '#10B981',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        height: '42px',
                                        opacity: (isVerifying || !selectedEventId) ? 0.6 : 1
                                    }}
                                >
                                    📸 Scan QR Code
                                </button>
                                <button 
                                    onClick={handleSimulateScan}
                                    disabled={isVerifying || !selectedEventId}
                                    style={{
                                        flex: 1,
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        padding: '0 16px',
                                        backgroundColor: '#F9FAFB',
                                        color: '#374151',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        height: '42px',
                                        opacity: (isVerifying || !selectedEventId) ? 0.6 : 1
                                    }}
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
                                            <div id="qr-camera-element-admin" style={{ width: '100%', height: '100%' }} />
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

                            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        </div>
 
                        {attendanceMessage && (
                            <div style={{ 
                                marginTop: '20px', 
                                padding: '12px 16px', 
                                borderRadius: '8px', 
                                backgroundColor: attendanceMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                                color: attendanceMessage.type === 'success' ? '#065F46' : '#991B1B',
                                border: `1px solid ${attendanceMessage.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                                fontSize: '14px',
                                fontWeight: '600',
                                maxWidth: '480px'
                             }}>
                                {attendanceMessage.text}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'stories' ? (
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                            <div style={{ textAlign: 'left' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>Top Stories Management</h2>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Add, edit, or delete official campus news announcements.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingStoryId(null);
                                    setStoryForm({ title: '', summary: '', body: '', category: 'Official' });
                                    setIsStoryModalOpen(true);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 18px',
                                    backgroundColor: 'var(--brand-purple)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    alignSelf: isMobile ? 'flex-start' : 'auto'
                                }}
                            >
                                <Plus size={16} />
                                Add Story
                            </button>
                        </div>

                        {stories.length === 0 ? (
                            <p style={{ color: '#6B7280', margin: '20px 0', textAlign: 'center' }}>No stories published yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {stories.map((story) => (
                                    <div key={story.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', backgroundColor: '#F9FAFB', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', flex: 1, width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ backgroundColor: '#EEF2FF', color: 'var(--brand-purple)', borderRadius: '999px', padding: '2px 8px', fontWeight: 700, fontSize: '11px' }}>
                                                    {story.category}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                                                    {new Date(story.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{story.title}</h3>
                                            <p style={{ fontSize: '13px', color: '#4B5563', margin: 0 }}>{story.summary}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignSelf: isMobile ? 'flex-end' : 'center' }}>
                                            <button
                                                onClick={() => handleEditStoryClick(story)}
                                                style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Edit Story"
                                            >
                                                <Edit size={16} color="#4B5563" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStoryClick(story.id)}
                                                style={{ border: '1px solid #FECACA', borderRadius: '8px', padding: '8px', backgroundColor: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Delete Story"
                                            >
                                                <Trash2 size={16} color="#DC2626" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : visibleUsers.length === 0 ? (
                    <>
                        {activeTab === 'clubs' && <ClubApplications applications={applications} onReview={handleApplicationReview} isMobile={isMobile} onViewCertificate={(name, data) => setPreviewDoc({ name, data })} />}
                        <div style={styles.stateBox}>No {activeTab === 'students' ? 'students' : 'club admins'} yet.</div>
                    </>
                ) : (
                    <>
                        {activeTab === 'clubs' && <ClubApplications applications={applications} onReview={handleApplicationReview} isMobile={isMobile} onViewCertificate={(name, data) => setPreviewDoc({ name, data })} />}
                        <div style={styles.table}>
                            {visibleUsers.map((user) => {
                                const isSelf = user.id === currentUser?.id;
                                return (
                                    <div key={user.id}>
                                        {isMobile ? (
                                            <div style={{
                                                ...styles.mobileRowContainer,
                                                borderColor: user.blockedAt ? '#FCA5A5' : '#E5E7EB',
                                                backgroundColor: user.blockedAt ? '#FFFDFD' : 'white',
                                            }}>
                                                <div style={styles.mobileRowTop}>
                                                    <div style={styles.identity}>
                                                        <img
                                                            src={user.avatarUrl || 'https://placehold.co/44x44/EFEFEF/333?text=HV'}
                                                            alt={user.name}
                                                            style={styles.avatar}
                                                        />
                                                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                            <p style={styles.name}>{user.name}</p>
                                                            <p style={{ ...styles.meta, wordBreak: 'break-all' }}>{user.email}</p>
                                                            <p style={styles.meta}>@{user.handle || user.id}</p>
                                                        </div>
                                                    </div>
                                                    {user.blockedAt ? (
                                                        <span style={styles.blockedBadgeTop}>{isTechAdmin ? 'Suspended' : 'Blocked'}</span>
                                                    ) : (
                                                        <span style={{
                                                            ...styles.blockedBadgeTop,
                                                            backgroundColor: '#ECFDF5',
                                                            color: '#047857'
                                                        }}>{roleLabels[user.role]}</span>
                                                    )}
                                                </div>
                                                <div style={styles.mobileDivider} />
                                                <div style={styles.mobileRowBottom}>
                                                    <select
                                                        value={user.role}
                                                        onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
                                                        style={styles.mobileSelect}
                                                        disabled={isSelf}
                                                     >
                                                        <option value="student">Student</option>
                                                        <option value="club_admin">Club Lead</option>
                                                        <option value="Admin">Admin</option>
                                                    </select>
                                                    <div style={styles.mobileActions}>
                                                        <button
                                                            style={styles.mobileActionButton}
                                                            onClick={() => handleBlockToggle(user)}
                                                            disabled={isSelf}
                                                            title={user.blockedAt ? (isTechAdmin ? 'Lift Suspension' : 'Unblock user') : (isTechAdmin ? 'Suspend user' : 'Block user')}
                                                        >
                                                            {user.blockedAt ? <UserCheck size={18} color="#047857" /> : <UserX size={18} color="#4B5563" />}
                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: user.blockedAt ? '#047857' : '#4B5563', marginLeft: '4px' }}>
                                                                {user.blockedAt ? (isTechAdmin ? 'Lift Suspension' : 'Unblock') : (isTechAdmin ? 'Suspend' : 'Block')}
                                                            </span>
                                                        </button>
                                                        <button
                                                            style={styles.mobileDeleteButton}
                                                            onClick={() => handleDelete(user)}
                                                            disabled={isSelf}
                                                            title="Delete user"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={styles.row}>
                                                <div style={styles.identity}>
                                                    <img
                                                        src={user.avatarUrl || 'https://placehold.co/44x44/EFEFEF/333?text=HV'}
                                                        alt={user.name}
                                                        style={styles.avatar}
                                                    />
                                                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                                        <p style={styles.name}>{user.name}</p>
                                                        <p style={{ ...styles.meta, wordBreak: 'break-all' }}>{user.email}</p>
                                                        <p style={styles.meta}>@{user.handle || user.id}</p>
                                                    </div>
                                                </div>
 
                                                <select
                                                    value={user.role}
                                                    onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
                                                    style={styles.select}
                                                    disabled={isSelf}
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="club_admin">Club Lead / Teacher</option>
                                                    <option value="Admin">College Admin</option>
                                                </select>
 
                                                <div style={user.blockedAt ? styles.blockedBadge : styles.activeBadge}>
                                                    {user.blockedAt ? (isTechAdmin ? 'Suspended' : 'Blocked') : roleLabels[user.role]}
                                                </div>
 
                                                <button
                                                    style={styles.iconButton}
                                                    onClick={() => handleBlockToggle(user)}
                                                    disabled={isSelf}
                                                    title={user.blockedAt ? (isTechAdmin ? 'Lift Suspension' : 'Unblock user') : (isTechAdmin ? 'Suspend user' : 'Block user')}
                                                >
                                                    {user.blockedAt ? <UserCheck size={18} /> : <UserX size={18} />}
                                                </button>
 
                                                <button
                                                    style={styles.deleteButton}
                                                    onClick={() => handleDelete(user)}
                                                    disabled={isSelf}
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {previewDoc && (
                <div style={styles.modalBackdrop} onClick={() => setPreviewDoc(null)}>
                    <div style={styles.previewModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>{previewDoc.name}</h3>
                            <button style={styles.closeButton} onClick={() => setPreviewDoc(null)}>×</button>
                        </div>
                        <div style={styles.previewModalBody}>
                            {previewDoc.data.startsWith('data:image/') ? (
                                <img
                                    src={previewDoc.data}
                                    alt="Club Certificate Preview"
                                    style={styles.previewImage}
                                />
                            ) : previewDoc.data.startsWith('data:application/pdf') ? (
                                <iframe
                                    src={previewDoc.data}
                                    title="Club Certificate Preview"
                                    style={styles.previewIframe}
                                />
                            ) : (
                                <div style={styles.unsupportedPreview}>
                                    <p style={{ margin: '0 0 16px 0', fontSize: '15px' }}>This document type cannot be previewed directly.</p>
                                    <a
                                        href={previewDoc.data}
                                        download={previewDoc.name}
                                        style={styles.downloadLink}
                                    >
                                        Download Certificate
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isStoryModalOpen && (
                <div style={styles.modalBackdrop} onClick={() => { setIsStoryModalOpen(false); setEditingStoryId(null); }}>
                    <div style={styles.previewModalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                                {editingStoryId ? 'Edit Top Story' : 'Create Top Story'}
                            </h3>
                            <button style={styles.closeButton} onClick={() => { setIsStoryModalOpen(false); setEditingStoryId(null); }}>×</button>
                        </div>
                        <form onSubmit={handleSaveStory} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', overflowY: 'auto' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4B5563', marginBottom: '6px' }}>Title</label>
                                <input
                                    type="text"
                                    placeholder="Enter story title..."
                                    value={storyForm.title}
                                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: '#F9FAFB',
                                        boxSizing: 'border-box'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4B5563', marginBottom: '6px' }}>Category</label>
                                <select
                                    value={storyForm.category}
                                    onChange={(e) => setStoryForm({ ...storyForm, category: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: '#F9FAFB',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="Official">Official</option>
                                    <option value="Events">Events</option>
                                    <option value="Placements">Placements</option>
                                    <option value="Clubs">Clubs</option>
                                    <option value="Platform">Platform</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4B5563', marginBottom: '6px' }}>Short Summary</label>
                                <input
                                    type="text"
                                    placeholder="Enter short summary sentence..."
                                    value={storyForm.summary}
                                    onChange={(e) => setStoryForm({ ...storyForm, summary: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: '#F9FAFB',
                                        boxSizing: 'border-box'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4B5563', marginBottom: '6px' }}>Detailed Body (Optional)</label>
                                <textarea
                                    placeholder="Detailed details or body of story..."
                                    value={storyForm.body}
                                    onChange={(e) => setStoryForm({ ...storyForm, body: e.target.value })}
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        padding: '10px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: '#F9FAFB',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmittingStory || !storyForm.title.trim() || !storyForm.summary.trim()}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--brand-purple)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    opacity: (isSubmittingStory || !storyForm.title.trim() || !storyForm.summary.trim()) ? 0.6 : 1,
                                    marginTop: '8px'
                                }}
                            >
                                {isSubmittingStory ? 'Saving...' : 'Save Story'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClubApplications = ({ applications, onReview, isMobile, onViewCertificate }: {
    applications: ClubApplication[];
    onReview: (application: ClubApplication, status: 'approved' | 'rejected') => void;
    isMobile: boolean;
    onViewCertificate: (name: string, data: string) => void;
}) => {
    const pendingApplications = applications.filter((application) => application.status === 'pending');

    if (pendingApplications.length === 0) {
        return <div style={styles.applicationEmpty}>No pending club verification requests.</div>;
    }

    return (
        <div style={styles.applicationPanel}>
            <h2 style={styles.applicationTitle}>Pending Club Verification</h2>
            {pendingApplications.map((application) => (
                <div key={application.id} style={{
                    ...styles.applicationRow,
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                }}>
                    <div style={{ minWidth: 0 }}>
                        <p style={styles.name}>{application.clubName}</p>
                        <p style={styles.meta}>{application.officialEmail}</p>
                        <p style={{
                            ...styles.meta,
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginTop: '4px'
                        }}>
                            <span>File: {application.certificateName}</span>
                            {application.certificateData && (
                                <button
                                    type="button"
                                    onClick={() => onViewCertificate(application.certificateName, application.certificateData || '')}
                                    style={styles.viewDocButton}
                                    title="View Certificate file"
                                >
                                    View Certificate
                                </button>
                            )}
                        </p>
                    </div>
                    <div style={{
                        ...styles.applicationActions,
                        justifyContent: isMobile ? 'flex-end' : 'flex-start',
                        marginTop: isMobile ? '10px' : '0'
                    }}>
                        <button style={styles.approveButton} onClick={() => onReview(application, 'approved')}><CheckCircle2 size={17} /> Approve</button>
                        <button style={styles.rejectButton} onClick={() => onReview(application, 'rejected')}><XCircle size={17} /> Reject</button>
                    </div>
                </div>
            ))}
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
        marginBottom: '20px',
    },
    title: {
        margin: 0,
        fontSize: '30px',
        color: '#111827',
    },
    subtitle: {
        margin: '4px 0 0 0',
        color: '#6B7280',
    },
    adminBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#111827',
        color: 'white',
        borderRadius: '10px',
        padding: '10px 12px',
        fontWeight: '700',
    },
    panel: {
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        overflow: 'hidden',
    },
    table: {
        display: 'flex',
        flexDirection: 'column',
    },
    applicationPanel: {
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F8FAFC',
    },
    applicationTitle: {
        margin: '0 0 12px 0',
        fontSize: '18px',
        color: '#111827',
    },
    applicationRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '12px',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        backgroundColor: 'white',
        marginBottom: '10px',
    },
    applicationActions: {
        display: 'flex',
        gap: '8px',
    },
    applicationEmpty: {
        padding: '16px',
        color: '#6B7280',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    approveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: 'none',
        borderRadius: '9px',
        padding: '10px 12px',
        backgroundColor: '#ECFDF5',
        color: '#047857',
        fontWeight: 800,
        cursor: 'pointer',
    },
    rejectButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: 'none',
        borderRadius: '9px',
        padding: '10px 12px',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        fontWeight: 800,
        cursor: 'pointer',
    },
    segmentedTabs: {
        display: 'flex',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
        overflowX: 'auto',
        scrollbarWidth: 'none',
    },
    segmentButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        flex: 1,
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        backgroundColor: 'white',
        color: '#4B5563',
        padding: '11px 14px',
        fontWeight: 800,
        cursor: 'pointer',
    },
    activeSegment: {
        backgroundColor: 'var(--brand-purple)',
        borderColor: 'var(--brand-purple)',
        color: 'white',
    },
    segmentCount: {
        minWidth: '24px',
        borderRadius: '999px',
        backgroundColor: 'rgba(255,255,255,0.22)',
        padding: '2px 8px',
        fontSize: '13px',
    },
    row: {
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 1fr) 160px 130px 44px 44px',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        borderBottom: '1px solid #F3F4F6',
    },
    mobileRow: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '12px',
        padding: '16px',
        borderBottom: '1px solid #F3F4F6',
    },
    mobileControls: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
    },
    identity: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: 0,
    },
    avatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        objectFit: 'cover',
    },
    name: {
        margin: 0,
        fontWeight: '700',
        color: '#111827',
    },
    meta: {
        margin: '2px 0 0 0',
        color: '#6B7280',
        fontSize: '13px',
    },
    select: {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #D1D5DB',
        backgroundColor: 'white',
        fontWeight: '600',
    },
    activeBadge: {
        textAlign: 'center',
        padding: '8px 10px',
        borderRadius: '999px',
        backgroundColor: '#ECFDF5',
        color: '#047857',
        fontSize: '13px',
        fontWeight: '700',
    },
    blockedBadge: {
        textAlign: 'center',
        padding: '8px 10px',
        borderRadius: '999px',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        fontSize: '13px',
        fontWeight: '700',
    },
    iconButton: {
        width: '40px',
        height: '40px',
        borderRadius: '999px',
        border: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
        color: '#374151',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButton: {
        width: '40px',
        height: '40px',
        borderRadius: '999px',
        border: '1px solid #FECACA',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stateBox: {
        padding: '24px',
        textAlign: 'center',
        color: '#6B7280',
    },
    errorBox: {
        marginBottom: '16px',
        padding: '14px 16px',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        color: '#DC2626',
    },
    viewDocButton: {
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: 'bold',
        backgroundColor: '#EEF2F6',
        color: 'var(--brand-purple, #8B5CF6)',
        border: '1px solid #D2D6DC',
        borderRadius: '6px',
        cursor: 'pointer',
        marginLeft: '4px',
    },
    mobileRowContainer: {
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        marginBottom: '12px',
        textAlign: 'left',
    },
    mobileRowTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    mobileDivider: {
        height: '1px',
        backgroundColor: '#F3F4F6',
        margin: '12px 0',
    },
    mobileRowBottom: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
    },
    mobileSelect: {
        flex: 1,
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid #D1D5DB',
        backgroundColor: 'white',
        fontWeight: '600',
        fontSize: '13px',
    },
    mobileActions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    mobileActionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
        cursor: 'pointer',
    },
    mobileDeleteButton: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: '1px solid #FECACA',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    blockedBadgeTop: {
        padding: '4px 8px',
        borderRadius: '999px',
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        fontSize: '11px',
        fontWeight: 'bold',
    },
    previewModalContent: {
        width: '100%',
        maxWidth: '640px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
        overflow: 'hidden',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
    },
    closeButton: {
        border: 'none',
        background: 'none',
        fontSize: '28px',
        color: '#6B7280',
        cursor: 'pointer',
        lineHeight: 1,
    },
    previewModalBody: {
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        overflowY: 'auto',
        flex: 1,
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '60vh',
        objectFit: 'contain',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
    previewIframe: {
        width: '100%',
        height: '60vh',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'white',
    },
    unsupportedPreview: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#4B5563',
    },
    downloadLink: {
        display: 'inline-block',
        marginTop: '12px',
        padding: '10px 20px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: 'bold',
        textDecoration: 'none',
        borderRadius: '8px',
    },
};

export default AdminDashboardPage;
