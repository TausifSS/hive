import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { CheckCircle2, Shield, Trash2, UserX, UserCheck, XCircle } from 'lucide-react';
import { deleteAdminUser, getAdminUsers, getClubApplications, reviewClubApplication, setAdminUserBlocked, updateAdminUserRole } from '../lib/api';
import type { ClubApplication, User, UserRole } from '../lib/api';
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
    const [activeTab, setActiveTab] = useState<'students' | 'clubs'>('students');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
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
        } catch (adminError) {
            setError(adminError instanceof Error ? adminError.message : 'Unable to load users');
        } finally {
            setIsLoading(false);
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
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>College Admin</h1>
                    <p style={styles.subtitle}>Manage HIVE users, roles, and blocked accounts</p>
                </div>
                <div style={styles.adminBadge}>
                    <Shield size={18} />
                    <span>{currentUser?.name}</span>
                </div>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <div style={styles.panel}>
                <div style={styles.segmentedTabs}>
                    <button
                        style={{ ...styles.segmentButton, ...(activeTab === 'students' ? styles.activeSegment : {}) }}
                        onClick={() => setActiveTab('students')}
                    >
                        Students
                        <span style={styles.segmentCount}>{studentUsers.length}</span>
                    </button>
                    <button
                        style={{ ...styles.segmentButton, ...(activeTab === 'clubs' ? styles.activeSegment : {}) }}
                        onClick={() => setActiveTab('clubs')}
                    >
                        Club
                        <span style={styles.segmentCount}>{clubUsers.length}</span>
                    </button>
                </div>
                {isLoading ? (
                    <div style={styles.stateBox}>Loading users...</div>
                ) : visibleUsers.length === 0 ? (
                    <>
                        {activeTab === 'clubs' && <ClubApplications applications={applications} onReview={handleApplicationReview} />}
                        <div style={styles.stateBox}>No {activeTab === 'students' ? 'students' : 'club admins'} yet.</div>
                    </>
                ) : (
                    <>
                        {activeTab === 'clubs' && <ClubApplications applications={applications} onReview={handleApplicationReview} />}
                        <div style={styles.table}>
                            {visibleUsers.map((user) => {
                                const isSelf = user.id === currentUser?.id;
                                return (
                                    <div key={user.id} style={styles.row}>
                                        <div style={styles.identity}>
                                            <img
                                                src={user.avatarUrl || 'https://placehold.co/44x44/EFEFEF/333?text=HV'}
                                                alt={user.name}
                                                style={styles.avatar}
                                            />
                                            <div>
                                                <p style={styles.name}>{user.name}</p>
                                                <p style={styles.meta}>{user.email}</p>
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

const ClubApplications = ({ applications, onReview }: {
    applications: ClubApplication[];
    onReview: (application: ClubApplication, status: 'approved' | 'rejected') => void;
}) => {
    const pendingApplications = applications.filter((application) => application.status === 'pending');

    if (pendingApplications.length === 0) {
        return <div style={styles.applicationEmpty}>No pending club verification requests.</div>;
    }

    return (
        <div style={styles.applicationPanel}>
            <h2 style={styles.applicationTitle}>Pending Club Verification</h2>
            {pendingApplications.map((application) => (
                <div key={application.id} style={styles.applicationRow}>
                    <div>
                        <p style={styles.name}>{application.clubName}</p>
                        <p style={styles.meta}>{application.officialEmail}</p>
                        <p style={styles.meta}>{application.certificateName}</p>
                    </div>
                    <div style={styles.applicationActions}>
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
        borderRadius: '9px',
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
        borderRadius: '9px',
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
};

export default AdminDashboardPage;
