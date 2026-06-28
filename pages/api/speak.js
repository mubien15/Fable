import { requireUser } from '../../lib/usageLimit'

const VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require a signed-in user so this costly endpoint can't be hammered anonymously.
  const user = await requireUser(req)
  if (!user) return res.status(401).json({ error: 'Please sign in again.' })

  const { text, voice: rawVoice = 'onyx' } = req.body
  const voice = VALID_VOICES.has(rawVoice) ? rawVoice : 'onyx'

  if (!text) {
    return res.status(400).json({ error: 'No text provided' })
  }

  // Check key is configured at all (variable is named OpenAI_Voice in Vercel)
  const openAIKey = process.env.OpenAI_Voice || process.env.OPENAI_API_KEY
  if (!openAIKey) {
    return res.status(500).json({ error: 'OpenAI API key is not set in Vercel environment variables' })
  }

  // Cap at 500 chars for spoken version — full text still shown in chat
  const ttsText = text.length > 500 ? text.slice(0, 497) + '…' : text

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: ttsText,
        voice,
        response_format: 'mp3',
        speed: 1.1,  // slightly brisker than default — more natural, less robotic
      }),
    })

    if (!response.ok) {
      // Forward the actual OpenAI error message so the client can display it
      let openAIError = `OpenAI returned status ${response.status}`
      try {
        const errBody = await response.json()
        openAIError = errBody?.error?.message || openAIError
      } catch {}
      console.error('[speak] OpenAI error:', response.status, openAIError)
      return res.status(502).json({ error: openAIError })
    }

    const audioBuffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioBuffer.byteLength)
    res.send(Buffer.from(audioBuffer))

  } catch (error) {
    console.error('[speak] fetch error:', error?.message || error)
    res.status(500).json({ error: error?.message || 'Failed to reach OpenAI' })
  }
}
