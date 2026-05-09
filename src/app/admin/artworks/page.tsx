/**
 * Page de liste des œuvres — /admin/artworks.
 *
 * Server Component : la liste est rendue côté serveur à chaque refresh.
 * Le composant PipelinePoller (Client Component) déclenche ces refreshs
 * toutes les 3 secondes si des œuvres sont en PENDING ou PROCESSING.
 *
 * POURQUOI un Server Component et pas un Client Component ?
 * La liste est protégée (artiste uniquement) mais statique en lecture.
 * Rendre côté serveur garantit que les données sont fraîches à chaque visite
 * et évite un useEffect + fetch côté client avec gestion d'état.
 *
 * Architecture de la page :
 * - AdminArtworksPage (Server) : auth check + requête DB + rendu initial
 *   └── PipelinePoller (Client) : polling 3s si hasPendingItems
 *   └── PipelineBadge (Server) : badge coloré par état
 *   └── RetryButton (Client) : bouton avec état loading, appelle retryPipeline
 */
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { artworks } from '@/db/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'
import { PipelineBadge } from './_components/PipelineBadge'
import { PipelinePoller } from './_components/PipelinePoller'
import { RetryButton } from './_components/RetryButton'

export default async function AdminArtworksPage() {
  // ── Auth : même pattern que src/app/admin/page.tsx ──
  // Double vérification : le middleware a déjà bloqué les non-connectés,
  // mais on vérifie de nouveau ici pour la défense en profondeur.
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  // ── Charger toutes les œuvres, plus récentes en premier ──
  // desc(artworks.createdAt) = ordre chronologique inversé (dernière upload en tête)
  const allArtworks = await db
    .select()
    .from(artworks)
    .orderBy(desc(artworks.createdAt))

  // ── Calculer si des œuvres sont en cours de traitement (pour le polling) ──
  // PENDING et PROCESSING sont des états transitoires — ils appellent le polling.
  // AWAITING_VALIDATION, PUBLISHED, FAILED sont des états stables — l'artiste doit agir.
  const hasPendingItems = allArtworks.some(
    (a) => a.pipelineState === 'pending' || a.pipelineState === 'processing'
  )

  return (
    <main style={{ padding: '48px 16px', fontFamily: 'var(--font-geist-sans)', maxWidth: '960px', margin: '0 auto' }}>
      {/* Polling automatique — invisible, déclenche router.refresh() toutes les 3s */}
      {/* Ne polling que si hasPendingItems — sinon le composant ne fait rien */}
      <PipelinePoller hasPendingItems={hasPendingItems} />

      {/* En-tête : titre + bouton upload */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        {/* Titre — Heading (UI-SPEC) */}
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0 }}>
          Mes œuvres
        </h1>
        <Link
          href="/admin/upload"
          style={{
            padding: '10px 20px',
            backgroundColor: '#171717',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Uploader une photo
        </Link>
      </div>

      {/* État vide — texte EXACT de UI-SPEC.md */}
      {allArtworks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#737373' }}>
          <p style={{ fontSize: '16px', marginBottom: '16px' }}>
            Aucune œuvre pour l&apos;instant. Uploader votre première photo pour commencer.
          </p>
          <Link
            href="/admin/upload"
            style={{ color: '#171717', fontWeight: 600, textDecoration: 'underline' }}
          >
            Uploader une photo
          </Link>
        </div>
      )}

      {/* Liste des œuvres */}
      {allArtworks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allArtworks.map((artwork) => (
            <div
              key={artwork.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                flexWrap: 'wrap',
              }}
            >
              {/* Titre de l'œuvre — cliquable pour ouvrir le détail */}
              <Link
                href={`/admin/artworks/${artwork.id}`}
                style={{ flex: 1, fontSize: '16px', minWidth: '120px', color: '#171717', textDecoration: 'none', fontWeight: 500 }}
              >
                {artwork.title}
              </Link>

              {/* Badge d'état pipeline — couleur EXACTE selon UI-SPEC.md */}
              <PipelineBadge state={artwork.pipelineState} />

              {/* Date d'upload */}
              <span style={{ fontSize: '14px', color: '#737373', whiteSpace: 'nowrap' }}>
                {new Date(artwork.createdAt).toLocaleDateString('fr-FR')}
              </span>

              {/* Lien "Valider" si AWAITING_VALIDATION — couleur ambre de UI-SPEC */}
              {artwork.pipelineState === 'awaiting_validation' && (
                <Link
                  href={`/admin/artworks/${artwork.id}/validate`}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#fefce8',
                    color: '#a16207',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid #a1620722',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Valider
                </Link>
              )}

              {/* Bouton "Réessayer" si FAILED (D-09) */}
              {artwork.pipelineState === 'failed' && (
                <RetryButton artworkId={artwork.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
