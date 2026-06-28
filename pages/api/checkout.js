// ─── Stripe Checkout — create a subscription checkout session ─────────────
// The signed-in user posts { plan }; we look them up from their bearer token,
// ensure they have a Stripe customer, and return a hosted Checkout URL.
import Stripe from 'stripe'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual:  process.env.STRIPE_PRICE_ANNUAL,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { plan } = req.body || {}
  const priceId = PRICES[plan]
  if (!priceId) return res.status(400).json({ error: 'Unknown plan' })

  // Identify the user from their Supabase access token.
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const { data: { user } = {}, error: uErr } = await supabaseAdmin.auth.getUser(token)
  if (uErr || !user) return res.status(401).json({ error: 'Not authenticated' })

  try {
    // Reuse or create the Stripe customer, stored on the profile.
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()

    let customerId = profile && profile.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
    })

    return res.json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err?.message || err)
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' })
  }
}
