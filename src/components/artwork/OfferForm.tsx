'use client'

/**
 * Formulaire de soumission d'offre — Galerie POF.
 *
 * POURQUOI 'use client' ?
 * Ce composant contient un formulaire interactif :
 * - useActionState : gestion de l'état de soumission (React 19)
 * - useState : valeur du champ montant pour l'avertissement en temps réel
 * - disabled={isPending} : désactiver le bouton pendant l'envoi
 * Un Server Component ne peut pas utiliser ces hooks.
 *
 * POURQUOI useActionState et pas useState + fetch ?
 * useActionState est le pattern officiel Next.js 15 / React 19 pour les Server Actions.
 * Il gère automatiquement l'état pending et reçoit directement le résultat
 * de la Server Action sans passer par une API HTTP séparée. [RESEARCH.md]
 *
 * PLANCHER SOUPLE (décision CLAUDE.md) :
 * L'avertissement "sous le prix de base" est affiché en temps réel pendant la saisie
 * du montant. Il ne bloque PAS la soumission — l'artiste a choisi une approche souple
 * où le visiteur est informé mais reste libre de soumettre son offre.
 *
 * D-03 : AUCUN border-radius sur aucun élément de ce composant.
 */

import { useActionState, useState } from 'react'
import { submitOffer } from '@/actions/offers'

// ── Props du composant ───────────────────────────────────────────────────────

interface OfferFormProps {
  /** ID de l'œuvre — passé en champ caché dans le formulaire */
  artworkId: number
  /**
   * Prix de base de l'œuvre pour l'avertissement "sous le plancher".
   * null = pas de prix de base défini → pas d'avertissement.
   * ATTENTION : ce prix est affiché UNIQUEMENT pour l'avertissement côté client.
   * Le calcul réel de belowFloor se fait côté serveur (T-04-03-02).
   */
  basePrice: string | null
  /** Pseudo du visiteur affiché en confirmation d'identité */
  visitorName: string
}

// ── Composant ────────────────────────────────────────────────────────────────

/**
 * Formulaire d'offre d'achat pour les visiteurs identifiés.
 *
 * Flux utilisateur :
 * 1. Le visiteur saisit un montant (avertissement en temps réel si < basePrice)
 * 2. Il ajoute un message optionnel
 * 3. Il soumet — useActionState envoie le FormData à submitOffer côté serveur
 * 4. En cas de succès : message de confirmation, formulaire masqué
 * 5. En cas d'erreur : erreurs affichées par champ + erreur globale
 */
