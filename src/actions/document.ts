/**
 * Server Actions pour la page "Documenter une œuvre" (/admin/upload).
 *
 * POURQUOI deux actions séparées ?
 * - saveArtworkDraft : enregistre uniquement les métadonnées (pas de fichier requis).
 *   Permet à l'artiste de sauvegarder un brouillon avant d'avoir la photo.
 * - publishArtwork   : sauvegarde les métadonnées + upload de l'image originale.
 *   L'œuvre est immédiatement visible dans la galerie après upload.
 *
 * Gestion du médium (find-or-create) :
 * L'artiste saisit le médium en texte libre. On cherche d'abord dans la table
 * `mediums` par correspondance insensible à la casse. Si absent, on crée l'entrée.
 *
 * Gestion des tags (find-or-create many-to-many) :
 * On supprime d'abord les liaisons existantes pour cette œuvre, puis on recrée
 * uniquement les tags soumis (upsert simplifié).
 */
'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { artworks, artworkTags, tags, mediums } from '@/db/schema'
import { eq, ilike } from 'drizzle-orm'
import { getStorage } from '@/lib/storage'
import { randomUUID } from 'crypto'

const MAX_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const HEIC_TYPES = ['image/heic', 'image/heif']

export type DocumentResult =
  | { success: true; artworkId: number }
  | { success: false; error: string }

// ── Parsing FormData → métadonnées structurées ────────────────────────────────

async function parseMetadata(formData: FormData) {
  const title = ((formData.get('title') as string) ?? '').trim() || 'Sans titre'
  const typeIdRaw = formData.get('typeId') as string
  const typeId = typeIdRaw ? (parseInt(typeIdRaw) || null) : null
  const year = ((formData.get('year') as string) ?? '').trim()
  // EXIF fournit l'année seulement — le mois n'est pas disponible dans les métadonnées EXIF standard
  const createdYear = year && /^\d{4}$/.test(year) ? parseInt(year) : null
  const createdMonth: number | null = null
  const medium = ((formData.get('medium') as string) ?? '').trim()
  const widthCm = ((formData.get('widthCm') as string) ?? '').trim() || null
  const heightCm = ((formData.get('heightCm') as string) ?? '').trim() || null
  const status = ((formData.get('status') as string) ?? 'available') as 'available' | 'sold' | 'given' | 'reserved'
  const basePrice = ((formData.get('basePrice') as string) ?? '').trim() || null
  const description = ((formData.get('description') as string) ?? '').trim() || null
  const tagsJson = (formData.get('tags') as string) ?? '[]'
  const tagNames: string[] = JSON.parse(tagsJson)
  const artworkIdRaw = formData.get('artworkId') as string
  const artworkId = artworkIdRaw ? (parseInt(artworkIdRaw) || null) : null

  // Find-or-create medium
  let mediumId: number | null = null
  if (medium) {
    const [existing] = await db.select({ id: mediums.id }).from(mediums).where(ilike(mediums.name, medium)).limit(1)
    if (existing) {
      mediumId = existing.id
    } else {
      const slug = medium.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 100)
      const [newMedium] = await db.insert(mediums)
        .values({ name: medium, slug, sortOrder: 99 })
        .onConflictDoNothing()
        .returning({ id: mediums.id })
      mediumId = newMedium?.id ?? null
    }
  }

  return { title, typeId, createdYear, createdMonth, mediumId, widthCm, heightCm, status, basePrice, description, tagNames, artworkId }
}

// ── Sauvegarde des tags (many-to-many, find-or-create) ────────────────────────

async function saveTags(artworkId: number, tagNames: string[]) {
  await db.delete(artworkTags).where(eq(artworkTags.artworkId, artworkId))
  if (tagNames.length === 0) return

  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue

    let tagId: number
    const [existing] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, trimmed)).limit(1)
    if (existing) {
      tagId = existing.id
    } else {
      const slug = trimmed.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 100)
      const [newTag] = await db.insert(tags)
        .values({ name: trimmed, slug })
        .onConflictDoNothing()
        .returning({ id: tags.id })
      if (!newTag) continue
      tagId = newTag.id
    }

    await db.insert(artworkTags).values({ artworkId, tagId }).onConflictDoNothing()
  }
}

