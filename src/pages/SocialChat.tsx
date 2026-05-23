import { useEffect, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import SlidingTabBar, { chatChannels } from '../components/chat/SlidingTabBar';
import { useAuth } from '../context/AuthContext';
import { getChannelMessages, sendChannelMessage } from '../lib/api';
import type { ChannelMessage } from '../lib/api';

const SocialChatPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('global');
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [messageText, setMessageText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const channelName = chatChannels.find((channel) => channel.id === activeTab)?.name || activeTab;

    const loadMessages = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await getChannelMessages(activeTab);
            setMessages(response.messages);
        } catch (chatError) {
            setError(chatError instanceof Error ? chatError.message : 'Unable to load channel');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadMessages();
    }, [activeTab]);

    const handleSend = async () => {
        const content = messageText.trim();
        if (!content || isSending) return;

        setIsSending(true);
        setError('');

        try {
            const response = await sendChannelMessage(activeTab, content);
            setMessages(response.messages);
            setMessageText('');
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'Unable to send message');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            void handleSend();
        }
    };

    return (
        <div style={styles.container}>
            <SlidingTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            <div style={styles.channelHeader}>
                <h1 style={styles.channelTitle}>#{channelName}</h1>
                <button style={styles.refreshButton} onClick={loadMessages} disabled={isLoading}>
                    Refresh
                </button>
            </div>

            <div style={styles.chatArea}>
                <div style={styles.messageContainer}>
                    {isLoading ? (
                        <div style={styles.notice}>Loading channel...</div>
                    ) : error ? (
                        <div style={styles.errorNotice}>{error}</div>
                    ) : messages.length === 0 ? (
                        <div style={styles.notice}>Start the first message in this channel.</div>
                    ) : (
                        messages.map((message) => {
                            const isMine = message.senderId === user?.id;
                            return (
                                <div key={message.id} style={{ ...styles.messageRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ ...styles.messageBubble, ...(isMine ? styles.myBubble : styles.theirBubble) }}>
                                        {!isMine && (
                                            <Link to={`/profile/${message.author?.id || message.senderId}`} style={styles.authorName}>
                                                {message.author?.name || 'Student'}
                                            </Link>
                                        )}
                                        <p style={styles.messageContent}>{message.content}</p>
                                        <span style={styles.messageTime}>
                                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div style={styles.chatInputArea}>
                    <input
                        type="text"
                        placeholder={`Message #${channelName}`}
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        onKeyDown={handleKeyDown}
                        style={styles.chatInput}
                        disabled={isLoading}
                    />
                    <button
                        aria-label="Send channel message"
                        style={{ ...styles.sendButton, ...((isSending || !messageText.trim()) ? styles.disabledButton : {}) }}
                        onClick={handleSend}
                        disabled={isSending || !messageText.trim()}
                    >
                        <Send size={20} color="white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--background-main)',
    },
    channelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-light)',
    },
    channelTitle: {
        margin: 0,
        fontSize: '18px',
        color: 'var(--primary-dark)',
    },
    refreshButton: {
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        backgroundColor: 'white',
        color: 'var(--text-secondary)',
        padding: '8px 12px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    chatArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    messageContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
    },
    notice: {
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-secondary)',
    },
    errorNotice: {
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
    },
    messageRow: {
        display: 'flex',
        marginBottom: '12px',
    },
    messageBubble: {
        maxWidth: '78%',
        borderRadius: '16px',
        padding: '10px 12px',
        border: '1px solid var(--border-color)',
    },
    myBubble: {
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        borderColor: 'var(--brand-purple)',
        borderTopRightRadius: '4px',
    },
    theirBubble: {
        backgroundColor: 'white',
        color: 'var(--primary-dark)',
        borderTopLeftRadius: '4px',
    },
    authorName: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 700,
        marginBottom: '4px',
        color: 'var(--brand-purple)',
        textDecoration: 'none',
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
    chatInputArea: {
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--background-light)',
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
    },
    disabledButton: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
};

export default SocialChatPage;
