/**
 * HamburgerMenu — Menu navigation mobile pour SiteNav.
 *
 * POURQUOI un composant séparé de SiteNav ?
 * SiteNav est un async Server Component qui lit la session iron-session.
 * useState et useEffect ne fonctionnent pas dans les Server Components.
 * Ce composant fils Client gère uniquement l'état ouvert/fermé du panneau.
 * Pattern identique à ModalTrigger.tsx (décision 05-05 STATE.md).
 *
 * CONTRAINTES DESIGN (08-UI-SPEC.md) :
 * - D-03 : border-radius: 0 sur TOUS les éléments — panneau inclus
 * - D-02 : fond panneau #ede0b8 (--color-surface), overlay rgba(26,26,26,0.5)
 * - Touch targets : bouton hamburger 44×44px, liens panneau 48px de hauteur
 * - z-index : overlay 50, panneau 51 (au-dessus de la SiteNav sticky z-index:10)
 *
 * SÉCURITÉ : displayName est passé en prop depuis un Server Component
 * qui lit la session iron-session (cookie chiffré). React échappe automatiquement
 * les valeurs JSX — aucun risque XSS. [T-08-01-01]
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HamburgerMenuProps {
  /** Visiteur connecté (iron-session) */
  isLoggedIn: boolean
  /** Pseudo ou nom du visiteur — affiché comme initiale dans le panneau */
  displayName?: string
}

/**
 * Composant hamburger menu mobile.
 * Rendu : bouton ≡ visible sur mobile + panneau latéral coulissant depuis la droite.
 */
export function HamburgerMenu({ isLoggedIn, displayName }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  /**
   * Bloquer le scroll du body quand le panneau est ouvert.
   * POURQUOI nécessaire sur iOS ?
   * Sur iPhone, position:fixed de l'overlay ne bloque pas le scroll du body.
   * document.body.style.overflow = 'hidden' est la seule méthode fiable.
   * Le cleanup restaure l'état au démontage ou à la fermeture. [Pitfall 4 RESEARCH.md]
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
   * Écoute uniquement quand le panneau est ouvert pour éviter des listeners inutiles.
   */
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <>
      {/* Keyframes animation panneau — CSS dans le composant pour éviter un fichier CSS global */}
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .hamburger-panel {
          animation: slideInFromRight 0.22s ease-out;
        }
      `}</style>

      {/*
       * Bouton hamburger — icône 3 lignes, touch target 44×44px.
       * POURQUOI flex + gap sur les <span> et pas une image SVG ?
       * Les <span> sont stylisables directement et n'ont pas de problème de chargement.
       * La taille de l'icône (20×15px) est inférieure au touch target (44×44px) — intentionnel.
       */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu"
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
          // D-03 : pas de borderRadius
        }}
      >
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)', display: 'block' }} />
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)', display: 'block' }} />
        <span style={{ width: '20px', height: '1.5px', background: 'var(--color-ink)', display: 'block' }} />
      </button>

      {isOpen && (
        <>
          {/*
           * Overlay semi-transparent derrière le panneau.
           * position:fixed inset:0 couvre toute la fenêtre.
           * z-index: 50 — au-dessus de SiteNav (z-index:10) mais sous le panneau (51).
           * aria-hidden="true" — non annoncé aux lecteurs d'écran (décoration).
           */}
          <div
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(26,26,26,0.5)',
              // D-03 : pas de borderRadius
            }}
          />

          {/*
           * Panneau latéral — 280px depuis la droite.
           * role="dialog" pour accessibilité lecteurs d'écran.
           * D-02 : fond #ede0b8 (--color-surface), largeur 280px.
           * D-03 : borderRadius: 0 — pas de coins arrondis même sur un drawer.
           * Safe area iPhone : paddingBottom env(safe-area-inset-bottom, 16px).
           */}
          <div
            role="dialog"
            aria-label="Menu de navigation"
            className="hamburger-panel"
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
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              // D-03 : borderRadius: 0 — explicitement absent
            }}
          >
            {/* Croix de fermeture — alignée à droite, touch target 44×44px */}
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
              }}
            >
              ×
            </button>

            {/*
             * Liens de navigation — hauteur 48px pour touch target mobile (D-02).
             * Space Mono uppercase 14px, letter-spacing 0.08em — cohérent avec nav desktop.
             * POURQUOI 14px et pas 11px (desktop) ?
             * Sur mobile, 11px est trop petit pour une lecture confortable.
             * 14px = minimum recommandé mobile. [08-UI-SPEC.md Typography]
             */}
            <Link
              href="/"
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
                color: 'var(--color-ink)',
                textDecoration: 'none',
              }}
            >
              Galerie
            </Link>

            <Link
              href="/about"
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
                color: 'var(--color-ink)',
                textDecoration: 'none',
              }}
            >
              À propos
            </Link>

            {/*
             * Indicateur de connexion — même logique que nav desktop.
             * Connecté : carré initiale 28×28px (D-16) + lien /mon-profil.
             * Non connecté : lien S'identifier → ?identify=1 (ModalTrigger).
             */}
            {isLoggedIn ? (
              <Link
                href="/mon-profil"
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
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  gap: '12px',
                }}
              >
                {/* Carré initiale — D-03 borderRadius: 0, D-16 28×28px */}
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: 'var(--color-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 0,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: '#ffffff',
                      lineHeight: 1,
                      userSelect: 'none',
                    }}
                  >
                    {/* React échappe automatiquement — pas de risque XSS [T-08-01-01] */}
                    {displayName?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </span>
                Mon profil
              </Link>
            ) : (
              <Link
                href="?identify=1"
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
                S&apos;identifier
              </Link>
            )}
          </div>
        </>
      )}
    </>
  )
}
