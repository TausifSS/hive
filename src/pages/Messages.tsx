import { useEffect, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getConversation, getUser, sendConversationMessage } from '../lib/api';
import type { Conversation, User } from '../lib/api';

const MessagesPage = () => {
    const { user: currentUser } = useAuth();
    const { userId } = useParams<{ userId: string }>();
    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadConversation = async () => {
            if (!userId) {
                setIsLoading(false);
                setError('Missing user id');
                return;
            }

            setIsLoading(true);
            setError('');

            try {
                const [userResponse, conversationResponse] = await Promise.all([
                    getUser(userId),
                    getConversation(userId),
                ]);
                setTargetUser(userResponse.user);
                setConversation(conversationResponse.conversation);
            } catch (conversationError) {
                setError(conversationError instanceof Error ? conversationError.message : 'Unable to load conversation');
            } finally {
                setIsLoading(false);
            }
        };

        void loadConversation();
    }, [userId]);

    const handleSend = async () => {
        const content = messageText.trim();
        if (!content || !conversation || isSending) return;

        setIsSending(true);
        setError('');

        try {
            const response = await sendConversationMessage(conversation.id, content);
            setConversation(response.conversation);
            setMessageText('');
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'Unable to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            void handleSend();
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <ArrowLeft size={24} style={{ cursor: 'pointer' }} onClick={() => window.history.back()} />
                <img
                    src={targetUser?.avatarUrl || 'https://placehold.co/40x40/EFEFEF/333?text=HV'}
                    alt={targetUser?.name || 'User'}
                    style={styles.avatar}
                />
                <div>
                    <h1 style={styles.userName}>{targetUser?.name || 'Messages'}</h1>
                    <p style={styles.userStatus}>{conversation ? 'Conversation synced' : 'Loading...'}</p>
                </div>
            </header>

            <main style={styles.chatArea}>
                {isLoading ? (
                    <div style={styles.notice}>Loading conversation...</div>
                ) : error ? (
                    <div style={styles.errorNotice}>{error}</div>
                ) : conversation && conversation.messages.length > 0 ? (
                    conversation.messages.map((message) => {
                        const isMine = message.senderId === currentUser?.id;
                        return (
                            <div key={message.id} style={{ ...styles.bubbleRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                <div style={{ ...styles.bubble, ...(isMine ? styles.myBubble : styles.theirBubble) }}>
                                    <p style={styles.messageContent}>{message.content}</p>
                                    <span style={styles.messageTime}>
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={styles.notice}>Start your first conversation.</div>
                )}
            </main>

            <footer style={styles.inputArea}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    style={styles.input}
                    disabled={isLoading || !conversation}
                />
                <button
                    aria-label="Send direct message"
                    style={{ ...styles.sendButton, ...(isSending ? styles.disabledButton : {}) }}
                    onClick={handleSend}
                    disabled={isSending || !messageText.trim() || !conversation}
                >
                    <Send size={20} color="white" />
                </button>
            </footer>
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        objectFit: 'cover',
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
    errorNotice: {
        textAlign: 'center',
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        fontSize: '14px',
        padding: '16px',
    },
    bubbleRow: {
        display: 'flex',
        marginBottom: '10px',
    },
    bubble: {
        maxWidth: '75%',
        padding: '10px 12px',
        borderRadius: '16px',
    },
    myBubble: {
        backgroundColor: 'var(--brand-purple, #8B5CF6)',
        color: 'white',
        borderTopRightRadius: '4px',
    },
    theirBubble: {
        backgroundColor: 'white',
        color: '#1F2937',
        border: '1px solid #E5E7EB',
        borderTopLeftRadius: '4px',
    },
    messageContent: {
        margin: 0,
        fontSize: '15px',
        lineHeight: 1.45,
    },
    messageTime: {
        display: 'block',
        marginTop: '4px',
        fontSize: '11px',
        opacity: 0.75,
        textAlign: 'right',
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
    },
    disabledButton: {
        opacity: 0.65,
        cursor: 'not-allowed',
    },
};

export default MessagesPage;
