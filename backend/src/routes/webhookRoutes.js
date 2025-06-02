const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../utils/supabaseClient');

// Important: Use raw body parser for webhook verification
router.use('/stripe', express.raw({ type: 'application/json' }));

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleCheckoutCompleted(session) {
  const parent_id = session.client_reference_id || session.metadata.parent_id;
  
  if (!parent_id) {
    console.error('No parent_id found in checkout session');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  // Determine plan type based on price_id
  const price_id = subscription.items.data[0].price.id;
  let plan_type = 'unknown';
  
  // You'll need to map your actual Stripe price IDs here
  const priceToplan = {
    'price_klio_addon': 'klio_addon',
    'price_family_plan': 'family',
    'price_academy_plan': 'academy'
  };
  
  plan_type = priceToplan[price_id] || 'unknown';

  // Save subscription to database
  const { error } = await supabase
    .from('parent_subscriptions')
    .upsert({
      parent_id,
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscription.id,
      stripe_price_id: price_id,
      plan_type,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'parent_id'
    });

  if (error) {
    console.error('Error saving subscription:', error);
  } else {
    console.log(`Subscription created for parent ${parent_id}: ${plan_type}`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const { error } = await supabase
    .from('parent_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const { error } = await supabase
    .from('parent_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error deleting subscription:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  // Optional: Log successful payments, send confirmation emails, etc.
  console.log(`Payment succeeded for customer ${invoice.customer}`);
}

async function handlePaymentFailed(invoice) {
  // Optional: Handle failed payments, notify users, etc.
  console.log(`Payment failed for customer ${invoice.customer}`);
}

module.exports = router;