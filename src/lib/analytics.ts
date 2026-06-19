import { API_BASE_URL } from './api';

export const trackEvent = async (eventType: string, eventData?: Record<string, any>) => {
    try {
        const token = localStorage.getItem('hive-token') || '';
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Run in background, don't block user interface
        void fetch(`${API_BASE_URL}/api/analytics`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                eventType,
                eventData,
                url: window.location.pathname,
            }),
        }).catch(err => console.warn('Failed to track event:', err));
    } catch (e) {
        console.warn('Analytics disabled or error:', e);
    }
};

export const trackPageView = (urlPath: string) => {
    void trackEvent('page_view', { path: urlPath });
};
