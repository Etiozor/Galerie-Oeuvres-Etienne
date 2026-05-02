/**
 * Navigation globale du site public — Galerie POF.
 *
 * Visible sur toutes les pages publiques (galerie, détail, à propos).
 * Deux liens en Phase 3 : GALERIE (/) et À PROPOS (/about).
 *
 * Specs UI-SPEC section 2 :
 * - Hauteur 56px (touch target minimum 44px, avec padding)
 * - Fond surface #ede0b8
 * - Logo Oswald 18px uppercase #1a1a1a
 * - Liens Space Mono 11px uppercase #5a5244
 * - Sticky top-0 pour rester visible au scroll
 * - D-03 : zéro coins arrondis, aucune ombre
 *
 * Phase 4 ajoutera le surlignage du lien actif.
 */
import Link from 'next/link'

export function SiteNav() {
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

      {/* Liens de navigation — Space Mono uppercase (D-02) */}
      <div style={{ display: 'flex', gap: '24px' }}>
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
      </div>
    </nav>
  )
}
