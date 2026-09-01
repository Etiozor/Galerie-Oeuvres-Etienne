'use client'

/**
 * Frise chronologique (Client Component) — Galerie POF.
 *
 * Place les œuvres sur un axe horizontal selon leur date de création.
 * Reprend la logique du prototype « Shell » :
 * - clé = année*12 + (mois-1), positions en % le long de l'axe
 * - graduations d'années réparties sur l'axe
 * - vignettes alternées au-dessus / en-dessous de la ligne
 * - survol : point + carte surlignés
 *
 * Client car le survol (useState) et la navigation au clic sont interactifs.
 * Les données arrivent déjà résolues du serveur (URLs d'images incluses).
 */
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MONTHS_FR } from '@/db/schema'

export interface FriseItem {
  id: number
  title: string
  status: string
  year: number
  month: number
  mediumName: string | null
  widthCmNum: number
  heightCmNum: number
  imageUrl: string | null
}

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-interface)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--color-ink-muted)',
}

/** Vignette d'une œuvre sur la frise (carte carrée + titre + date). */
function ThumbCard({
  item,
  hovered,
}: {
  item: FriseItem & { dateShort: string }
  hovered: boolean
}) {
  return (
    <div
      className="frise-thumb"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 8,
        background: 'var(--color-surface)',
        border: `1px solid ${hovered ? 'var(--color-primary)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: hovered ? '0 2px 16px rgba(26,26,26,0.12)' : 'none',
        transition: 'border-color 160ms, box-shadow 160ms',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: `${item.widthCmNum} / ${item.heightCmNum}`,
          background: 'var(--color-desk)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.2,
          color: 'var(--color-ink)',
          textAlign: 'center',
        }}
      >
        {item.title}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-interface)',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
          textAlign: 'center',
        }}
      >
        {item.dateShort}
      </span>
    </div>
  )
}

export function TimelineClient({ items }: { items: FriseItem[] }) {
  const router = useRouter()
  const [hover, setHover] = useState<number | null>(null)

  const model = useMemo(() => {
    if (items.length === 0) return null
    const key = (a: FriseItem) => a.year * 12 + (a.month - 1)
    const sorted = [...items].sort((a, b) => key(a) - key(b))
    // items.length ≥ 1 ici → premier/dernier sont définis (assertion pour TS strict).
    const first = sorted[0]!
    const last = sorted[sorted.length - 1]!
    const kMin = key(first)
    const kMax = key(last)
    const span = Math.max(1, kMax - kMin)
    const pos = (a: FriseItem) => 6 + ((key(a) - kMin) / span) * 88

    const minYear = first.year
    const maxYear = last.year
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
      const y = minYear + i
      return { label: String(y), pos: 6 + ((y * 12 - kMin) / span) * 88 }
    }).filter((y) => y.pos >= 0 && y.pos <= 100)

    const above: Array<FriseItem & { pos: number; stem: string; dateShort: string }> = []
    const below: typeof above = []
    sorted.forEach((a, i) => {
      const entry = {
        ...a,
        pos: pos(a),
        // Alterne les longueurs de tige pour aérer les vignettes voisines.
        stem: i % 4 === 0 || i % 4 === 1 ? '28px' : '72px',
        dateShort: `${(MONTHS_FR[a.month - 1] ?? '').slice(0, 4)} ${a.year}`,
      }
      ;(i % 2 === 0 ? above : below).push(entry)
    })

    return { sorted, years, above, below, minYear, maxYear }
  }, [items])

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .frise-scroll { overflow-x: hidden; overflow-y: hidden; padding-bottom: 10px; }
        .frise-canvas { position: relative; width: 100%; height: 460px; }
        .frise-thumb { width: 104px; }
        @media (max-width: 768px) {
          .frise-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .frise-canvas { width: 1500px; height: 400px; }
          .frise-thumb { width: 92px; }
        }
      `}</style>

      {/* Hero éditorial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={eyebrow}>
          Chronologie · {items.length} œuvre{items.length !== 1 ? 's' : ''}
          {model ? ` · ${model.minYear} – ${model.maxYear}` : ''}
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 32,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            lineHeight: 1.05,
            color: 'var(--color-ink)',
          }}
        >
          Frise chronologique
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: '52ch',
            fontFamily: 'var(--font-editorial)',
            fontStyle: 'italic',
            fontSize: 18,
            lineHeight: 1.5,
            color: 'var(--color-ink)',
          }}
        >
          Chaque œuvre à sa date de réalisation, de la plus ancienne à la plus récente.
        </p>
      </div>

      {/* Axe */}
      {!model ? (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--color-ink-muted)' }}>
            Aucune œuvre datée pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="frise-scroll">
          <div className="frise-canvas">
            {/* Ligne centrale */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(0,0,0,0.14)' }} />

            {/* Graduations d'années */}
            {model.years.map((y) => (
              <div
                key={y.label}
                style={{
                  position: 'absolute',
                  left: `${y.pos}%`,
                  top: '50%',
                  transform: 'translate(-50%, 0)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 1, height: 10, background: 'rgba(0,0,0,0.2)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-interface)',
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  {y.label}
                </span>
              </div>
            ))}

            {/* Vignettes au-dessus de la ligne */}
            {model.above.map((a) => {
              const hovered = hover === a.id
              return (
                <div
                  key={a.id}
                  onClick={() => router.push(`/artworks/${a.id}`)}
                  onMouseEnter={() => setHover(a.id)}
                  onMouseLeave={() => setHover((h) => (h === a.id ? null : h))}
                  style={{
                    position: 'absolute',
                    left: `${a.pos}%`,
                    bottom: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ThumbCard item={a} hovered={hovered} />
                  <span style={{ width: 1, height: a.stem, background: 'rgba(0,0,0,0.2)' }} />
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: hovered ? 'var(--color-primary)' : 'var(--color-ink)',
                      marginBottom: -5,
                    }}
                  />
                </div>
              )
            })}

            {/* Vignettes en-dessous de la ligne */}
            {model.below.map((a) => {
              const hovered = hover === a.id
              return (
                <div
                  key={a.id}
                  onClick={() => router.push(`/artworks/${a.id}`)}
                  onMouseEnter={() => setHover(a.id)}
                  onMouseLeave={() => setHover((h) => (h === a.id ? null : h))}
                  style={{
                    position: 'absolute',
                    left: `${a.pos}%`,
                    top: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: hovered ? 'var(--color-primary)' : 'var(--color-ink)',
                      marginTop: -5,
                    }}
                  />
                  <span style={{ width: 1, height: a.stem, background: 'rgba(0,0,0,0.2)' }} />
                  <ThumbCard item={a} hovered={hovered} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
