import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, {});
}

const DEPOSIT_PRICE_CENTS = 9900;
const PRODUCT_NAME = "FrostDesk Early Access Deposit";

export async function POST(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000";
  try {
    const stripe = getStripe();
    const body = await request.json();
    const successUrl = (body.successUrl as string) || `${baseUrl}/en/deposit-success`;
    const cancelUrl = (body.cancelUrl as string) || `${baseUrl}/en/deposit-cancel`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: DEPOSIT_PRICE_CENTS,
            product_data: {
              name: PRODUCT_NAME,
              description: "Refundable deposit to reserve your onboarding slot.",
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { type: "early_access_deposit" },
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to create checkout" },
      { status: 500 }
    );
  }
}
