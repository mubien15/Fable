// ─── Stripe Billing Portal — let a customer manage/cancel their plan ──────
// Returns a hosted portal URL for the signed-in user's Stripe customer.
import Stripe from 'stripe'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const { data: { user } = {}, error: uErr } = await supabaseAdmin.auth.getUser(token)
  if (uErr || !user) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()

    const customerId = profile && profile.stripe_customer_id
    if (!customerId) return res.status(400).json({ error: 'No subscription found.' })

    const origin = req.headers.origin || `https://${req.headers.host}`
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?tab=progress`,
    })
    return res.json({ url: session.url })
  } catch (err) {
    console.error('[portal]', err?.message || err)
    return res.status(500).json({ error: 'Could not open the billing portal. Please try again.' })
  }
}
