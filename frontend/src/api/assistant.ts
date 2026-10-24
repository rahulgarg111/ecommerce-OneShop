import apiClient, { getFreshAccessToken } from './client';
import { API_URL } from '../config/api';
import type { ApiResponse } from '../types';
import type { ProductCardData } from '../components/product/ProductCard';

export type OrderStage = 'awaiting_payment' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';

export interface AssistantOrderCard {
  _id: string;
  number: string;
  placedAt: string;
  stage: OrderStage;
  total: number;
  itemCount: number;
  items: { name: string; quantity: number; image?: string }[];
  trackingNumber?: string;
}

export interface AssistantCartCard {
  itemCount: number;
  subtotal: number;
  items: { name: string; slug?: string; quantity: number; price: number; image?: string }[];
}

export interface AssistantReply {
  reply: string;
  mode: 'ai' | 'basic';
  products: ProductCardData[];
  orders: AssistantOrderCard[];
  cart?: AssistantCartCard;
  cartUpdated: boolean;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamHandlers {
  onStatus?: (text: string) => void;
  onDelta?: (text: string) => void;
  /** The server is discarding the text streamed so far (a fallback answer follows). */
  onReset?: () => void;
}

export class AssistantHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const assistantApi = {
  /** Streams a reply (Server-Sent Events over POST) and resolves with the final result. */
  chatStream: async (
    messages: ChatTurn[],
    sessionId: string,
    handlers: StreamHandlers,
    signal?: AbortSignal
  ): Promise<AssistantReply> => {
    const token = await getFreshAccessToken();
    const response = await fetch(`${API_URL}/assistant/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ messages, sessionId }),
      signal,
    });

    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      throw new AssistantHttpError(response.status, body?.message || 'Assistant request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: AssistantReply | null = null;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      // Events are separated by a blank line: "event: name\ndata: {json}\n\n"
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = raw.match(/^event: (.*)$/m)?.[1];
        const data = raw.match(/^data: (.*)$/m)?.[1];
        if (!event || !data) continue; // keep-alive comment

        const payload = JSON.parse(data);
        if (event === 'status') handlers.onStatus?.(payload.text);
        else if (event === 'delta') handlers.onDelta?.(payload.text);
        else if (event === 'reset') handlers.onReset?.();
        else if (event === 'done') result = payload as AssistantReply;
        else if (event === 'error') throw new AssistantHttpError(500, payload.message);
      }
    }

    if (!result) throw new AssistantHttpError(500, 'The reply was cut off');
    return result;
  },

  /** Non-streaming variant (whole reply at once). */
  chat: async (messages: ChatTurn[], sessionId: string) => {
    const response = await apiClient.post<ApiResponse<AssistantReply>>('/assistant/chat', { messages, sessionId });
    return response.data.data!;
  },

  status: async () => {
    const response = await apiClient.get<ApiResponse<{ mode: 'ai' | 'basic' }>>('/assistant/status');
    return response.data.data!;
  },
};
