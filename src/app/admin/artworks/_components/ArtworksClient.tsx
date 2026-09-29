/**
 * ArtworksClient — liste d'administration /admin/artworks.
 *
 * Fidèle au design « Shell » (onglet Administration → Mes œuvres) :
 * - Bandeau sombre de marque (--color-ink-surface) + liens + déconnexion
 * - Onglets admin : Mes œuvres / Ajouter une œuvre
 * - StatTiles : publiées · offres · vendues · brouillons
 * - Grille 2 colonnes de cartes EN LIGNE : vignette 64px + titre + badge statut
 *   + méta/prix/offres + boutons Éditer / Voir.
 *
 * L'édition d'une œuvre se fait sur la page dédiée /admin/artworks/[id]
 * (le panneau latéral « drawer » a été retiré au profit du design en cartes).
 */
'use client'

import Link from 'next/link'
import { AdminHeader } from '@/app/admin/_components/AdminHeader'

// ── Types (inchangés — fournis par la page serveur) ────────────────────────────

export type OfferDetail = {
  id: number
  amount: string
  message: string | null
  createdAt: Date
  visitorDisplayName: string
  visitorPhone: string
  visitorEmail: string | null
}

export type ArtworkRow = {
  id: number
  title: string
  status: 'available' | 'reserved' | 'sold' | 'given'
  publishedAt: Date | null
  imageUrl: string | null
  widthCm: string | null
  heightCm: string | null
  basePrice: string | null
  createdYear: number | null
  createdMonth: number | null
  createdAt: Date
  typeName: string | null
  mediumName: string | null
  offerCount: number
  topOffer: number | null
  savedCount: number
  offers: OfferDetail[]
}

interface ArtworksClientProps {
  artworks: ArtworkRow[]
  userEmail?: string
}

// ── Statut → teinte du badge + couleur du liseré gauche (design STATUS) ─────────
const STATUS_CFG: Record<
  ArtworkRow['status'],
  { label: string; edge: string; bg: string; bc: string; fg: string }
> = {
  available: { label: 'Disponible', edge: 'var(--color-primary)',  bg: 'var(--tint-primary-bg)',  bc: 'var(--tint-primary-bc)',  fg: 'var(--color-primary-ink)' },
  reserved:  { label: 'Réservé',    edge: 'var(--color-warning)',  bg: 'var(--tint-warning-bg)',  bc: 'var(--tint-warning-bc)',  fg: 'var(--color-warning-ink)' },
  sold:      { label: 'Vendu',      edge: 'var(--color-critical)', bg: 'var(--tint-critical-bg)', bc: 'var(--tint-critical-bc)', fg: 'var(--color-critical-ink)' },
  given:     { label: 'Donné',      edge: 'var(--color-success)',  bg: 'var(--tint-success-bg)',  bc: 'var(--tint-success-bc)',  fg: 'var(--color-success-ink)' },
}

// ── Composant principal ─────────────────────────────────────────────────────────

