/**
 * Page de connexion de l'artiste — /admin/login.
 *
 * Utilise le client Better Auth qui gère automatiquement le cookie
 * de session (contrairement à un fetch manuel).
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function AdminLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    await authClient.signIn.email({
      email,
      password,
      fetchOptions: {
        onSuccess: () => {
          router.refresh()
          router.push('/admin')
        },
        onError: (ctx) => {
          setError(ctx.error.message ?? 'Email ou mot de passe incorrect')
          setLoading(false)
        },
      },
    })
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
