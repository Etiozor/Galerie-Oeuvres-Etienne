/**
 * Fond de la Galerie POF — aplat uniforme (cream).
 *
 * Contraintes D-04 (verrouillées) :
 * - position: fixed → toujours visible quel que soit le scroll
 * - z-index: 0 → derrière tout le contenu interactif
 * - pointer-events: none → jamais bloquant
 * - aria-hidden: true → invisible aux lecteurs d'écran
 *
 * Le motif de vagues a été retiré : le design de référence est un fond uni.
 */

export function BackgroundDecor() {
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
    />
  )
}
