export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
}

export interface GetPaymentIntentParams {
  paymentIntentId: string;
}

export interface GetPaymentIntentResult {
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface CancelPaymentIntentParams {
  paymentIntentId: string;
}

/**
 * Creates a PaymentIntent on Stripe.
 * 
 * @param params - PaymentIntent creation parameters
 * @returns PaymentIntent ID, client secret, and status
 * @throws Error if API call fails
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  const formData = new URLSearchParams();
  formData.append('amount', params.amount.toString());
  formData.append('currency', params.currency);
  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      formData.append(`metadata[${key}]`, value);
    }
  }

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create payment intent: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return {
    paymentIntentId: result.id,
    clientSecret: result.client_secret,
    status: result.status,
  };
}

/**
 * Retrieves a PaymentIntent from Stripe.
 * 
 * @param params - PaymentIntent retrieval parameters
 * @returns PaymentIntent details
 * @throws Error if API call fails
 */
export async function getPaymentIntent(
  params: GetPaymentIntentParams
): Promise<GetPaymentIntentResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  const response = await fetch(
    `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(params.paymentIntentId)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get payment intent: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return {
    paymentIntentId: result.id,
    status: result.status,
    amount: result.amount,
    currency: result.currency,
    metadata: result.metadata || {},
  };
}

/**
 * Cancels a PaymentIntent on Stripe.
 * 
 * @param params - PaymentIntent cancellation parameters
 * @throws Error if API call fails or cancellation is not allowed
 */
export async function cancelPaymentIntent(
  params: CancelPaymentIntentParams
): Promise<void> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  const formData = new URLSearchParams();

  const response = await fetch(
    `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(params.paymentIntentId)}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to cancel payment intent: ${response.status} ${errorText}`);
  }
}
