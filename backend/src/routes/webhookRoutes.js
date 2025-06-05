const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../utils/supabaseClient');

router.post(
  '/stripe', // This makes the full path /api/webhooks/stripe
  express.raw({ type: 'application/json' }), // Apply raw body parser specifically to this route
  async (req, res) => {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
          event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
          console.error('Webhook signature verification failed:', err.message);
          return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // If you see this log, the 404 is happening before this handler is even reached.
      // But if the path is now correct, this log should appear.
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
          console.error('Error details:', error.message, error.stack);
          res.status(500).json({ error: 'Webhook processing failed' });
      }
  }
);

async function handleCheckoutCompleted(session) {
  const parent_id = session.client_reference_id || session.metadata.parent_id;
  if (!parent_id) {
      console.error('No parent_id found in checkout session:', session.id);
      return;
  }

  const subscriptionId = session.subscription;
  if (!subscriptionId) {
      console.error('No subscription ID found in checkout session:', session.id);
      return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  console.log(`Retrieved subscription ${subscription.id} in handleCheckoutCompleted. Status: ${subscription.status}`);
  console.log('Raw current_period_start:', subscription.current_period_start);
  console.log('Raw current_period_end:', subscription.current_period_end);

  const price_id = subscription.items.data[0].price.id;
  const priceToPlan = {
      'price_1RVZczD8TZAZUMMAQWokffCi': 'klio_addon',
      'price_1RVZT4D8TZAZUMMA3YIJeWWE': 'family',
      'price_1RVZTrD8TZAZUMMAiUuoU72d': 'academy'
  };
  const plan_type = priceToPlan[price_id] || 'unknown';

  let currentPeriodStartISO = null;
  if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
      currentPeriodStartISO = new Date(subscription.current_period_start * 1000).toISOString();
  } else {
      console.warn(`Subscription ${subscription.id} missing or invalid current_period_start: ${subscription.current_period_start}. Will defer to invoice event for dates.`);
  }

  let currentPeriodEndISO = null;
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      currentPeriodEndISO = new Date(subscription.current_period_end * 1000).toISOString();
  } else {
      console.warn(`Subscription ${subscription.id} missing or invalid current_period_end: ${subscription.current_period_end}. Will defer to invoice event for dates.`);
  }

  const { error } = await supabase
      .from('parent_subscriptions')
      .upsert({
          parent_id,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscription.id,
          stripe_price_id: price_id,
          plan_type,
          status: subscription.status,
          current_period_start: currentPeriodStartISO,
          current_period_end: currentPeriodEndISO,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
      }, {
          onConflict: 'parent_id'
      });

  if (error) {
      console.error('Error saving subscription from checkout.session.completed:', error);
  } else {
      console.log(`Subscription record created/updated for parent ${parent_id}: ${plan_type} from checkout.session.completed.`);
  }
}
async function handleSubscriptionUpdated(subscription) {
  console.log(`Handling customer.subscription.updated for sub ID: ${subscription.id}, status: ${subscription.status}`);
  console.log('Raw current_period_start for update:', subscription.current_period_start);
  console.log('Raw current_period_end for update:', subscription.current_period_end);

  let currentPeriodStartISO = null;
  if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
      currentPeriodStartISO = new Date(subscription.current_period_start * 1000).toISOString();
  } else {
      console.warn(`Subscription ${subscription.id} (update event) missing or invalid current_period_start: ${subscription.current_period_start}.`);
  }

  let currentPeriodEndISO = null;
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      currentPeriodEndISO = new Date(subscription.current_period_end * 1000).toISOString();
  } else {
      console.warn(`Subscription ${subscription.id} (update event) missing or invalid current_period_end: ${subscription.current_period_end}.`);
  }
  
  let plan_type;
  let stripe_price_id;
  if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
      stripe_price_id = subscription.items.data[0].price.id;
      const priceToPlan = {
          'price_1RVZczD8TZAZUMMAQWokffCi': 'klio_addon',
          'price_1RVZT4D8TZAZUMMA3YIJeWWE': 'family',
          'price_1RVZTrD8TZAZUMMAiUuoU72d': 'academy'
      };
      plan_type = priceToPlan[stripe_price_id] || 'unknown';
  }

  const updatePayload = {
      status: subscription.status,
      ...(currentPeriodStartISO && { current_period_start: currentPeriodStartISO }),
      ...(currentPeriodEndISO && { current_period_end: currentPeriodEndISO }),
      ...(plan_type && { plan_type: plan_type }),
      ...(stripe_price_id && { stripe_price_id: stripe_price_id }),
      updated_at: new Date().toISOString()
  };
  
  Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

  const { error } = await supabase
      .from('parent_subscriptions')
      .update(updatePayload)
      .eq('stripe_subscription_id', subscription.id);

  if (error) {
      console.error('Error updating subscription from customer.subscription.updated:', error);
  } else {
      console.log(`Subscription ${subscription.id} updated successfully via customer.subscription.updated.`);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const { error } = await supabase
      .from('parent_subscriptions')
      .update({
          status: subscription.status, 
          updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

  if (error) {
      console.error('Error updating subscription to deleted/canceled status:', error);
  } else {
      console.log(`Subscription ${subscription.id} status updated to ${subscription.status} (e.g., canceled).`);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log(`Processing invoice.payment_succeeded for invoice ${invoice.id}, customer ${invoice.customer}`);

  if (!invoice.subscription) {
      console.log(`Invoice ${invoice.id} is not for a subscription. Skipping subscription update.`);
      return;
  }

  const subscriptionId = invoice.subscription;
  
  let subscriptionFromStripe;
  try {
      subscriptionFromStripe = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (err) {
      console.error(`Failed to retrieve subscription ${subscriptionId} during invoice.payment_succeeded: ${err.message}`);
      return; 
  }

  let periodStart, periodEnd;
  if (invoice.lines && invoice.lines.data && invoice.lines.data.length > 0) {
      const subscriptionLineItem = invoice.lines.data.find(line => line.subscription === subscriptionId && line.type === 'subscription');
      if (subscriptionLineItem && subscriptionLineItem.period) {
          periodStart = subscriptionLineItem.period.start;
          periodEnd = subscriptionLineItem.period.end;
      }
  }

  if (!periodStart) periodStart = invoice.period_start;
  if (!periodEnd) periodEnd = invoice.period_end;

  if (!periodStart || !periodEnd || typeof periodStart !== 'number' || typeof periodEnd !== 'number') {
      console.error(`Invoice ${invoice.id} for subscription ${subscriptionId} is missing valid period_start or period_end. Cannot update period dates.`);
      console.log(`Period values: start=${periodStart}, end=${periodEnd}`);
      periodStart = subscriptionFromStripe.current_period_start;
      periodEnd = subscriptionFromStripe.current_period_end;
      if (!periodStart || !periodEnd) {
          console.error(`Fallback to subscription ${subscriptionId} also failed to provide period dates. Aborting date update.`);
          return;
      }
  }
  
  const currentPeriodStartISO = new Date(periodStart * 1000).toISOString();
  const currentPeriodEndISO = new Date(periodEnd * 1000).toISOString();

  const price_id = subscriptionFromStripe.items.data[0].price.id;
  const priceToPlan = {
      'price_1RVZczD8TZAZUMMAQWokffCi': 'klio_addon',
      'price_1RVZT4D8TZAZUMMA3YIJeWWE': 'family',
      'price_1RVZTrD8TZAZUMMAiUuoU72d': 'academy'
  };
  const plan_type = priceToPlan[price_id] || 'unknown';

  const { error } = await supabase
      .from('parent_subscriptions')
      .update({
          status: subscriptionFromStripe.status, 
          current_period_start: currentPeriodStartISO,
          current_period_end: currentPeriodEndISO,
          plan_type: plan_type, 
          stripe_price_id: price_id, 
          updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

  if (error) {
      console.error(`Error updating subscription ${subscriptionId} from invoice.payment_succeeded:`, error);
  } else {
      console.log(`Subscription ${subscriptionId} period and status updated from invoice.payment_succeeded. New status: ${subscriptionFromStripe.status}, Plan: ${plan_type}`);
  }
}

async function handlePaymentFailed(invoice) {
  console.log(`Payment failed for invoice ${invoice.id}, customer ${invoice.customer}.`);
  if (invoice.subscription) {
      try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const { error } = await supabase
              .from('parent_subscriptions')
              .update({
                  status: subscription.status, 
                  updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', invoice.subscription);
          if (error) {
              console.error(`Error updating subscription status on payment failure for ${invoice.subscription}:`, error);
          } else {
               console.log(`Subscription ${invoice.subscription} status updated to ${subscription.status} due to payment failure.`);
          }
      } catch (e) {
          console.error(`Error fetching subscription ${invoice.subscription} on payment failure:`, e);
      }
  }
}

module.exports = router;