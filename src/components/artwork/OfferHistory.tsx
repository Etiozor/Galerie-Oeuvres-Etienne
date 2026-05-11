'use client'

/**
 * Composant OfferHistory — historique des offres en opt-in.
 *
 * POURQUOI 'use client' ?
 * Le toggle "Voir toutes les offres" utilise useState — la seule raison d'être
 * un Client Component. Le reste du panel (titre, description, méta-grille) reste
 * en Server Component. C'est le pattern "composition Server+Client" de Next.js 15.
 *
 * DÉCISION DESIGN (CLAUDE.md, MARKET-04) :
 * - Résumé TOUJOURS visible : nombre d'offres + meilleure offre
 *   → Indique l'intérêt pour l'œuvre sans bloquer l'accès
 * - Liste complète en OPT-IN uniquement (clic sur bouton)
 *   → Évite l'ancrage des prix à la baisse (si un visiteur voit "600 €", il sera
 *     influencé vers ce montant plutôt que vers sa propre estimation)
 *
 * D-03 : aucun border-radius dans ce composant — coins droits partout.
 * SÉCURITÉ (T-04-04-01) : aucun numéro de téléphone dans le rendu.
 *   Le type OfferHistoryItem ne contient QUE displayName — jamais phone.
 */

import { useState } from 'react'

// ── Types exportés ────────────────────────────────────────────────────────────

/**
 * Données d'une offre individuelle pour l'historique côté visiteur.
 *
 * SÉCURITÉ CRITIQUE : ce type NE CONTIENT PAS le numéro de téléphone.
 * - visitorName = visitors.displayName uniquement (piège 4 RESEARCH.md)
 * - Le téléphone est reservé à l'email privé artiste (sendNewOfferEmail)
 *   et ne doit JAMAIS passer dans des props côté client (T-04-04-01)
 */
