/**
 * Page profil du visiteur connecté — /mon-profil.
 *
 * Server Component : lit la session iron-session, charge les données depuis la DB.
 * SÉCURITÉ : si non connecté → redirect('/') immédiat (D-12, T-05-04-01).
 *
 * 4 sections (D-13) :
 * 1. Mes informations : displayName, téléphone masqué, email si fourni
 * 2. Mes offres : toutes les offres du visiteur, toutes œuvres confondues
 * 3. Mes acquisitions : heuristique D-18 (artwork.status === 'sold' + offre soumise)
 * 4. Mes œuvres enregistrées : table saved_artworks
 *
 * JAMAIS session.save() ici — réservé aux Server Actions (T-04-01-02).
 *
 * Typographie (UI-SPEC.md /mon-profil) :
 * - h1 : Oswald 28px/600 uppercase
 * - h2 sections : Space Mono 16px/400 uppercase letter-spacing 0.08em
 * - Corps : Geist Sans 16px/400
 * - Téléphone masqué : Space Mono 14px/400
 */
import { redirect } from 'next/navigation'
import { getVisitorSession } from '@/lib/session'
import { db } from '@/db'
import { artworks, offers, savedArtworks, visitors } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { SiteNav } from '@/components/layout/SiteNav'
import { getStorage } from '@/lib/storage'

/**
 * Masque le numéro de téléphone : affiche "••••" + les 4 derniers chiffres.
 * Protège la vie privée du visiteur sur sa propre page de profil (T-05-04-03).
 *
 * POURQUOI masquer même sur la page du visiteur lui-même ?
 * Protection contre le shoulder surfing et les captures d'écran partagées.
 * Le visiteur connaît déjà son numéro — l'afficher complet n'apporte rien.
 */
export function maskPhone(phone: string): string {
  return '••••' + phone.slice(-4)
}

