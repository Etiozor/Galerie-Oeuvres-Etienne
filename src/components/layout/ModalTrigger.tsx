'use client'

/**
 * Client Component qui détecte le paramètre URL ?identify=1 et ouvre VisitorProfileModal.
 *
 * POURQUOI un composant séparé ?
 * useSearchParams() est un hook React — impossible dans un Server Component.
 * SiteNav est maintenant un async Server Component (D-15) — il ne peut pas
 * appeler des hooks. Ce composant est le seul pont entre le paramètre URL et l'état modal.
 *
 * PIÈGE CRITIQUE Suspense : useSearchParams() exige un <Suspense> parent obligatoire.
 * Sans Suspense, `next build` échoue avec l'erreur :
 *   "Missing Suspense boundary with useSearchParams"
 * Toujours utiliser dans layout.tsx :
 *   <Suspense fallback={null}><ModalTrigger /></Suspense>
 * [VÉRIFIÉ : src/app/page.tsx — GalleryClient suit le même pattern]
 *
 * POURQUOI router.replace() dans handleClose ?
 * Nettoie ?identify=1 de l'URL sans rechargement de page (history.pushState compatible).
 * Évite que le modal se ré-ouvre si l'utilisateur fait Retour navigateur puis revient.
 *
 * SÉCURITÉ (T-05-05-03) : ?identify=1 déclenche uniquement l'ouverture d'un modal
 * côté client — aucune mutation DB, aucun accès aux données. Risque nul.
 *
 * USAGE dans layout.tsx :
 *   <Suspense fallback={null}>
 *     <ModalTrigger />
 *   </Suspense>
 * [D-17 — RESEARCH.md Pitfall 4]
 */

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { VisitorProfileModal } from '@/components/visitor/VisitorProfileModal'

/**
 * Composant pont entre le paramètre URL ?identify=1 et le modal d'identification.
 *
 * Placé dans le layout racine, ce composant est présent sur TOUTES les pages.
 * Il écoute les changements de searchParams (navigation client) et ouvre le modal
 * si et seulement si ?identify=1 est présent.
 */
export function ModalTrigger() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  /**
   * Surveille les changements de searchParams.
   * POURQUOI useEffect et pas un if direct ?
   * Les mutations d'état (setIsOpen) ne peuvent pas être faites pendant le rendu —
   * React interdit les effets de bord dans le corps du composant.
   */
  useEffect(() => {
    if (searchParams.get('identify') === '1') {
      setIsOpen(true)
    }
  }, [searchParams])

  /**
   * Ferme le modal et nettoie le paramètre URL.
   * window.location.pathname : récupère le chemin actuel sans les params de requête.
   * router.replace() : mise à jour de l'URL sans entrer dans l'historique de navigation.
   */
  function handleClose() {
    setIsOpen(false)
    // Nettoyer ?identify=1 de l'URL sans rechargement de page
    router.replace(window.location.pathname)
  }

  return <VisitorProfileModal isOpen={isOpen} onClose={handleClose} />
}