// ── Server Action : enregistrer un brouillon (sans image) ─────────────────────

/**
 * Sauvegarde les métadonnées d'une œuvre sans image.
 * Crée l'entrée DB si artworkId est absent, sinon met à jour.
 * L'œuvre n'est pas visible dans la galerie tant que publishedAt est null.
 */
export async function saveArtworkDraft(formData: FormData): Promise<DocumentResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return { success: false, error: 'Non autorisé.' }

    const meta = await parseMetadata(formData)
    const values = {
      title: meta.title,
      typeId: meta.typeId,
      mediumId: meta.mediumId,
      createdYear: meta.createdYear,
      createdMonth: meta.createdMonth,
      widthCm: meta.widthCm,
      heightCm: meta.heightCm,
      status: meta.status,
      basePrice: meta.basePrice,
      description: meta.description,
    }

    let id = meta.artworkId
    if (id) {
      await db.update(artworks).set(values).where(eq(artworks.id, id))
    } else {
      const [inserted] = await db.insert(artworks)
        .values(values)
        .returning({ id: artworks.id })
      id = inserted?.id ?? null
    }

    if (!id) return { success: false, error: 'Erreur lors de la sauvegarde.' }

    await saveTags(id, meta.tagNames)
    return { success: true, artworkId: id }
  } catch (err) {
    console.error('[saveArtworkDraft] Erreur inattendue :', err)
    return { success: false, error: "Une erreur inattendue s'est produite. Réessaie." }
  }
}

// ── Server Action : publier (métadonnées + upload image) ──────────────────────

/**
 * Sauvegarde les métadonnées et uploade la photo.
 * L'œuvre est immédiatement visible dans la galerie (publishedAt = maintenant).
 */
export async function publishArtwork(formData: FormData): Promise<DocumentResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return { success: false, error: 'Non autorisé.' }

    // Validation du fichier image
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Aucune photo sélectionnée.' }
    }
    if (HEIC_TYPES.includes(file.type)) {
      return { success: false, error: "Format HEIC non supporté. Exporte en JPEG depuis l'app Photos." }
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: 'Format non supporté. JPEG ou PNG uniquement.' }
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, error: 'Fichier trop lourd (max 20 MB). Compresse-le avant d\'uploader.' }
    }

    const meta = await parseMetadata(formData)
    const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()))
    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const uuid = randomUUID()
    const originalKey = `originals/${uuid}.${ext}`
    const storage = getStorage()

    const metaValues = {
      title: meta.title,
      typeId: meta.typeId,
      mediumId: meta.mediumId,
      createdYear: meta.createdYear,
      createdMonth: meta.createdMonth,
      widthCm: meta.widthCm,
      heightCm: meta.heightCm,
      status: meta.status,
      basePrice: meta.basePrice,
      description: meta.description,
      originalPath: originalKey,
      publishedAt: new Date(),
    }

    // Crée ou met à jour l'entrée en DB
    let id = meta.artworkId
    if (id) {
      await db.update(artworks).set(metaValues).where(eq(artworks.id, id))
    } else {
      const [inserted] = await db.insert(artworks)
        .values(metaValues)
        .returning({ id: artworks.id })
      id = inserted?.id ?? null
    }

    if (!id) return { success: false, error: "Erreur lors de la création de l'œuvre." }

    await saveTags(id, meta.tagNames)

    // Upload de l'original — si le stockage échoue, on supprime l'entrée DB
    // pour éviter une œuvre publiée sans image associée.
    try {
      await storage.put(originalKey, buffer, { contentType: file.type })
    } catch (storageErr) {
      await db.delete(artworks).where(eq(artworks.id, id))
      console.error('[publishArtwork] Échec du stockage :', storageErr)
      return { success: false, error: "Échec du stockage de l'image. Réessaie dans un instant." }
    }

    return { success: true, artworkId: id }
  } catch (err) {
    console.error('[publishArtwork] Erreur inattendue :', err)
    return { success: false, error: "Une erreur inattendue s'est produite. Réessaie." }
  }
}
