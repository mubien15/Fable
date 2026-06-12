import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Fable — rehearse the conversations that matter, before they're real." />
        <meta name="theme-color" content="#FAF7F2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Fable" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* App uses the Apple system font stack (SF Pro on Apple devices) — no webfont download needed. */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
