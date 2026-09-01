/**
 * /admin — pas de tableau de bord propre : on redirige vers la liste des œuvres,
 * qui est l'écran d'accueil de l'administration (couvre aussi les bookmarks /admin).
 */

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  // Défense en profondeur — le middleware a déjà vérifié la session.
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/admin/login')
  }

  redirect('/admin/artworks')
}
