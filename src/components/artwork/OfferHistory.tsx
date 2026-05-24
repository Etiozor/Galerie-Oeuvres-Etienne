'use client'

/**
 * Historique des offres en opt-in — Variante A "Cartel de musée".
 *
 * NOUVEAU TOGGLE ROW (design) :
 * → Bouton pleine largeur : "{N} offre(s) reçue(s) · Meilleure {montant}" + ↓/↑
 * → Badge jaune "Meilleure" sur la première ligne de la liste
 * → Message et date par offre
 *
 * DÉCISION (CLAUDE.md, MARKET-04) :
 * - Résumé TOUJOURS visible : nombre + meilleure offre
 * - Liste complète en OPT-IN (évite l'ancrage des prix à la baisse)
 *
 * D-03 : aucun border-radius.
 * SÉCURITÉ (T-04-04-01) : aucun numéro de téléphone dans le rendu.
 */

import { useState } from 'react'

export interface OfferHistoryItem {
  id: number
  amount: string
  message: string | null
  visitorName: string
  createdAt: Date
}

interface OfferHistoryProps {
  offerCount: number
  bestOffer: string | null
  allOffers: OfferHistoryItem[]
}

export function OfferHistory({ offerCount, bestOffer, allOffers }: OfferHistoryProps) {
  const [showAll, setShowAll] = useState(false)

  if (offerCount === 0) return null

  const plural = offerCount > 1
  const bestFormatted = bestOffer
    ? parseFloat(bestOffer).toLocaleString('fr-FR') + ' €'
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toggle row pleine largeur */}
      <button
        type="button"
        onClick={() => setShowAll(v => !v)}
        style={{
          background: 'transparent',
          border: 0,
          padding: '8px 0',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          width: '100%',
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
          {offerCount} offre{plural ? 's' : ''} reçue{plural ? 's' : ''}
          {bestFormatted && (
            <>
              {' · '}Meilleure&nbsp;
              <span style={{ color: 'var(--color-ink)', fontWeight: 700 }}>
                {bestFormatted}
              </span>
            </>
          )}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '13px',
            color: 'var(--color-ink-muted)',
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {showAll ? '↑' : '↓'}
        </span>
      </button>

      {/* Liste complète — visible uniquement après opt-in */}
      {showAll && (
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {allOffers.map((offer, i) => (
            <li
              key={offer.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {/* Nom + badge "Meilleure" + montant */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-geist-sans)',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--color-ink)',
                  }}
                >
                  {offer.visitorName}
                  {/* Badge jaune "Meilleure" sur la première offre */}
                  {i === 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: '1px 6px',
                        background: 'var(--color-yellow)',
                        fontFamily: 'var(--font-space-mono)',
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--color-ink)',
                        fontWeight: 600,
                      }}
                    >
                      Meilleure
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontWeight: 700,
                    fontSize: '14px',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--color-ink)',
                  }}
                >
                  {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                </span>
              </div>

              {/* Message optionnel — italic Cormorant */}
              {offer.message && (
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-cormorant)',
                    fontStyle: 'italic',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  « {offer.message} »
                </p>
              )}

              {/* Date — Space Mono 11px */}
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.05em',
                  color: 'var(--color-ink-muted)',
                }}
              >
                {new Date(offer.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
