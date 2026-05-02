/**
 * Layout racine de la Galerie POF.
 *
 * Ce composant enveloppe TOUTES les pages du site.
 * Il charge les trois polices Google via next/font (auto-hébergées au build,
 * pas de requête réseau au runtime) et injecte les variables CSS correspondantes
 * sur l'élément <html> pour qu'elles soient accessibles partout.
 *
 * metadataBase est OBLIGATOIRE pour que og:image soit une URL absolue —
 * les crawlers sociaux (Facebook, WhatsApp, etc.) ne résolvent pas les URLs relatives.
 * (Voir piège 1 dans 03-RESEARCH.md)
 */
import type { Metadata } from 'next'
import { Oswald, Space_Mono, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

// POURQUOI next/font/google ?
// Auto-hébergement des polices au build → pas de layout shift, pas de FOUT.
// Les variables CSS sont injectées dans <html> et accessibles via var(--font-*).
// Aucune requête réseau à Google Fonts au runtime.
const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

const cormorantGaramond = Cormorant_Garamond({
  weight: ['400'],
  style: ['italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const metadata: Metadata = {
  // OBLIGATOIRE : résout les og:image relatives en URLs absolues.
  // En production, BETTER_AUTH_URL contient l'URL Railway du site.
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'),
  title: 'Galerie POF',
  description: "Galerie personnelle de l'artiste — dessins et peintures",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Les trois variables CSS de polices sont injectées ici sur <html>
    // pour être accessibles dans tout le CSS via var(--font-oswald), etc.
    <html
      lang="fr"
      className={`${oswald.variable} ${spaceMono.variable} ${cormorantGaramond.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
