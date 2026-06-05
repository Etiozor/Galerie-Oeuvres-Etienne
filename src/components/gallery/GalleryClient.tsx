/**
 * Composant client principal de la galerie.
 *
 * Layout d'après galerie.html (design export) :
 * - Hero éditorial : eyebrow + Oswald clamp + Cormorant italic + stats (N œuvres · N disponibles)
 * - Barre filtre sticky : recherche + chips par section (Filtrer / Médium / Statut) + tri
 * - Clic sur une carte → navigation vers /artworks/{id}
 * - Grille masonry avec scroll infini
 *
 * PIÈGE 2 : useSearchParams → ce composant doit être enveloppé dans <Suspense>.
 */
'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MasonryGrid } from './MasonryGrid'
import { ArtworkCard } from './ArtworkCard'
import { ScrollSentinel } from './ScrollSentinel'
import type { ArtworkType, Medium } from '@/db/schema'

const BATCH_SIZE = 6

interface ArtworkWithUrls {
  id: number
  title: string
  status: string
  thumbnailUrl: string | null
  processedUrl: string | null
  widthCmNum: number
  heightCmNum: number
  typeId: number | null
  mediumIds: number[]
  typeName: string | null
  mediumName: string | null
  basePriceNum: number
  descriptionSnippet: string | null
  createdTimestamp: number
}

interface GalleryClientProps {
  artworks: ArtworkWithUrls[]
  types: ArtworkType[]
  mediums: Medium[]
  /** ID du visiteur connecté — undefined si non identifié */
  visitorId?: number
  /** IDs des œuvres enregistrées par ce visiteur (lu côté serveur) */
  savedArtworkIds?: number[]
}

// ── Chip helper ───────────────────────────────────────────────────────────────

