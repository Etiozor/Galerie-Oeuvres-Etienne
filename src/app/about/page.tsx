/**
 * Page À propos — Galerie POF.
 *
 * CONTENU PLACEHOLDER : le texte et la photo seront remplis par l'artiste
 * après la Phase 3. La structure du layout est définitive (D-18).
 *
 * Layout (D-18) :
 * - Desktop : grid 2 colonnes (1fr 1fr) — photo à gauche, texte à droite
 * - Mobile : empilé (photo pleine largeur, texte dessous)
 *
 * Pas de requête DB, pas d'auth — Server Component statique pur.
 */
import { SiteNav } from '@/components/layout/SiteNav'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { BackgroundDecor } from '@/components/layout/BackgroundDecor'

export default function AboutPage() {
  return (
    <>
      <BackgroundDecor />
      <SiteNav />

      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* Responsive layout via <style> tag inline */}
        <style>{`
          .about-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: calc(100vh - 56px);
          }
          @media (max-width: 1023px) {
            .about-grid {
              grid-template-columns: 1fr;
            }
          }

          /*
           * Phase 9 — Réduction paddings sur mobile (≤768px).
           * Desktop : padding: 48px 32px/40px — conservé en style inline.
           * Mobile : @media override — réduit à 24px horizontal, 32px top.
           * [09-CONTEXT.md D-06 — Claude discretion padding mobile]
           */
          @media (max-width: 768px) {
            .about-photo-col {
              padding: 32px 24px;
              min-height: 220px;
            }
            .about-text-col {
              padding: 32px 24px;
            }
            .about-text-col h1 {
              /* Réduction de 28px → 22px sur mobile — D-08-UI-SPEC.md Typography mobile */
              font-size: 22px;
            }
          }
        `}</style>

        <div className="about-grid">
          {/* Colonne gauche : photo placeholder (D-18) */}
          {/* className="about-photo-col" — ciblé par @media mobile dans le <style> ci-dessus */}
          <div
            className="about-photo-col"
            style={{
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              padding: '48px 32px',    // desktop — overridé sur mobile par @media
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                color: 'var(--color-ink-muted)',
                textAlign: 'center',
                letterSpacing: '0.05em',
              }}
            >
              Photo à venir
            </p>
          </div>

          {/* Colonne droite : texte placeholder (D-18) */}
          {/* className="about-text-col" — ciblé par @media mobile dans le <style> ci-dessus */}
          <div
            className="about-text-col"
            style={{
              backgroundColor: 'var(--color-bg)',
              padding: '48px 40px',    // desktop — overridé sur mobile par @media
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Titre — Oswald 28px (D-02, UI-SPEC section 11) */}
            <h1
              style={{
                fontFamily: 'var(--font-oswald)',
                fontSize: '28px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-ink)',
                marginBottom: '24px',
                lineHeight: 1.1,
              }}
            >
              {"À propos de l'artiste"}
            </h1>

            {/* Corps de texte — Cormorant Garamond italique (D-02) */}
            <p
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontStyle: 'italic',
                fontSize: '17px',
                color: 'var(--color-ink)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Bio et démarche artistique à venir.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
