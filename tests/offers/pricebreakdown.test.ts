// @vitest-environment jsdom
/**
 * Tests unitaires pour le composant PriceBreakdown.
 *
 * POURQUOI ces tests existent ?
 * PriceBreakdown est un composant d'affichage qui dépend de données nullables.
 * Les règles métier suivantes doivent être vérifiées :
 * - Retourner null si TOUTES les colonnes price_* sont null (éviter un composant vide)
 * - Afficher uniquement les lignes dont la valeur est non-null (lisibilité)
 * - Formater les montants en euros avec toLocaleString('fr-FR')
 * - Afficher les scores 1-5 au format "X/5"
 *
 * TDD : ces tests sont écrits AVANT le composant (RED phase).
 * Ils doivent échouer avant l'implémentation, puis passer après (GREEN).
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Import différé — le composant n'existe pas encore lors de la RED phase
import { PriceBreakdown } from '@/components/artwork/PriceBreakdown'
import type { PriceBreakdownData } from '@/db/schema'

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Toutes les colonnes à null → le composant ne doit rien rendre */
const allNullData: PriceBreakdownData = {
  priceHoursSpent: null,
  priceFormat: null,
  priceFraming: null,
  priceMaterials: null,
  priceTechnicality: null,
  priceAttachment: null,
}

/** Seulement le temps de travail renseigné — les autres lignes sont masquées */
const partialData: PriceBreakdownData = {
  priceHoursSpent: '200.00',
  priceFormat: null,
  priceFraming: null,
  priceMaterials: null,
  priceTechnicality: null,
  priceAttachment: null,
}

/** Données complètes avec scores */
const fullData: PriceBreakdownData = {
  priceHoursSpent: '200.00',
  priceFormat: '80.00',
  priceFraming: '45.50',
  priceMaterials: '30.00',
  priceTechnicality: 3,
  priceAttachment: 5,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PriceBreakdown — données nulles', () => {
  it('retourne null si toutes les colonnes price_* sont null', () => {
    // POURQUOI ce test ? On ne veut pas afficher un titre "Composition du prix"
    // vide si l'artiste n'a encore rien renseigné. Expérience utilisateur : propre.
    const { container } = render(React.createElement(PriceBreakdown, { data: allNullData }))
    expect(container.firstChild).toBeNull()
  })

  it('retourne null si data est null', () => {
    const { container } = render(React.createElement(PriceBreakdown, { data: null }))
    expect(container.firstChild).toBeNull()
  })
})

describe('PriceBreakdown — données partielles', () => {
  it('affiche la section quand au moins une colonne est non-null', () => {
    render(React.createElement(PriceBreakdown, { data: partialData }))
    // Le titre de section doit être présent
    expect(screen.getByText(/composition du prix/i)).toBeDefined()
  })

  it('affiche la ligne "Temps de travail" avec le montant en euros (priceHoursSpent="200.00")', () => {
    render(React.createElement(PriceBreakdown, { data: partialData }))
    // Vérifier que le label est présent
    expect(screen.getByText(/temps de travail/i)).toBeDefined()
    // 200 € avec formatage français (espace insécable ou espace normal)
    expect(screen.getByText(/200/)).toBeDefined()
  })

  it('masque les lignes dont la valeur est null', () => {
    render(React.createElement(PriceBreakdown, { data: partialData }))
    // priceFormat est null → "Format / Dimensions" ne doit pas apparaître
    expect(screen.queryByText(/format \/ dimensions/i)).toBeNull()
    // priceMaterials est null → "Matériaux" ne doit pas apparaître
    expect(screen.queryByText(/matériaux/i)).toBeNull()
  })
})

describe('PriceBreakdown — données complètes', () => {
  it('affiche le score de technicité au format "3/5" (priceTechnicality=3)', () => {
    render(React.createElement(PriceBreakdown, { data: fullData }))
    expect(screen.getByText(/3\/5/)).toBeDefined()
  })

  it('affiche le score d\'attachement au format "5/5" (priceAttachment=5)', () => {
    render(React.createElement(PriceBreakdown, { data: fullData }))
    expect(screen.getByText(/5\/5/)).toBeDefined()
  })

  it('affiche toutes les 6 lignes si toutes les colonnes sont renseignées', () => {
    render(React.createElement(PriceBreakdown, { data: fullData }))
    expect(screen.getByText(/temps de travail/i)).toBeDefined()
    expect(screen.getByText(/format \/ dimensions/i)).toBeDefined()
    expect(screen.getByText(/encadrement/i)).toBeDefined()
    expect(screen.getByText(/matériaux/i)).toBeDefined()
    expect(screen.getByText(/complexité technique/i)).toBeDefined()
    expect(screen.getByText(/attachement/i)).toBeDefined()
  })
})
