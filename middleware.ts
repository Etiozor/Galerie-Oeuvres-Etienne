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

export async function middleware(request: NextRequest) {
  // Vérification légère : présence du cookie de session Better Auth.
  //
  // POURQUOI ne pas appeler auth.api.getSession() ici ?
  // Le middleware s'exécute dans l'Edge Runtime de Next.js, qui ne peut pas
  // charger les modules Node.js lourds (kysely, pg). Importer l'objet auth
  // complet ferait planter le build Edge.
  //
  // La vérification complète (session en base, expiration) se fait dans
  // chaque Server Component protégé via auth.api.getSession(). Le middleware
  // se contente de bloquer les requêtes sans cookie — cas le plus fréquent.
  const sessionCookie = request.cookies.get('better-auth.session_token')
  const hasSession = !!sessionCookie?.value

  const { pathname } = request.nextUrl

  // Si l'artiste est connecté et tente d'aller sur /admin/login,
  // le rediriger directement vers le tableau de bord
  if (hasSession && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Si l'artiste n'est pas connecté et tente d'accéder à une route protégée,
  // le rediriger vers la page de connexion
  if (!hasSession && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Sinon, laisser passer la requête normalement
  return NextResponse.next()
}

export const config = {
  // Couvre explicitement /admin (sans sous-chemin) ET /admin/login, /admin/works, etc.
  // POURQUOI les deux entrées ? Le pattern ':path*' (zéro ou plusieurs segments) devrait
  // théoriquement inclure /admin seul, mais le comportement varie selon la version Next.js.
  // Déclarer '/admin' explicitement lève toute ambiguïté et garantit que la page principale
  // du tableau de bord est bien protégée en première ligne de défense.
  matcher: ['/admin', '/admin/:path*'],
}
