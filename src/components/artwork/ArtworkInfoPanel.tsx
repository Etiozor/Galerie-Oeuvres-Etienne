/**
 * Panel d'informations de la page détail d'une œuvre — Galerie POF.
 *
 * Contenu dans la colonne droite (420px) du layout 2 colonnes desktop.
 * Suit l'ordre de lecture vertical défini dans UI-SPEC section 9 :
 *   1. Badge statut (ArtworkStatusBadge)
 *   2. Titre — Oswald 32px, uppercase (D-02)
 *   3. Année — Space Mono 12px, muted
 *   4. Séparateur horizontal
 *   5. Méta-grille (2 colonnes) : technique, médium, format, prix de base
 *   6. Séparateur
 *   7. Description — Cormorant Garamond 17px italic (D-02)
 *   8. Section offres (placeholder Phase 3 — câblée en Phase 4)
 *   9. Navigation précédent/suivant (ArtworkNav)
 *
 * PLACEHOLDER OFFRES (Phase 3) :
 * Le bouton "Faire une offre" est affiché mais désactivé (disabled).
 * Il sera fonctionnel en Phase 4 (profils visiteurs + offres).
 * Ce choix évite un composant vide — le visiteur comprend la fonctionnalité à venir.
 */
import Link from 'next/link'
import { ArtworkStatusBadge } from './ArtworkStatusBadge'
import { ArtworkNav } from './ArtworkNav'
import { PriceBreakdown } from './PriceBreakdown'
import { OfferSection } from './OfferSection'
import { OfferHistory } from './OfferHistory'
import type { PriceBreakdownData } from '@/db/schema'
import type { OfferHistoryItem } from './OfferHistory'

/** Données minimales pour les liens de navigation */
interface ArtworkNavItem {
  id: number
  title: string
}

interface ArtworkInfoPanelProps {
  title: string
  status: string
  createdDate: Date | null
  widthCm: string | null
  heightCm: string | null
  description: string | null
  typeName: string | null
  mediumName: string | null
  basePrice: string | null
  prev: ArtworkNavItem | null
  next: ArtworkNavItem | null
  /**
   * ID du visiteur identifié — undefined si le visiteur n'a pas de session active.
   * Transmis depuis la page détail qui lit le cookie côté serveur. [AUTH-02]
   * SÉCURITÉ : on ne transmet jamais le téléphone côté client — uniquement l'ID. [T-04-01-06]
   */
  visitorId?: number
  /**
   * Pseudo du visiteur affiché dans le panel si une session est active.
   * Vient de la session iron-session, pas de la DB (évite un aller-retour inutile).
   */
  visitorName?: string
  /**
   * Décomposition du prix de base — 6 facteurs expliqués au visiteur (MARKET-01).
   * undefined ou null = ne pas afficher PriceBreakdown.
   * Renseignée par l'artiste via l'admin (Phase 5) — affichage Phase 4.
   */
  priceBreakdown?: PriceBreakdownData | null
  /**
   * ID de l'œuvre — nécessaire pour submitOffer dans OfferSection/OfferForm.
   * Passé à OfferSection qui le transmet à OfferForm via un champ caché.
   */
  artworkId: number
  /**
   * Nombre total d'offres reçues pour cette œuvre.
   * Si 0 → OfferHistory retourne null (pas de section vide).
   * Calculé via COUNT() côté serveur dans page.tsx.
   */
  offerCount: number
  /**
   * Meilleure offre (MAX(amount)) en string Drizzle ou null.
   * Calculé côté serveur — le client ne peut pas manipuler cette valeur (T-04-04-06).
   * Affiché dans le résumé OfferHistory sans opt-in.
   */
  bestOffer: string | null
  /**
   * Liste complète des offres pour l'historique opt-in.
   * Chargée côté serveur, passée en prop pour éviter un round-trip au toggle (RESEARCH.md Pattern 5).
   * Ne contient JAMAIS le numéro de téléphone du visiteur (T-04-04-01).
   */
  allOffers: OfferHistoryItem[]
}

/**
 * Séparateur horizontal réutilisé entre les sections du panel.
 * Couleur: --color-ink-muted à opacity 0.3 (UI-SPEC section 9).
 */
function Separator() {
  return (
    <div
      style={{
        height: '1px',
        backgroundColor: 'var(--color-ink-muted)',
        opacity: 0.3,
        margin: '16px 0',
      }}
    />
  )
}

/**
 * Ligne de méta-données (label + valeur) dans la grille de métadonnées.
 * POURQUOI dt/dd ?
 * Sémantique correcte pour une liste de définitions (terme + description).
 * Meilleure accessibilité et SEO qu'un grid de <span>.
 */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          color: 'var(--color-ink)',
          margin: 0,
        }}
      >
        {value}
      </dd>
    </>
  )
}

