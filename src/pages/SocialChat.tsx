import React from 'react';
import { Send } from 'lucide-react';
import SlidingTabBar from '../components/chat/SlidingTabBar'; // Naya component import kiya

// Main Chat Area jahan messages dikhenge
const ChatArea = () => {
    return (
        <div style={styles.chatArea}>
            <div style={styles.messageContainer}>
                {/* Yahan chat messages aayenge */}
                <div style={styles.welcomeMessage}>
                    <h3 style={styles.welcomeTitle}>Welcome to the Chat!</h3>
                    <p style={styles.welcomeText}>Select a channel from above to start talking.</p>
                </div>
            </div>
            <div style={styles.chatInputArea}>
                <input type="text" placeholder="Send a message..." style={styles.chatInput} />
                <button style={styles.sendButton}>
                    <Send size={20} color="white" />
                </button>
            </div>
        </div>
    );
};


const SocialChatPage = () => {
    // Mobile par ab PC wala layout nahi, seedha yeh dikhega
    return (
        <div style={styles.container}>
            <SlidingTabBar />
            <ChatArea />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--background-main)'
    },
    // Chat Area Styles
    chatArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Scroll sirf message container mein hoga
    },
    messageContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
    },
    welcomeMessage: {
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-secondary)'
    },
    welcomeTitle: {
        fontSize: '22px',
        fontWeight: 'bold',
        margin: '0 0 10px 0'
    },
    welcomeText: {
        fontSize: '15px',
        margin: 0
    },
    chatInputArea: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-light)'
    },
    chatInput: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-main)',
        fontSize: '15px',
    },
    sendButton: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'var(--brand-purple)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    }
};

export default SocialChatPage;

