import { Request, Response } from 'express';
import { ApiError as GeminiApiError } from '@google/genai';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { ChatTurn } from '../services/assistant/assistantCore';
import { isGeminiConfigured, runGeminiAssistant } from '../services/assistant/geminiAssistant';
import { runBasicAssistant } from '../services/assistant/basicAssistant';
import { ShopperContext } from '../services/assistant/shopTools';

const MAX_TURNS = 20;
const MAX_CHARS = 2000;

/** Keeps only well-formed text turns, trimmed to a sane size, ending on a user turn. */
function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns = raw
    .filter(
      (t): t is ChatTurn =>
        !!t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim() !== ''
    )
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS);

  // The conversation must start with a user turn
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

export const getAssistantStatus = (_req: Request, res: Response) => {
  res.json({ success: true, data: { mode: isGeminiConfigured() ? 'ai' : 'basic' } });
};

/** Validates the request and builds the shopper context shared by both chat endpoints. */
function parseChatRequest(req: Request): { history: ChatTurn[]; ctx: ShopperContext } {
  const history = sanitizeHistory(req.body.messages);
  if (!history.length || history[history.length - 1].role !== 'user') {
    throw ApiError.badRequest('messages must end with a user message');
  }
  const ctx: ShopperContext = {
    userId: req.userId,
    userName: req.user?.name,
    sessionId: typeof req.body.sessionId === 'string' ? req.body.sessionId : undefined,
  };
  return { history, ctx };
}

function logGeminiFailure(error: unknown) {
  if (error instanceof GeminiApiError) {
    if (error.status === 401 || error.status === 403) {
      logger.error('Assistant: GEMINI_API_KEY was rejected; using basic assistant');
    } else if (error.status === 429) {
      logger.warn('Assistant: Gemini rate limit/quota hit; using basic assistant');
    } else {
      logger.error(`Assistant: Gemini API error ${error.status}: ${error.message}`);
    }
  } else {
    logger.error('Assistant: unexpected error; using basic assistant', error);
  }
}

/** POST /assistant/chat — returns the whole reply as JSON. */
export const chatWithAssistant = asyncHandler(async (req: Request, res: Response) => {
  const { history, ctx } = parseChatRequest(req);

  if (isGeminiConfigured()) {
    try {
      const result = await runGeminiAssistant(history, ctx);
      return res.json({ success: true, data: result });
    } catch (error) {
      // Fall back to the basic assistant so the shopper still gets an answer.
      logGeminiFailure(error);
    }
  }

  const result = await runBasicAssistant(history, ctx);
  res.json({ success: true, data: result });
});

/**
 * POST /assistant/chat/stream — Server-Sent Events:
 *   status {text}  what the assistant is doing ("Searching for air fryer…")
 *   delta  {text}  next piece of the reply text
 *   reset  {}      discard text streamed so far (the AI failed mid-answer; a fallback follows)
 *   done   {...}   final reply with product, order and cart cards
 */
export const streamChatWithAssistant = asyncHandler(async (req: Request, res: Response) => {
  const { history, ctx } = parseChatRequest(req);

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // stop proxies from buffering the stream
  res.flushHeaders();

  const abort = new AbortController();
  // 'close' on the response fires if the shopper navigates away or closes the chat
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });
  const send = (event: string, data: unknown) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const heartbeat = setInterval(() => !res.writableEnded && res.write(': keep-alive\n\n'), 15_000);

  try {
    let streamedText = false;
    if (isGeminiConfigured()) {
      try {
        const result = await runGeminiAssistant(history, ctx, {
          signal: abort.signal,
          onEvent: (event) => {
            if (event.type === 'delta') streamedText = true;
            send(event.type, { text: event.text });
          },
        });
        send('done', result);
        return;
      } catch (error) {
        if (abort.signal.aborted) return; // shopper left; nothing to send
        logGeminiFailure(error);
        if (streamedText) send('reset', {});
      }
    }

    const result = await runBasicAssistant(history, ctx);
    send('delta', { text: result.reply });
    send('done', result);
  } catch (error) {
    logger.error('Assistant stream failed', error);
    send('error', { message: "Sorry, I couldn't reach the store just now. Please try again." });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});
