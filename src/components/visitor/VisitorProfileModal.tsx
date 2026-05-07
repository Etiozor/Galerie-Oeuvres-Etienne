'use client'

/**
 * Modal d'identification visiteur — Galerie POF.
 *
 * POURQUOI 'use client' ?
 * Ce composant contient un formulaire interactif avec état géré par useActionState.
 * Les Server Components ne peuvent pas utiliser de hooks React (useState, useEffect, etc.).
 * Le formulaire doit réagir aux erreurs retournées par la Server Action côté client.
 *
 * POURQUOI useActionState et pas useState + fetch ?
 * useActionState est le pattern officiel Next.js 15 / React 19 pour les Server Actions.
 * - Gère automatiquement l'état pending (bouton disabled pendant l'envoi)
 * - Reçoit directement le résultat de la Server Action (erreurs, succès)
 * - useFormState est déprécié depuis React 19 — useActionState est le successeur [RESEARCH.md]
 *
 * POURQUOI pas de bibliothèque de dialog (Radix Dialog, etc.) ?
 * La spec UI-SPEC (D-03) impose zéro border-radius sur tous les éléments.
 * Les composants de bibliothèque injectent souvent des styles par défaut difficiles à
 * écraser complètement. Un dialog custom en <div> donne un contrôle total. [D-03]
 */

import { useActionState, useEffect } from 'react'
import { createOrLoginVisitor } from '@/actions/visitor'

// ── Props du composant ───────────────────────────────────────────────────────

interface VisitorProfileModalProps {
  /** Contrôle l'affichage du modal — true = visible, false = masqué */
  isOpen: boolean
  /** Appelé quand le visiteur ferme le modal (croix, clic overlay, ou succès) */
  onClose: () => void
  /**
   * Callback optionnel appelé après une identification réussie.
   * Permet au parent de rafraîchir l'UI (ex: afficher "Identifié en tant que...").
   * POURQUOI optionnel ? Le modal fonctionne de façon autonome même sans callback.
   */
  onSuccess?: () => void
}

// ── Composant ────────────────────────────────────────────────────────────────

/**
 * Modal d'identification légère pour les visiteurs.
 *
 * Le visiteur saisit un pseudo et un numéro de téléphone E.164.
 * La Server Action createOrLoginVisitor gère l'upsert DB + le cookie de session.
 * Pas de mot de passe — le téléphone est l'identifiant unique (AUTH-02, AUTH-03).
 */
