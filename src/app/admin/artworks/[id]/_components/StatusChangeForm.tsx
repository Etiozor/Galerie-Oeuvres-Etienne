'use client'
/**
 * Formulaire de changement de statut d'une œuvre.
 *
 * POURQUOI un Client Component ?
 * useActionState nécessite un hook React — impossible dans un Server Component.
 * La Server Action updateArtworkStatus est bindée avec artworkId dans le parent
 * pour ne jamais exposer l'ID en input caché côté client (T-05-01-01).
 *
 * POURQUOI useActionState et pas useTransition ?
 * updateArtworkStatus retourne un état { success } ou { error } — useActionState
 * permet d'afficher ce retour sans gérer de state supplémentaire.
 * deleteArtwork utilise redirect() → doit utiliser startTransition (dans DeleteArtworkButton).
 *
 * Design : inline styles cohérents avec l'admin, D-03 = borderRadius: 0 partout.
 */
import { useActionState } from 'react'

interface StatusChangeFormProps {
  /** Statut courant de l'œuvre — pré-remplit le <select> */
  currentStatus: 'available' | 'sold' | 'given' | 'reserved'
  /** Server Action bindée avec artworkId depuis le Server Component parent */
  updateStatusAction: (prevState: unknown, formData: FormData) => Promise<{ success: true } | { error: string }>
}

// Libellés affichés pour chaque statut — copywriting conforme UI-SPEC.md Phase 5
const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  sold: 'Vendu',
  given: 'Donné',
  reserved: 'Réservé',
}

/**
 * Formulaire select + bouton pour changer le statut d'une œuvre.
 * Affiche un message d'erreur ou de confirmation après soumission.
 */
export function StatusChangeForm({ currentStatus, updateStatusAction }: StatusChangeFormProps) {
  // useActionState : gère le state du formulaire sans useState manuel
  // null = aucune soumission encore
  const [state, formAction, isPending] = useActionState(updateStatusAction, null)

  return (
    <form action={formAction}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label
          htmlFor="status-select"
          style={{
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'var(--font-geist-sans)',
            color: '#171717',
          }}
        >
          Statut
        </label>

        {/* <select> natif — pas de Tailwind, inline styles cohérents avec l'admin */}
        <select
          id="status-select"
          name="status"
          defaultValue={currentStatus}
          style={{
            height: '40px',
            padding: '0 12px',
            fontFamily: 'var(--font-geist-sans)',
            fontSize: '14px',
            color: '#171717',
            backgroundColor: '#ffffff',
            border: '1px solid #d4d4d4',
            borderRadius: 0,  // D-03 : zéro coins arrondis
            cursor: 'pointer',
          }}
        >
          <option value="available">{STATUS_LABELS.available}</option>
          <option value="sold">{STATUS_LABELS.sold}</option>
          <option value="given">{STATUS_LABELS.given}</option>
          <option value="reserved">{STATUS_LABELS.reserved}</option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          style={{
            height: '40px',
            padding: '0 16px',
            backgroundColor: isPending ? '#a3a3a3' : '#171717',
            color: '#ffffff',
            fontFamily: 'var(--font-geist-sans)',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderRadius: 0,  // D-03 : zéro coins arrondis
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Enregistrement…' : 'Enregistrer le statut'}
        </button>
      </div>

      {/* Message d'erreur si la Server Action retourne une erreur */}
      {state && 'error' in state && (
        <p
          role="alert"
          style={{
            fontSize: '14px',
            color: '#bc4b51',
            marginTop: '8px',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {state.error}
        </p>
      )}

      {/* Confirmation de succès */}
      {state && 'success' in state && (
        <p
          role="status"
          style={{
            fontSize: '14px',
            color: '#5b8e7d',
            marginTop: '8px',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          Statut mis à jour.
        </p>
      )}
    </form>
  )
}
