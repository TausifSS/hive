import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Bot, Mic, Send, UserRound, Sparkles } from 'lucide-react';
import { askAssistant } from '../lib/api';

interface AssistantMessage {
    id: string;
    content: string;
    isUser?: boolean;
}

const SUGGESTIONS = [
    { text: "Upcoming Events 📅", query: "Show me the upcoming events at campus" },
    { text: "My Points 🏆", query: "Check my points and leaderboard status" },
    { text: "About HIVE ⚡", query: "What is HIVE and how to use it?" },
];

const ChatBubble = ({ message, isUser }: { message: string; isUser?: boolean }) => (
    <div style={{ ...styles.bubbleContainer, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && (
            <div style={styles.avatarGlow}>
                <Bot size={18} color="white" />
            </div>
        )}
        <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.aiBubble) }}>
            {message}
        </div>
        {isUser && (
            <div style={styles.userAvatar}>
                <UserRound size={18} color="#6B7280" />
            </div>
        )}
    </div>
);

const HeyGHRPage = () => {
    const [messages, setMessages] = useState<AssistantMessage[]>([
        { id: 'welcome', content: "Hey, I'm GHR, your campus assistant! Ask me anything about events, points, leaderboard, or posts." },
    ]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const sendQuery = async (queryText: string) => {
        const content = queryText.trim();
        if (!content || isSending) return;

        const userMessage = { id: `user-${Date.now()}`, content, isUser: true };
        setMessages((currentMessages) => [...currentMessages, userMessage]);
        setInput('');
        setError('');
        setIsSending(true);

        try {
            const response = await askAssistant(content);
            setMessages((currentMessages) => [
                ...currentMessages,
                { id: response.reply.id, content: response.reply.content },
            ]);
        } catch (assistantError) {
            setError(assistantError instanceof Error ? assistantError.message : 'Assistant is unavailable');
        } finally {
            setIsSending(false);
        }
    };

    const handleSend = () => {
        void sendQuery(input);
    };

    const handleSuggestionClick = (query: string) => {
        void sendQuery(query);
    };

    const handleMicClick = () => {
        setMessages((currentMessages) => [
            ...currentMessages,
            {
                id: `voice-${Date.now()}`,
                content: 'Voice input is not connected in this browser yet. Typed campus help is working now.',
            },
        ]);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerTitleContainer}>
                    <div style={styles.headerBotGlow}>
                        <Bot size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={styles.title}>Hey GHR</h1>
                        <p style={styles.subtitle}>AI Campus Assistant • Connected to HIVE</p>
                    </div>
                </div>
                <div style={styles.aiBadge}>
                    <Sparkles size={14} color="var(--brand-purple)" style={{ marginRight: '6px' }} />
                    <span style={styles.aiBadgeText}>Gemini AI</span>
                </div>
            </div>

            <div style={styles.chatArea}>
                {messages.map((message) => (
                    <ChatBubble key={message.id} message={message.content} isUser={message.isUser} />
                ))}
                {isSending && (
                    <div style={styles.bubbleContainer}>
                        <div style={styles.avatarGlow}>
                            <Bot size={18} color="white" />
                        </div>
                        <div style={{ ...styles.bubble, ...styles.aiBubble, fontStyle: 'italic', color: '#9CA3AF' }}>
                            Thinking...
                        </div>
                    </div>
                )}
                {error && <p style={styles.errorText}>{error}</p>}
            </div>

            {messages.length <= 1 && (
                <div style={styles.suggestionsContainer}>
                    <p style={styles.suggestionsTitle}>💡 Try asking:</p>
                    <div style={styles.suggestionsGrid}>
                        {SUGGESTIONS.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestionClick(s.query)}
                                style={styles.suggestionChip}
                            >
                                {s.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div style={styles.inputArea}>
                <input
                    type="text"
                    placeholder="Ask me anything about GHR..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    style={styles.input}
                />
                <button style={styles.micButton} onClick={handleMicClick} title="Voice input status">
                    <Mic size={22} color="white" />
                </button>
                <button
                    aria-label="Send assistant message"
                    style={{ ...styles.sendButton, ...((isSending || !input.trim()) ? styles.disabledButton : {}) }}
                    onClick={handleSend}
                    disabled={isSending || !input.trim()}
                >
                    <Send size={22} color="white" />
                </button>
            </div>
        </div>
    );
};

const styles: { [key: string]: CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#F5F3FF', // Very soft light purple background
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
        backgroundColor: 'white',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.05)',
    },
    headerTitleContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    headerBotGlow: {
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(124, 58, 237, 0.25)',
    },
    title: {
        fontSize: '20px',
        fontWeight: '800',
        margin: 0,
        color: '#1F2937',
        letterSpacing: '-0.02em',
    },
    subtitle: {
        fontSize: '12px',
        color: '#6B7280',
        margin: '2px 0 0 0',
        fontWeight: 500,
    },
    aiBadge: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        padding: '6px 12px',
        borderRadius: '20px',
    },
    aiBadgeText: {
        fontSize: '12px',
        fontWeight: '700',
        color: 'var(--brand-purple)',
    },
    chatArea: {
        flex: 1,
        padding: '24px 20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 100%)', // Premium gradient
    },
    bubbleContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        margin: '4px 0',
    },
    avatarGlow: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '10px',
        boxShadow: '0 3px 8px rgba(139, 92, 246, 0.25)',
        flexShrink: 0,
    },
    userAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '10px',
        border: '1px solid #D1D5DB',
        flexShrink: 0,
    },
    bubble: {
        maxWidth: '75%',
        padding: '12px 18px',
        borderRadius: '20px',
        lineHeight: 1.5,
        fontSize: '15px',
    },
    aiBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(139, 92, 246, 0.1)',
        color: '#1F2937',
        borderTopLeftRadius: '4px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
    },
    userBubble: {
        background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', // Violet/purple gradient
        color: 'white',
        borderTopRightRadius: '4px',
        boxShadow: '0 4px 15px rgba(124, 58, 237, 0.25)',
    },
    errorText: {
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '16px',
        padding: '12px 16px',
        margin: 0,
        fontSize: '14px',
        textAlign: 'center',
    },
    suggestionsContainer: {
        padding: '10px 20px',
        backgroundColor: '#EDE9FE',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    suggestionsTitle: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#6D28D9',
        margin: 0,
    },
    suggestionsGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    suggestionChip: {
        backgroundColor: 'white',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '20px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#4C1D95',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        transition: 'all 0.15s ease',
    },
    inputArea: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        gap: '12px',
        borderTop: '1px solid rgba(139, 92, 246, 0.1)',
        backgroundColor: 'white',
        boxShadow: '0 -4px 20px rgba(139, 92, 246, 0.05)',
    },
    input: {
        flex: 1,
        padding: '12px 20px',
        borderRadius: '24px',
        border: '1px solid #E5E7EB',
        fontSize: '15px',
        outline: 'none',
        backgroundColor: '#F9FAFB',
        transition: 'all 0.2s ease',
    },
    micButton: {
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#3B82F6',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
        transition: 'transform 0.15s ease',
    },
    sendButton: {
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'var(--brand-purple)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(106, 75, 255, 0.25)',
        transition: 'transform 0.15s ease',
    },
    disabledButton: {
        opacity: 0.5,
        cursor: 'not-allowed',
        boxShadow: 'none',
    },
};

export default HeyGHRPage;
