'use client'

/**
 * DocumenterClient — Interface principale de la page "Documenter une œuvre".
 *
 * Layout split :
 * - Colonne gauche : zone de dépôt de l'image + méta-fichier
 * - Colonne droite : formulaire en 4 sections + barre d'action sticky
 *
 * Machine d'états :
 *   editing → saving → saved
 *   editing → publishing → published → reset (formulaire vide pour l'œuvre suivante)
 *
 * POURQUOI useTransition et pas useActionState ?
 * Deux boutons ("Enregistrer" et "Publier & suivante") soumettent le même
 * ensemble de champs. useActionState lie une action à un <form> unique.
 * useTransition avec appels directs aux Server Actions est plus flexible
 * quand plusieurs boutons déclenchent des actions différentes sur les mêmes données.
 *
 * POURQUOI les données sont-elles gérées en state React et pas via FormData natif ?
 * Le formulaire contient des composants contrôlés (TypeSegmented, StatusSegmented,
 * TagInput) qui ne sont pas des inputs HTML natifs. Il faut donc les collecter
 * manuellement via state React au moment du submit.
 */

import { useRef, useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/AdminNav'
import { TypeSegmented } from '@/components/admin/TypeSegmented'
import { StatusSegmented } from '@/components/admin/StatusSegmented'
import { TagInput } from '@/components/admin/TagInput'
import { ImageDropZone, type ImageDropZoneHandle } from '@/components/admin/ImageDropZone'
import { SaveBadge, type SaveStatus } from '@/components/admin/SaveBadge'
import { saveArtworkDraft, publishArtwork } from '@/actions/document'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TypeOption { id: number; name: string; slug: string }
interface MediumOption { id: number; name: string }

interface DocumenterClientProps {
  artworkTypes: TypeOption[]
  mediums: MediumOption[]
  userEmail?: string
}

type Toast = { kind: 'ok' | 'error'; text: string } | null

// ── Composants de mise en page ────────────────────────────────────────────────

function Section({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <section className="form-section">
      <div className="form-section-title">
        <h3>{title}</h3>
        <span className="eyebrow">{step}</span>
      </div>
      {children}
    </section>
  )
}

function Field({
  label, hint, error, required, children
}: {
  label: string; hint?: string; error?: string | null; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required && <span style={{ color: 'var(--badge-failed-fg)', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {error
        ? <div className="field-hint" style={{ color: 'var(--badge-failed-fg)' }}>{error}</div>
        : hint && <div className="field-hint">{hint}</div>
      }
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function DocumenterClient({ artworkTypes, mediums, userEmail }: DocumenterClientProps) {
  // État du formulaire
  const [artworkId, setArtworkId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState<number | null>(null)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [medium, setMedium] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [saleStatus, setSaleStatus] = useState<'available' | 'reserved' | 'sold' | 'given'>('available')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [hasImage, setHasImage] = useState(false)

  // État de la machine d'état + feedback
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('editing')
  const [showErrors, setShowErrors] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [isPending, startTransition] = useTransition()

  const dropZoneRef = useRef<ImageDropZoneHandle>(null)

  // Marquer "editing" à chaque modification des champs
  const markEditing = useCallback(() => {
    if (saveStatus === 'saved' || saveStatus === 'published') setSaveStatus('editing')
  }, [saveStatus])

  // ── Toast auto-dismiss (3.2 s) ────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  // ── Validation simple ─────────────────────────────────────────────────────
  const errors = {
    title: !title.trim() ? 'Donner un titre, même provisoire.' : null,
    year: year && !/^\d{4}$/.test(year) ? 'Quatre chiffres.' : null,
    widthCm: widthCm && !/^\d+([.,]\d+)?$/.test(widthCm) ? 'Nombre uniquement.' : null,
    heightCm: heightCm && !/^\d+([.,]\d+)?$/.test(heightCm) ? 'Nombre uniquement.' : null,
    image: !hasImage ? 'Une photo est requise pour publier.' : null,
  }
  const hasErrors = errors.title !== null || errors.year !== null || errors.widthCm !== null || errors.heightCm !== null
  const errFor = (key: keyof typeof errors) => showErrors ? errors[key] : null

  // ── Collecte FormData à partir du state ───────────────────────────────────
  const buildFormData = (includeFile: boolean): FormData => {
    const fd = new FormData()
    fd.set('title', title)
    fd.set('typeId', typeId !== null ? String(typeId) : '')
    fd.set('year', year)
    fd.set('medium', medium)
    fd.set('widthCm', widthCm)
    fd.set('heightCm', heightCm)
    fd.set('status', saleStatus)
    fd.set('basePrice', price)
    fd.set('description', description)
    fd.set('tags', JSON.stringify(tags))
    if (artworkId) fd.set('artworkId', String(artworkId))
    if (includeFile) {
      const file = dropZoneRef.current?.getFile()
      if (file) fd.set('file', file)
    }
    return fd
  }

  // ── Réinitialise le formulaire pour l'œuvre suivante ─────────────────────
  const resetForm = () => {
    setArtworkId(null)
    setTitle('')
    setTypeId(null)
    setYear(String(new Date().getFullYear()))
    setMedium('')
    setWidthCm('')
    setHeightCm('')
    setSaleStatus('available')
    setPrice('')
    setDescription('')
    setTags([])
    setHasImage(false)
    dropZoneRef.current?.reset()
    setShowErrors(false)
    setSaveStatus('editing')
  }

  // ── Action : Enregistrer (brouillon sans image) ───────────────────────────
  const handleSave = () => {
    setShowErrors(true)
    if (hasErrors) {
      setToast({ kind: 'error', text: 'Quelques champs à corriger avant d\'enregistrer.' })
      return
    }
    setSaveStatus('saving')
    const fd = buildFormData(false)
    startTransition(async () => {
      const result = await saveArtworkDraft(fd)
      if (result.success) {
        setArtworkId(result.artworkId)
        setSaveStatus('saved')
        setToast({ kind: 'ok', text: 'Brouillon enregistré.' })
      } else {
        setSaveStatus('editing')
        setToast({ kind: 'error', text: result.error })
      }
    })
  }

  // ── Action : Publier & passer à l'œuvre suivante ──────────────────────────
  const handlePublish = () => {
    setShowErrors(true)
    if (!hasImage) {
      setToast({ kind: 'error', text: 'Une photo et un titre suffisent — ajoutez une photo.' })
      return
    }
    if (hasErrors) {
      setToast({ kind: 'error', text: 'Corrigez les champs en rouge avant de publier.' })
      return
    }
    setSaveStatus('publishing')
    const fd = buildFormData(true)
    startTransition(async () => {
      const result = await publishArtwork(fd)
      if (result.success) {
        setSaveStatus('published')
        setToast({ kind: 'ok', text: 'Œuvre publiée — le traitement continue en arrière-plan.' })
        setTimeout(() => resetForm(), 1100)
      } else {
        setSaveStatus('editing')
        setToast({ kind: 'error', text: result.error })
      }
    })
  }

  const isBusy = isPending || saveStatus === 'saving' || saveStatus === 'publishing'

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="pof-admin" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Chrome admin */}
      <AdminNav tab="upload" userEmail={userEmail} />

      {/* Page hero */}
      <div className="page-hero">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            <Link href="/admin/artworks" style={{ color: 'var(--color-admin-mute)', textDecoration: 'none' }}>
              ← Mes œuvres
            </Link>
            <span style={{ color: 'var(--color-admin-mute-2)' }}>&nbsp;/&nbsp;</span>
            <span>Nouvelle œuvre</span>
          </div>
          <h1>Documenter une nouvelle œuvre</h1>
        </div>
        <SaveBadge status={saveStatus} />
      </div>

      {/* Layout split */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 460px',
        flex: 1,
        minHeight: 0,
        borderTop: '1px solid var(--color-admin-divider)',
      }}>

        {/* ── Colonne image ─────────────────────────────────────────── */}
        <div style={{
          padding: '28px 32px',
          background: '#fcfcfa',
          borderRight: '1px solid var(--color-admin-divider)',
        }}>
          <div className="eyebrow" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>Photographie de l&apos;œuvre</span>
            <span style={{ color: 'var(--color-admin-mute-2)' }}>JPEG / PNG · 20 MB max · aucun recadrage</span>
          </div>

          <ImageDropZone
            ref={dropZoneRef}
            onHasImage={setHasImage}
            height={500}
          />

          {/* Méta fichier */}
          <dl style={{
            marginTop: 18,
            display: 'grid', gridTemplateColumns: 'auto 1fr',
            columnGap: 14, rowGap: 6,
            font: '400 12px var(--font-space-mono)', letterSpacing: '0.02em',
            color: 'var(--color-admin-mute-3)',
          }}>
            <dt style={{ color: 'var(--color-admin-mute)' }}>Fichier</dt>
            <dd style={{ margin: 0, color: hasImage ? 'var(--color-admin-ink)' : 'var(--color-admin-mute-2)' }}>
              {hasImage ? (dropZoneRef.current?.getFile()?.name ?? '—') : 'aucun fichier'}
            </dd>
            <dt style={{ color: 'var(--color-admin-mute)' }}>Variantes</dt>
            <dd style={{ margin: 0 }}>{hasImage ? '4096 / 2048 / 1024 / 320 px — WebP' : '—'}</dd>
          </dl>
        </div>

        {/* ── Colonne formulaire ────────────────────────────────────── */}
        <div style={{
          padding: '28px 32px',
          background: '#fff',
          maxHeight: 'calc(100vh - 120px)',
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* Section 01 — Identité */}
          <Section title="Identité" step="01 / 04">
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Titre" error={errFor('title')} required>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markEditing() }}
                  placeholder="Sans titre"
                  aria-invalid={!!errFor('title')}
                />
              </Field>

              <div className="row-2">
                <Field label="Type">
                  <TypeSegmented
                    types={artworkTypes}
                    value={typeId}
                    onChange={(v) => { setTypeId(v); markEditing() }}
                  />
                </Field>
                <Field label="Année" error={errFor('year')}>
                  <input
                    className="input input--mono"
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
                      markEditing()
                    }}
                    placeholder={String(new Date().getFullYear())}
                    aria-invalid={!!errFor('year')}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Section 02 — Format & médium */}
          <Section title="Format & médium" step="02 / 04">
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Médium" hint="Saisie libre — un seul matériau principal suffit.">
                <input
                  className="input"
                  value={medium}
                  onChange={(e) => { setMedium(e.target.value); markEditing() }}
                  placeholder="Encre de Chine, huile sur toile, aquarelle…"
                  list="medium-suggestions"
                />
                <datalist id="medium-suggestions">
                  {mediums.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </Field>

              <Field
                label="Dimensions"
                error={errFor('widthCm') ?? errFor('heightCm')}
                hint="Largeur × hauteur, à plat."
              >
                <div className="dim-input">
                  <input
                    className="input input--mono"
                    inputMode="decimal"
                    placeholder="—"
                    value={widthCm}
                    onChange={(e) => { setWidthCm(e.target.value); markEditing() }}
                    aria-label="Largeur en cm"
                  />
                  <span className="x">×</span>
                  <input
                    className="input input--mono"
                    inputMode="decimal"
                    placeholder="—"
                    value={heightCm}
                    onChange={(e) => { setHeightCm(e.target.value); markEditing() }}
                    aria-label="Hauteur en cm"
                  />
                  <span className="unit">cm</span>
                </div>
              </Field>
            </div>
          </Section>

          {/* Section 03 — Édition */}
          <Section title="Édition" step="03 / 04">
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Statut">
                <StatusSegmented
                  value={saleStatus}
                  onChange={(v) => { setSaleStatus(v); markEditing() }}
                />
              </Field>

              <Field label="Prix de base" hint="Plancher en dessous duquel l'offre est refusée. Modifiable plus tard.">
                <div className="price-input">
                  <input
                    className="input input--mono"
                    inputMode="numeric"
                    placeholder="0"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value.replace(/[^\d]/g, ''))
                      markEditing()
                    }}
                    aria-label="Prix de base en euros"
                    style={{ paddingRight: 28 }}
                  />
                  <span className="suffix">€</span>
                </div>
              </Field>
            </div>
          </Section>

          {/* Section 04 — Texte & classement */}
          <Section title="Texte & classement" step="04 / 04">
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Description" hint="Affichée en italique sur la page publique de l'œuvre.">
                <textarea
                  className="textarea"
                  rows={4}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markEditing() }}
                />
              </Field>

              <Field label="Tags" hint="Entrée ou virgule pour valider. Sert au tri interne uniquement.">
                <TagInput
                  tags={tags}
                  onChange={(v) => { setTags(v); markEditing() }}
                />
              </Field>
            </div>
          </Section>

          {/* ── Barre d'action sticky ──────────────────────────────── */}
          <div className="actionbar">
            <button type="button" className="btn btn--link" onClick={resetForm}>
              Réinitialiser
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleSave}
                disabled={isBusy}
              >
                {saveStatus === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={isBusy}
                style={{
                  appearance: 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, minHeight: 40, padding: '10px 16px',
                  background: isBusy ? 'var(--color-admin-mute)' : 'var(--color-orange)',
                  color: '#fff', border: 0, cursor: isBusy ? 'not-allowed' : 'pointer',
                  font: '600 14px var(--font-geist-sans), sans-serif',
                  transition: 'background .12s',
                }}
              >
                {saveStatus === 'publishing' ? 'Publication…' : 'Publier & suivante'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', bottom: 24, right: 24,
            padding: '12px 16px',
            background: toast.kind === 'error' ? 'var(--badge-failed-bg)' : 'var(--badge-published-bg)',
            color: toast.kind === 'error' ? 'var(--badge-failed-fg)' : 'var(--badge-published-fg)',
            border: `1px solid ${toast.kind === 'error' ? 'rgba(220,38,38,0.25)' : 'rgba(21,128,61,0.25)'}`,
            font: '600 13px var(--font-geist-sans), sans-serif',
            maxWidth: 360,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            zIndex: 50,
          }}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
