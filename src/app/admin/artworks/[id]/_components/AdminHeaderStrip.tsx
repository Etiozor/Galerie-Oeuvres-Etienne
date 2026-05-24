'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AdminHeaderStripProps {
  userEmail: string
}

/**
 * Barre d'administration sticky — GALERIE POF + Administration + email + déconnexion.
 * Commune à toutes les pages admin. Positionnée en haut, sticky, fond blanc.
 */
export function AdminHeaderStrip({ userEmail }: AdminHeaderStripProps) {
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.refresh()
    router.push('/admin/login')
  }

  return (
    <header style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      backgroundColor: 'var(--color-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <Link href="/admin" style={{
          fontFamily: 'var(--font-oswald)',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--color-ink)',
          textDecoration: 'none',
        }}>
          Galerie POF
        </Link>
        <span style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
        }}>
          · Administration
        </span>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link href="/admin/artworks" style={{
          fontFamily: 'var(--font-space-mono)', fontSize: 11,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--color-ink)', textDecoration: 'none',
        }}>
          ← Mes œuvres
        </Link>
        <span style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.12)' }} />
        <Link href="/" target="_blank" rel="noopener noreferrer" style={{
          fontFamily: 'var(--font-space-mono)', fontSize: 11,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--color-ink)', textDecoration: 'none',
        }}>
          ↗ Galerie
        </Link>
        <button
          onClick={handleSignOut}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-space-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Déconnexion
        </button>
      </nav>
    </header>
  )
}
