/**
 * AdminNav — Chrome commun de l'administration.
 *
 * Affiche l'en-tête "Galerie POF · Administration" et les onglets de navigation.
 * Scopé sous .pof-admin pour les styles CSS (voir globals.css).
 *
 * @param tab - Onglet actuellement actif : 'artworks' | 'upload' | 'offers' | 'about'
 */

import Link from 'next/link'
import { SignOutButton } from '@/app/admin/_components/SignOutButton'

type AdminTab = 'artworks' | 'upload' | 'offers' | 'about'

interface AdminNavProps {
  tab: AdminTab
  userEmail?: string
}

export function AdminNav({ tab, userEmail }: AdminNavProps) {
  return (
    <>
      <div className="a-header">
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span className="a-brand">Galerie POF</span>
          <span className="a-brand-sub">Administration</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {userEmail && (
            <span style={{
              font: '400 12px var(--font-space-mono)',
              color: 'var(--color-admin-mute)',
              letterSpacing: '0.04em',
            }}>
              {userEmail}
            </span>
          )}
          <SignOutButton />
        </div>
      </div>

      <nav className="a-tabs">
        <Link href="/admin/artworks" className={`a-tab ${tab === 'artworks' ? 'is-active' : ''}`}>
          Mes œuvres
        </Link>
        <Link href="/admin/upload" className={`a-tab ${tab === 'upload' ? 'is-active' : ''}`}>
          Ajouter une œuvre
        </Link>
        <Link href="/admin/artworks" className={`a-tab ${tab === 'offers' ? 'is-active' : ''}`}>
          Offres reçues
        </Link>
        <Link href="/about" className={`a-tab ${tab === 'about' ? 'is-active' : ''}`}>
          À propos
        </Link>
      </nav>
    </>
  )
}
