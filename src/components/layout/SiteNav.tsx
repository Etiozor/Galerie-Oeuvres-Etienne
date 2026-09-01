/**
 * Navigation globale du site public — Galerie POF.
 *
 * Server Component async : lit la session iron-session du visiteur puis délègue
 * tout le rendu à SiteNavClient (Client Component). Ce découpage est nécessaire
 * car le nouveau design a besoin de usePathname() (sous-titre de route, bouton
 * retour) et d'un état de drawer — des hooks qui n'existent qu'en Client Component.
 *
 * SÉCURITÉ : session.save() est INTERDIT ici. SiteNav lit uniquement la session,
 * jamais ne l'écrit (réservé aux Server Actions). [T-04-01-02, T-05-05-02]
 *
 * POURQUOI async ? cookies() de Next.js 15 est asynchrone — await obligatoire.
 * React gère les async Server Components de façon transparente.
 */
import { getVisitorSession } from '@/lib/session'
import { SiteNavClient } from './SiteNavClient'

export async function SiteNav() {
  const session = await getVisitorSession()

  return (
    <SiteNavClient
      isLoggedIn={!!session.visitorId}
      displayName={session.displayName ?? undefined}
    />
  )
}
