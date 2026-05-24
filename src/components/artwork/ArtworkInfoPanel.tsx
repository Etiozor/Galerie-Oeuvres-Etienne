/**
 * Panel d'informations de la page détail d'une œuvre — Variante A "Cartel de musée".
 *
 * ORDRE DE LECTURE (design "Cartel de musée") :
 *   1. Header : "Cartel · n°042" (gauche) + SaveButton ♡/♥ (droite)
 *   2. Titre Oswald 30px + règle orange 36px
 *   3. Statut (dot coloré + label) · type · médium · année
 *   4. Description — Cormorant italic 17px
 *   5. Dimensions entre deux hairlines
 *   6. Bloc prix (accent teal 3px gauche) + toggle décomposition
 *   7. CTA "Faire une offre →" ou message statut (non disponible)
 *   8. Toggle historique offres
 *   9. Navigation précédent/suivant
 *
 * Server Component — les parts interactives (SaveButton, PriceBlock,
 * OfferSection, OfferHistory) sont des Client Components importés ici.
 *
 * SÉCURITÉ :
 * - Le téléphone du visiteur n'est jamais transmis au client (T-04-04-01)
 * - saveButton visible pour tous — identité gate gérée dans SaveButton lui-même
 */

import Link from 'next/link'
import { ArtworkNav } from './ArtworkNav'
import { PriceBlock } from './PriceBlock'
import { OfferSection } from './OfferSection'
import { OfferHistory } from './OfferHistory'
import { SaveButton } from '@/components/visitor/SaveButton'
import type { PriceBreakdownData } from '@/db/schema'
import type { OfferHistoryItem } from './OfferHistory'

interface ArtworkNavItem {
  id: number
  title: string
}

/** Couleur du dot de statut */
const STATUS_DOT: Record<string, string> = {
  available: 'var(--color-teal)',
  reserved:  'var(--color-orange)',
  sold:      'var(--color-red)',
  given:     'var(--color-green)',
}

/** Libellé lisible du statut */
const STATUS_LABEL: Record<string, string> = {
  available: 'Disponible',
  reserved:  'Réservé',
  sold:      'Vendu',
  given:     'Donné',
}

/** Couleurs du bloc message quand l'œuvre n'est plus disponible */
const STATUS_MSG_STYLE: Record<string, { bg: string; fg: string; text: string }> = {
  sold:     { bg: 'var(--badge-sold-bg)',     fg: 'var(--badge-sold-fg)',     text: "Cette œuvre a trouvé son acquéreur." },
  reserved: { bg: 'var(--badge-reserved-bg)', fg: 'var(--badge-reserved-fg)', text: "Réservée — l'artiste réfléchit à une offre en cours." },
  given:    { bg: 'var(--badge-given-bg)',     fg: 'var(--badge-given-fg)',     text: "Cette œuvre n'est plus disponible — elle a été donnée." },
}

interface ArtworkInfoPanelProps {
  title: string
  status: string
  /** ID numérique de l'œuvre — affiché dans le cartel "n°042" et passé à SaveButton */
  artworkId: number
  createdYear: number | null
  createdMonth: number | null
  widthCm: string | null
  heightCm: string | null
  description: string | null
  typeName: string | null
  mediumName: string | null
  basePrice: string | null
  prev: ArtworkNavItem | null
  next: ArtworkNavItem | null
  visitorId?: number
  visitorName?: string
  priceBreakdown?: PriceBreakdownData | null
  offerCount: number
  bestOffer: string | null
  allOffers: OfferHistoryItem[]
  /** État initial du favori, calculé côté serveur — false si non identifié */
  initialSaved: boolean
}

