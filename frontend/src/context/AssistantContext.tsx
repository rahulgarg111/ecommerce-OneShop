import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant';
import type { AssistantReply, ChatTurn } from '../api/assistant';
import { getSessionId } from '../utils/sessionId';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: AssistantReply['products'];
  orders?: AssistantReply['orders'];
  cart?: AssistantReply['cart'];
  error?: boolean;
  /** True while the reply is still arriving */
  streaming?: boolean;
  /** What the assistant is doing right now, e.g. "Searching for running shoes…" */
  status?: string;
}

interface AssistantContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isThinking: boolean;
  mode: 'ai' | 'basic' | null;
  open: (prompt?: string) => void;
  close: () => void;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'oneshop-assistant-chat';
const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

// Conversation survives page navigation and reloads within this browser tab.
const loadMessages = (): ChatMessage[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    // Drop replies that were cut off by a reload mid-stream
    return saved
      .filter((m) => !(m.streaming && !m.content))
      .map((m) => ({ ...m, streaming: false, status: undefined }));
  } catch {
    return [];
  }
};

const newId = () => Math.random().toString(36).slice(2);

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [isThinking, setIsThinking] = useState(false);
  const [mode, setMode] = useState<'ai' | 'basic' | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* storage unavailable — chat still works in memory */
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && mode === null) {
      assistantApi.status().then((s) => setMode(s.mode)).catch(() => setMode(null));
    }
  }, [isOpen, mode]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isThinking) return;

      const userMessage: ChatMessage = { id: newId(), role: 'user', content };
      const history: ChatTurn[] = [...messagesRef.current, userMessage]
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      // The reply appears straight away and fills in as text streams from the server.
      const replyId = newId();
      const patchReply = (patch: (m: ChatMessage) => Partial<ChatMessage>) =>
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, ...patch(m) } : m)));

      setMessages((prev) => [...prev, userMessage, { id: replyId, role: 'assistant', content: '', streaming: true }]);
      setIsThinking(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const reply = await assistantApi.chatStream(
          history,
          getSessionId(),
          {
            onStatus: (status) => patchReply(() => ({ status })),
            onDelta: (text) => patchReply((m) => ({ content: m.content + text, status: undefined })),
            onReset: () => patchReply(() => ({ content: '' })),
          },
          controller.signal
        );
        setMode(reply.mode);
        patchReply(() => ({
          content: reply.reply,
          products: reply.products,
          orders: reply.orders,
          cart: reply.cart,
          streaming: false,
          status: undefined,
        }));
        if (reply.cartUpdated) queryClient.invalidateQueries({ queryKey: ['cart'] });
      } catch (error: any) {
        if (controller.signal.aborted) return; // chat was reset mid-reply
        const message =
          error.status === 429
            ? error.message || 'You are chatting a bit fast — give it a moment.'
            : "Sorry, I couldn't reach the store just now. Please try again.";
        patchReply(() => ({ content: message, error: true, streaming: false, status: undefined }));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsThinking(false);
      }
    },
    [isThinking, queryClient]
  );

  const open = useCallback(
    (prompt?: string) => {
      setIsOpen(true);
      if (prompt) void send(prompt);
    },
    [send]
  );

  const close = useCallback(() => setIsOpen(false), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return (
    <AssistantContext.Provider value={{ isOpen, messages, isThinking, mode, open, close, send, reset }}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) throw new Error('useAssistant must be used within AssistantProvider');
  return context;
};
