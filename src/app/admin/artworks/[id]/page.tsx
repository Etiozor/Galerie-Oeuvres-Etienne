/**
 * Page détail d'une œuvre — /admin/artworks/[id].
 *
 * Structure (ordre UX) :
 * 1. Titre éditable inline (cliquer pour modifier)
 * 2. Statut + pipeline + changement de statut
 * 3. Offres reçues — au sommet car c'est ce qui intéresse le plus l'artiste
 * 4. Image + description éditable inline
 * 5. Formulaire métadonnées secondaires (date, type, médium, dimensions, prix)
 * 6. Zone dangereuse (suppression)
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
import {
  updateArtworkStatus,
  deleteArtwork,
  updateArtworkMeta,
  updateArtworkTitle,
  updateArtworkDescription,
} from '@/actions/artworkAdmin'
import { StatusChangeForm } from './_components/StatusChangeForm'
import { DeleteArtworkButton } from './_components/DeleteArtworkButton'
import { ArtworkEditForm } from './_components/ArtworkEditForm'
import { InlineEditField } from './_components/InlineEditField'

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const artworkId = parseInt(id, 10)
  if (isNaN(artworkId)) notFound()

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  const [rows, allTypes, allMediums, offerRows] = await Promise.all([
    db
      .select({ artwork: artworks, type: artworkTypes, medium: mediums })
      .from(artworks)
      .leftJoin(artworkTypes, eq(artworks.typeId, artworkTypes.id))
      .leftJoin(mediums, eq(artworks.mediumId, mediums.id))
      .where(eq(artworks.id, artworkId))
      .limit(1),
    db.select().from(artworkTypes).orderBy(artworkTypes.sortOrder),
    db.select().from(mediums).orderBy(mediums.sortOrder),
    db
      .select({
        id: offers.id,
        amount: offers.amount,
        message: offers.message,
        createdAt: offers.createdAt,
        visitorName: visitors.displayName,
        visitorPhone: visitors.phone,
        visitorEmail: visitors.email,
      })
      .from(offers)
      .leftJoin(visitors, eq(offers.visitorId, visitors.id))
      .where(eq(offers.artworkId, artworkId))
      .orderBy(desc(offers.amount)),
  ])

  if (rows.length === 0) notFound()
  const { artwork, type, medium } = rows[0]!

  const storage = getStorage()
  const processedUrl = artwork.processedPath ? storage.getUrl(artwork.processedPath) : null
  const thumbnailUrl = artwork.thumbnailPath ? storage.getUrl(artwork.thumbnailPath) : null

  // Binder les Server Actions avec l'artworkId côté serveur (T-05-01-01)
  const updateStatusWithId = updateArtworkStatus.bind(null, artwork.id)
  const deleteWithId = deleteArtwork.bind(null, artwork.id)
  const updateMetaWithId = updateArtworkMeta.bind(null, artwork.id)
  // Actions légères pour l'édition inline — bindées avec artworkId
  const updateTitleAction = updateArtworkTitle.bind(null, artwork.id)
  const updateDescriptionAction = updateArtworkDescription.bind(null, artwork.id)

  const statusLabels: Record<string, string> = {
    available: 'Disponible',
    sold: 'Vendu',
    given: 'Donné',
    reserved: 'Réservé',
  }

  return (
    <main style={{ padding: '48px 16px', fontFamily: 'var(--font-geist-sans)', maxWidth: '960px', margin: '0 auto' }}>

      {/* ── Navigation retour ── */}
      <Link
        href="/admin/artworks"
        style={{ fontSize: '14px', color: '#737373', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}
      >
        ← Retour à la liste
      </Link>

      {/* ── Titre éditable inline ── */}
      <InlineEditField
        initialValue={artwork.title}
        onSave={updateTitleAction}
        as="title"
      />

      {/* ── Statut + pipeline + changement de statut ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '40px', marginTop: '8px' }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 0,
          backgroundColor: artwork.status === 'available' ? '#dcfce7' : '#f5f5f5',
          color: artwork.status === 'available' ? '#15803d' : '#525252',
        }}>
          {statusLabels[artwork.status] ?? artwork.status}
        </span>
        <PipelineBadge state={artwork.pipelineState} />
        <div style={{ marginLeft: 'auto' }}>
          <StatusChangeForm
            currentStatus={artwork.status}
            updateStatusAction={updateStatusWithId}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          OFFRES REÇUES — en premier car c'est la priorité artiste
          ══════════════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: '48px', padding: '24px', backgroundColor: '#fafafa', border: '1px solid #e5e5e5' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-geist-sans)', color: '#171717', margin: '0 0 4px' }}>
          Offres reçues
        </h2>
        <p style={{ fontSize: '13px', color: '#737373', marginBottom: '20px', marginTop: '4px', fontFamily: 'var(--font-geist-sans)' }}>
          {offerRows.length} offre{offerRows.length !== 1 ? 's' : ''} — triées par montant décroissant
        </p>

        {offerRows.length === 0 ? (
          <div style={{ padding: '24px', backgroundColor: '#f5f5f5', textAlign: 'center', fontSize: '14px', color: '#a3a3a3' }}>
            Aucune offre reçue pour cette œuvre.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
                  {['Visiteur', 'Téléphone', 'Email', 'Montant', 'Message', 'Date'].map(col => (
                    <th key={col} style={{ padding: '10px 12px', textAlign: col === 'Montant' ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '13px' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offerRows.map((offer, index) => (
                  <tr key={offer.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontWeight: 500 }}>{offer.visitorName ?? '—'}</span>
                        {index === 0 && (
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', backgroundColor: 'rgba(91,142,125,0.12)', color: '#5b8e7d', borderRadius: 0, alignSelf: 'flex-start', fontFamily: 'var(--font-space-mono)' }}>
                            Meilleure offre
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-space-mono)', verticalAlign: 'top', fontSize: '13px' }}>
                      {offer.visitorPhone ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', fontSize: '13px' }}>
                      {offer.visitorEmail ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-space-mono)', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: '180px', verticalAlign: 'top', color: '#525252', fontSize: '13px' }}>
                      {offer.message ? (offer.message.length > 70 ? offer.message.slice(0, 70) + '…' : offer.message) : <span style={{ color: '#a3a3a3' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-space-mono)', fontSize: '12px', color: '#737373', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      {new Date(offer.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Image + description ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginBottom: '48px' }}>

        {/* Image principale */}
        <div>
          {(thumbnailUrl || processedUrl) ? (
            <img
              src={thumbnailUrl ?? processedUrl ?? ''}
              alt={artwork.title}
              style={{ width: '100%', height: 'auto', borderRadius: 0, border: '1px solid #e5e5e5', display: 'block' }}
            />
          ) : (
            <div style={{ padding: '32px', backgroundColor: '#f5f5f5', color: '#a3a3a3', textAlign: 'center', fontSize: '14px' }}>
              Aucune image disponible
            </div>
          )}
          {/* Infos rapides sous l'image */}
          <dl style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: '13px' }}>
            <dt style={{ color: '#737373' }}>Type</dt>
            <dd style={{ margin: 0, color: '#171717' }}>{type?.name ?? '—'}</dd>
            <dt style={{ color: '#737373' }}>Médium</dt>
            <dd style={{ margin: 0, color: '#171717' }}>{medium?.name ?? '—'}</dd>
            <dt style={{ color: '#737373' }}>Dimensions</dt>
            <dd style={{ margin: 0, color: '#171717' }}>
              {artwork.widthCm && artwork.heightCm ? `${artwork.widthCm} × ${artwork.heightCm} cm` : '—'}
            </dd>
            <dt style={{ color: '#737373' }}>Prix de base</dt>
            <dd style={{ margin: 0, color: '#171717', fontFamily: 'var(--font-space-mono)', fontWeight: 600 }}>
              {artwork.basePrice ? `${parseFloat(artwork.basePrice).toLocaleString('fr-FR')} €` : '—'}
            </dd>
          </dl>
        </div>

        {/* Description éditable inline */}
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#737373', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-space-mono)' }}>
            Description
          </h2>
          <InlineEditField
            initialValue={artwork.description ?? ''}
            onSave={updateDescriptionAction}
            as="description"
          />

          {/* Lien validation pipeline si en attente */}
          {artwork.pipelineState === 'awaiting_validation' && (
            <div style={{ marginTop: '24px' }}>
              <Link
                href={`/admin/artworks/${artwork.id}/validate`}
                style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#171717', color: '#fff', borderRadius: 0, textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
              >
                Valider la correction →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Formulaire métadonnées secondaires ── */}
      {/*
       * key={String(artwork.updatedAt)} : force le remontage du Client Component après chaque
       * sauvegarde via revalidatePath. Sans cette clé, defaultValue des inputs ne se rafraîchit
       * pas car React ne remonte pas les composants dont l'arbre ne change pas.
       */}
      <section style={{ marginBottom: '48px', paddingTop: '32px', borderTop: '1px solid #e5e5e5' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px', color: '#171717' }}>
          Date, type, dimensions et prix
        </h2>
        <ArtworkEditForm
          key={String(artwork.updatedAt)}
          updateAction={updateMetaWithId}
          initialCreatedDate={(artwork.createdDate ? new Date(artwork.createdDate).toISOString().split('T')[0] : null) ?? null}
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

      {/* ── Zone dangereuse ── */}
      <section style={{ paddingTop: '24px', borderTop: '2px solid #bc4b51' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#bc4b51' }}>
          Zone dangereuse
        </h2>
        <p style={{ fontSize: '14px', color: '#737373', marginBottom: '16px' }}>
          La suppression est irréversible. Images et offres seront effacées.
        </p>
        <DeleteArtworkButton deleteAction={deleteWithId} />
      </section>

      {/* ── Chemins de stockage (technique) ── */}
      <details style={{ marginTop: '48px' }}>
        <summary style={{ fontSize: '12px', color: '#a3a3a3', cursor: 'pointer', fontFamily: 'var(--font-space-mono)' }}>
          Chemins de stockage
        </summary>
        <dl style={{ marginTop: '12px', fontSize: '12px', fontFamily: 'monospace', display: 'grid', gap: '6px' }}>
          {[['Original', artwork.originalPath], ['Traité', artwork.processedPath], ['Miniature', artwork.thumbnailPath]].map(([label, path]) => (
            <div key={label}>
              <dt style={{ color: '#a3a3a3', marginBottom: '2px' }}>{label}</dt>
              <dd style={{ margin: 0, color: '#525252', wordBreak: 'break-all' }}>{path ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </details>

    </main>
  )
}