export function ArtworkInfoPanel({
  title,
  status,
  artworkId,
  createdYear,
  createdMonth,
  widthCm,
  heightCm,
  description,
  typeName,
  mediumName,
  basePrice,
  prev,
  next,
  visitorId,
  visitorName,
  priceBreakdown,
  offerCount,
  bestOffer,
  allOffers,
  initialSaved,
}: ArtworkInfoPanelProps) {
  // Dimensions formatées — parseFloat supprime les zéros trailing ("30.0" → "30")
  const widthFmt = widthCm ? parseFloat(widthCm).toString() : null
  const heightFmt = heightCm ? parseFloat(heightCm).toString() : null

  // Période de création — "Mars 2024", "2024", ou null si non renseignée
  const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const periodLabel = createdYear
    ? (createdMonth && createdMonth >= 1 && createdMonth <= 12 ? `${MONTHS_FR[createdMonth - 1]} ${createdYear}` : String(createdYear))
    : null

  // Ligne méta : "Peinture · Huile sur toile · Mars 2024"
  const metaParts = [typeName, mediumName, periodLabel].filter(Boolean)
  const metaString = metaParts.join(' · ')

  const dotColor = STATUS_DOT[status] ?? 'var(--color-ink-muted)'
  const statusLabel = STATUS_LABEL[status] ?? status

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        height: '100%',
      }}
    >
      {/* ── 1. Header : cartel n° + bouton ♡ ──────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          Cartel · n°{artworkId.toString().padStart(3, '0')}
        </span>

        {/* SaveButton — toujours visible, identity gate interne */}
        <SaveButton
          artworkId={artworkId}
          initialSaved={initialSaved}
          visitorId={visitorId}
        />
      </div>

      {/* ── 2. Titre + règle orange ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-oswald)',
            fontWeight: 600,
            fontSize: '30px',
            lineHeight: 1.05,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
          }}
        >
          {title}
        </h1>
        {/* Flourish orange — signature visuelle de la Variante A */}
        <span
          aria-hidden="true"
          style={{
            display: 'block',
            width: 36,
            height: 2,
            background: 'var(--color-orange)',
          }}
        />
      </div>

      {/* ── 3. Statut + méta ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Dot coloré */}
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
        {/* Label statut */}
        <span
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--color-ink)',
            letterSpacing: '0.01em',
          }}
        >
          {statusLabel}
        </span>
        {/* Séparateur vertical */}
        {metaString && (
          <>
            <span
              style={{
                width: 1,
                height: 12,
                background: 'rgba(0,0,0,0.18)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
              }}
            >
              {metaString}
            </span>
          </>
        )}
      </div>

      {/* ── 4. Description — Cormorant italic ─────────────────────────────── */}
      {description && (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic',
            fontSize: '17px',
            lineHeight: 1.55,
            color: 'var(--color-ink)',
          }}
        >
          {description}
        </p>
      )}

      {/* ── 5. Dimensions entre hairlines ─────────────────────────────────── */}
      {widthFmt && heightFmt && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-muted)',
            }}
          >
            Dimensions
          </span>
          <span
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontWeight: 600,
              fontSize: '20px',
              color: 'var(--color-ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {widthFmt} × {heightFmt} cm
          </span>
        </div>
      )}

      {/* ── 6. Bloc prix (PriceBlock client) ─────────────────────────────── */}
      {basePrice && (
        <PriceBlock
          basePrice={basePrice}
          status={status}
          priceBreakdown={priceBreakdown ?? null}
        />
      )}

      {/* ── 7. CTA ou message statut ──────────────────────────────────────── */}
      {status === 'available' ? (
        <OfferSection
          visitorId={visitorId}
          visitorName={visitorName}
          artworkId={artworkId}
          basePrice={basePrice}
          status={status}
        />
      ) : (
        /* Message contextuel selon le statut — Cormorant italic */
        STATUS_MSG_STYLE[status] && (
          <div
            style={{
              padding: '14px 16px',
              background: STATUS_MSG_STYLE[status].bg,
              color: STATUS_MSG_STYLE[status].fg,
              fontFamily: 'var(--font-cormorant)',
              fontStyle: 'italic',
              fontSize: '14px',
              lineHeight: 1.4,
              borderRadius: 3,
            }}
          >
            {STATUS_MSG_STYLE[status].text}
          </div>
        )
      )}

      {/* ── 8. Historique offres (toggle) ─────────────────────────────────── */}
      {offerCount > 0 && (
        <OfferHistory
          offerCount={offerCount}
          bestOffer={bestOffer}
          allOffers={allOffers}
        />
      )}

      {/* ── 9. Navigation précédent/suivant ───────────────────────────────── */}
      <ArtworkNav prev={prev} next={next} />
    </div>
  )
}
