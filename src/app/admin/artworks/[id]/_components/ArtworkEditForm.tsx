'use client'

/**
 * Formulaire d'édition des métadonnées d'une œuvre — Admin.
 *
 * POURQUOI un Client Component ?
 * useActionState nécessite un hook React — impossible dans un Server Component.
 * Le formulaire doit réagir aux erreurs retournées par updateArtwork (Zod par champ).
 *
 * POURQUOI les données DB sont passées en props et non re-fetchées ici ?
 * Le Server Component parent charge les données — le Client Component les reçoit.
 * Évite un double fetch et garde la logique DB côté serveur. (pattern D-09)
 *
 * POURQUOI updateAction est une prop et non importée directement ?
 * La Server Action est bindée avec l'artworkId dans le Server Component parent :
 * `const updateArtworkWithId = updateArtwork.bind(null, artwork.id)`
 * Cela garantit que l'artworkId ne peut pas être falsifié par le client (T-05-02-03).
 *
 * Structure du formulaire (UI-SPEC.md section 05-02) :
 * 1. Section Métadonnées : titre, date, type, médium (2 colonnes), dimensions (2 colonnes), description
 * 2. Section Prix : basePrice + 6 facteurs de décomposition (libellés de PriceBreakdown.tsx)
 * 3. Bouton "Enregistrer les modifications"
 *
 * Design (D-03) : AUCUN border-radius — zéro coins arrondis sur tous les éléments.
 * Typographie admin : fontFamily var(--font-geist-sans) sur les labels et inputs.
 */

import { useActionState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Résultat retourné par la Server Action updateArtwork.
 * Compatible avec useActionState — state initial null.
 */
type UpdateArtworkResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> }

/**
 * Props du composant ArtworkEditForm.
 *
 * POURQUOI des props `initial*` et pas les données brutes de l'œuvre ?
 * Les colonnes numeric Drizzle arrivent comme string | null en TypeScript.
 * Passer directement les champs de l'œuvre permettrait des types incorrects.
 * En nommant explicitement `initialWidthCm: string | null`, le parent sait exactement
 * quel type il doit passer, et le formulaire sait exactement ce qu'il reçoit.
 */
interface ArtworkEditFormProps {
  /**
   * Server Action bindée avec artworkId depuis le parent.
   * Exemple dans page.tsx : `const updateArtworkWithId = updateArtwork.bind(null, artwork.id)`
   */
  updateAction: (prevState: unknown, formData: FormData) => Promise<UpdateArtworkResult>

  // ── Valeurs initiales pour pré-remplir les champs ──

  /** Titre de l'œuvre — obligatoire (au moins 1 caractère) */
  initialTitle: string

  /** Description longue — null si non renseignée */
  initialDescription: string | null

  /**
   * Date de création au format YYYY-MM-DD pour input type="date".
   * Le Server Component parent convertit le timestamp DB :
   * `new Date(artwork.createdDate).toISOString().split('T')[0]`
   */
  initialCreatedDate: string | null

  /** ID du type sélectionné — null si non défini */
  initialTypeId: number | null

  /** ID du médium sélectionné — null si non défini */
  initialMediumId: number | null

  /**
   * Colonnes numeric Drizzle — arrivent comme string | null en TypeScript.
   * Affiché tel quel dans les inputs (pas de reformatage nécessaire).
   */
  initialWidthCm: string | null
  initialHeightCm: string | null
  initialBasePrice: string | null
  initialPriceHoursSpent: string | null
  initialPriceFormat: string | null
  initialPriceFraming: string | null
  initialPriceMaterials: string | null

  /**
   * Colonnes smallint Drizzle — arrivent comme number | null en TypeScript.
   * Scores de 1 à 5. PAS de .toString() en lecture (contrairement aux numeric).
   */
  initialPriceTechnicality: number | null
  initialPriceAttachment: number | null

  /** Options pour les selects — chargées en parallèle par le Server Component parent */
  artworkTypes: Array<{ id: number; name: string }>
  mediums: Array<{ id: number; name: string }>
}

// ── Styles partagés ──────────────────────────────────────────────────────────

