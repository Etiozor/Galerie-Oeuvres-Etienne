/**
 * Page détail d'une œuvre — /admin/artworks/[id].
 *
 * Affiche toutes les métadonnées d'une œuvre : dimensions, médium, type,
 * statut, état pipeline, chemins de stockage, dates, et aperçu des images.
 *
 * En Phase 5, cette page devient le point central de gestion d'une œuvre :
 * - Informations et images (existant Phase 2)
 * - Changement de statut via StatusChangeForm (nouveau Plan 05-01)
 * - Suppression avec confirmation via DeleteArtworkButton (nouveau Plan 05-01)
 *
 * POURQUOI les actions sont bindées ici et pas dans les composants enfants ?
 * Les composants client ne peuvent pas appeler directement des Server Actions avec
 * un artworkId inconnu. Binder l'ID ici garantit que seul le Server Component
 * authentifié expose des actions pré-liées à l'œuvre courante (T-05-01-01).
 *
 * Server Component : données lues depuis la DB, auth vérifiée côté serveur.
 */
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/db'
import { artworks, artworkTypes, mediums, offers, visitors } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import Link from 'next/link'
import { PipelineBadge } from '../_components/PipelineBadge'
import { updateArtworkStatus, deleteArtwork, updateArtwork } from '@/actions/artworkAdmin'
import { StatusChangeForm } from './_components/StatusChangeForm'
import { DeleteArtworkButton } from './_components/DeleteArtworkButton'
import { ArtworkEditForm } from './_components/ArtworkEditForm'

