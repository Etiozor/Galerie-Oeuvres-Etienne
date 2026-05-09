'use client'

/**
 * Section interactive d'offres dans le panel d'une œuvre — Galerie POF.
 *
 * POURQUOI un composant séparé (OfferSection) et pas intégrer dans ArtworkInfoPanel ?
 *
 * ArtworkInfoPanel est un Server Component : il rend le titre, l'année, la méta-grille
 * et la description côté serveur (bon pour le SEO et les performances).
 *
 * La section offres est interactive :
 * - useState pour contrôler l'ouverture du modal (VisitorProfileModal)
 * - useActionState dans OfferForm pour gérer la soumission
 * Un Server Component ne peut pas contenir ces hooks.
 *
 * SOLUTION — Composition Server+Client :
 * ArtworkInfoPanel (Server) importe OfferSection (Client).
 * Seule la section offres est hydratée côté client — le reste du panel reste statique.
 * C'est le pattern recommandé par Next.js 15 pour combiner SSR et interactivité. [D-13]
 *
 * D-03 : AUCUN border-radius sur aucun élément de ce composant.
 */

import { useState } from 'react'
import { OfferForm } from './OfferForm'
import { VisitorProfileModal } from '@/components/visitor/VisitorProfileModal'

// ── Props du composant ───────────────────────────────────────────────────────

interface OfferSectionProps {
  /**
   * ID du visiteur identifié — undefined si pas de session active.
   * Transmis depuis la page détail via ArtworkInfoPanel (lecture session côté serveur).
   */
  visitorId?: number
  /**
   * Pseudo du visiteur — affiché dans OfferForm en confirmation d'identité.
   * undefined si le visiteur n'est pas identifié.
   */
  visitorName?: string
  /** ID de l'œuvre — transmis à OfferForm pour la Server Action submitOffer */
  artworkId: number
  /**
   * Prix de base de l'œuvre — utilisé par OfferForm pour l'avertissement "sous le plancher".
   * null = pas de prix défini → pas d'avertissement.
   */
  basePrice: string | null
  /**
   * Statut de disponibilité de l'œuvre.
   * 'available' = afficher la section offres.
   * Tout autre statut = ne rien afficher (œuvre vendue, donnée, réservée).
   */
  status: string
}

// ── Composant ────────────────────────────────────────────────────────────────

/**
 * Section offres d'achat — Client Component isolant toute l'interactivité.
 *
 * Logique conditionnelle :
 * - status !== 'available' → rien (l'œuvre ne peut pas recevoir d'offres)
 * - status === 'available' et !visitorId → invitation à s'identifier + bouton modal
 * - status === 'available' et visitorId → formulaire d'offre OfferForm
 */
export function OfferSection({
  visitorId,
  visitorName,
  artworkId,
  basePrice,
  status,
}: OfferSectionProps) {
  /**
   * État local pour contrôler l'affichage du modal d'identification.
   * POURQUOI useState ici ? Ce composant est 'use client' — seul Client Component
   * peut utiliser useState. ArtworkInfoPanel (Server) ne peut pas le faire.
   */
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Si l'œuvre n'est pas disponible → ne rien afficher
  // Ce guard est redondant avec celui du parent (ArtworkInfoPanel) mais défensif.
  if (status !== 'available') return null

  return (
    <>
      {visitorId === undefined ? (
        // ── Cas 1 : Visiteur non identifié ──────────────────────────────────
        /*
         * Invitation à s'identifier pour soumettre une offre.
         * Bloc teal avec bouton "S'identifier" → ouvre VisitorProfileModal.
         *
         * POURQUOI ce bloc teal ?
         * Cohérence avec le style informatif utilisé dans le panel (border teal, padding 12px).
         * Le teal est la couleur d'information/invitation dans le design system POF.
         */
        <>
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
                margin: '0 0 8px 0',
                lineHeight: 1.5,
              }}
            >
              Intéressé par cette œuvre ?
            </p>
            <p
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                color: 'var(--color-ink-muted)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Créez un profil gratuit (pseudo + téléphone) pour soumettre une offre d'achat.
            </p>
          </div>

          {/*
           * Bouton "Créer mon profil / S'identifier".
           * - height 44px : touch target minimum (CLAUDE.md)
           * - background orange : couleur d'action principale
           * - Oswald uppercase : typographie des boutons d'action (D-02)
           * - D-03 : pas de border-radius
           * - onClick → ouvre VisitorProfileModal
           */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
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
              cursor: 'pointer',
              // D-03 : pas de border-radius
            }}
          >
            Créer mon profil / S'identifier
          </button>

          {/*
           * Modal d'identification visiteur.
           * isOpen est contrôlé par useState(false) ci-dessus.
           * onClose ferme le modal — onSuccess n'est pas nécessaire ici car
           * la page se revalidera automatiquement via revalidatePath dans createOrLoginVisitor.
           */}
          <VisitorProfileModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </>
      ) : (
        // ── Cas 2 : Visiteur identifié ───────────────────────────────────────
        /*
         * Le formulaire d'offre est affiché directement.
         * OfferForm gère sa propre soumission via useActionState(submitOffer, null).
         * visitorName! : on sait que visitorId est défini donc visitorName est présent
         * (les deux viennent de la même session iron-session — cohérence garantie).
         */
        <OfferForm
          artworkId={artworkId}
          basePrice={basePrice}
          visitorName={visitorName ?? 'Visiteur'}
        />
      )}
    </>
  )
}
