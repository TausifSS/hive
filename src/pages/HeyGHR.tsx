import React from 'react';
import { Bot, Mic, Send } from 'lucide-react';

// Ek single chat bubble ke liye component
const ChatBubble = ({ message, isUser }: { message: string, isUser?: boolean }) => (
    <div style={{ ...styles.bubbleContainer, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.aiBubble) }}>
            {message}
        </div>
    </div>
);

// Main AI Page
const HeyGHRPage = () => {
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <Bot size={32} color="var(--brand-purple)" />
                <div>
                    <h1 style={styles.title}>Hey GHR</h1>
                    <p style={styles.subtitle}>Your Personal Campus Assistant</p>
                </div>
            </div>

            {/* Chat Area */}
            <div style={styles.chatArea}>
                <ChatBubble message="Hello! How can I help you today?" />
                <ChatBubble message="Where is my next class?" isUser />
                <ChatBubble message="Your next class is 'Data Structures' in Room C-301 at 10:00 AM." />
            </div>

            {/* Input Area */}
            <div style={styles.inputArea}>
                <input type="text" placeholder="Ask me anything..." style={styles.input} />
                <button style={styles.micButton}>
                    <Mic size={22} color="white" />
                </button>
                <button style={styles.sendButton}>
                    <Send size={22} color="white" />
                </button>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#F9FAFB',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '20px',
        borderBottom: '1px solid #E5E7EB',
    },
    title: {
        fontSize: '22px',
        fontWeight: 'bold',
        margin: 0,
        color: 'var(--primary-dark)',
    },
    subtitle: {
        fontSize: '14px',
        color: '#6B7280',
        margin: '2px 0 0 0',
    },
    chatArea: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    // Chat Bubble Styles
    bubbleContainer: {
        display: 'flex',
    },
    bubble: {
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: '18px',
        lineHeight: 1.5,
    },
    aiBubble: {
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        color: 'var(--primary-dark)',
        borderTopLeftRadius: '4px',
    },
    userBubble: {
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        borderTopRightRadius: '4px',
    },
    // Input Area Styles
    inputArea: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        gap: '10px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: 'white',
    },
    input: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '24px',
        border: '1px solid #D1D5DB',
        fontSize: '15px',
        outline: 'none',
    },
    micButton: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#2563EB', // Blue color for mic
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    sendButton: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    }
};

export default HeyGHRPage;
