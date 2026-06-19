import type { CSSProperties } from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <button onClick={() => navigate(-1)} style={styles.backButton}>
                    <ArrowLeft size={18} />
                    <span>Go Back</span>
                </button>

                <div style={styles.header}>
                    <FileText size={40} color="var(--brand-purple)" />
                    <h1 style={styles.title}>Terms of Service</h1>
                    <p style={styles.subtitle}>Effective Date: June 19, 2026</p>
                </div>

                <div style={styles.content}>
                    <p style={styles.paragraph}>
                        By using the <strong>HIVE</strong> campus engagement hub, you agree to comply with the following Terms and Conditions. These terms govern the usage of the application by students, club representatives, and faculty members of GH Raisoni College (GHR).
                    </p>

                    <h2 style={styles.sectionTitle}>1. Account Responsibility & Verification</h2>
                    <p style={styles.paragraph}>
                        - You must authenticate using your official college Google account or registered college email address.<br />
                        - Any attempts to access the portal using personal email addresses or unauthorized credentials will be blocked.<br />
                        - You are responsible for all posts, comments, and messages sent from your authenticated account.
                    </p>

                    <h2 style={styles.sectionTitle}>2. Code of Conduct</h2>
                    <p style={styles.paragraph}>
                        HIVE is a safe, professional environment for college communication and collaboration. The following behaviors are strictly prohibited and will result in account blocking:
                    </p>
                    <ul style={styles.list}>
                        <li>Posting offensive, discriminatory, abusive, or inappropriate content on the Home Feed or Channels.</li>
                        <li>Attempting to forge QR tickets or manipulating event check-ins to gain points unfairly.</li>
                        <li>Exploiting API endpoints, spamming authentication codes, or bypassing security constraints.</li>
                        <li>Harassing other students through chat channels or direct messaging.</li>
                    </ul>

                    <h2 style={styles.sectionTitle}>3. Points & Leaderboard Policies</h2>
                    <p style={styles.paragraph}>
                        Points are earned strictly by registering for events and successfully scanning your QR check-in ticket at the venue. 
                        - Manipulation of attendance (e.g. scanning someone else's code or logging check-ins without attending) is considered a violation of academic integrity.<br />
                        - College Administrators reserve the right to audit and revoke points or restrict users found violating these policies.
                    </p>

                    <h2 style={styles.sectionTitle}>4. Limitation of Liability</h2>
                    <p style={styles.paragraph}>
                        HIVE is provided "as is" for college communication purposes. While we strive to maintain 100% uptime, GHR College is not responsible for event cancellations, technical failures, or loss of session states due to network interruptions.
                    </p>

                    <h2 style={styles.sectionTitle}>5. Modifications to Terms</h2>
                    <p style={styles.paragraph}>
                        We reserve the right to update these Terms of Service as new college guidelines are integrated. Continued use of HIVE after revisions constitutes your acceptance of the updated terms.
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

export default TermsPage;
