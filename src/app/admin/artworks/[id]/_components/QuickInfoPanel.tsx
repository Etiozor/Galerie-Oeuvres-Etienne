'use client'

import { InlineEditField } from './InlineEditField'
import { formatCreatedPeriod } from '@/db/schema'

interface QuickInfoPanelProps {
  artwork: {
    description: string
    type: string | null
    medium: string | null
    widthCm: string | null
    heightCm: string | null
    createdYear: number | null
    createdMonth: number | null
    basePrice: string | null
  }
  updateDescriptionAction: (value: string) => Promise<{ success: boolean; error?: string }>
}

/**
 * Panneau info droite du hero "split" — description éditable + infos rapides + prix.
 * Sticky par rapport au scroll de la page.
 */
export function QuickInfoPanel({ artwork, updateDescriptionAction }: QuickInfoPanelProps) {
  return (
    <aside style={{
      position: 'sticky',
      top: 80,
      alignSelf: 'start',
      background: 'var(--color-surface)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 'var(--radius-sm)',
      padding: '28px 24px',
    }}>

      {/* ── Description éditable ── */}
      <div style={{
        font: '400 11px var(--font-space-mono)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-ink-muted)',
        marginBottom: 8,
      }}>
        Description
      </div>
      <div style={{ marginBottom: 28 }}>
        <InlineEditField
          initialValue={artwork.description}
          onSave={updateDescriptionAction}
          as="description"
        />
      </div>

      {/* ── Infos rapides (KV) ── */}
      <div style={{
        font: '400 11px var(--font-space-mono)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-ink-muted)',
        marginBottom: 12,
      }}>
        Infos rapides
      </div>
      <dl style={{
        margin: 0,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        rowGap: 12,
        columnGap: 18,
        paddingTop: 14,
        paddingBottom: 14,
        borderTop: '1px solid rgba(0,0,0,0.08)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}>
        <KV label="Type">{artwork.type ?? '—'}</KV>
        <KV label="Médium">{artwork.medium ?? '—'}</KV>
        <KV label="Dimensions">
          {artwork.widthCm && artwork.heightCm
            ? <span style={{ fontFamily: 'var(--font-space-mono)' }}>{artwork.widthCm} × {artwork.heightCm} cm</span>
            : '—'}
        </KV>
        <KV label="Créée">
          {formatCreatedPeriod(artwork.createdYear, artwork.createdMonth)
            ? <span style={{ fontFamily: 'var(--font-space-mono)' }}>{formatCreatedPeriod(artwork.createdYear, artwork.createdMonth)}</span>
            : '—'}
        </KV>
      </dl>

      {/* ── Prix de base ── */}
      <div style={{
        marginTop: 22,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{
          font: '400 11px var(--font-space-mono)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
        }}>
          Prix de base
        </div>
        {artwork.basePrice ? (
          <span style={{
            font: '700 26px var(--font-space-mono)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-ink)',
            lineHeight: 1,
          }}>
            {parseFloat(artwork.basePrice).toLocaleString('fr-FR')}
            <span style={{ color: 'var(--color-ink-muted)', marginLeft: 4, fontWeight: 400 }}>€</span>
          </span>
        ) : (
          <span style={{ font: '400 14px var(--font-geist-sans)', color: 'var(--color-ink-muted)' }}>—</span>
        )}
      </div>
    </aside>
  )
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{
        font: '400 11px var(--font-space-mono)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-ink-muted)',
        alignSelf: 'center',
      }}>
        {label}
      </dt>
      <dd style={{ margin: 0, font: '400 14px var(--font-geist-sans)', color: 'var(--color-ink)' }}>
        {children}
      </dd>
    </>
  )
}
