/**
 * Bouton de déconnexion de l'artiste.
 *
 * POURQUOI un Client Component séparé ?
 * Un formulaire HTML natif <form method="POST" action="/api/auth/sign-out"> affiche
 * le JSON brut retourné par Better Auth au lieu de rediriger. Ce composant appelle
 * l'endpoint programmatiquement via fetch() puis redirige avec useRouter.
 *
 * useRouter et les handlers d'événements nécessitent le rendu côté client ('use client').
 * Le reste de la page admin reste un Server Component.
 */

'use client'

import { useRouter } from 'next/navigation'

/**
 * Bouton de déconnexion.
 * Appelle l'endpoint Better Auth puis redirige vers /admin/login.
 */
export function SignOutButton({ style, label = 'Se déconnecter' }: { style?: React.CSSProperties; label?: string } = {}) {
  const router = useRouter()

  /**
   * Gère la déconnexion :
   * 1. Appelle /api/auth/sign-out (Better Auth supprime le cookie de session)
   * 2. Invalide le cache du routeur Next.js (évite un cache périmé avec session révolue)
   * 3. Redirige vers la page de connexion
   */
  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    // router.refresh() invalide le cache des Server Components avant la navigation
    // Sans ça, /admin/login pourrait afficher une version en cache avec session active
    router.refresh()
    router.push('/admin/login')
  }

  return (
    <button
      onClick={handleSignOut}
      style={style ?? { padding: '0.5rem 1rem', cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}
