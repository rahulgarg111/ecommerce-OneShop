import Stripe from 'stripe';
import { config } from '../config/env';

if (!config.stripe.secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

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
