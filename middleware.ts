import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes — no auth needed
  if (
    pathname === '/' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/report') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Protected routes: /[clientSlug] and /[clientSlug]/*
  const sessionCookie = request.cookies.get('bc_session')
  if (!sessionCookie?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Verify the user's session matches the requested client slug
  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    const requestedSlug = pathname.split('/')[1]
    if (session.clientSlug !== requestedSlug) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|avatar.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
