'use client'

/**
 * TagInput — Champ de saisie de tags en chips.
 *
 * - Entrée ou virgule pour valider un tag
 * - Backspace sur champ vide supprime le dernier tag
 * - Suggestions filtrées par ce qui est déjà tapé
 * - Les tags sont stockés dans l'état parent (controlled)
 */

import { useState } from 'react'

const DEFAULT_SUGGESTIONS = [
  'paysage', 'portrait', 'nature morte', 'abstrait',
  'huile', 'encre', 'aquarelle', 'fusain',
  'atelier 2025', 'série « Rivages »', 'carnet de bord', 'petits formats',
]

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
}

export function TagInput({ tags, onChange, suggestions = DEFAULT_SUGGESTIONS }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const add = (name: string) => {
    const v = name.trim()
    if (!v || tags.includes(v)) return
    onChange([...tags, v])
    setDraft('')
  }

  const remove = (name: string) => onChange(tags.filter((t) => t !== name))

  const visibleSuggestions = suggestions
    .filter((s) => !tags.includes(s) && s.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 4)

  return (
    <div>
      <div className="tags">
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
            <button
              type="button"
              className="tag-x"
              aria-label={`Retirer ${t}`}
              onClick={() => remove(t)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="tag-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
              e.preventDefault()
              add(draft)
            }
            if (e.key === 'Backspace' && !draft && tags.length) {
              onChange(tags.slice(0, -1))
            }
          }}
          placeholder={tags.length ? 'Ajouter…' : 'encre, paysage, série « Rivages »…'}
        />
      </div>

      {draft && visibleSuggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          <span className="eyebrow" style={{ alignSelf: 'center', marginRight: 4 }}>Suggestions</span>
          {visibleSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="tag"
              style={{ cursor: 'pointer', padding: '4px 10px', borderStyle: 'dashed', background: '#fff' }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
