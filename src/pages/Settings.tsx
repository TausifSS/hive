import { useState, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronRight, Star, BellOff, Lock, User, Shield, HelpCircle, Info, LogOut, Bug, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../lib/api';

const settingDetails: Record<string, string> = {
    'Account privacy': 'HIVE is gated by college email login. Profiles and campus content are visible only after authentication.',
    'Close Friends': 'Close Friends list is reserved for the next social privacy pass.',
    Blocked: 'Blocked users are managed by College Admin from the Admin panel.',
    Muted: 'Muted channels and notification preferences will be stored after push notifications are added.',
    'Content preferences': 'Campus content is currently ordered by backend creation time and official role permissions.',
    Help: 'For local testing: start backend on port 4000, sign in with college mail OTP, then use the sidebar tabs.',
    About: 'HIVE is the GHRCEM Digital Hub with college OTP auth, feed, events, chat, leaderboard, and admin control.',
    'Report a Bug': 'Submit bug reports directly to the technical team.',
};

const SettingsItem = ({ icon, title, onSelect }: { icon: ReactNode; title: string; onSelect: (title: string) => void }) => (
    <button style={styles.item} onClick={() => onSelect(title)}>
        <div style={styles.iconWrapper}>{icon}</div>
        <span style={styles.title}>{title}</span>
        <ChevronRight size={20} color="#6B7280" style={styles.chevron} />
    </button>
);

const SectionHeader = ({ title }: { title: string }) => (
    <h2 style={styles.sectionHeader}>{title}</h2>
);

const bugStyles = {
    form: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '16px',
        marginTop: '12px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '6px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '600' as const,
        color: '#4B5563',
    },
    input: {
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
    },
    select: {
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: 'white',
        outline: 'none',
    },
    textarea: {
        padding: '10px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        fontSize: '14px',
        minHeight: '120px',
        resize: 'vertical' as const,
        outline: 'none',
    },
    button: {
        backgroundColor: '#7C3AED',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px',
        fontWeight: '700' as const,
        cursor: 'pointer',
        marginTop: '8px',
    },
    error: {
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '13px',
    },
    success: {
        color: '#047857',
        backgroundColor: '#ECFDF5',
        border: '1px solid #A7F3D0',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '13px',
    },
};

const BugReportForm = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('medium');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('hive-token') || '';
            const response = await fetch(`${API_BASE_URL}/api/feedback/bug`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ title, description, severity }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit bug report');
            }

            setSuccess('Thank you! Bug report submitted successfully.');
            setTitle('');
            setDescription('');
            setSeverity('medium');
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={bugStyles.form}>
            <div style={bugStyles.field}>
                <label style={bugStyles.label}>Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short description of the bug"
                    style={bugStyles.input}
                    maxLength={100}
                    required
                />
            </div>
            <div style={bugStyles.field}>
                <label style={bugStyles.label}>Severity</label>
                <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    style={bugStyles.select}
                >
                    <option value="low">Low - Minor UI glitch</option>
                    <option value="medium">Medium - Functional issue</option>
                    <option value="high">High - Feature broken</option>
                    <option value="critical">Critical - Crash or security issue</option>
                </select>
            </div>
            <div style={bugStyles.field}>
                <label style={bugStyles.label}>Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Steps to reproduce, expected behavior, device info, etc."
                    style={bugStyles.textarea}
                    maxLength={1000}
                    required
                />
            </div>
            {error && <div style={bugStyles.error}>{error}</div>}
            {success && <div style={bugStyles.success}>{success}</div>}
            <button type="submit" disabled={loading} style={bugStyles.button}>
                {loading ? 'Submitting...' : 'Submit Bug Report'}
            </button>
        </form>
    );
};

