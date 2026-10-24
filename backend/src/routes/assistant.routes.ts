import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chatWithAssistant, getAssistantStatus, streamChatWithAssistant } from '../controllers/assistant.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Each chat turn can call the model several times, so keep a tighter per-IP limit.
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'You are chatting a bit fast — please wait a moment and try again.' },
});

router.get('/status', getAssistantStatus);
router.post('/chat', chatLimiter, optionalAuth, chatWithAssistant);
router.post('/chat/stream', chatLimiter, optionalAuth, streamChatWithAssistant);

export default router;
