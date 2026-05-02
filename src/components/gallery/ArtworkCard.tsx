/**
 * Carte vignette d'une œuvre dans la galerie masonry.
 *
 * POURQUOI break-inside: avoid sur le conteneur racine ?
 * Piège 3 (03-RESEARCH.md) : break-inside doit être sur l'enfant DIRECT
 * du conteneur .masonry-grid. Si on ajoute un wrapper supplémentaire, la
 * propriété doit être sur ce wrapper. Ici, ArtworkCard est directement
 * enfant du .masonry-grid — tout va bien.
 *
 * POURQUOI <img> standard et pas next/image ?
 * Anti-pattern documenté (03-RESEARCH.md) : les URLs /api/uploads/...
 * sont servies par un Route Handler local. next/image nécessiterait une
 * configuration remotePatterns complexe. <img> avec srcSet est suffisant
 * en Phase 3.
 *
 * POURQUOI thumbnailUrl en prop et pas calculé ici ?
 * Piège 5 : getStorage() utilise node:fs — incompatible avec le bundle
 * navigateur. Les URLs sont résolues côté serveur dans page.tsx et
 * passées en props.
 *
 * Specs UI-SPEC section 5 :
 * - Image : aspect-ratio basé sur dimensions réelles (D-07)
 * - Image : max-height 640px, object-fit cover
 * - Overlay : rgba(42,42,42,0.55) + "Voir l'œuvre" Space Mono (D-11)
 * - Info strip : titre Oswald tronqué + badge statut (D-09)
 */
import Link from 'next/link'
import { ArtworkStatusBadge } from '@/components/artwork/ArtworkStatusBadge'

interface ArtworkCardProps {
  id: number
  title: string
  status: string
  thumbnailUrl: string | null
  widthCmNum: number
  heightCmNum: number
}

export function ArtworkCard({
  id,
  title,
  status,
  thumbnailUrl,
  widthCmNum,
  heightCmNum,
}: ArtworkCardProps) {
  return (
    /*
     * break-inside: avoid sur l'élément enfant DIRECT de .masonry-grid.
     * Sans cette propriété, la carte pourrait se couper entre l'image et
     * l'info strip (piège 3 RESEARCH.md).
     */
    <div
      className="artwork-card"
      style={{
        breakInside: 'avoid',
        marginBottom: '2px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Link href={`/artworks/${id}`} style={{ textDecoration: 'none', display: 'block' }}>
        {/* Zone image + overlay hover */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              loading="lazy"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                // D-07 : aspect-ratio calculé depuis les dimensions réelles de l'œuvre
                // Les valeurs numériques sont déjà converties par parseFloat dans page.tsx
                aspectRatio: `${widthCmNum} / ${heightCmNum}`,
                // Évite les œuvres très hautes d'écraser toute la grille
                maxHeight: '640px',
                objectFit: 'cover',
              }}
            />
          ) : (
            // Placeholder si l'image n'est pas encore disponible (ex: thumbnailPath null)
            <div
              style={{
                width: '100%',
                aspectRatio: `${widthCmNum} / ${heightCmNum}`,
                maxHeight: '640px',
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '10px',
                  color: 'var(--color-ink-muted)',
                }}
              >
                Image à venir
              </span>
            </div>
          )}

          {/*
           * Overlay hover desktop (D-11).
           * opacity: 0 par défaut → 1 au survol via CSS globals :
           * .artwork-card:hover .artwork-overlay { opacity: 1 !important; }
           * La transition 0.25s ease est définie ici.
           */}
          <div
            className="artwork-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(42,42,42,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.25s ease',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-space-mono)',
                color: '#f2e8cf',
                textTransform: 'uppercase',
                fontSize: '11px',
                letterSpacing: '0.1em',
              }}
            >
              Voir l&apos;œuvre
            </span>
          </div>
        </div>

        {/* Info strip sous l'image (D-09) : titre tronqué + badge statut */}
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            padding: '6px 8px 4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-oswald)',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {title}
          </span>
          <ArtworkStatusBadge status={status} />
        </div>
      </Link>
    </div>
  )
}
