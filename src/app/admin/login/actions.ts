'use server'

import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Server Action de connexion artiste.
 * Authentifie via Better Auth côté serveur et pose le cookie httpOnly directement.
 */
export async function loginAction(prevState: { error: string | null }, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
    })

    if (!result?.token) {
      return { error: 'Email ou mot de passe incorrect' }
    }

    // Poser le cookie de session côté serveur (httpOnly — inaccessible au JS client)
    const cookieStore = await cookies()
    cookieStore.set('better-auth.session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch {
    return { error: 'Email ou mot de passe incorrect' }
  }

  redirect('/admin')
}
