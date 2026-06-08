/**
 * AdminHamburgerMenu — Menu navigation mobile pour les pages admin.
 *
 * POURQUOI un composant séparé de HamburgerMenu ?
 * Les pages admin ont leur propre ensemble de liens (Mes œuvres, Upload, Galerie, Déconnexion)
 * et ne partagent pas la session iron-session visiteur. Un composant dédié admin
 * évite de mélanger les deux contextes de navigation.
 *
 * PATTERN IDENTIQUE à HamburgerMenu.tsx :
 * - useState + useEffect overflow body + useEffect Escape
 * - Overlay z-index 50, panneau z-index 51
 * - D-03 : borderRadius: 0 partout
 * - Touch targets 44px minimum
 * - Animation slideInFromRight
 *
 * SÉCURITÉ : les liens admin sont des chemins internes statiques — aucun risque XSS.
 * La déconnexion appelle /api/auth/sign-out (Better Auth) puis redirige. [T-admin-01]
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AdminHamburgerMenuProps {
  /** Lien actif — mis en évidence dans le panneau */
  activeHref?: string
}

/**
 * Bouton hamburger + panneau latéral pour la navigation admin mobile.
 * Liens : Mes œuvres / Upload / Tableau de bord / ↗ Galerie publique / Déconnexion.
 */
export function AdminHamburgerMenu({ activeHref }: AdminHamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  /**
   * Bloquer le scroll du body quand le panneau est ouvert.
   * Même pattern que HamburgerMenu — nécessaire sur iOS.
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  /**
   * Fermer le panneau sur la touche Escape — accessibilité clavier.
   */
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  /**
   * Déconnexion artiste — appelle Better Auth puis redirige.
   * Même logique que SignOutButton et AdminHeaderStrip.
   */
  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.refresh()
    router.push('/admin/login')
  }

  /** Liens de navigation admin */
  const adminLinks = [
    { href: '/admin/artworks', label: 'Mes œuvres' },
    { href: '/admin/upload',   label: 'Ajouter une œuvre' },
    { href: '/admin',          label: 'Tableau de bord' },
  ]

  return (
    <>
      {/* Animation panneau — définie dans le composant pour éviter un fichier CSS global */}
      <style>{`
        @keyframes adminSlideInFromRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .admin-hamburger-panel {
          animation: adminSlideInFromRight 0.22s ease-out;
        }
      `}</style>

      {/*
       * Bouton hamburger — icône 3 lignes, touch target 44×44px (D-13).
       * D-03 : pas de borderRadius.
       */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu admin"
        aria-expanded={isOpen}
        style={{
          width: '44px',
          height: '44px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          borderRadius: 0,  /* D-03 */
        }}
      >
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)', display: 'block' }} />
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)', display: 'block' }} />
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)', display: 'block' }} />
      </button>

      {isOpen && (
        <>
          {/*
           * Overlay semi-transparent — ferme le panneau au clic.
           * z-index 50 — au-dessus du header sticky (z-index 10).
           * aria-hidden="true" — non annoncé aux lecteurs d'écran.
           */}
          <div
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(26,26,26,0.5)',
            }}
          />

          {/*
           * Panneau latéral — 280px depuis la droite.
           * D-03 : borderRadius: 0.
           * Safe area iPhone : paddingBottom env(safe-area-inset-bottom, 16px).
           */}
          <div
            role="dialog"
            aria-label="Menu de navigation admin"
            aria-modal="true"
            className="admin-hamburger-panel"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '280px',
              zIndex: 51,
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: '8px',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
              borderRadius: 0,  /* D-03 */
            }}
          >
            {/* Croix fermeture — 44×44px touch target (D-13) */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le menu"
              style={{
                alignSelf: 'flex-end',
                marginRight: '8px',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '22px',
                color: 'var(--color-ink)',
                lineHeight: 1,
                flexShrink: 0,
                borderRadius: 0,  /* D-03 */
              }}
            >
              ×
            </button>

            {/* Séparateur section — label Admin */}
            <div style={{
              padding: '8px 24px 4px',
              fontFamily: 'var(--font-space-mono)',
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-muted)',
            }}>
              Administration
            </div>

            {/*
             * Liens admin — hauteur 48px pour touch target mobile (D-13).
             * Le lien actif est mis en évidence avec une couleur pleine.
             */}
            {adminLinks.map(({ href, label }) => {
              const isActive = activeHref === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '48px',
                    padding: '0 24px',
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '14px',
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: isActive ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                    textDecoration: 'none',
                    borderLeft: isActive ? '3px solid var(--color-ink)' : '3px solid transparent',
                  }}
                >
                  {label}
                </Link>
              )
            })}

            {/* Séparateur */}
            <div style={{
              margin: '8px 24px',
              height: '1px',
              background: 'rgba(0,0,0,0.1)',
            }} />

            {/* Lien galerie publique — s'ouvre dans un nouvel onglet */}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '48px',
                padding: '0 24px',
                fontFamily: 'var(--font-space-mono)',
                fontSize: '14px',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-ink-muted)',
                textDecoration: 'none',
              }}
            >
              ↗ Voir la galerie
            </Link>

            {/* Déconnexion — en bas du panneau */}
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '48px',
                padding: '0 24px',
                fontFamily: 'var(--font-space-mono)',
                fontSize: '14px',
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-ink-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                marginTop: 'auto',
                borderRadius: 0,  /* D-03 */
              }}
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}
    </>
  )
}
