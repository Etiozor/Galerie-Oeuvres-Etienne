/**
 * LocalStorageAdapter — Adaptateur de stockage sur le système de fichiers local.
 *
 * Utilisé en développement (STORAGE_BACKEND=local).
 * Les fichiers sont stockés dans le dossier configuré par LOCAL_UPLOAD_DIR
 * (par défaut : "./uploads" à la racine du projet).
 *
 * Structure des dossiers gérée par cet adaptateur :
 *   uploads/
 *     originals/   ← images telles qu'uploadées (jamais écrasées)
 *     processed/   ← images traitées par Sharp
 *     thumbnails/  ← miniatures 400px
 *
 * IMPORTANT : Ne jamais importer cette classe directement dans le code applicatif.
 * Toujours utiliser getStorage() depuis @/lib/storage pour garantir
 * que le swap local→R2 (Phase 6) ne nécessite aucun changement de code.
 *
 * [M6 — PITFALLS.md] La DB stocke des clés, pas des chemins absolus.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { StorageProvider } from './index'

/**
 * Implémentation locale du StorageProvider.
 * Écrit et lit les fichiers sur le disque du serveur de développement.
 */
export class LocalStorageAdapter implements StorageProvider {
  /**
   * Dossier racine où les fichiers sont stockés (chemin absolu résolu au démarrage).
   * Lu depuis LOCAL_UPLOAD_DIR (défaut : "./uploads" relatif au projet).
   */
  private readonly uploadDir: string

  /**
   * URL de base de l'application, utilisée pour construire les URLs publiques.
   * Lu depuis BETTER_AUTH_URL (ex: "http://localhost:3000").
   */
  private readonly baseUrl: string

  constructor() {
    // Résoudre le chemin en absolu par rapport à la racine du projet.
    // process.cwd() retourne le dossier depuis lequel Next.js est lancé.
    const uploadDirRaw = process.env['LOCAL_UPLOAD_DIR'] ?? './uploads'
    this.uploadDir = path.resolve(process.cwd(), uploadDirRaw)

    // Enlever le slash final s'il y en a un (évite les doubles slashes dans les URLs)
    this.baseUrl = (process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000').replace(/\/$/, '')
  }

  /**
   * Vérifier qu'une clé ne contient pas de séquences de traversal de chemin.
   *
   * SÉCURITÉ (T-01-04-02) : Une clé malveillante comme "../../etc/passwd"
   * pourrait permettre d'accéder à des fichiers hors du dossier uploads/.
   * Cette vérification garantit que le chemin résolu reste dans uploadDir.
   *
   * @param key      Clé de stockage à vérifier
   * @param filePath Chemin absolu résolu (résultat de path.join(uploadDir, key))
   * @throws         Error si le chemin sort du dossier uploads/
   */
  private assertSafeKey(key: string, filePath: string): void {
    // Résoudre le chemin de façon canonique pour éliminer tous les ".." résiduels
    const resolvedFile = path.resolve(filePath)

    // Ajouter path.sep garantit une correspondance de RÉPERTOIRE et non de PRÉFIXE de chaîne.
    // Sans path.sep : "/app/uploads" matcherait "/app/uploadsevil/" à tort.
    // Exemple du bug : uploadDir="/app/uploads", key="../uploadsevil/x.txt"
    //   → filePath="/app/uploadsevil/x.txt" → startsWith("/app/uploads") = true (FAUX POSITIF)
    const safeBase = this.uploadDir.endsWith(path.sep)
      ? this.uploadDir
      : this.uploadDir + path.sep

    // Sur Windows : le système de fichiers est insensible à la casse,
    // mais startsWith() compare de façon sensible — normaliser en minuscules pour éviter
    // qu'une clé contournant la casse passe la vérification.
    const isWin = process.platform === 'win32'
    const normalizedBase = isWin ? safeBase.toLowerCase() : safeBase
    const normalizedFile = isWin ? resolvedFile.toLowerCase() : resolvedFile

    if (!normalizedFile.startsWith(normalizedBase)) {
      throw new Error(
        `Clé de stockage invalide : "${key}". ` +
        'La clé ne peut pas contenir de séquences "../" ou pointer hors du dossier uploads/.'
      )
    }
  }

  /**
   * Stocker un fichier sur le disque.
   *
   * Crée automatiquement les sous-dossiers manquants avant d'écrire.
   * Exemple : put("originals/abc123.jpg", buffer) crée uploads/originals/ si absent.
   *
   * @param key     Clé de stockage (ex: "originals/abc123.jpg")
   * @param buffer  Contenu binaire du fichier à stocker
   */
  async put(
    key: string,
    buffer: Buffer,
    _options?: { contentType?: string }
  ): Promise<void> {
    // Construire le chemin absolu sur le disque
    const filePath = path.join(this.uploadDir, key)

    // Vérification de sécurité : la clé ne doit pas sortir de uploadDir
    this.assertSafeKey(key, filePath)

    // Créer les dossiers parents si nécessaires (ex: uploads/originals/)
    // recursive: true évite une erreur si le dossier existe déjà
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    // Écrire le fichier
    await fs.writeFile(filePath, buffer)
  }

  /**
   * Récupérer un fichier depuis le disque.
   *
   * @param key  Clé de stockage
   * @returns    Buffer contenant les données du fichier
   * @throws     Error si le fichier n'existe pas ou si la clé est invalide
   */
  async get(key: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, key)

    // Vérification de sécurité : la clé ne doit pas sortir de uploadDir
    this.assertSafeKey(key, filePath)

    try {
      // Lire le fichier et retourner son contenu sous forme de Buffer
      const data = await fs.readFile(filePath)
      return Buffer.from(data)
    } catch {
      // Transformer l'erreur système en message compréhensible
      throw new Error(
        `Fichier introuvable dans le stockage local : "${key}". ` +
        `Chemin vérifié : ${filePath}`
      )
    }
  }

