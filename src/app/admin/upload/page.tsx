/**
 * Page d'upload d'une nouvelle œuvre — /admin/upload.
 *
 * POURQUOI 'use client' ?
 * La page gère des états UI réactifs (fichier sélectionné, progression, erreur/succès)
 * et utilise useActionState (React 19) pour appeler la Server Action uploadArtwork.
 * Le layout parent /admin/ gère la vérification d'authentification côté serveur —
 * cette page n'a pas besoin de refaire la vérification.
 *
 * Flux d'état (UI-SPEC) :
 * 1. Initial → fichier non sélectionné, CTA désactivé
 * 2. Fichier sélectionné → nom affiché, CTA activé
 * 3. Upload en cours → CTA passe en "Envoi en cours…", input désactivé
 * 4. Succès → message vert, redirection /admin/artworks dans 2 secondes
 * 5. Erreur → alert rouge avec message exact (D-06, D-07)
 */
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadArtwork } from '@/actions/upload'

export default function AdminUploadPage() {
  const router = useRouter()
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // useActionState (React 19) — remplace useFormState de React-DOM 18.
  // state    = dernier résultat retourné par uploadArtwork (null si pas encore soumis)
  // isPending = true pendant que la Server Action s'exécute
  const [state, formAction, isPending] = useActionState(uploadArtwork, null)

  // Redirection automatique 2 secondes après un upload réussi (UI-SPEC)
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/admin/artworks')
      }, 2000)
      // Nettoyer le timer si le composant est démonté avant la redirection
      return () => clearTimeout(timer)
    }
  }, [state?.success, router])

  return (
    <main style={{ padding: '48px 16px', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Titre de page — Display 28px / 600 (UI-SPEC) */}
      <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px', color: '#171717' }}>
        Uploader une photo
      </h1>

      <div style={{ maxWidth: '448px' }}>
        <form action={formAction}>
          {/* Zone de sélection de fichier */}
          <div style={{ marginBottom: '16px' }}>
            {/* Label — 14px / 600 (UI-SPEC Label) */}
            <label
              htmlFor="file-input"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#171717',
              }}
            >
              Choisir une photo
            </label>

            {/*
              Input fichier — hauteur min 44px (WCAG 2.5.5, UI-SPEC).
              accept="image/jpeg,image/png" : filtre les formats autorisés dans le sélecteur.
              Sur iPhone, le système affiche nativement "Prendre une photo" ou
              "Choisir dans la bibliothèque" — aucun code spécifique requis (D-05).
            */}
            <input
              id="file-input"
              type="file"
              name="file"
              accept="image/jpeg,image/png"
              required
              disabled={isPending}
              onChange={(e) => {
                const f = e.target.files?.[0]
                setSelectedFileName(f ? f.name : null)
                // Libérer l'ancienne URL blob avant d'en créer une nouvelle
                if (previewUrl) URL.revokeObjectURL(previewUrl)
                setPreviewUrl(f ? URL.createObjectURL(f) : null)
              }}
              style={{
                display: 'block',
                width: '100%',
                minHeight: '44px',
                padding: '8px',
                border: '1px solid #e5e5e5',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                boxSizing: 'border-box',
              }}
            />

            {/* Texte d'aide ou nom du fichier sélectionné — Body 16px (UI-SPEC) */}
            <p style={{ fontSize: '16px', color: '#737373', marginTop: '4px' }}>
              {selectedFileName ? selectedFileName : 'JPEG ou PNG, 20 MB maximum'}
            </p>

            {/* Aperçu de l'image sélectionnée — blob URL local, aucun upload */}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Aperçu de la photo sélectionnée"
                style={{
                  marginTop: '12px',
                  width: '100%',
                  maxHeight: '320px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  border: '1px solid #e5e5e5',
                  backgroundColor: '#f5f5f5',
                }}
              />
            )}
          </div>

          {/* Message d'erreur — Alert rouge (UI-SPEC couleur Destructif) */}
          {state?.error && (
            <div
              role="alert"
              style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '16px',
                marginBottom: '16px',
              }}
            >
              {state.error}
            </div>
          )}

          {/* Message de succès — Alert verte */}
          {state?.success && (
            <div
              role="status"
              style={{
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                color: '#15803d',
                fontSize: '16px',
                marginBottom: '16px',
              }}
            >
              Photo envoyée. Le traitement est en cours.
            </div>
          )}

          {/*
            CTA principal — fond #171717, texte blanc, pleine largeur, 44px min (UI-SPEC).
            POURQUOI #171717 et pas #000000 ?
            Le design system utilise #171717 comme couleur accent (10%) — voir UI-SPEC Color.
            Ce bouton est le seul élément qui utilise cette couleur dans toute la page.
          */}
          <button
            type="submit"
            disabled={isPending}
            aria-label="Uploader la photo sélectionnée"
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '12px 24px',
              backgroundColor: isPending ? '#737373' : '#171717',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '6px',
              cursor: isPending ? 'not-allowed' : 'pointer',
              boxSizing: 'border-box',
            }}
          >
            {/* Texte du bouton — change selon l'état d'upload (UI-SPEC Copywriting) */}
            {isPending ? 'Envoi en cours…' : 'Uploader la photo'}
          </button>
        </form>
      </div>
    </main>
  )
}
