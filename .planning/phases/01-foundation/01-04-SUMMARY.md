---
phase: 01-foundation
plan: "04"
subsystem: storage
tags: [storage, abstraction, filesystem, typescript-interface]
dependency_graph:
  requires:
    - 01-01  # Structure de dossiers uploads/ créée en Plan 01-01
  provides:
    - StorageProvider interface (consommée par toutes les phases suivantes)
    - getStorage() factory (point d'entrée unique pour le stockage)
    - LocalStorageAdapter (implémentation dev)
  affects:
    - Phase 2 (pipeline Sharp utilise getStorage() pour écrire les 3 chemins d'image)
    - Phase 6 (R2StorageAdapter remplacera LocalStorageAdapter via STORAGE_BACKEND=r2)
tech_stack:
  added:
    - node:fs/promises (writeFile, readFile, unlink, mkdir)
    - node:path (join, dirname, resolve)
  patterns:
    - "Adapter pattern : StorageProvider interface + adaptateurs interchangeables"
    - "Factory function : getStorage() lit STORAGE_BACKEND, retourne l'adaptateur"
    - "Fail-fast : valeur STORAGE_BACKEND inconnue → Error immédiate"
key_files:
  created:
    - src/lib/storage/index.ts   # Interface StorageProvider + factory getStorage()
    - src/lib/storage/local.ts   # LocalStorageAdapter (filesystem local)
  modified: []
decisions:
  - "Ajout de assertSafeKey() dans LocalStorageAdapter pour prévenir le path traversal (T-01-04-02) — décision anticipée par rapport au plan (prévu Phase 2)"
metrics:
  duration: "2m 24s"
  completed: "2026-04-24"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 1 Plan 4: StorageProvider interface + LocalStorageAdapter — Summary

Interface TypeScript abstraite pour le stockage de fichiers avec implémentation locale via le filesystem, permettant un swap dev→Cloudflare R2 en Phase 6 via une seule variable d'environnement.

## What Was Built

### `src/lib/storage/index.ts` — Interface + Factory

Contient deux exports :

**`StorageProvider` (interface)** — Contrat de 4 méthodes que tout adaptateur doit respecter :

```typescript
export interface StorageProvider {
  put(key: string, buffer: Buffer, options?: { contentType?: string }): Promise<void>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}
```

**`getStorage()` (factory)** — Lit `process.env.STORAGE_BACKEND` et retourne l'adaptateur approprié :
- `"local"` → `LocalStorageAdapter` (import dynamique)
- `"r2"` → Error explicite (Phase 6)
- Valeur inconnue → Error immédiate (fail-fast)

### `src/lib/storage/local.ts` — LocalStorageAdapter

Implémentation filesystem de `StorageProvider` pour le développement local.

| Méthode | Comportement |
|---------|-------------|
| `put(key, buffer)` | Écrit dans `uploads/{key}`, crée les sous-dossiers automatiquement |
| `get(key)` | Lit et retourne un Buffer, lève une Error claire si absent |
| `delete(key)` | Supprime le fichier, silencieux si absent (ENOENT ignoré) |
| `getUrl(key)` | Retourne `{BETTER_AUTH_URL}/uploads/{key}` |

Variables d'environnement lues :
- `LOCAL_UPLOAD_DIR` (défaut : `./uploads`) — dossier racine du stockage
- `BETTER_AUTH_URL` (défaut : `http://localhost:3000`) — base des URLs publiques

## Utilisation en Phase 2 (pipeline Sharp)

```typescript
import { getStorage } from '@/lib/storage'

// Stocker les 3 chemins d'image après traitement Sharp
const storage = getStorage()

await storage.put('originals/abc123.jpg', originalBuffer, { contentType: 'image/jpeg' })
await storage.put('processed/abc123.webp', processedBuffer, { contentType: 'image/webp' })
await storage.put('thumbnails/abc123.webp', thumbnailBuffer, { contentType: 'image/webp' })

// Obtenir l'URL pour l'affichage
const url = storage.getUrl('originals/abc123.jpg')
// → "http://localhost:3000/uploads/originals/abc123.jpg"
```

Ces clés (`originals/abc123.jpg`, etc.) sont stockées telles quelles dans la DB (colonnes `original_path`, `processed_path`, `thumbnail_path` du schéma Drizzle).

## Note sur la route statique /uploads/*

En développement local, Next.js ne sert pas automatiquement les fichiers hors du dossier `/public`. Pour que les URLs retournées par `getUrl()` fonctionnent dans le navigateur, il faudra configurer une route API ou un middleware de fichiers statiques dans `next.config.ts`.

**Cette configuration est à faire en Phase 2 ou Phase 3** lors de la première utilisation des images dans l'interface. Options :
- Route API `app/uploads/[...key]/route.ts` qui lit via `getStorage().get(key)` et retourne le fichier
- Configuration `rewrites` dans `next.config.ts` pointant vers le dossier uploads/

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Ajout anticipé de la protection path traversal (T-01-04-02)**
- **Found during:** Analyse du threat model avant implémentation
- **Issue:** La menace T-01-04-02 est listée comme `mitigate` dans le plan. Le plan indiquait "ajouter en Phase 2 quand des clés dynamiques arrivent" — mais implementer la sécurité dès le début évite d'oublier de l'ajouter et garantit la sécurité dès la première utilisation.
- **Fix:** Ajout de `assertSafeKey(key, filePath)` dans `put()`, `get()` et `delete()`. Vérifie que `filePath.startsWith(this.uploadDir)` pour bloquer toute clé comme `../../etc/passwd`.
- **Files modified:** `src/lib/storage/local.ts`
- **Commit:** 3e1bc20

## Threat Flags

Aucune nouvelle surface de sécurité non listée dans le plan.

Les menaces couvertes par l'implémentation :
- T-01-04-02 (path traversal) : mitigée par `assertSafeKey()` dans les 3 méthodes mutantes
- T-01-04-04 (STORAGE_BACKEND) : mitigée par fail-fast dans `getStorage()` (valeur inconnue → Error)

## Self-Check: PASSED

### Files created
- FOUND: src/lib/storage/index.ts
- FOUND: src/lib/storage/local.ts
- FOUND: .planning/phases/01-foundation/01-04-SUMMARY.md

### Commits verified
- FOUND: c184a45 (feat(01-04): add StorageProvider interface + getStorage() factory)
- FOUND: 3e1bc20 (feat(01-04): add LocalStorageAdapter — filesystem implementation)
