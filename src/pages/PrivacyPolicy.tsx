import type { CSSProperties } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyPage = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <button onClick={() => navigate(-1)} style={styles.backButton}>
                    <ArrowLeft size={18} />
                    <span>Go Back</span>
                </button>

                <div style={styles.header}>
                    <Shield size={40} color="var(--brand-purple)" />
                    <h1 style={styles.title}>Privacy Policy</h1>
                    <p style={styles.subtitle}>Effective Date: June 19, 2026</p>
                </div>

                <div style={styles.content}>
                    <p style={styles.paragraph}>
                        Welcome to <strong>HIVE</strong> (the Campus Engagement Hub for GH Raisoni College). We respect your privacy and are committed to protecting the personal data of our campus students, administrators, and staff.
                    </p>

                    <h2 style={styles.sectionTitle}>1. Information We Collect</h2>
                    <p style={styles.paragraph}>
                        We only collect information necessary to authenticate your status as a student or staff member and to run our campus fests. This includes:
                    </p>
                    <ul style={styles.list}>
                        <li><strong>Identity Data:</strong> Full name, college email address, department, year, division, and student ID handle.</li>
                        <li><strong>Activity Data:</strong> Event registrations, points earned, leaderboard rank, and chat history on HIVE channels.</li>
                        <li><strong>Device & Usage Data:</strong> IP address (used for rate-limiting brute force attacks), log logs, and page views.</li>
                    </ul>

                    <h2 style={styles.sectionTitle}>2. How We Use Your Data</h2>
                    <p style={styles.paragraph}>
                        We use the collected information for the following campus purposes:
                    </p>
                    <ul style={styles.list}>
                        <li>To verify student identity using official college Google accounts or OTP verification.</li>
                        <li>To generate secure QR tickets for event check-ins and log attendance.</li>
                        <li>To maintain the campus leaderboard and compute merit/activity points.</li>
                        <li>To optimize app performance and secure authentication via IP-based rate limiting.</li>
                    </ul>

                    <h2 style={styles.sectionTitle}>3. Cookies & Session Storage</h2>
                    <p style={styles.paragraph}>
                        We use secure local storage and essential cookies to hold your active authentication session token. These cookies are strictly functional and do not track you across other external websites.
                    </p>

                    <h2 style={styles.sectionTitle}>4. Data Security</h2>
                    <p style={styles.paragraph}>
                        Your data is stored securely in our hosted PostgreSQL cloud database managed by Supabase, protected by SSL encryption. Session tokens are generated using cryptographically secure random bytes and are expired automatically.
                    </p>

                    <h2 style={styles.sectionTitle}>5. Contact Support</h2>
                    <p style={styles.paragraph}>
                        If you have questions about this Privacy Policy or wish to request data correction, please contact GHR College Administrators or submit a report using the "Report a Bug / Support" panel in your profile settings.
                    </p>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#4B5563',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        padding: '8px 0',
        marginBottom: '20px',
    },
    header: {
        textAlign: 'center',
        borderBottom: '1px solid #F3F4F6',
        paddingBottom: '24px',
        marginBottom: '24px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '800',
        color: '#1F2937',
        margin: '12px 0 4px 0',
    },
    subtitle: {
        fontSize: '13px',
        color: '#9CA3AF',
        margin: 0,
    },
    content: {
        lineHeight: '1.7',
        color: '#374151',
    },
    paragraph: {
        marginBottom: '16px',
        fontSize: '15px',
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#111827',
        marginTop: '24px',
        marginBottom: '10px',
    },
    list: {
        paddingLeft: '20px',
        marginBottom: '16px',
        fontSize: '15px',
    },
};

export default PrivacyPolicyPage;
