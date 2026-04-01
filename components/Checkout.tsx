"use client";

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe outside of component render to avoid recreating Stripe object
// Ensure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set in your .env.local
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // payment_intent_id is captured here
      const payment_intent_id = paymentIntent.id;
      
      // Ready to be synced with the 'orders' table. 
      console.log("Payment successful! Intent ID ready to sync:", payment_intent_id);
      
      // Example backend sync logic:
      // await fetch('/api/orders/sync-payment', { 
      //   method: 'POST', 
      //   body: JSON.stringify({ orderId, payment_intent_id }) 
      // });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-6">
      <div className="overflow-visible relative z-10">
        <PaymentElement />
      </div>
      <button 
        type="submit" 
        disabled={isProcessing || !stripe || !elements}
        className="mt-2 w-full py-4 px-6 bg-[#C7A17A] text-black text-lg font-bold rounded-xl hover:bg-[#88e600] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_20px_rgba(119,204,0,0.3)] hover:shadow-[0_0_30px_rgba(119,204,0,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A17A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A]"
      >
        {isProcessing ? (
          <>
            <svg className="w-5 h-5 animate-spin text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
            </svg>
            Verarbeite...
          </>
        ) : (
          'Jetzt sicher bezahlen'
        )}
      </button>
      {errorMessage && <div className="text-red-500 text-sm mt-2 text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">{errorMessage}</div>}
    </form>
  );
}

export default function Checkout({ clientSecret }: { clientSecret: string, orderId?: string }) {
  if (!clientSecret) return <p className="text-gray-400 text-center animate-pulse">Lade sicheren Checkout...</p>;

  return (
    <div className="w-full max-w-lg mx-auto bg-[#242424] text-white rounded-2xl border border-[#333333] shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C7A17A] to-transparent opacity-50 rounded-t-2xl"></div>
      <div className="p-8 sm:p-10 relative rounded-2xl bg-[#242424]">
      
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Checkout</h2>
        <p className="text-gray-400 text-sm">Sicher und verschlüsselt bezahlen</p>
      </div>

      <Elements stripe={stripePromise} options={{ 
        clientSecret, 
        // @ts-expect-error - requested legacy style inject
        style: { base: { color: '#ffffff', '::placeholder': { color: '#aab7c4' } } },
        appearance: { 
          theme: 'night',
          variables: {
            borderRadius: '16px',
            colorBackground: '#242424',
            colorText: '#ffffff',
            colorPrimary: '#C7A17A',
            colorDanger: '#ff4d4f',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
          },
          rules: {
            '.invalid': { color: '#ff8080' },
            '.Label': {
              color: '#a3a3a3',
              fontWeight: '500',
              marginBottom: '8px',
              fontSize: '14px',
            },
            '.Input': {
              backgroundColor: '#1A1A1A',
              border: '1px solid #333333',
              padding: '14px',
              color: '#ffffff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1) inset',
              transition: 'all 0.2s ease',
            },
            '.Input:focus': {
              border: '1px solid #C7A17A',
              boxShadow: '0 0 0 1px #C7A17A, 0 4px 12px rgba(119,204,0,0.1)',
            },
            '.Tab': {
              backgroundColor: '#1A1A1A',
              border: '1px solid #333333',
              color: '#a3a3a3',
              outline: 'none',
            },
            '.Tab:hover': {
              color: '#ffffff',
            },
            '.Tab--selected': {
              border: '1px solid #C7A17A',
              backgroundColor: '#1A1A1A',
              color: '#ffffff',
            },
          }
        } 
      }}>
        <PaymentForm />
      </Elements>
      
      {/* Trust Badges placeholder */}
      <div className="mt-8 pt-6 border-t border-[#333] flex justify-center items-center gap-4 text-gray-500 text-xs">
        <span className="flex items-center gap-1">🔒 SSL Encrypted</span>
        <span className="flex items-center gap-1">🛡️ Stripe Secure</span>
      </div>
      </div>
    </div>
  );
}
