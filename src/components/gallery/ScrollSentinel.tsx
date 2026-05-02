/**
 * Déclencheur de chargement pour l'infinite scroll.
 *
 * Un <div> invisible de 1px placé après le dernier lot d'œuvres visibles.
 * L'IntersectionObserver le surveille et déclenche le chargement du lot
 * suivant quand il entre dans le viewport (threshold: 0.1).
 *
 * POURQUOI ce composant séparé ?
 * Isoler la logique IntersectionObserver du composant GalleryClient améliore
 * la testabilité. Le composant reçoit une callback onIntersect en prop.
 *
 * POURQUOI le cleanup dans useEffect ?
 * Si le composant est démonté (ex: filtre change, aucun résultat), le
 * IntersectionObserver doit être déconnecté pour éviter les fuites mémoire.
 *
 * POURQUOI ne pas observer quand hasMore=false ?
 * Optimisation : quand toutes les œuvres sont affichées, l'observer n'est
 * jamais créé. T-03-03 : observer déconnecté pour éviter le DoS.
 *
 * Indicateur de chargement : 3 carrés pulse teal (UI-SPEC section 7).
 */
'use client'
import { useEffect, useRef } from 'react'

interface ScrollSentinelProps {
  /** Callback déclenché quand le sentinel entre dans le viewport */
  onIntersect: () => void
  /** Vrai s'il reste des œuvres à charger */
  hasMore: boolean
}

export function ScrollSentinel({ onIntersect, hasMore }: ScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Pas d'observer si toutes les œuvres sont déjà affichées
    if (!hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        // entries[0] est toujours présent (on observe un seul élément)
        if (entries[0]?.isIntersecting) {
          onIntersect()
        }
      },
      { threshold: 0.1 } // D-08 : threshold 0.1
    )

    if (sentinelRef.current) observer.observe(sentinelRef.current)

    // Cleanup OBLIGATOIRE : déconnecte l'observer si le composant est démonté
    return () => observer.disconnect()
  }, [onIntersect, hasMore])

  // Ne rien rendre si plus rien à charger
  if (!hasMore) return null

  return (
    <div ref={sentinelRef} style={{ height: '1px', width: '100%' }}>
      {/* Indicateur de chargement : 3 carrés pulse teal (UI-SPEC section 7) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          paddingTop: '24px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--color-teal)',
              // Animation décalée pour un effet "cascade" gauche → droite
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
