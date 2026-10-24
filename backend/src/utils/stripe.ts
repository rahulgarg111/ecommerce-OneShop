import Stripe from 'stripe';
import { config } from '../config/env';
import { ApiError } from './ApiError';

const isPlaceholderKey = (value: string): boolean => {
  return !value || value.includes('your_') || value.includes('xxxxxxxx');
};

let stripeClient: Stripe | null = null;

export const isStripeWebhookConfigured = (): boolean => {
  return !isPlaceholderKey(config.stripe.webhookSecret);
};

export const validateStripeSecretConfiguration = (): void => {
  if (isPlaceholderKey(config.stripe.secretKey)) {
    throw ApiError.badRequest(
      'Stripe is not configured. Set a valid STRIPE_SECRET_KEY in backend/.env to place orders.'
    );
  }
};

export const validateStripeCheckoutConfiguration = (): void => {
  validateStripeSecretConfiguration();

  if (isPlaceholderKey(config.stripe.publishableKey)) {
    throw ApiError.badRequest(
      'Stripe publishable key is missing. Set a valid STRIPE_PUBLISHABLE_KEY in backend/.env.'
    );
  }
};

export const getStripeClient = (): Stripe => {
  validateStripeSecretConfiguration();

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  return stripeClient;
};

export const calculateTax = (subtotal: number): number => {
  // Simple tax calculation - 18% GST for India
  // In production, use proper tax calculation based on location
  return Math.round(subtotal * 0.18);
};

export const calculateShipping = (items: number, total: number): number => {
  // Simple shipping calculation
  // Free shipping over ₹1000, otherwise ₹50
  if (total >= 100000) {
    // ₹1000 in paise
    return 0;
  }
  return 5000; // ₹50 in paise
};
