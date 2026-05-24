/**
 * Migration one-shot : remplace created_date (timestamp) par created_year + created_month (smallint).
 *
 * Exécuter une seule fois :
 *   npx tsx scripts/migrate-created-period.ts
 *
 * À supprimer après exécution.
 */
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Charger .env.local (non chargé par défaut hors Next.js)
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL manquant dans .env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Ajouter les nouvelles colonnes si elles n'existent pas encore
    await client.query(`
      ALTER TABLE artworks
        ADD COLUMN IF NOT EXISTS created_year  smallint,
        ADD COLUMN IF NOT EXISTS created_month smallint
    `)
    console.log('✓  Colonnes created_year / created_month ajoutées')

    // 2. Migrer les données existantes : extraire année et mois du timestamp
    const { rowCount } = await client.query(`
      UPDATE artworks
      SET
        created_year  = EXTRACT(YEAR  FROM created_date)::smallint,
        created_month = EXTRACT(MONTH FROM created_date)::smallint
      WHERE created_date IS NOT NULL
        AND created_year IS NULL
    `)
    console.log(`✓  ${rowCount} œuvre(s) migrée(s) depuis created_date`)

    // 3. Supprimer l'ancienne colonne
    await client.query(`
      ALTER TABLE artworks DROP COLUMN IF EXISTS created_date
    `)
    console.log('✓  Colonne created_date supprimée')

    await client.query('COMMIT')
    console.log('\n🎉  Migration réussie.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌  Rollback — erreur :', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
