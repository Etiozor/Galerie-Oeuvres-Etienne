import type { NextConfig } from 'next'

/**
 * Configuration principale de Next.js pour la Galerie POF.
 *
 * Cette configuration définit comment Next.js construit et sert l'application.
 * Les sections importantes :
 * - images : autorise les domaines externes pour les photos stockées en production (Cloudflare R2)
 * - typescript : erreurs bloquantes en build pour éviter les bugs silencieux
 * - eslint : vérification du code bloquante en build pour maintenir la qualité
 */
const nextConfig: NextConfig = {
  // Empêche Next.js de bundler kysely et l'adapter Better Auth.
  // Ces packages utilisent des modules Node.js natifs (fs, crypto) incompatibles
  // avec le bundler Edge/RSC — ils doivent rester des modules Node.js externes.
  serverExternalPackages: ['kysely', '@better-auth/kysely-adapter'],

  // Augmente la limite de taille pour les Server Actions (défaut : 1 MB).
  // POURQUOI 25 MB ? L'artiste uploade des JPEG iPhone jusqu'à 20 MB.
  // La marge de 5 MB couvre les métadonnées FormData et variations de taille.
  //
  // Le cast "as NextConfig['experimental']" est nécessaire car proxyClientMaxBodySize
  // n'est pas encore déclaré dans les types Next.js 15.x, mais la valeur est bien
  // lue au runtime. Dès que Next.js publiera le type, le cast pourra être retiré.
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    // Limite proxy interne Next.js 15 standalone — même valeur que bodySizeLimit.
    // Sans ce paramètre, les builds standalone en production échouent pour les
    // fichiers > 1 MB (bug Next.js 15.5+). Ignoré silencieusement si non supporté.
    proxyClientMaxBodySize: '25mb',
  } as NextConfig['experimental'],

  // Bloquer le build si TypeScript a des erreurs — pas de build cassé en production
  typescript: {
    ignoreBuildErrors: false,
  },

  // Bloquer le build si ESLint a des erreurs
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Configuration des images distantes (pour la phase 6 avec Cloudflare R2)
  // En local, les images sont servies depuis /public/ — pas besoin de remotePatterns ici
  images: {
    remotePatterns: [
      // À compléter en Phase 6 avec l'URL du bucket R2
      // { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' }
    ],
  },
}

export default nextConfig
