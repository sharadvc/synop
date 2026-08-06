import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Stripe Webhook Error:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === 'checkout.session.completed') {
    // 1. Retrieve the subscription details from Stripe
    // const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // 2. Update the user's subscription in the database (Prisma)
    const userId = session.metadata?.userId;
    
    if (userId) {
       // Example Prisma query:
       // await prisma.user.update({
       //   where: { clerkId: userId },
       //   data: {
       //     subscriptionPlan: 'PRO',
       //     stripeCustomerId: session.customer as string,
       //   }
       // });
       console.log(`Updated user ${userId} to PRO plan.`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
     const subscription = event.data.object as Stripe.Subscription;
     // Handle cancellation
     // await prisma.user.update({
     //   where: { stripeCustomerId: subscription.customer as string },
     //   data: { subscriptionPlan: 'FREE' }
     // });
  }

  return new NextResponse(null, { status: 200 });
}
