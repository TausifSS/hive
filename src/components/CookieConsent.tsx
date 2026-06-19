import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('hive-cookie-consent');
        if (!consent) {
            // Show after a tiny delay for smooth animation entry
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('hive-cookie-consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div style={styles.banner}>
            <div style={styles.content}>
                <ShieldAlert size={24} color="#7C3AED" style={{ flexShrink: 0 }} />
                <p style={styles.text}>
                    We use cookies and session storage to manage your login state and analyze traffic. By using HIVE, you agree to our{' '}
                    <Link to="/privacy" style={styles.link}>
                        Privacy Policy
                    </Link>{' '}
                    and{' '}
                    <Link to="/terms" style={styles.link}>
                        Terms of Service
                    </Link>
                    .
                </p>
            </div>
            <div style={styles.actions}>
                <button onClick={handleAccept} style={styles.acceptButton}>
                    Accept
                </button>
                <button onClick={() => setIsVisible(false)} style={styles.closeButton} aria-label="Close cookie consent banner">
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    banner: {
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        right: '24px',
        maxWidth: '680px',
        margin: '0 auto',
        backgroundColor: 'rgba(31, 41, 55, 0.95)', // Dark gray translucent
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'slideUp 0.4s ease-out',
        flexWrap: 'wrap',
    },
    content: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flex: 1,
        minWidth: '280px',
    },
    text: {
        fontSize: '13.5px',
        color: '#E5E7EB',
        margin: 0,
        lineHeight: 1.5,
    },
    link: {
        color: '#A78BFA', // Light purple
        textDecoration: 'underline',
        fontWeight: '600',
    },
    actions: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    acceptButton: {
        backgroundColor: '#7C3AED',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        padding: '8px 20px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)',
        transition: 'transform 0.15s ease',
    },
    closeButton: {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#9CA3AF',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
    },
};

export default CookieConsent;
