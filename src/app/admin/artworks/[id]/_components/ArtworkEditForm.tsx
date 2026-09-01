'use client'

/**
 * Formulaire d'édition des métadonnées d'une œuvre — Admin.
 *
 * POURQUOI un Client Component ?
 * useActionState nécessite un hook React — impossible dans un Server Component.
 * useState est aussi nécessaire pour les pills médium multi-sélection.
 *
 * Structure :
 * - Section principale (6 colonnes) : date, type, largeur, hauteur, prix de base
 * - Pills médiums : multi-sélection sur liste fixe de 5 médiums
 * - Section "Composantes du prix" (dépliable) : 6 facteurs de décomposition
 */

import { useActionState, useState } from 'react'

type UpdateArtworkResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> }

interface ArtworkEditFormProps {
  updateAction: (prevState: unknown, formData: FormData) => Promise<UpdateArtworkResult>
  initialCreatedYear: number | null
  initialCreatedMonth: number | null
  initialTypeId: number | null
  /** IDs des médiums actuellement associés à l'œuvre (peut être vide) */
  initialMediumIds: number[]
  initialWidthCm: string | null
  initialHeightCm: string | null
  initialDimensionUnit: string | null
  initialBasePrice: string | null
  initialPriceCurrency: string | null
  initialPriceHoursSpent: string | null
  initialPriceFormat: string | null
  initialPriceFraming: string | null
  initialPriceMaterials: string | null
  initialPriceTechnicality: number | null
  initialPriceAttachment: number | null
  artworkTypes: Array<{ id: number; name: string }>
  mediums: Array<{ id: number; name: string }>
}

// ── Styles partagés ──────────────────────────────────────────────────────────

const eyebrowStyle: React.CSSProperties = {
  font: '400 11px var(--font-space-mono)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-ink-muted)',
  marginBottom: 6,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  padding: '8px 12px',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.14)',
  borderRadius: 'var(--radius-sm)',
  font: '400 14px var(--font-space-mono)',
  color: 'var(--color-ink)',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  padding: '8px 36px 8px 12px',
  background: "#fff url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23737373' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\") no-repeat right 12px center",
  border: '1px solid rgba(0,0,0,0.14)',
  borderRadius: 'var(--radius-sm)',
  font: '400 14px var(--font-geist-sans)',
  color: 'var(--color-ink)',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  boxSizing: 'border-box',
}

const fieldErrorStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space-mono)',
  fontSize: 11,
  color: 'var(--color-red)',
  margin: '4px 0 0',
}

// Champ avec suffixe (cm, €, h) — suffix peut être un nœud React (ex: un <select>)
function InputWithSuffix({
  id, name, type = 'number', suffix, suffixNode, defaultValue, placeholder, step, min, max,
  error,
}: {
  id: string; name: string; type?: string; suffix?: string; suffixNode?: React.ReactNode
  defaultValue?: string | number | null
  placeholder?: string; step?: string; min?: string; max?: string; error?: string
}) {
  const suffixStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 12px',
    background: '#fafafa',
    border: '1px solid rgba(0,0,0,0.14)',
    borderLeft: 0,
    borderRadius: `0 var(--radius-sm) var(--radius-sm) 0`,
    font: '400 12px var(--font-space-mono)',
    letterSpacing: '0.05em',
    color: 'var(--color-ink-muted)',
    whiteSpace: 'nowrap',
  }
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={eyebrowStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
        <input
          id={id}
          name={id}
          type={type}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          style={{
            ...inputStyle,
            borderRadius: `var(--radius-sm) 0 0 var(--radius-sm)`,
          }}
        />
        {suffixNode
          ? suffixNode
          : <span style={suffixStyle}>{suffix}</span>
        }
      </div>
      {error && <p role="alert" style={fieldErrorStyle}>{error}</p>}
    </label>
  )
}

