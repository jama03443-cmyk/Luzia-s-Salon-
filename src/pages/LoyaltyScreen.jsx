import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ArrowLeft, CheckCircle2, Copy, Gift, History, LogIn, LogOut, Minus, Plus, Scissors, ShieldCheck, Sparkles, Star, UserRound, UsersRound } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isSupabaseConfigured, supabase } from '../supabaseClient'
import { DEFAULT_LOYALTY_PROGRAM, getLoyaltyProgramSettings, getLoyaltyProgramSteps } from '../loyaltyProgram'
import PwaBottomNav from '../PwaBottomNav'
import BrandLogo from '../BrandLogo'
import useLogoStyle from '../useLogoStyle'

function formatMemberSince(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-CH', { month: 'long', year: 'numeric' }).format(new Date(date))
}

function swissPhoneDigits(value) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0041')) digits = digits.slice(4)
  else if (digits.startsWith('41') && digits.length > 9) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length > 9) digits = digits.slice(1)
  return digits.slice(0, 9)
}

function swissWhatsApp(value) {
  const digits = swissPhoneDigits(value)
  return digits.length === 9 ? `+41${digits}` : null
}

export default function LoyaltyScreen() {
  const { session, isLoading, refreshAuth } = useAuth()
  const location = useLocation()
  const logoStyle = useLogoStyle()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [whatsappInput, setWhatsappInput] = useState('')
  const [profile, setProfile] = useState(null)
  const [card, setCard] = useState(null)
  const [pointEvents, setPointEvents] = useState([])
  const [errorMessage, setErrorMessage] = useState(() => {
    const params = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''))
    const authError = params.get('error_description') || params.get('error') || hashParams.get('error_description') || hashParams.get('error')
    return authError ? `Connexion Google impossible : ${authError.replaceAll('+', ' ')}` : ''
  })
  const [toast, setToast] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loyaltyProgram, setLoyaltyProgram] = useState(DEFAULT_LOYALTY_PROGRAM)
  const [loyaltySteps, setLoyaltySteps] = useState(() => getLoyaltyProgramSteps(DEFAULT_LOYALTY_PROGRAM))
  const [loyaltyProgramError, setLoyaltyProgramError] = useState('')
  const [isLoadingLoyaltyData, setIsLoadingLoyaltyData] = useState(false)
  const [loyaltyLoadAttempt, setLoyaltyLoadAttempt] = useState(0)
  const [isLoyaltyProgramLoaded, setIsLoyaltyProgramLoaded] = useState(() => !supabase)
  const [showRewardCelebration, setShowRewardCelebration] = useState(false)
  const rewardClaimInFlight = useRef(false)

  useEffect(() => {
    if (!supabase) return undefined
    let mounted = true
    const loadLoyaltyProgram = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('loyalty_visits_for_reward, loyalty_reward_title, loyalty_reward_description, loyalty_birthday_title, loyalty_birthday_description, loyalty_referral_title, loyalty_referral_description, loyalty_review_title, loyalty_review_description, loyalty_steps')
        .eq('id', true)
        .maybeSingle()
      if (mounted && !error && data) {
        setLoyaltyProgram(getLoyaltyProgramSettings(data))
        setLoyaltySteps(getLoyaltyProgramSteps(data))
        setLoyaltyProgramError('')
      }
      if (mounted && (error || !data)) setLoyaltyProgramError('Les réglages « Comment ça marche » ne peuvent pas être chargés. Vérifiez que loyalty-steps-migration.sql et hero-image-migration.sql ont été exécutés dans Supabase.')
      if (mounted) setIsLoyaltyProgramLoaded(true)
    }
    void loadLoyaltyProgram()
    const refreshOnReturn = () => { void loadLoyaltyProgram() }
    const timer = window.setInterval(refreshOnReturn, 30000)
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      mounted = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [])

  const refreshLoyaltyData = useCallback(async () => {
    if (!session || !supabase) return
    const { data: nextCard, error } = await supabase
      .from('loyalty_cards')
      .select('id, member_code, points, downloaded_at, updated_at')
      .eq('profile_id', session.user.id)
      .maybeSingle()
    if (error) return
    setCard(nextCard)
    if (!nextCard) {
      setPointEvents([])
      return
    }
    const { data: events, error: eventsError } = await supabase
      .from('loyalty_point_events')
      .select('id, point_delta, created_at, created_by')
      .eq('loyalty_card_id', nextCard.id)
      .order('created_at', { ascending: false })
    if (!eventsError) setPointEvents(events ?? [])
  }, [session])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 4600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!card || !isLoyaltyProgramLoaded || !supabase || rewardClaimInFlight.current) return undefined
    const pointsNow = Number(card.points) || 0
    const pointsForReward = Math.max(1, Number(loyaltyProgram.loyalty_visits_for_reward) || 10)
    if (pointsNow < pointsForReward) return undefined

    rewardClaimInFlight.current = true
    const claimReward = async () => {
      try {
        const { data, error } = await supabase.rpc('claim_loyalty_reward')
        if (error) {
          setErrorMessage('Votre coupe est acquise, mais la remise à zéro automatique nécessite la migration Supabase de la récompense fidélité.')
          return
        }
        const updatedCard = Array.isArray(data) ? data[0] : data
        if (updatedCard) setCard(updatedCard)
        await refreshLoyaltyData()
        setShowRewardCelebration(true)
      } catch {
        setErrorMessage('Votre coupe est acquise, mais le compteur n’a pas pu être remis à zéro. Réessayez avec une connexion active.')
      } finally {
        rewardClaimInFlight.current = false
      }
    }

    void claimReward()
    return undefined
  }, [card, isLoyaltyProgramLoaded, loyaltyProgram.loyalty_visits_for_reward, refreshLoyaltyData])

  useEffect(() => {
    if (!session || !supabase) {
      return undefined
    }
    let mounted = true

    const loadLoyaltyData = async () => {
      setIsLoadingLoyaltyData(true)
      setErrorMessage('')
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, whatsapp')
          .eq('id', session.user.id)
          .maybeSingle()
        if (!mounted) return
        if (profileError) throw new Error('Votre profil ne peut pas être chargé. Vérifiez la connexion Supabase puis réessayez.')

        const currentProfile = profileData ?? { first_name: '', last_name: '', whatsapp: '' }
        setProfile(currentProfile)
        setFirstName(currentProfile.first_name ?? '')
        setLastName(currentProfile.last_name ?? '')
        setWhatsappInput(swissPhoneDigits(currentProfile.whatsapp ?? ''))

        const { data, error } = await supabase
          .from('loyalty_cards')
          .select('id, member_code, points, downloaded_at, updated_at')
          .eq('profile_id', session.user.id)
          .maybeSingle()
        if (!mounted) return
        if (error) throw new Error('Votre carte fidélité ne peut pas être chargée. Vérifiez la migration fidélité dans Supabase.')
        setCard(data)
        if (!data && currentProfile.first_name && currentProfile.last_name && currentProfile.whatsapp) {
          throw new Error('Votre profil est prêt, mais la carte fidélité est introuvable. Réessayez ou contactez le salon.')
        }
        if (!data) return

        const { data: events, error: eventsError } = await supabase
          .from('loyalty_point_events')
          .select('id, point_delta, created_at, created_by')
          .eq('loyalty_card_id', data.id)
          .order('created_at', { ascending: false })
        if (!mounted) return
        if (eventsError) setErrorMessage('Votre carte est disponible, mais son historique ne peut pas être chargé.')
        else setPointEvents(events ?? [])
      } catch (error) {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : 'La fidélité est temporairement indisponible. Réessayez.')
      } finally {
        if (mounted) setIsLoadingLoyaltyData(false)
      }
    }

    void loadLoyaltyData()
    return () => { mounted = false }
  }, [session, loyaltyLoadAttempt])

  // Realtime keeps the PWA in sync; polling also covers Supabase projects
  // where Realtime has not yet been enabled for these tables.
  useEffect(() => {
    if (!session || !supabase || !card?.id) return undefined
    let active = true
    const refresh = () => { if (active) void refreshLoyaltyData() }
    const channel = supabase.channel('admin-loyalty-live')
      .on('broadcast', { event: 'loyalty-points-updated' }, ({ payload }) => {
        if (payload?.cardId === card.id) refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyalty_cards', filter: `id=eq.${card.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyalty_point_events', filter: `loyalty_card_id=eq.${card.id}` }, refresh)
      .subscribe()
    const timer = window.setInterval(refresh, 4000)
    const onFocus = () => refresh()
    const onVisibilityChange = () => { if (!document.hidden) refresh() }
    const onPageShow = () => refresh()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', onPageShow)
      void supabase.removeChannel(channel)
    }
  }, [session, card?.id, refreshLoyaltyData])

  const handleGoogleLogin = async () => {
    setErrorMessage('')
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('La connexion au programme de fidélité est indisponible.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/fidelite`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) {
        setErrorMessage(error.message)
      }
    } catch {
      setErrorMessage('La connexion est temporairement indisponible. Réessayez dans un instant.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProfileCompletion = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    if (!supabase || !session) {
      setErrorMessage('Votre connexion a expiré. Reconnectez-vous pour terminer la création de votre carte.')
      return
    }
    const whatsapp = swissWhatsApp(whatsappInput)
    if (!firstName.trim() || !lastName.trim() || !whatsapp) {
      setErrorMessage('Complétez votre prénom, votre nom et un WhatsApp suisse valide.')
      return
    }
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('complete_loyalty_profile', {
        profile_first_name: firstName.trim(),
        profile_last_name: lastName.trim(),
        profile_whatsapp: whatsapp,
      })
      if (error) {
        setErrorMessage(error.message.includes('complete_loyalty_profile')
          ? 'La configuration de la carte fidélité est incomplète. Contactez le salon pour terminer son activation.'
          : error.message)
        return
      }
      const completedProfile = Array.isArray(data) ? data[0] : data
      setProfile(completedProfile ?? { first_name: firstName.trim(), last_name: lastName.trim(), whatsapp })
      await refreshLoyaltyData()
      setToast({ title: 'Carte activée', text: 'Votre QR code personnel est prêt.' })
    } catch {
      setErrorMessage('La carte n’a pas pu être activée. Vérifiez votre connexion puis réessayez.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyCode = async () => {
    if (!card) return
    await navigator.clipboard?.writeText(card.member_code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    await refreshAuth(null)
    setCard(null)
    setPointEvents([])
    setProfile(null)
  }

  const needsProfileCompletion = Boolean(profile && (!profile.first_name || !profile.last_name || !profile.whatsapp))

  if (isLoading) return <LoadingScreen />

  return <main className="pwa-loyalty-page min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8 lg:px-10">
    {toast && <SuccessToast title={toast.title} text={toast.text} />}
    {showRewardCelebration && <RewardCelebration pointsRequired={Number(loyaltyProgram.loyalty_visits_for_reward) || 10} onClose={() => setShowRewardCelebration(false)} />}
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between pb-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" aria-label="Luzia’s Salon — accueil" className="inline-flex items-center transition-opacity hover:opacity-80"><BrandLogo style={logoStyle} tone="light" className="!h-20 w-auto max-w-[280px] object-contain" /></Link>
          {needsProfileCompletion && <button type="button" onClick={signOut} className="inline-flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:text-amber-200"><ArrowLeft size={15} /> Précédent</button>}
        </div>
        {session && profile && !needsProfileCompletion && <button type="button" onClick={signOut} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-amber-200"><LogOut size={14} /> Déconnexion</button>}
      </header>
      {session ? isLoadingLoyaltyData || (!profile && !errorMessage) ? <LoadingScreen /> : needsProfileCompletion ? <ProfileCompletion firstName={firstName} lastName={lastName} whatsappInput={whatsappInput} setFirstName={setFirstName} setLastName={setLastName} setWhatsappInput={setWhatsappInput} onSubmit={handleProfileCompletion} isSubmitting={isSubmitting} errorMessage={errorMessage} /> : card ? <><LoyaltyCard card={card} events={pointEvents} currentUserId={session.user.id} copied={copied} onCopy={copyCode} rewardVisits={loyaltyProgram.loyalty_visits_for_reward} />{errorMessage && <InlineError>{errorMessage}</InlineError>}</> : <LoyaltyLoadFailure message={errorMessage} onRetry={() => setLoyaltyLoadAttempt((attempt) => attempt + 1)} onBack={signOut} /> : <section className="mx-auto mt-14 grid max-w-4xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200"><Sparkles size={14} /> Programme fidélité</p><h1 className="mt-5 font-display text-6xl font-bold uppercase leading-[0.86] tracking-tight sm:text-7xl">Chaque visite<br />compte.</h1><p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">Connectez-vous avec Google. Lors de votre première visite, nous vous demanderons uniquement votre prénom, votre nom et votre WhatsApp.</p><div className="mt-8 grid grid-cols-3 gap-3 text-center"><Benefit label="Google sécurisé" /><Benefit label="QR personnel" /><Benefit label="Points cumulés" /></div></div>
        <section className="border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"><div className="space-y-5"><div><p className="font-display text-3xl font-bold uppercase tracking-tight">Votre carte digitale.</p><p className="mt-2 text-sm leading-6 text-zinc-500">Connectez-vous avec Google. Lors de votre première visite uniquement, vous compléterez votre prénom, votre nom et votre WhatsApp.</p></div>{errorMessage && <InlineError>{errorMessage}</InlineError>}<button type="button" onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-3 border border-zinc-600 bg-white px-5 py-4 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 font-black text-blue-600">G</span>{isSubmitting ? 'Redirection vers Google…' : 'Continuer avec Google'}<LogIn size={16} /></button><p className="flex items-center justify-center gap-2 text-center text-[10px] leading-4 text-zinc-600"><ShieldCheck size={13} /> Connexion sécurisée par Google et Supabase.</p></div>
        </section>
      </section>}
      {loyaltyProgramError && <div className="mx-auto mt-8 max-w-4xl"><InlineError>{loyaltyProgramError}</InlineError></div>}
      <HowItWorks settings={loyaltyProgram} steps={loyaltySteps} />
    </div>
    <PwaBottomNav language="FR" />
  </main>
}

function ProfileCompletion({ firstName, lastName, whatsappInput, setFirstName, setLastName, setWhatsappInput, onSubmit, isSubmitting, errorMessage }) {
  return <section className="mx-auto mt-14 max-w-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200"><UserRound size={14} /> Première connexion</p>
    <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-none tracking-tight">Finalisez votre carte.</h1>
    <p className="mt-3 text-sm leading-6 text-zinc-500">Google peut remplir automatiquement votre prénom, votre nom et votre téléphone. Vérifiez les informations avant de continuer.</p>
    <form className="mt-7 space-y-5" onSubmit={onSubmit} autoComplete="on">
      <label className="block">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Prénom</span>
        <input name="given-name" autoComplete="given-name" required value={firstName} onChange={(event) => setFirstName(event.target.value)} className="loyalty-input" placeholder="Votre prénom" />
      </label>
      <label className="block">
        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Nom</span>
        <input name="family-name" autoComplete="family-name" required value={lastName} onChange={(event) => setLastName(event.target.value)} className="loyalty-input" placeholder="Votre nom" />
      </label>
      <WhatsAppField value={whatsappInput} onChange={setWhatsappInput} />
      {errorMessage && <InlineError>{errorMessage}</InlineError>}
      <button type="submit" className="button-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Activation…' : 'Activer ma carte'}</button>
    </form>
  </section>
}

function WhatsAppField({ value, onChange }) {
  return <label className="block">
    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Numéro WhatsApp suisse</span>
    <span className="flex h-12 border border-zinc-700 bg-zinc-950 focus-within:border-amber-200">
      <span className="flex items-center border-r border-zinc-700 px-4 font-mono text-sm text-amber-200">+41</span>
      <input name="tel" type="tel" inputMode="tel" autoComplete="tel" value={value} onChange={(event) => onChange(swissPhoneDigits(event.target.value))} required className="min-w-0 flex-1 bg-transparent px-4 text-sm text-zinc-100 outline-none" placeholder="79 123 45 67" />
    </span>
    <span className="mt-2 block text-[10px] leading-4 text-zinc-600">Entrez 79 123 45 67, 079 123 45 67 ou +41 79 123 45 67.</span>
  </label>
}
function RewardCelebration({ onClose, pointsRequired }) {
  const giftRef = useRef(null)
  const lidRef = useRef(null)
  const messageRef = useRef(null)
  const sparklesRef = useRef(null)

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.set(giftRef.current, { y: -window.innerHeight * 0.75, rotationY: 0, scale: 0.72 })
      gsap.set(lidRef.current, { rotationX: 0, transformOrigin: '50% 100%' })
      gsap.set(messageRef.current, { autoAlpha: 0, y: 28, scale: 0.86 })
      gsap.set(sparklesRef.current, { autoAlpha: 0, scale: 0.3, rotation: -35 })
      const timeline = gsap.timeline()
      timeline.to(giftRef.current, { y: 0, scale: 1, duration: 0.95, ease: 'bounce.out' })
        .to(giftRef.current, { rotationY: 360, duration: 0.9, ease: 'power2.inOut' })
        .to(lidRef.current, { rotationX: -125, duration: 0.55, ease: 'back.out(1.8)' }, '-=0.08')
        .to(sparklesRef.current, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.42, ease: 'back.out(2)' }, '-=0.28')
        .to(messageRef.current, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.12')
      gsap.to(giftRef.current, { y: -5, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2.9 })
    })
    return () => context.revert()
  }, [])

  return <div className="fixed inset-0 z-[130] flex items-center justify-center overflow-hidden bg-black/80 px-5 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reward-celebration-title">
    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-orange-300/40 bg-zinc-950 px-6 pb-8 pt-5 text-center shadow-[0_0_90px_rgba(249,115,22,0.22)] sm:px-10">
      <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 z-20 rounded-full border border-zinc-700 p-2 text-zinc-400 transition hover:text-white"><span aria-hidden="true">×</span></button>
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Récompense débloquée</p>
      <div className="relative mx-auto mt-4 flex h-48 items-center justify-center" style={{ perspective: '900px' }}>
        <div ref={sparklesRef} className="pointer-events-none absolute inset-0 text-orange-300" aria-hidden="true"><Sparkles className="absolute left-7 top-8 h-8 w-8" /><Sparkles className="absolute right-7 top-5 h-6 w-6 text-amber-200" /><Sparkles className="absolute bottom-8 left-1/4 h-5 w-5 text-amber-200" /><Sparkles className="absolute bottom-7 right-1/4 h-7 w-7" /></div>
        <div ref={giftRef} className="relative h-28 w-36" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute -inset-x-2 -top-4 z-20 h-7 rounded-md border border-orange-200/80 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 shadow-lg" style={{ transformOrigin: '50% 100%', transformStyle: 'preserve-3d' }} ref={lidRef}><span className="absolute left-1/2 top-0 h-full w-5 -translate-x-1/2 bg-amber-100/90" /></div>
          <div className="absolute inset-0 overflow-hidden rounded-b-lg border border-orange-200/70 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 shadow-[inset_-12px_-10px_20px_rgba(124,45,18,0.35)]"><span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-amber-100 shadow-[0_0_18px_rgba(255,237,173,0.55)]" /><span className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-amber-100/90" /></div>
          <div className="absolute -top-10 left-1/2 z-10 h-10 w-14 -translate-x-1/2" aria-hidden="true"><span className="absolute left-1 top-2 h-7 w-7 rotate-[-35deg] rounded-full border-[6px] border-amber-200" /><span className="absolute right-1 top-2 h-7 w-7 rotate-[35deg] rounded-full border-[6px] border-amber-200" /></div>
        </div>
      </div>
      <div ref={messageRef}>
        <h2 id="reward-celebration-title" className="font-display text-3xl font-bold uppercase leading-tight text-white">Félicitations !</h2>
        <p className="mt-3 text-sm font-semibold text-orange-200">Après {pointsRequired} points, votre coupe est gratuite !</p>
        <button type="button" onClick={onClose} className="button-primary mt-6 w-full">Super, merci !</button>
      </div>
    </div>
  </div>
}

