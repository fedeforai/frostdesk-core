import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, {});
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.type !== "early_access_deposit") {
    return NextResponse.json({ received: true });
  }
  const customerEmail = session.customer_email ?? session.customer_details?.email;
  if (!customerEmail) {
    return NextResponse.json({ error: "No customer email" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("waitlist")
    .update({
      deposit_paid: true,
      stripe_session_id: session.id,
      status: "deposit_paid",
      updated_at: new Date().toISOString(),
    })
    .eq("email", customerEmail);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
