'use client'

/**
 * Formulaire de changement de statut d'une œuvre — version compacte inline.
 *
 * POURQUOI useActionState et pas useTransition ?
 * updateArtworkStatus retourne un état { success } ou { error } — useActionState
 * permet d'afficher ce retour sans gérer de state supplémentaire.
 */
import { useActionState } from 'react'

interface StatusChangeFormProps {
  currentStatus: 'available' | 'sold' | 'given' | 'reserved'
  updateStatusAction: (prevState: unknown, formData: FormData) => Promise<{ success: true } | { error: string }>
}

export function StatusChangeForm({ currentStatus, updateStatusAction }: StatusChangeFormProps) {
  const [state, formAction, isPending] = useActionState(updateStatusAction, null)

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          name="status"
          defaultValue={currentStatus}
          style={{
            height: 36,
            padding: '0 32px 0 10px',
            background: "#fff url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23737373' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\") no-repeat right 8px center",
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: 'var(--radius-sm)',
            font: '400 13px var(--font-geist-sans)',
            color: 'var(--color-ink)',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          <option value="available">Disponible</option>
          <option value="sold">Vendu</option>
          <option value="given">Donné</option>
          <option value="reserved">Réservé</option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          style={{
            height: 36,
            padding: '0 12px',
            backgroundColor: isPending ? 'var(--color-ink-muted)' : 'var(--color-ink)',
            color: '#fff',
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isPending ? '…' : 'OK'}
        </button>
      </div>

      {state && 'error' in state && (
        <p role="alert" style={{ fontSize: 12, color: 'var(--color-red)', margin: '4px 0 0', fontFamily: 'var(--font-geist-sans)' }}>
          {state.error}
        </p>
      )}
      {state && 'success' in state && (
        <p role="status" style={{ fontSize: 12, color: 'var(--color-teal)', margin: '4px 0 0', fontFamily: 'var(--font-geist-sans)' }}>
          Statut mis à jour.
        </p>
      )}
    </form>
  )
}
