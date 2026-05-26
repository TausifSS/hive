import { useState, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronRight, Star, BellOff, Lock, User, Shield, HelpCircle, Info, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const settingDetails: Record<string, string> = {
    'Account privacy': 'HIVE is gated by college email login. Profiles and campus content are visible only after authentication.',
    'Close Friends': 'Close Friends list is reserved for the next social privacy pass.',
    Blocked: 'Blocked users are managed by College Admin from the Admin panel.',
    Muted: 'Muted channels and notification preferences will be stored after push notifications are added.',
    'Content preferences': 'Campus content is currently ordered by backend creation time and official role permissions.',
    Help: 'For local testing: start backend on port 4000, sign in with college mail OTP, then use the sidebar tabs.',
    About: 'HIVE is the GHRCEM Digital Hub with college OTP auth, feed, events, chat, leaderboard, and admin control.',
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

const SettingsPage = () => {
    const { logout } = useAuth();
    const [activeSetting, setActiveSetting] = useState('Account privacy');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                    <SettingsItem icon={<Lock size={22} color="#4B5563" />} title="Account privacy" onSelect={setActiveSetting} />
                    {isMobile && activeSetting === 'Account privacy' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Account privacy']}
                        </div>
                    )}
                    <SettingsItem icon={<Star size={22} color="#4B5563" />} title="Close Friends" onSelect={setActiveSetting} />
                    {isMobile && activeSetting === 'Close Friends' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Close Friends']}
                        </div>
                    )}
                    <SettingsItem icon={<User size={22} color="#4B5563" />} title="Blocked" onSelect={setActiveSetting} />
                    {isMobile && activeSetting === 'Blocked' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Blocked']}
                        </div>
                    )}

                    <SectionHeader title="Your app and media" />
                    <SettingsItem icon={<BellOff size={22} color="#4B5563" />} title="Muted" onSelect={setActiveSetting} />
                    {isMobile && activeSetting === 'Muted' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Muted']}
                        </div>
                    )}
                    <SettingsItem icon={<Shield size={22} color="#4B5563" />} title="Content preferences" onSelect={setActiveSetting} />
                    {isMobile && activeSetting === 'Content preferences' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Content preferences']}
                        </div>
                    )}

                    <SectionHeader title="More info and support" />
                    <SettingsItem icon={<HelpCircle size={22} color="#4B5563" />} title="Help" onSelect={setActiveSetting} />
                    {isMobile && activeSetting === 'Help' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['Help']}
                        </div>
                    )}
                    <SettingsItem icon={<Info size={22} color="#4B5563" />} title="About" onSelect={setActiveSetting} />
                    {isMobile && activeSetting === 'About' && (
                        <div style={styles.mobileDetailCard}>
                            {settingDetails['About']}
                        </div>
                    )}

                    <button style={styles.logoutButton} onClick={logout}>
                        <LogOut size={22} color="#EF4444" />
                        <span style={{ ...styles.title, color: '#EF4444' }}>Log out</span>
                    </button>
                </div>

                {!isMobile && (
                    <aside style={styles.detailPanel}>
                        <h2 style={styles.detailTitle}>{activeSetting}</h2>
                        <p style={styles.detailText}>{settingDetails[activeSetting]}</p>
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
