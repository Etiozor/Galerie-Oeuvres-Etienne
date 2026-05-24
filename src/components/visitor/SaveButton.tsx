'use client'

/**
 * Bouton cœur pour enregistrer/retirer une œuvre des favoris — Galerie POF.
 *
 * TOUJOURS VISIBLE — indépendamment de l'état d'identification du visiteur.
 * (Décision design Variante A : le cœur "ne doit plus être perdu".)
 *
 * DEUX COMPORTEMENTS SELON L'ÉTAT D'IDENTIFICATION :
 * 1. Visiteur NON identifié (visitorId undefined) :
 *    → Affiche ♡ + "Enregistrer", clic ouvre VisitorProfileModal.
 *    → Après identification, revalidatePath() rerend la page avec visitorId défini.
 *
 * 2. Visiteur identifié (visitorId défini) :
 *    → Mise à jour optimiste ♡/♥ via toggleSavedArtwork Server Action.
 *    → Toast implicite via le changement visuel immédiat.
 *
 * DESIGN (Variante A "Cartel de musée") :
 * - Inline-flex : texte "Enregistrer"/"Enregistrée" (Space Mono 11px) + glyph ♡/♥ (28px)
 * - Texte et cœur rouges quand enregistré, muted/ink quand non enregistré
 * - D-03 : pas de border-radius
 */

import { useState, useTransition } from 'react'
import { toggleSavedArtwork } from '@/actions/savedArtworks'
import { VisitorProfileModal } from '@/components/visitor/VisitorProfileModal'

interface SaveButtonProps {
  /** ID de l'œuvre à basculer dans les favoris */
  artworkId: number
  /** État initial lu côté serveur — false si visiteur non identifié */
  initialSaved: boolean
  /**
   * ID du visiteur identifié — undefined si pas de session active.
   * Quand undefined : clic ouvre VisitorProfileModal au lieu de toggleSavedArtwork.
   */
  visitorId?: number
  /** Mode icône seul — masque le label texte (usage dans la galerie masonry) */
  iconOnly?: boolean
  /** Couleur du cœur non rempli — défaut var(--color-ink), utiliser '#fff' sur fond sombre */
  heartColor?: string
}

export function SaveButton({ artworkId, initialSaved, visitorId, iconOnly, heartColor }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()
  // Modal d'identification — ouvert quand le visiteur clique sans être identifié
  const [isModalOpen, setIsModalOpen] = useState(false)

  function handleToggle() {
    if (visitorId === undefined) {
      // Visiteur non identifié → ouvrir le modal d'identification
      setIsModalOpen(true)
      return
    }

    // Visiteur identifié → mise à jour optimiste
    const previousState = isSaved
    setIsSaved(prev => !prev)

    startTransition(async () => {
      const result = await toggleSavedArtwork(artworkId)
      if (result.success) {
        setIsSaved(result.saved)
      } else {
        setIsSaved(previousState)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-label={isSaved ? 'Retirer des enregistrements' : "Enregistrer l'œuvre"}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 0,
          padding: 4,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.6 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Label texte — masqué en mode iconOnly (galerie masonry) */}
        {!iconOnly && (
          <span
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isSaved ? 'var(--color-red)' : 'var(--color-ink-muted)',
              transition: 'color 0.15s ease',
            }}
          >
            {isSaved ? 'Enregistrée' : 'Enregistrer'}
          </span>
        )}

        {/* Glyph cœur */}
        <span
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontSize: iconOnly ? '22px' : '28px',
            lineHeight: 1,
            color: isSaved ? 'var(--color-red)' : (heartColor ?? 'var(--color-ink)'),
            transform: isSaved ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.15s ease, color 0.15s ease',
            userSelect: 'none',
          }}
        >
          {isSaved ? '♥' : '♡'}
        </span>
      </button>

      {/* Modal d'identification — déclenché uniquement pour les visiteurs non identifiés */}
      <VisitorProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
