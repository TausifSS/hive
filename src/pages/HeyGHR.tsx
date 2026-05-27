import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Bot, Mic, Send } from 'lucide-react';
import { askAssistant } from '../lib/api';

interface AssistantMessage {
    id: string;
    content: string;
    isUser?: boolean;
}

const ChatBubble = ({ message, isUser }: { message: string; isUser?: boolean }) => (
    <div style={{ ...styles.bubbleContainer, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.aiBubble) }}>
            {message}
        </div>
    </div>
);

const HeyGHRPage = () => {
    const [messages, setMessages] = useState<AssistantMessage[]>([
        { id: 'welcome', content: 'Hello! Ask me about events, points, posts, chat, login, or admin roles.' },
    ]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        const content = input.trim();
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
            void handleSend();
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <Bot size={32} color="var(--brand-purple)" />
                <div>
                    <h1 style={styles.title}>Hey GHR</h1>
                    <p style={styles.subtitle}>Campus assistant connected to HIVE backend</p>
                </div>
            </div>

            <div style={styles.chatArea}>
                {messages.map((message) => (
                    <ChatBubble key={message.id} message={message.content} isUser={message.isUser} />
                ))}
                {isSending && <ChatBubble message="Thinking..." />}
                {error && <p style={styles.errorText}>{error}</p>}
            </div>

            <div style={styles.inputArea}>
                <input
                    type="text"
                    placeholder="Ask about events, OTP, points..."
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
        backgroundColor: '#F3F4F6', // Lighter grey background for better contrast
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '24px 20px',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    },
    title: {
        fontSize: '24px',
        fontWeight: '800',
        margin: 0,
        color: 'var(--primary-dark)',
        letterSpacing: '-0.02em',
    },
    subtitle: {
        fontSize: '13px',
        color: '#6B7280',
        margin: '4px 0 0 0',
        fontWeight: 500,
    },
    chatArea: {
        flex: 1,
        padding: '24px 20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    bubbleContainer: {
        display: 'flex',
    },
    bubble: {
        maxWidth: '82%', // Expanded bubble width for spacious look
        padding: '14px 20px', // More breathing room inside bubbles
        borderRadius: '20px',
        lineHeight: 1.55,
        fontSize: '15px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    },
    aiBubble: {
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        color: 'var(--primary-dark)',
        borderTopLeftRadius: '4px',
    },
    userBubble: {
        background: 'linear-gradient(135deg, #6A4BFF 0%, #8B5CF6 100%)', // Premium gradient
        color: 'white',
        borderTopRightRadius: '4px',
        boxShadow: '0 3px 10px rgba(106, 75, 255, 0.25)',
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
    inputArea: {
        display: 'flex',
        alignItems: 'center',
        padding: '20px',
        gap: '12px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: 'white',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.02)',
    },
    input: {
        flex: 1,
        padding: '14px 20px', // Expanded input box height
        borderRadius: '28px',
        border: '1px solid #E5E7EB',
        fontSize: '15px',
        outline: 'none',
        backgroundColor: '#F9FAFB',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
    },
    micButton: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#3B82F6',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)',
        transition: 'transform 0.15s ease',
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
        boxShadow: '0 2px 8px rgba(106, 75, 255, 0.25)',
        transition: 'transform 0.15s ease',
    },
    disabledButton: {
        opacity: 0.5,
        cursor: 'not-allowed',
        boxShadow: 'none',
    },
};

export default HeyGHRPage;
