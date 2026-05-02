/**
 * Fond décoratif SVG de la Galerie POF.
 *
 * POURQUOI un SVG avec feTurbulence ?
 * feTurbulence génère un motif organique (bruit de Perlin) qui simule les traits
 * peints à la main. feDisplacementMap applique ce motif comme distorsion sur les
 * formes géométriques. Résultat : des ellipses et courbes qui ressemblent à des
 * coups de pinceau irréguliers.
 *
 * Contraintes D-04 (verrouillées) :
 * - position: fixed → toujours visible quel que soit le scroll de la page
 * - z-index: 0 → derrière tout le contenu interactif
 * - pointer-events: none → jamais bloquant pour les clics et interactions
 * - aria-hidden: true → invisible aux lecteurs d'écran (purement décoratif)
 *
 * Couleurs : palette D-01 à opacité 0.15–0.22.
 */
export function BackgroundDecor() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/*
         * feTurbulence : génère le bruit organique de base
         * baseFrequency : échelle du bruit (0.018 = grandes vagues douces)
         * numOctaves : nombre de couches de détail (4 = assez organique)
         * seed : graine aléatoire fixe → motif reproductible
         */}
        <filter id="handpaint" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.018"
            numOctaves="4"
            seed="42"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      {/* Formes décoratives — palette D-01 à opacité 0.15–0.22 */}

      {/* Ellipse verte en haut à gauche — comme une touche de peinture */}
      <ellipse
        cx="15%"
        cy="12%"
        rx="120"
        ry="60"
        fill="#8cb369"
        opacity="0.18"
        filter="url(#handpaint)"
      />

      {/* Ellipse orange à droite — coup de pinceau vertical */}
      <ellipse
        cx="85%"
        cy="25%"
        rx="90"
        ry="140"
        fill="#f4a259"
        opacity="0.15"
        filter="url(#handpaint)"
      />

      {/* Cercle teal au centre-bas — aplat rond */}
      <circle
        cx="50%"
        cy="75%"
        r="100"
        fill="#5b8e7d"
        opacity="0.16"
        filter="url(#handpaint)"
      />

      {/* Trait horizontal rouge en bas à gauche — barre de couleur */}
      <ellipse
        cx="20%"
        cy="85%"
        rx="200"
        ry="30"
        fill="#bc4b51"
        opacity="0.15"
        filter="url(#handpaint)"
      />

      {/* Tache jaune à droite — aplat lumineux */}
      <ellipse
        cx="78%"
        cy="68%"
        rx="80"
        ry="80"
        fill="#f4e285"
        opacity="0.22"
        filter="url(#handpaint)"
      />
    </svg>
  )
}
