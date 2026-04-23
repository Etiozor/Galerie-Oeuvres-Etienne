/**
 * Client de base de données Drizzle ORM.
 *
 * Ce fichier crée UNE SEULE connexion à PostgreSQL pour toute l'application.
 * On importe `db` depuis ce fichier chaque fois qu'on a besoin d'interroger
 * la base de données.
 *
 * Exemple d'utilisation :
 *   import { db } from '@/db'
 *   import { artworks } from '@/db/schema'
 *   const result = await db.select().from(artworks)
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Vérifier que la variable d'environnement est définie
// Si elle manque, l'application plante immédiatement avec un message clair
if (!process.env.DATABASE_URL) {
  throw new Error(
    'Variable DATABASE_URL manquante. ' +
    'Vérifiez votre fichier .env.local et que docker compose est démarré.'
  )
}

/**
 * Pool de connexions PostgreSQL.
 *
 * Un pool maintient plusieurs connexions ouvertes en permanence.
 * Cela évite de créer une nouvelle connexion à chaque requête,
 * ce qui serait lent (chaque connexion prend ~100ms à établir).
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

/**
 * Client Drizzle ORM.
 *
 * `db` est l'objet principal pour toutes les opérations base de données.
 * On lui passe le schéma pour avoir l'autocomplétion TypeScript complète.
 */
export const db = drizzle(pool, { schema })
