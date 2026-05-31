/**
 * Script one-shot pour créer le compte artiste en production.
 *
 * Usage :
 *   $env:DATABASE_URL="..."; $env:BETTER_AUTH_SECRET="..."; $env:BETTER_AUTH_URL="https://galeriepof.up.railway.app"; npx tsx scripts/create-artist.ts
 */

import { auth } from '../src/lib/auth'

async function main() {
  const email = 'etienne.le.pironnec1@gmail.com'
  const password = process.argv[2]

  if (!password) {
    console.error('Usage: npx tsx scripts/create-artist.ts MON_MOT_DE_PASSE')
    process.exit(1)
  }

  console.log(`Création du compte artiste pour ${email}...`)

  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: 'Etienne',
    },
  })

  if (result) {
    console.log('✅ Compte créé avec succès !')
    console.log('   Tu peux maintenant te connecter sur https://galeriepof.up.railway.app/admin/login')
  }
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message)
  process.exit(1)
})
