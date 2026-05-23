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
    errorText: {
        color: '#DC2626',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '12px',
        padding: '10px 12px',
        margin: 0,
    },
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
        backgroundColor: '#2563EB',
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
    },
    disabledButton: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
};

export default HeyGHRPage;
