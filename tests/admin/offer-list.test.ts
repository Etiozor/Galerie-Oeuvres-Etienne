/**
 * Tests de l'isolation des données visiteur (téléphone, email) — ADMIN-05.
 *
 * POURQUOI ces tests ?
 * D-11 exige que le téléphone et l'email du visiteur ne soient jamais exposés
 * côté public. Ces tests vérifient statiquement que la query admin inclut ces
 * champs, et que le fichier public ne les importe pas.
 *
 * Approche "lecture de fichier source" : on lit le fichier .tsx directement
 * pour garantir que les champs sensibles sont bien présents dans la page admin
 * et absents de la page publique — sans avoir besoin de lancer un serveur Next.js.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Isolation données visiteur (ADMIN-05 + D-11)', () => {
  it('La page admin inclut visitors.phone dans la query offer', () => {
    // POURQUOI ? T-05-03-01 : les données PII visiteur (téléphone) ne doivent être
    // accessibles que dans la page admin protégée par auth artiste (D-11)
    const file = readFileSync(resolve('src/app/admin/artworks/[id]/page.tsx'), 'utf-8')
    expect(file).toContain('visitorPhone')
  })

  it('La page admin inclut visitors.email dans la query offer', () => {
    // POURQUOI ? T-05-03-01 : l'email visiteur est également PII — admin uniquement
    const file = readFileSync(resolve('src/app/admin/artworks/[id]/page.tsx'), 'utf-8')
    expect(file).toContain('visitorEmail')
  })

  it('La page publique artwork détail ne contient pas visitorPhone', () => {
    // POURQUOI ? T-05-03-01 : la page /artworks/[id] est publique (sans auth).
    // Si visitorPhone y apparaissait, les coordonnées des visiteurs seraient exposées
    // sans aucune protection — violation directe de D-11.
    const file = readFileSync(resolve('src/app/artworks/[id]/page.tsx'), 'utf-8')
    expect(file).not.toContain('visitorPhone')
  })

  it('Le tri des offres est par montant décroissant (desc)', () => {
    // POURQUOI ? D-10 : la meilleure offre doit apparaître en premier pour permettre
    // à l'artiste d'identifier rapidement le meilleur acheteur potentiel.
    // Le pattern desc(offers.amount) ou desc(...amount...) doit être présent.
    const file = readFileSync(resolve('src/app/admin/artworks/[id]/page.tsx'), 'utf-8')
    expect(file).toMatch(/desc\s*\(.*amount/)
  })
})
