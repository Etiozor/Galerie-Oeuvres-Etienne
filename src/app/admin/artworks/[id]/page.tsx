/**
 * Page détail / édition d'une œuvre — /admin/artworks/[id].
 *
 * Layout "split" avec fond Crème POF :
 * 1. Barre admin sticky (GALERIE POF + email + déconnexion)
 * 2. Bloc titre (retour, breadcrumb mono, H1 Oswald éditable, pills, statut, lien galerie)
 * 3. Hero split — image gauche (surface sable + ombre) / panneau info droite sticky
 * 4. Offres reçues — meilleure offre mise en avant en teal
 * 5. Formulaire métadonnées (grille 6 colonnes, composantes prix dépliables)
 * 6. Zone dangereuse
 *
 * Server Component : données lues depuis la DB, auth vérifiée côté serveur.
 */
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/db'
import { artworks, artworkTypes, mediums, artworkMediums, offers, visitors } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import Link from 'next/link'
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
import { AdminHeaderStrip } from './_components/AdminHeaderStrip'
import { QuickInfoPanel } from './_components/QuickInfoPanel'
import { BackgroundDecor } from '@/components/layout/BackgroundDecor'

// ── Pills de statut et pipeline ──────────────────────────────────────────────

function PublishedPill({ published }: { published: boolean }) {
  const bg = published ? 'var(--badge-published-bg)' : 'var(--badge-pending-bg)'
  const fg = published ? 'var(--badge-published-fg)' : 'var(--badge-pending-fg)'
  const label = published ? 'Publiée' : 'Non publiée'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px',
      background: bg, color: fg,
      font: '600 12px var(--font-geist-sans)',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, background: fg, borderRadius: '50%', opacity: 0.75 }} />
      {label}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; fg: string; label: string }> = {
    available: { bg: 'var(--badge-available-bg)', fg: 'var(--badge-available-fg)', label: 'Disponible' },
    reserved:  { bg: 'var(--badge-reserved-bg)',  fg: 'var(--badge-reserved-fg)',  label: 'Réservé' },
    sold:      { bg: 'var(--badge-sold-bg)',       fg: 'var(--badge-sold-fg)',      label: 'Vendu' },
    given:     { bg: 'var(--badge-given-bg)',      fg: 'var(--badge-given-fg)',     label: 'Donné' },
  }
  const { bg, fg, label } = cfg[status] ?? { bg: '#f5f5f5', fg: '#737373', label: status }
  return (
    <span style={{
      padding: '3px 10px',
      background: bg, color: fg,
      font: '600 12px var(--font-geist-sans)',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export const dynamic = 'force-dynamic'

// ── Page ─────────────────────────────────────────────────────────────────────

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

  const [rows, allTypes, allMediums, currentMediumRows, offerRows] = await Promise.all([
    db
      .select({ artwork: artworks, type: artworkTypes })
      .from(artworks)
      .leftJoin(artworkTypes, eq(artworks.typeId, artworkTypes.id))
      .where(eq(artworks.id, artworkId))
      .limit(1),
    db.select().from(artworkTypes).orderBy(artworkTypes.sortOrder),
    db.select().from(mediums).orderBy(mediums.sortOrder),
    // Médiums actuels de l'œuvre via la table de jonction
    db.select({ mediumId: artworkMediums.mediumId, mediumName: mediums.name })
      .from(artworkMediums)
      .leftJoin(mediums, eq(artworkMediums.mediumId, mediums.id))
      .where(eq(artworkMediums.artworkId, artworkId)),
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
  const { artwork, type } = rows[0]!
  const currentMediumIds = currentMediumRows.map(r => r.mediumId)
  const currentMediumNames = currentMediumRows.map(r => r.mediumName).filter(Boolean).join(', ')

  const storage = getStorage()
  const imageUrl = artwork.originalPath ? storage.getUrl(artwork.originalPath) : null

  // Server Actions bindées avec artworkId côté serveur (T-05-01-01)
  const updateStatusWithId = updateArtworkStatus.bind(null, artwork.id)
  const deleteWithId = deleteArtwork.bind(null, artwork.id)
  const updateMetaWithId = updateArtworkMeta.bind(null, artwork.id)
  const updateTitleAction = updateArtworkTitle.bind(null, artwork.id)
  const updateDescriptionAction = updateArtworkDescription.bind(null, artwork.id)

  const createdFr = artwork.createdAt
    ? new Date(artwork.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <>
      <BackgroundDecor />

      {/*
       * Responsive tablette et mobile — règles CSS @media pour /admin/artworks/[id].
       * D-10 : hero split → 1 colonne sur tablette ≤1023px.
       * D-11 : pas cassé sur mobile — objectif "acceptable", pas "optimisé".
       * [09-CONTEXT.md D-10, D-11, D-14]
       */}
      <style>{`
        /*
         * Hero split en 1 colonne sur tablette (≤1023px).
         * POURQUOI !important ?
         * gridTemplateColumns est défini en style inline React ('minmax(0,1fr) 400px').
         * CSS @media ne peut pas overrider un style inline sans !important.
         * Utilisation justifiée — même pattern que admin-drawer-panel (08-02).
         */
        @media (max-width: 1023px) {
          .admin-detail-hero {
            grid-template-columns: 1fr !important;
          }
          /* Réduction padding main sur tablette */
          .admin-detail-main {
            padding: 24px 20px 60px;
          }
        }

        /* Réduction padding supplémentaire sur mobile */
        @media (max-width: 768px) {
          .admin-detail-main {
            padding: 16px 16px 60px;
          }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>

      {/* ── Barre admin sticky ── */}
      <AdminHeaderStrip userEmail={session.user.email} />

      {/* className="admin-detail-main" — padding overridé sur tablette/mobile par @media */}
      <main
        className="admin-detail-main"
        style={{
          padding: '44px 32px 80px',   // desktop — overridé sur tablette/mobile par @media
          maxWidth: 1200,
          margin: '0 auto',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >

        {/* ══════════════════════════════════════════════════════════════
            BLOC TITRE
            ══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 36 }}>
          <Link href="/admin/artworks" style={{
            font: '400 13px var(--font-geist-sans)',
            color: 'var(--color-ink-muted)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: 20,
          }}>
            ← Retour à la liste
          </Link>

          {createdFr && (
            <div style={{
              font: '400 12px var(--font-space-mono)',
              letterSpacing: '0.05em',
              color: 'var(--color-ink-muted)',
              marginBottom: 8,
            }}>
              Œuvre #{String(artwork.id).padStart(3, '0')} · créée le {createdFr}
            </div>
          )}

          <InlineEditField
            initialValue={artwork.title}
            onSave={updateTitleAction}
            as="title"
          />

          {/* Pills + sélecteur statut + lien galerie */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            <PublishedPill published={artwork.publishedAt !== null} />
            <StatusPill status={artwork.status} />
            <span style={{ flex: 1, minWidth: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                font: '400 11px var(--font-space-mono)',
                letterSpacing: '0.12em',
                color: 'var(--color-ink-muted)',
                textTransform: 'uppercase',
              }}>
                Statut
              </span>
              <StatusChangeForm currentStatus={artwork.status} updateStatusAction={updateStatusWithId} />
            </div>
            <Link href={`/artworks/${artwork.id}`} style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 'var(--radius-sm)',
              font: '600 13px var(--font-geist-sans)',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              Voir sur la galerie ↗
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            HERO SPLIT — image gauche + panneau info droite (sticky)
            Sur tablette (≤1023px) : 1 colonne via .admin-detail-hero @media
            ══════════════════════════════════════════════════════════════ */}
        {/* className="admin-detail-hero" — grid-template-columns overridé par !important @media */}
        <section
          className="admin-detail-hero"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 400px',   // desktop — overridé sur tablette
            gap: 40,
            marginBottom: 56,
          }}
        >
          {/* Image gauche sur surface sable */}
          <div>
            <div style={{
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: 'var(--shadow-artwork)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={artwork.title}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              ) : (
                <div style={{
                  aspectRatio: artwork.widthCm && artwork.heightCm
                    ? `${artwork.widthCm} / ${artwork.heightCm}`
                    : '3 / 4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: 'italic 400 17px/1.5 var(--font-cormorant)',
                  color: 'var(--color-ink-muted)',
                  minHeight: 240,
                }}>
                  Aucune image disponible
                </div>
              )}
              {/* Stamp "Vendu" si statut sold */}
              {artwork.status === 'sold' && (
                <span style={{
                  position: 'absolute', top: 20, right: 20,
                  transform: 'rotate(-6deg)',
                  padding: '6px 14px',
                  background: 'var(--color-red)',
                  color: '#fff',
                  font: '700 13px var(--font-oswald)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  borderRadius: 0,
                }}>
                  Vendu
                </span>
              )}
            </div>

            {/* Dimensions + médium sous l'image */}
            <div style={{
              marginTop: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <span style={{
                font: '400 12px var(--font-space-mono)',
                letterSpacing: '0.05em',
                color: 'var(--color-ink-muted)',
              }}>
                {artwork.widthCm && artwork.heightCm
                  ? `${artwork.widthCm} × ${artwork.heightCm} cm`
                  : '—'}
                {currentMediumNames ? ` · ${currentMediumNames}` : ''}
              </span>
            </div>
          </div>

          {/* Panneau info droite : description + KV + prix */}
          <QuickInfoPanel
            artwork={{
              description: artwork.description ?? '',
              type: type?.name ?? null,
              medium: currentMediumNames || null,
              widthCm: artwork.widthCm,
              heightCm: artwork.heightCm,
              dimensionUnit: artwork.dimensionUnit,
              createdYear: artwork.createdYear,
              createdMonth: artwork.createdMonth,
              basePrice: artwork.basePrice,
              priceCurrency: artwork.priceCurrency,
            }}
            updateDescriptionAction={updateDescriptionAction}
          />
        </section>

        {/* ══════════════════════════════════════════════════════════════
            OFFRES REÇUES
            ══════════════════════════════════════════════════════════════ */}
        <section style={{
          marginBottom: 56,
          padding: 28,
          background: 'var(--color-surface)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 18, gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                font: '400 11px var(--font-space-mono)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
              }}>
                Offres reçues
                <span style={{ color: 'var(--color-ink-muted)' }}> ({offerRows.length})</span>
              </div>
              <p style={{ margin: '4px 0 0', font: '400 13px var(--font-geist-sans)', color: 'var(--color-ink-muted)' }}>
                Triées par montant décroissant.
              </p>
            </div>

            {offerRows.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{
                  font: '400 12px var(--font-space-mono)',
                  letterSpacing: '0.05em',
                  color: 'var(--color-ink-muted)',
                }}>
                  Meilleure offre
                </span>
                <span style={{
                  font: '700 22px var(--font-space-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-teal)',
                  lineHeight: 1,
                }}>
                  {parseFloat(offerRows[0]!.amount).toLocaleString('fr-FR')} €
                </span>
              </div>
            )}
          </div>

          {offerRows.length === 0 ? (
            <div style={{
              padding: 32,
              background: 'var(--color-bg)',
              border: '1px dashed rgba(0,0,0,0.12)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
              font: 'italic 400 17px/1.5 var(--font-cormorant)',
              color: 'var(--color-ink-muted)',
            }}>
              Aucune offre reçue pour cette œuvre.
            </div>
          ) : (
            <div style={{
              overflowX: 'auto',
              background: 'var(--color-bg)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 14px var(--font-geist-sans)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    {[
                      { label: 'Visiteur', align: 'left' as const },
                      { label: 'Téléphone', align: 'left' as const },
                      { label: 'Email', align: 'left' as const },
                      { label: 'Montant', align: 'right' as const },
                      { label: 'Message', align: 'left' as const },
                      { label: 'Date', align: 'left' as const },
                    ].map(col => (
                      <th key={col.label} style={{
                        padding: '12px 14px',
                        textAlign: col.align,
                        font: '400 11px var(--font-space-mono)',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--color-ink-muted)',
                        whiteSpace: 'nowrap',
                      }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offerRows.map((offer, index) => (
                    <tr
                      key={offer.id}
                      style={{ borderBottom: index === offerRows.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)' }}
                    >
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ font: '500 14px var(--font-geist-sans)', color: 'var(--color-ink)' }}>
                            {offer.visitorName ?? '—'}
                          </span>
                          {index === 0 && (
                            <span style={{
                              font: '600 10px var(--font-space-mono)',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              background: 'var(--badge-available-bg)',
                              color: 'var(--badge-available-fg)',
                              borderRadius: 'var(--radius-sm)',
                              alignSelf: 'flex-start',
                            }}>
                              Meilleure offre
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'top', fontFamily: 'var(--font-space-mono)', fontSize: 13, color: 'var(--color-ink)' }}>
                        {offer.visitorPhone ?? '—'}
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'top', fontSize: 13, color: 'var(--color-ink)' }}>
                        {offer.visitorEmail ?? <span style={{ color: 'var(--color-ink-muted)' }}>—</span>}
                      </td>
                      <td style={{
                        padding: '12px 14px', verticalAlign: 'top', textAlign: 'right',
                        font: '700 16px var(--font-space-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        color: index === 0 ? 'var(--color-teal)' : 'var(--color-ink)',
                      }}>
                        {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                      </td>
                      <td style={{
                        padding: '12px 14px', verticalAlign: 'top', maxWidth: 280,
                        color: 'var(--color-ink-muted)', fontSize: 13, lineHeight: 1.5,
                      }}>
                        {offer.message
                          ? (offer.message.length > 90 ? offer.message.slice(0, 90) + '…' : offer.message)
                          : <span style={{ color: 'var(--color-ink-muted)' }}>—</span>}
                      </td>
                      <td style={{
                        padding: '12px 14px', verticalAlign: 'top',
                        fontFamily: 'var(--font-space-mono)', fontSize: 12,
                        color: 'var(--color-ink-muted)', whiteSpace: 'nowrap',
                      }}>
                        {new Date(offer.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FORMULAIRE MÉTADONNÉES
            ══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{
              font: '400 11px var(--font-space-mono)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-muted)',
            }}>
              Date, type, dimensions et prix
            </div>
            <p style={{ margin: '6px 0 0', font: '400 13px var(--font-geist-sans)', color: 'var(--color-ink-muted)' }}>
              Métadonnées éditoriales. Sauvegarde manuelle.
            </p>
          </div>
          {/*
           * key={String(artwork.updatedAt)} : force le remontage après chaque sauvegarde
           * via revalidatePath. Sans cette clé, defaultValue des inputs ne se rafraîchit pas.
           */}
          <ArtworkEditForm
            key={String(artwork.updatedAt)}
            updateAction={updateMetaWithId}
            initialCreatedYear={artwork.createdYear ?? null}
            initialCreatedMonth={artwork.createdMonth ?? null}
            initialTypeId={artwork.typeId}
            initialMediumIds={currentMediumIds}
            initialWidthCm={artwork.widthCm}
            initialHeightCm={artwork.heightCm}
            initialDimensionUnit={artwork.dimensionUnit}
            initialBasePrice={artwork.basePrice}
            initialPriceCurrency={artwork.priceCurrency}
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

        {/* ══════════════════════════════════════════════════════════════
            ZONE DANGEREUSE
            ══════════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: 24, paddingTop: 28, borderTop: '2px solid var(--color-red)', position: 'relative', zIndex: 1 }}>
          <h2 style={{ margin: '0 0 8px', font: '700 16px var(--font-geist-sans)', color: 'var(--color-red)' }}>
            Zone dangereuse
          </h2>
          <p style={{ margin: '0 0 18px', font: '400 14px var(--font-geist-sans)', color: 'var(--color-ink-muted)' }}>
            La suppression est irréversible. Images et offres seront effacées.
          </p>
          <DeleteArtworkButton deleteAction={deleteWithId} />
        </section>

        {/* ── Chemin de stockage (technique) ── */}
        <details style={{ marginTop: 32, marginBottom: 64 }}>
          <summary style={{
            font: '400 11px var(--font-space-mono)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
            cursor: 'pointer',
          }}>
            Chemin de stockage
          </summary>
          <dl style={{ marginTop: 12, fontFamily: 'var(--font-space-mono)', display: 'grid', gap: 6 }}>
            <div>
              <dt style={{
                color: 'var(--color-ink-muted)', marginBottom: 4,
                font: '400 10px var(--font-space-mono)', textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>
                Original
              </dt>
              <dd style={{
                margin: 0, color: 'var(--color-ink-muted)',
                wordBreak: 'break-all', font: '400 12px var(--font-space-mono)',
              }}>
                {artwork.originalPath ?? '—'}
              </dd>
            </div>
          </dl>
        </details>

      </main>
    </div>
    </>
  )
}
