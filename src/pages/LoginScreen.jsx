import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isSupabaseConfigured, supabase } from '../supabaseClient'
import BrandLogo from '../BrandLogo'
import useLogoStyle from '../useLogoStyle'

export default function LoginScreen() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()
  const logoStyle = useLogoStyle()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    if (!isSupabaseConfigured || !supabase) {
      setMessage('Configuration Supabase manquante. Ajoutez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error || !data.user) {
        setMessage('Email ou mot de passe incorrect.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut()
        await refreshAuth(null)
        setMessage('Accès refusé. Ce compte ne possède pas les droits administrateur.')
        return
      }

      await refreshAuth(data.session)
      navigate('/admin-dashboard', { replace: true })
    } catch {
      setMessage('La connexion est temporairement indisponible. Réessayez dans un instant.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen min-h-[100svh] items-center justify-center overflow-x-hidden bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-5 sm:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(180,145,78,0.14),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(63,63,70,0.35),transparent_27%)]" />
      <section className="relative w-full max-w-md border border-zinc-800 bg-zinc-900/75 p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
        <a href="/admin-portal" aria-label="Alep Admin — connexion" className="inline-flex items-center text-zinc-100 transition-opacity hover:opacity-80">
          <BrandLogo style={logoStyle} tone="light" className="!h-12 w-auto max-w-[72vw] object-contain sm:!h-14 sm:max-w-[190px]" />
        </a>

        <div className="mt-8 sm:mt-10">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200"><Lock size={13} /> Accès sécurisé</p>
          <h1 className="mt-4 break-words font-display text-3xl font-bold uppercase leading-none tracking-tight text-zinc-50 sm:text-4xl">Administration</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">Connectez-vous avec un compte possédant le rôle administrateur.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="h-12 w-full border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition focus:border-amber-200"
              placeholder="admin@exemple.ch"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500">Mot de passe</span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="h-12 w-full border border-zinc-700 bg-zinc-950 py-0 pl-4 pr-12 text-sm text-zinc-100 outline-none transition focus:border-amber-200"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition hover:text-amber-200"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {message && <p role="alert" className="border-l-2 border-amber-200 bg-amber-200/5 px-3 py-2 text-xs leading-5 text-amber-100">{message}</p>}

          <button type="submit" className="button-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion…' : 'Ouvrir le tableau de bord'} <ArrowRight size={16} />
          </button>
        </form>
      </section>
    </main>
  )
}