export function OfferForm({ artworkId, basePrice, visitorName }: OfferFormProps) {
  /**
   * useActionState remplace useState + handleSubmit classique.
   * - formAction : passer à <form action={...}>
   * - state : résultat de submitOffer ({ success, errors, belowFloor } ou null)
   * - isPending : true pendant l'envoi (pour désactiver le bouton)
   */
  const [state, formAction, isPending] = useActionState(submitOffer, null)

  /**
   * État local pour la valeur du champ montant.
   * POURQUOI un état local et pas lire depuis FormData ?
   * On a besoin de la valeur en temps réel pendant la saisie pour comparer
   * avec basePrice et afficher l'avertissement AVANT la soumission.
   * FormData n'est disponible qu'à la soumission — useState nous donne la valeur instantanément.
   */
  const [amountValue, setAmountValue] = useState('')

  // ── Calcul de l'avertissement "sous le plancher" en temps réel ─────────────
  // POURQUOI côté client ici ? C'est uniquement pour l'affichage AVANT la soumission.
  // Le calcul OFFICIEL de belowFloor reste côté serveur dans submitOffer (T-04-03-02).
  // Ce calcul client est redondant (pour l'UX) — la valeur authoritative vient du serveur.
  const parsedAmount = parseFloat(amountValue)
  const parsedBasePrice = basePrice ? parseFloat(basePrice) : null

  // Avertissement : montant valide + prix de base défini + montant sous le plancher
  const showLiveWarning =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedBasePrice !== null &&
    parsedAmount < parsedBasePrice

  // ── Affichage après soumission réussie ──────────────────────────────────────
  // Si la Server Action a retourné { success: true }, masquer le formulaire
  // et afficher un message de confirmation clair.
  if (state?.success === true) {
    return (
      <div
        style={{
          border: '1px solid var(--color-teal)',
          padding: '16px',
          // D-03 : pas de border-radius
        }}
      >
        {/* Message de confirmation principal */}
        <p
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '13px',
            color: 'var(--color-teal)',
            margin: '0 0 8px 0',
            fontWeight: 700,
          }}
        >
          Votre offre a bien été transmise !
        </p>

        {/*
         * Message additionnel si l'offre est sous le prix de base.
         * Cette information vient du serveur (state.belowFloor) — jamais calculée côté client.
         * POURQUOI informer même après coup ? L'artiste voit belowFloor en DB.
         * Informer le visiteur le prépare à une possible contre-proposition.
         */}
        {state.belowFloor && (
          <p
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              color: 'var(--color-ink-muted)',
              margin: 0,
            }}
          >
            Note : votre offre est sous le prix de base de l'artiste.
            Elle sera quand même examinée.
          </p>
        )}
      </div>
    )
  }

  // ── Formulaire principal ─────────────────────────────────────────────────────
  return (
    <form action={formAction}>
      {/* ── Confirmation d'identité ─────────────────────────────────────── */}
      {/*
       * POURQUOI afficher "En tant que {visitorName}" ?
       * Le visiteur doit savoir sous quelle identité il soumet l'offre.
       * Cette information vient de la session iron-session — elle ne peut pas
       * être falsifiée côté client.
       */}
      <p
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          color: 'var(--color-ink-muted)',
          margin: '0 0 16px 0',
        }}
      >
        En tant que{' '}
        <strong style={{ color: 'var(--color-teal)' }}>{visitorName}</strong>
      </p>

      {/* ── Champ caché : artworkId ─────────────────────────────────────── */}
      {/* Transmis à submitOffer pour identifier l'œuvre concernée */}
      <input type="hidden" name="artworkId" value={artworkId} />

      {/* ── Erreur globale (erreur serveur, rate limit, statut œuvre) ─────── */}
      {/*
       * Affiché AU-DESSUS du bouton submit, EN-DESSOUS des champs.
       * state?.errors?._form contient les erreurs non liées à un champ spécifique.
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

      {/* ── Champ : Votre offre (montant en euros) ─────────────────────── */}
      <div style={{ marginBottom: '12px' }}>
        <label
          htmlFor="offer-amount"
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
          Votre offre (€)
        </label>
        <input
          id="offer-amount"
          name="amount"
          type="number"
          min={1}
          step={1}
          required
          placeholder="Ex : 250"
          value={amountValue}
          onChange={(e) => setAmountValue(e.target.value)}
          style={{
            width: '100%',
            height: '44px',
            padding: '0 12px',
            fontFamily: 'var(--font-space-mono)',
            fontSize: '14px',
            color: 'var(--color-ink)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-ink-muted)',
            // D-03 : pas de border-radius
            boxSizing: 'border-box',
          }}
        />
        {/* Erreur Zod sur le champ amount (ex: montant < 1€) */}
        {state && !state.success && state.errors?.amount && (
          <p
            role="alert"
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              color: 'rgb(200, 50, 50)',
              margin: '4px 0 0 0',
            }}
          >
            {state.errors.amount[0]}
          </p>
        )}
      </div>

      {/* ── Avertissement "sous le prix de base" — en temps réel ─────────── */}
      {/*
       * POURQUOI afficher AVANT la soumission ?
       * Permettre au visiteur de reconsidérer son montant avant d'envoyer.
       * Après soumission, l'information vient de state.belowFloor (côté serveur).
       *
       * DÉCISION CLAUDE.md — plancher souple :
       * L'avertissement est informatif uniquement. Le bouton submit reste ACTIVÉ
       * même si l'offre est sous le prix de base. C'est le visiteur qui décide.
       *
       * D-03 : pas de border-radius sur ce bloc.
       */}
      {showLiveWarning && (
        <div
          role="alert"
          style={{
            border: '1px solid orange',
            backgroundColor: 'rgba(255, 165, 0, 0.06)',
            padding: '8px 12px',
            marginBottom: '12px',
            // D-03 : pas de border-radius
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Votre offre est sous le prix de base de l'artiste (
            {parsedBasePrice !== null
              ? parsedBasePrice.toLocaleString('fr-FR')
              : ''}{' '}
            €). Elle sera quand même transmise.
          </p>
        </div>
      )}

      {/* ── Champ : Message optionnel ───────────────────────────────────── */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="offer-message"
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
          Message (optionnel)
        </label>
        <textarea
          id="offer-message"
          name="message"
          maxLength={500}
          rows={3}
          placeholder="Dites quelques mots à l'artiste..."
          style={{
            width: '100%',
            padding: '8px 12px',
            fontFamily: 'var(--font-space-mono)',
            fontSize: '12px',
            color: 'var(--color-ink)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-ink-muted)',
            // D-03 : pas de border-radius
            boxSizing: 'border-box',
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
        {/* Erreur Zod sur le champ message (ex: > 500 caractères) */}
        {state && !state.success && state.errors?.message && (
          <p
            role="alert"
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              color: 'rgb(200, 50, 50)',
              margin: '4px 0 0 0',
            }}
          >
            {state.errors.message[0]}
          </p>
        )}
      </div>

      {/* ── Bouton submit "Envoyer l'offre" ────────────────────────────── */}
      {/*
       * - height 44px : taille minimum pour l'accessibilité tactile (touch target minimum — CLAUDE.md)
       * - background var(--color-orange) : couleur d'action principale (UI-SPEC)
       * - Oswald uppercase : typographie des boutons d'action (D-02)
       * - disabled={isPending} : empêche la double soumission pendant l'envoi
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
        {isPending ? 'Envoi en cours...' : "Envoyer l'offre"}
      </button>
    </form>
  )
}
