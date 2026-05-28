/**
 * R2StorageAdapter — Adaptateur de stockage Cloudflare R2.
 *
 * Utilisé en production (STORAGE_BACKEND=r2).
 * R2 est compatible avec l'API Amazon S3 — on utilise donc @aws-sdk/client-s3
 * avec un endpoint personnalisé pointant vers Cloudflare.
 *
 * Variables d'environnement requises :
 *   R2_ACCOUNT_ID        — ID du compte Cloudflare (trouvé dans le dashboard R2)
 *   R2_ACCESS_KEY_ID     — Clé d'accès R2 (générée dans R2 → Manage R2 API Tokens)
 *   R2_SECRET_ACCESS_KEY — Clé secrète R2
 *   R2_BUCKET_NAME       — Nom du bucket R2 (ex: "galerie-pof")
 *   R2_PUBLIC_URL        — URL publique du bucket (ex: "https://pub-xxx.r2.dev")
 *
 * IMPORTANT : Ne jamais importer cette classe directement dans le code applicatif.
 * Toujours utiliser getStorage() depuis @/lib/storage.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { StorageProvider } from './index'

/**
 * Implémentation R2 du StorageProvider.
 * Envoie et récupère les fichiers depuis Cloudflare R2 via l'API S3.
 */
export class R2StorageAdapter implements StorageProvider {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicUrl: string

  constructor() {
    const accountId = process.env['R2_ACCOUNT_ID']
    const accessKeyId = process.env['R2_ACCESS_KEY_ID']
    const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY']
    const bucket = process.env['R2_BUCKET_NAME']
    const publicUrl = process.env['R2_PUBLIC_URL']

    // Vérifier que toutes les variables sont bien définies au démarrage.
    // Mieux vaut crasher clairement au boot que sur le premier upload.
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new Error(
        'Configuration R2 incomplète. Variables manquantes : ' +
        [
          !accountId && 'R2_ACCOUNT_ID',
          !accessKeyId && 'R2_ACCESS_KEY_ID',
          !secretAccessKey && 'R2_SECRET_ACCESS_KEY',
          !bucket && 'R2_BUCKET_NAME',
          !publicUrl && 'R2_PUBLIC_URL',
        ]
          .filter(Boolean)
          .join(', ')
      )
    }

    this.bucket = bucket
    // Enlever le slash final pour éviter les doubles slashes dans getUrl()
    this.publicUrl = publicUrl.replace(/\/$/, '')

    // Construire le client S3 pointant vers Cloudflare R2.
    // L'endpoint R2 suit toujours ce format : https://<account_id>.r2.cloudflarestorage.com
    this.client = new S3Client({
      region: 'auto', // R2 ne gère pas les régions AWS — "auto" est requis
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  /**
   * Uploader un fichier vers R2.
   *
   * @param key     Clé de stockage (ex: "originals/abc123.jpg")
   * @param buffer  Contenu binaire du fichier
   * @param options Type MIME facultatif (ex: "image/jpeg")
   */
  async put(
    key: string,
    buffer: Buffer,
    options?: { contentType?: string }
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options?.contentType,
      })
    )
  }

  /**
   * Télécharger un fichier depuis R2.
   *
   * @param key  Clé de stockage
   * @returns    Buffer contenant les données du fichier
   * @throws     Error si le fichier n'existe pas sur R2
   */
  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )

    if (!response.Body) {
      throw new Error(`Fichier introuvable sur R2 : "${key}"`)
    }

    // Convertir le stream R2 en Buffer Node.js
    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes)
  }

  /**
   * Supprimer un fichier de R2.
   *
   * Ne lève pas d'erreur si le fichier est absent (suppression idempotente).
   *
   * @param key  Clé de stockage
   */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }

  /**
   * Obtenir l'URL publique d'un fichier stocké sur R2.
   *
   * Utilise R2_PUBLIC_URL — l'URL du domaine public du bucket.
   * Exemple : "https://pub-abc123.r2.dev/originals/photo.jpg"
   *
   * @param key  Clé de stockage (ex: "originals/abc123.jpg")
   * @returns    URL publique complète
   */
  getUrl(key: string): string {
    // Normaliser les séparateurs Windows → slash URL
    const normalizedKey = key.replace(/\\/g, '/')
    return `${this.publicUrl}/${normalizedKey}`
  }
}
