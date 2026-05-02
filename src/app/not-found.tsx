/**
 * Page 404 — Page non trouvée.
 *
 * Next.js App Router utilise automatiquement ce fichier pour toutes les URLs
 * qui ne correspondent à aucune route définie (y compris /artworks/[id] quand
 * notFound() est appelé pour une œuvre inexistante ou non publiée).
 *
 * Design (UI-SPEC section 13) :
 * - Titre "404" en Oswald 48px
 * - Sous-titre en Space Mono
 * - Lien retour vers la galerie en teal
 * - Fond #f2e8cf, aucun coin arrondi (D-03)
 *
 * IMPORTANT : Ce composant ne peut PAS être async et ne peut pas utiliser
 * les hooks React — il est rendu dans un contexte d'erreur par Next.js.
 */
import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      {/* Fond global via globals.css — background-color: var(--color-bg) sur body */}
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        {/* Titre "404" — Oswald 48px (UI-SPEC section 13) */}
        <h1
          style={{
            fontFamily: 'var(--font-oswald)',
            fontSize: '48px',
            fontWeight: 700,
            color: 'var(--color-ink)',
            margin: '0 0 12px 0',
            lineHeight: 1,
          }}
        >
          {/* COPYWRITING CONTRACT : exactement "404" */}
          {"404"}
        </h1>

        {/* Sous-titre — Space Mono 11px (UI-SPEC section 13) */}
        <p
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            letterSpacing: '0.05em',
            color: 'var(--color-ink-muted)',
            margin: '0 0 32px 0',
          }}
        >
          {"Cette page n'existe pas."}
        </p>

        {/* Lien retour — Space Mono, teal #5b8e7d (UI-SPEC section 13) */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            letterSpacing: '0.05em',
            color: 'var(--color-teal)',
            textDecoration: 'none',
            // D-03 : pas de coins arrondis, pas de bordure
          }}
        >
          ← Retour à la galerie
        </Link>
      </main>
    </>
  )
}
