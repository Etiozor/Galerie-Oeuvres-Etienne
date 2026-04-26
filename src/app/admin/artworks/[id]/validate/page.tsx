/**
 * Page de validation pipeline — /admin/artworks/[id]/validate.
 *
 * POURQUOI Server Component pour le parent ?
 * Les images et les données de l'œuvre viennent de la DB — rendu serveur optimal.
 * Le Server Component effectue l'auth check, la requête DB, et prépare les URLs.
 * Il n'a pas accès aux hooks React (useState, useTransition) — délégué au Client Component.
 *
 * POURQUOI un Client Component enfant pour les boutons ?
 * Les boutons doivent gérer :
 * 1. Un état de chargement (isPending via useTransition) — client uniquement
 * 2. La modale AlertDialog (état open/closed) — client uniquement
 *
 * Pattern : Server Component passe les URLs et les actions bindées au Client Component.
 * Les actions sont bindées côté serveur avec l'ID de l'œuvre — l'ID n'est jamais
 * exposé directement comme input client (T-02-15).
 *
 * Guard pipelineState (T-02-14) :
 * Cette page est inaccessible si l'œuvre n'est pas en AWAITING_VALIDATION.
 * Cela empêche de valider/rejeter une œuvre déjà publiée ou encore en traitement.
 */
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import { approveArtwork, publishRaw, rejectArtwork } from '@/actions/validation'
import { ValidationActions } from './_components/ValidationActions'

/**
 * Page de validation côte à côte — original (gauche) / corrigé (droite).
 *
 * L'artiste compare les deux versions avant de prendre une décision définitive.
 * Trois actions : Approuver, Publier l'original (sans correction), ou Rejeter.
 */
export default async function ValidatePage({
  params,
}: {
  /** Next.js 15 : params est une Promise — doit être await-é */
  params: Promise<{ id: string }>
}) {
  // ── 1. Next.js 15 : await des paramètres de route ──
  const { id } = await params
  const artworkId = parseInt(id, 10)

  // ── 2. Auth — redirection si non connecté ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  // ── 3. Récupérer l'œuvre depuis la DB ──
  const artwork = await db.query.artworks.findFirst({
    where: eq(artworks.id, artworkId),
  })
  // 404 si l'ID n'existe pas
  if (!artwork) notFound()

  // ── 4. Guard pipelineState (T-02-14) ──
  // L'écran de validation n'est accessible que pour les œuvres en AWAITING_VALIDATION.
  // Cela évite d'afficher l'écran pour une œuvre déjà publiée ou encore en traitement.
  if (artwork.pipelineState !== 'awaiting_validation') {
    redirect('/admin/artworks')
  }

  // ── 5. Construire les URLs des images via StorageProvider ──
  // getUrl() retourne l'URL publique selon l'environnement (local → /api/uploads/..., prod → R2)
  const storage = getStorage()
  const originalUrl = artwork.originalPath ? storage.getUrl(artwork.originalPath) : null
  const processedUrl = artwork.processedPath ? storage.getUrl(artwork.processedPath) : null

  // ── 6. Binder l'ID aux Server Actions ──
  // POURQUOI .bind(null, artwork.id) ?
  // Les formulaires Next.js 15 passent les actions sans argument.
  // .bind() crée une version de la fonction avec artworkId pré-rempli côté serveur.
  // L'ID ne transite jamais en clair dans les données du formulaire client.
  const approveWithId = approveArtwork.bind(null, artwork.id)
  const publishRawWithId = publishRaw.bind(null, artwork.id)
  const rejectWithId = rejectArtwork.bind(null, artwork.id)

  return (
    <main style={{ padding: '48px 16px', fontFamily: 'var(--font-geist-sans)' }}>
      {/* ── Titre de page — Display 28px / 600 (UI-SPEC Typography) ── */}
      <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>
        Valider la correction
      </h1>

      {/* ── Comparaison côte à côte — D-03 : original gauche, corrigé droite ── */}
      {/* grid responsive : 2 colonnes sur desktop, 1 sur mobile (auto-fit) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',          // gap-xl = 32px (UI-SPEC spacing)
          marginBottom: '32px',
          backgroundColor: '#f5f5f5', // fond secondaire UI-SPEC
          padding: '24px',
          borderRadius: '8px',
        }}
      >
        {/* ── Colonne gauche : Image originale ── */}
        <div>
          {/* Label "Original" — Label 14px / 600 (UI-SPEC) */}
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#171717' }}>
            Original
          </p>
          {originalUrl ? (
            <img
              src={originalUrl}
              alt="Image originale"
              aria-label="Image originale avant correction"
              style={{ width: '100%', height: 'auto', borderRadius: '4px', display: 'block' }}
            />
          ) : (
            <div style={{ padding: '24px', color: '#737373', textAlign: 'center' }}>
              Image originale non disponible
            </div>
          )}
        </div>

        {/* ── Colonne droite : Image corrigée ── */}
        <div>
          {/* Label "Version corrigée" — UI-SPEC copywriting exact */}
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#171717' }}>
            Version corrigée
          </p>
          {processedUrl ? (
            <img
              src={processedUrl}
              alt="Image après correction par le pipeline"
              aria-label="Image corrigée par le pipeline (rotation EXIF, normalisation, balance des blancs)"
              style={{ width: '100%', height: 'auto', borderRadius: '4px', display: 'block' }}
            />
          ) : (
            <div style={{ padding: '24px', color: '#737373', textAlign: 'center' }}>
              Image traitée non disponible
            </div>
          )}
        </div>
      </div>

      {/* ── Actions de validation — Client Component pour loading + modale ── */}
      <ValidationActions
        approveAction={approveWithId}
        publishRawAction={publishRawWithId}
        rejectAction={rejectWithId}
      />
    </main>
  )
}
