/**
 * ArtworksClient — Interface admin pour /admin/artworks.
 *
 * Vocabulaire visuel de la galerie publique (cream, Oswald, Cormorant).
 * Tuiles de filtrage rapide + masonry avec vrais ratios + drawer latéral.
 */
'use client'

import { useState, useRef, useCallback, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateArtworkStatus, deleteArtwork } from '@/actions/artworkAdmin'
import { SignOutButton } from '@/app/admin/_components/SignOutButton'

// ============================================================
// Types
// ============================================================

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

// ============================================================
// Constantes
// ============================================================

const STATUS_CFG: Record<string, { bg: string; fg: string; label: string }> = {
  available: { bg: 'rgba(91,142,125,0.12)',  fg: '#5b8e7d', label: 'Disponible' },
  reserved:  { bg: 'rgba(244,162,89,0.15)',  fg: '#a05a20', label: 'Réservé'    },
  sold:      { bg: 'rgba(188,75,81,0.12)',   fg: '#bc4b51', label: 'Vendu'      },
  given:     { bg: 'rgba(140,179,105,0.15)', fg: '#5a7a3a', label: 'Donné'      },
}

const DRAWER_MIN = 360
const DRAWER_MAX = 720
const DRAWER_DEFAULT = 420

// Motif vagues SVG tuilé — identique à BackgroundDecor
const WAVES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280"><g fill="none" stroke="#2b2b2b" stroke-width="1" stroke-linecap="round"><path d="M0 10 Q70 -55 140 10 T280 10"/><path d="M0 35 Q70 -30 140 35 T280 35"/><path d="M0 60 Q70 -5 140 60 T280 60"/><path d="M0 85 Q70 20 140 85 T280 85"/><path d="M0 110 Q70 45 140 110 T280 110"/><path d="M0 135 Q70 70 140 135 T280 135"/><path d="M0 160 Q70 95 140 160 T280 160"/><path d="M0 185 Q70 120 140 185 T280 185"/><path d="M0 210 Q70 145 140 210 T280 210"/><path d="M0 235 Q70 170 140 235 T280 235"/><path d="M0 260 Q70 195 140 260 T280 260"/></g></svg>`

