'use client'

/**
 * Navigation publique — Client Component (nouveau design « Shell »).
 *
 * POURQUOI client ?
 * Le nouveau design affiche un SOUS-TITRE = page courante (navSub) et un
 * BOUTON RETOUR ← sur la page détail. Ces deux éléments dépendent du chemin
 * courant, obtenu via usePathname() — un hook client. Le drawer mobile a aussi
 * un état ouvert/fermé (useState). SiteNav (Server Component) lit la session
 * iron-session et passe isLoggedIn/displayName ici en props.
 *
 * Structure :
 * - Desktop (≥769px) : logo + sous-titre + liens Galerie/Frise/À propos + avatar/identifier
 * - Mobile (≤768px) : header centré (titre + sous-titre) + bouton retour (détail) + hamburger
 * - Drawer droite : Galerie / Frise / À propos / Mon profil
 *
 * L'identification passe par le lien ?identify=1 → ModalTrigger (déjà monté dans layout.tsx).
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SiteNavClientProps {
  /** Visiteur identifié (iron-session) */
  isLoggedIn: boolean
  /** Pseudo/nom du visiteur — utilisé pour l'initiale de l'avatar */
  displayName?: string
}

/** Libellé de la page courante affiché en sous-titre de la nav. */
function routeLabel(pathname: string): string {
  if (pathname === '/') return 'Galerie'
  if (pathname.startsWith('/frise')) return 'Frise'
  if (pathname.startsWith('/about')) return 'À propos'
  if (pathname.startsWith('/mon-profil')) return 'Mon profil'
  if (pathname.startsWith('/artworks')) return 'Œuvre'
  return ''
}

/** Petit carré-initiale (avatar) — teal, initiale crème, rayon 8px. */
function Avatar({ displayName, size = 32 }: { displayName?: string; size?: number }) {
  return (
    <div
      aria-label={displayName ? `Votre profil — ${displayName}` : 'Votre profil'}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: 'var(--color-primary)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-interface)',
          fontSize: Math.round(size * 0.42),
          fontWeight: 600,
          color: 'var(--color-ink-inverse)',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {displayName?.[0]?.toUpperCase() ?? '?'}
      </span>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-interface)',
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--color-ink-muted)',
  textDecoration: 'none',
  cursor: 'pointer',
}

export function SiteNavClient({ isLoggedIn, displayName }: SiteNavClientProps) {
  const pathname = usePathname() || '/'
  const navSub = routeLabel(pathname)
  const showBack = pathname.startsWith('/artworks')
  const [drawer, setDrawer] = useState(false)

  // Bloquer le scroll du body quand le drawer est ouvert (fiable sur iOS).
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  // Fermer le drawer sur Escape.
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <>
      <style>{`
        /* Bascule desktop/mobile de la nav */
        .snav-desktop { display: flex; }
        .snav-mobile { display: none; }
        @media (max-width: 768px) {
          .snav-desktop { display: none; }
          .snav-mobile { display: flex; }
        }
        .snav-link:hover { color: var(--color-ink); }
        @keyframes snav-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes snav-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* ── Nav desktop ─────────────────────────────────────────────── */}
      <nav
        className="snav-desktop"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 56,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: '0 24px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo + sous-titre de route */}
        <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 10, textDecoration: 'none' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-ink)',
            }}
          >
            Galerie POF
          </span>
          {navSub && (
            <span
              style={{
                fontFamily: 'var(--font-interface)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--color-ink-muted)',
              }}
            >
              {navSub}
            </span>
          )}
        </Link>

        {/* Liens + indicateur de connexion */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" className="snav-link" style={linkStyle}>Galerie</Link>
          <Link href="/frise" className="snav-link" style={linkStyle}>Frise</Link>
          <Link href="/about" className="snav-link" style={linkStyle}>À propos</Link>
          {isLoggedIn ? (
            <Link href="/mon-profil" style={{ textDecoration: 'none', display: 'flex' }}>
              <Avatar displayName={displayName} />
            </Link>
          ) : (
            <Link href="?identify=1" className="snav-link" style={linkStyle}>S&apos;identifier</Link>
          )}
        </div>
      </nav>

      {/* ── Header mobile ───────────────────────────────────────────── */}
      <header
        className="snav-mobile"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px 11px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* Bouton retour (page détail uniquement) — sinon espaceur pour garder le titre centré */}
        {showBack ? (
          <Link
            href="/"
            aria-label="Retour à la galerie"
            style={{
              width: 34,
              height: 34,
              flex: 'none',
              border: '1px solid rgba(0,0,0,0.14)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            ←
          </Link>
        ) : (
          <span style={{ width: 34, flex: 'none' }} />
        )}

        {/* Titre + sous-titre centrés */}
        <Link href="/" style={{ flex: 1, minWidth: 0, textAlign: 'center', textDecoration: 'none' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 17,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--color-ink)',
            }}
          >
            Galerie POF
          </div>
          {navSub && (
            <div
              style={{
                fontFamily: 'var(--font-interface)',
                fontSize: 11,
                letterSpacing: '0.06em',
                color: 'var(--color-ink-muted)',
                marginTop: 3,
              }}
            >
              {navSub}
            </div>
          )}
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setDrawer(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={drawer}
          style={{
            width: 34,
            height: 34,
            flex: 'none',
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 16, height: 1.5, background: 'var(--color-ink)', display: 'block' }} />
          <span style={{ width: 16, height: 1.5, background: 'var(--color-ink)', display: 'block' }} />
          <span style={{ width: 16, height: 1.5, background: 'var(--color-ink)', display: 'block' }} />
        </button>
      </header>

      {/* ── Drawer mobile ───────────────────────────────────────────── */}
      {drawer && (
        <>
          <div
            onClick={() => setDrawer(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(26,26,26,0.5)',
              animation: 'snav-fade-in 160ms ease-out',
            }}
          />
          <div
            role="dialog"
            aria-label="Menu de navigation"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 280,
              maxWidth: '82%',
              zIndex: 51,
              background: 'var(--color-surface)',
              borderTopLeftRadius: 'var(--radius-sm)',
              borderBottomLeftRadius: 'var(--radius-sm)',
              boxShadow: '0 18px 44px rgba(26,26,26,0.28)',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px 0',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              animation: 'snav-slide-in 220ms ease-out',
            }}
          >
            <button
              onClick={() => setDrawer(false)}
              aria-label="Fermer le menu"
              style={{
                alignSelf: 'flex-end',
                marginRight: 10,
                width: 34,
                height: 34,
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--color-ink)',
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 6 }}>
              <DrawerLink href="/" onClick={() => setDrawer(false)}>Galerie</DrawerLink>
              <DrawerLink href="/frise" onClick={() => setDrawer(false)}>Frise</DrawerLink>
              <DrawerLink href="/about" onClick={() => setDrawer(false)}>À propos</DrawerLink>
              {isLoggedIn ? (
                <Link
                  href="/mon-profil"
                  onClick={() => setDrawer(false)}
                  style={{ ...drawerLinkStyle, display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <Avatar displayName={displayName} size={28} />
                  Mon profil
                </Link>
              ) : (
                <DrawerLink href="?identify=1" onClick={() => setDrawer(false)}>S&apos;identifier</DrawerLink>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

const drawerLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 48,
  padding: '0 20px',
  fontFamily: 'var(--font-interface)',
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--color-ink)',
  textDecoration: 'none',
}

function DrawerLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} style={drawerLinkStyle}>
      {children}
    </Link>
  )
}
