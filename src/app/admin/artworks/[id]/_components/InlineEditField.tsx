'use client'

import { useState, useTransition, useEffect, useRef } from 'react'

interface InlineEditFieldProps {
  initialValue: string
  onSave: (value: string) => Promise<{ success: boolean; error?: string }>
  as: 'title' | 'description'
}

/**
 * Champ éditable inline — cliquer sur le texte pour l'éditer en place.
 *
 * - Titre (as="title") : Oswald 36px uppercase, édition inline sur blur ou Enter.
 * - Description (as="description") : Cormorant italique 17px, textarea, boutons Enregistrer / Annuler.
 */
export function InlineEditField({ initialValue, onSave, as }: InlineEditFieldProps) {
  const [value, setValue] = useState(initialValue)
  const [draft, setDraft] = useState(initialValue)
  const [editing, setEditing] = useState(false)
  const [hover, setHover] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      textareaRef.current?.focus()
    }
  }, [editing])

  function startEditing() {
    setDraft(value)
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError(null)
  }

  function save() {
    startTransition(async () => {
      const result = await onSave(draft)
      if (result.success) {
        setValue(draft)
        setEditing(false)
        setError(null)
      } else {
        setError(result.error ?? 'Erreur lors de la sauvegarde.')
      }
    })
  }

  // ── Titre : Oswald 36px, sauvegarde sur blur ou Enter ──────────────────────
  if (as === 'title') {
    const titleBase: React.CSSProperties = {
      font: '700 36px/1.05 var(--font-oswald)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--color-ink)',
      margin: 0,
      display: 'block',
    }

    if (editing) {
      return (
        <div>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') { setDraft(value); setEditing(false) }
            }}
            disabled={isPending}
            style={{
              ...titleBase,
              width: '100%',
              padding: 0,
              background: 'transparent',
              border: 0,
              borderBottom: `2px solid var(--color-ink)`,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: 'var(--color-red)', fontSize: 13, margin: '4px 0 0', fontFamily: 'var(--font-space-mono)' }}>
              {error}
            </p>
          )}
        </div>
      )
    }

    return (
      <h1
        onClick={startEditing}
        title="Cliquer pour modifier le titre"
        style={{
          ...titleBase,
          cursor: 'text',
          borderBottom: '2px solid transparent',
        }}
      >
        {value || <span style={{ color: 'var(--color-ink-muted)' }}>Sans titre</span>}
      </h1>
    )
  }

  // ── Description : Cormorant italique 17px, textarea avec boutons ────────────
  if (editing) {
    return (
      <div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={5}
          disabled={isPending}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#fff',
            border: '1px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            font: 'italic 400 17px/1.55 var(--font-cormorant)',
            color: 'var(--color-ink)',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p style={{ color: 'var(--color-red)', fontSize: 13, margin: '4px 0 0', fontFamily: 'var(--font-space-mono)' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={save}
            disabled={isPending}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontFamily: 'var(--font-geist-sans)', fontWeight: 600,
              backgroundColor: isPending ? 'var(--color-ink-muted)' : 'var(--color-ink)',
              color: '#fff',
            }}
          >
            {isPending ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
          <button
            onClick={cancel}
            disabled={isPending}
            style={{
              padding: '6px 16px', border: '1px solid rgba(0,0,0,0.14)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: 13, fontFamily: 'var(--font-geist-sans)', fontWeight: 600,
              backgroundColor: '#fff', color: 'var(--color-ink)',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <p
      onClick={startEditing}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Cliquer pour modifier la description"
      style={{
        margin: 0,
        padding: '10px 12px',
        font: 'italic 400 17px/1.55 var(--font-cormorant)',
        color: value ? 'var(--color-ink)' : 'var(--color-ink-muted)',
        background: 'transparent',
        borderRadius: 'var(--radius-sm)',
        border: '1px dashed ' + (hover ? 'rgba(0,0,0,0.14)' : 'transparent'),
        cursor: 'text',
        minHeight: 64,
        transition: 'border-color 120ms ease',
      }}
    >
      {value || 'Cliquer pour ajouter une description…'}
    </p>
  )
}
