import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, FileCheck2, Lock, Mail, Shield, Upload, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    adminLogin,
    getClubStatus,
    googleLogin,
    loginUser,
    registerClub,
    requestLoginOtp,
    roleHomePath,
    setStudentPasswordWithOtp,
} from '../lib/api';
import type { ClubApplication, User } from '../lib/api';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read certificate file'));
        reader.readAsDataURL(file);
    });

const loadGoogleScript = () =>
    new Promise<void>((resolve, reject) => {
        if (window.google?.accounts?.id) {
            resolve();
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Unable to load Google login')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Unable to load Google login'));
        document.head.appendChild(script);
    });

const AuthPage = () => {
    const [activeTab, setActiveTab] = useState<'student' | 'club'>('student');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentPassword, setStudentPassword] = useState('');
    const [studentName, setStudentName] = useState('');
    const [resetMode, setResetMode] = useState(false);
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [devOtp, setDevOtp] = useState('');
    const [otpMessage, setOtpMessage] = useState('');

    const [clubEmail, setClubEmail] = useState('');
    const [clubPassword, setClubPassword] = useState('');
    const [clubName, setClubName] = useState('');
    const [certificateFile, setCertificateFile] = useState<File | null>(null);
    const [clubApplication, setClubApplication] = useState<ClubApplication | null>(null);

    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [adminId, setAdminId] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const completeLogin = (user: User, token: string) => {
        login(user, token);
        navigate(roleHomePath(user.role), { replace: true });
    };

    const runAction = async (action: () => Promise<void>) => {
        setError('');
        setSuccess('');
        setIsSubmitting(true);
        try {
            await action();
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : 'Unable to complete request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStudentLogin = (event: FormEvent) => {
        event.preventDefault();
        void runAction(async () => {
            const response = await loginUser(studentEmail, studentPassword);
            completeLogin(response.user, response.token);
        });
    };

    const handleSendResetOtp = () => {
        void runAction(async () => {
            const response = await requestLoginOtp(studentEmail);
            setDevOtp(response.devOtp || '');
            setResetOtp(response.devOtp || '');
            setOtpMessage(response.message);
            setSuccess(response.message);
        });
    };

    const handleSetStudentPassword = (event: FormEvent) => {
        event.preventDefault();
        void runAction(async () => {
            const response = await setStudentPasswordWithOtp({
                email: studentEmail,
                name: studentName,
                otp: resetOtp,
                password: newPassword,
            });
            completeLogin(response.user, response.token);
        });
    };

    const handleGoogleLogin = () => {
        void runAction(async () => {
            if (!googleClientId) {
                throw new Error('Google login needs VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID in .env');
            }
            await loadGoogleScript();
            await new Promise<void>((resolve, reject) => {
                window.google?.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: async (response) => {
                        try {
                            if (!response.credential) throw new Error('Google did not return a login token');
                            const authResponse = await googleLogin(response.credential);
                            completeLogin(authResponse.user, authResponse.token);
                            resolve();
                        } catch (googleError) {
                            reject(googleError);
                        }
                    },
                });
                window.google?.accounts.id.prompt();
            });
        });
    };

    const handleClubRegister = () => {
        void runAction(async () => {
            if (!certificateFile) throw new Error('Upload club registration certificate');
            if (certificateFile.size > 1_500_000) throw new Error('Certificate must be under 1.5 MB');

            const certificateData = await readFileAsDataUrl(certificateFile);
            const response = await registerClub({
                clubName,
                email: clubEmail,
                password: clubPassword,
                certificateName: certificateFile.name,
                certificateData,
            });
            setClubApplication(response.application);
            setSuccess('Club verification request submitted');
        });
    };

    const handleClubStatus = () => {
        void runAction(async () => {
            const response = await getClubStatus(clubEmail);
            setClubApplication(response.application || null);
            setSuccess(`Verification status: ${response.status}`);
        });
    };

    const handleAdminLogin = (event: FormEvent) => {
        event.preventDefault();
        void runAction(async () => {
            const response = await adminLogin(adminId, adminPassword);
            completeLogin(response.user, response.token);
        });
    };

    return (
        <div style={styles.page}>
            <section style={styles.shell}>
                <div style={styles.brandPanel}>
                    <div style={styles.logoRow}>
                        <div style={styles.logo}>H</div>
                        <div>
                            <h1 style={styles.brandTitle}>HIVE</h1>
                            <p style={styles.brandSubtitle}>GHRCEM Digital Hub</p>
                        </div>
                    </div>
                </div>

                <div style={styles.authPanel}>
                    <div style={styles.tabs}>
                        <button style={{ ...styles.tab, ...(activeTab === 'student' ? styles.activeTab : {}) }} onClick={() => setActiveTab('student')}>
                            Login
                        </button>
                        <button style={{ ...styles.tab, ...(activeTab === 'club' ? styles.activeTab : {}) }} onClick={() => setActiveTab('club')}>
                            Club Verification
                        </button>
                    </div>

                    {activeTab === 'student' ? (
                        <div>
                            <div style={styles.formHeader}>
                                <h2 style={styles.formTitle}>College Login</h2>
                                <p style={styles.formSubtitle}>Students, teachers, and verified clubs use one login</p>
                            </div>

                            {!resetMode ? (
                                <form onSubmit={handleStudentLogin} style={styles.form}>
                                    <label style={styles.label}>College Email</label>
                                    <div style={styles.inputWrap}><Mail size={18} /><input type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} style={styles.input} required /></div>
                                    <label style={styles.label}>Password</label>
                                    <div style={styles.inputWrap}><Lock size={18} /><input type="password" value={studentPassword} onChange={(event) => setStudentPassword(event.target.value)} style={styles.input} required /></div>
                                    <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? 'Checking...' : 'Login'}</button>
                                    <button type="button" style={styles.googleButton} onClick={handleGoogleLogin}>Continue with Google</button>
                                    <button type="button" style={styles.textButton} onClick={() => setResetMode(true)}>Forgot Password / Create Password</button>
                                </form>
                            ) : (
                                <form onSubmit={handleSetStudentPassword} style={styles.form}>
                                    <label style={styles.label}>College Email</label>
                                    <div style={styles.inputWrap}><Mail size={18} /><input type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} style={styles.input} required /></div>
                                    <label style={styles.label}>Full Name</label>
                                    <div style={styles.inputWrap}><UserRound size={18} /><input value={studentName} onChange={(event) => setStudentName(event.target.value)} style={styles.input} /></div>
                                    <button type="button" style={styles.secondaryButton} onClick={handleSendResetOtp} disabled={isSubmitting || !studentEmail}>{isSubmitting ? 'Sending...' : 'Send OTP'}</button>
                                    {otpMessage && <p style={styles.successText}>{otpMessage}</p>}
                                    {devOtp && <div style={styles.devOtpBox}><span>Local OTP auto-filled</span><strong>{devOtp}</strong></div>}
                                    <label style={styles.label}>OTP</label>
                                    <div style={styles.inputWrap}><Shield size={18} /><input value={resetOtp} onChange={(event) => setResetOtp(event.target.value)} style={styles.input} maxLength={6} required /></div>
                                    <label style={styles.label}>New Password</label>
                                    <div style={styles.inputWrap}><Lock size={18} /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} style={styles.input} required /></div>
                                    <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? 'Verifying...' : 'Verify and Continue'}</button>
                                    <button type="button" style={styles.textButton} onClick={() => setResetMode(false)}>Back to Login</button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={styles.formHeader}>
                                <h2 style={styles.formTitle}>Club Verification</h2>
                                <p style={styles.formSubtitle}>Submit certificate once. After approval, use Login tab</p>
                            </div>
                            <form onSubmit={(event) => { event.preventDefault(); handleClubRegister(); }} style={styles.form}>
                                <label style={styles.label}>Club Official Email</label>
                                <div style={styles.inputWrap}><Mail size={18} /><input type="email" value={clubEmail} onChange={(event) => setClubEmail(event.target.value)} style={styles.input} required /></div>
                                <label style={styles.label}>Create Password</label>
                                <div style={styles.inputWrap}><Lock size={18} /><input type="password" value={clubPassword} onChange={(event) => setClubPassword(event.target.value)} style={styles.input} required /></div>
                                <label style={styles.label}>Club Name</label>
                                <div style={styles.inputWrap}><Building2 size={18} /><input value={clubName} onChange={(event) => setClubName(event.target.value)} style={styles.input} /></div>
                                <label style={styles.uploadBox}>
                                    <Upload size={20} />
                                    <span>{certificateFile ? certificateFile.name : 'Upload Registration Certificate'}</span>
                                    <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={(event) => setCertificateFile(event.target.files?.[0] || null)} />
                                </label>
                                <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit for Verification'}</button>
                                <button type="button" style={styles.textButton} onClick={handleClubStatus} disabled={!clubEmail}>Check Pending Status</button>
                                {clubApplication && (
                                    <div style={styles.statusBox}>
                                        <FileCheck2 size={18} />
                                        <div>
                                            <strong>{clubApplication.status.toUpperCase()}</strong>
                                            <p>{clubApplication.clubName} - {clubApplication.certificateName}</p>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {error && <p style={styles.errorText}>{error}</p>}
                    {success && <p style={styles.successText}>{success}</p>}

                    <div style={styles.footerLinks}>
                        By continuing, you agree to our{' '}
                        <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
                        {' '}and{' '}
                        <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>.
                    </div>
                </div>
            </section>

            <button style={styles.adminFab} onClick={() => setIsAdminOpen(true)} aria-label="Open Admin Login">
                <Shield size={26} />
            </button>

            {isAdminOpen && (
                <div style={styles.modalBackdrop} onClick={() => setIsAdminOpen(false)}>
                    <form style={styles.adminModal} onSubmit={handleAdminLogin} onClick={(event) => event.stopPropagation()}>
                        <div style={styles.modalIcon}><Shield size={28} /></div>
                        <h2 style={styles.formTitle}>Admin Login</h2>
                        <label style={styles.label}>Admin ID</label>
                        <div style={styles.inputWrap}><Shield size={18} /><input value={adminId} onChange={(event) => setAdminId(event.target.value)} style={styles.input} required /></div>
                        <label style={styles.label}>Password</label>
                        <div style={styles.inputWrap}><Lock size={18} /><input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} style={styles.input} required /></div>
                        <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>Enter Admin Dashboard</button>
                        <button type="button" style={styles.textButton} onClick={() => setIsAdminOpen(false)}>Cancel</button>
                    </form>
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#EEF2F7',
        fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box',
        overflowY: 'auto',
    },
    shell: {
        width: '100%',
        maxWidth: '980px',
        minHeight: '520px',
        maxHeight: 'calc(100vh - 48px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        backgroundColor: 'white',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 24px 70px rgba(15, 23, 42, 0.18)',
        border: '1px solid #E5E7EB',
    },
    brandPanel: {
        background: '#111827',
        color: 'white',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
    },
    logoRow: { display: 'flex', alignItems: 'center', gap: '14px' },
    logo: { width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'var(--brand-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '26px' },
    brandTitle: { margin: 0, fontSize: '34px' },
    brandSubtitle: { margin: '3px 0 0 0', color: '#CBD5E1' },
    authPanel: { padding: '32px', overflowY: 'auto', maxHeight: 'calc(100vh - 48px)', boxSizing: 'border-box' },
    tabs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '6px', backgroundColor: '#F3F4F6', borderRadius: '12px', marginBottom: '24px' },
    tab: { border: 'none', borderRadius: '9px', padding: '12px', backgroundColor: 'transparent', color: '#4B5563', fontWeight: 900, cursor: 'pointer' },
    activeTab: { backgroundColor: 'white', color: 'var(--brand-purple)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
    formHeader: { marginBottom: '18px' },
    formTitle: { margin: '0 0 4px 0', color: '#111827', fontSize: '24px' },
    formSubtitle: { margin: 0, color: '#6B7280' },
    form: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '13px', fontWeight: 800, color: '#374151', marginBottom: '6px' },
    inputWrap: { display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #D1D5DB', borderRadius: '11px', padding: '0 12px', marginBottom: '14px', color: '#6B7280' },
    input: { width: '100%', border: 'none', outline: 'none', padding: '13px 0', fontSize: '15px', backgroundColor: 'transparent' },
    primaryButton: { border: 'none', borderRadius: '11px', padding: '14px', backgroundColor: 'var(--brand-purple)', color: 'white', fontWeight: 900, cursor: 'pointer', marginTop: '4px' },
    secondaryButton: { border: '1px solid #D1D5DB', borderRadius: '11px', padding: '13px', backgroundColor: 'white', color: '#111827', fontWeight: 900, cursor: 'pointer', marginTop: '4px' },
    googleButton: { border: '1px solid #D1D5DB', borderRadius: '11px', padding: '13px', backgroundColor: 'white', color: '#111827', fontWeight: 800, cursor: 'pointer', marginTop: '10px' },
    textButton: { border: 'none', backgroundColor: 'transparent', color: 'var(--brand-purple)', fontWeight: 800, cursor: 'pointer', padding: '12px' },
    dividerText: { color: '#6B7280', fontSize: '13px', fontWeight: 900, margin: '22px 0 12px 0', textTransform: 'uppercase', letterSpacing: 0 },
    uploadBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '1px dashed #9CA3AF', borderRadius: '12px', padding: '18px', color: '#374151', fontWeight: 800, cursor: 'pointer', marginBottom: '12px' },
    statusBox: { display: 'flex', gap: '10px', alignItems: 'flex-start', border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF', borderRadius: '12px', padding: '12px', color: '#1D4ED8', marginTop: '10px' },
    devOtpBox: { display: 'flex', justifyContent: 'space-between', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' },
    errorText: { color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' },
    successText: { color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' },
    adminFab: { position: 'fixed', right: '24px', bottom: '24px', width: '62px', height: '62px', borderRadius: '50%', border: 'none', backgroundColor: '#111827', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 30px rgba(0,0,0,0.25)', cursor: 'pointer' },
    modalBackdrop: { position: 'fixed', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 },
    adminModal: { width: '100%', maxWidth: '420px', backgroundColor: 'white', borderRadius: '18px', padding: '26px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' },
    modalIcon: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#EEF2FF', color: 'var(--brand-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' },
    footerLinks: {
        marginTop: '20px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#6B7280',
        lineHeight: '1.5',
    },
    footerLink: {
        color: 'var(--brand-purple)',
        textDecoration: 'underline',
        fontWeight: '600',
    },
};

export default AuthPage;
