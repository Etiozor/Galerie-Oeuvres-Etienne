'use client'

/**
 * StatusSegmented — Bouton segmenté coloré pour le statut de vente.
 *
 * Les 4 statuts correspondent à l'enum `artwork_status` en DB.
 * Chaque état a sa teinte propre via data-tone (voir globals.css .seg-btn.is-on[data-tone]).
 */

const STATUSES = [
  { id: 'available', label: 'Disponible' },
  { id: 'reserved',  label: 'Réservé'   },
  { id: 'sold',      label: 'Vendu'     },
  { id: 'given',     label: 'Donné'     },
] as const

type StatusValue = (typeof STATUSES)[number]['id']

interface StatusSegmentedProps {
  value: StatusValue
  onChange: (value: StatusValue) => void
}

export function StatusSegmented({ value, onChange }: StatusSegmentedProps) {
  return (
    <div className="seg" role="radiogroup" aria-label="Statut de l'œuvre">
      {STATUSES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          onClick={() => onChange(s.id)}
          data-tone={s.id}
          className={`seg-btn ${value === s.id ? 'is-on' : ''}`}
        >
          <span className="seg-dot" />
          {s.label}
        </button>
      ))}
    </div>
  )
}
