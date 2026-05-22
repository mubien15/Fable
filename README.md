# Fable — AI Communication Coach

A free, mobile-first web app that helps everyday adults navigate real-life conversations. No login. No API key from users. Fully free to use.

## Tech Stack

- **Next.js 14** (React + serverless API routes)
- **Anthropic Claude** (server-side only — key never exposed to browser)
- **Vercel** (hosting, free tier)
- **Web Speech API** (voice input, built into browsers)
- **localStorage** (all user data stored locally)

## Deploy to Vercel (5 minutes)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create fable --public --push
   # or manually create repo at github.com and push
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click **Add New Project** → import your `fable` repo
   - Framework: **Next.js** (auto-detected)

3. **Add your API key**
   - In Vercel: **Settings → Environment Variables**
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   - Select: Production, Preview, Development
   - Click **Save**

4. **Deploy**
   - Click **Deploy** — Vercel builds and gives you a live URL instantly
   - Every `git push` auto-deploys

## Local Development

```bash
npm install
cp .env.local.example .env.local
# Add your API key to .env.local
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
/pages
  index.jsx          ← entire client-side app (all screens)
  /api
    coaching.js      ← serverless route (Claude API, key lives here)
/styles
  globals.css
```

## How the API key stays private

The Claude API is only called from `/pages/api/coaching.js` — a serverless function that runs on Vercel's servers. The browser never sees the key. Users make requests to `/api/coaching` on your domain, not to Anthropic directly.