  /**
   * Supprimer un fichier du disque.
   *
   * Ne lève pas d'erreur si le fichier est absent — comportement intentionnel
   * pour permettre les suppressions idempotentes (ex: re-traitement d'image).
   *
   * @param key  Clé de stockage
   */
  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)

    // Vérification de sécurité : la clé ne doit pas sortir de uploadDir
    this.assertSafeKey(key, filePath)

    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Ignorer l'erreur "fichier absent" (ENOENT)
      // Relancer toute autre erreur (permissions, disque plein, etc.)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return // Fichier absent = suppression déjà effectuée, rien à faire
      }
      throw error
    }
  }

  /**
   * Obtenir l'URL publique d'un fichier.
   *
   * En développement, Next.js sert le dossier uploads/ via la route /uploads/*.
   * Attention : cette route de fichiers statiques doit être configurée dans
   * next.config.ts si les fichiers sont hors du dossier /public.
   * (À faire en Phase 2 ou Phase 3 lors de la première utilisation.)
   *
   * Format retourné : "http://localhost:3000/uploads/originals/abc123.jpg"
   *
   * @param key  Clé de stockage (ex: "originals/abc123.jpg")
   * @returns    URL complète pour afficher le fichier dans le navigateur
   */
  getUrl(key: string): string {
    /**
     * Garde de sécurité : rejeter toute clé qui ressemble déjà à une URL externe.
     *
     * POURQUOI ce contrôle ?
     * La clé vient de la base de données (champ originalPath). Si un chemin
     * mal formé ou malveillant y est stocké (ex: "//evil.com/img.jpg" ou
     * "http://evil.com/img.jpg"), le construire en URL produirait une URL
     * pointant vers un domaine externe — rendu direct dans un <img src> sans contrôle.
     * Ce guard lève une erreur explicite plutôt que de produire silencieusement
     * une URL incorrecte.
     */
    if (!key || key.startsWith('http://') || key.startsWith('https://') || key.startsWith('//')) {
      throw new Error(
        `Clé de stockage invalide : "${key}". ` +
        'La clé doit être un chemin relatif (ex: "originals/abc123.jpg"), pas une URL.'
      )
    }

    // Normaliser les séparateurs de chemin Windows → les URLs utilisent toujours /
    const normalizedKey = key.replace(/\\/g, '/')
    return `${this.baseUrl}/api/uploads/${normalizedKey}`
  }
}