function Field({
  id, label, children, span = 1, error,
}: {
  id?: string; label: string; children: React.ReactNode; span?: number; error?: string
}) {
  return (
    <div style={{ gridColumn: `span ${span}`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {id ? (
        <label htmlFor={id} style={eyebrowStyle}>{label}</label>
      ) : (
        <span style={eyebrowStyle}>{label}</span>
      )}
      {children}
      {error && <p role="alert" style={fieldErrorStyle}>{error}</p>}
    </div>
  )
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function ArtworkEditForm({
  updateAction,
  initialCreatedYear,
  initialCreatedMonth,
  initialTypeId,
  initialMediumIds,
  initialWidthCm,
  initialHeightCm,
  initialDimensionUnit,
  initialBasePrice,
  initialPriceCurrency,
  initialPriceHoursSpent,
  initialPriceFormat,
  initialPriceFraming,
  initialPriceMaterials,
  initialPriceTechnicality,
  initialPriceAttachment,
  artworkTypes,
  mediums,
}: ArtworkEditFormProps) {
  const [state, formAction, isPending] = useActionState(updateAction, null)
  const [priceOpen, setPriceOpen] = useState(false)
  const [selectedMediumIds, setSelectedMediumIds] = useState<number[]>(initialMediumIds)
  const [dimensionUnit, setDimensionUnit] = useState(initialDimensionUnit ?? 'cm')
  const [priceCurrency, setPriceCurrency] = useState(initialPriceCurrency ?? 'EUR')

  function toggleMedium(id: number) {
    setSelectedMediumIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const err = (field: string) =>
    (state && !state.success && state.errors?.[field]?.[0]) || undefined

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: '22px 20px',
    padding: 28,
    background: 'var(--color-surface)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 'var(--radius-sm)',
  }

  return (
    <form action={formAction}>
      {/*
       * Grille responsive : 6 colonnes sur desktop, 2 colonnes sur mobile.
       * !important nécessaire pour override le gridTemplateColumns appliqué en style inline.
       * POURQUOI 2 colonnes et pas 1 ? Mois + Année côte à côte restent lisibles.
       */}
      <style>{`
        @media (max-width: 768px) {
          .artwork-edit-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            padding: 20px 16px !important;
          }
        }
      `}</style>

      {/* ── Erreur globale ── */}
      {state && !state.success && state.errors?._form && (
        <div role="alert" style={{ backgroundColor: 'rgba(188,75,81,0.08)', border: '1px solid rgba(188,75,81,0.3)', padding: '8px 12px', marginBottom: 16, borderRadius: 'var(--radius-sm)' }}>
          {state.errors._form.map((err, i) => (
            <p key={i} style={{ fontFamily: 'var(--font-space-mono)', fontSize: 11, color: 'var(--color-red)', margin: 0 }}>{err}</p>
          ))}
        </div>
      )}

      {/* ── Succès ── */}
      {state?.success && (
        <p role="status" style={{ fontSize: 14, color: 'var(--color-teal)', marginBottom: 16, padding: '8px 12px', backgroundColor: 'rgba(91,142,125,0.08)', border: '1px solid rgba(91,142,125,0.3)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-geist-sans)' }}>
          Modifications enregistrées.
        </p>
      )}

      {/* ── Grille principale — 6 colonnes ── */}
      <div className="artwork-edit-grid" style={gridStyle}>
        {/* Mois de création — 1 col */}
        <Field id="createdMonth" label="Mois" span={1} error={err('createdMonth')}>
          <select
            id="createdMonth"
            name="createdMonth"
            defaultValue={initialCreatedMonth ?? ''}
            style={selectStyle}
          >
            <option value="">— Non défini —</option>
            {MONTHS_FR.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </Field>

        {/* Année de création — 1 col */}
        <Field id="createdYear" label="Année" span={1} error={err('createdYear')}>
          <input
            id="createdYear"
            name="createdYear"
            type="number"
            min="1900"
            max="2100"
            placeholder="AAAA"
            defaultValue={initialCreatedYear ?? ''}
            style={{ ...inputStyle }}
          />
        </Field>

        {/* Type — 2 col */}
        <Field id="typeId" label="Type" span={2} error={err('typeId')}>
          <select id="typeId" name="typeId" defaultValue={initialTypeId ?? ''} style={selectStyle}>
            <option value="">— Non défini —</option>
            {artworkTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        {/* Médium — 4 col — multi-sélection en pills */}
        <div style={{ gridColumn: 'span 4', minWidth: 0 }}>
          <span style={eyebrowStyle}>Médium</span>
          {/* Inputs cachés — un par médium sélectionné — lus par formData.getAll('mediumId') */}
          {selectedMediumIds.map(id => (
            <input key={id} type="hidden" name="mediumId" value={id} />
          ))}
          {/* Inputs cachés pour unité et devise — contrôlés par les selects ci-dessous */}
          <input type="hidden" name="dimensionUnit" value={dimensionUnit} />
          <input type="hidden" name="priceCurrency" value={priceCurrency} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {mediums.map(m => {
              const active = selectedMediumIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMedium(m.id)}
                  style={{
                    padding: '7px 14px',
                    border: active ? '1px solid var(--color-teal)' : '1px solid rgba(0,0,0,0.14)',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? 'var(--color-teal)' : '#fff',
                    color: active ? '#fff' : 'var(--color-ink)',
                    font: '400 13px var(--font-geist-sans)',
                    cursor: 'pointer',
                    transition: 'background 120ms, border-color 120ms, color 120ms',
                  }}
                >
                  {m.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Largeur — 2 col */}
        <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <InputWithSuffix
            id="widthCm"
            name="Largeur"
            defaultValue={initialWidthCm}
            placeholder="ex : 42.5"
            step="0.1"
            min="0"
            error={err('widthCm')}
            suffixNode={
              <select
                value={dimensionUnit}
                onChange={(e) => setDimensionUnit(e.target.value)}
                aria-label="Unité des dimensions"
                style={{
                  padding: '0 8px',
                  background: '#fafafa',
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderLeft: 0,
                  borderRadius: `0 var(--radius-sm) var(--radius-sm) 0`,
                  font: '400 12px var(--font-space-mono)',
                  color: 'var(--color-ink-muted)',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  minWidth: 46,
                }}
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
                <option value="mm">mm</option>
              </select>
            }
          />
        </div>

        {/* Hauteur — 2 col (partage l'unité choisie dans le select Largeur) */}
        <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <InputWithSuffix
            id="heightCm"
            name="Hauteur"
            suffix={dimensionUnit}
            defaultValue={initialHeightCm}
            placeholder="ex : 60"
            step="0.1"
            min="0"
            error={err('heightCm')}
          />
        </div>

        {/* Prix de base — 2 col */}
        <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <InputWithSuffix
            id="basePrice"
            name="Prix de base"
            defaultValue={initialBasePrice}
            placeholder="ex : 350"
            step="0.01"
            min="0"
            error={err('basePrice')}
            suffixNode={
              <select
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value)}
                aria-label="Devise"
                style={{
                  padding: '0 8px',
                  background: '#fafafa',
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderLeft: 0,
                  borderRadius: `0 var(--radius-sm) var(--radius-sm) 0`,
                  font: '400 12px var(--font-space-mono)',
                  color: 'var(--color-ink-muted)',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  minWidth: 60,
                }}
              >
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
                <option value="CAD">$ CAD</option>
                <option value="GBP">£ GBP</option>
                <option value="CHF">CHF</option>
              </select>
            }
          />
        </div>
      </div>

      {/* ── Composantes du prix — dépliable ── */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: priceOpen ? 16 : 0,
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              font: '400 11px var(--font-space-mono)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-muted)',
            }}>
              Composantes du prix
            </div>
            <p style={{ margin: '6px 0 0', font: '400 13px var(--font-geist-sans)', color: 'var(--color-ink-muted)' }}>
              Facteurs utilisés pour calibrer le prix de base.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPriceOpen(!priceOpen)}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.14)',
              borderRadius: 'var(--radius-sm)',
              font: '600 13px var(--font-geist-sans)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            {priceOpen ? 'Replier  −' : 'Déplier  +'}
          </button>
        </div>

        {/* Les inputs sont toujours dans le DOM pour la soumission, juste masqués */}
        <div className="artwork-edit-grid" style={{ display: priceOpen ? 'grid' : 'none', ...gridStyle, marginTop: 0 }}>
          {/* Heures passées */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <InputWithSuffix id="priceHoursSpent" name="Heures passées" suffix="h" defaultValue={initialPriceHoursSpent} placeholder="ex : 8" step="0.5" min="0" error={err('priceHoursSpent')} />
          </div>

          {/* Format / Dimensions (valeur numérique €) */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <InputWithSuffix id="priceFormat" name="Format / Dimensions" suffix="€" defaultValue={initialPriceFormat} placeholder="ex : 50" step="0.01" min="0" error={err('priceFormat')} />
          </div>

          {/* Encadrement */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <InputWithSuffix id="priceFraming" name="Encadrement" suffix="€" defaultValue={initialPriceFraming} placeholder="0 si non encadré" step="0.01" min="0" error={err('priceFraming')} />
          </div>

          {/* Matériaux */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <InputWithSuffix id="priceMaterials" name="Matériaux" suffix="€" defaultValue={initialPriceMaterials} placeholder="ex : 20" step="0.01" min="0" error={err('priceMaterials')} />
          </div>

          {/* Technicité (score 1–5) */}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <InputWithSuffix id="priceTechnicality" name="Technicité" suffix="/ 5" defaultValue={initialPriceTechnicality} placeholder="1 à 5" step="1" min="1" max="5" error={err('priceTechnicality')} />
          </div>

          {/* Attachement (score 1–5) avec hint */}
          <div style={{ gridColumn: 'span 2', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={eyebrowStyle}>Attachement</span>
            <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
              <input
                id="priceAttachment"
                name="priceAttachment"
                type="number"
                step="1"
                min="1"
                max="5"
                defaultValue={initialPriceAttachment ?? ''}
                placeholder="1 à 5"
                style={{ ...inputStyle, borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)' }}
              />
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '0 12px',
                background: 'var(--color-bg)', border: '1px solid rgba(0,0,0,0.14)', borderLeft: 0,
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                font: '400 12px var(--font-space-mono)', letterSpacing: '0.05em',
                color: 'var(--color-ink-muted)', whiteSpace: 'nowrap',
              }}>/ 5</span>
            </div>
            <span style={{ font: '400 12px var(--font-geist-sans)', color: 'var(--color-ink-muted)' }}>
              Combien vous tenez à cette œuvre.
            </span>
            {err('priceAttachment') && <p role="alert" style={fieldErrorStyle}>{err('priceAttachment')}</p>}
          </div>
        </div>
      </div>

      {/* ── Bouton submit ── */}
      <div style={{ marginTop: 24 }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            height: 44,
            backgroundColor: isPending ? 'var(--color-ink-muted)' : 'var(--color-ink)',
            color: '#fff',
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            padding: '0 24px',
            minWidth: 240,
          }}
        >
          {isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}
