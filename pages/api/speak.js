export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text, voice = 'onyx' } = req.body

  if (!text) {
    return res.status(400).json({ error: 'No text provided' })
  }

  // Cap at 500 chars for spoken version — full text still shown in chat
  const ttsText = text.length > 500 ? text.slice(0, 497) + '…' : text

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: ttsText,
        voice,
        response_format: 'mp3',
        speed: 1.0,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return res.status(500).json({ error: err.message || 'TTS request failed' })
    }

    const audioBuffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioBuffer.byteLength)
    res.send(Buffer.from(audioBuffer))

  } catch (error) {
    console.error('[speak] TTS error:', error?.message || error)
    res.status(500).json({ error: 'Failed to generate speech' })
  }
}
