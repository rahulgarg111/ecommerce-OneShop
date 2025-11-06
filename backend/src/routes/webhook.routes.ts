import { Router } from 'express';
import { stripeWebhook } from '../controllers/webhook.controller';

const router = Router();

// Stripe webhook - uses raw body (configured in app.ts)
router.post('/stripe', stripeWebhook);

export default router;
