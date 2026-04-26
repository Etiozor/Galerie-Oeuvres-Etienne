/**
 * Composant client des boutons de validation.
 *
 * POURQUOI 'use client' ?
 * 1. Les boutons ont un état de chargement (useTransition) — nécessite React client
 * 2. La modale AlertDialog ("Rejeter") a un état local (open/closed) — côté client
 *
 * POURQUOI useTransition plutôt que useState(loading) ?
 * React 19 recommande useTransition pour marquer les Server Action calls comme
 * des transitions non-bloquantes. isPending est dérivé du hook, pas d'un boolean manuel.
 *
 * Copywriting : EXACTEMENT celui de UI-SPEC.md section "Écran de validation"
 * Ne pas modifier les textes de bouton sans mettre à jour UI-SPEC.md.
 */
'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
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

/** Props reçues depuis le Server Component parent avec les actions bindées */
interface ValidationActionsProps {
  /** Server Action pour approuver la version traitée (PIPE-04) */
  approveAction: () => Promise<{ error?: string } | void>
  /** Server Action pour publier l'original sans correction (PIPE-05) */
  publishRawAction: () => Promise<{ error?: string } | void>
  /** Server Action pour rejeter et supprimer l'œuvre */
  rejectAction: () => Promise<{ error?: string } | void>
}

/**
 * Groupe de 3 boutons de validation avec états de chargement et modale de confirmation.
 *
 * Layout vertical (mobile-first) avec maxWidth pour éviter des boutons trop larges
 * sur desktop (contraste avec les grandes images côte à côte).
 */
export function ValidationActions({
  approveAction,
  publishRawAction,
  rejectAction,
}: ValidationActionsProps) {
  const [isPending, startTransition] = useTransition()
  // Suivi de l'action active pour afficher le bon spinner sur le bon bouton
  const [activeAction, setActiveAction] = useState<'approve' | 'raw' | 'reject' | null>(null)

  /** Déclenche l'approbation de la version traitée par Sharp */
  function handleApprove() {
    setActiveAction('approve')
    startTransition(async () => {
      await approveAction()
      setActiveAction(null)
    })
  }

  /** Déclenche la publication de l'image originale (sans correction) */
  function handlePublishRaw() {
    setActiveAction('raw')
    startTransition(async () => {
      await publishRawAction()
      setActiveAction(null)
    })
  }

  /** Déclenche le rejet de l'œuvre (appelé depuis la modale de confirmation) */
  function handleReject() {
    setActiveAction('reject')
    startTransition(async () => {
      await rejectAction()
      setActiveAction(null)
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
      }}
    >
      {/* ── Bouton 1 : Approuver la correction (CTA primaire) ── */}
      {/* UI-SPEC : fond #171717, texte blanc, minHeight 44px (WCAG 2.5.5) */}
      <Button
        onClick={handleApprove}
        disabled={isPending}
        aria-label="Approuver la correction et publier la version améliorée par le pipeline"
        style={{
          minHeight: '44px',     // WCAG 2.5.5 : cible tactile minimum pour mobile
          backgroundColor: '#171717',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: 600,
        }}
      >
        {isPending && activeAction === 'approve' ? 'En cours…' : 'Approuver la correction'}
      </Button>
      {/* Sous-titre descriptif — UI-SPEC "Description Bouton 1" */}
      <p style={{ fontSize: '14px', color: '#737373', margin: '-4px 0 4px 0' }}>
        Publier la version améliorée par le pipeline
      </p>

      {/* ── Bouton 2 : Publier l'original (secondaire outline) ── */}
      {/* UI-SPEC : variant outline, minHeight 44px */}
      <Button
        variant="outline"
        onClick={handlePublishRaw}
        disabled={isPending}
        aria-label="Publier la photo telle qu'elle a été prise, sans correction"
        style={{ minHeight: '44px', fontSize: '16px', fontWeight: 600 }}
      >
        {isPending && activeAction === 'raw' ? 'En cours…' : "Publier l'original"}
      </Button>
      {/* Sous-titre descriptif — UI-SPEC "Description Bouton 2" */}
      <p style={{ fontSize: '14px', color: '#737373', margin: '-4px 0 4px 0' }}>
        Publier la photo telle qu&apos;elle a été prise
      </p>

      {/* ── Bouton 3 : Rejeter avec modale de confirmation (destructif) ── */}
      {/* UI-SPEC D-04 : ouvre AlertDialog avant de déclencher l'action */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            disabled={isPending}
            aria-label="Rejeter cette œuvre — ouvre une confirmation avant suppression définitive"
            style={{ minHeight: '44px', fontSize: '16px', fontWeight: 600 }}
          >
            Rejeter
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            {/* Copywriting EXACT de UI-SPEC.md — ne pas modifier ces textes */}
            <AlertDialogTitle>Supprimer cette œuvre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L&apos;image originale et toutes les variantes seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Bouton annulation — ferme la modale sans action */}
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            {/* Bouton confirmation — déclenche l'action de rejet */}
            <AlertDialogAction
              onClick={handleReject}
              style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
            >
              {isPending && activeAction === 'reject' ? 'En cours…' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Sous-titre descriptif — UI-SPEC "Description Bouton 3" */}
      <p style={{ fontSize: '14px', color: '#737373', margin: '-4px 0 0 0' }}>
        Supprimer cette entrée définitivement
      </p>
    </div>
  )
}
