import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // useLocation import kiya
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import LeftSidebar from '../components/desktop/LeftSidebar';
import RightSidebar from '../components/desktop/RightSidebar';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024); // Breakpoint badhaya
    const location = useLocation(); // Current URL path lene ke liye

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth > 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isDesktop) {
        return (
            <div style={styles.desktopContainer}>
                <LeftSidebar />
                <main style={styles.mainContentDesktop}>
                    {children}
                </main>
                {/* YEH HAI JAADU: Sirf Home page par Right Sidebar dikhega */}
                {location.pathname === '/' && <RightSidebar />}
            </div>
        );
    }

    // Mobile layout
    return (
        <div style={styles.mobileContainer}>
            <TopNav />
            <main style={styles.mainContentMobile}>
                {children}
            </main>
            <BottomNav />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    desktopContainer: {
        display: 'flex',
    },
    mainContentDesktop: {
        flex: 1, // Bachi hui saari jagah le lega
        height: '100vh',
        overflowY: 'auto',
    },
    mobileContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: '450px',
        margin: '0 auto',
        backgroundColor: 'var(--background-main)',
    },
    mainContentMobile: {
        flex: 1,
        overflowY: 'auto',
        padding: '0 16px', // Side mein padding
    },
};

export default AppLayout;

