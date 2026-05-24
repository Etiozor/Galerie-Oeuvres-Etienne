/**
 * Navigation précédent/suivant entre les œuvres publiées — Variante A.
 *
 * Format deux lignes (design "Cartel de musée") :
 *   Ligne 1 : "← Précédent" / "Suivant →"  (Space Mono 11px uppercase muted)
 *   Ligne 2 : titre de l'œuvre             (Cormorant italic 14px ink)
 *
 * L'ordre chronologique reste inchangé :
 * - "Précédente" = publiée plus récemment (à gauche, ←)
 * - "Suivante"   = publiée moins récemment (à droite, →)
 */
import Link from 'next/link'

interface ArtworkNavItem {
  id: number
  title: string
}

interface ArtworkNavProps {
  prev: ArtworkNavItem | null
  next: ArtworkNavItem | null
}

export function ArtworkNav({ prev, next }: ArtworkNavProps) {
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-space-mono)',
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--color-ink-muted)',
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-cormorant)',
    fontStyle: 'italic',
    fontSize: '14px',
    color: 'var(--color-ink)',
    display: 'block',
    marginTop: 4,
  }

  return (
    <nav
      aria-label="Navigation entre œuvres"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 'auto',
        paddingTop: 18,
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {prev ? (
        <Link
          href={`/artworks/${prev.id}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textDecoration: 'none',
            maxWidth: '48%',
          }}
          title={`Œuvre précédente : ${prev.title}`}
        >
          <span style={labelStyle}>← Précédent</span>
          <span style={titleStyle}>{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link
          href={`/artworks/${next.id}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            textDecoration: 'none',
            textAlign: 'right',
            maxWidth: '48%',
          }}
          title={`Œuvre suivante : ${next.title}`}
        >
          <span style={labelStyle}>Suivant →</span>
          <span style={titleStyle}>{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
