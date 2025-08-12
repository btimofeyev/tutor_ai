const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../utils/supabaseClient');

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
}

// Create Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  const parent_id = getParentId(req);
  const { price_id, success_url, cancel_url } = req.body;

  if (!parent_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get parent's email from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(parent_id);
    if (userError || !user?.email) {
      return res.status(400).json({ error: 'Parent email not found' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: parent_id, // Important: this links the session to your parent
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: success_url || `${req.headers.origin}/dashboard?success=true`,
      cancel_url: cancel_url || `${req.headers.origin}/dashboard?canceled=true`,
      metadata: {
        parent_id: parent_id
      }
    });

    res.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get current subscription status
router.get('/subscription-status', async (req, res) => {
  const parent_id = getParentId(req);

  if (!parent_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if parent has subscription in your database
    const { data: subscription, error } = await supabase
      .from('parent_subscriptions')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    res.json({
      has_subscription: !!subscription,
      subscription: subscription || null
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Create customer portal session (for managing subscription)
router.post('/create-portal-session', async (req, res) => {
  const parent_id = getParentId(req);

  if (!parent_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get parent's Stripe customer ID
    const { data: subscription } = await supabase
      .from('parent_subscriptions')
      .select('stripe_customer_id')
      .eq('parent_id', parent_id)
      .eq('status', 'active')
      .single();

    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${req.headers.origin}/dashboard`,
    });

    res.json({ portal_url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

module.exports = router;