function LoyaltyCard({ card, events, currentUserId, copied, onCopy, rewardVisits }) { if (!card) return <LoadingScreen />; const qrValue = `ALEP-LOYALTY:${card.member_code}`; const pointsForReward = Math.max(1, Number(rewardVisits) || 10); const pointsRemaining = Math.max(0, pointsForReward - Number(card.points || 0)); return <section className="mx-auto mt-12 max-w-3xl"><p className="text-center text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">Votre carte fidélité</p><h1 className="mt-4 text-center font-display text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl">Bienvenue dans le club.</h1><div className="mt-9 overflow-hidden border border-amber-200/30 bg-[radial-gradient(circle_at_90%_0%,rgba(253,230,138,0.17),transparent_35%),linear-gradient(135deg,#18181b,#09090b)] p-6 sm:p-10"><div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-baseline gap-3"><span className="font-display text-8xl font-bold leading-none text-amber-200">{card.points}</span><span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">points collectés</span></div><p className="mt-5 text-sm text-zinc-400">Présentez votre code QR à l’équipe pour ajouter vos points à chaque visite.</p><p className="mt-2 text-xs text-zinc-600">Membre depuis {formatMemberSince(card.downloaded_at)}</p></div><div className="shrink-0 bg-zinc-50 p-3"><QRCodeSVG value={qrValue} size={168} level="M" includeMargin /></div></div><div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><span className="break-all font-mono text-xs text-zinc-500">{card.member_code}</span><button type="button" onClick={onCopy} className="inline-flex items-center gap-2 self-start text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:text-amber-200"><Copy size={14} />{copied ? 'Code copié' : 'Copier le code'}</button></div></div>{Number(card.points) > 0 && <p className="mt-4 text-center text-sm font-semibold text-amber-200">{pointsRemaining === 0 ? 'Votre coupe offerte vous attend.' : `Encore ${pointsRemaining} point${pointsRemaining === 1 ? '' : 's'} avant votre coupe offerte.`}</p>}<div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500"><Gift size={15} className="text-amber-200" /> Vos points sont ajoutés à votre carte numérique par l’équipe après chaque visite.</div><HistoryList events={events} currentUserId={currentUserId} /></section> }
function HistoryList({ events, currentUserId }) {
  const lastRewardEventId = events.find((event) => event.point_delta < 0 && event.created_by === currentUserId)?.id
  return <section className="mt-10 border border-zinc-800 bg-zinc-900/35"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6"><h2 className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-tight"><History size={19} className="text-amber-200" /> Historique des points</h2><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{events.length} opération{events.length === 1 ? '' : 's'}</span></div>{events.length === 0 ? <p className="px-5 py-10 text-center text-sm text-zinc-500">Aucun point n’a encore été collecté. Présentez votre QR code lors de votre prochaine visite.</p> : <ul className="divide-y divide-zinc-800">{events.map((event) => <PointEvent key={event.id} event={event} isLatestReward={event.id === lastRewardEventId} currentUserId={currentUserId} />)}</ul>}</section>
}

function PointEvent({ event, isLatestReward, currentUserId }) {
  const isCredit = event.point_delta > 0
  const isReward = event.point_delta < 0 && event.created_by === currentUserId
  const date = new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.created_at))
  const title = isReward ? isLatestReward ? 'Dernier cadeau reçu' : 'Coupe offerte reçue' : isCredit ? 'Visite validée' : 'Points utilisés'
  return <li className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"><span className="flex min-w-0 items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isReward ? 'bg-orange-400/10 text-orange-300' : isCredit ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-200/10 text-amber-200'}`}>{isReward ? <Gift size={15} /> : isCredit ? <Plus size={15} /> : <Minus size={15} />}</span><span className="min-w-0"><strong className="block text-sm text-zinc-200">{title}</strong><span className="mt-0.5 block text-xs text-zinc-500">{date}</span></span></span><strong className={isReward ? 'shrink-0 text-right text-xs text-orange-200' : isCredit ? 'shrink-0 text-emerald-400' : 'shrink-0 text-amber-200'}>{isReward ? 'Coupe offerte' : `${isCredit ? '+' : ''}${event.point_delta} point${Math.abs(event.point_delta) === 1 ? '' : 's'}`}</strong></li>
}
function SuccessToast({ title, text }) { return <aside role="status" className="loyalty-toast fixed inset-x-4 top-5 z-[100] mx-auto max-w-md border border-emerald-400/50 bg-zinc-900 px-4 py-4 shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-[25rem]"><div className="flex gap-3"><CheckCircle2 size={21} className="mt-0.5 shrink-0 text-emerald-400" /><div><strong className="block text-sm text-zinc-100">{title}</strong><p className="mt-1 text-xs leading-5 text-zinc-400">{text}</p></div></div></aside> }
function InlineError({ children }) { return <p role="alert" className="border-l-2 border-amber-200 bg-amber-200/5 px-3 py-2 text-xs leading-5 text-amber-100">{children}</p> }
function LoyaltyLoadFailure({ message, onRetry, onBack }) { return <section className="mx-auto mt-14 max-w-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8"><h1 className="font-display text-3xl font-bold uppercase">Carte indisponible</h1><p className="mt-3 text-sm leading-6 text-zinc-400">La connexion Google a réussi, mais Luzia’s Salon n’a pas pu charger votre carte de fidélité.</p><div className="mt-5"><InlineError>{message || 'Vérifiez votre connexion puis réessayez.'}</InlineError></div><div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={onRetry} className="button-primary flex-1">Réessayer</button><button type="button" onClick={onBack} className="button-ghost flex-1">Retour</button></div></section> }
function HowItWorks({ settings, steps }) {
  const points = Math.max(1, Math.min(100, Number(settings.loyalty_visits_for_reward) || 10))
  const visits = points + 1
  const textFor = (text = '') => text.replaceAll('{visits}', String(visits)).replaceAll('{points}', String(points)).replaceAll('{stamps}', String(points))
  const icons = { scissors: Scissors, gift: Gift, friends: UsersRound, star: Star, sparkles: Sparkles }

  if (steps.length === 0) return null

  return <section className="mx-auto mt-16 max-w-4xl border-t border-zinc-800 pt-10 sm:mt-20 sm:pt-14">
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200"><Sparkles size={14} /> Programme fidélité</p>
    <h2 className="mt-4 font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">Comment ça marche</h2>
    <div className="mt-8 space-y-4">
      {steps.map((step) => {
        const Icon = icons[step.icon] || Sparkles
        return <article key={step.id} className="flex gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5 sm:gap-6 sm:p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-200/10 text-amber-200"><Icon size={22} strokeWidth={1.8} /></span>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold sm:text-2xl">{textFor(step.title)}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">{textFor(step.description)}</p>
          </div>
        </article>
      })}
    </div>
  </section>
}

function Benefit({ label }) { return <div className="flex min-h-16 items-center justify-center border border-zinc-800 p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</p></div> }
function LoadingScreen() { return <main className="flex min-h-[50vh] items-center justify-center bg-zinc-950 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Chargement de votre carte…</main> }
