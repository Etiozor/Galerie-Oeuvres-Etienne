/**
 * Page profil du visiteur connecté — /mon-profil.
 *
 * Server Component : lit la session iron-session, charge les données depuis la DB.
 * SÉCURITÉ : si non connecté → redirect('/') immédiat (D-12, T-05-04-01).
 */
import { redirect } from 'next/navigation'
import { getVisitorSession } from '@/lib/session'
import { db } from '@/db'
import { artworks, offers, savedArtworks, visitors } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { SiteNav } from '@/components/layout/SiteNav'
import { getStorage } from '@/lib/storage'

function maskPhone(phone: string): string {
  return '••••' + phone.slice(-4)
}

export default async function MonProfilPage() {
  const session = await getVisitorSession()
  if (!session.visitorId) redirect('/')
  const visitorId = session.visitorId

  const [visitorRows, myOffers, mySavedArtworks] = await Promise.all([
    db.select().from(visitors).where(eq(visitors.id, visitorId)).limit(1),
    db.select({
      artworkId: artworks.id,
      artworkTitle: artworks.title,
      artworkStatus: artworks.status,
      amount: offers.amount,
      message: offers.message,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .leftJoin(artworks, eq(offers.artworkId, artworks.id))
    .where(eq(offers.visitorId, visitorId))
    .orderBy(desc(offers.createdAt)),
    db.select({ artwork: artworks })
    .from(savedArtworks)
    .leftJoin(artworks, eq(savedArtworks.artworkId, artworks.id))
    .where(eq(savedArtworks.visitorId, visitorId))
    .orderBy(desc(savedArtworks.createdAt)),
  ])

  const visitor = visitorRows[0]
  if (!visitor) redirect('/')

  const myAcquisitions = myOffers
    .filter(o => o.artworkStatus === 'sold')
    .reduce<typeof myOffers>((acc, curr) => {
      if (!acc.find(a => a.artworkId === curr.artworkId)) acc.push(curr)
      return acc
    }, [])

  const storage = getStorage()
  const initiale = visitor.displayName[0]?.toUpperCase() ?? '?'

  return (
    <>
      <SiteNav />
      <main style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily: 'var(--font-geist-sans)',
        backgroundColor: 'var(--color-bg)',
        minHeight: '100vh',
      }}>

        {/* ── En-tête profil ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '48px' }}>
          {/* Avatar carré — D-03 : pas de border-radius */}
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '20px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
            }}>
              {initiale}
            </span>
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-oswald)',
              fontSize: '26px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-ink)',
              margin: 0,
              lineHeight: 1.1,
            }}>
              {visitor.displayName}
            </h1>
            <p style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '13px',
              color: 'var(--color-ink-muted)',
              margin: '4px 0 0',
            }}>
              {maskPhone(visitor.phone)}
              {visitor.email && <span style={{ marginLeft: '12px' }}>{visitor.email}</span>}
            </p>
          </div>
        </div>

        {/* ── Section 1 : Mes offres ── */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--color-ink-muted)',
            margin: '0 0 16px',
          }}>
            Mes offres ({myOffers.length})
          </h2>

          {myOffers.length === 0 ? (
            <div style={{ padding: '24px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-ink-muted)' }}>
                Aucune offre pour l&apos;instant.
              </p>
              <Link href="/" style={{ display: 'inline-block', marginTop: '8px', fontSize: '13px', color: 'var(--color-ink)', fontFamily: 'var(--font-space-mono)' }}>
                Voir la galerie →
              </Link>
            </div>
          ) : (
            <div style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              {myOffers.map((offer, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: i < myOffers.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/artworks/${offer.artworkId}`}
                      style={{ color: 'var(--color-ink)', textDecoration: 'none', fontSize: '15px', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {offer.artworkTitle ?? '—'}
                    </Link>
                    <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-space-mono)' }}>
                      {new Date(offer.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2 : Mes acquisitions ── */}
        {myAcquisitions.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '11px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--color-ink-muted)',
              margin: '0 0 16px',
            }}>
              Mes acquisitions ({myAcquisitions.length})
            </h2>
            <div style={{ border: '1px solid rgba(91,142,125,0.3)', borderLeft: '3px solid #5b8e7d' }}>
              {myAcquisitions.map((acq, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: i < myAcquisitions.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  backgroundColor: 'rgba(91,142,125,0.03)',
                }}>
                  <Link
                    href={`/artworks/${acq.artworkId}`}
                    style={{ flex: 1, color: 'var(--color-ink)', textDecoration: 'none', fontSize: '15px', fontWeight: 500 }}
                  >
                    {acq.artworkTitle ?? '—'}
                  </Link>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-space-mono)', color: '#5b8e7d', padding: '3px 8px', backgroundColor: 'rgba(91,142,125,0.12)', borderRadius: 0, flexShrink: 0 }}>
                    Acquis
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3 : Œuvres enregistrées ── */}
        <section>
          <h2 style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--color-ink-muted)',
            margin: '0 0 16px',
          }}>
            Œuvres enregistrées ({mySavedArtworks.length})
          </h2>

          {mySavedArtworks.length === 0 ? (
            <div style={{ padding: '24px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-ink-muted)' }}>
                Aucune œuvre enregistrée. Cliquez sur ♡ sur la page d&apos;une œuvre pour la retrouver ici.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {mySavedArtworks.map(({ artwork }, i) => artwork && (
                <Link key={i} href={`/artworks/${artwork.id}`} style={{ textDecoration: 'none', color: 'var(--color-ink)', display: 'block' }}>
                  <div style={{ border: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#fff' }}>
                    {artwork.originalPath ? (
                      <div style={{ aspectRatio: '1', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                        <img
                          src={storage.getUrl(artwork.originalPath)}
                          alt={artwork.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    ) : (
                      <div style={{ aspectRatio: '1', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '24px', color: '#d4d4d4' }}>♡</span>
                      </div>
                    )}
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {artwork.title}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Retour galerie ── */}
        <div style={{ marginTop: '48px' }}>
          <Link href="/" style={{ color: 'var(--color-ink-muted)', fontSize: '13px', fontFamily: 'var(--font-space-mono)', textDecoration: 'none' }}>
            ← Retour à la galerie
          </Link>
        </div>

      </main>
    </>
  )
}
