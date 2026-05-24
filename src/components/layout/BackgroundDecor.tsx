/**
 * Fond décoratif de la Galerie POF — motif SVG tuilé.
 *
 * Contraintes D-04 (verrouillées) :
 * - position: fixed → toujours visible quel que soit le scroll
 * - z-index: 0 → derrière tout le contenu interactif
 * - pointer-events: none → jamais bloquant
 * - aria-hidden: true → invisible aux lecteurs d'écran
 *
 * Architecture deux couches :
 * - Div de fond : backgroundColor --color-bg (cream) opaque
 * - Div de motif : SVG tuilé en backgroundImage à opacité 0.18
 *   La couche backgroundColor empêche le motif de "percer" sur du blanc.
 *
 * Motif par défaut : vagues horizontales (waves).
 * Opacité finale : 0.18 — discret, ne concurrence pas les œuvres.
 */

const WAVES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
  <g fill="none" stroke="#2b2b2b" stroke-width="1" stroke-linecap="round">
    <path d="M0 10  Q70 -55 140 10  T280 10"/>
    <path d="M0 35  Q70 -30 140 35  T280 35"/>
    <path d="M0 60  Q70 -5  140 60  T280 60"/>
    <path d="M0 85  Q70 20  140 85  T280 85"/>
    <path d="M0 110 Q70 45  140 110 T280 110"/>
    <path d="M0 135 Q70 70  140 135 T280 135"/>
    <path d="M0 160 Q70 95  140 160 T280 160"/>
    <path d="M0 185 Q70 120 140 185 T280 185"/>
    <path d="M0 210 Q70 145 140 210 T280 210"/>
    <path d="M0 235 Q70 170 140 235 T280 235"/>
    <path d="M0 260 Q70 195 140 260 T280 260"/>
  </g>
</svg>`

export function BackgroundDecor() {
  const dataUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(WAVES_SVG)}")`

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          backgroundImage: dataUrl,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  )
}