function fmtDateRel(d: Date | null): string {
  if (!d) return ''
  const today = new Date()
  const days = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? 's' : ''}`
}

// ============================================================
// Composant principal
// ============================================================

export function ArtworksClient({ artworks, userEmail }: ArtworksClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Filtres ──
  const [tileFilter, setTileFilter] = useState<'all' | 'offers' | 'published'>('all')
  const [search, setSearch]         = useState('')
  const [medFilter, setMedFilter]   = useState<'all' | 'Dessin' | 'Peinture'>('all')
  const [sort, setSort]             = useState('date-desc')

  // ── Drawer ──
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const drawerRef                   = useRef<HTMLDivElement>(null)
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT)
  const [localStatus, setLocalStatus] = useState<'available' | 'reserved' | 'sold' | 'given'>('available')

  useEffect(() => {
    const stored = localStorage.getItem('admin.gal.drawer.width')
    if (stored) setDrawerWidth(Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, parseInt(stored, 10))))
  }, [])

  const selectedArtwork = artworks.find(a => a.id === selectedId) ?? null
  useEffect(() => {
    if (selectedArtwork) setLocalStatus(selectedArtwork.status)
  }, [selectedArtwork?.id, selectedArtwork?.status])

  // ── Comptes tuiles ──
  const counts = {
    all:       artworks.length,
    offers:    artworks.filter(a => a.offerCount > 0).length,
    published: artworks.filter(a => a.publishedAt !== null).length,
  }

  // ── Filtrage + tri ──
  const filtered = artworks
    .filter(a => {
      if (tileFilter === 'offers')    return a.offerCount > 0
      if (tileFilter === 'published') return a.publishedAt !== null
      return true
    })
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()))
    .filter(a => {
      if (medFilter === 'Dessin')   return a.typeName === 'Dessin'
      if (medFilter === 'Peinture') return a.typeName === 'Peinture'
      return true
    })
    .sort((a, b) => {
      if (sort === 'date-asc')     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sort === 'offers-desc')  return b.offerCount - a.offerCount
      if (sort === 'price-desc')   return (parseFloat(b.basePrice || '0')) - (parseFloat(a.basePrice || '0'))
      if (sort === 'price-asc')    return (parseFloat(a.basePrice || '0')) - (parseFloat(b.basePrice || '0'))
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  function handleStatusChange(newStatus: 'available' | 'reserved' | 'sold' | 'given') {
    if (!selectedArtwork) return
    setLocalStatus(newStatus)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('status', newStatus)
      await updateArtworkStatus.bind(null, selectedArtwork.id)(null, fd)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!selectedArtwork) return
    if (!confirm(`Supprimer "${selectedArtwork.title}" définitivement ?\nCette action est irréversible.`)) return
    setSelectedId(null)
    startTransition(() => { deleteArtwork(selectedArtwork.id) })
  }

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX     = e.clientX
    const startWidth = drawerRef.current?.offsetWidth ?? DRAWER_DEFAULT
    const onMove = (me: MouseEvent) => {
      const newWidth = Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, startWidth + (startX - me.clientX)))
      setDrawerWidth(newWidth)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem('admin.gal.drawer.width', String(drawerRef.current?.offsetWidth ?? DRAWER_DEFAULT))
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const handleResizeDblClick = useCallback(() => {
    const w = drawerWidth > 440 ? DRAWER_DEFAULT : 520
    setDrawerWidth(w)
    localStorage.setItem('admin.gal.drawer.width', String(w))
  }, [drawerWidth])

  const wavesBg = `url("data:image/svg+xml;utf8,${encodeURIComponent(WAVES_SVG)}")`

  // ============================================================
  // Rendu
  // ============================================================
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-ink)',
      position: 'relative',
    }}>

      {/* Fond vagues en filigrane */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        opacity: 0.07,
        backgroundImage: wavesBg,
        backgroundRepeat: 'repeat',
      }} />

      {/* Contenu au-dessus du fond */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Nav galerie-admin ── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 10,
          height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{
              fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 22,
              letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-ink)',
            }}>Galerie POF</span>
            <span style={{
              fontFamily: 'var(--font-space-mono)', fontSize: 11,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-muted)',
            }}>· Administration</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {[
              { href: '/admin', label: 'Tableau de bord', active: false },
              { href: '/admin/artworks', label: 'Mes œuvres', active: true },
            ].map(({ href, label, active }) => (
              <Link key={href} href={href} style={{
                fontFamily: 'var(--font-space-mono)', fontSize: 11,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: active ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                textDecoration: 'none', padding: '8px 4px',
              }}>{label}</Link>
            ))}
            <span style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.12)' }} />
            <Link href="/" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'var(--font-space-mono)', fontSize: 11,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-ink)', textDecoration: 'none', padding: '8px 4px',
            }}>↗ Galerie</Link>
            <SignOutButton />
          </nav>
        </header>

        {/* ── Titre de page ── */}
        <div style={{
          padding: '32px 32px 4px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
        }}>
          <div>
            <span style={{
              fontFamily: 'var(--font-space-mono)', fontSize: 11,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-muted)',
            }}>Catalogue</span>
            <h1 style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 44,
              lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-ink)',
            }}>Mes œuvres</h1>
            <p style={{
              margin: '10px 0 0',
              fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.5,
              color: 'var(--color-ink)',
            }}>
              {artworks.length} œuvre{artworks.length !== 1 ? 's' : ''} au catalogue.
              Cliquer une vignette pour l&apos;éditer dans le panneau latéral.
            </p>
          </div>
          <Link href="/admin/upload" style={{
            padding: '12px 22px',
            background: 'var(--color-ink)', color: '#fff', border: 0, borderRadius: 3,
            fontFamily: 'var(--font-space-mono)', fontSize: 12,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none', whiteSpace: 'nowrap',
            display: 'inline-block',
          }}>+ Uploader une photo</Link>
        </div>

        {/* ── Tuiles stat ── */}
        <div style={{ padding: '28px 32px 8px', display: 'flex', gap: 14 }}>
          {([
            { key: 'all',       label: 'Toutes',      hint: 'au catalogue',   accent: 'var(--color-ink)',    bg: 'var(--color-surface)', count: counts.all },
            { key: 'offers',    label: 'Avec offres', hint: 'à arbitrer',     accent: 'var(--color-red)',    bg: '#f4a259',             count: counts.offers },
            { key: 'published', label: 'Publiées',    hint: 'sur la galerie', accent: 'var(--color-teal)',   bg: '#cfe1d8',             count: counts.published },
          ] as const).map(tile => {
            const active = tileFilter === tile.key
            return (
              <button key={tile.key} onClick={() => setTileFilter(
                active && tile.key !== 'all' ? 'all' : tile.key
              )} style={{
                flex: 1, textAlign: 'left',
                padding: '20px 22px 18px',
                background: active ? tile.bg : 'var(--color-surface)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderTop: `3px solid ${active ? tile.accent : 'transparent'}`,
                borderRadius: 3, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 8,
                transition: 'background .14s, border-color .14s',
                minWidth: 0, color: 'var(--color-ink)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: 12,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: active ? tile.accent : 'var(--color-ink-muted)',
                }}>{tile.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{
                    fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 42,
                    lineHeight: 1, color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.02em',
                  }}>{tile.count}</span>
                  <span style={{
                    fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 14,
                    color: 'var(--color-ink-muted)',
                  }}>{tile.hint}</span>
                </div>
                {active && (
                  <span style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: 10,
                    letterSpacing: '0.12em', textTransform: 'uppercase', color: tile.accent,
                  }}>Filtré ●</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Barre filtres + tri ── */}
        <div style={{
          padding: '20px 32px 14px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          {/* Recherche */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 14px',
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'var(--color-surface)',
            height: 36, minWidth: 260, flex: '0 1 320px',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="RECHERCHER PAR TITRE…"
              style={{
                flex: 1, border: 0, outline: 0,
                fontFamily: 'var(--font-space-mono)', fontSize: 11,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--color-ink)', background: 'transparent',
              }}
            />
          </div>

          {/* Chips médium */}
          {(['all', 'Dessin', 'Peinture'] as const).map(m => (
            <button key={m} onClick={() => setMedFilter(m)} style={{
              padding: '7px 14px',
              border: '1px solid rgba(0,0,0,0.08)',
              background: medFilter === m ? 'var(--color-teal)' : 'var(--color-surface)',
              color: medFilter === m ? '#fff' : 'var(--color-ink)',
              fontFamily: 'var(--font-space-mono)', fontSize: 12,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap',
            }}>{m === 'all' ? 'Tous médiums' : m}</button>
          ))}

          <span style={{ flex: 1 }} />

          <span style={{
            fontFamily: 'var(--font-space-mono)', fontSize: 11,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-muted)',
          }}>{filtered.length} affichée{filtered.length > 1 ? 's' : ''}</span>

          {/* Tri */}
          <div style={{ position: 'relative' }}>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              appearance: 'none',
              padding: '7px 30px 7px 14px',
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'var(--color-surface)',
              fontFamily: 'var(--font-space-mono)', fontSize: 11,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--color-ink)', cursor: 'pointer',
              height: 36, borderRadius: 3,
            }}>
              <option value="date-desc">Date d&apos;ajout ↓</option>
              <option value="date-asc">Date d&apos;ajout ↑</option>
              <option value="offers-desc">Nombre d&apos;offres</option>
              <option value="price-desc">Prix ↓</option>
              <option value="price-asc">Prix ↑</option>
            </select>
            <div style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none', color: 'var(--color-ink-muted)',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,3.5 5,6.5 8,3.5"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Grille masonry + drawer ── */}
        <div style={{
          display: 'flex',
          paddingRight: selectedArtwork ? `${drawerWidth}px` : 0,
          transition: 'padding-right .15s',
        }}>
          <main style={{ flex: 1, padding: '8px 24px 40px', minWidth: 0 }}>

            {/* État vide */}
            {filtered.length === 0 && (
              <div style={{
                padding: '64px 0', textAlign: 'center',
                fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 18,
                color: 'var(--color-ink-muted)',
              }}>
                {artworks.length === 0
                  ? 'Aucune œuvre pour l\'instant. Ajoutez votre première photo.'
                  : 'Aucune œuvre ne correspond à ces filtres.'}
              </div>
            )}

            {/* Grille masonry */}
            {filtered.length > 0 && (
              <>
                <style>{`
                  .gal-admin-cols { column-count: 4; column-gap: 18px; }
                  .gal-admin-cols > .gal-tile-wrap { break-inside: avoid; margin-bottom: 18px; display: block; }
                  @media (max-width: 1400px) { .gal-admin-cols { column-count: 3; } }
                  @media (max-width: 1024px) { .gal-admin-cols { column-count: 2; } }
                  @media (max-width: 640px)  { .gal-admin-cols { column-count: 1; } }
                  .gal-admin-card:hover .gal-admin-overlay { opacity: 1 !important; }
                `}</style>
                <div className="gal-admin-cols">
                  {filtered.map(a => {
                    const sold = a.status === 'sold' || a.status === 'given'
                    const stampColor = a.status === 'sold' ? 'var(--color-red)' : 'var(--color-green)'
                    const stampLabel = a.status === 'sold' ? 'Vendu' : 'Donné'
                    const w = a.widthCm ? parseFloat(a.widthCm) || 1 : 1
                    const h = a.heightCm ? parseFloat(a.heightCm) || 1 : 1
                    const isSelected = selectedId === a.id
                    return (
                      <div key={a.id} className="gal-tile-wrap">
                        <div
                          className="gal-admin-card"
                          onClick={() => setSelectedId(isSelected ? null : a.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' && setSelectedId(a.id)}
                          style={{
                            position: 'relative', display: 'block', cursor: 'pointer',
                            aspectRatio: `${w} / ${h}`,
                            background: 'var(--color-surface)',
                            overflow: 'hidden', userSelect: 'none',
                            outline: isSelected ? '2px solid var(--color-ink)' : 'none',
                            outlineOffset: 0,
                          }}
                        >
                          {a.imageUrl ? (
                            <img src={a.imageUrl} alt={a.title} loading="lazy" style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                            }} />
                          ) : (
                            <div style={{
                              position: 'absolute', inset: 0, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-space-mono)', fontSize: 11,
                              color: 'var(--color-ink-muted)',
                            }}>Image à venir</div>
                          )}

                          {/* Pill "Brouillon" si pas encore publié */}
                          {a.publishedAt === null && (
                            <div style={{
                              position: 'absolute', top: 8, left: 8,
                              padding: '3px 8px',
                              background: 'rgba(255,255,255,0.92)',
                              color: '#737373',
                              fontFamily: 'var(--font-space-mono)', fontSize: 10,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              borderRadius: 3,
                              border: '1px solid rgba(115,115,115,0.2)',
                            }}>Brouillon</div>
                          )}

                          {/* Pill offres — top-right */}
                          {a.offerCount > 0 && (
                            <div style={{
                              position: 'absolute', top: 8, right: 8,
                              padding: '3px 8px',
                              background: 'var(--color-orange)', color: '#fff',
                              fontFamily: 'var(--font-space-mono)', fontSize: 10,
                              letterSpacing: '0.08em', textTransform: 'uppercase',
                              borderRadius: 3,
                            }}>{a.offerCount} offre{a.offerCount > 1 ? 's' : ''}</div>
                          )}

                          {/* Stamp Vendu / Donné */}
                          {sold && (
                            <div aria-hidden="true" style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              pointerEvents: 'none',
                            }}>
                              <span style={{
                                transform: 'rotate(-12deg)',
                                fontFamily: 'var(--font-oswald)', fontWeight: 700,
                                fontSize: 22, lineHeight: 1, letterSpacing: '0.18em',
                                color: stampColor,
                                border: `3px solid ${stampColor}`,
                                padding: '6px 14px',
                                background: 'rgba(242,232,207,0.65)',
                                textTransform: 'uppercase',
                              }}>{stampLabel}</span>
                            </div>
                          )}

                          {/* Overlay hover */}
                          <div className="gal-admin-overlay" style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(26,26,26,0.62)',
                            color: '#fff',
                            opacity: 0,
                            transition: 'opacity .2s ease',
                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                            padding: 14,
                          }}>
                            <div style={{
                              fontFamily: 'var(--font-oswald)', fontWeight: 600, fontSize: 15,
                              lineHeight: 1.1, letterSpacing: '0.05em', textTransform: 'uppercase',
                            }}>{a.title}</div>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'baseline', marginTop: 4, gap: 8,
                            }}>
                              <span style={{
                                fontFamily: 'var(--font-space-mono)', fontSize: 10,
                                letterSpacing: '0.06em', opacity: 0.85, textTransform: 'uppercase',
                              }}>
                                {a.mediumName} · {w}×{h} cm
                              </span>
                              {a.basePrice && (
                                <span style={{
                                  fontFamily: 'var(--font-space-mono)', fontWeight: 600, fontSize: 13,
                                  fontVariantNumeric: 'tabular-nums',
                                }}>
                                  {parseFloat(a.basePrice).toLocaleString('fr-FR')} €
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* ── Drawer latéral ── */}
      {selectedArtwork && (() => {
        const drawerStatus = STATUS_CFG[selectedArtwork.status] ?? { bg: 'rgba(91,142,125,0.12)', fg: '#5b8e7d', label: 'Disponible' }
        return (
        <div
          ref={drawerRef}
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 100,
            width: drawerWidth,
            background: 'var(--color-surface)',
            borderLeft: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Poignée de redimensionnement */}
          <div
            onMouseDown={handleResizeStart}
            onDoubleClick={handleResizeDblClick}
            title="Glisser pour redimensionner · double-clic pour basculer"
            style={{
              position: 'absolute', top: 0, bottom: 0, left: -3,
              width: 7, cursor: 'col-resize', zIndex: 10,
            }}
          >
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 4, height: 36,
              background: 'rgba(0,0,0,0.18)', borderRadius: 2,
            }} />
          </div>

          {/* En-tête du drawer : badge statut + fermer */}
          <div style={{
            padding: '14px 22px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            background: 'var(--color-surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '3px 8px',
                background: drawerStatus.bg,
                color: drawerStatus.fg,
                fontFamily: 'var(--font-space-mono)', fontSize: 10,
                letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 3,
              }}>{drawerStatus.label}</span>
              {selectedArtwork.publishedAt === null && (
                <span style={{
                  padding: '3px 8px',
                  background: '#fafafa', color: '#737373',
                  border: '1px solid rgba(115,115,115,0.2)',
                  fontFamily: 'var(--font-space-mono)', fontSize: 10,
                  letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 3,
                }}>Brouillon</span>
              )}
            </div>
            <button onClick={() => setSelectedId(null)} style={{
              width: 28, height: 28,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'var(--color-bg)', borderRadius: 3,
              cursor: 'pointer', color: 'var(--color-ink-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }} aria-label="Fermer le panneau">×</button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Aperçu image */}
            <div style={{
              background: 'var(--color-bg)',
              padding: '24px 22px',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              position: 'relative',
            }}>
              <div style={{
                position: 'relative', margin: '0 auto',
                maxWidth: 320,
                aspectRatio: `${selectedArtwork.widthCm ? parseFloat(selectedArtwork.widthCm) || 1 : 1} / ${selectedArtwork.heightCm ? parseFloat(selectedArtwork.heightCm) || 1 : 1}`,
                background: 'var(--color-surface)',
                border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden',
              }}>
                {selectedArtwork.imageUrl ? (
                  <img
                    src={selectedArtwork.imageUrl}
                    alt={selectedArtwork.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-space-mono)', fontSize: 11, color: 'var(--color-ink-muted)',
                  }}>Image à venir</div>
                )}
              </div>
            </div>

            {/* Corps du drawer */}
            <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Titre + méta */}
              <div>
                <h2 style={{
                  margin: 0,
                  fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 26,
                  lineHeight: 1.1, letterSpacing: '0.04em', textTransform: 'uppercase',
                  color: 'var(--color-ink)',
                }}>{selectedArtwork.title}</h2>
                <p style={{
                  margin: '8px 0 0',
                  fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5,
                  color: 'var(--color-ink)',
                }}>
                  {[selectedArtwork.typeName, selectedArtwork.mediumName].filter(Boolean).join(' · ')}
                  {selectedArtwork.widthCm && selectedArtwork.heightCm && (
                    <> · {selectedArtwork.widthCm}×{selectedArtwork.heightCm} cm</>
                  )}
                  {selectedArtwork.createdYear && (
                    <> — {selectedArtwork.createdMonth && selectedArtwork.createdMonth >= 1 && selectedArtwork.createdMonth <= 12
                      ? ['Janv.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'][selectedArtwork.createdMonth - 1] + ' '
                      : ''}{selectedArtwork.createdYear}</>
                  )}
                </p>
              </div>

              {/* Stats row */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                background: 'var(--color-bg)', border: '1px solid rgba(0,0,0,0.08)',
              }}>
                {[
                  ['Offres', selectedArtwork.offerCount],
                  ['♡ reçus', selectedArtwork.savedCount],
                  ['Top offre', selectedArtwork.topOffer !== null
                    ? `${selectedArtwork.topOffer.toLocaleString('fr-FR')} €` : '—'],
                ].map(([k, v], i) => (
                  <div key={String(k)} style={{
                    padding: '14px 10px',
                    borderRight: i < 2 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-oswald)', fontWeight: 700, fontSize: 22,
                      color: 'var(--color-ink)', fontVariantNumeric: 'tabular-nums',
                    }}>{v}</div>
                    <div style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: 10,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--color-ink-muted)', marginTop: 4,
                    }}>{k}</div>
                  </div>
                ))}
              </div>

              {/* Statut de vente (segmented inline) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: 11,
                  letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-muted)',
                }}>Statut de vente</span>
                <div style={{
                  display: 'flex', background: 'var(--color-bg)',
                  border: '1px solid rgba(0,0,0,0.12)', padding: 0,
                }}>
                  {(['available', 'reserved', 'sold', 'given'] as const).map(s => (
                    <button key={s} onClick={() => handleStatusChange(s)} style={{
                      flex: 1, padding: '8px 0', border: 0,
                      background: localStatus === s ? 'var(--color-ink)' : 'transparent',
                      color: localStatus === s ? '#fff' : 'var(--color-ink-muted)',
                      fontFamily: 'var(--font-space-mono)', fontSize: 11,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      cursor: 'pointer', borderRadius: 0,
                    }}>
                      {s === 'available' ? 'Dispo' : s === 'reserved' ? 'Réservé' : s === 'sold' ? 'Vendu' : 'Donné'}
                    </button>
                  ))}
                </div>
                {isPending && (
                  <span style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: 11,
                    color: 'var(--color-ink-muted)',
                  }}>Enregistrement…</span>
                )}
              </div>

              {/* Liste des offres */}
              {selectedArtwork.offers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: 11,
                    letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-muted)',
                  }}>Offres reçues ({selectedArtwork.offers.length})</span>
                  <div style={{ background: 'var(--color-bg)', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {selectedArtwork.offers.map((offer, i) => (
                      <div key={offer.id} style={{
                        padding: '10px 14px',
                        borderBottom: i < selectedArtwork.offers.length - 1
                          ? '1px solid rgba(0,0,0,0.06)' : 'none',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 14,
                          color: 'var(--color-orange)', fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap', paddingTop: 2,
                        }}>
                          {parseFloat(offer.amount).toLocaleString('fr-FR')} €
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: 'var(--font-geist-sans, sans-serif)', fontSize: 13,
                            fontWeight: 500, color: 'var(--color-ink)',
                          }}>{offer.visitorDisplayName}</div>
                          <div style={{
                            fontFamily: 'var(--font-space-mono)', fontSize: 10,
                            color: 'var(--color-ink-muted)', marginTop: 2,
                          }}>
                            {offer.visitorPhone}
                            {offer.visitorEmail && <> · {offer.visitorEmail}</>}
                            {' · '}
                            {new Date(offer.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                          {offer.message && (
                            <div style={{
                              fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 13, lineHeight: 1.4,
                              color: 'var(--color-ink-muted)', marginTop: 4,
                            }}>&ldquo;{offer.message}&rdquo;</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <Link href={`/admin/artworks/${selectedArtwork.id}`} style={{
                  padding: '9px 16px',
                  background: 'var(--color-teal)', color: '#fff', border: 0, borderRadius: 3,
                  fontFamily: 'var(--font-space-mono)', fontSize: 11,
                  letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                  cursor: 'pointer', display: 'inline-block',
                }}>Modifier</Link>
                {selectedArtwork.publishedAt !== null && (
                  <Link href={`/artworks/${selectedArtwork.id}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: '9px 16px',
                      background: 'transparent', color: 'var(--color-ink-muted)',
                      border: '1px solid transparent',
                      fontFamily: 'var(--font-space-mono)', fontSize: 11,
                      letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                      cursor: 'pointer', display: 'inline-block', borderRadius: 3,
                    }}>Voir sur la galerie ↗</Link>
                )}
                <span style={{ flex: 1 }} />
                <button onClick={handleDelete} disabled={isPending} style={{
                  padding: '9px 16px',
                  background: 'transparent', color: 'var(--color-red)',
                  border: '1px solid rgba(188,75,81,0.4)', borderRadius: 3,
                  fontFamily: 'var(--font-space-mono)', fontSize: 11,
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                }}>Supprimer</button>
              </div>

            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
