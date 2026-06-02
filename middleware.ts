/**
 * Middleware Next.js — Protection des routes de l'admin.
 *
 * Vérifie la session via auth.api.getSession() directement côté serveur,
 * sans HTTP fetch (évite les problèmes de self-call en production sur Railway).
 *
 * POURQUOI runtime 'nodejs' ?
 * auth.api.getSession() utilise Drizzle + PostgreSQL — incompatible avec
 * l'Edge Runtime qui ne supporte pas les drivers Node.js natifs.
 */

export const runtime = 'nodejs'

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Validation directe via Better Auth — pas de fetch HTTP vers soi-même.
  // auth.api.getSession() lit le cookie de la requête entrante et valide
  // la session en base sans appel réseau.
  let hasSession = false
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })
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
