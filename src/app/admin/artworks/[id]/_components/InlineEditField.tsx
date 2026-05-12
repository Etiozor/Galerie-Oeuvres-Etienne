'use client'

import { useState, useTransition, useEffect, useRef } from 'react'

interface InlineEditFieldProps {
  initialValue: string
  onSave: (value: string) => Promise<{ success: boolean; error?: string }>
  as: 'title' | 'description'
}

const btnBase: React.CSSProperties = {
  padding: '6px 16px',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  fontSize: '13px',
  fontFamily: 'var(--font-geist-sans)',
  fontWeight: 600,
}

/**
 * Champ éditable inline — cliquer sur le texte pour l'éditer en place.
 * Utilisé pour le titre (H1) et la description sur la page détail admin.
 *
 * POURQUOI pas useActionState ?
 * L'édition inline utilise startTransition avec une action directe — pas de FormData,
 * pas d'état intermédiaire à persister entre soumissions.
 */
export function InlineEditField({ initialValue, onSave, as }: InlineEditFieldProps) {
  const [value, setValue] = useState(initialValue)
  const [draft, setDraft] = useState(initialValue)
  const [editing, setEditing] = useState(false)
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

  if (as === 'title') {
    if (editing) {
      return (
        <div style={{ marginBottom: '8px' }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
            disabled={isPending}
            style={{
              width: '100%',
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: 'var(--font-geist-sans)',
              color: '#171717',
              border: '2px solid #171717',
              padding: '4px 8px',
              borderRadius: 0,
              boxSizing: 'border-box',
              backgroundColor: '#fff',
            }}
          />
          {error && (
            <p style={{ color: '#bc4b51', fontSize: '13px', margin: '4px 0 0', fontFamily: 'var(--font-space-mono)' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={save} disabled={isPending} style={{ ...btnBase, backgroundColor: '#171717', color: '#fff' }}>
              {isPending ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
            <button onClick={cancel} disabled={isPending} style={{ ...btnBase, backgroundColor: '#e5e5e5', color: '#171717' }}>
              Annuler
            </button>
          </div>
        </div>
      )
    }
    return (
      <h1
        onClick={startEditing}
        title="Cliquer pour modifier le titre"
        style={{
          fontSize: '28px',
          fontWeight: 600,
          color: '#171717',
          marginBottom: '8px',
          cursor: 'text',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {value}
        <span style={{ fontSize: '14px', color: '#a3a3a3', fontWeight: 400, flexShrink: 0 }}>✎</span>
      </h1>
    )
  }

  // as === 'description'
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
            fontSize: '14px',
            color: '#171717',
            fontFamily: 'var(--font-geist-sans)',
            lineHeight: '1.6',
            border: '2px solid #171717',
            padding: '8px 12px',
            borderRadius: 0,
            resize: 'vertical',
            boxSizing: 'border-box',
            minHeight: '100px',
          }}
        />
        {error && (
          <p style={{ color: '#bc4b51', fontSize: '13px', margin: '4px 0 0', fontFamily: 'var(--font-space-mono)' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={save} disabled={isPending} style={{ ...btnBase, backgroundColor: '#171717', color: '#fff' }}>
            {isPending ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
          <button onClick={cancel} disabled={isPending} style={{ ...btnBase, backgroundColor: '#e5e5e5', color: '#171717' }}>
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={startEditing}
      title="Cliquer pour modifier la description"
      style={{ cursor: 'text' }}
    >
      {value ? (
        <p style={{ fontSize: '14px', color: '#525252', lineHeight: '1.6', margin: 0 }}>
          {value}
          <span style={{ marginLeft: '6px', color: '#a3a3a3', fontSize: '12px' }}>✎</span>
        </p>
      ) : (
        <p style={{ fontSize: '14px', color: '#a3a3a3', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
          Cliquer pour ajouter une description… ✎
        </p>
      )}
    </div>
  )
}
