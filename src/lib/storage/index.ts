/**
 * Interface d'abstraction du stockage de fichiers — Galerie POF.
 *
 * POURQUOI une interface et pas un accès direct au système de fichiers ?
 * En développement, les images sont stockées sur le disque local.
 * En production (Phase 6), elles seront sur Cloudflare R2 (compatible S3).
 * Cette interface permet de changer d'environnement en modifiant UNE SEULE
 * variable d'environnement (STORAGE_BACKEND), sans toucher au code qui uploade
 * ou affiche les images.
 *
 * Convention de clé :
 * La base de données stocke des CLÉS, pas des chemins absolus.
 * Exemples de clés : "originals/abc123.jpg", "thumbnails/abc123.webp"
 * Le StorageProvider traduit la clé en chemin réel ou URL CDN selon l'environnement.
 * [M6 — PITFALLS.md]
 */

import type { LocalStorageAdapter } from './local'
import type { R2StorageAdapter } from './r2'

// ============================================================
// INTERFACE — Contrat que tous les adaptateurs doivent respecter
// ============================================================

/**
 * Interface StorageProvider.
 *
 * Tout adaptateur de stockage (local, R2, S3...) doit implémenter
 * ces 4 méthodes. Le code applicatif n'utilise jamais un adaptateur
 * directement — il passe toujours par getStorage().
 */
export interface StorageProvider {
  /**
   * Stocker un fichier.
   *
   * @param key      Clé de stockage (ex: "originals/abc123.jpg")
   * @param buffer   Contenu binaire du fichier
   * @param options  Options facultatives : type MIME du fichier
   */
  put(
    key: string,
    buffer: Buffer,
    options?: { contentType?: string }
  ): Promise<void>

  /**
   * Récupérer un fichier par sa clé.
   *
   * @param key  Clé de stockage
   * @returns    Buffer contenant les données du fichier
   * @throws     Error si le fichier n'existe pas
   */
  get(key: string): Promise<Buffer>

  /**
   * Supprimer un fichier.
   * Ne lève pas d'erreur si le fichier est absent.
   *
   * @param key  Clé de stockage
   */
  delete(key: string): Promise<void>

  /**
   * Obtenir l'URL publique d'un fichier.
   *
   * En développement local → URL comme "http://localhost:3000/uploads/originals/abc123.jpg"
   * En production R2 → URL CDN comme "https://cdn.galeriepof.fr/originals/abc123.jpg"
   *
   * @param key  Clé de stockage
   * @returns    URL complète pour afficher le fichier dans le navigateur
   */
  getUrl(key: string): string
}

// ============================================================
// FACTORY — Choisit l'adaptateur selon la variable d'environnement
// ============================================================

/**
 * Factory getStorage() — Retourne l'adaptateur de stockage configuré.
 *
 * Lit la variable STORAGE_BACKEND pour choisir l'implémentation :
 * - "local" → LocalStorageAdapter (disque local, développement)
 * - "r2"    → R2StorageAdapter (Cloudflare R2, Phase 6)
 *
 * IMPORTANT : Toujours utiliser getStorage() plutôt qu'importer
 * LocalStorageAdapter directement. Cela garantit que le swap
 * dev→prod ne nécessite aucun changement de code applicatif.
 *
 * @returns Instance de StorageProvider correspondant à STORAGE_BACKEND
 * @throws  Error si STORAGE_BACKEND contient une valeur non reconnue
 */
export function getStorage(): StorageProvider {
  const backend = process.env.STORAGE_BACKEND ?? 'local'

  switch (backend) {
    case 'local': {
      // Import dynamique pour éviter de charger le module fs en production R2
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LocalStorageAdapter } = require('./local') as { LocalStorageAdapter: new () => LocalStorageAdapter }
      return new LocalStorageAdapter()
    }

    case 'r2': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { R2StorageAdapter } = require('./r2') as { R2StorageAdapter: new () => R2StorageAdapter }
      return new R2StorageAdapter()
    }

    default:
      throw new Error(
        `Valeur STORAGE_BACKEND non reconnue : "${backend}". ` +
        'Valeurs acceptées : "local", "r2".'
      )
  }
}
