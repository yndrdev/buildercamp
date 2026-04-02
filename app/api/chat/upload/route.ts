import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const maxDuration = 30

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/csv', 'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const conversationId = formData.get('conversationId') as string | null

  if (!file || !conversationId) {
    return NextResponse.json({ error: 'File and conversationId required' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not supported' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'bin'
  const path = `chat/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) {
    console.error('[Upload failed]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)

  return NextResponse.json({
    url: urlData.publicUrl,
    name: file.name,
    type: file.type,
    size: file.size,
  })
}
