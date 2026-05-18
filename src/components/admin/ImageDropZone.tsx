'use client'

/**
 * ImageDropZone — Zone de dépôt d'image avec prévisualisation.
 *
 * Accepte JPEG et PNG, 20 MB maximum.
 * Affiche un aperçu local (blob URL) avant l'upload.
 * Expose la ref de l'input file pour que le parent puisse récupérer le fichier.
 *
 * POURQUOI forwardRef ?
 * Le parent (DocumenterClient) a besoin de la ref du <input type="file"> pour
 * récupérer le File lors du submit sans le passer via un state React (évite
 * la re-sérialisation d'un Blob dans l'arbre de composants).
 */

import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

export interface ImageDropZoneHandle {
  getFile: () => File | null
  reset: () => void
}

interface ImageDropZoneProps {
  onHasImage?: (hasImage: boolean) => void
  height?: number
}

const MAX_SIZE = 20 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png']

export const ImageDropZone = forwardRef<ImageDropZoneHandle, ImageDropZoneProps>(
  function ImageDropZone({ onHasImage, height = 500 }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      getFile: () => inputRef.current?.files?.[0] ?? null,
      reset: () => {
        if (preview) URL.revokeObjectURL(preview)
        setPreview(null)
        setError(null)
        if (inputRef.current) inputRef.current.value = ''
        onHasImage?.(false)
      },
    }))

    const handleFile = useCallback((file: File | null) => {
      setError(null)
      if (!file) return

      if (file.type === 'image/heic' || file.type === 'image/heif') {
        setError("Format HEIC non supporté. Exporte en JPEG depuis l'app Photos.")
        return
      }
      if (!ALLOWED.includes(file.type)) {
        setError('Format non supporté. JPEG ou PNG uniquement.')
        return
      }
      if (file.size > MAX_SIZE) {
        setError('Fichier trop lourd (max 20 MB).')
        return
      }

      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(file))
      onHasImage?.(true)
    }, [preview, onHasImage])

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFile(e.dataTransfer.files[0] ?? null)
    }

    return (
      <div
        className={`dropzone ${preview ? 'is-filled' : ''} ${isDragging ? 'is-dragging' : ''}`}
        style={{ height }}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
      >
        {/* Input caché — toujours dans le DOM pour que FormData l'inclue */}
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {preview ? (
          <img
            src={preview}
            alt="Aperçu de l'œuvre"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <div style={{ padding: '0 32px', pointerEvents: 'none' }}>
            <div style={{ font: '400 13px var(--font-space-mono)', letterSpacing: '0.04em' }}>
              Glissez la photo ici &nbsp;·&nbsp; ou cliquez pour parcourir
            </div>
            <div style={{ font: '400 11px var(--font-space-mono)', color: 'var(--color-admin-mute-2)', marginTop: 8, letterSpacing: '0.02em' }}>
              JPEG / PNG · 20 MB max
            </div>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute', left: 16, bottom: 16,
            padding: '6px 10px',
            background: 'var(--badge-failed-bg)', color: 'var(--badge-failed-fg)',
            font: '600 12px var(--font-geist-sans)',
          }}>
            {error}
          </div>
        )}
      </div>
    )
  }
)
