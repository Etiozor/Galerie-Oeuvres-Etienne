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
import type { PriceBreakdownData } from '@/db/schema'

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

      {/* 8. Section offres — câblage session visiteur (Plan 04-01) */}
      {status === 'available' && (
        <>
          <Separator />

          {/*
           * Bloc informatif teal — 1px solid teal, padding 12px (UI-SPEC section 9).
           * Affiche l'état d'identification du visiteur ou l'invitation à faire une offre.
           */}
          <div
            style={{
              border: '1px solid var(--color-teal)',
              padding: '12px',
              marginBottom: '12px',
              // D-03 : pas de border-radius
            }}
          >
            {visitorId !== undefined ? (
              /*
               * Visiteur identifié — afficher son pseudo.
               * POURQUOI Space Mono teal ? Cohérence avec les labels de méta-données.
               * Le pseudo est lu depuis la session iron-session (pas de requête DB).
               */
              <p
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '11px',
                  color: 'var(--color-teal)',
                  margin: 0,
                }}
              >
                Identifié en tant que{' '}
                <strong>{visitorName ?? 'Visiteur'}</strong>
              </p>
            ) : (
              /*
               * Visiteur non identifié — invitation à s'identifier pour faire une offre.
               * Placeholder Phase 3 : le nombre réel d'offres sera affiché en Plan 04-03.
               */
              <p
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '12px',
                  color: 'var(--color-ink)',
                  margin: 0,
                }}
              >
                Soyez le premier à faire une offre.
              </p>
            )}
          </div>

          {/*
           * Bouton "Faire une offre".
           * - Si visiteur identifié : bouton actif (le formulaire d'offre sera câblé en 04-03)
           * - Si visiteur non identifié : bouton disabled (le modal sera ouvert en 04-03)
           *
           * DÉCISION WAVE 1 : le bouton reste disabled pour les deux états.
           * 04-01 et 04-02 touchent tous deux artworks/[id]/page.tsx en Wave 1.
           * Le câblage du VisitorProfileModal est reporté en Plan 04-03 (Wave 2)
           * pour éviter un conflit de merge sur ce fichier.
           *
           * TODO Phase 04-03 : câbler VisitorProfileModal ici
           * - Si visitorId undefined → ouvrir VisitorProfileModal au clic
           * - Si visitorId défini → ouvrir le formulaire d'offre
           */}
          <button
            disabled
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: 'var(--color-orange)',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-oswald)',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: 'none',
              cursor: 'not-allowed',
              opacity: 0.9,
              // D-03 : pas de border-radius
            }}
          >
            Faire une offre
          </button>
        </>
      )}

      {/* 9. Navigation précédent/suivant (UI-SPEC section 10, D-17) */}
      <ArtworkNav prev={prev} next={next} />
    </div>
  )
}
