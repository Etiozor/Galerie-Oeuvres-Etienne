/**
 * Bouton "Réessayer le traitement" — affiché uniquement pour les œuvres en FAILED.
 *
 * POURQUOI 'use client' ?
 * Le bouton a un état de chargement (isPending pendant le retry) et appelle
 * une Server Action — nécessitent useTransition côté client.
 *
 * POURQUOI useTransition et pas useState ?
 * useTransition marque la Server Action comme une transition non-bloquante.
 * React maintient l'UI interactive pendant le traitement asynchrone.
 * isPending est fourni directement par le hook — pas besoin de gérer un
 * état boolean manuellement.
 *
 * POURQUOI router.refresh() après retryPipeline() ?
 * La Server Action met à jour la DB (état PROCESSING ou FAILED de nouveau).
 * router.refresh() force le Server Component parent à se re-rendre avec
 * les données fraîches — les badges se mettent à jour automatiquement.
 */
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { retryPipeline } from '@/actions/pipeline'

interface RetryButtonProps {
  /** ID de l'œuvre à retraiter */
  artworkId: number
}

/**
 * Bouton client qui relance retryPipeline() et rafraîchit la liste.
 * Affiché uniquement quand pipelineState === 'failed'.
 */
export function RetryButton({ artworkId }: RetryButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRetry() {
    startTransition(async () => {
      // Relancer le pipeline sur l'original stocké (D-09)
      await retryPipeline(artworkId)
      // Rafraîchir la page pour voir le nouvel état (PROCESSING ou FAILED de nouveau)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleRetry}
      disabled={isPending}
      aria-label="Réessayer le traitement du pipeline pour cette œuvre"
      style={{
        padding: '6px 14px',
        backgroundColor: isPending ? '#737373' : '#fef2f2',
        color: isPending ? '#ffffff' : '#dc2626',
        border: '1px solid #dc262622',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: isPending ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {isPending ? 'En cours…' : 'Réessayer le traitement'}
    </button>
  )
}