/** Style commun pour les labels au-dessus des champs */
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'var(--font-geist-sans)',
  color: '#171717',
  marginBottom: '6px',
}

/** Style commun pour les inputs texte et number */
const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  padding: '0 12px',
  fontFamily: 'var(--font-geist-sans)',
  fontSize: '13px',
  color: '#171717',
  backgroundColor: '#ffffff',
  border: '1px solid #d4d4d4',
  borderRadius: 0,  // D-03 : ZERO coins arrondis
  boxSizing: 'border-box',
}

/** Style commun pour les selects */
const selectStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  padding: '0 12px',
  fontFamily: 'var(--font-geist-sans)',
  fontSize: '13px',
  color: '#171717',
  backgroundColor: '#ffffff',
  border: '1px solid #d4d4d4',
  borderRadius: 0,  // D-03 : ZERO coins arrondis
  boxSizing: 'border-box',
  cursor: 'pointer',
}

/** Style pour les messages d'erreur par champ (Zod) */
const fieldErrorStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space-mono)',
  fontSize: '11px',
  color: '#bc4b51',
  margin: '4px 0 0 0',
}

// ── Composant ─────────────────────────────────────────────────────────────────

/**
 * ArtworkEditForm — Formulaire d'édition complet des métadonnées d'une œuvre.
 *
 * 15 champs répartis en 2 sections :
 * - Métadonnées : titre, date, type, médium, dimensions (L × H), description
 * - Prix : prix de base + 6 facteurs de décomposition
 *
 * Erreurs affichées en rouge (#bc4b51) au-dessous de chaque champ concerné.
 * Message de succès en vert (#5b8e7d) après enregistrement.
 */
