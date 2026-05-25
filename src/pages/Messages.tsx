import { useEffect, useState, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Search, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getConversation, getUser, sendConversationMessage, getConversations, getLeaderboard } from '../lib/api';
import type { Conversation, User } from '../lib/api';

const MessagesPage = () => {
    const { user: currentUser } = useAuth();
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();

    // Chat view states
    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Inbox view states
    const [conversations, setConversations] = useState<(Conversation & { otherUser?: User | null })[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    // Shared states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load Chat Conversation Room
    const loadConversationRoom = async (id: string) => {
        setIsLoading(true);
        setError('');
        try {
            const [userResponse, conversationResponse] = await Promise.all([
                getUser(id),
                getConversation(id),
            ]);
            setTargetUser(userResponse.user);
            setConversation(conversationResponse.conversation);
        } catch (conversationError) {
            setError(conversationError instanceof Error ? conversationError.message : 'Unable to load conversation');
        } finally {
            setIsLoading(false);
        }
    };

    // Load Inbox Conversations List
    const loadInbox = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [convosResponse, usersResponse] = await Promise.all([
                getConversations(),
                getLeaderboard()
            ]);
            setConversations(convosResponse.conversations);
            setAllUsers(usersResponse.users);
        } catch (inboxError) {
            setError(inboxError instanceof Error ? inboxError.message : 'Unable to load inbox');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            void loadConversationRoom(userId);
        } else {
            void loadInbox();
        }
    }, [userId]);

    useEffect(() => {
        if (conversation) {
            scrollToBottom();
        }
    }, [conversation]);

    // Handle searching users
    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        const filtered = allUsers.filter((u) => 
            u.id !== currentUser?.id &&
            (u.name.toLowerCase().includes(query.toLowerCase()) || 
             (u.handle && u.handle.toLowerCase().includes(query.toLowerCase())))
        );
        setSearchResults(filtered);
    };

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

    // Render Conversation Room (Chat)
    if (userId) {
        return (
            <div style={styles.container}>
                <header style={styles.header}>
                    <ArrowLeft size={24} style={{ cursor: 'pointer' }} onClick={() => navigate('/messages')} />
                    <img
                        src={targetUser?.avatarUrl || 'https://placehold.co/40x40/EFEFEF/333?text=HV'}
                        alt={targetUser?.name || 'User'}
                        style={styles.avatar}
                    />
                    <div>
                        <h1 style={styles.userName}>{targetUser?.name || 'Messages'}</h1>
                        <p style={styles.userStatus}>@{targetUser?.handle || targetUser?.id}</p>
                    </div>
                </header>

                <main style={styles.chatArea}>
                    {isLoading ? (
                        <div style={styles.notice}>Loading conversation...</div>
                    ) : error ? (
                        <div style={styles.errorNotice}>{error}</div>
                    ) : conversation && conversation.messages.length > 0 ? (
                        <>
                            {conversation.messages.map((message) => {
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
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    ) : (
                        <div style={styles.notice}>Start your conversation with {targetUser?.name}.</div>
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
                        <Send size={18} color="white" />
                    </button>
                </footer>
            </div>
        );
    }

    // Render Inbox Conversations List (Conversations Dashboard)
    return (
        <div style={styles.container}>
            <header style={styles.inboxHeader}>
                <h1 style={styles.inboxTitle}>Direct Messages</h1>
                
                {/* Search Bar */}
                <div style={styles.searchBarContainer}>
                    <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search student or role..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        style={styles.searchInput}
                    />
                </div>
            </header>

            <main style={styles.inboxListArea}>
                {isLoading ? (
                    <div style={styles.notice}>Loading conversations...</div>
                ) : error ? (
                    <div style={styles.errorNotice}>{error}</div>
                ) : searchQuery.trim() ? (
                    /* Render Search Results */
                    searchResults.length === 0 ? (
                        <div style={styles.notice}>No students found matching "{searchQuery}"</div>
                    ) : (
                        <div style={styles.convoList}>
                            <p style={styles.sectionHeader}>Search Results</p>
                            {searchResults.map((u) => (
                                <Link key={u.id} to={`/messages/${u.id}`} style={styles.convoItem} onClick={() => setSearchQuery('')}>
                                    <img
                                        src={u.avatarUrl || 'https://placehold.co/50x50/EFEFEF/333?text=HV'}
                                        alt={u.name}
                                        style={styles.inboxAvatar}
                                    />
                                    <div style={styles.convoDetails}>
                                        <h3 style={styles.convoName}>{u.name}</h3>
                                        <p style={styles.convoSnippet}>@{u.handle || u.id}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                ) : conversations.length === 0 ? (
                    /* Render Empty State */
                    <div style={styles.emptyInboxState}>
                        <MessageSquare size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#374151' }}>No messages yet</h3>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, maxWidth: '280px' }}>
                            Search for students above to start a private conversation.
                        </p>
                    </div>
                ) : (
                    /* Render Active Chats */
                    <div style={styles.convoList}>
                        <p style={styles.sectionHeader}>Recent Chats</p>
                        {conversations.map((convo) => {
                            const lastMsg = convo.messages[convo.messages.length - 1];
                            const otherUser = convo.otherUser;
                            if (!otherUser) return null;

                            return (
                                <Link key={convo.id} to={`/messages/${otherUser.id}`} style={styles.convoItem}>
                                    <img
                                        src={otherUser.avatarUrl || 'https://placehold.co/50x50/EFEFEF/333?text=HV'}
                                        alt={otherUser.name}
                                        style={styles.inboxAvatar}
                                    />
                                    <div style={styles.convoDetails}>
                                        <div style={styles.convoHeaderRow}>
                                            <h3 style={styles.convoName}>{otherUser.name}</h3>
                                            <span style={styles.convoTime}>
                                                {new Date(convo.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p style={styles.convoSnippet}>
                                            {lastMsg ? lastMsg.content : 'Start chatting!'}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
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
        padding: '14px 16px',
        borderBottom: '1px solid #E5E7EB',
        gap: '12px',
        backgroundColor: 'white',
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
        color: '#111827',
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
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    notice: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: '14px',
        padding: '24px',
    },
    errorNotice: {
        textAlign: 'center',
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        fontSize: '14px',
        padding: '16px',
        margin: '16px',
    },
    bubbleRow: {
        display: 'flex',
        marginBottom: '6px',
    },
    bubble: {
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: '16px',
        position: 'relative',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
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
        wordBreak: 'break-word',
    },
    messageTime: {
        display: 'block',
        marginTop: '4px',
        fontSize: '10px',
        opacity: 0.75,
        textAlign: 'right',
    },
    inputArea: {
        display: 'flex',
        padding: '12px 16px',
        borderTop: '1px solid #E5E7EB',
        gap: '12px',
        backgroundColor: 'white',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        padding: '10px 16px',
        borderRadius: '24px',
        border: '1px solid #E5E7EB',
        fontSize: '15px',
        outline: 'none',
        backgroundColor: '#F9FAFB',
    },
    sendButton: {
        width: '40px',
        height: '40px',
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
    
    // Inbox dashboard styles
    inboxHeader: {
        padding: '20px 24px 16px 24px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: 'white',
    },
    inboxTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        margin: '0 0 16px 0',
        color: '#111827',
    },
    searchBarContainer: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: '24px',
        padding: '0 16px',
        height: '44px',
    },
    searchIcon: {
        marginRight: '8px',
    },
    searchInput: {
        border: 'none',
        backgroundColor: 'transparent',
        width: '100%',
        outline: 'none',
        fontSize: '15px',
        color: '#1F2937',
    },
    inboxListArea: {
        flex: 1,
        overflowY: 'auto',
        backgroundColor: '#FFFFFF',
    },
    emptyInboxState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        textAlign: 'center',
    },
    convoList: {
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 0',
    },
    sectionHeader: {
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#9CA3AF',
        padding: '0 24px 8px 24px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: 0,
    },
    convoItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 24px',
        textDecoration: 'none',
        color: 'inherit',
        borderBottom: '1px solid #F9FAFB',
        gap: '16px',
        transition: 'background-color 0.15s ease',
    },
    inboxAvatar: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '1px solid #E5E7EB',
    },
    convoDetails: {
        flex: 1,
        minWidth: 0, // Allows text truncation
    },
    convoHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '4px',
    },
    convoName: {
        margin: 0,
        fontSize: '15px',
        fontWeight: 'bold',
        color: '#111827',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    convoTime: {
        fontSize: '12px',
        color: '#9CA3AF',
        flexShrink: 0,
    },
    convoSnippet: {
        margin: 0,
        fontSize: '14px',
        color: '#6B7280',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};

export default MessagesPage;
