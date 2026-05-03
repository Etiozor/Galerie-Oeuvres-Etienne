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

      {/* 8. Section offres — placeholder Phase 3 (fonctionnel en Phase 4) */}
      {status === 'available' && (
        <>
          <Separator />

          {/* Bloc informatif teal — 1px solid teal, padding 12px (UI-SPEC section 9) */}
          <div
            style={{
              border: '1px solid var(--color-teal)',
              padding: '12px',
              marginBottom: '12px',
              // D-03 : pas de border-radius
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '12px',
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              {/*
               * Placeholder Phase 3 : le nombre réel d'offres et la meilleure offre
               * seront affichés en Phase 4 (profils visiteurs + offres).
               */}
              Soyez le premier à faire une offre.
            </p>
          </div>

          {/*
           * Bouton "Faire une offre" — orange #f4a259, Oswald 14px uppercase, 44px hauteur.
           * DÉSACTIVÉ en Phase 3 : fonctionnalité câblée en Phase 4.
           * Affiché quand même pour que le visiteur comprenne la proposition de valeur.
           * D-03 : pas de border-radius.
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
              cursor: 'not-allowed', // Non fonctionnel — Phase 4
              opacity: 0.9,
              // D-03 : pas de border-radius
            }}
            title="Fonctionnalité disponible bientôt — Phase 4"
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
