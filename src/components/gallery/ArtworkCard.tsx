'use client'
/**
 * Carte vignette d'une œuvre dans la galerie masonry.
 *
 * Deux modes :
 * - onOpen fourni → clic ouvre la lightbox (GalleryClient)
 * - onOpen absent → clic navigue vers /artworks/{id} (Link standard)
 *
 * POURQUOI thumbnailUrl en prop ? Piège 5 : getStorage() = node:fs.
 * POURQUOI 'use client' ? Nécessaire pour importer SaveButton (cœur de favori au survol).
 */
import Link from 'next/link'
import { SaveButton } from '@/components/visitor/SaveButton'

/**
 * Badge de statut — pastille teintée en haut à gauche de la carte (design de réf.).
 * available → aucun badge. reserved/sold/given → pastille de la teinte correspondante.
 */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; bc: string; fg: string; label: string } | null> = {
    available: null,
    reserved: { bg: 'var(--tint-warning-bg)',  bc: 'var(--tint-warning-bc)',  fg: 'var(--color-warning-ink)',  label: 'Réservé' },
    sold:     { bg: 'var(--tint-critical-bg)', bc: 'var(--tint-critical-bc)', fg: 'var(--color-critical-ink)', label: 'Vendu'   },
    given:    { bg: 'var(--tint-success-bg)',  bc: 'var(--tint-success-bc)',  fg: 'var(--color-success-ink)',  label: 'Donné'   },
  }
  const c = cfg[status]
  if (!c) return null
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute', top: 10, left: 10, zIndex: 2,
        display: 'inline-block',
        fontFamily: 'var(--font-interface)', fontWeight: 600, fontSize: 11,
        letterSpacing: '0.09em', textTransform: 'uppercase',
        padding: '4px 8px', borderRadius: 'var(--radius-sm)',
        border: `1px solid ${c.bc}`, background: c.bg, color: c.fg,
        whiteSpace: 'nowrap',
      }}
    >{c.label}</span>
  )
}

interface ArtworkCardProps {
  id: number
  title: string
  status: string
  thumbnailUrl: string | null
  widthCmNum: number
  heightCmNum: number
  typeName: string | null
  mediumName: string | null
  basePriceNum: number
  onOpen?: (id: number) => void
  /** ID du visiteur connecté — undefined si non identifié */
  visitorId?: number
  /** État initial du favori (lu côté serveur) */
  initialSaved?: boolean
}

export function ArtworkCard({
  id,
  title,
  status,
  thumbnailUrl,
  widthCmNum,
  heightCmNum,
  mediumName,
  basePriceNum,
  onOpen,
  visitorId,
  initialSaved = false,
}: ArtworkCardProps) {
  const visual = (
    <div style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={title}
          loading="lazy"
          style={{
            width: '100%', height: 'auto', display: 'block',
            borderRadius: 'var(--radius-sm)',
          }}
        />
      ) : (
        <div style={{
          width: '100%', aspectRatio: `${widthCmNum} / ${heightCmNum}`,
          backgroundColor: 'var(--color-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
        }}>
          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', color: 'var(--color-ink-muted)' }}>
            Image à venir
          </span>
        </div>
      )}

      <StatusBadge status={status} />

      <div className="artwork-overlay" style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(26,26,26,0.78) 0%, rgba(26,26,26,0.45) 55%, rgba(26,26,26,0) 100%)',
        color: '#fff',
        opacity: 0,
        transition: 'opacity 200ms ease',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '14px 16px',
      }}>
        {/* Bouton cœur — top-right, stopPropagation pour ne pas déclencher le clic de la carte */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <SaveButton
            artworkId={id}
            initialSaved={initialSaved}
            visitorId={visitorId}
            iconOnly
            heartColor="rgba(255,255,255,0.85)"
          />
        </div>

        <div style={{
          fontFamily: 'var(--font-oswald)', fontSize: '15px', fontWeight: 600,
          lineHeight: 1.15, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', letterSpacing: '0.08em', opacity: 0.78, textTransform: 'uppercase' }}>
            {mediumName ?? ''} · {widthCmNum}×{heightCmNum}
          </span>
          {basePriceNum > 0 && (
            <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {basePriceNum.toLocaleString('fr-FR')} €
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (onOpen) {
    return (
      <div
        className="artwork-card"
        onClick={() => onOpen(id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen(id)}
        style={{
          breakInside: 'avoid', marginBottom: '20px', width: '100%',
          position: 'relative', zIndex: 1,
          borderRadius: 'var(--radius-sm)', overflow: 'hidden',
          cursor: 'pointer', outline: 'none',
        }}
      >
        {visual}
      </div>
    )
  }

  return (
    <div className="artwork-card" style={{
      breakInside: 'avoid', marginBottom: '20px', width: '100%',
      position: 'relative', zIndex: 1,
      borderRadius: 'var(--radius-sm)', overflow: 'hidden',
    }}>
      <Link href={`/artworks/${id}`} style={{ textDecoration: 'none', display: 'block' }}>
        {visual}
      </Link>
    </div>
  )
}
