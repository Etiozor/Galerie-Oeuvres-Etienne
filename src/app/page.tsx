/**
 * Page d'accueil temporaire de la Galerie POF.
 *
 * Cette page sera remplacée en Phase 3 par la galerie complète avec les œuvres de l'artiste.
 * Pour l'instant, elle confirme que Next.js 15 fonctionne correctement et que
 * Tailwind CSS 4 est bien configuré (les classes comme min-h-screen et font-bold doivent
 * s'appliquer visuellement).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold text-center">
        Galerie POF — En construction
      </h1>
    </main>
  )
}
