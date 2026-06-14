'use client'

/**
 * DocumenterClient — Interface principale de la page "Documenter une œuvre".
 *
 * Layout split galerie (miroir d'ArtworkDetail) :
 * - Colonne gauche : zone dépôt image + pipeline + méta-fichier, sur --color-bg
 * - Colonne droite : formulaire 4 sections + barre d'action sticky, sur --color-surface
 *
 * Le style visuel suit le langage chaud de la galerie publique (cream + sand,
 * Oswald uppercase, Cormorant italique, Space Mono méta) plutôt que l'admin gris,
 * pour que l'artiste documente dans le même cadre que celui qu'aura le visiteur.
 *
 * Machine d'états :
 *   editing → saving → saved
 *   editing → publishing → published → reset (formulaire vide pour l'œuvre suivante)
 */

import { useRef, useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BackgroundDecor } from '@/components/layout/BackgroundDecor'
import { TypeSegmented } from '@/components/admin/TypeSegmented'
import { StatusSegmented } from '@/components/admin/StatusSegmented'
import { TagInput } from '@/components/admin/TagInput'
import { ImageDropZone, type ImageDropZoneHandle } from '@/components/admin/ImageDropZone'
import { saveArtworkDraft, publishArtwork } from '@/actions/document'
import { AdminHamburgerMenu } from '@/components/layout/AdminHamburgerMenu'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TypeOption { id: number; name: string; slug: string }
interface MediumOption { id: number; name: string }

interface DocumenterClientProps {
  artworkTypes: TypeOption[]
  mediums: MediumOption[]
  userEmail?: string
}

type SaveStatus = 'editing' | 'saving' | 'saved' | 'publishing' | 'published'
type Toast = { kind: 'ok' | 'error'; text: string } | null

// ── Étapes pipeline d'une œuvre ───────────────────────────────────────────────

const PIPELINE_STEPS = [
  { id: 'upload',  label: 'Photo'      },
  { id: 'process', label: 'Traitement' },
  { id: 'review',  label: 'À valider'  },
  { id: 'publish', label: 'Publiée'    },
] as const

type PipelineStage = (typeof PIPELINE_STEPS)[number]['id']

// ── Sous-composants ───────────────────────────────────────────────────────────

