// @vitest-environment jsdom
/**
 * Tests unitaires pour le composant OfferHistory.
 *
 * POURQUOI ces tests existent ?
 * OfferHistory a une logique d'affichage conditionnelle critique :
 * - MARKET-04 : résumé toujours visible (nombre d'offres + meilleure offre)
 * - Historique complet en opt-in uniquement (éviter l'ancrage des prix à la baisse)
 * - Sécurité : le téléphone du visiteur ne doit JAMAIS apparaître (T-04-04-01)
 * - Singulier/pluriel correct en français ("1 offre" vs "3 offres")
 * - D-03 : pas de border-radius (vérifié par grep, pas par ces tests unitaires)
 *
 * TDD : ces tests sont écrits AVANT le composant (RED phase).
 * Ils doivent échouer avant l'implémentation, puis passer après (GREEN).
 *
 * OfferHistory est pur (props uniquement, pas de fetch) — pas besoin de mock.
 *
 * POURQUOI React.createElement au lieu de JSX ?
 * Le fichier a l'extension .ts (cohérence avec les autres tests du projet).
 * L'oxc parser de Vite ne transforme pas le JSX dans les fichiers .ts,
 * seulement dans les .tsx. React.createElement est équivalent. [Pattern existant]
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import '@testing-library/jest-dom'

// Import différé — le composant n'existe pas encore lors de la RED phase
import { OfferHistory } from '@/components/artwork/OfferHistory'
import type { OfferHistoryItem } from '@/components/artwork/OfferHistory'

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Offre de test 1 — montant élevé */
const offer1: OfferHistoryItem = {
  id: 1,
  amount: '850.00',
  message: 'Très intéressé par cette oeuvre.',
  visitorName: 'Marie Dupont',
  createdAt: new Date('2026-05-01T10:00:00Z'),
}

/** Offre de test 2 — montant plus bas */
const offer2: OfferHistoryItem = {
  id: 2,
  amount: '600.00',
  message: null,
  visitorName: 'Jean Martin',
  createdAt: new Date('2026-05-02T14:30:00Z'),
}

/** Offre de test 3 — sans message */
const offer3: OfferHistoryItem = {
  id: 3,
  amount: '750.00',
  message: null,
  visitorName: 'Sophie Bernard',
  createdAt: new Date('2026-05-03T09:15:00Z'),
}

// ── Helpers — createElement pour éviter JSX dans les .ts ─────────────────────

