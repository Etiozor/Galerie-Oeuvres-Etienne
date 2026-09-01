/**
 * Pied de page public — Galerie POF.
 *
 * Contact simple (email) présent sur toutes les pages publiques.
 * Server Component pur — extrait de page.tsx pour être réutilisé
 * (galerie, détail, à propos, profil, frise).
 */
export function SiteFooter() {
  return (
    <footer
      style={{
        position: 'relative',
        zIndex: 1,
        marginTop: 36,
        padding: '28px 24px',
        textAlign: 'center',
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <a
        href="mailto:etienne.le.pironnec.1@gmail.com"
        style={{
          fontFamily: 'var(--font-interface)',
          fontSize: 13,
          color: 'var(--color-ink-muted)',
          textDecoration: 'none',
          letterSpacing: '0.04em',
        }}
      >
        etienne.le.pironnec.1@gmail.com
      </a>
    </footer>
  )
}
