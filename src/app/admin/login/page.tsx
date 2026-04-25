/**
 * Page de connexion de l'artiste — /admin/login.
 *
 * Formulaire email + mot de passe connecté à Better Auth.
 * Le Client Component est nécessaire ici pour gérer les événements
 * du formulaire (onChange, onSubmit) et afficher les erreurs.
 *
 * POURQUOI 'use client' ?
 * Les formulaires interactifs avec état (chargement, erreurs) nécessitent
 * React côté client. Le reste de l'admin peut rester Server Component.
 *
 * [D-04] : admin accessible à /admin
 * [D-05] : email + mot de passe uniquement
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()

  // État du formulaire : champs, chargement, erreur
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Soumission du formulaire de connexion.
   *
   * Appelle l'endpoint Better Auth /api/auth/sign-in/email.
   * En cas de succès, Better Auth pose un cookie de session httpOnly
   * et on redirige l'artiste vers le tableau de bord.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        // Better Auth retourne un message d'erreur dans le corps JSON
        const data = await response.json() as { message?: string }
        setError(data.message ?? 'Email ou mot de passe incorrect')
        return
      }

      // Connexion réussie — invalider le cache Next.js puis rediriger
      // router.refresh() est INDISPENSABLE ici : sans lui, Next.js App Router peut
      // servir une version en cache de /admin (visitée avant connexion, qui redirige
      // vers /admin/login). Le Server Component admin recevrait alors les données
      // en cache plutôt que de vérifier la nouvelle session fraîchement posée.
      router.refresh()
      router.push('/admin')
    } catch {
      setError('Erreur de connexion. Vérifiez votre réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Galerie POF — Administration</h1>

        <form onSubmit={handleSubmit}>
          {/* Champ email */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }}
              placeholder="artiste@exemple.com"
            />
          </div>

          {/* Champ mot de passe */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Message d'erreur — affiché si la connexion échoue */}
          {error && (
            <p style={{ color: '#c00', marginBottom: '1rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              backgroundColor: '#111',
              color: '#fff',
              border: 'none',
            }}
          >
            {loading ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  )
}
