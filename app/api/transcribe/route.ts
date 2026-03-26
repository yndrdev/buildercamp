import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audioFile = formData.get('audio') as File
  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer())

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      'Content-Type': audioFile.type || 'audio/webm',
    },
    body: buffer,
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  const result = await response.json()
  const text = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''

  return NextResponse.json({ text })
}
