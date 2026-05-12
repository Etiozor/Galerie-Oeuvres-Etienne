/**
 * Navigation globale du site public — Galerie POF.
 *
 * Visible sur toutes les pages publiques (galerie, détail, à propos).
 *
 * POURQUOI async ?
 * En Phase 5 (05-05), SiteNav lit la session iron-session du visiteur pour afficher
 * soit l'initiale du visiteur connecté (carré 28×28px, lien /mon-profil),
 * soit le lien "S'identifier" (ouvre VisitorProfileModal via ?identify=1).
 * Les Server Components async sont transparents pour React — pas de changement
 * de comportement côté rendu HTML.
 *
 * SÉCURITÉ : session.save() est INTERDIT ici. SiteNav est un Server Component —
 * il lit uniquement la session, jamais ne l'écrit. [T-04-01-02, T-05-05-02]
 *
 * Specs UI-SPEC section 2 :
 * - Hauteur 56px (touch target minimum 44px, avec padding)
 * - Fond surface #ede0b8
 * - Logo Oswald 18px uppercase #1a1a1a
 * - Liens Space Mono 11px uppercase #5a5244
 * - Sticky top-0 pour rester visible au scroll
 * - D-03 : zéro coins arrondis, aucune ombre
 *
 * Indicateur de connexion (D-15, D-16) :
 * - Connecté : carré 28×28px, fond var(--color-ink), initiale blanche Space Mono 13px
 * - D-03 : borderRadius 0 même sur le carré initiale (pas un cercle)
 * - Non connecté : lien "S'identifier" Space Mono 11px uppercase lettre-spacing 0.08em
 * - "S'identifier" utilise href="?identify=1" pour déclencher ModalTrigger sans rechargement
 */
import Link from 'next/link'
import { getVisitorSession } from '@/lib/session'

/**
 * Barre de navigation principale — async Server Component.
 *
 * POURQUOI async (et non pas un composant synchrone) ?
 * La session iron-session est lue via `await getVisitorSession()`.
 * L'API cookies() de Next.js 15 est asynchrone — await est obligatoire. [Piège 1 RESEARCH.md]
 * React gère les async Server Components de façon transparente (pas de Suspense requis ici).
 */
export async function SiteNav() {
  // Lecture session visiteur — JAMAIS session.save() ici (réservé aux Server Actions — T-04-01-02)
  const session = await getVisitorSession()
  const isLoggedIn = !!session.visitorId

  return (
    <nav
      style={{
        height: '56px',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        // D-03 : zéro coins arrondis, D-05 : aucune ombre
      }}
    >
      {/* Logo — nom du site en Oswald uppercase */}
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-oswald)',
          fontSize: '18px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-ink)',
          textDecoration: 'none',
        }}
      >
        Galerie POF
      </Link>

      {/* Liens de navigation + indicateur connexion — Space Mono uppercase (D-02) */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-ink-muted)',
            textDecoration: 'none',
          }}
        >
          Galerie
        </Link>
        <Link
          href="/about"
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-ink-muted)',
            textDecoration: 'none',
          }}
        >
          À propos
        </Link>

        {/* Indicateur de connexion visiteur (D-15) */}
        {isLoggedIn ? (
          // Connecté : carré initiale lié à /mon-profil
          // D-16 : 28×28px, fond var(--color-ink), initiale blanche, Space Mono 13px, borderRadius: 0
          <Link href="/mon-profil" style={{ textDecoration: 'none' }}>
            <div
              aria-label={`Votre profil — ${session.displayName}`}
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: 'var(--color-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 0,  // D-03 : carré, pas cercle
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#ffffff',
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {/* Premier caractère du displayName en majuscule — [T-05-05-04] React échappe le HTML */}
                {session.displayName?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
          </Link>
        ) : (
          // Non connecté : lien "S'identifier" → déclenche modal via ?identify=1 (D-17)
          // Le ModalTrigger (Client Component dans layout.tsx) détecte ce paramètre URL
          // et ouvre VisitorProfileModal sans rechargement de page.
          <Link
            href="?identify=1"
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-ink-muted)',
              textDecoration: 'none',
            }}
          >
            S&apos;identifier
          </Link>
        )}
      </div>
    </nav>
  )
}
