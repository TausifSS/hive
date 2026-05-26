import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { CheckCircle2, Shield, Trash2, UserX, UserCheck, XCircle } from 'lucide-react';
import { deleteAdminUser, getAdminUsers, getClubApplications, reviewClubApplication, setAdminUserBlocked, updateAdminUserRole, getAdminReports, deleteAdminReport, verifyEventAttendance, getEvents, deletePost } from '../lib/api';
import type { ClubApplication, User, UserRole, HiveEvent } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const roleLabels: Record<UserRole, string> = {
    student: 'Student',
    club_admin: 'Club Lead / Teacher',
    Admin: 'College Admin',
};

const AdminDashboardPage = () => {
    const { user: currentUser, refreshUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [applications, setApplications] = useState<ClubApplication[]>([]);
    const [activeTab, setActiveTab] = useState<'students' | 'clubs' | 'reports' | 'attendance'>('students');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [reports, setReports] = useState<any[]>([]);
    const [events, setEvents] = useState<HiveEvent[]>([]);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
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
        } catch (adminError) {
            setError(adminError instanceof Error ? adminError.message : 'Unable to load users');
        } finally {
            setIsLoading(false);
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
        const simulatedId = prompt("Scan Student QR ticket code (Simulated check-in). Enter Student ID/Handle:", "yash");
        if (simulatedId) {
            setAttendanceStudentId(simulatedId);
        }
    };

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
                    <h1 style={styles.title}>College Admin</h1>
                    <p style={styles.subtitle}>Manage HIVE users, roles, and blocked accounts</p>
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
                        }}
                        onClick={() => setActiveTab('students')}
                    >
                        Students
                        <span style={styles.segmentCount}>{studentUsers.length}</span>
                    </button>
                    <button
                        style={{
                            ...styles.segmentButton,
                            ...(activeTab === 'clubs' ? styles.activeSegment : {}),
                            fontSize: isMobile ? '12px' : '14px',
                            padding: isMobile ? '8px 10px' : '11px 14px',
                        }}
                        onClick={() => setActiveTab('clubs')}
                    >
                        Clubs
                        <span style={styles.segmentCount}>{clubUsers.length}</span>
                    </button>
                    <button
                        style={{
                            ...styles.segmentButton,
                            ...(activeTab === 'reports' ? styles.activeSegment : {}),
                            fontSize: isMobile ? '12px' : '14px',
                            padding: isMobile ? '8px 10px' : '11px 14px',
                        }}
                        onClick={() => setActiveTab('reports')}
                    >
                        Flags
                        <span style={styles.segmentCount}>{reports.length}</span>
                    </button>
                    <button
                        style={{
                            ...styles.segmentButton,
                            ...(activeTab === 'attendance' ? styles.activeSegment : {}),
                            fontSize: isMobile ? '12px' : '14px',
                            padding: isMobile ? '8px 10px' : '11px 14px',
                            minWidth: isMobile ? '110px' : 'auto',
                        }}
                        onClick={() => setActiveTab('attendance')}
                    >
                        Verify Check-in
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
                                    type="text" 
                                    placeholder="e.g. yash12" 
                                    value={attendanceStudentId}
                                    onChange={(e) => setAttendanceStudentId(e.target.value)}
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
                                    📸 Scan Ticket
                                </button>
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
                ) : visibleUsers.length === 0 ? (
                    <>
                        {activeTab === 'clubs' && <ClubApplications applications={applications} onReview={handleApplicationReview} isMobile={isMobile} />}
                        <div style={styles.stateBox}>No {activeTab === 'students' ? 'students' : 'club admins'} yet.</div>
                    </>
                ) : (
                    <>
                        {activeTab === 'clubs' && <ClubApplications applications={applications} onReview={handleApplicationReview} isMobile={isMobile} />}
                        <div style={styles.table}>
                            {visibleUsers.map((user) => {
                                const isSelf = user.id === currentUser?.id;
                                return (
                                    <div key={user.id} style={isMobile ? styles.mobileRow : styles.row}>
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

                                        {isMobile ? (
                                            <div style={styles.mobileControls}>
                                                <select
                                                    value={user.role}
                                                    onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
                                                    style={{ ...styles.select, flex: 1, padding: '6px 8px', fontSize: '13px' }}
                                                    disabled={isSelf}
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="club_admin">Club Lead</option>
                                                    <option value="Admin">Admin</option>
                                                </select>

                                                <div style={{ ...styles.activeBadge, ...(user.blockedAt ? styles.blockedBadge : {}), flex: 1, padding: '6px 8px', fontSize: '12px' }}>
                                                    {user.blockedAt ? 'Blocked' : roleLabels[user.role]}
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        style={styles.iconButton}
                                                        onClick={() => handleBlockToggle(user)}
                                                        disabled={isSelf}
                                                        title={user.blockedAt ? 'Unblock user' : 'Block user'}
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
                                            </div>
                                        ) : (
                                            <>
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
                                                    {user.blockedAt ? 'Blocked' : roleLabels[user.role]}
                                                </div>

                                                <button
                                                    style={styles.iconButton}
                                                    onClick={() => handleBlockToggle(user)}
                                                    disabled={isSelf}
                                                    title={user.blockedAt ? 'Unblock user' : 'Block user'}
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
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const ClubApplications = ({ applications, onReview, isMobile }: {
    applications: ClubApplication[];
    onReview: (application: ClubApplication, status: 'approved' | 'rejected') => void;
    isMobile: boolean;
}) => {
    const pendingApplications = applications.filter((application) => application.status === 'pending');

    if (pendingApplications.length === 0) {
        return <div style={styles.applicationEmpty}>No pending club verification requests.</div>;
    }

    const handleViewCertificate = (app: ClubApplication) => {
        if (!app.certificateData) {
            alert('No certificate document content uploaded.');
            return;
        }
        try {
            const parts = app.certificateData.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                win.focus();
            } else {
                throw new Error('Pop-up blocked');
            }
        } catch (e) {
            const link = document.createElement('a');
            link.href = app.certificateData;
            link.download = app.certificateName || 'certificate';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

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
                                    onClick={() => handleViewCertificate(application)}
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
};

export default AdminDashboardPage;