/**
 * Formate une date en français lisible.
 * Retourne "—" si la date est null.
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // ── 1. Résoudre les params (Next.js 15 async params) ──
  const { id } = await params
  const artworkId = parseInt(id, 10)
  if (isNaN(artworkId)) notFound()

  // ── 2. Auth ──
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  // ── 3. Charger l'œuvre + les options des selects + les offres en parallèle ──
  // POURQUOI Promise.all ? Les quatre requêtes sont indépendantes — les exécuter
  // en parallèle réduit le temps de chargement d'environ 66% (gain DB round-trips).
  const [rows, allTypes, allMediums, offerRows] = await Promise.all([
    db
      .select({
        artwork: artworks,
        type: artworkTypes,
        medium: mediums,
      })
      .from(artworks)
      .leftJoin(artworkTypes, eq(artworks.typeId, artworkTypes.id))
      .leftJoin(mediums, eq(artworks.mediumId, mediums.id))
      .where(eq(artworks.id, artworkId))
      .limit(1),
    // Options pour les selects du formulaire d'édition
    db.select().from(artworkTypes).orderBy(artworkTypes.sortOrder),
    db.select().from(mediums).orderBy(mediums.sortOrder),
    // Offres reçues pour cette œuvre — PRIVÉ admin uniquement (D-11, T-05-03-01)
    // POURQUOI leftJoin visitors ? On veut les coordonnées complètes (phone, email)
    // qui sont des données PII stockées dans la table visitors — jamais exposées en public.
    db
      .select({
        id: offers.id,
        amount: offers.amount,           // string (type numeric Drizzle)
        message: offers.message,
        belowFloor: offers.belowFloor,
        createdAt: offers.createdAt,
        visitorName: visitors.displayName,
        visitorPhone: visitors.phone,    // PRIVÉ — admin uniquement (D-11, T-05-03)
        visitorEmail: visitors.email,
      })
      .from(offers)
      .leftJoin(visitors, eq(offers.visitorId, visitors.id))
      .where(eq(offers.artworkId, artworkId))
      .orderBy(desc(offers.amount)),     // Montant décroissant (D-10) — meilleure offre en premier
  ])

  if (rows.length === 0) notFound()
  const { artwork, type, medium } = rows[0]!

  // ── 4. Construire les URLs des images ──
  const storage = getStorage()
  const originalUrl = artwork.originalPath ? storage.getUrl(artwork.originalPath) : null
  const processedUrl = artwork.processedPath ? storage.getUrl(artwork.processedPath) : null
  const thumbnailUrl = artwork.thumbnailPath ? storage.getUrl(artwork.thumbnailPath) : null

  // ── 5. Binder les Server Actions avec l'artworkId ──
  // POURQUOI .bind(null, artwork.id) ?
  // L'ID est bindé côté serveur — jamais exposé en input client (T-05-01-01, T-05-02-03).
  // Le composant client reçoit une action déjà pré-liée à cet artwork spécifique.
  const updateStatusWithId = updateArtworkStatus.bind(null, artwork.id)
  const deleteWithId = deleteArtwork.bind(null, artwork.id)
  // updateArtwork : bindé avec artworkId — le Client Component ne peut pas falsifier l'ID
  const updateArtworkWithId = updateArtwork.bind(null, artwork.id)

  // Libellés affichés pour les statuts
  const statusLabels: Record<string, string> = {
    available: 'Disponible',
    sold: 'Vendu',
    given: 'Donné',
    reserved: 'Réservé',
  }

  return (
    <main style={{ padding: '48px 16px', fontFamily: 'var(--font-geist-sans)', maxWidth: '960px' }}>

      {/* ── Navigation retour ── */}
      <Link
        href="/admin/artworks"
        style={{ fontSize: '14px', color: '#737373', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}
      >
        ← Retour à la liste
      </Link>

      {/* ── Titre ── */}
      <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: '#171717' }}>
        {artwork.title}
      </h1>

      {/* ── Statut + pipeline ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '32px' }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 0,  // D-03 : zéro coins arrondis
          backgroundColor: artwork.status === 'available' ? '#dcfce7' : '#f5f5f5',
          color: artwork.status === 'available' ? '#15803d' : '#525252',
        }}>
          {statusLabels[artwork.status] ?? artwork.status}
        </span>
        <PipelineBadge state={artwork.pipelineState} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>

        {/* ── Colonne gauche : métadonnées ── */}
        <div>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#171717', borderBottom: '1px solid #e5e5e5', paddingBottom: '8px' }}>
              Informations
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 8px', fontSize: '14px' }}>
              <dt style={{ color: '#737373' }}>Titre</dt>
              <dd style={{ color: '#171717', margin: 0 }}>{artwork.title}</dd>

              <dt style={{ color: '#737373' }}>Type</dt>
              <dd style={{ color: '#171717', margin: 0 }}>{type?.name ?? '—'}</dd>

              <dt style={{ color: '#737373' }}>Médium</dt>
              <dd style={{ color: '#171717', margin: 0 }}>{medium?.name ?? '—'}</dd>

              <dt style={{ color: '#737373' }}>Dimensions</dt>
              <dd style={{ color: '#171717', margin: 0 }}>
                {artwork.widthCm && artwork.heightCm
                  ? `${artwork.widthCm} × ${artwork.heightCm} cm`
                  : '—'}
              </dd>

              <dt style={{ color: '#737373' }}>Prix de base</dt>
              <dd style={{ color: '#171717', margin: 0 }}>
                {artwork.basePrice ? `${artwork.basePrice} €` : '—'}
              </dd>

              <dt style={{ color: '#737373' }}>Date de création</dt>
              <dd style={{ color: '#171717', margin: 0 }}>{formatDate(artwork.createdDate)}</dd>
            </dl>
          </section>

          {artwork.description && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#171717', borderBottom: '1px solid #e5e5e5', paddingBottom: '8px' }}>
                Description
              </h2>
              <p style={{ fontSize: '14px', color: '#525252', lineHeight: '1.6', margin: 0 }}>
                {artwork.description}
              </p>
            </section>
          )}

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#171717', borderBottom: '1px solid #e5e5e5', paddingBottom: '8px' }}>
              Dates système
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 8px', fontSize: '14px' }}>
              <dt style={{ color: '#737373' }}>Upload</dt>
              <dd style={{ color: '#171717', margin: 0 }}>{formatDate(artwork.createdAt)}</dd>

              <dt style={{ color: '#737373' }}>Mis à jour</dt>
              <dd style={{ color: '#171717', margin: 0 }}>{formatDate(artwork.updatedAt)}</dd>

              <dt style={{ color: '#737373' }}>Publié le</dt>
              <dd style={{ color: '#171717', margin: 0 }}>{formatDate(artwork.publishedAt)}</dd>
            </dl>
          </section>

          <section>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#171717', borderBottom: '1px solid #e5e5e5', paddingBottom: '8px' }}>
              Stockage
            </h2>
            <dl style={{ fontSize: '13px', fontFamily: 'monospace', gap: '8px', display: 'grid' }}>
              <div>
                <dt style={{ color: '#737373', fontFamily: 'var(--font-geist-sans)', fontSize: '12px', marginBottom: '2px' }}>Original</dt>
                <dd style={{ color: '#525252', margin: 0, wordBreak: 'break-all' }}>{artwork.originalPath ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ color: '#737373', fontFamily: 'var(--font-geist-sans)', fontSize: '12px', marginBottom: '2px' }}>Traité</dt>
                <dd style={{ color: '#525252', margin: 0, wordBreak: 'break-all' }}>{artwork.processedPath ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ color: '#737373', fontFamily: 'var(--font-geist-sans)', fontSize: '12px', marginBottom: '2px' }}>Miniature</dt>
                <dd style={{ color: '#525252', margin: 0, wordBreak: 'break-all' }}>{artwork.thumbnailPath ?? '—'}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* ── Colonne droite : images ── */}
        <div>
          {thumbnailUrl && (
            <section style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#171717' }}>
                Miniature
              </h2>
              <img
                src={thumbnailUrl}
                alt={`Miniature de ${artwork.title}`}
                style={{ width: '100%', height: 'auto', borderRadius: 0, border: '1px solid #e5e5e5' }}
              />
            </section>
          )}

          {processedUrl && (
            <section style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#171717' }}>
                Version corrigée
              </h2>
              <img
                src={processedUrl}
                alt={`Version corrigée de ${artwork.title}`}
                style={{ width: '100%', height: 'auto', borderRadius: 0, border: '1px solid #e5e5e5' }}
              />
            </section>
          )}

          {originalUrl && (
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#171717' }}>
                Original
              </h2>
              <img
                src={originalUrl}
                alt={`Original de ${artwork.title}`}
                style={{ width: '100%', height: 'auto', borderRadius: 0, border: '1px solid #e5e5e5' }}
              />
            </section>
          )}

          {!originalUrl && !processedUrl && !thumbnailUrl && (
            <div style={{ padding: '32px', backgroundColor: '#f5f5f5', borderRadius: 0, color: '#737373', textAlign: 'center', fontSize: '14px' }}>
              Aucune image disponible
            </div>
          )}
        </div>
      </div>

      {/* ── Modifier les métadonnées ── */}
      {/*
       * POURQUOI cette section est AVANT la section statut ?
       * L'artiste modifie les métadonnées (titre, prix) bien plus souvent qu'il ne change
       * le statut. Placer le formulaire d'édition en premier améliore l'ergonomie.
       */}
      <section style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }}>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 600,
            marginBottom: '24px',
            fontFamily: 'var(--font-geist-sans)',
            color: '#171717',
          }}
        >
          Modifier les métadonnées
        </h2>
        {/* ArtworkEditForm reçoit l'action pré-bindée avec artwork.id */}
        <ArtworkEditForm
          updateAction={updateArtworkWithId}
          initialTitle={artwork.title}
          initialDescription={artwork.description}
          initialCreatedDate={(artwork.createdDate
            ? new Date(artwork.createdDate).toISOString().split('T')[0]
            : null) ?? null}
          initialTypeId={artwork.typeId}
          initialMediumId={artwork.mediumId}
          initialWidthCm={artwork.widthCm}
          initialHeightCm={artwork.heightCm}
          initialBasePrice={artwork.basePrice}
          initialPriceHoursSpent={artwork.priceHoursSpent}
          initialPriceFormat={artwork.priceFormat}
          initialPriceFraming={artwork.priceFraming}
          initialPriceMaterials={artwork.priceMaterials}
          initialPriceTechnicality={artwork.priceTechnicality}
          initialPriceAttachment={artwork.priceAttachment}
          artworkTypes={allTypes}
          mediums={allMediums}
        />
      </section>

      {/* ── Gestion statut ── */}
      <section style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-geist-sans)' }}>
          Statut de l&apos;œuvre
        </h2>
        {/* StatusChangeForm reçoit l'action pré-bindée avec artwork.id */}
        <StatusChangeForm
          currentStatus={artwork.status}
          updateStatusAction={updateStatusWithId}
        />
      </section>

      {/* ── Lien validation pipeline si en attente ── */}
      {artwork.pipelineState === 'awaiting_validation' && (
        <div style={{ marginTop: '16px' }}>
          <Link
            href={`/admin/artworks/${artwork.id}/validate`}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#171717',
              color: '#fff',
              borderRadius: 0,  // D-03 : zéro coins arrondis
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            Valider la correction →
          </Link>
        </div>
      )}

      {/* ── Zone dangereuse : suppression ── */}
      <section style={{ marginTop: '48px', paddingTop: '24px', borderTop: '2px solid #bc4b51' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#bc4b51', fontFamily: 'var(--font-geist-sans)' }}>
          Zone dangereuse
        </h2>
        <p style={{ fontSize: '14px', color: '#737373', marginBottom: '16px', fontFamily: 'var(--font-geist-sans)' }}>
          La suppression est irréversible. Les images et toutes les offres seront effacées.
        </p>
        {/* DeleteArtworkButton reçoit l'action pré-bindée avec artwork.id */}
        <DeleteArtworkButton deleteAction={deleteWithId} />
      </section>

      {/* ── Section offres reçues (ADMIN-05) ── */}
      {/*
       * POURQUOI cette section est visible uniquement ici ?
       * Cette page (/admin/artworks/[id]) est protégée par auth artiste (lignes 59-60 ci-dessus).
       * Le téléphone et l'email du visiteur (visitorPhone, visitorEmail) sont des données PII
       * accessibles UNIQUEMENT ici — jamais dans les pages publiques (D-11, T-05-03-01).
       */}
      <section style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-geist-sans)' }}>
          Offres reçues
        </h2>
        <p style={{ fontSize: '14px', color: '#737373', marginBottom: '24px', fontFamily: 'var(--font-geist-sans)' }}>
          {offerRows.length} offre{offerRows.length !== 1 ? 's' : ''} — triées par montant décroissant
        </p>

        {offerRows.length === 0 ? (
          /* État vide : aucune offre encore reçue */
          <div style={{
            padding: '32px',
            backgroundColor: '#f5f5f5',
            textAlign: 'center',
            fontSize: '14px',
            color: '#737373',
            fontFamily: 'var(--font-geist-sans)',
          }}>
            Aucune offre reçue pour cette œuvre.
          </div>
        ) : (
          /* Tableau des offres — scroll horizontal sur mobile */
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '14px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
                  {['Visiteur', 'Téléphone', 'Email', 'Montant', 'Message', 'Date'].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '12px 16px',
                        textAlign: col === 'Montant' ? 'right' : 'left',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offerRows.map((offer, index) => (
                  <tr key={offer.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>

                    {/* Colonne Visiteur — badge "Meilleure offre" sur la 1ère ligne (montant max) */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 500 }}>{offer.visitorName ?? '—'}</span>
                        {index === 0 && (
                          /* POURQUOI index === 0 ? Les offres sont triées desc(amount) — la
                           * première ligne est toujours le montant maximum (D-10). */
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            backgroundColor: 'rgba(91,142,125,0.12)',
                            color: '#5b8e7d',
                            borderRadius: 0,  // D-03 : zéro coins arrondis
                            alignSelf: 'flex-start',
                            fontFamily: 'var(--font-space-mono)',
                          }}>
                            Meilleure offre
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Colonne Téléphone — PRIVÉ — visible uniquement admin (D-11, T-05-03-01) */}
                    <td style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--font-space-mono)',
                      verticalAlign: 'top',
                    }}>
                      {offer.visitorPhone ?? '—'}
                    </td>

                    {/* Colonne Email — optionnel, peut être null */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {offer.visitorEmail ?? '—'}
                    </td>

                    {/* Colonne Montant — aligné à droite, Space Mono 16px/600 */}
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: '16px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      verticalAlign: 'top',
                    }}>
                      {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                    </td>

                    {/* Colonne Message — tronqué à 80 caractères pour ne pas écraser le tableau */}
                    <td style={{
                      padding: '12px 16px',
                      maxWidth: '200px',
                      verticalAlign: 'top',
                      color: '#525252',
                    }}>
                      {offer.message
                        ? (offer.message.length > 80
                          ? offer.message.slice(0, 80) + '…'
                          : offer.message)
                        : <span style={{ color: '#a3a3a3' }}>—</span>}
                    </td>

                    {/* Colonne Date — Space Mono, ink-muted */}
                    <td style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: '13px',
                      color: 'var(--color-ink-muted)',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'top',
                    }}>
                      {new Date(offer.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
