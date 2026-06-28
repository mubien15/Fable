import '../styles/globals.css'
import { Analytics } from '@vercel/analytics/react'
import { useRouter } from 'next/router'
import AuthGate from '../components/AuthGate'

// Public routes that must render without an account (legal pages, linked from
// the auth screen and required by Stripe).
const PUBLIC_ROUTES = ['/privacy', '/terms']

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const isPublic = PUBLIC_ROUTES.includes(router.pathname)

  if (isPublic) {
    return (
      <>
        <Component {...pageProps} />
        <Analytics />
      </>
    )
  }

  return (
    <AuthGate>
      <Component {...pageProps} />
      <Analytics />
    </AuthGate>
  )
}
