/**
 * Page détail d'une œuvre — Galerie POF.
 *
 * Server Component : fetch Drizzle direct + generateMetadata Open Graph.
 * Accessible publiquement sans authentification (la galerie est publique).
 *
 * SÉCURITÉ :
 * - parseInt(id, 10) + isNaN() protège contre les injections via l'URL
 * - Le filtre isNotNull(publishedAt) garantit que seules les œuvres publiées
 *   sont accessibles — un brouillon sans publishedAt retourne 404
 *
 * LAYOUT :
 * - Desktop (≥1024px) : grid 2 colonnes — 1fr (image) + 420px (panel info)
 * - Mobile (<1024px) : image pleine largeur puis panel info empilé
 *
 * NAVIGATION prev/next :
 * - "Précédent" = œuvre publiée plus récemment (publishedAt > courant, ORDER BY ASC)
 * - "Suivant" = œuvre publiée moins récemment (publishedAt < courant, ORDER BY DESC)
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/db'
import { gt, lt, asc, desc, and, eq, count, max, isNotNull } from 'drizzle-orm'
import { artworks, offers, visitors, savedArtworks } from '@/db/schema'
import type { PriceBreakdownData } from '@/db/schema'
import { getStorage } from '@/lib/storage'
import { ArtworkInfoPanel } from '@/components/artwork/ArtworkInfoPanel'
import { SiteNav } from '@/components/layout/SiteNav'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { BackgroundDecor } from '@/components/layout/BackgroundDecor'
import { getVisitorSession } from '@/lib/session'
import type { OfferHistoryItem } from '@/components/artwork/OfferHistory'

/** Type des props d'une page dynamique Next.js 15 (params est une Promise) */
type Props = { params: Promise<{ id: string }> }

