import React from 'react';
import { ChevronRight, Star, BellOff, Lock, User, Shield, HelpCircle, Info, LogOut } from 'lucide-react';

// Chota component har setting item ke liye
const SettingsItem = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <div style={styles.item}>
        <div style={styles.iconWrapper}>{icon}</div>
        <span style={styles.title}>{title}</span>
        <ChevronRight size={20} color="#6B7280" style={styles.chevron} />
    </div>
);

// Section heading ke liye component
const SectionHeader = ({ title }: { title: string }) => (
    <h2 style={styles.sectionHeader}>{title}</h2>
);


const SettingsPage = () => {
    return (
        <div style={styles.container}>
            <h1 style={styles.mainTitle}>Settings and activity</h1>

            <SectionHeader title="Who can see your content" />
            <SettingsItem icon={<Lock size={22} color="#4B5563" />} title="Account privacy" />
            <SettingsItem icon={<Star size={22} color="#4B5563" />} title="Close Friends" />
            <SettingsItem icon={<User size={22} color="#4B5563" />} title="Blocked" />

            <SectionHeader title="Your app and media" />
            <SettingsItem icon={<BellOff size={22} color="#4B5563" />} title="Muted" />
            <SettingsItem icon={<Shield size={22} color="#4B5563" />} title="Content preferences" />

            <SectionHeader title="More info and support" />
            <SettingsItem icon={<HelpCircle size={22} color="#4B5563" />} title="Help" />
            <SettingsItem icon={<Info size={22} color="#4B5563" />} title="About" />
            
            <div style={styles.logoutButton}>
                <LogOut size={22} color="#EF4444" />
                <span style={{...styles.title, color: '#EF4444'}}>Log out</span>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        maxWidth: '800px',
        margin: '20px auto',
        padding: '24px',
        backgroundColor: 'white',
    },
    mainTitle: {
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '24px',
    },
    sectionHeader: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#6B7280',
        marginTop: '32px',
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px 0',
        borderBottom: '1px solid #E5E7EB',
        cursor: 'pointer',
    },
    iconWrapper: {
        marginRight: '16px',
    },
    title: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#1F2937',
    },
    chevron: {
        marginLeft: 'auto',
    },
    logoutButton: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px 0',
        cursor: 'pointer',
        marginTop: '32px',
    }
};

export default SettingsPage;
