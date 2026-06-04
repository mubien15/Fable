import '../styles/globals.css'
import { Analytics } from '@vercel/analytics/react'
import EmailGate from '../components/EmailGate'

export default function App({ Component, pageProps }) {
  return (
    <EmailGate>
      <Component {...pageProps} />
      <Analytics />
    </EmailGate>
  )
}
