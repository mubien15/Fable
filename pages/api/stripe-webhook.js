// ─── Stripe webhook — keep profile.tier in sync with the subscription ─────
// Stripe calls this on subscription lifecycle events. We verify the signature,
// then flip the user's tier active/inactive. Needs the raw body, so Next's
// body parser is disabled here.
import Stripe from 'stripe'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const config = { api: { bodyParser: false } }

const PRICE_TIER = {
  [process.env.STRIPE_PRICE_MONTHLY]: 'monthly',
  [process.env.STRIPE_PRICE_ANNUAL]:  'annual',
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

async function userIdFromCustomer(customerId) {
  if (!customerId) return null
  const { data } = await supabaseAdmin
    .from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle()
  return data ? data.id : null
}

async function applySubscription(userId, sub, customerId) {
  const item = sub.items?.data?.[0]
  const priceId = item?.price?.id
  const tier = PRICE_TIER[priceId] || 'free'
  const active = ['active', 'trialing'].includes(sub.status)
  // Newer Stripe API versions expose current_period_end on the subscription
  // item rather than the top-level subscription — read either.
  const periodEnd = sub.current_period_end || item?.current_period_end
  await supabaseAdmin.from('profiles').update({
    tier: active ? tier : 'free',
    subscription_status: sub.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  }).eq('id', userId)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const raw = await readRawBody(req)
  let event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        const userId = s.metadata?.supabase_user_id
        if (userId && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription)
          await applySubscription(userId, sub, s.customer)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const userId = sub.metadata?.supabase_user_id || await userIdFromCustomer(sub.customer)
        if (userId) await applySubscription(userId, sub, sub.customer)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.supabase_user_id || await userIdFromCustomer(sub.customer)
        if (userId) {
          await supabaseAdmin.from('profiles').update({
            tier: 'free', subscription_status: 'canceled', stripe_subscription_id: null,
          }).eq('id', userId)
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('[stripe-webhook]', err?.message || err)
    return res.status(500).json({ error: 'handler failed' })
  }

  return res.json({ received: true })
}
