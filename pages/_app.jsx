import '../styles/globals.css'
import { Analytics } from '@vercel/analytics/react'
import PasswordGate from '../components/PasswordGate'

export default function App({ Component, pageProps }) {
  return (
    <PasswordGate>
      <Component {...pageProps} />
      <Analytics />
    </PasswordGate>
  )
}
