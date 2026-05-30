import '../styles/globals.css'
import PasswordGate from '../components/PasswordGate'

export default function App({ Component, pageProps }) {
  return (
    <PasswordGate>
      <Component {...pageProps} />
    </PasswordGate>
  )
}
