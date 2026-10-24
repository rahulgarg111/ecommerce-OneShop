import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  onPaymentConfirmed: () => Promise<void>;
}

const StripePaymentForm = ({ onPaymentConfirmed }: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Stripe is still loading. Please wait a moment and try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (paymentIntent && ['succeeded', 'processing'].includes(paymentIntent.status)) {
      try {
        await onPaymentConfirmed();
      } catch (error: any) {
        setErrorMessage(error?.message || 'Payment was submitted, but order confirmation failed.');
        setIsSubmitting(false);
      }
      return;
    }

    setErrorMessage('Payment requires additional confirmation. Please try again.');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <button type="submit" disabled={!stripe || !elements || isSubmitting} className="btn-primary w-full">
        {isSubmitting ? 'Confirming Payment...' : 'Pay Now'}
      </button>
    </form>
  );
};

export default StripePaymentForm;
