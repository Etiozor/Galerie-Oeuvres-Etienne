'use client'
/**
 * Bouton de suppression d'œuvre avec confirmation AlertDialog.
 *
 * POURQUOI AlertDialog et pas window.confirm ?
 * window.confirm est bloquant et non stylisable. AlertDialog Radix est accessible,
 * stylisable, et respecte D-03 (zéro border-radius).
 *
 * POURQUOI startTransition et pas useActionState ?
 * deleteArtwork utilise redirect() — incompatible avec useActionState qui attend
 * une valeur de retour. startTransition gère l'état pending sans attendre de valeur.
 * [Pitfall documenté : RESEARCH.md]
 *
 * Sécurité : le dialog est une UX guard, pas une security guard. La Server Action
 * deleteArtwork re-vérifie la session côté serveur avant toute suppression (T-05-01-04).
 *
 * Design : borderRadius: 0 sur TOUS les éléments (D-03) — y compris AlertDialogContent,
 * AlertDialogAction, AlertDialogCancel et le bouton trigger.
 */
import { useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DeleteArtworkButtonProps {
  /** Server Action bindée avec artworkId depuis le Server Component parent */
  deleteAction: () => Promise<{ error: string } | never>
}

/**
 * Bouton déclenchant un AlertDialog de confirmation avant la suppression définitive.
 * Désactivé pendant l'opération pour éviter les doubles clics.
 */
export function DeleteArtworkButton({ deleteAction }: DeleteArtworkButtonProps) {
  const [isPending, startTransition] = useTransition()

  /**
   * Déclenche la suppression via startTransition.
   * POURQUOI startTransition ? deleteArtwork appelle redirect() — la valeur de retour
   * n'est jamais visible. startTransition permet d'afficher isPending correctement.
   */
  function handleDelete() {
    startTransition(async () => {
      await deleteAction()
      // redirect('/admin/artworks') est appelé depuis la Server Action
      // Next.js intercepte cet appel et redirige automatiquement
    })
  }

  return (
    <AlertDialog>
      {/* Bouton trigger — ouvre la modale de confirmation */}
      <AlertDialogTrigger asChild>
        <button
          disabled={isPending}
          style={{
            height: '44px',
            padding: '0 20px',
            backgroundColor: '#bc4b51',  // Rouge destructif — UI-SPEC.md
            color: '#ffffff',
            fontFamily: 'var(--font-geist-sans)',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderRadius: 0,  // D-03 : zéro coins arrondis
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Suppression…' : 'Supprimer l\'œuvre'}
        </button>
      </AlertDialogTrigger>

      {/* borderRadius: 0 sur AlertDialogContent — D-03 override le style shadcn par défaut */}
      <AlertDialogContent style={{ borderRadius: 0 }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l&apos;œuvre ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. L&apos;œuvre, ses images et toutes les offres
            associées seront supprimées définitivement.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Annuler — ferme la modale sans aucune action */}
          <AlertDialogCancel style={{ borderRadius: 0 }}>
            Annuler
          </AlertDialogCancel>

          {/* Confirmer — déclenche la suppression effective */}
          <AlertDialogAction
            onClick={handleDelete}
            style={{
              backgroundColor: '#bc4b51',
              color: '#ffffff',
              borderRadius: 0,  // D-03 : zéro coins arrondis
            }}
          >
            {isPending ? 'Suppression…' : 'Supprimer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
