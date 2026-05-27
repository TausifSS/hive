import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // useLocation import kiya
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import LeftSidebar from '../components/desktop/LeftSidebar';
import RightSidebar from '../components/desktop/RightSidebar';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
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
        if (!user) return;
        
        let eventSource: EventSource | null = null;
        
        try {
            eventSource = new EventSource(`${API_BASE_URL}/api/updates?userId=${user.id}`);

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

            eventSource.addEventListener('message_deleted', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('api-message-deleted', { detail: data }));
                } catch (e) {
                    console.error('Failed to parse message_deleted event', e);
                }
            });

            eventSource.addEventListener('channel_message_deleted', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('api-channel-message-deleted', { detail: data }));
                } catch (e) {
                    console.error('Failed to parse channel_message_deleted event', e);
                }
            });

            eventSource.addEventListener('settings_updated', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    window.dispatchEvent(new CustomEvent('api-settings-updated', { detail: data }));
                } catch (e) {
                    console.error('Failed to parse settings_updated event', e);
                }
            });

            eventSource.onerror = (err) => {
                console.error('SSE Error:', err);
            };
        } catch (err) {
            console.error('EventSource initialization failed', err);
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
        const handleDemoMessageDeleted = (e: Event) => {
            window.dispatchEvent(new CustomEvent('api-message-deleted', { detail: (e as CustomEvent).detail }));
        };
        const handleDemoChannelMessageDeleted = (e: Event) => {
            window.dispatchEvent(new CustomEvent('api-channel-message-deleted', { detail: (e as CustomEvent).detail }));
        };
        const handleDemoSettingsUpdated = (e: Event) => {
            window.dispatchEvent(new CustomEvent('api-settings-updated', { detail: (e as CustomEvent).detail }));
        };

        window.addEventListener('demo-message', handleDemoMessage);
        window.addEventListener('demo-channel-message', handleDemoChannelMessage);
        window.addEventListener('demo-typing', handleDemoTyping);
        window.addEventListener('demo-message-deleted', handleDemoMessageDeleted);
        window.addEventListener('demo-channel-message-deleted', handleDemoChannelMessageDeleted);
        window.addEventListener('demo-settings-updated', handleDemoSettingsUpdated);

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            window.removeEventListener('demo-message', handleDemoMessage);
            window.removeEventListener('demo-channel-message', handleDemoChannelMessage);
            window.removeEventListener('demo-typing', handleDemoTyping);
            window.removeEventListener('demo-message-deleted', handleDemoMessageDeleted);
            window.removeEventListener('demo-channel-message-deleted', handleDemoChannelMessageDeleted);
            window.removeEventListener('demo-settings-updated', handleDemoSettingsUpdated);
        };
    }, [user?.id]);

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
    const isChatPage = ['/chat', '/messages', '/ai'].some(path => location.pathname.startsWith(path));
    
    return (
        <div style={styles.mobileContainer}>
            <TopNav />
            <main style={{ ...styles.mainContentMobile, padding: isChatPage ? '0' : '0 16px' }}>
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

