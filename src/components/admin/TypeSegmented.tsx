'use client'

/**
 * TypeSegmented — Bouton segmenté pour choisir le type d'œuvre.
 *
 * Reçoit les types depuis la DB (passés en props par le Server Component parent)
 * pour ne pas hardcoder "Dessin/Peinture" dans le code client.
 *
 * @param types   - Liste des types disponibles (id + name)
 * @param value   - ID du type sélectionné (null = aucun)
 * @param onChange - Callback avec le nouvel ID sélectionné
 */

interface TypeOption {
  id: number
  name: string
}

interface TypeSegmentedProps {
  types: TypeOption[]
  value: number | null
  onChange: (value: number | null) => void
}

export function TypeSegmented({ types, value, onChange }: TypeSegmentedProps) {
  return (
    <div className="seg" role="radiogroup" aria-label="Type d'œuvre">
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          onClick={() => onChange(value === t.id ? null : t.id)}
          className={`seg-btn ${value === t.id ? 'is-on' : ''}`}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}