export function VisitorProfileModal({
  isOpen,
  onClose,
  onSuccess,
}: VisitorProfileModalProps) {
  /**
   * useActionState remplace le couple useState + handleSubmit classique.
   * - formAction : fonction à passer à <form action={...}>
   * - state : résultat retourné par createOrLoginVisitor ({ success, errors })
   * - isPending : true pendant l'envoi de la Server Action (pour désactiver le bouton)
   *
   * Le state initial est null (aucune soumission encore).
   */
  const [state, formAction, isPending] = useActionState(createOrLoginVisitor, null)

  /**
   * Effet déclenché quand state?.success === true.
   * POURQUOI useEffect et pas un if dans le rendu ?
   * Les callbacks (onSuccess, onClose) sont des effets de bord — ils ne doivent pas
   * être appelés directement dans le rendu JSX pour éviter les re-renders infinis.
   */
  useEffect(() => {
    if (state && 'success' in state && state.success === true) {
      onSuccess?.()
      onClose()
    }
  }, [state, onSuccess, onClose])

  // Si le modal est fermé, ne rien rendre du tout (pas de DOM inutile)
  if (!isOpen) return null

  return (
    /**
     * Overlay plein écran semi-transparent.
     * - position fixed + inset 0 : couvre toute la fenêtre sans décaler le scroll
     * - z-index 50 : au-dessus du contenu de la page (SiteNav est à z-index 10)
     * - backdrop-filter blur : flou Gaussian sur le contenu derrière (effet vitré)
     * - Clic sur l'overlay = fermer le modal
     */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Identification visiteur"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(26, 26, 26, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/*
       * Panel dialog.
       * stopPropagation : empêche le clic sur le panel de fermer le modal.
       * D-03 : AUCUN border-radius sur le panel.
       */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: '32px 24px 24px',
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          // D-03 : pas de border-radius
        }}
      >
        {/* Croix de fermeture — en haut à droite du panel */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-space-mono)',
            fontSize: '16px',
            color: 'var(--color-ink-muted)',
            // D-03 : pas de border-radius
            padding: '4px 8px',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Titre du modal — Oswald uppercase (D-02) */}
        <h2
          style={{
            fontFamily: 'var(--font-oswald)',
            fontSize: '20px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-ink)',
            margin: '0 0 20px 0',
          }}
        >
          S'identifier pour faire une offre
        </h2>

        {/*
         * Texte informatif sur l'identification.
         * POURQUOI ce texte ? Rassurer le visiteur : pas de mot de passe,
         * le téléphone suffit pour retrouver son compte lors de sa prochaine visite.
         */}
        <p
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            color: 'var(--color-ink-muted)',
            lineHeight: 1.5,
            margin: '0 0 20px 0',
          }}
        >
          Votre numéro de téléphone est votre identifiant.
          Si vous avez déjà fait une offre, entrez le même numéro pour retrouver votre profil.
        </p>

        {/*
         * Afficher les erreurs globales (erreur serveur, etc.)
         * Ces erreurs sont dans state?.errors?._form (pas liées à un champ spécifique).
         */}
        {state && !state.success && state.errors?._form && (
          <div
            role="alert"
            style={{
              backgroundColor: 'rgba(220, 50, 50, 0.1)',
              border: '1px solid rgba(220, 50, 50, 0.4)',
              padding: '8px 12px',
              marginBottom: '16px',
              // D-03 : pas de border-radius
            }}
          >
            {state.errors._form.map((err, i) => (
              <p
                key={i}
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '11px',
                  color: 'rgb(200, 50, 50)',
                  margin: 0,
                }}
              >
                {err}
              </p>
            ))}
          </div>
        )}

        {/* Formulaire — action={formAction} pour useActionState */}
        <form action={formAction}>
          {/* ── Champ : Nom ou pseudo ─────────────────────────────────── */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="displayName"
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Votre nom ou pseudo
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              autoComplete="name"
              placeholder="Ex : Sophie M."
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                fontFamily: 'var(--font-space-mono)',
                fontSize: '13px',
                color: 'var(--color-ink)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-ink-muted)',
                // D-03 : pas de border-radius
                boxSizing: 'border-box',
              }}
            />
            {/* Erreur Zod sur le champ displayName */}
            {state && !state.success && state.errors?.displayName && (
              <p
                role="alert"
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '11px',
                  color: 'rgb(200, 50, 50)',
                  margin: '4px 0 0 0',
                }}
              >
                {state.errors.displayName[0]}
              </p>
            )}
          </div>

          {/* ── Champ : Téléphone (E.164 requis) ─────────────────────── */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="phone"
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Téléphone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+33612345678"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                fontFamily: 'var(--font-space-mono)',
                fontSize: '13px',
                color: 'var(--color-ink)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-ink-muted)',
                // D-03 : pas de border-radius
                boxSizing: 'border-box',
              }}
            />
            {/* Label explicatif sous le champ — format E.164 requis */}
            <p
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '10px',
                color: 'var(--color-ink-muted)',
                margin: '4px 0 0 0',
              }}
            >
              Format international requis : +33 pour la France, +32 pour la Belgique, etc.
            </p>
            {/* Erreur Zod sur le champ phone */}
            {state && !state.success && state.errors?.phone && (
              <p
                role="alert"
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: '11px',
                  color: 'rgb(200, 50, 50)',
                  margin: '4px 0 0 0',
                }}
              >
                {state.errors.phone[0]}
              </p>
            )}
          </div>

          {/* ── Champ : Email (optionnel) ─────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="email"
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Email (optionnel)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="sophie@exemple.fr"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                fontFamily: 'var(--font-space-mono)',
                fontSize: '13px',
                color: 'var(--color-ink)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-ink-muted)',
                // D-03 : pas de border-radius
                boxSizing: 'border-box',
              }}
            />
            {/* Label explicatif — pourquoi demander l'email */}
            <p
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '10px',
                color: 'var(--color-ink-muted)',
                margin: '4px 0 0 0',
              }}
            >
              Pour recevoir une réponse de l'artiste si votre offre est retenue.
            </p>
          </div>

          {/*
           * Bouton submit "S'identifier".
           * - height 44px : taille minimum recommandée pour l'accessibilité tactile
           * - background var(--color-orange) : couleur d'action principale (UI-SPEC)
           * - disabled pendant isPending : empêche la double soumission
           * - D-03 : pas de border-radius
           */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: isPending ? 'var(--color-ink-muted)' : 'var(--color-orange)',
              color: 'var(--color-ink)',
              fontFamily: 'var(--font-oswald)',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
              // D-03 : pas de border-radius
              transition: 'background-color 0.15s ease',
            }}
          >
            {isPending ? 'Identification...' : "S'identifier"}
          </button>
        </form>
      </div>
    </div>
  )
}