export default async function MonProfilPage() {
  // ── 1. Guard session — JAMAIS session.save() ici (réservé aux Server Actions) ──
  // T-05-04-01 : vérifier la session en première ligne avant tout rendu ou accès DB
  const session = await getVisitorSession()
  if (!session.visitorId) {
    // Non connecté → redirection vers la galerie (D-12)
    redirect('/')
  }
  const visitorId = session.visitorId

  // ── 2. Charger les données du visiteur connecté ──────────────────────────
  // Promise.all : exécution parallèle des 3 requêtes pour minimiser la latence
  const [visitorRows, myOffers, mySavedArtworks] = await Promise.all([
    // Informations du compte visiteur
    db.select().from(visitors).where(eq(visitors.id, visitorId)).limit(1),

    // Toutes les offres du visiteur — toutes œuvres confondues, triées par date (plus récente d'abord)
    // LEFT JOIN artworks pour récupérer le titre et le statut
    db.select({
      artworkId: artworks.id,
      artworkTitle: artworks.title,
      artworkStatus: artworks.status,
      amount: offers.amount,   // string (Drizzle retourne numeric comme string)
      message: offers.message,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .leftJoin(artworks, eq(offers.artworkId, artworks.id))
    .where(eq(offers.visitorId, visitorId))
    .orderBy(desc(offers.createdAt)),

    // Favoris du visiteur (table saved_artworks) avec les données de chaque œuvre
    db.select({ artwork: artworks })
    .from(savedArtworks)
    .leftJoin(artworks, eq(savedArtworks.artworkId, artworks.id))
    .where(eq(savedArtworks.visitorId, visitorId))
    .orderBy(desc(savedArtworks.createdAt)),
  ])

  const visitor = visitorRows[0]
  if (!visitor) redirect('/')

  // ── 3. Calculer les acquisitions probables (D-18) ────────────────────────
  // Heuristique : œuvre vendue (status='sold') + visiteur a soumis au moins une offre dessus.
  // Dédoublonnage : si plusieurs offres sur la même œuvre sold → une seule acquisition affichée.
  //
  // POURQUOI une heuristique et pas une vraie donnée de vente ?
  // La galerie ne gère pas les transactions — l'artiste marque l'œuvre 'sold' manuellement.
  // On infère l'acquisition à partir du croisement offre + statut. [D-18]
  const myAcquisitions = myOffers
    .filter(o => o.artworkStatus === 'sold')
    .reduce<typeof myOffers>((acc, curr) => {
      if (!acc.find(a => a.artworkId === curr.artworkId)) acc.push(curr)
      return acc
    }, [])

  // ── Résoudre les URLs des thumbnails (storage abstrait) ─────────────────
  // getStorage() retourne le LocalStorageAdapter en dev, R2Adapter en prod.
  // POURQUOI côté serveur ? getStorage().getUrl() utilise node:fs en local.
  const storage = getStorage()

  // ── Styles partagés ───────────────────────────────────────────────────────
  const sectionStyle: React.CSSProperties = {
    marginTop: '40px',
    paddingTop: '32px',
    borderTop: '1px solid rgba(0,0,0,0.1)',
  }
  const h2Style: React.CSSProperties = {
    fontFamily: 'var(--font-space-mono)',
    fontSize: '16px',
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-ink)',
    margin: 0,
    marginBottom: '20px',
  }

  return (
    <>
      <SiteNav />
      <main style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 24px',
        fontFamily: 'var(--font-geist-sans)',
        backgroundColor: 'var(--color-bg)',
        minHeight: '100vh',
      }}>

        {/* ── En-tête : carré initiale + displayName ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          {/*
           * Carré initiale 40px — D-03 : pas de border-radius, fond ink, texte blanc.
           * L'initiale donne une identité visuelle immédiate sans photo de profil.
           */}
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            // D-03 : borderRadius: 0 (pas de border-radius)
          }}>
            <span style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '16px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
            }}>
              {visitor.displayName[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-oswald)',
            fontSize: '28px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-ink)',
            margin: 0,
          }}>
            {visitor.displayName}
          </h1>
        </div>

        {/* ── Section 1 : Mes informations ──────────────────────────────────── */}
        <section>
          <h2 style={h2Style}>Mes informations</h2>
          <dl style={{ marginTop: '16px', display: 'grid', gap: '12px', fontSize: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
              <dt style={{
                color: 'var(--color-ink-muted)',
                minWidth: '100px',
                fontSize: '14px',
                fontFamily: 'var(--font-space-mono)',
              }}>
                Pseudo
              </dt>
              <dd style={{ margin: 0, color: 'var(--color-ink)' }}>
                {visitor.displayName}
              </dd>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
              <dt style={{
                color: 'var(--color-ink-muted)',
                minWidth: '100px',
                fontSize: '14px',
                fontFamily: 'var(--font-space-mono)',
              }}>
                Téléphone
              </dt>
              {/* T-05-04-03 : téléphone masqué — seul le visiteur lui-même voit sa page */}
              <dd style={{
                margin: 0,
                fontFamily: 'var(--font-space-mono)',
                fontSize: '14px',
                color: 'var(--color-ink)',
              }}>
                {maskPhone(visitor.phone)}
              </dd>
            </div>
            {visitor.email && (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                <dt style={{
                  color: 'var(--color-ink-muted)',
                  minWidth: '100px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-space-mono)',
                }}>
                  Email
                </dt>
                <dd style={{ margin: 0, color: 'var(--color-ink)' }}>
                  {visitor.email}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* ── Section 2 : Mes offres ─────────────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Mes offres</h2>
          <div style={{ marginTop: '16px' }}>
            {myOffers.length === 0 ? (
              <div style={{ color: 'var(--color-ink-muted)', fontSize: '14px' }}>
                <p style={{ margin: 0, marginBottom: '8px' }}>
                  Vous n&apos;avez pas encore soumis d&apos;offre.
                </p>
                <Link href="/" style={{ color: 'var(--color-ink)', fontSize: '14px' }}>
                  Voir la galerie →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {myOffers.map((offer, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'baseline',
                      padding: '12px 0',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <Link
                      href={`/artworks/${offer.artworkId}`}
                      style={{
                        flex: 1,
                        color: 'var(--color-ink)',
                        textDecoration: 'none',
                        fontSize: '16px',
                      }}
                    >
                      {offer.artworkTitle ?? '—'}
                    </Link>
                    <span style={{
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: '16px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>
                      {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: '13px',
                      color: 'var(--color-ink-muted)',
                      whiteSpace: 'nowrap',
                    }}>
                      {new Date(offer.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 3 : Mes acquisitions ──────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Mes acquisitions</h2>
          <div style={{ marginTop: '16px' }}>
            {myAcquisitions.length === 0 ? (
              <p style={{ color: 'var(--color-ink-muted)', fontSize: '14px', margin: 0 }}>
                Aucune acquisition probable. Les œuvres vendues sur lesquelles vous avez
                soumis une offre apparaîtront ici.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {myAcquisitions.map((acq, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <Link
                      href={`/artworks/${acq.artworkId}`}
                      style={{
                        flex: 1,
                        color: 'var(--color-ink)',
                        textDecoration: 'none',
                        fontSize: '16px',
                      }}
                    >
                      {acq.artworkTitle ?? '—'}
                    </Link>
                    {/* Badge "Acquis" — sans border-radius (D-03) */}
                    <span style={{
                      fontSize: '12px',
                      fontFamily: 'var(--font-space-mono)',
                      color: '#5b8e7d',
                      padding: '2px 8px',
                      backgroundColor: 'rgba(91,142,125,0.12)',
                      borderRadius: 0,  // D-03 : pas de border-radius
                    }}>
                      Acquis (offre soumise)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 4 : Mes œuvres enregistrées ──────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Mes œuvres enregistrées</h2>
          <div style={{ marginTop: '16px' }}>
            {mySavedArtworks.length === 0 ? (
              <p style={{ color: 'var(--color-ink-muted)', fontSize: '14px', margin: 0 }}>
                Aucune œuvre enregistrée. Cliquez sur le cœur sur la page d&apos;une œuvre
                pour l&apos;enregistrer ici.
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '16px',
              }}>
                {mySavedArtworks.map(({ artwork }, i) => artwork && (
                  <Link
                    key={i}
                    href={`/artworks/${artwork.id}`}
                    style={{ textDecoration: 'none', color: 'var(--color-ink)' }}
                  >
                    <div style={{ backgroundColor: 'var(--color-surface)' }}>
                      {artwork.thumbnailPath && (
                        <div style={{
                          aspectRatio: '1',
                          overflow: 'hidden',
                          backgroundColor: '#f5f5f5',
                        }}>
                          <img
                            src={storage.getUrl(artwork.thumbnailPath)}
                            alt={artwork.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>
                      )}
                      <div style={{ padding: '8px' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--color-ink)',
                        }}>
                          {artwork.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Lien retour galerie ───────────────────────────────────────────── */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Link href="/" style={{
            color: 'var(--color-ink-muted)',
            fontSize: '14px',
            fontFamily: 'var(--font-space-mono)',
            textDecoration: 'none',
          }}>
            ← Retour à la galerie
          </Link>
        </div>

      </main>
    </>
  )
}