const SettingsPage = () => {
    const { logout } = useAuth();
    const [activeSetting, setActiveSetting] = useState('Account privacy');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSelectSetting = (title: string) => {
        if (title === 'Privacy Policy') {
            navigate('/privacy');
        } else if (title === 'Terms of Service') {
            navigate('/terms');
        } else {
            setActiveSetting(title);
        }
    };

    return (
        <div style={{ 
            ...styles.container, 
            margin: isMobile ? '0 auto' : '20px auto', 
            padding: isMobile ? '16px' : '24px', 
            border: isMobile ? 'none' : '1px solid #E5E7EB',
            borderRadius: isMobile ? '0' : '12px'
        }}>
            <h1 style={styles.mainTitle}>Settings and activity</h1>

            <div style={{
                ...styles.contentGrid,
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(260px, 320px)',
                gap: isMobile ? '20px' : '28px'
            }}>
                <div>
                    <SectionHeader title="Who can see your content" />
                    <SettingsItem icon={<Lock size={22} color="#4B5563" />} title="Account privacy" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'Account privacy' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Account privacy']}
                        </div>
                    )}
                    <SettingsItem icon={<Star size={22} color="#4B5563" />} title="Close Friends" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'Close Friends' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Close Friends']}
                        </div>
                    )}
                    <SettingsItem icon={<User size={22} color="#4B5563" />} title="Blocked" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'Blocked' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Blocked']}
                        </div>
                    )}

                    <SectionHeader title="Your app and media" />
                    <SettingsItem icon={<BellOff size={22} color="#4B5563" />} title="Muted" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'Muted' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Muted']}
                        </div>
                    )}
                    <SettingsItem icon={<Shield size={22} color="#4B5563" />} title="Content preferences" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'Content preferences' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Content preferences']}
                        </div>
                    )}

                    <SectionHeader title="More info and support" />
                    <SettingsItem icon={<HelpCircle size={22} color="#4B5563" />} title="Help" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'Help' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Help']}
                        </div>
                    )}
                    <SettingsItem icon={<Info size={22} color="#4B5563" />} title="About" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'About' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['About']}
                        </div>
                    )}
                    <SettingsItem icon={<Bug size={22} color="#4B5563" />} title="Report a Bug" onSelect={handleSelectSetting} />
                    {isMobile && activeSetting === 'Report a Bug' && (
                        <div style={styles.mobileDetailCard}>
                            <BugReportForm />
                        </div>
                    )}
                    <SettingsItem icon={<Shield size={22} color="#4B5563" />} title="Privacy Policy" onSelect={handleSelectSetting} />
                    <SettingsItem icon={<FileText size={22} color="#4B5563" />} title="Terms of Service" onSelect={handleSelectSetting} />

                    <button style={styles.logoutButton} onClick={logout}>
                        <LogOut size={22} color="#EF4444" />
                        <span style={{ ...styles.title, color: '#EF4444' }}>Log out</span>
                    </button>
                </div>

                {!isMobile && (
                    <aside style={styles.detailPanel}>
                        <h2 style={styles.detailTitle}>{activeSetting}</h2>
                        {activeSetting === 'Report a Bug' ? (
                            <BugReportForm />
                        ) : (
                            <p style={styles.detailText}>{settingDetails[activeSetting]}</p>
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        maxWidth: '980px',
        margin: '20px auto',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
    },
    mainTitle: {
        fontSize: '28px',
        fontWeight: 'bold',
        margin: '0 0 24px 0',
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
        gap: '28px',
    },
    sectionHeader: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#6B7280',
        marginTop: '28px',
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: 0,
    },
    item: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '16px 0',
        border: 'none',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
    },
    iconWrapper: {
        marginRight: '16px',
        display: 'flex',
    },
    title: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#1F2937',
    },
    chevron: {
        marginLeft: 'auto',
    },
    detailPanel: {
        position: 'sticky',
        top: '20px',
        alignSelf: 'start',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '18px',
        backgroundColor: '#F9FAFB',
    },
    mobileDetailCard: {
        padding: '14px 16px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        marginTop: '-4px',
        marginBottom: '16px',
        fontSize: '14px',
        color: '#4B5563',
        lineHeight: 1.6,
    },
    detailTitle: {
        margin: '0 0 10px 0',
        fontSize: '18px',
    },
    detailText: {
        margin: 0,
        color: '#4B5563',
        lineHeight: 1.6,
        fontSize: '14px',
    },
    logoutButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
        padding: '16px 0',
        cursor: 'pointer',
        marginTop: '28px',
        border: 'none',
        backgroundColor: 'transparent',
    },
};

export default SettingsPage;
