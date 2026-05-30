// Server-side speech-to-text via OpenAI Whisper.
// iOS Safari's webkitSpeechRecognition silently fails after any <audio> playback
// (the TTS reply), so we record with MediaRecorder on the client and transcribe here.
// Never expose the OpenAI key — this runs server-side only.

export const config = {
  api: {
    bodyParser: false,           // we read the raw audio stream ourselves
    sizeLimit: '25mb',
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const openAIKey = process.env.OpenAI_Voice || process.env.OPENAI_API_KEY
  if (!openAIKey) {
    return res.status(500).json({ error: 'OpenAI API key is not set in Vercel environment variables' })
  }

  try {
    // Collect the raw request body (the recorded audio blob) into a Buffer.
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const buf = Buffer.concat(chunks)

    if (!buf.length) {
      return res.status(400).json({ error: 'No audio data received' })
    }

    // Pick a file extension Whisper recognises based on the recorder's mime type.
    const contentType = req.headers['content-type'] || 'audio/mp4'
    const ext =
      contentType.includes('webm') ? 'webm' :
      contentType.includes('ogg')  ? 'ogg'  :
      contentType.includes('wav')  ? 'wav'  :
      contentType.includes('mpeg') ? 'mp3'  :
      'mp4'  // iOS Safari MediaRecorder default

    // Build multipart form for OpenAI. Node 18+/20 (Vercel) has global FormData + Blob.
    const form = new FormData()
    form.append('file', new Blob([buf], { type: contentType }), `audio.${ext}`)
    form.append('model', 'whisper-1')
    form.append('language', 'en')
    form.append('response_format', 'json')

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAIKey}` },
      body: form,
    })

    if (!r.ok) {
      let msg = `Whisper returned status ${r.status}`
      try { const e = await r.json(); msg = e?.error?.message || msg } catch {}
      console.error('[transcribe] OpenAI error:', r.status, msg)
      return res.status(502).json({ error: msg })
    }

    const data = await r.json()
    return res.json({ text: (data.text || '').trim() })

  } catch (error) {
    console.error('[transcribe] error:', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Transcription failed' })
  }
}
