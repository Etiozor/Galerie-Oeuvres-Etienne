/**
 * Middleware Next.js — Protection des routes de l'admin.
 *
 * Vérifie la session en appelant l'endpoint Better Auth /api/auth/session
 * avec les cookies de la requête. Plus fiable que de chercher un cookie
 * par son nom (qui peut varier selon la config Better Auth).
 */

import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Appel à l'endpoint de session Better Auth en transmettant les cookies
  // du navigateur. Better Auth vérifie lui-même le cookie et retourne
  // l'utilisateur si la session est valide.
  let hasSession = false
  try {
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
    })
    const session = await sessionRes.json() as { user?: unknown }
    hasSession = !!session?.user
  } catch {
    hasSession = false
  }

  if (hasSession && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (!hasSession && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