/**
 * Génère les métadonnées Open Graph pour le partage social (WhatsApp, Instagram, Facebook).
 *
 * IMPORTANT : Next.js appelle generateMetadata() SÉPARÉMENT de la page.
 * Il faut donc ré-interroger la DB ici — on ne peut pas partager l'état avec le rendu.
 *
 * metadataBase est défini dans layout.tsx → les URLs relatives sont automatiquement
 * converties en absolues (obligatoire pour og:image).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const artworkId = parseInt(id, 10)

  // ID non numérique (ex: "abc", "../../etc") → métadonnées 404 sans requête DB
  if (isNaN(artworkId)) return { title: '404 — Galerie POF' }

  const artwork = await db.query.artworks.findFirst({
    where: (a, { and, eq, isNotNull }) => and(
      eq(a.id, artworkId),
      isNotNull(a.publishedAt)
    ),
    with: { type: true, artworkMediums: { with: { medium: true } } },
  })

  if (!artwork) return { title: '404 — Galerie POF' }

  const storage = getStorage()
  const imageUrl = artwork.originalPath ? storage.getUrl(artwork.originalPath) : undefined
  const mediumLabel = artwork.artworkMediums.map(am => am.medium.name).join(', ')

  // Description : texte de l'œuvre (tronqué) ou fallback type · médium · dimensions
  const description =
    artwork.description?.slice(0, 160) ??
    `${artwork.type?.name ?? ''} · ${mediumLabel} · ${artwork.widthCm ?? '?'}×${artwork.heightCm ?? '?'} cm`

  return {
    title: `${artwork.title} — Galerie POF`,
    openGraph: {
      title: artwork.title,
      description,
      images: imageUrl ? [imageUrl] : [],
      type: 'website',
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params

  // Validation de l'ID — retourne 404 si non numérique (protection T-03-06)
  // parseInt('abc') = NaN, parseInt('../../etc') = NaN → notFound() immédiat
  const artworkId = parseInt(id, 10)
  if (isNaN(artworkId)) notFound()

  // Charger l'œuvre avec ses relations type et médium
  const artwork = await db.query.artworks.findFirst({
    where: (a, { and, eq, isNotNull }) => and(
      eq(a.id, artworkId),
      isNotNull(a.publishedAt)
    ),
    with: { type: true, artworkMediums: { with: { medium: true } } },
  })

  // 404 si l'œuvre n'existe pas OU n'est pas publiée
  if (!artwork) notFound()

  // Résoudre l'URL de l'image côté serveur
  // getStorage() utilise node:fs — incompatible avec le bundle navigateur
  const storage = getStorage()
  const processedUrl = artwork.originalPath ? storage.getUrl(artwork.originalPath) : null

  // ── Navigation précédent/suivant ──────────────────────────────────────────
  // Ordre galerie : published_at DESC (plus récent en premier)
  // "Précédent" (affiché ←) = publié plus récemment (publishedAt > courant)
  // "Suivant" (affiché →) = publié moins récemment (publishedAt < courant)
  // Pattern 6 RESEARCH.md : deux requêtes séparées (Drizzle ne supporte pas les sous-requêtes)

  const prevArtwork = artwork.publishedAt
    ? await db.query.artworks.findFirst({
        where: and(
          isNotNull(artworks.publishedAt),
          gt(artworks.publishedAt, artwork.publishedAt)
        ),
        orderBy: [asc(artworks.publishedAt)],
        columns: { id: true, title: true },
      })
    : null

  const nextArtwork = artwork.publishedAt
    ? await db.query.artworks.findFirst({
        where: and(
          isNotNull(artworks.publishedAt),
          lt(artworks.publishedAt, artwork.publishedAt)
        ),
        orderBy: [desc(artworks.publishedAt)],
        columns: { id: true, title: true },
      })
    : null

  // srcset pour l'image principale — 3 tailles déclarées (D-14 UI-SPEC)
  // En Phase 3, même URL pour toutes les tailles (les variantes seront générées en Phase 6)
  const srcset = processedUrl
    ? `${processedUrl} 640w, ${processedUrl} 1024w, ${processedUrl} 1440w`
    : undefined

  // ── Décomposition du prix de base (MARKET-01 — Plan 04-02) ──────────────
  // POURQUOI un objet séparé et pas passer l'artwork entier ?
  // ArtworkInfoPanel ne doit pas dépendre du type Artwork complet —
  // cela crée un couplage fort et rend les tests plus complexes.
  // Ce type léger ne contient que les 6 colonnes nécessaires à PriceBreakdown.
  //
  // Drizzle avec findFirst() + 'with' retourne TOUTES les colonnes de artworks,
  // les 6 nouvelles colonnes price_* sont donc déjà présentes dans `artwork`.
  const priceBreakdown: PriceBreakdownData = {
    priceHoursSpent: artwork.priceHoursSpent ?? null,
    priceFormat: artwork.priceFormat ?? null,
    priceFraming: artwork.priceFraming ?? null,
    priceMaterials: artwork.priceMaterials ?? null,
    priceTechnicality: artwork.priceTechnicality ?? null,
    priceAttachment: artwork.priceAttachment ?? null,
  }

  // ── Chargement des offres pour l'historique (MARKET-04) ──────────────────
  //
  // POURQUOI charger toute la liste côté serveur même si elle est cachée ?
  // Le toggle est côté client (useState dans OfferHistory) — pas de round-trip serveur.
  // L'utilisateur voit instantanément la liste au clic sans attendre une requête réseau.
  // Pour une œuvre avec des centaines d'offres, envisager la pagination en Phase 5.
  //
  // SÉCURITÉ (T-04-04-01) : la requête SELECT exclut visitors.phone — displayName uniquement.
  // Le téléphone n'est JAMAIS sélectionné, jamais passé en props côté client.
  //
  // PARALLÉLISME : Promise.all exécute les deux requêtes simultanément —
  // agrégats COUNT/MAX et liste complète partent en même temps. Gain ~50%.
  const [offerAggregates, allOffersRaw] = await Promise.all([
    // Requête 1 : agrégats COUNT total + MAX montant pour le résumé
    // COUNT() retourne le nombre d'offres, MAX() retourne la meilleure offre
    db
      .select({
        total: count(),
        best: max(offers.amount),
      })
      .from(offers)
      .where(eq(offers.artworkId, artworkId)),

    // Requête 2 : liste complète triée par montant décroissant pour l'opt-in
    // LEFT JOIN visitors pour récupérer le displayName
    // SÉCURITÉ : on sélectionne UNIQUEMENT visitors.displayName — jamais visitors.phone (T-04-04-01)
    // offers.visitorId est sélectionné uniquement pour calculer isOwn côté serveur —
    // il n'est JAMAIS transmis au client dans les props (comparaison faite ici en map())
    db
      .select({
        id: offers.id,
        amount: offers.amount,
        message: offers.message,
        visitorName: visitors.displayName,
        createdAt: offers.createdAt,
        visitorId: offers.visitorId,
      })
      .from(offers)
      .leftJoin(visitors, eq(offers.visitorId, visitors.id))
      .where(eq(offers.artworkId, artworkId))
      .orderBy(desc(offers.amount)), // Meilleure offre en premier
  ])

  // Extraire les agrégats — count() retourne un number en Drizzle v0.45+
  const offerCount = Number(offerAggregates[0]?.total ?? 0)
  const bestOffer = offerAggregates[0]?.best ?? null

  // ── Session visiteur — lecture côté serveur ───────────────────────────────
  // DOIT être lue AVANT allOffers : le .map() ci-dessous utilise visitorSession.visitorId
  // pour calculer isOwn. Déclarer visitorSession après provoquerait une ReferenceError
  // (zone morte temporelle du const) dès qu'une œuvre a au moins une offre.
  //
  // CRUCIAL : on lit seulement la session ici — on ne sauvegarde JAMAIS dans un Server Component.
  // session.save() est réservé aux Server Actions (createOrLoginVisitor). [Piège 2, T-04-01-02]
  // POURQUOI await getVisitorSession() ? Next.js 15 : cookies() est async. [Piège 1]
  const visitorSession = await getVisitorSession()

  // Mapper les résultats vers le type OfferHistoryItem
  // Filtrer les lignes où le visiteur aurait été supprimé (LEFT JOIN → visitorName peut être null)
  // SÉCURITÉ : .filter() garantit que visitorName est non-null avant l'affichage
  // SÉCURITÉ isOwn : visitorId utilisé uniquement pour la comparaison serveur —
  // il n'est JAMAIS transmis dans les props (isOwn est un boolean calculé ici)
  const allOffers: OfferHistoryItem[] = allOffersRaw
    .filter((o) => o.visitorName !== null)
    .map((o) => ({
      id: o.id,
      amount: o.amount,
      message: o.message,
      visitorName: o.visitorName!,
      createdAt: o.createdAt,
      isOwn: visitorSession.visitorId != null
        ? o.visitorId === visitorSession.visitorId
        : undefined,
    }))

  // ── Vérifier si l'œuvre est dans les favoris du visiteur connecté ─────────
  // Initialise l'état du SaveButton côté serveur pour éviter un flash visuel
  // (le bouton serait ♡ pendant un court instant si l'état était chargé côté client).
  // SÉCURITÉ : session.visitorId ne peut pas être forgé — cookie chiffré iron-session.
  const isSaved = visitorSession.visitorId
    ? (await db
        .select({ visitorId: savedArtworks.visitorId })
        .from(savedArtworks)
        .where(and(
          eq(savedArtworks.visitorId, visitorSession.visitorId),
          eq(savedArtworks.artworkId, artworkId),
        ))
        .limit(1)).length > 0
    : false

  return (
    <>
      {/* Fond décoratif SVG (D-04 — position fixed, z-index 0, pointer-events none) */}
      <BackgroundDecor />

      {/* Navigation globale sticky (56px hauteur, z-index au-dessus du fond décoratif) */}
      <SiteNav />

      <main
        style={{
          position: 'relative',
          zIndex: 1, // Au-dessus du BackgroundDecor (z-index 0)
          minHeight: 'calc(100vh - 56px)', // 56px = hauteur SiteNav
        }}
      >
        {/*
         * CSS responsive via tag <style> inline.
         * POURQUOI <style> inline et pas Tailwind ?
         * La valeur "420px" n'est pas dans l'échelle Tailwind standard.
         * Les breakpoints responsive sur grid-template-columns nécessitent
         * des media queries que Tailwind ne peut pas générer sans config.
         */}
        <style>{`
          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 420px;
            min-height: calc(100vh - 56px);
          }
          @media (max-width: 1023px) {
            .detail-grid {
              grid-template-columns: 1fr;
            }
          }

          /*
           * Panel info : non-sticky sur mobile (≤1023px).
           * POURQUOI désactiver sticky sur mobile ?
           * En layout 1-colonne, le panel est empilé sous l'image — sticky + maxHeight: 100vh
           * confine le contenu dans 100vh et peut masquer le formulaire d'offre sous le fold.
           * Sur desktop (≥1024px), sticky + maxHeight: 100vh reste actif (comportement voulu :
           * le panel reste visible en parallèle de l'image pendant le scroll).
           * [08-RESEARCH.md Pitfall 7 — panel sticky bloque scroll vers OfferForm]
           *
           * scroll-padding-bottom : réserve 80px en bas du scroll container.
           * Quand le clavier virtuel s'ouvre sur mobile, le navigateur scrolle pour révéler
           * le champ focused — le padding garantit que le champ n'est pas coupé par le clavier.
           */
          @media (max-width: 1023px) {
            .detail-info-panel {
              position: static;
              max-height: none;
              overflow-y: visible;
              scroll-padding-bottom: 80px;
            }
          }
        `}</style>

        <div className="detail-grid">
          {/* ── Colonne gauche : image (D-14) ──────────────────────────────── */}
          <div
            style={{
              backgroundColor: 'var(--color-bg)',
              padding: '40px 48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Lien retour vers la galerie — ancré en haut à gauche de la colonne image */}
            <Link
              href="/"
              style={{
                position: 'absolute',
                top: 20,
                left: 32,
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-muted)',
                textDecoration: 'none',
              }}
            >
              ← Galerie
            </Link>

            {processedUrl ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={processedUrl}
                  srcSet={srcset}
                  sizes="(max-width: 1023px) 100vw, calc(100vw - 420px)"
                  alt={artwork.title}
                  loading="eager"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 120px)',
                    objectFit: 'contain',
                    boxShadow: '0 2px 16px rgba(26,26,26,0.12)',
                    display: 'block',
                  }}
                />
                {/* Stamp "Vendu" diagonal sur l'image quand applicable */}
                {artwork.status === 'sold' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-8deg)',
                      border: '3px solid var(--color-red)',
                      color: 'var(--color-red)',
                      padding: '8px 22px',
                      fontFamily: 'var(--font-oswald)',
                      fontWeight: 700,
                      fontSize: '28px',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      background: 'rgba(253,248,232,0.65)',
                      pointerEvents: 'none',
                    }}
                  >
                    Vendu
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  width: '400px',
                  height: '500px',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: '11px',
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  Image à venir
                </span>
              </div>
            )}
          </div>

          {/* ── Colonne droite : panel info (D-14) ─────────────────────────── */}
          {/*
           * detail-info-panel : sur mobile ≤1023px, le CSS @media annule sticky + maxHeight
           * pour permettre le scroll naturel jusqu'au formulaire d'offre.
           * Sur desktop ≥1024px, le style inline sticky + maxHeight: 100vh s'applique.
           */}
          <div
            className="detail-info-panel"
            style={{
              backgroundColor: 'var(--color-surface)',
              padding: '32px 32px 28px',
              overflowY: 'auto',
              maxHeight: '100vh',
              position: 'sticky',
              top: 0,
            }}
          >
            {/*
             * ArtworkInfoPanel contient désormais le SaveButton dans son header.
             * Le bouton est TOUJOURS rendu (même sans session) — la logique d'identité
             * est gérée dans SaveButton (ouvre VisitorProfileModal si non identifié).
             * initialSaved vaut false quand il n'y a pas de session (calculé ci-dessus).
             */}
            <ArtworkInfoPanel
              title={artwork.title}
              status={artwork.status}
              artworkId={artworkId}
              createdYear={artwork.createdYear ?? null}
              createdMonth={artwork.createdMonth ?? null}
              widthCm={artwork.widthCm}
              heightCm={artwork.heightCm}
              description={artwork.description}
              typeName={artwork.type?.name ?? null}
              mediumName={artwork.artworkMediums.map(am => am.medium.name).join(', ') || null}
              basePrice={artwork.basePrice}
              prev={prevArtwork ?? null}
              next={nextArtwork ?? null}
              visitorId={visitorSession.visitorId}
              visitorName={visitorSession.displayName}
              priceBreakdown={priceBreakdown}
              offerCount={offerCount}
              bestOffer={bestOffer}
              allOffers={allOffers}
              initialSaved={isSaved}
            />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
