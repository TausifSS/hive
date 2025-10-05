import React from 'react';
import { ArrowLeft, Send } from 'lucide-react';

const MessagesPage = () => {
    // Basic structure for a chat page
    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <ArrowLeft size={24} style={{ cursor: 'pointer' }} onClick={() => window.history.back()} />
                <img 
                    src="https://placehold.co/40x40/EFEFEF/333?text=YP" 
                    alt="User" 
                    style={styles.avatar} 
                />
                <div>
                    <h1 style={styles.userName}>Yash Parse</h1>
                    <p style={styles.userStatus}>Active now</p>
                </div>
            </header>
            
            <main style={styles.chatArea}>
                {/* Chat bubbles would go here */}
                <div style={styles.notice}>
                    You can only message users you follow and who follow you back.
                </div>
            </main>

            <footer style={styles.inputArea}>
                <input type="text" placeholder="Type a message..." style={styles.input} />
                <button style={styles.sendButton}>
                    <Send size={20} color="white" />
                </button>
            </footer>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // YEH FIX HAI: Ab yeh parent container ki poori height lega
        backgroundColor: 'white',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        gap: '12px',
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
    },
    userName: {
        fontSize: '16px',
        fontWeight: 'bold',
        margin: 0,
    },
    userStatus: {
        fontSize: '13px',
        color: '#6B7280',
        margin: 0,
    },
    chatArea: {
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        backgroundColor: '#F9FAFB',
    },
    notice: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: '14px',
        padding: '20px',
    },
    inputArea: {
        display: 'flex',
        padding: '12px 16px',
        borderTop: '1px solid #E5E7EB',
        gap: '12px',
    },
    input: {
        flex: 1,
        padding: '10px 16px',
        borderRadius: '20px',
        border: '1px solid #E5E7EB',
        fontSize: '15px',
        outline: 'none',
    },
    sendButton: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'var(--brand-purple, #8B5CF6)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    }
};

export default MessagesPage;

