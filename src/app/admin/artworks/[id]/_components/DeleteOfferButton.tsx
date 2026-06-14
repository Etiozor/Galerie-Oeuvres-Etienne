'use client'

/**
 * Bouton de suppression d'offre avec confirmation — interface admin.
 *
 * POURQUOI un composant client séparé ?
 * La page admin /admin/artworks/[id] est un Server Component. Les event handlers
 * onClick ne peuvent pas être définis dans un Server Component — il faut un Client Component.
 *
 * POURQUOI useTransition et pas useActionState ?
 * deleteOfferAsAdmin retourne { success } | { error } — pas d'état de formulaire complexe.
 * useTransition suffit pour gérer isPending et appeler la Server Action.
 *
 * Design D-03 : borderRadius: 0 sur tous les éléments.
 */

import { useTransition } from 'react'

interface DeleteOfferButtonProps {
  /** Server Action bindée avec offerId depuis le Server Component parent */
  deleteAction: () => Promise<{ success: true } | { error: string }>
}

/**
 * Bouton rouge compact avec confirmation window.confirm avant suppression.
 * Désactivé pendant l'opération pour éviter les doubles clics.
 */
export function DeleteOfferButton({ deleteAction }: DeleteOfferButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    // Confirmation simple avant suppression définitive
    if (!confirm('Supprimer cette offre définitivement ?')) return

    startTransition(async () => {
      const result = await deleteAction()
      if ('error' in result) {
        alert(result.error)
      }
      // En cas de succès, revalidatePath() dans la Server Action rafraîchit la page
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      style={{
        padding: '4px 10px',
        background: isPending ? 'rgba(188,75,81,0.5)' : '#bc4b51',
        color: '#ffffff',
        border: 'none',
        borderRadius: 0,  // D-03 : zéro coins arrondis
        fontFamily: 'var(--font-geist-sans)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: isPending ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s ease',
      }}
    >
      {isPending ? '…' : 'Supprimer'}
    </button>
  )
}
