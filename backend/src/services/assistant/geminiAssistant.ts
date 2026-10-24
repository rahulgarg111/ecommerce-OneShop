import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { Content, GenerateContentConfig, Part } from '@google/genai';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { ShopperContext, newArtifacts, cardsMentionedIn } from './shopTools';
import {
  AssistantReply,
  ChatTurn,
  SYSTEM_PROMPT,
  TOOL_DEFINITIONS,
  runShopTool,
  shopperContextNote,
} from './assistantCore';

const MAX_TOOL_ROUNDS = 6;
// Gemini latency varies a lot; give up on a stalled call so the shopper gets the basic assistant instead of a hang.
const CALL_TIMEOUT_MS = 30_000;

let client: GoogleGenAI | null = null;
const getClient = () => {
  if (!client) client = new GoogleGenAI({ apiKey: config.gemini.apiKey, httpOptions: { timeout: CALL_TIMEOUT_MS } });
  return client;
};

export const isGeminiConfigured = () => Boolean(config.gemini.apiKey);

/** Keep thinking short: this is a chat with simple tool calls, and thinking tokens cost money. */
const thinkingFor = (model: string): GenerateContentConfig['thinkingConfig'] =>
  model.startsWith('gemini-2.5') ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.MINIMAL };

/** Progress updates sent to the browser while a reply is being produced. */
export type AssistantEvent = { type: 'status'; text: string } | { type: 'delta'; text: string };

export interface RunOptions {
  /** Called with status lines and reply text as they arrive (for streaming to the browser). */
  onEvent?: (event: AssistantEvent) => void;
  /** Aborts the Gemini request, e.g. when the shopper closes the chat. */
  signal?: AbortSignal;
}

const toolStatus = (name: string, args: Record<string, any>): string => {
  switch (name) {
    case 'search_products':
      return args.query ? `Searching for “${String(args.query).slice(0, 40)}”…` : 'Searching the catalog…';
    case 'get_orders':
      return 'Checking your orders…';
    case 'get_cart':
      return 'Looking at your cart…';
    case 'add_to_cart':
      return 'Adding it to your cart…';
    default:
      return 'Browsing the store…';
  }
};

export async function runGeminiAssistant(
  history: ChatTurn[],
  ctx: ShopperContext,
  { onEvent, signal }: RunOptions = {}
): Promise<AssistantReply> {
  const artifacts = newArtifacts();
  const model = config.gemini.model;
  const emit = (event: AssistantEvent) => onEvent?.(event);

  const contents: Content[] = history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const requestConfig: GenerateContentConfig = {
    systemInstruction: `${SYSTEM_PROMPT}\n\n${shopperContextNote(ctx)}`,
    tools: [
      {
        functionDeclarations: TOOL_DEFINITIONS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parametersJsonSchema: tool.parameters,
        })),
      },
    ],
    thinkingConfig: thinkingFor(model),
    maxOutputTokens: 4096,
    abortSignal: signal,
  };

  const startedAt = Date.now();
  const searchedIds: string[] = [];
  let reply = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await getClient().models.generateContentStream({ model, contents, config: requestConfig });

    // Collect this round's parts as they stream in, forwarding visible text immediately.
    const parts: Part[] = [];
    let roundText = '';
    let finishReason: string | undefined;
    for await (const chunk of stream) {
      const candidate = chunk.candidates?.[0];
      if (candidate?.finishReason) finishReason = candidate.finishReason;
      for (const part of candidate?.content?.parts ?? []) {
        parts.push(part);
        if (part.text && !part.thought) {
          // Separate text from an earlier round (e.g. "Let me check…") from this round's text.
          const text = !roundText && reply ? `\n\n${part.text}` : part.text;
          roundText += part.text;
          reply += text;
          emit({ type: 'delta', text });
        }
      }
    }

    if (!parts.length) {
      logger.warn(`Assistant: Gemini returned no content (finishReason=${finishReason})`);
      if (reply) break;
      const sorry = "Sorry, I can't help with that one. I'm happy to help you find products or check on your orders though!";
      emit({ type: 'delta', text: sorry });
      return { ...artifacts, mode: 'ai', reply: sorry };
    }

    // Send the model turn back exactly as produced (parts carry thought signatures Gemini needs).
    contents.push({ role: 'model', parts });

    const calls = parts.filter((part) => part.functionCall).map((part) => part.functionCall!);
    if (!calls.length) {
      await cardsMentionedIn(reply, searchedIds, artifacts);
      logger.info(`Assistant: ${model} answered in ${round + 1} call(s), ${Date.now() - startedAt}ms`);
      return { ...artifacts, mode: 'ai', reply: reply.trim() || 'Here is what I found.' };
    }

    // Run the calls (independent, so in parallel) and answer them all in one user turn.
    emit({ type: 'status', text: toolStatus(calls[0].name ?? '', calls[0].args ?? {}) });
    const results: Part[] = await Promise.all(
      calls.map(async (call): Promise<Part> => {
        const name = call.name ?? '';
        try {
          const output: any = await runShopTool(name, (call.args ?? {}) as Record<string, any>, ctx, artifacts);
          if (name === 'search_products') searchedIds.push(...(output?.results ?? []).map((r: { id: string }) => r.id));
          return { functionResponse: { id: call.id, name, response: { output } } };
        } catch (error) {
          logger.error(`Assistant tool ${name} failed`, error);
          return { functionResponse: { id: call.id, name, response: { error: 'Tool failed. Try another approach.' } } };
        }
      })
    );
    contents.push({ role: 'user', parts: results });
    emit({ type: 'status', text: 'Writing your answer…' });
  }

  await cardsMentionedIn(reply, searchedIds, artifacts);
  const fallback = 'I pulled together a few options for you — have a look below, and tell me if you want me to narrow it down.';
  if (!reply) emit({ type: 'delta', text: fallback });
  return { ...artifacts, mode: 'ai', reply: reply.trim() || fallback };
}
