import { useEffect, useState, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Send, Hash, BookOpen, Users, Plus, ArrowLeft, RefreshCw, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getChannels, createChannel, getChannelMessages, sendChannelMessage } from '../lib/api';
import type { ChannelMessage, Channel } from '../lib/api';

const SocialChatPage = () => {
    const { user } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeTab, setActiveTab] = useState('global');
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [messageText, setMessageText] = useState('');
    const [isChannelsLoading, setIsChannelsLoading] = useState(true);
    const [isMessagesLoading, setIsMessagesLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    
    // File attachments states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mediaAttachment, setMediaAttachment] = useState<{ data: string; name: string; type: string } | null>(null);
    
    // Toggle list view on mobile
    const [showMobileList, setShowMobileList] = useState(true);
    
    // Channel creation state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadChannels = async () => {
        setIsChannelsLoading(true);
        try {
            const res = await getChannels();
            setChannels(res.channels);
        } catch (err) {
            console.error('Failed to load channels', err);
        } finally {
            setIsChannelsLoading(false);
        }
    };

    const loadMessages = async () => {
        setIsMessagesLoading(true);
        setError('');
        try {
            const response = await getChannelMessages(activeTab);
            setMessages(response.messages);
        } catch (chatError) {
            setError(chatError instanceof Error ? chatError.message : 'Unable to load channel');
        } finally {
            setIsMessagesLoading(false);
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        void loadChannels();
    }, []);

    useEffect(() => {
        void loadMessages();
    }, [activeTab]);

    // Real-time channel message listener
    useEffect(() => {
        const handleIncomingChannelMessage = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail.channelId === activeTab) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === detail.message.id)) return prev;
                    const next = [...prev, detail.message];
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                    return next;
                });
            }
        };

        window.addEventListener('api-channel-message', handleIncomingChannelMessage);
        return () => {
            window.removeEventListener('api-channel-message', handleIncomingChannelMessage);
        };
    }, [activeTab]);

    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleSend = async () => {
        const content = messageText.trim();
        const mediaUrl = mediaAttachment?.data || '';
        if ((!content && !mediaUrl) || isSending) return;

        setIsSending(true);
        setError('');

        try {
            const response = await sendChannelMessage(activeTab, content, mediaUrl);
            setMessages(response.messages);
            setMessageText('');
            setMediaAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            scrollToBottom();
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

    const handleCreateChannel = async () => {
        const name = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        if (!name) return;
        try {
            const res = await createChannel({ name, category: 'custom' });
            setNewChannelName('');
            setIsCreateOpen(false);
            await loadChannels();
            setActiveTab(res.channel.id);
            setShowMobileList(false);
        } catch (err) {
            alert('Failed to create channel: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const channelName = channels.find((c) => c.id === activeTab)?.name || activeTab;

    const groupedChannels = {
        academic: channels.filter(c => c.category === 'academic'),
        club: channels.filter(c => c.category === 'club'),
        custom: channels.filter(c => c.category === 'custom' || (c.category !== 'academic' && c.category !== 'club')),
    };

    const ChatSkeleton = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px' }}>
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }
                `}</style>
                {[1, 2, 3, 4, 5].map((n) => {
                    const isMine = n % 2 === 0;
                    return (
                        <div key={n} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', animation: 'pulse 1.5s infinite' }}>
                            <div style={{
                                maxWidth: '70%',
                                backgroundColor: isMine ? 'rgba(139,92,246,0.1)' : '#F3F4F6',
                                borderRadius: '12px',
                                padding: '12px',
                                width: isMine ? '180px' : '240px'
                            }}>
                                {!isMine && <div style={{ width: '80px', height: '12px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '8px' }}></div>}
                                <div style={{ width: '100%', height: '14px', backgroundColor: isMine ? '#E5E7EB' : '#E5E7EB', borderRadius: '4px', marginBottom: '6px' }}></div>
                                <div style={{ width: '60%', height: '14px', backgroundColor: isMine ? '#E5E7EB' : '#E5E7EB', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSidebar = () => (
        <div style={styles.channelSidebar}>
            <div style={styles.sidebarHeader}>
                <MessageSquare size={18} color="var(--brand-purple)" />
                <h2 style={styles.sidebarHeading}>Communities</h2>
            </div>
            
            <div style={styles.channelListScroll}>
                {isChannelsLoading ? (
                    <div style={styles.emptyCustom}>Loading communities...</div>
                ) : (
                    <>
                        <div style={styles.categoryGroup}>
                            <div style={styles.categoryTitle}>
                                <BookOpen size={14} style={{ marginRight: '6px' }} />
                                <span>Academic</span>
                            </div>
                            {groupedChannels.academic.map((chan) => (
                                <button
                                    key={chan.id}
                                    style={{
                                        ...styles.channelItem,
                                        ...(activeTab === chan.id ? styles.activeChannelItem : {})
                                    }}
                                    onClick={() => {
                                        setActiveTab(chan.id);
                                        setShowMobileList(false);
                                    }}
                                >
                                    <span style={styles.hashIcon}>#</span>
                                    <span style={styles.channelItemName}>{chan.name}</span>
                                </button>
                            ))}
                        </div>

                        <div style={styles.categoryGroup}>
                            <div style={styles.categoryTitle}>
                                <Users size={14} style={{ marginRight: '6px' }} />
                                <span>Clubs</span>
                            </div>
                            {groupedChannels.club.map((chan) => (
                                <button
                                    key={chan.id}
                                    style={{
                                        ...styles.channelItem,
                                        ...(activeTab === chan.id ? styles.activeChannelItem : {})
                                    }}
                                    onClick={() => {
                                        setActiveTab(chan.id);
                                        setShowMobileList(false);
                                    }}
                                >
                                    <span style={styles.hashIcon}>#</span>
                                    <span style={styles.channelItemName}>{chan.name}</span>
                                </button>
                            ))}
                        </div>

                        <div style={styles.categoryGroup}>
                            <div style={{ ...styles.categoryTitle, justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Hash size={14} style={{ marginRight: '6px' }} />
                                    <span>Custom Channels</span>
                                </div>
                                <button 
                                    style={styles.addChannelBtn} 
                                    onClick={() => setIsCreateOpen(true)}
                                    title="Create new channel"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            {groupedChannels.custom.map((chan) => (
                                <button
                                    key={chan.id}
                                    style={{
                                        ...styles.channelItem,
                                        ...(activeTab === chan.id ? styles.activeChannelItem : {})
                                    }}
                                    onClick={() => {
                                        setActiveTab(chan.id);
                                        setShowMobileList(false);
                                    }}
                                >
                                    <span style={styles.hashIcon}>#</span>
                                    <span style={styles.channelItemName}>{chan.name}</span>
                                </button>
                            ))}
                            {groupedChannels.custom.length === 0 && (
                                <div style={styles.emptyCustom}>No custom channels. Create one!</div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const renderCreateModal = () => (
        <div style={styles.modalBackdrop} onClick={() => setIsCreateOpen(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 style={styles.modalTitle}>Create Community</h2>
                <label style={styles.modalLabel}>Channel Name</label>
                <input 
                    type="text" 
                    placeholder="e.g. android-development"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    style={styles.modalInput}
                />
                <div style={styles.modalActions}>
                    <button style={styles.cancelBtn} onClick={() => setIsCreateOpen(false)}>Cancel</button>
                    <button style={styles.createBtn} onClick={handleCreateChannel}>Create</button>
                </div>
            </div>
        </div>
    );

    const renderChatArea = () => (
        <div style={styles.chatArea}>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .spin-animation {
                    animation: spin 1s linear infinite;
                }
            `}</style>
            <div style={styles.channelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!isDesktop && (
                        <button 
                            onClick={() => setShowMobileList(true)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                            aria-label="Back to channels list"
                        >
                            <ArrowLeft size={20} color="var(--primary-dark)" />
                        </button>
                    )}
                    <h1 style={styles.channelTitle}>#{channelName}</h1>
                </div>
                <button style={styles.refreshButton} onClick={loadMessages} disabled={isMessagesLoading} aria-label="Refresh messages">
                    <RefreshCw size={16} className={isMessagesLoading ? "spin-animation" : ""} style={{ marginRight: '6px' }} />
                    <span>Refresh</span>
                </button>
            </div>

            <div style={styles.messagesContainerWrapper}>
                <div style={styles.messageContainer}>
                    {isMessagesLoading ? (
                        <ChatSkeleton />
                    ) : error ? (
                        <div style={styles.errorNotice}>{error}</div>
                    ) : messages.length === 0 ? (
                        <div style={styles.notice}>Start the first message in this channel.</div>
                    ) : (
                        messages.map((message) => {
                            const isMine = message.senderId === user?.id;
                            return (
                                <div key={message.id} style={{ ...styles.messageRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                    {!isMine && (
                                        <Link to={`/profile/${message.author?.id || message.senderId}`}>
                                            <img
                                                src={message.author?.avatarUrl || 'https://placehold.co/100x100/EFEFEF/333?text=HV'}
                                                alt={message.author?.name || 'Student'}
                                                style={styles.messageAvatar}
                                            />
                                        </Link>
                                    )}
                                    <div style={{ ...styles.messageBubble, ...(isMine ? styles.myBubble : styles.theirBubble) }}>
                                        {!isMine && (
                                            <Link to={`/profile/${message.author?.id || message.senderId}`} style={styles.authorName}>
                                                {message.author?.name || 'Student'}
                                            </Link>
                                        )}
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
                                        <span style={{ ...styles.messageTime, color: isMine ? 'rgba(255,255,255,0.75)' : '#9CA3AF' }}>
                                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div style={{ ...styles.chatInputArea, flexDirection: 'column', alignItems: 'stretch' }}>
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                            placeholder={`Message #${channelName}`}
                            value={messageText}
                            onChange={(event) => setMessageText(event.target.value)}
                            onKeyDown={handleKeyDown}
                            style={styles.chatInput}
                            disabled={isMessagesLoading}
                        />
                        <button
                            aria-label="Send channel message"
                            style={{ ...styles.sendButton, ...((isSending || (!messageText.trim() && !mediaAttachment)) ? styles.disabledButton : {}) }}
                            onClick={handleSend}
                            disabled={isSending || (!messageText.trim() && !mediaAttachment)}
                        >
                            <Send size={18} color="white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isDesktop) {
        return (
            <div style={styles.container}>
                {renderSidebar()}
                {renderChatArea()}
                {isCreateOpen && renderCreateModal()}
            </div>
        );
    }

    // Mobile View
    return (
        <div style={styles.container}>
            {showMobileList ? renderSidebar() : renderChatArea()}
            {isCreateOpen && renderCreateModal()}
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        display: 'flex',
        height: '100%',
        backgroundColor: 'var(--background-main)',
        overflow: 'hidden',
    },
    channelSidebar: {
        borderRight: '1px solid var(--border-color)',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        maxWidth: '100%',
    },
    sidebarHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
    },
    sidebarHeading: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 'bold',
        color: 'var(--primary-dark)',
    },
    channelListScroll: {
        flex: 1,
        overflowY: 'auto',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    categoryGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    categoryTitle: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '6px 8px',
        marginBottom: '4px',
    },
    channelItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        color: '#4B5563',
        width: '100%',
        transition: 'all 0.15s ease',
    },
    activeChannelItem: {
        backgroundColor: 'rgba(139,92,246,0.1)',
        color: 'var(--brand-purple)',
        fontWeight: '600',
    },
    hashIcon: {
        fontSize: '16px',
        opacity: 0.6,
        fontWeight: 'normal',
    },
    channelItemName: {
        fontSize: '14px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    addChannelBtn: {
        border: 'none',
        background: 'none',
        color: 'var(--brand-purple)',
        cursor: 'pointer',
        padding: '2px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s',
    },
    emptyCustom: {
        fontSize: '12px',
        color: '#9CA3AF',
        fontStyle: 'italic',
        padding: '8px',
    },
    chatArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--background-main)',
    },
    channelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'white',
    },
    channelTitle: {
        margin: 0,
        fontSize: '18px',
        color: 'var(--primary-dark)',
        fontWeight: 'bold',
    },
    refreshButton: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        backgroundColor: 'white',
        color: 'var(--text-secondary)',
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    messagesContainerWrapper: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    messageContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
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
        margin: '16px',
    },
    messageRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        maxWidth: '100%',
    },
    messageAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        objectFit: 'cover',
        cursor: 'pointer',
    },
    messageBubble: {
        maxWidth: '75%',
        borderRadius: '16px',
        padding: '10px 14px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
    },
    myBubble: {
        background: 'linear-gradient(135deg, var(--brand-purple) 0%, #A78BFA 100%)',
        color: 'white',
        borderBottomRightRadius: '4px',
        alignSelf: 'flex-end',
    },
    theirBubble: {
        backgroundColor: 'white',
        color: '#1F2937',
        borderBottomLeftRadius: '4px',
        alignSelf: 'flex-start',
        border: '1px solid #E5E7EB',
    },
    authorName: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 700,
        marginBottom: '4px',
        color: 'var(--brand-purple)',
        textDecoration: 'none',
        textAlign: 'left',
    },
    messageContent: {
        margin: 0,
        fontSize: '14px',
        lineHeight: 1.45,
        wordBreak: 'break-word',
        textAlign: 'left',
    },
    messageTime: {
        display: 'block',
        marginTop: '4px',
        fontSize: '10px',
        textAlign: 'right',
    },
    chatInputArea: {
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'white',
    },
    chatInput: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '24px',
        border: '1px solid #E5E7EB',
        backgroundColor: '#F3F4F6',
        fontSize: '15px',
        outline: 'none',
    },
    sendButton: {
        width: '40px',
        height: '40px',
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
    modalBackdrop: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
    },
    modalContent: {
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    },
    modalTitle: {
        margin: '0 0 16px 0',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#111827',
    },
    modalLabel: {
        display: 'block',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '6px',
        color: '#374151',
        textAlign: 'left',
    },
    modalInput: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '15px',
        marginBottom: '20px',
        outline: 'none',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    cancelBtn: {
        border: 'none',
        borderRadius: '8px',
        padding: '10px 16px',
        backgroundColor: '#F3F4F6',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
    },
    createBtn: {
        border: 'none',
        borderRadius: '8px',
        padding: '10px 16px',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '14px',
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

export default SocialChatPage;
