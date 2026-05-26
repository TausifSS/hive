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

    useEffect(() => {
        // SSE update listener (skip in hosted demo mode unless VITE_API_URL is set)
        const isHostedDemo = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io') && !import.meta.env.VITE_API_URL;
        
        let eventSource: EventSource | null = null;
        
        if (!isHostedDemo) {
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            eventSource = new EventSource(`${backendUrl}/api/updates`);

            eventSource.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('api-message', { detail: data }));
                } catch (e) {
                    console.error('Failed to parse message event', e);
                }
            });

            eventSource.addEventListener('channel_message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('api-channel-message', { detail: data }));
                } catch (e) {
                    console.error('Failed to parse channel message event', e);
                }
            });

            eventSource.addEventListener('typing', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('api-typing', { detail: data }));
                } catch (e) {
                    console.error('Failed to parse typing event', e);
                }
            });

            eventSource.onerror = (err) => {
                console.error('SSE Error:', err);
            };
        }

        // Listen for local demo events and bridge them to the same api-events
        const handleDemoMessage = (e: Event) => {
            window.dispatchEvent(new CustomEvent('api-message', { detail: (e as CustomEvent).detail }));
        };
        const handleDemoChannelMessage = (e: Event) => {
            window.dispatchEvent(new CustomEvent('api-channel-message', { detail: (e as CustomEvent).detail }));
        };
        const handleDemoTyping = (e: Event) => {
            window.dispatchEvent(new CustomEvent('api-typing', { detail: (e as CustomEvent).detail }));
        };

        window.addEventListener('demo-message', handleDemoMessage);
        window.addEventListener('demo-channel-message', handleDemoChannelMessage);
        window.addEventListener('demo-typing', handleDemoTyping);

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            window.removeEventListener('demo-message', handleDemoMessage);
            window.removeEventListener('demo-channel-message', handleDemoChannelMessage);
            window.removeEventListener('demo-typing', handleDemoTyping);
        };
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