function Chip({ value, label, active, color, onToggle }: {
  value: string
  label: string
  active: boolean
  color?: string
  onToggle: (v: string) => void
}) {
  return (
    <button
      onClick={() => onToggle(active ? 'all' : value)}
      style={{
        padding: '7px 14px',
        border: '1px solid rgba(0,0,0,0.08)',
        background: active ? (color ?? 'var(--color-teal)') : 'var(--color-bg)',
        color: active ? '#fff' : 'var(--color-ink)',
        fontFamily: 'var(--font-space-mono)', fontSize: 12,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap',
        transition: 'background 140ms, color 140ms',
      }}
    >{label}</button>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export function GalleryClient({ artworks, types, mediums, visitorId, savedArtworkIds = [] }: GalleryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeFilter = searchParams.get('filter') ?? 'all'
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('date-desc')

  useEffect(() => { setVisibleCount(BATCH_SIZE) }, [activeFilter, search, sort])

  // Comptage statuts pour afficher "N disponibles" dans le hero
  const availableCount = useMemo(() => artworks.filter(a => a.status === 'available').length, [artworks])

  // Filtrage + tri
  const filteredArtworks = useMemo(() => {
    let list = artworks

    if (activeFilter !== 'all') {
      if (activeFilter.startsWith('type:')) {
        const typeId = parseInt(activeFilter.slice(5), 10)
        list = list.filter(a => a.typeId === typeId)
      } else if (activeFilter.startsWith('medium:')) {
        const mediumId = parseInt(activeFilter.slice(7), 10)
        list = list.filter(a => a.mediumIds.includes(mediumId))
      } else if (activeFilter.startsWith('status:')) {
        const statusVal = activeFilter.slice(7)
        list = list.filter(a => a.status === statusVal)
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.descriptionSnippet ?? '').toLowerCase().includes(q)
      )
    }

    if (sort === 'date-asc')   return [...list].sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    if (sort === 'price-desc') return [...list].sort((a, b) => b.basePriceNum - a.basePriceNum)
    if (sort === 'price-asc')  return [...list].sort((a, b) => a.basePriceNum - b.basePriceNum)
    return list
  }, [artworks, activeFilter, search, sort])

  const visibleArtworks = filteredArtworks.slice(0, visibleCount)
  const hasMore = visibleCount < filteredArtworks.length

  function loadMore() { setVisibleCount(n => Math.min(n + BATCH_SIZE, filteredArtworks.length)) }

  function handleFilterChange(filter: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (filter === 'all') params.delete('filter')
    else params.set('filter', filter)
    router.replace(`/?${params.toString()}`, { scroll: false })
  }

  const sectionLabel = {
    fontFamily: 'var(--font-space-mono)', fontSize: 10,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    color: 'var(--color-ink-muted)',
  }

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '48px 32px 28px', maxWidth: 1200, margin: '0 auto' }}>
        <span style={sectionLabel}>Galerie POF · Atelier</span>
        <h1 style={{
          margin: '8px 0 0',
          fontFamily: 'var(--font-oswald)', fontWeight: 700,
          fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: 1.05,
          letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-ink)',
        }}>Atelier — collection courante</h1>
        <p style={{
          margin: '14px 0 0',
          fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 18, lineHeight: 1.55,
          color: 'var(--color-ink)', maxWidth: 620,
        }}>
          Dernières œuvres au sortir de l&apos;atelier. Faites défiler la page comme on tournerait les pages d&apos;un carnet ; arrêtez-vous sur ce qui vous attrape. Pour acquérir une œuvre, faites une offre — je réponds à chacune.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
          <span style={{
            fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 13,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-ink)',
          }}>{artworks.length} œuvre{artworks.length !== 1 ? 's' : ''}</span>
          <span style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.18)' }} />
          <span style={{
            fontFamily: 'var(--font-space-mono)', fontSize: 13,
            letterSpacing: '0.06em', color: 'var(--color-teal)',
          }}>● {availableCount} disponible{availableCount !== 1 ? 's' : ''}</span>
        </div>
      </section>

      {/* ── Barre filtre sticky ───────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 56, zIndex: 9,
        padding: '10px 24px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Recherche */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid rgba(0,0,0,0.12)', background: 'var(--color-bg)',
          borderRadius: 3, padding: '0 12px', height: 36, minWidth: 180, flex: '0 1 220px',
          color: 'var(--color-ink-muted)',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="RECHERCHER…"
            style={{
              flex: 1, border: 0, outline: 0,
              fontFamily: 'var(--font-space-mono)', fontSize: 11,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--color-ink)', background: 'transparent',
            }}
          />
        </div>

        {/* Section Filtrer */}
        <span style={sectionLabel}>Filtrer</span>
        <Chip value="all" label="Tous" active={activeFilter === 'all'} onToggle={handleFilterChange} />

        {/* Section Type */}
        {types.length > 0 && (
          <>
            <span style={{ ...sectionLabel, marginLeft: 4 }}>Type</span>
            {types.map(t => (
              <Chip
                key={t.id}
                value={`type:${t.id}`}
                label={t.name}
                active={activeFilter === `type:${t.id}`}
                onToggle={handleFilterChange}
              />
            ))}
          </>
        )}

        {/* Section Médium */}
        {mediums.length > 0 && (
          <>
            <span style={{ ...sectionLabel, marginLeft: 4 }}>Médium</span>
            {mediums.map(m => (
              <Chip
                key={m.id}
                value={`medium:${m.id}`}
                label={m.name}
                active={activeFilter === `medium:${m.id}`}
                onToggle={handleFilterChange}
              />
            ))}
          </>
        )}

        {/* Section Statut */}
        <span style={{ ...sectionLabel, marginLeft: 4 }}>Statut</span>
        <Chip value="status:available" label="Disponibles" active={activeFilter === 'status:available'} color="var(--color-teal)"   onToggle={handleFilterChange} />
        <Chip value="status:reserved"  label="Réservées"   active={activeFilter === 'status:reserved'}  color="var(--color-orange)" onToggle={handleFilterChange} />
        <Chip value="status:sold"      label="Vendues"     active={activeFilter === 'status:sold'}      color="var(--color-red)"    onToggle={handleFilterChange} />

        <span style={{ flex: 1 }} />

        {/* Compteur */}
        <span style={{ ...sectionLabel, color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }}>
          {filteredArtworks.length} affichée{filteredArtworks.length > 1 ? 's' : ''}
        </span>

        {/* Tri */}
        <div style={{ position: 'relative' }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              appearance: 'none', padding: '7px 30px 7px 14px',
              border: '1px solid rgba(0,0,0,0.12)', background: 'var(--color-surface)',
              fontFamily: 'var(--font-space-mono)', fontSize: 11,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--color-ink)', cursor: 'pointer', height: 36, borderRadius: 3,
            }}
          >
            <option value="date-desc">Récentes d&apos;abord</option>
            <option value="date-asc">Anciennes d&apos;abord</option>
            <option value="price-desc">Prix ↓</option>
            <option value="price-asc">Prix ↑</option>
          </select>
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-ink-muted)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="2,3.5 5,6.5 8,3.5"/>
            </svg>
          </div>
        </div>
      </div>

      {/* État vide */}
      {filteredArtworks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontStyle: 'italic', color: 'var(--color-ink-muted)' }}>
            Aucune œuvre ne correspond à ces filtres.
          </p>
        </div>
      )}

      {/* Grille masonry */}
      {visibleArtworks.length > 0 && (
        <div style={{ paddingTop: 8, paddingBottom: 40 }}>
          <MasonryGrid>
            {visibleArtworks.map(artwork => (
              <ArtworkCard
                key={artwork.id}
                {...artwork}
                visitorId={visitorId}
                initialSaved={savedArtworkIds.includes(artwork.id)}
              />
            ))}
          </MasonryGrid>
        </div>
      )}

      <ScrollSentinel onIntersect={loadMore} hasMore={hasMore} />
    </div>
  )
}
