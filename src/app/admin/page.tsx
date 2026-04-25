/**
 * Page d'accueil de l'administration — tableau de bord artiste.
 *
 * Cette page est protégée par le middleware (middleware.ts).
 * Si l'artiste n'est pas connecté, il est redirigé avant même
 * que cette page soit rendue.
 *
 * C'est un Server Component : le rendu se fait côté serveur,
 * ce qui est plus sécurisé et plus rapide pour le SEO.
 *
 * Phase 5 enrichira cette page avec les stats, les offres, etc.
 */

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignOutButton } from './_components/SignOutButton'

export default async function AdminPage() {
  // Récupérer la session de l'artiste connecté
  // Le middleware a déjà vérifié la session — cette vérification est
  // une couche de sécurité supplémentaire pour le rendu côté serveur
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // Si, malgré le middleware, la session est absente, rediriger
  // (ne devrait pas arriver, mais défense en profondeur)
  if (!session) {
    redirect('/admin/login')
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      {/* En-tête simple — le design complet vient en Phase 5 */}
      <h1>Administration — Galerie POF</h1>
      <p>
        Bienvenue,{' '}
        <strong>{session.user.name ?? session.user.email}</strong>
      </p>
      <p style={{ color: '#666', marginTop: '1rem' }}>
        Le tableau de bord complet sera disponible en Phase 5.
        Pour l&apos;instant, la connexion fonctionne correctement.
      </p>
      {/* Bouton de déconnexion — Client Component pour éviter l'affichage JSON brut */}
      <div style={{ marginTop: '2rem' }}>
        <SignOutButton />
      </div>
    </main>
  )
}
