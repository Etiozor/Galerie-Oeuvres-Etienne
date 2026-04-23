import type { Metadata } from 'next'
import './globals.css'

/**
 * Métadonnées globales du site.
 *
 * Ces informations apparaissent dans les onglets du navigateur et
 * dans les aperçus partagés sur les réseaux sociaux (WhatsApp, Twitter, etc.).
 * Elles seront enrichies en Phase 3 avec Open Graph complet (image de partage,
 * description étendue, etc.).
 */
export const metadata: Metadata = {
  title: 'Galerie POF',
  description: "Galerie personnelle de l'artiste — dessins et peintures",
}

/**
 * Layout racine de l'application.
 *
 * Ce composant enveloppe TOUTES les pages du site — c'est le conteneur
 * principal de l'application. Il inclut :
 * - Les styles globaux (Tailwind CSS via globals.css)
 * - La langue de la page (lang="fr" pour l'accessibilité et le SEO)
 *
 * Toute modification ici s'applique à l'ensemble du site.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
