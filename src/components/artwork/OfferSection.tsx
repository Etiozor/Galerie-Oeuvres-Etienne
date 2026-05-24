'use client'

/**
 * Section offres d'achat — Client Component (Variante A "Cartel de musée").
 *
 * DEUX CAS :
 * 1. Visiteur NON identifié → bouton orange "Faire une offre →" unique.
 *    Clic ouvre VisitorProfileModal. Après identification, revalidatePath rerend
 *    la page avec visitorId défini → cas 2.
 *
 * 2. Visiteur identifié → OfferForm directement visible (formulaire inline).
 *
 * POURQUOI un composant séparé (pas dans ArtworkInfoPanel Server Component) ?
 * useState est requis pour contrôler VisitorProfileModal — incompatible avec un
 * Server Component. Seule la section interactive est isolée en Client Component.
 * [Pattern composition Server+Client, D-13]
 *
 * D-03 : AUCUN border-radius.
 */

import { useState } from 'react'
import { OfferForm } from './OfferForm'
import { VisitorProfileModal } from '@/components/visitor/VisitorProfileModal'

interface OfferSectionProps {
  visitorId?: number
  visitorName?: string
  artworkId: number
  basePrice: string | null
  status: string
}

export function OfferSection({
  visitorId,
  visitorName,
  artworkId,
  basePrice,
  status,
}: OfferSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (status !== 'available') return null

  return (
    <>
      {visitorId === undefined ? (
        // ── Cas 1 : Visiteur non identifié — CTA unique ──────────────────────
        <>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              width: '100%',
              minHeight: 48,
              padding: '14px 18px',
              backgroundColor: 'var(--color-orange)',
              color: 'var(--color-ink)',
              border: 0,
              borderRadius: 3,
              fontFamily: 'var(--font-geist-sans)',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
            }}
          >
            <span>Faire une offre</span>
            <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '18px' }}>→</span>
          </button>

          <VisitorProfileModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </>
      ) : (
        // ── Cas 2 : Visiteur identifié — formulaire inline ────────────────────
        <OfferForm
          artworkId={artworkId}
          basePrice={basePrice}
          visitorName={visitorName ?? 'Visiteur'}
        />
      )}
    </>
  )
}