export interface OfferHistoryItem {
  id: number
  amount: string          // String numeric Drizzle — ex: "850.00"
  message: string | null
  visitorName: string     // visitors.displayName uniquement — JAMAIS visitors.phone
  createdAt: Date
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface OfferHistoryProps {
  /**
   * Nombre total d'offres pour cette œuvre.
   * Si 0 → le composant retourne null (pas de section vide).
   */
  offerCount: number
  /**
   * Meilleure offre (MAX(amount)) en string Drizzle ou null.
   * Calculé côté serveur via MAX() — le client ne peut pas manipuler cette valeur.
   * Affiché dans le résumé sans opt-in.
   */
  bestOffer: string | null
  /**
   * Liste complète des offres triées par montant décroissant.
   * Chargée côté serveur (Server Component page.tsx), passée en prop.
   *
   * POURQUOI charger toute la liste même si elle est cachée ?
   * Le toggle est côté client (useState) — pas de round-trip réseau au clic.
   * Pour de nombreuses offres (>100), envisager la pagination en Phase 5.
   * [RESEARCH.md Pattern 5]
   */
  allOffers: OfferHistoryItem[]
}

// ── Composant ─────────────────────────────────────────────────────────────────

/**
 * Affiche un résumé des offres pour une œuvre avec historique en opt-in.
 *
 * États :
 * - offerCount === 0 → null (pas de section à vide)
 * - showAll === false → résumé + bouton "Voir toutes les offres"
 * - showAll === true → résumé + liste complète (bouton masqué)
 */
export function OfferHistory({ offerCount, bestOffer, allOffers }: OfferHistoryProps) {
  // État local du toggle — false par défaut (opt-in, MARKET-04)
  const [showAll, setShowAll] = useState(false)

  // ── Garde : aucune offre → ne pas rendre la section ──────────────────────
  // POURQUOI return null ? Une section vide "0 offre" serait confuse et laide.
  // Le composant s'auto-supprime si aucune offre n'existe.
  if (offerCount === 0) {
    return null
  }

  // ── Formatage du résumé ───────────────────────────────────────────────────
  // Singulier/pluriel en français : "1 offre" ou "3 offres"
  const offerLabel = offerCount > 1 ? `${offerCount} offres` : `${offerCount} offre`

  // Meilleure offre formatée en euros (format français : 1 234 €)
  // parseFloat() pour supprimer les zéros trailing (ex: "850.00" → 850)
  const bestOfferFormatted = bestOffer
    ? ` · Meilleure : ${parseFloat(bestOffer).toLocaleString('fr-FR')} €`
    : ''

  return (
    <div
      style={{
        // D-03 : pas de border-radius — coins droits
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* ── a. Résumé TOUJOURS visible (MARKET-04) ──────────────────────── */}
      {/*
       * POURQUOI la meilleure offre est-elle visible sans clic ?
       * Elle indique l'intérêt pour l'œuvre et donne une référence de valeur
       * sans révéler les montants individuels (qui créeraient un effet d'ancrage).
       * Le visiteur sait "quelqu'un a offert 850 €" mais pas "3 personnes ont offert
       * 850, 750 et 600 €" — ce qui le découragerait de proposer plus.
       */}
      <p
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '12px',
          color: 'var(--color-ink)',
          margin: 0,
          // D-03 : pas de border-radius
        }}
      >
        <span>{offerLabel}</span>
        {bestOffer && <span>{bestOfferFormatted}</span>}
      </p>

      {/* ── b. Bouton opt-in — visible uniquement si la liste est fermée ── */}
      {/*
       * POURQUOI opt-in et pas affiché par défaut ?
       * Si un visiteur voit "Marie Dupont — 600 €", il sera influencé vers ce montant.
       * En cachant les montants individuels, chaque visiteur estime la valeur
       * de l'œuvre indépendamment. C'est une décision éthique pour protéger
       * l'artiste et les acheteurs potentiels. (CLAUDE.md)
       */}
      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            // Apparence : lien texte, pas de bouton classique
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            color: 'var(--color-teal)',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            padding: '0',
            cursor: 'pointer',
            // D-03 : pas de border-radius
            // Touch target minimum 44px (CLAUDE.md WCAG)
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            textAlign: 'left',
          }}
        >
          Voir toutes les offres
        </button>
      )}

      {/* ── c. Liste complète — visible uniquement après opt-in ─────────── */}
      {showAll && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            // D-03 : pas de border-radius sur la liste
          }}
        >
          {allOffers.map((offer) => (
            <li
              key={offer.id}
              style={{
                borderTop: '1px solid rgba(var(--color-ink-rgb, 26,26,26), 0.1)',
                paddingTop: '8px',
                // D-03 : pas de border-radius — coins droits
              }}
            >
              {/* Nom du visiteur + montant — sur la même ligne */}
              {/*
               * SÉCURITÉ (T-04-04-01) : on affiche UNIQUEMENT visitorName.
               * Le numéro de téléphone (visitors.phone) n'est pas dans OfferHistoryItem
               * et ne doit JAMAIS figurer ici — données personnelles, canal public.
               */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '8px',
                }}
              >
                {/* displayName — en gras pour identifier rapidement l'offrant */}
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                  }}
                >
                  {offer.visitorName}
                </span>

                {/* Montant formaté en euros (format français) */}
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '12px',
                    color: 'var(--color-ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                </span>
              </div>

              {/* Message optionnel du visiteur — en italique Cormorant */}
              {offer.message && (
                <p
                  style={{
                    fontFamily: 'var(--font-cormorant)',
                    fontStyle: 'italic',
                    fontSize: '14px',
                    color: 'var(--color-ink)',
                    margin: '4px 0 0 0',
                    lineHeight: 1.4,
                    // D-03 : pas de border-radius
                  }}
                >
                  {offer.message}
                </p>
              )}

              {/* Date de l'offre — Space Mono 10px, couleur muted */}
              <p
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '10px',
                  color: 'var(--color-ink-muted)',
                  margin: '4px 0 0 0',
                }}
              >
                {new Date(offer.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
