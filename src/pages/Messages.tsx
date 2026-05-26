import { useEffect, useState, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Search, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getConversation, getUser, sendConversationMessage, getConversations, getLeaderboard } from '../lib/api';
import type { Conversation, User } from '../lib/api';

const MessagesPage = () => {
    const { user: currentUser, refreshUnread } = useAuth();
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();

    // Chat view states
    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [typingUser, setTypingUser] = useState<{ userId: string; name: string } | null>(null);
    const [mediaAttachment, setMediaAttachment] = useState<{ data: string; name: string; type: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<number | null>(null);

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
            // Mark convo as read
            localStorage.setItem(`convo-read-${conversation.id}`, new Date().toISOString());
            void refreshUnread();
        }
    }, [conversation]);

    // Real-time message & typing listener
    useEffect(() => {
        const handleIncomingMessage = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (userId) {
                if (conversation && detail.conversationId === conversation.id) {
                    setConversation((prev) => {
                        if (!prev) return null;
                        if (prev.messages.some((m) => m.id === detail.message.id)) return prev;
                        return {
                            ...prev,
                            messages: [...prev.messages, detail.message],
                        };
                    });
                }
            } else {
                void loadInbox();
            }
        };

        const handleIncomingTyping = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (userId && conversation && detail.conversationId === conversation.id && detail.userId !== currentUser?.id) {
                if (detail.isTyping) {
                    setTypingUser({ userId: detail.userId, name: detail.name });
                } else {
                    setTypingUser(null);
                }
            }
        };

        window.addEventListener('api-message', handleIncomingMessage);
        window.addEventListener('api-typing', handleIncomingTyping);

        return () => {
            window.removeEventListener('api-message', handleIncomingMessage);
            window.removeEventListener('api-typing', handleIncomingTyping);
            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [userId, conversation, currentUser]);

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

    const handleFileAttach = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaAttachment({
                data: reader.result as string,
                name: file.name,
                type: file.type
            });
        };
        reader.readAsDataURL(file);
    };

    const handleInputChange = (text: string) => {
        setMessageText(text);

        if (!conversation) return;

        // Notify typing
        import('../lib/api').then(({ sendTypingStatus }) => {
            void sendTypingStatus(conversation.id, true);
        }).catch(err => console.error(err));

        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
            import('../lib/api').then(({ sendTypingStatus }) => {
                void sendTypingStatus(conversation.id, false);
            }).catch(err => console.error(err));
        }, 2000);
    };

    const handleSend = async () => {
        const content = messageText.trim();
        const mediaUrl = mediaAttachment?.data || '';
        if ((!content && !mediaUrl) || !conversation || isSending) return;

        setIsSending(true);
        setError('');

        try {
            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }
            import('../lib/api').then(({ sendTypingStatus }) => {
                void sendTypingStatus(conversation.id, false);
            }).catch(err => console.error(err));

            const response = await sendConversationMessage(conversation.id, content, mediaUrl);
            setConversation(response.conversation);
            setMessageText('');
            setMediaAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
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

    // Skeleton loaders
    const InboxSkeleton = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 24px' }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
            {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '16px', animation: 'pulse 1.5s infinite' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E5E7EB' }}></div>
                    <div style={{ flex: 1 }}>
                        <div style={{ width: '120px', height: '16px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '8px' }}></div>
                        <div style={{ width: '70%', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }}></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const ChatRoomSkeleton = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px' }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
            {[1, 2, 3, 4].map((n) => {
                const isMine = n % 2 === 0;
                return (
                    <div key={n} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', animation: 'pulse 1.5s infinite' }}>
                        <div style={{
                            maxWidth: '70%',
                            backgroundColor: isMine ? 'rgba(139,92,246,0.1)' : '#E5E7EB',
                            borderRadius: '12px',
                            padding: '12px',
                            width: isMine ? '180px' : '240px'
                        }}>
                            <div style={{ width: '100%', height: '14px', backgroundColor: isMine ? '#E5E7EB' : '#CBD5E1', borderRadius: '4px', marginBottom: '6px' }}></div>
                            <div style={{ width: '50%', height: '14px', backgroundColor: isMine ? '#E5E7EB' : '#CBD5E1', borderRadius: '4px' }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

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
                        <ChatRoomSkeleton />
                    ) : error ? (
                        <div style={styles.errorNotice}>{error}</div>
                    ) : conversation && conversation.messages.length > 0 ? (
                        <>
                            {conversation.messages.map((message) => {
                                const isMine = message.senderId === currentUser?.id;
                                return (
                                    <div key={message.id} style={{ ...styles.bubbleRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ ...styles.bubble, ...(isMine ? styles.myBubble : styles.theirBubble) }}>
                                            {message.mediaUrl && (
                                                <div style={{ marginBottom: '6px' }}>
                                                    {message.mediaUrl.startsWith('data:image/') ? (
                                                        <img 
                                                            src={message.mediaUrl} 
                                                            alt="attachment" 
                                                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', cursor: 'zoom-in' }} 
                                                            onClick={() => {
                                                                const w = window.open();
                                                                if (w) w.document.write(`<img src="${message.mediaUrl}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                                                            }}
                                                        />
                                                    ) : (
                                                        <a 
                                                            href={message.mediaUrl} 
                                                            download={message.mediaUrl.startsWith('data:') ? 'attachment' : message.mediaUrl.split('/').pop()} 
                                                            style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '8px', 
                                                                color: isMine ? '#E0E7FF' : 'var(--brand-purple)', 
                                                                textDecoration: 'underline',
                                                                fontSize: '14px',
                                                                padding: '8px',
                                                                backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                                                                borderRadius: '6px'
                                                            }}
                                                        >
                                                            <span>📄 Download File</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {message.content && <p style={styles.messageContent}>{message.content}</p>}
                                            <span style={styles.messageTime}>
                                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {typingUser && (
                                <div style={{ ...styles.bubbleRow, justifyContent: 'flex-start' }}>
                                    <div style={{ ...styles.bubble, ...styles.theirBubble, backgroundColor: '#F3F4F6' }}>
                                        <p style={{ ...styles.messageContent, fontStyle: 'italic', color: '#6B7280' }}>
                                            {typingUser.name} is typing...
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    ) : (
                        <div style={styles.notice}>Start your conversation with {targetUser?.name}.</div>
                    )}
                </main>

                <footer style={{ ...styles.inputArea, flexDirection: 'column', alignItems: 'stretch' }}>
                    {mediaAttachment && (
                        <div style={styles.attachmentPreview}>
                            <span style={{ fontSize: '13px', color: '#4B5563', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📎 {mediaAttachment.name}
                            </span>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setMediaAttachment(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }} 
                                style={styles.cancelAttachmentBtn}
                            >
                                &times;
                            </button>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={styles.attachButton}
                            title="Attach File"
                        >
                            📎
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileAttach} 
                            style={{ display: 'none' }} 
                        />
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={messageText}
                            onChange={(event) => handleInputChange(event.target.value)}
                            onKeyDown={handleInputKeyDown}
                            style={styles.input}
                            disabled={isLoading || !conversation}
                        />
                        <button
                            aria-label="Send direct message"
                            style={{ ...styles.sendButton, ...(isSending ? styles.disabledButton : {}) }}
                            onClick={handleSend}
                            disabled={isSending || (!messageText.trim() && !mediaAttachment) || !conversation}
                        >
                            <Send size={18} color="white" />
                        </button>
                    </div>
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
                    <InboxSkeleton />
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

                            const isUnread = lastMsg && lastMsg.senderId !== currentUser?.id && (() => {
                                const readTime = localStorage.getItem(`convo-read-${convo.id}`);
                                if (!readTime) return true;
                                return new Date(lastMsg.createdAt).getTime() > new Date(readTime).getTime();
                            })();

                            return (
                                <Link key={convo.id} to={`/messages/${otherUser.id}`} style={{ ...styles.convoItem, ...(isUnread ? { backgroundColor: '#F5F3FF' } : {}) }}>
                                    <img
                                        src={otherUser.avatarUrl || 'https://placehold.co/50x50/EFEFEF/333?text=HV'}
                                        alt={otherUser.name}
                                        style={styles.inboxAvatar}
                                    />
                                    <div style={styles.convoDetails}>
                                        <div style={styles.convoHeaderRow}>
                                            <h3 style={{ ...styles.convoName, fontWeight: isUnread ? '800' : 'bold' }}>
                                                {otherUser.name}
                                                {isUnread && <span style={styles.unreadDot}></span>}
                                            </h3>
                                            <span style={{ ...styles.convoTime, color: isUnread ? 'var(--brand-purple)' : '#9CA3AF', fontWeight: isUnread ? 'bold' : 'normal' }}>
                                                {new Date(convo.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p style={{ ...styles.convoSnippet, color: isUnread ? '#1F2937' : '#6B7280', fontWeight: isUnread ? '600' : 'normal' }}>
                                            {lastMsg ? (lastMsg.mediaUrl && !lastMsg.content ? '📎 Sent an attachment' : lastMsg.content) : 'Start chatting!'}
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
        color: '#111827',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'flex',
        alignItems: 'center',
    },
    convoTime: {
        fontSize: '12px',
        color: '#9CA3AF',
        flexShrink: 0,
    },
    convoSnippet: {
        margin: 0,
        fontSize: '14px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    unreadDot: {
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'var(--brand-purple, #8B5CF6)',
        marginLeft: '8px',
        flexShrink: 0,
    },
    attachmentPreview: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        backgroundColor: '#F3F4F6',
        borderRadius: '8px',
        marginBottom: '8px',
        gap: '8px',
        textAlign: 'left'
    },
    cancelAttachmentBtn: {
        border: 'none',
        background: 'none',
        fontSize: '18px',
        cursor: 'pointer',
        color: '#EF4444',
        padding: 0,
        fontWeight: 'bold'
    },
    attachButton: {
        fontSize: '20px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px',
        color: '#6B7280'
    },
};

export default MessagesPage;
