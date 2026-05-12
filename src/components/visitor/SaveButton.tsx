'use client'
/**
 * Bouton cœur pour enregistrer/retirer une œuvre des favoris.
 *
 * POURQUOI un Client Component ?
 * L'état toggle (cœur plein / vide) est mis à jour optimistiquement côté client
 * via useState — pas de rechargement de page. La Server Action confirme en DB
 * via startTransition pour ne pas bloquer l'UI pendant la requête réseau.
 *
 * VISIBLE uniquement si le visiteur est connecté — la condition est dans la page
 * parente (/artworks/[id]/page.tsx) : {session.visitorId && <SaveButton />} (D-14).
 *
 * ACCESSIBILITÉ :
 * - aria-label décrit l'action (pas l'état) : "Retirer des enregistrements" / "Enregistrer l'œuvre"
 * - disabled + opacity 0.6 pendant le chargement (isPending)
 *
 * DESIGN (D-03) : borderRadius: 0 — pas de border-radius dans la galerie POF.
 */
import { useState, useTransition } from 'react'
import { toggleSavedArtwork } from '@/actions/savedArtworks'

// ── Props ────────────────────────────────────────────────────────────────────

interface SaveButtonProps {
  /** ID de l'œuvre à basculer dans les favoris */
  artworkId: number
  /** État initial du favori, lu côté serveur depuis saved_artworks (D-14) */
  initialSaved: boolean
}

// ── Composant ────────────────────────────────────────────────────────────────

/**
 * Bouton toggle favori avec mise à jour optimiste.
 *
 * Logique :
 * 1. Clic → setIsSaved (optimiste) + startTransition(toggleSavedArtwork)
 * 2. Si succès → setIsSaved(result.saved) pour synchroniser avec la réponse serveur
 * 3. Si erreur → revenir à l'état précédent (rollback optimiste)
 */
export function SaveButton({ artworkId, initialSaved }: SaveButtonProps) {
  // État local du favori — initialisé depuis le Server Component parent
  const [isSaved, setIsSaved] = useState(initialSaved)
  // isPending = true pendant l'appel à la Server Action
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    // ── Mise à jour optimiste : l'UI répond immédiatement ────────────────
    const previousState = isSaved
    setIsSaved(prev => !prev)

    startTransition(async () => {
      const result = await toggleSavedArtwork(artworkId)

      if (result.success) {
        // ── Synchroniser avec la réponse serveur (état canonique) ─────────
        // POURQUOI re-synchroniser ? L'état optimiste peut diverger si deux
        // onglets togglent simultanément. On prend l'état serveur comme référence.
        setIsSaved(result.saved)
      } else {
        // ── Rollback en cas d'erreur ──────────────────────────────────────
        // Remettre l'état précédent pour indiquer que l'action a échoué
        setIsSaved(previousState)
        // Note : une notification d'erreur pourrait être ajoutée ici en v2
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isSaved ? 'Retirer des enregistrements' : "Enregistrer l'œuvre"}
      title={isSaved ? 'Retirer des enregistrements' : "Enregistrer l'œuvre"}
      style={{
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isSaved ? 'var(--color-ink)' : 'transparent',
        border: '1px solid var(--color-ink)',
        borderRadius: 0,  // D-03 : pas de border-radius dans la galerie POF
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        transition: 'background-color 0.15s ease, opacity 0.15s ease',
        flexShrink: 0,
      }}
    >
      {/*
       * ♥ plein si enregistré, ♡ vide sinon.
       * POURQUOI Unicode et pas une bibliothèque d'icônes ?
       * Évite une dépendance supplémentaire pour deux caractères.
       * Les caractères Unicode sont rendus nativement par tous les navigateurs.
       */}
      <span style={{
        fontSize: '16px',
        color: isSaved ? '#ffffff' : 'var(--color-ink)',
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {isSaved ? '♥' : '♡'}
      </span>
    </button>
  )
}