export function ArtworksClient({ artworks, userEmail }: ArtworksClientProps) {
  // StatTiles — chiffres réels du catalogue.
  const tiles: Array<{ value: string; label: string; ink: string }> = [
    { value: String(artworks.filter(a => a.publishedAt !== null).length), label: 'Œuvres publiées', ink: 'var(--color-ink)' },
    { value: String(artworks.reduce((n, a) => n + a.offerCount, 0)),        label: 'Offres reçues',   ink: 'var(--color-primary-ink)' },
    { value: String(artworks.filter(a => a.status === 'sold').length),      label: 'Vendues',         ink: 'var(--color-critical-ink)' },
    { value: String(artworks.filter(a => a.publishedAt === null).length),   label: 'Brouillons',      ink: 'var(--color-warning-ink)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-ink)' }}>
      <style>{`
        .admin-wrap { max-width: 1180px; margin: 0 auto; padding: 20px 24px 48px; }
        /* minmax(0, 1fr) et non 1fr : '1fr' seul vaut minmax(auto, 1fr), ce qui
           empêche la colonne de descendre sous la largeur "min-content" de son
           contenu → la carte gonflait (432px) au lieu de se caler sur l'écran.
           minmax(0, ...) autorise la piste à rétrécir jusqu'à 0, donc la carte
           suit la largeur du conteneur et son contenu s'adapte. */
        .admin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
        @media (max-width: 768px) {
          .admin-wrap { padding: 16px 16px 40px; }
          .admin-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>

      <AdminHeader userEmail={userEmail} activeTab="artworks" />

      <div className="admin-wrap">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── StatTiles ── */}
          <div style={{
            background: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 'var(--radius-sm)', overflow: 'hidden',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          }}>
            {tiles.map((it, i) => (
              <div key={it.label} style={{
                padding: '11px 14px',
                borderRight: (i + 1) % 4 === 0 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0,
              }}>
                <span style={{
                  fontFamily: 'var(--font-interface)', fontWeight: 700, fontSize: 17,
                  fontVariantNumeric: 'tabular-nums', color: it.ink,
                }}>{it.value}</span>
                <span style={{
                  fontFamily: 'var(--font-interface)', fontSize: 10, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--color-ink-muted)',
                }}>{it.label}</span>
              </div>
            ))}
          </div>

          {/* ── Grille de cartes en ligne ── */}
          {artworks.length === 0 ? (
            <div style={{
              padding: '64px 0', textAlign: 'center',
              fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18,
              color: 'var(--color-ink-muted)',
            }}>Aucune œuvre pour l&apos;instant. Ajoutez votre première photo.</div>
          ) : (
            <div className="admin-grid">
              {artworks.map(a => {
                const st = STATUS_CFG[a.status]
                const ratio = `${a.widthCm ? parseFloat(a.widthCm) || 1 : 1} / ${a.heightCm ? parseFloat(a.heightCm) || 1 : 1}`
                const priceLabel = a.basePrice ? `${parseFloat(a.basePrice).toLocaleString('fr-FR')} €` : '—'
                const offersLabel = a.offerCount === 0 ? 'aucune offre' : a.offerCount === 1 ? '1 offre' : `${a.offerCount} offres`
                return (
                  <div key={a.id} style={{
                    background: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.08)',
                    borderLeft: `6px solid ${st.edge}`, borderRadius: 'var(--radius-sm)',
                    padding: '15px 16px', display: 'flex', gap: 14,
                  }}>
                    {/* Vignette */}
                    <div style={{
                      width: 64, flex: 'none', aspectRatio: ratio, maxHeight: 88,
                      background: 'var(--color-desk)', border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                    }}>
                      {a.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.imageUrl} alt={a.title} loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                    </div>

                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18,
                          textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.15,
                          color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{a.title}</span>
                        {/* Badge statut */}
                        <span style={{
                          flex: 'none',
                          display: 'inline-block', fontFamily: 'var(--font-interface)', fontWeight: 600,
                          fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase',
                          padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${st.bc}`, background: st.bg, color: st.fg, whiteSpace: 'nowrap',
                        }}>{st.label}{a.publishedAt === null ? ' · brouillon' : ''}</span>
                      </div>

                      <div style={{
                        display: 'flex', gap: 14, flexWrap: 'wrap',
                        fontFamily: 'var(--font-interface)', fontSize: 11, letterSpacing: '0.06em',
                        color: 'var(--color-ink-muted)',
                      }}>
                        <span>{[a.mediumName, a.widthCm && a.heightCm ? `${a.widthCm}×${a.heightCm} cm` : null].filter(Boolean).join(' · ')}</span>
                        <span>{priceLabel}</span>
                        <span>{offersLabel}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                        <Link href={`/admin/artworks/${a.id}`} style={{
                          minHeight: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center',
                          border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-warning)', color: 'var(--color-ink)',
                          fontFamily: 'var(--font-interface)', fontWeight: 600, fontSize: 12,
                          letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap',
                        }}>Éditer</Link>
                        {a.publishedAt !== null && (
                          <Link href={`/artworks/${a.id}`} target="_blank" rel="noopener noreferrer" style={{
                            minHeight: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center',
                            border: '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-surface)', color: 'var(--color-ink)',
                            fontFamily: 'var(--font-interface)', fontWeight: 600, fontSize: 12,
                            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap',
                          }}>Voir</Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
