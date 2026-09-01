/**
 * En-tête d'administration partagé (fidèle au design « Shell ») :
 * bandeau sombre de marque + onglets Mes œuvres / Ajouter une œuvre.
 *
 * Rendu centré (max-width 1180) pour s'aligner sur le contenu des pages admin,
 * qu'elles soient elles-mêmes centrées (liste) ou en pleine largeur (upload).
 */
'use client'

import Link from 'next/link'
import { SignOutButton } from './SignOutButton'

const muted: React.CSSProperties = {
  fontFamily: 'var(--font-interface)', fontSize: 11,
  letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-muted)',
}

export function AdminHeader({
  userEmail,
  activeTab,
}: {
  userEmail?: string
  activeTab: 'artworks' | 'upload'
}) {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%', padding: '20px 24px 0' }}>
      {/* Bandeau sombre */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
        padding: '14px 20px', background: 'var(--color-ink-surface)', borderRadius: 'var(--radius-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
            textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-inverse)',
          }}>Galerie POF</span>
          <span style={{ ...muted, color: 'rgba(253,248,232,0.6)' }}>· Administration</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/" target="_blank" rel="noopener noreferrer" style={{
            ...muted, color: 'var(--color-ink-inverse)', textDecoration: 'none',
          }}>↗ Galerie</Link>
          {userEmail && (
            <span style={{
              fontFamily: 'var(--font-interface)', fontSize: 12, letterSpacing: '0.04em',
              color: 'rgba(253,248,232,0.6)',
            }}>{userEmail}</span>
          )}
          <SignOutButton
            label="Déconnexion"
            style={{
              minHeight: 32, padding: '0 12px',
              border: '1px solid rgba(253,248,232,0.35)', borderRadius: 'var(--radius-sm)',
              background: 'transparent', color: 'var(--color-ink-inverse)',
              fontFamily: 'var(--font-interface)', fontSize: 12, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
            }}
          />
        </div>
      </div>

      {/* Onglets admin */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
        {[
          { href: '/admin/artworks', label: 'Mes œuvres', active: activeTab === 'artworks' },
          { href: '/admin/upload',   label: 'Ajouter une œuvre', active: activeTab === 'upload' },
        ].map(t => (
          <Link key={t.href} href={t.href} style={{
            minHeight: 32, padding: '6px 12px', display: 'inline-flex', alignItems: 'center',
            border: t.active ? '1px solid transparent' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 'var(--radius-sm)',
            background: t.active ? 'var(--color-primary)' : 'var(--color-surface)',
            color: t.active ? 'var(--color-ink-inverse)' : 'var(--color-ink)',
            fontFamily: 'var(--font-interface)', fontWeight: 600, fontSize: 12,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap',
          }}>{t.label}</Link>
        ))}
      </div>
    </div>
  )
}