/** Indicateur des étapes de traitement de l'œuvre. */
function PipelineStrip({ stage }: { stage: PipelineStage }) {
  const order: PipelineStage[] = ['upload', 'process', 'review', 'publish']
  const i = order.indexOf(stage)
  return (
    <div className="pipeline">
      {PIPELINE_STEPS.map((s, idx) => (
        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
          {idx > 0 && <span className="p-sep" style={{ marginRight: 12, marginLeft: 12 }}>—</span>}
          <span className={`p-step${idx < i ? ' done' : idx === i ? ' current' : ''}`}>
            <span className="p-num">{idx + 1}</span>
            <span>{s.label}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

/** Badge d'état de sauvegarde dans le hero, adapté au langage galerie. */
function GallerySaveBadge({ status }: { status: SaveStatus }) {
  if (status === 'saving' || status === 'publishing') {
    return (
      <span className="save-pill" data-state="busy">
        <span className="dot" />
        {status === 'saving' ? 'Enregistrement…' : 'Publication…'}
      </span>
    )
  }
  if (status === 'editing') {
    return (
      <span className="save-pill" data-state="editing">
        <span className="dot" />
        Modifications non enregistrées
      </span>
    )
  }
  return (
    <span className="save-pill">
      <span className="dot" />
      {status === 'published' ? 'Publiée' : 'Enregistré'}
    </span>
  )
}

/** Section du formulaire avec titre Oswald + numérotation. */
function Section({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <span className="step-num">{step}</span>
      </div>
      {children}
    </section>
  )
}

/** Champ de formulaire avec label Space Mono, hint Cormorant, erreur rouge. */
function Field({
  label, hint, error, required, children,
}: {
  label: string; hint?: string; error?: string | null; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required && <span style={{ color: 'var(--color-red)', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {error
        ? <div className="field-error">{error}</div>
        : hint && <div className="field-hint">{hint}</div>
      }
    </div>
  )
}

/** Bouton de déconnexion intégré dans la nav galerie. */
function GallerySignOutButton() {
  const router = useRouter()
  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.refresh()
    router.push('/admin/login')
  }
  return (
    <button onClick={handleSignOut} className="nav-link">
      Se déconnecter
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function DocumenterClient({ artworkTypes, mediums, userEmail }: DocumenterClientProps) {
  const [artworkId, setArtworkId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState<number | null>(null)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState('')
  const [selectedMediumIds, setSelectedMediumIds] = useState<number[]>([])
  const [widthCm, setWidthCm] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'in' | 'mm'>('cm')
  const [saleStatus, setSaleStatus] = useState<'available' | 'reserved' | 'sold' | 'given'>('available')
  const [price, setPrice] = useState('')
  const [priceCurrency, setPriceCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'CHF'>('EUR')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [hasImage, setHasImage] = useState(false)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('editing')
  const [showErrors, setShowErrors] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [isPending, startTransition] = useTransition()

  const dropZoneRef = useRef<ImageDropZoneHandle>(null)

  const markEditing = useCallback(() => {
    if (saveStatus === 'saved' || saveStatus === 'published') setSaveStatus('editing')
  }, [saveStatus])

  // Toast auto-dismiss (3.2 s)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  // ── Validation ─────────────────────────────────────────────────────────────
  const errors = {
    title:   !title.trim() ? 'Donner un titre, même provisoire.' : null,
    year:    year && !/^\d{4}$/.test(year) ? 'Quatre chiffres.' : null,
    widthCm: widthCm && !/^\d+([.,]\d+)?$/.test(widthCm) ? 'Nombre uniquement.' : null,
    heightCm:heightCm && !/^\d+([.,]\d+)?$/.test(heightCm) ? 'Nombre uniquement.' : null,
    image:   !hasImage ? 'Une photo est requise pour publier.' : null,
  }
  const hasErrors = errors.title !== null || errors.year !== null || errors.widthCm !== null || errors.heightCm !== null
  const errFor = (key: keyof typeof errors) => showErrors ? errors[key] : null

  // ── Collecte FormData ──────────────────────────────────────────────────────
  const buildFormData = (includeFile: boolean): FormData => {
    const fd = new FormData()
    fd.set('title', title)
    fd.set('typeId', typeId !== null ? String(typeId) : '')
    fd.set('year', year)
    fd.set('month', month)
    // Un champ 'mediumId' par médium sélectionné — lus avec formData.getAll('mediumId')
    selectedMediumIds.forEach(id => fd.append('mediumId', String(id)))
    fd.set('widthCm', widthCm)
    fd.set('heightCm', heightCm)
    fd.set('dimensionUnit', dimensionUnit)
    fd.set('status', saleStatus)
    fd.set('basePrice', price)
    fd.set('priceCurrency', priceCurrency)
    fd.set('description', description)
    fd.set('tags', JSON.stringify(tags))
    if (artworkId) fd.set('artworkId', String(artworkId))
    if (includeFile) {
      const file = dropZoneRef.current?.getFile()
      if (file) fd.set('file', file)
    }
    return fd
  }

  // ── Réinitialisation ───────────────────────────────────────────────────────
  const resetForm = () => {
    setArtworkId(null)
    setTitle('')
    setTypeId(null)
    setYear(String(new Date().getFullYear()))
    setMonth('')
    setSelectedMediumIds([])
    setWidthCm('')
    setHeightCm('')
    setDimensionUnit('cm')
    setSaleStatus('available')
    setPrice('')
    setPriceCurrency('EUR')
    setDescription('')
    setTags([])
    setHasImage(false)
    dropZoneRef.current?.reset()
    setShowErrors(false)
    setSaveStatus('editing')
  }

  // ── Action : Enregistrer ───────────────────────────────────────────────────
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

  // ── Action : Publier ───────────────────────────────────────────────────────
  const handlePublish = () => {
    setShowErrors(true)
    if (!hasImage) {
      setToast({ kind: 'error', text: 'Ajoutez une photo avant de publier.' })
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

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="pof-gallery" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <BackgroundDecor />

      {/*
       * Nav galerie — responsive mobile.
       * .pof-gallery .site-nav nav : liens desktop masqués sur ≤768px (globals.css).
       * .doc-nav-hamburger : hamburger visible sur ≤768px uniquement.
       * POURQUOI <style> inline ici et pas seulement globals.css ?
       * .doc-nav-hamburger n'est pas dans globals.css — ajout minimal localisé.
       */}
      <style>{`
        .doc-nav-hamburger { display: none; }
        @media (max-width: 768px) {
          .pof-gallery .site-nav nav { display: none !important; }
          .doc-nav-hamburger { display: flex; align-items: center; }
        }
      `}</style>
      <header className="site-nav">
        <Link href="/" className="brand">
          Galerie POF
          <span className="brand-sub">Administration</span>
        </Link>
        {/* Liens desktop — masqués sur mobile via globals.css + style ci-dessus */}
        <nav>
          <Link href="/admin/artworks" className="nav-link">Mes œuvres</Link>
          <Link href="/admin/upload" className="nav-link is-active">Ajouter</Link>
          <Link href="/admin/artworks" className="nav-link">Offres reçues</Link>
          <GallerySignOutButton />
        </nav>
        {/* Hamburger mobile — visible uniquement sur ≤768px */}
        <div className="doc-nav-hamburger">
          <AdminHamburgerMenu activeHref="/admin/upload" />
        </div>
      </header>

      {/* Hero : fil d'Ariane + titre Oswald + badge état */}
      <div className="hero">
        <div>
          <div className="breadcrumb">
            <Link href="/admin/artworks">← Mes œuvres</Link>
            <span> &nbsp;/&nbsp; </span>
            <span>Nouvelle œuvre</span>
          </div>
          <h1>Documenter une œuvre</h1>
        </div>
        <GallerySaveBadge status={saveStatus} />
      </div>

      {/* Layout split 1fr / 460px */}
      <div className="split">

        {/* ── Colonne image ──────────────────────────────────────────── */}
        <div className="image-col">

          <div className="stage-eyebrow">
            <span>Photographie de l&apos;œuvre</span>
            <span>JPEG / PNG · 20 Mo max · aucun recadrage</span>
          </div>

          {/* Zone de dépôt — styled via .pof-gallery .dropzone */}
          <ImageDropZone
            ref={dropZoneRef}
            onHasImage={setHasImage}
            height={480}
          />

          {/* Pipeline : où en est l'œuvre dans le traitement */}
          <PipelineStrip stage={hasImage ? 'process' : 'upload'} />

          {/* Méta-données du fichier source */}
          <dl className="file-meta">
            <dt>Fichier</dt>
            <dd className={hasImage ? '' : 'is-empty'}>
              {hasImage ? (dropZoneRef.current?.getFile()?.name ?? '—') : 'aucun fichier'}
            </dd>
            <dt>Variantes</dt>
            <dd className={hasImage ? '' : 'is-empty'}>
              {hasImage ? '4096 / 2048 / 1024 / 320 px — WebP' : '—'}
            </dd>
          </dl>
        </div>

        {/* ── Colonne formulaire (info panel, sticky) ────────────────── */}
        <div className="form-col">

          {/* 01 — Identité */}
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
              <Field label="Type">
                <TypeSegmented
                  types={artworkTypes}
                  value={typeId}
                  onChange={(v) => { setTypeId(v); markEditing() }}
                />
              </Field>
              <div className="row-2">
                <Field label="Mois">
                  <select
                    className="input"
                    value={month}
                    onChange={(e) => { setMonth(e.target.value); markEditing() }}
                  >
                    <option value="">— Non défini —</option>
                    <option value="1">Janvier</option>
                    <option value="2">Février</option>
                    <option value="3">Mars</option>
                    <option value="4">Avril</option>
                    <option value="5">Mai</option>
                    <option value="6">Juin</option>
                    <option value="7">Juillet</option>
                    <option value="8">Août</option>
                    <option value="9">Septembre</option>
                    <option value="10">Octobre</option>
                    <option value="11">Novembre</option>
                    <option value="12">Décembre</option>
                  </select>
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

          {/* 02 — Format & médium */}
          <Section title="Format & médium" step="02 / 04">
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Médium" hint="Sélectionnez un ou plusieurs médiums (technique mixte autorisée).">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {mediums.map((m) => {
                    const active = selectedMediumIds.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMediumIds(prev =>
                            prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                          )
                          markEditing()
                        }}
                        style={{
                          padding: '7px 14px',
                          border: active ? '1px solid var(--color-teal)' : 'var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          background: active ? 'var(--color-teal)' : 'var(--color-bg)',
                          color: active ? '#fff' : 'var(--color-ink)',
                          fontFamily: 'var(--font-geist-sans)',
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'background 120ms, border-color 120ms, color 120ms',
                        }}
                      >
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field
                label="Dimensions"
                error={errFor('widthCm') ?? errFor('heightCm')}
                hint="Largeur × hauteur, à plat. Pour un dessin sur cahier, prendre la feuille."
              >
                <div className="dim-input">
                  <input
                    className="input input--mono"
                    inputMode="decimal"
                    placeholder="—"
                    value={widthCm}
                    onChange={(e) => { setWidthCm(e.target.value); markEditing() }}
                    aria-label="Largeur"
                    aria-invalid={!!errFor('widthCm')}
                  />
                  <span className="x">×</span>
                  <input
                    className="input input--mono"
                    inputMode="decimal"
                    placeholder="—"
                    value={heightCm}
                    onChange={(e) => { setHeightCm(e.target.value); markEditing() }}
                    aria-label="Hauteur"
                    aria-invalid={!!errFor('heightCm')}
                  />
                  <select
                    className="unit"
                    value={dimensionUnit}
                    onChange={(e) => { setDimensionUnit(e.target.value as 'cm' | 'in' | 'mm'); markEditing() }}
                    aria-label="Unité des dimensions"
                    style={{
                      background: 'var(--color-bg)',
                      border: 'var(--border-hairline)',
                      borderLeft: 0,
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                      font: '400 12px var(--font-space-mono)',
                      color: 'var(--color-ink-muted)',
                      cursor: 'pointer',
                      padding: '0 8px',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                    }}
                  >
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                  </select>
                </div>
              </Field>
            </div>
          </Section>

          {/* 03 — Édition */}
          <Section title="Édition" step="03 / 04">
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Statut">
                <StatusSegmented
                  value={saleStatus}
                  onChange={(v) => { setSaleStatus(v); markEditing() }}
                />
              </Field>
              <Field
                label="Prix de base"
                hint="Plancher indicatif en dessous duquel une offre est signalée. Modifiable plus tard."
              >
                <div className="price-input" style={{ display: 'flex', alignItems: 'stretch' }}>
                  <input
                    className="input input--mono"
                    inputMode="decimal"
                    placeholder="0"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value.replace(/[^\d.,]/g, ''))
                      markEditing()
                    }}
                    aria-label="Prix de base"
                    style={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', borderRight: 0 }}
                  />
                  <select
                    value={priceCurrency}
                    onChange={(e) => { setPriceCurrency(e.target.value as 'EUR' | 'USD' | 'GBP' | 'CHF'); markEditing() }}
                    aria-label="Devise"
                    style={{
                      padding: '0 10px',
                      background: '#fafafa',
                      border: 'var(--border-hairline)',
                      borderLeft: 0,
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                      font: '400 12px var(--font-space-mono)',
                      color: 'var(--color-ink-muted)',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      minWidth: 52,
                    }}
                  >
                    <option value="EUR">€ EUR</option>
                    <option value="USD">$ USD</option>
                    <option value="GBP">£ GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </Field>
            </div>
          </Section>

          {/* 04 — Texte & classement */}
          <Section title="Texte & classement" step="04 / 04">
            <div style={{ display: 'grid', gap: 16 }}>
              <Field
                label="Description"
                hint="Affichée en italique sur la page publique de l'œuvre. Garder bref."
              >
                <textarea
                  className="textarea"
                  rows={4}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markEditing() }}
                  placeholder="Quelques lignes pour le visiteur — où, quand, dans quel état d'esprit."
                />
              </Field>
              <Field
                label="Tags"
                hint="Entrée ou virgule pour valider. Sert au tri interne uniquement."
              >
                <TagInput
                  tags={tags}
                  onChange={(v) => { setTags(v); markEditing() }}
                />
              </Field>
            </div>
          </Section>

          {/* Barre d'action sticky en bas de la colonne formulaire */}
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
                className="btn btn--primary"
                onClick={handlePublish}
                disabled={isBusy}
              >
                {saveStatus === 'publishing' ? 'Publication…' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <a href={`mailto:${userEmail ?? 'contact@galeriepof.fr'}`}>
          {userEmail ?? 'contact@galeriepof.fr'}
        </a>
      </footer>

      {/* Toast feedback */}
      {toast && (
        <div role="status" className={`toast toast--${toast.kind}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
