/**
 * Composant PriceBreakdown — Décomposition du prix de base d'une œuvre.
 *
 * POURQUOI ce composant existe ?
 * L'artiste calcule son prix de base en combinant plusieurs facteurs :
 * temps de travail, format, encadrement, matériaux, technicité, attachement.
 * Ce composant rend ces facteurs transparents pour le visiteur — il comprend
 * la valeur de l'œuvre au-delà du chiffre brut. (MARKET-01)
 *
 * DÉCISION : Server Component (pas de 'use client')
 * Ce composant fait uniquement du rendu statique — il reçoit des données en props
 * et les affiche. Aucune interactivité requise → Server Component pour optimiser
 * le bundle JavaScript envoyé au navigateur.
 *
 * DESIGN (D-03) : AUCUN border-radius sur aucun élément.
 * Typographie : Space Mono pour tous les labels et valeurs (cohérence méta-grille).
 */
import type { PriceBreakdownData } from '@/db/schema'

/** Props du composant — data null ou toutes colonnes null → ne rend rien */
export interface PriceBreakdownProps {
  data: PriceBreakdownData | null
}

/**
 * Formate un montant numérique Drizzle (string "200.00") en euros français.
 * POURQUOI parseFloat ? Les colonnes numeric Drizzle arrivent comme string en TypeScript.
 * toLocaleString('fr-FR') ajoute l'espace insécable et la virgule décimale françaises.
 */
function formatEuros(value: string): string {
  const amount = parseFloat(value)
  // Pas de décimales si le montant est un entier (200 € et non 200,00 €)
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + ' €'
}

/**
 * Ligne du tableau de décomposition.
 * Affichée uniquement si la valeur est non-null (filtrée avant le rendu).
 * D-03 : pas de border-radius. Séparateur inférieur en ink-muted opacity 0.15.
 */
function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '10px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
          padding: '6px 8px 6px 0',
          borderBottom: '1px solid rgba(var(--color-ink-muted-rgb, 90, 80, 60), 0.15)',
          verticalAlign: 'top',
          // D-03 : aucun border-radius
        }}
      >
        {label}
      </td>
      <td
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          color: 'var(--color-ink)',
          padding: '6px 0 6px 8px',
          borderBottom: '1px solid rgba(var(--color-ink-muted-rgb, 90, 80, 60), 0.15)',
          textAlign: 'right',
          // D-03 : aucun border-radius
        }}
      >
        {value}
      </td>
    </tr>
  )
}

/**
 * Composant principal — décomposition du prix de base.
 *
 * Logique de garde : retourne null si aucune colonne n'a de valeur.
 * POURQUOI ? L'artiste peut ne pas avoir renseigné la décomposition.
 * Afficher un titre vide "Composition du prix" serait confus pour le visiteur.
 */
export function PriceBreakdown({ data }: PriceBreakdownProps) {
  // Vérifier qu'au moins une valeur est non-null avant d'afficher quoi que ce soit
  const hasData = data && Object.values(data).some(v => v !== null)
  if (!hasData) return null

  // À ce stade TypeScript sait que data est non-null (narrowing après guard ci-dessus)
  const d = data!

  return (
    <div>
      {/* Titre de section — Space Mono 11px uppercase ink-muted (cohérence méta-grille) */}
      <p
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
          margin: '0 0 8px 0',
        }}
      >
        Composition du prix
      </p>

      {/*
       * Tableau HTML — 2 colonnes : label | valeur.
       * POURQUOI un tableau ? Alignement parfait des valeurs à droite
       * sans JavaScript ni positionnement relatif. Sémantique correcte.
       * D-03 : width 100%, border-collapse collapse, AUCUN border-radius.
       */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          // D-03 : pas de border-radius
        }}
      >
        <tbody>
          {/* Temps de travail — priceHoursSpent : heures × taux artiste */}
          {d.priceHoursSpent !== null && (
            <PriceRow
              label="Temps de travail"
              value={formatEuros(d.priceHoursSpent)}
            />
          )}

          {/* Format / Dimensions — bonus lié aux dimensions de l'œuvre */}
          {d.priceFormat !== null && (
            <PriceRow
              label="Format / Dimensions"
              value={formatEuros(d.priceFormat)}
            />
          )}

          {/* Encadrement — coût du cadre si livré encadré */}
          {d.priceFraming !== null && (
            <PriceRow
              label="Encadrement"
              value={parseFloat(d.priceFraming) === 0
                ? 'Inclus'
                : formatEuros(d.priceFraming)
              }
            />
          )}

          {/* Matériaux — coût des pigments, papier, toile, crayons, etc. */}
          {d.priceMaterials !== null && (
            <PriceRow
              label="Matériaux"
              value={formatEuros(d.priceMaterials)}
            />
          )}

          {/* Complexité technique — score 1 à 5 */}
          {/* POURQUOI smallint ? Valeurs 1-5 seulement — 2 octets suffisent */}
          {d.priceTechnicality !== null && (
            <PriceRow
              label="Complexité technique"
              value={`${d.priceTechnicality}/5`}
            />
          )}

          {/* Attachement sentimental — score 1 à 5 */}
          {/* Influe sur le prix plancher : l'artiste fixe un prix plus élevé */}
          {/* pour une œuvre à laquelle il tient particulièrement */}
          {d.priceAttachment !== null && (
            <PriceRow
              label="Attachement"
              value={`${d.priceAttachment}/5`}
            />
          )}
        </tbody>
      </table>
    </div>
  )
}
