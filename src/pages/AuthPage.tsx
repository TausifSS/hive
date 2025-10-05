import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Backend logic yahan aayegi
        // Abhi ke liye, hum seedha student role ke saath login kar denge
        login({ id: 'yashparse', name: 'Yash Parse', role: 'student' });
        navigate('/'); // Login ke baad home page par bhej denge
    };

    return (
        <div style={styles.page}>
            {/* Unique Graphics Background */}
            <div style={styles.graphicsContainer}>
                <svg width="100%" height="100%" viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: 'var(--brand-purple)', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>
                    <rect width="800" height="1200" fill="url(#grad1)" />
                    <circle cx="100" cy="200" r="150" fill="rgba(255,255,255,0.05)" />
                    <circle cx="700" cy="900" r="250" fill="rgba(255,255,255,0.08)" />
                    <path d="M 0 1200 Q 400 1000 800 1200 L 800 0 L 0 0 Z" fill="rgba(255,255,255,0.03)" />
                </svg>
            </div>
            
            <div style={styles.formContainer}>
                <div style={styles.logoContainer}>
                    <div style={styles.logo}>H</div>
                    <h1 style={styles.title}>HIVE</h1>
                </div>
                <p style={styles.subtitle}>{isLogin ? 'Welcome back to the Hive!' : 'Join the Hive today!'}</p>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                         <input type="text" placeholder="Full Name" style={styles.input} />
                    )}
                    <input type="email" placeholder="Email Address" style={styles.input} />
                    <input type="password" placeholder="Password" style={styles.input} />
                    
                    <button type="submit" style={styles.button}>
                        {isLogin ? 'Log In' : 'Sign Up'}
                    </button>
                </form>

                <p style={styles.toggleText}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <span onClick={() => setIsLogin(!isLogin)} style={styles.toggleLink}>
                        {isLogin ? ' Sign Up' : ' Log In'}
                    </span>
                </p>
            </div>
        </div>
    );
};

// ... Styles ...
const styles: { [key: string]: React.CSSProperties } = {
    page: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        position: 'relative',
        overflow: 'hidden'
    },
    graphicsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    formContainer: {
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
    },
    logoContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '16px',
    },
    logo: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        fontWeight: 'bold',
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1F2937',
        margin: 0,
    },
    subtitle: {
        fontSize: '16px',
        color: '#6B7280',
        marginBottom: '32px',
    },
    input: {
        width: '100%',
        padding: '14px',
        marginBottom: '16px',
        border: '1px solid #D1D5DB',
        borderRadius: '10px',
        fontSize: '16px',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '16px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '16px',
    },
    toggleText: {
        marginTop: '24px',
        fontSize: '14px',
        color: '#6B7280',
    },
    toggleLink: {
        color: 'var(--brand-purple)',
        fontWeight: 'bold',
        cursor: 'pointer',
    }
};

export default AuthPage;