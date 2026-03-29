import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || new URL(req.url).origin
  const response = NextResponse.redirect(`${origin}/`, { status: 302 })
  response.cookies.delete('bc_session')
  return response
}
