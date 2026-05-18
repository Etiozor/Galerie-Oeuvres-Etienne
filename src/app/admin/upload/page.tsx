/**
 * Page d'upload et de documentation d'une œuvre — /admin/upload.
 *
 * Server Component : charge les données nécessaires depuis la DB
 * (types d'œuvres et médiums) et les passe au composant client.
 *
 * POURQUOI séparer Server Component (page.tsx) et Client Component (DocumenterClient) ?
 * La page a besoin de deux choses incompatibles dans un seul composant :
 * 1. Accéder à la DB côté serveur pour charger artworkTypes et mediums
 * 2. Gérer un état UI réactif (drag-and-drop, machine d'états, toasts)
 * En Next.js App Router, on résout ça en passant les données du Server Component
 * au Client Component via props — pattern établi dans ce projet (D-09).
 *
 * Vérification d'authentification :
 * Le layout admin (middleware.ts) protège toutes les routes /admin/*.
 * Cette vérification supplémentaire est une défense en profondeur.
 */

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { artworkTypes, mediums } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { DocumenterClient } from './_components/DocumenterClient'

export default async function AdminUploadPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/admin/login')

  // Charger les types et médiums en parallèle — utilisés pour les contrôles du formulaire
  const [types, meds] = await Promise.all([
    db.select({ id: artworkTypes.id, name: artworkTypes.name, slug: artworkTypes.slug })
      .from(artworkTypes)
      .orderBy(asc(artworkTypes.sortOrder)),
    db.select({ id: mediums.id, name: mediums.name })
      .from(mediums)
      .orderBy(asc(mediums.sortOrder)),
  ])

  return (
    <DocumenterClient
      artworkTypes={types}
      mediums={meds}
      userEmail={session.user.email ?? undefined}
    />
  )
}