export function ArtworkEditForm({
  updateAction,
  initialTitle,
  initialDescription,
  initialCreatedDate,
  initialTypeId,
  initialMediumId,
  initialWidthCm,
  initialHeightCm,
  initialBasePrice,
  initialPriceHoursSpent,
  initialPriceFormat,
  initialPriceFraming,
  initialPriceMaterials,
  initialPriceTechnicality,
  initialPriceAttachment,
  artworkTypes,
  mediums,
}: ArtworkEditFormProps) {
  /**
   * useActionState remplace l'ancien useFormState (déprécié React 19).
   * - formAction : passer à <form action={...}>
   * - state : résultat de updateAction ({ success: true } | { success: false; errors: {...} })
   * - isPending : true pendant l'envoi (pour désactiver le bouton)
   *
   * État initial null = aucune soumission encore.
   */
  const [state, formAction, isPending] = useActionState(updateAction, null)

  return (
    <form action={formAction}>

      {/* ── Erreur globale _form (erreur serveur, non autorisé, etc.) ── */}
      {state && !state.success && state.errors?._form && (
        <div
          role="alert"
          style={{
            backgroundColor: 'rgba(188, 75, 81, 0.1)',
            border: '1px solid rgba(188, 75, 81, 0.4)',
            padding: '8px 12px',
            marginBottom: '16px',
            borderRadius: 0,  // D-03
          }}
        >
          {state.errors._form.map((err, i) => (
            <p
              key={i}
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                color: '#bc4b51',
                margin: 0,
              }}
            >
              {err}
            </p>
          ))}
        </div>
      )}

      {/* ── Message de succès ── */}
      {state?.success && (
        <p
          role="status"
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontSize: '14px',
            color: '#5b8e7d',
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: 'rgba(91, 142, 125, 0.1)',
            border: '1px solid rgba(91, 142, 125, 0.4)',
            borderRadius: 0,  // D-03
          }}
        >
          Modifications enregistrées.
        </p>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 : Métadonnées
          ══════════════════════════════════════════════════════════════ */}
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          fontFamily: 'var(--font-geist-sans)',
          color: '#171717',
          marginBottom: '20px',
          marginTop: 0,
        }}
      >
        Métadonnées
      </h2>

      {/* Grille 2 colonnes sur desktop pour les champs courts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* ── Titre ── */}
        <div>
          <label htmlFor="title" style={labelStyle}>
            Titre <span style={{ color: '#bc4b51' }}>*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={initialTitle}
            placeholder="Sans titre"
            style={inputStyle}
          />
          {/* Erreur Zod sur le champ title */}
          {state && !state.success && state.errors?.title && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.title[0]}
            </p>
          )}
        </div>

        {/* ── Date de création ── */}
        <div>
          <label htmlFor="createdDate" style={labelStyle}>
            Date de création
          </label>
          <input
            id="createdDate"
            name="createdDate"
            type="date"
            defaultValue={initialCreatedDate ?? ''}
            style={inputStyle}
          />
          {state && !state.success && state.errors?.createdDate && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.createdDate[0]}
            </p>
          )}
        </div>

        {/* ── Type (select) ── */}
        <div>
          <label htmlFor="typeId" style={labelStyle}>
            Type
          </label>
          <select
            id="typeId"
            name="typeId"
            defaultValue={initialTypeId ?? ''}
            style={selectStyle}
          >
            <option value="">— Non défini —</option>
            {artworkTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {state && !state.success && state.errors?.typeId && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.typeId[0]}
            </p>
          )}
        </div>

        {/* ── Médium (select) ── */}
        <div>
          <label htmlFor="mediumId" style={labelStyle}>
            Médium
          </label>
          <select
            id="mediumId"
            name="mediumId"
            defaultValue={initialMediumId ?? ''}
            style={selectStyle}
          >
            <option value="">— Non défini —</option>
            {mediums.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {state && !state.success && state.errors?.mediumId && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.mediumId[0]}
            </p>
          )}
        </div>
      </div>

      {/* ── Dimensions (grille 2 colonnes) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div>
          <label htmlFor="widthCm" style={labelStyle}>
            Largeur (cm)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="widthCm"
              name="widthCm"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialWidthCm ?? ''}
              placeholder="ex : 42.5"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              cm
            </span>
          </div>
          {state && !state.success && state.errors?.widthCm && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.widthCm[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="heightCm" style={labelStyle}>
            Hauteur (cm)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="heightCm"
              name="heightCm"
              type="number"
              step="0.1"
              min="0"
              defaultValue={initialHeightCm ?? ''}
              placeholder="ex : 60"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              cm
            </span>
          </div>
          {state && !state.success && state.errors?.heightCm && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.heightCm[0]}
            </p>
          )}
        </div>
      </div>

      {/* ── Description (pleine largeur) ── */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="description" style={labelStyle}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initialDescription ?? ''}
          placeholder="Description de l'œuvre (technique, histoire, anecdote...)"
          style={{
            width: '100%',
            padding: '12px',
            fontFamily: 'var(--font-geist-sans)',
            fontSize: '13px',
            color: '#171717',
            backgroundColor: '#ffffff',
            border: '1px solid #d4d4d4',
            borderRadius: 0,  // D-03 : ZERO coins arrondis
            boxSizing: 'border-box',
            resize: 'vertical',
            minHeight: '100px',
          }}
        />
        {state && !state.success && state.errors?.description && (
          <p role="alert" style={fieldErrorStyle}>
            {state.errors.description[0]}
          </p>
        )}
      </div>

      {/* ── Séparateur visuel ── */}
      <hr
        style={{
          border: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          margin: '24px 0',
        }}
      />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 : Prix
          ══════════════════════════════════════════════════════════════ */}
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 600,
          fontFamily: 'var(--font-geist-sans)',
          color: '#171717',
          marginBottom: '20px',
          marginTop: 0,
        }}
      >
        Prix de base
      </h2>

      {/* ── Prix de base ── */}
      <div style={{ marginBottom: '16px', maxWidth: '320px' }}>
        <label htmlFor="basePrice" style={labelStyle}>
          Prix de base
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id="basePrice"
            name="basePrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initialBasePrice ?? ''}
            placeholder="ex : 350"
            style={inputStyle}
          />
          <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
            €
          </span>
        </div>
        {state && !state.success && state.errors?.basePrice && (
          <p role="alert" style={fieldErrorStyle}>
            {state.errors.basePrice[0]}
          </p>
        )}
      </div>

      {/* ── Décomposition du prix (6 facteurs — libellés de PriceBreakdown.tsx) ── */}
      {/*
       * POURQUOI ces libellés précisément ?
       * Ils sont extraits de PriceBreakdown.tsx (référence D-08) pour assurer la cohérence
       * entre ce que l'artiste saisit en admin et ce que le visiteur voit côté public.
       * "Temps de travail", "Format / Dimensions", "Encadrement", "Matériaux",
       * "Complexité technique", "Attachement" sont les 6 labels de PriceBreakdown.
       */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* ── Temps de travail ── */}
        <div>
          <label htmlFor="priceHoursSpent" style={labelStyle}>
            Temps de travail
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="priceHoursSpent"
              name="priceHoursSpent"
              type="number"
              step="0.5"
              min="0"
              defaultValue={initialPriceHoursSpent ?? ''}
              placeholder="ex : 200"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              € (temps de travail)
            </span>
          </div>
          {state && !state.success && state.errors?.priceHoursSpent && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.priceHoursSpent[0]}
            </p>
          )}
        </div>

        {/* ── Format / Dimensions ── */}
        <div>
          <label htmlFor="priceFormat" style={labelStyle}>
            Format / Dimensions
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="priceFormat"
              name="priceFormat"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialPriceFormat ?? ''}
              placeholder="ex : 50"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              € (format/dimensions)
            </span>
          </div>
          {state && !state.success && state.errors?.priceFormat && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.priceFormat[0]}
            </p>
          )}
        </div>

        {/* ── Encadrement ── */}
        <div>
          <label htmlFor="priceFraming" style={labelStyle}>
            Encadrement
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="priceFraming"
              name="priceFraming"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialPriceFraming ?? ''}
              placeholder="0 si non encadré"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              € (encadrement)
            </span>
          </div>
          {state && !state.success && state.errors?.priceFraming && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.priceFraming[0]}
            </p>
          )}
        </div>

        {/* ── Matériaux ── */}
        <div>
          <label htmlFor="priceMaterials" style={labelStyle}>
            Matériaux
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="priceMaterials"
              name="priceMaterials"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialPriceMaterials ?? ''}
              placeholder="ex : 20"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              € (matériaux)
            </span>
          </div>
          {state && !state.success && state.errors?.priceMaterials && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.priceMaterials[0]}
            </p>
          )}
        </div>

        {/* ── Complexité technique (score 1-5, smallint) ── */}
        <div>
          <label htmlFor="priceTechnicality" style={labelStyle}>
            Complexité technique
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="priceTechnicality"
              name="priceTechnicality"
              type="number"
              min="1"
              max="5"
              step="1"
              defaultValue={initialPriceTechnicality ?? ''}
              placeholder="1 à 5"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              / 5 (complexité technique)
            </span>
          </div>
          {state && !state.success && state.errors?.priceTechnicality && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.priceTechnicality[0]}
            </p>
          )}
        </div>

        {/* ── Attachement sentimental (score 1-5, smallint) ── */}
        <div>
          <label htmlFor="priceAttachment" style={labelStyle}>
            Attachement
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="priceAttachment"
              name="priceAttachment"
              type="number"
              min="1"
              max="5"
              step="1"
              defaultValue={initialPriceAttachment ?? ''}
              placeholder="1 à 5"
              style={inputStyle}
            />
            <span style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '13px', color: '#525252', whiteSpace: 'nowrap' }}>
              / 5 (attachement artiste)
            </span>
          </div>
          {state && !state.success && state.errors?.priceAttachment && (
            <p role="alert" style={fieldErrorStyle}>
              {state.errors.priceAttachment[0]}
            </p>
          )}
        </div>
      </div>

      {/* ── Bouton submit ── */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          height: '44px',  // WCAG 2.5.5 : cible tactile minimum
          backgroundColor: isPending ? '#a3a3a3' : '#171717',
          color: '#ffffff',
          fontFamily: 'var(--font-geist-sans)',
          fontSize: '14px',
          fontWeight: 600,
          border: 'none',
          borderRadius: 0,  // D-03 : ZERO coins arrondis
          cursor: isPending ? 'not-allowed' : 'pointer',
          padding: '0 24px',
          minWidth: '240px',
        }}
      >
        {isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
      </button>
    </form>
  )
}
