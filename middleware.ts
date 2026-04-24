/**
 * Middleware Next.js — Protection des routes de l'admin.
 *
 * Ce middleware s'exécute AVANT chaque requête vers les routes /admin/*.
 * Il vérifie si l'artiste a une session valide (cookie signé par Better Auth).
 *
 * Si la session est absente ou expirée → redirection vers /admin/login.
 * Si la session est valide → la requête passe normalement.
 *
 * POURQUOI un middleware et pas une vérification dans chaque page ?
 * Un middleware s'exécute côté serveur avant le rendu — impossible à contourner
 * côté client. Une vérification dans une page Server Component peut être oubliée.
 * [D-06] : toute route sous /admin/* redirige si non connecté
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  // Vérifier si l'artiste a une session valide
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const { pathname } = request.nextUrl

  // Si l'artiste est connecté et tente d'aller sur /admin/login,
  // le rediriger directement vers le tableau de bord
  if (session && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Si l'artiste n'est pas connecté et tente d'accéder à une route protégée,
  // le rediriger vers la page de connexion
  if (!session && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Sinon, laisser passer la requête normalement
  return NextResponse.next()
}

export const config = {
  // Ce middleware ne s'applique qu'aux routes /admin/*
  // Les routes publiques (/api/auth, /gallery, etc.) ne sont pas interceptées
  matcher: ['/admin/:path*'],
}