export function ArtworkInfoPanel({
  title,
  status,
  createdDate,
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
  priceBreakdown, // Ajouté dans ce plan (04-02)
  artworkId,      // Ajouté dans ce plan (04-03) — nécessaire pour OfferSection
  offerCount,     // Ajouté dans ce plan (04-04) — nombre total d'offres
  bestOffer,      // Ajouté dans ce plan (04-04) — meilleure offre pour le résumé
  allOffers,      // Ajouté dans ce plan (04-04) — liste complète pour l'opt-in
}: ArtworkInfoPanelProps) {
  // Extraire l'année depuis la date de création de l'œuvre
  const year = createdDate ? new Date(createdDate).getFullYear() : null

  // Formater les dimensions — widthCm/heightCm sont des strings numeric de Drizzle
  // parseFloat() supprime les zéros trailing (ex: "30.0" → "30")
  const dimensions =
    widthCm && heightCm
      ? `${parseFloat(widthCm)} × ${parseFloat(heightCm)} cm`
      : null

  // Formater le prix — basePrice est une string numeric de Drizzle (ex: "1500.00")
  const formattedPrice = basePrice
    ? `${parseFloat(basePrice).toLocaleString('fr-FR')} €`
    : null

  return (
    <div>
      {/* 0. Lien retour vers la galerie — toujours visible en haut du panel */}
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          letterSpacing: '0.05em',
          color: 'var(--color-teal)',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '16px',
        }}
      >
        ← Galerie
      </Link>

      {/* 1. Badge statut — même composant que dans la grille masonry */}
      <ArtworkStatusBadge status={status} />

      {/* 2. Titre — Oswald 32px, weight 700, uppercase, letter-spacing 0.05em (D-02, UI-SPEC) */}
      <h1
        style={{
          fontFamily: 'var(--font-oswald)',
          fontSize: '32px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-ink)',
          margin: '12px 0 4px 0',
          lineHeight: 1.1,
          // D-03 : pas de margin-bottom arrondi — on utilise des valeurs exactes
        }}
      >
        {title}
      </h1>

      {/* 3. Année — Space Mono 12px, --color-ink-muted (UI-SPEC section 9) */}
      {year && (
        <p
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '12px',
            color: 'var(--color-ink-muted)',
            margin: 0,
          }}
        >
          {year}
        </p>
      )}

      {/* 4. Séparateur */}
      <Separator />

      {/* 5. Méta-grille (2 colonnes) — technique, médium, format, prix de base */}
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 8px',
          margin: 0,
        }}
      >
        {typeName && <MetaRow label="Technique" value={typeName} />}
        {mediumName && <MetaRow label="Médium" value={mediumName} />}
        {dimensions && <MetaRow label="Format" value={dimensions} />}
        {formattedPrice && <MetaRow label="Prix de base" value={formattedPrice} />}
      </dl>

      {/* 5.5 Décomposition du prix de base (MARKET-01 — Plan 04-02) */}
      {/* Affiché uniquement si l'artiste a renseigné au moins un facteur */}
      {/* POURQUOI après la méta-grille ? L'ordre de lecture logique est : */}
      {/* titre → date → technique/médium/format/prix → comment ce prix a été calculé → description */}
      {priceBreakdown && (
        <>
          <Separator />
          <PriceBreakdown data={priceBreakdown} />
        </>
      )}

      {/* 6. Séparateur — affiché uniquement si une description suit */}
      {description && <Separator />}

      {/* 7. Description — Cormorant Garamond 17px italic (D-02, UI-SPEC section 9) */}
      {description && (
        <p
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic',
            fontSize: '17px',
            color: 'var(--color-ink)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}

      {/* 8. Section offres — historique + formulaire (Plan 04-04) */}
      {/*
       * COMPOSITION DE LA SECTION OFFRES :
       * a. OfferHistory — résumé toujours visible + liste opt-in (Client Component)
       *    Affiché dès qu'il y a au moins 1 offre, même si l'œuvre n'est plus disponible.
       *    POURQUOI même pour les œuvres vendues/données ?
       *    Le visiteur peut voir l'historique des offres pour une œuvre passée —
       *    transparence sur le marché de l'artiste.
       *
       * b. OfferSection — formulaire de soumission (Client Component)
       *    Affiché UNIQUEMENT si l'œuvre est encore disponible (status === 'available').
       *    Contient VisitorProfileModal et OfferForm.
       *
       * PATTERN Server+Client (D-13) :
       * ArtworkInfoPanel (Server) délègue l'interactivité à des Client Components.
       * Le SSR du panel (titre, description, méta) est préservé.
       */}
      {(status === 'available' || offerCount > 0) && (
        <>
          <Separator />

          {/* Résumé des offres — visible pour toutes les œuvres ayant reçu des offres */}
          {/* OfferHistory retourne null si offerCount === 0 — pas de section vide */}
          <OfferHistory
            offerCount={offerCount}
            bestOffer={bestOffer}
            allOffers={allOffers}
          />

          {/* Formulaire d'offre — uniquement si l'œuvre est encore disponible */}
          {status === 'available' && (
            <OfferSection
              visitorId={visitorId}
              visitorName={visitorName}
              artworkId={artworkId}
              basePrice={basePrice}
              status={status}
            />
          )}
        </>
      )}

      {/* 9. Navigation précédent/suivant (UI-SPEC section 10, D-17) */}
      <ArtworkNav prev={prev} next={next} />
    </div>
  )
}
