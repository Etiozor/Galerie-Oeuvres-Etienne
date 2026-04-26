/**
 * Composant de polling — rafraîchit la page toutes les 3 secondes
 * quand des œuvres sont en cours de traitement.
 *
 * POURQUOI 'use client' ?
 * setInterval et useEffect sont des APIs browser — elles ne peuvent
 * pas s'exécuter dans un Server Component.
 *
 * POURQUOI router.refresh() et pas un fetch direct ?
 * router.refresh() force Next.js à re-exécuter le Server Component parent,
 * ce qui relance la requête DB et met à jour les badges sans rechargement complet.
 * Plus simple qu'un fetch + état local — et cohérent avec le pattern Next.js 15.
 *
 * POURQUOI arrêter le polling sur les états terminaux ?
 * AWAITING_VALIDATION, PUBLISHED, FAILED sont des états stables — l'artiste
 * doit agir manuellement. Continuer à poller gaspillerait les ressources serveur
 * et navigateur sans apporter de valeur.
 *
 * POURQUOI ce composant ne rend rien ?
 * C'est un composant comportemental pur — son rôle est de déclencher des
 * rafraîchissements, pas d'afficher quoi que ce soit.
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PipelinePollerProps {
  /** true si au moins une œuvre est en PENDING ou PROCESSING */
  hasPendingItems: boolean
}

/**
 * Déclenche un rafraîchissement automatique toutes les 3 secondes
 * tant que des œuvres sont dans un état non-terminal (PENDING ou PROCESSING).
 */
export function PipelinePoller({ hasPendingItems }: PipelinePollerProps) {
  const router = useRouter()

  useEffect(() => {
    // Ne rien faire si tous les items sont dans des états terminaux
    // (AWAITING_VALIDATION, PUBLISHED, FAILED)
    if (!hasPendingItems) return

    // Rafraîchir toutes les 3 secondes (UI-SPEC : polling interval = 3s)
    // router.refresh() = re-render côté serveur du Server Component parent
    const intervalId = setInterval(() => {
      router.refresh()
    }, 3000)

    // Nettoyer l'intervalle quand le composant est démonté ou quand
    // hasPendingItems passe à false (plus rien à surveiller)
    return () => clearInterval(intervalId)
  }, [hasPendingItems, router])

  // Composant purement comportemental — aucun rendu visible
  return null
}
