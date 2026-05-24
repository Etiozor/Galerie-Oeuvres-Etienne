'use client'

/**
 * Bloc prix avec décomposition collapsible — Variante A "Cartel de musée".
 *
 * POURQUOI 'use client' ?
 * Le toggle "Voir le détail du prix ↓" utilise useState — côté client uniquement.
 *
 * ACCENT VISUEL :
 * Bordure gauche 3px teal quand l'œuvre est disponible (guide l'œil vers le prix).
 * Grisée (rgba) pour les autres statuts — le prix reste lisible mais moins accentué.
 */

import { useState } from 'react'
import type { PriceBreakdownData } from '@/db/schema'

interface PriceBlockProps {
  /** Prix de base en string numeric Drizzle (ex: "1200.00") */
  basePrice: string | null
  /** Statut de l'œuvre — détermine la couleur de la bordure gauche */
  status: string
  /** Données de décomposition du prix — null = pas de toggle affiché */
  priceBreakdown: PriceBreakdownData | null
}

export function PriceBlock({ basePrice, status, priceBreakdown }: PriceBlockProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (!basePrice) return null

  const formattedPrice = parseFloat(basePrice).toLocaleString('fr-FR') + ' €'

  // Construire les lignes de décomposition (uniquement les valeurs non-null)
  const rows: { label: string; display: string }[] = []

  if (priceBreakdown) {
    if (priceBreakdown.priceHoursSpent !== null)
      rows.push({ label: 'Temps de travail', display: `+${parseFloat(priceBreakdown.priceHoursSpent).toLocaleString('fr-FR')} €` })
    if (priceBreakdown.priceFormat !== null)
      rows.push({ label: 'Format', display: `+${parseFloat(priceBreakdown.priceFormat).toLocaleString('fr-FR')} €` })
    if (priceBreakdown.priceFraming !== null)
      rows.push({
        label: 'Encadrement',
        display: parseFloat(priceBreakdown.priceFraming) === 0
          ? 'Inclus'
          : `+${parseFloat(priceBreakdown.priceFraming).toLocaleString('fr-FR')} €`,
      })
    if (priceBreakdown.priceMaterials !== null)
      rows.push({ label: 'Matériaux', display: `+${parseFloat(priceBreakdown.priceMaterials).toLocaleString('fr-FR')} €` })
    if (priceBreakdown.priceTechnicality !== null)
      rows.push({ label: 'Complexité technique', display: `${priceBreakdown.priceTechnicality}/5` })
    if (priceBreakdown.priceAttachment !== null)
      rows.push({ label: 'Attachement', display: `${priceBreakdown.priceAttachment}/5` })
  }

  const hasBreakdown = rows.length > 0

  return (
    <div
      style={{
        paddingLeft: 14,
        borderLeft: `3px solid ${status === 'available' ? 'var(--color-teal)' : 'rgba(0,0,0,0.15)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Ligne principale : label + montant */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          Prix de base
        </span>
        <span
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontWeight: 700,
            fontSize: '28px',
            color: 'var(--color-ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formattedPrice}
        </span>
      </div>

      {/* Toggle breakdown — uniquement si des données existent */}
      {hasBreakdown && (
        <button
          onClick={() => setShowBreakdown(v => !v)}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          {showBreakdown ? 'Masquer le détail ↑' : 'Voir le détail du prix ↓'}
        </button>
      )}

      {/* Lignes de décomposition — visibles uniquement après clic */}
      {showBreakdown && (
        <ul
          style={{
            margin: '6px 0 0',
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {rows.map((row) => (
            <li
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                columnGap: 12,
                alignItems: 'baseline',
                fontFamily: 'var(--font-geist-sans)',
                fontSize: '13px',
                lineHeight: 1.3,
                color: 'var(--color-ink)',
              }}
            >
              <span>{row.label}</span>
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontWeight: 600,
                  fontSize: '13px',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-ink-muted)',
                }}
              >
                {row.display}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