/** Crée un élément OfferHistory avec React.createElement (pas de JSX dans .ts) */
function makeHistory(props: {
  offerCount: number
  bestOffer: string | null
  allOffers: OfferHistoryItem[]
}) {
  return React.createElement(OfferHistory, props)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OfferHistory', () => {

  // ── Cas : aucune offre ───────────────────────────────────────────────────

  describe('quand offerCount === 0', () => {
    it('ne rend rien (retourne null)', () => {
      const { container } = render(
        makeHistory({ offerCount: 0, bestOffer: null, allOffers: [] })
      )
      // Le container doit être vide — aucun élément rendu
      expect(container.firstChild).toBeNull()
    })
  })

  // ── Cas : 1 offre (singulier) ────────────────────────────────────────────

  describe('quand offerCount === 1', () => {
    it('affiche "1 offre" au singulier', () => {
      render(
        makeHistory({ offerCount: 1, bestOffer: '850.00', allOffers: [offer1] })
      )
      // POURQUOI chercher le texte "1 offre" ?
      // Pour vérifier le singulier ("offre" sans "s") — règle de français
      expect(screen.getByText(/1 offre/)).toBeInTheDocument()
    })

    it("n'affiche pas '1 offres' (faute de pluriel)", () => {
      render(
        makeHistory({ offerCount: 1, bestOffer: '850.00', allOffers: [offer1] })
      )
      // Vérifier l'absence de faute de pluriel
      expect(screen.queryByText(/1 offres/)).not.toBeInTheDocument()
    })
  })

  // ── Cas : plusieurs offres (pluriel) ─────────────────────────────────────

  describe('quand offerCount === 3', () => {
    it('affiche "3 offres" au pluriel', () => {
      render(
        makeHistory({ offerCount: 3, bestOffer: '850.00', allOffers: [offer1, offer2, offer3] })
      )
      expect(screen.getByText(/3 offres/)).toBeInTheDocument()
    })

    it('affiche la meilleure offre dans le résumé', () => {
      render(
        makeHistory({ offerCount: 3, bestOffer: '850.00', allOffers: [offer1, offer2, offer3] })
      )
      // Le résumé doit afficher "Meilleure : 850 €" (ou formaté en fr-FR)
      // POURQUOI ce test ? C'est l'information clé du résumé (MARKET-04)
      expect(screen.getByText(/Meilleure/)).toBeInTheDocument()
      expect(screen.getByText(/850/)).toBeInTheDocument()
    })

    it('affiche le bouton "Voir toutes les offres" par défaut', () => {
      render(
        makeHistory({ offerCount: 3, bestOffer: '850.00', allOffers: [offer1, offer2, offer3] })
      )
      // POURQUOI ce bouton ? L'historique est en opt-in (CLAUDE.md — évite l'ancrage)
      expect(screen.getByRole('button', { name: /voir toutes les offres/i })).toBeInTheDocument()
    })

    it("ne montre pas la liste complete par defaut (avant clic)", () => {
      render(
        makeHistory({ offerCount: 3, bestOffer: '850.00', allOffers: [offer1, offer2, offer3] })
      )
      // La liste n'est pas visible avant le clic sur le bouton
      // On vérifie que les noms des visiteurs ne sont pas affichés
      expect(screen.queryByText('Marie Dupont')).not.toBeInTheDocument()
      expect(screen.queryByText('Jean Martin')).not.toBeInTheDocument()
    })
  })

  // ── Cas : toggle — révéler la liste complète ─────────────────────────────

  describe('après clic sur "Voir toutes les offres"', () => {
    it('affiche la liste complète avec les noms et montants', () => {
      render(
        makeHistory({ offerCount: 3, bestOffer: '850.00', allOffers: [offer1, offer2, offer3] })
      )

      // Cliquer sur le bouton toggle (fireEvent.click est synchrone — pas besoin de userEvent ici)
      fireEvent.click(screen.getByRole('button', { name: /voir toutes les offres/i }))

      // Vérifier que les noms des visiteurs sont maintenant visibles
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
      expect(screen.getByText('Jean Martin')).toBeInTheDocument()
      expect(screen.getByText('Sophie Bernard')).toBeInTheDocument()
    })

    it('affiche les montants des offres individuelles', () => {
      render(
        makeHistory({ offerCount: 3, bestOffer: '850.00', allOffers: [offer1, offer2, offer3] })
      )

      fireEvent.click(screen.getByRole('button', { name: /voir toutes les offres/i }))

      // Les montants doivent être visibles dans la liste (en euros, formatés)
      const allText = document.body.textContent ?? ''
      // Vérifier que les valeurs numériques des offres apparaissent dans le rendu
      expect(allText).toContain('850')
      expect(allText).toContain('600')
      expect(allText).toContain('750')
    })

    it('masque le bouton "Voir toutes les offres" une fois la liste ouverte', () => {
      render(
        makeHistory({ offerCount: 3, bestOffer: '850.00', allOffers: [offer1, offer2, offer3] })
      )

      fireEvent.click(screen.getByRole('button', { name: /voir toutes les offres/i }))

      // Le bouton ne doit plus être visible une fois la liste ouverte
      // POURQUOI ? Évite que l'utilisateur clique à nouveau sur un bouton sans effet
      expect(screen.queryByRole('button', { name: /voir toutes les offres/i })).not.toBeInTheDocument()
    })

    it("n'affiche jamais le numero de telephone du visiteur", () => {
      // SÉCURITÉ CRITIQUE : le téléphone est une donnée personnelle (T-04-04-01)
      // OfferHistoryItem ne contient PAS de champ phone — ce test vérifie que
      // le composant ne présente aucune chaîne ressemblant à un numéro de téléphone.
      const offerWithName: OfferHistoryItem = {
        id: 99,
        amount: '500.00',
        message: null,
        visitorName: 'Alice Renard', // Seul le displayName est disponible
        createdAt: new Date('2026-05-04T12:00:00Z'),
      }

      render(
        makeHistory({ offerCount: 1, bestOffer: '500.00', allOffers: [offerWithName] })
      )

      fireEvent.click(screen.getByRole('button', { name: /voir toutes les offres/i }))

      const allText = document.body.textContent ?? ''

      // Vérifier qu'aucun numéro de téléphone typique ne figure dans le rendu
      // Un téléphone français ressemble à +33... ou 06... ou 07...
      expect(allText).not.toMatch(/\+33/)
      expect(allText).not.toMatch(/\b0[67]\d{8}\b/)

      // Vérifier que le nom est bien visible (pas de régression)
      expect(screen.getByText('Alice Renard')).toBeInTheDocument()
    })
  })

  // ── Cas : résumé sans bestOffer ──────────────────────────────────────────

  describe('quand bestOffer est null', () => {
    it("affiche le nombre d'offres sans la mention de la meilleure", () => {
      render(
        makeHistory({ offerCount: 2, bestOffer: null, allOffers: [offer1, offer2] })
      )
      // Le résumé doit quand même s'afficher
      expect(screen.getByText(/2 offres/)).toBeInTheDocument()
      // Pas de "Meilleure" si bestOffer est null
      expect(screen.queryByText(/Meilleure/)).not.toBeInTheDocument()
    })
  })
})
