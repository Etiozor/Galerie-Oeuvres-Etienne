/**
 * Route Handler pour servir les fichiers uploadés depuis le stockage local.
 *
 * POURQUOI une route API et pas le dossier /public ?
 * Les fichiers uploadés sont écrits au runtime dans ./uploads/ (hors de /public).
 * Next.js ne sert pas les fichiers hors /public comme assets statiques.
 * Cette route intercepte les requêtes et lit le fichier via StorageProvider,
 * ce qui garantit la même logique de sécurité (assertSafeKey) qu'à l'upload.
 *
 * En production R2 (Phase 6), ce handler est contourné automatiquement :
 * LocalStorageAdapter.getUrl() retourne "http://localhost:3000/uploads/..." en dev,
 * R2StorageAdapter.getUrl() retournera "https://cdn.galeriepof.fr/..." en prod.
 *
 * Sécurité (T-02-04) : assertSafeKey() dans LocalStorageAdapter rejette les clés
 * avec "../" — le path traversal est bloqué au niveau du StorageProvider.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { getStorage } from '@/lib/storage'

/**
 * GET /api/uploads/[...key]
 *
 * Sert le fichier correspondant à la clé de stockage fournie dans l'URL.
 * Exemple : GET /api/uploads/originals/abc123.jpg → lit "originals/abc123.jpg"
 *
 * @param _request  Requête entrante (non utilisée — la clé suffit)
 * @param params    Segments de l'URL comme tableau (Next.js 15 : params est une Promise)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  // Next.js 15 : params est une Promise, elle doit être résolue avant utilisation.
  // Avant Next.js 15, params était synchrone — ce await est OBLIGATOIRE en 15+.
  const { key } = await params

  // Reconstruire la clé de stockage depuis les segments URL
  // Exemple : ["originals", "abc123.jpg"] → "originals/abc123.jpg"
  const storageKey = key.join('/')

  try {
    const storage = getStorage()
    const buffer = await storage.get(storageKey)
    const contentType = detectContentType(storageKey)

    // Convertir Buffer → Uint8Array pour satisfaire le type BodyInit de l'API Web Response.
    // Buffer étend Uint8Array mais TypeScript ne l'infère pas toujours correctement
    // selon la version de @types/node — le cast explicite évite l'erreur TS2345.
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        // Cache navigateur 1 heure — les images uploadées ne changent pas après stockage
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    // Fichier absent (clé invalide, fichier supprimé) ou clé malveillante (path traversal)
    return new NextResponse('Fichier introuvable', { status: 404 })
  }
}

/**
 * Détermine le Content-Type depuis l'extension de la clé de stockage.
 *
 * POURQUOI ne pas lire les magic bytes du buffer ?
 * Les clés sont construites côté serveur dans uploadArtwork (et dans le pipeline Sharp)
 * avec l'extension correcte — on peut s'y fier. La lecture des magic bytes ajouterait
 * de la complexité sans bénéfice de sécurité supplémentaire dans ce contexte.
 *
 * @param key  Clé de stockage avec extension (ex: "originals/abc123.jpg")
 * @returns    Type MIME correspondant à l'extension
 */
function detectContentType(key: string): string {
  if (key.endsWith('.webp')) return 'image/webp'
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg'
  if (key.endsWith('.png')) return 'image/png'
  // Fallback sûr pour les types non reconnus — le navigateur tentera de déterminer le type
  return 'application/octet-stream'
}
