import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowUpRight,
  AtSign,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Menu,
  Star,
  X,
} from 'lucide-react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import PwaBottomNav from './PwaBottomNav'
import { BODY_COLOR_OPTIONS, BUTTON_COLOR_OPTIONS, FOOTER_COLOR_OPTIONS, getButtonTextColor, getContrastTextColor } from './siteBranding'
import BrandLogo from './BrandLogo'
import useLogoStyle from './useLogoStyle'
import { formatSalonPrice } from './formatSalonPrice'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

const SITE_BRANDING_CACHE_KEY = 'alep-site-branding-v1'

function shouldShowClientIntro() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readCachedSiteBranding() {
  try {
    const cached = JSON.parse(window.localStorage.getItem(SITE_BRANDING_CACHE_KEY) || 'null')
    return {
      heroImageUrl: typeof cached?.heroImageUrl === 'string' ? cached.heroImageUrl : '',
      branding: {
        body_color: cached?.branding?.body_color || BODY_COLOR_OPTIONS[0].value,
        footer_color: cached?.branding?.footer_color || FOOTER_COLOR_OPTIONS[0].value,
        button_color: cached?.branding?.button_color || BUTTON_COLOR_OPTIONS[0].value,
        logo_style: cached?.branding?.logo_style || 'classic',
      },
    }
  } catch {
    return {
      heroImageUrl: '',
      branding: {
        body_color: BODY_COLOR_OPTIONS[0].value,
        footer_color: FOOTER_COLOR_OPTIONS[0].value,
        button_color: BUTTON_COLOR_OPTIONS[0].value,
        logo_style: 'classic',
      },
    }
  }
}

function cacheSiteBranding(heroImageUrl, branding) {
  try {
    window.localStorage.setItem(SITE_BRANDING_CACHE_KEY, JSON.stringify({ heroImageUrl, branding }))
  } catch {
    // Current settings still apply for this visit when browser storage is unavailable.
  }
}

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const LoginScreen = lazy(() => import('./pages/LoginScreen'))
const LoyaltyScreen = lazy(() => import('./pages/LoyaltyScreen'))
function getSwissDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]))
}

function isFutureSwissSlot(appointmentDate, appointmentTime) {
  const now = getSwissDateTime()
  const currentSwissTime = `${now.year}-${now.month}-${now.day}T${now.hour}:${now.minute}:${now.second}`
  return `${appointmentDate}T${appointmentTime}` > currentSwissTime
}

function getSalonStatus(scheduleRows, language = 'FR', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Zurich',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]))
  const currentMinutes = Number(values.hour) * 60 + Number(values.minute)
  const today = new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'long' }).format(date)
  const parseRanges = (day) => {
    const row = scheduleRows.find(([label]) => label.toLocaleLowerCase('fr-CH') === day)
    return [...(row?.[1] ?? '').matchAll(/(\d{2}):(\d{2})\s*[\u2013-]\s*(\d{2}):(\d{2})/g)].map(([, startHour, startMinute, endHour, endMinute]) => ({
      opensAt: Number(startHour) * 60 + Number(startMinute),
      closesAt: Number(endHour) * 60 + Number(endMinute),
      openingTime: `${startHour}:${startMinute}`,
      closingTime: `${endHour}:${endMinute}`,
    }))
  }
  const todayRanges = parseRanges(today)
  const activeRange = todayRanges.find(({ opensAt, closesAt }) => currentMinutes >= opensAt && currentMinutes < closesAt)
  const isGerman = language === 'DE'

  if (activeRange) {
    return {
      isOpen: true,
      detail: isGerman ? `schliesst um ${activeRange.closingTime}` : `ferme à ${activeRange.closingTime}`,
    }
  }

  const nextTodayRange = todayRanges.find(({ opensAt }) => currentMinutes < opensAt)
  if (nextTodayRange) {
    return {
      isOpen: false,
      detail: isGerman ? `öffnet um ${nextTodayRange.openingTime}` : `ouvre à ${nextTodayRange.openingTime}`,
    }
  }

  for (let daysAhead = 1; daysAhead <= 7; daysAhead += 1) {
    const nextDate = new Date(date.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    const nextWeekday = new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'long' }).format(nextDate)
    const nextRange = parseRanges(nextWeekday)[0]
    if (!nextRange) continue
    const nextDayName = new Intl.DateTimeFormat(isGerman ? 'de-CH' : 'fr-CH', { timeZone: 'Europe/Zurich', weekday: 'long' }).format(nextDate)
    return {
      isOpen: false,
      detail: isGerman ? `öffnet ${nextDayName} um ${nextRange.openingTime}` : `ouvre ${nextDayName} à ${nextRange.openingTime}`,
    }
  }

  return { isOpen: false, detail: isGerman ? 'Öffnungszeiten ansehen' : 'Voir les horaires' }
}

function formatServicePrice(price) {
  return formatSalonPrice(price)
}

function formatBookingPrice(price) {
  return formatSalonPrice(price)
}

const content = {
  FR: {
    nav: { salons: 'Le salon', services: 'Services', loyalty: 'Fidélité', contact: 'Contact' },
    country: 'Suisse',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    reserve: 'Réserver',
    heroTitle: <>Votre style.<br /><span>Notre signature.</span></>,
    heroText:
      'Des coupes pensées pour vous, dans un univers où l’exigence rencontre la convivialité. Votre prochain rendez-vous commence ici.',
    heroCta: 'Réserver ma coupe',
    addressPending: 'Adresse à annoncer',
    hoursPending: 'Horaires à annoncer',
    servicesTitle: 'Le geste juste,\nau juste prix.',
    bookThis: 'Réserver cette prestation',
    cuts: 'Coupes',
    beard: 'Barbe',
    care: 'Soins',
    trustTitle: 'Avis clients',
    trustQuote:
      '« Enfin un endroit où l’on prend vraiment le temps. Je ressors à chaque fois avec exactement ce que j’avais en tête. »',
    trustAuthor: '— Marc, client depuis 2018',
    giveReview: 'Donner mon avis',
    install: 'Installer l’application',
    footerText: 'Le barber shop suisse où chaque détail compte.',
    legal: 'Mentions légales',
    privacy: 'Confidentialité',
    services: {
      cuts: [
        ['Coupe classique', '35.–'],
        ['Coupe signature', '48.–'],
        ['Coupe & barbe', '68.–'],
      ],
      beard: [
        ['Taille de barbe', '28.–'],
        ['Rasage traditionnel', '38.–'],
        ['Barbe signature', '45.–'],
      ],
      care: [
        ['Soin visage express', '25.–'],
        ['Rituel serviette chaude', '18.–'],
        ['Pack entretien', '22.–'],
      ],
    },
  },
  DE: {
    nav: { salons: 'Der Salon', services: 'Services', loyalty: 'Treueprogramm', contact: 'Kontakt' },
    country: 'Schweiz',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schliessen',
    reserve: 'Buchen',
    heroTitle: <>Dein Stil.<br /><span>Unsere Signatur.</span></>,
    heroText:
      'Schnitte, die zu dir passen – in einer Atmosphäre, in der Anspruch auf echte Gastfreundschaft trifft. Dein nächster Termin beginnt hier.',
    heroCta: 'Termin buchen',
    addressPending: 'Adresse folgt',
    hoursPending: 'Öffnungszeiten folgen',
    servicesTitle: 'Der richtige Schnitt,\nzum richtigen Preis.',
    bookThis: 'Service buchen',
    cuts: 'Schnitte',
    beard: 'Bart',
    care: 'Pflege',
    trustTitle: 'Kundenbewertungen',
    trustQuote:
      '« Endlich ein Ort, an dem man sich wirklich Zeit nimmt. Ich gehe jedes Mal mit genau dem Ergebnis, das ich mir vorgestellt habe. »',
    trustAuthor: '— Marc, Kunde seit 2018',
    giveReview: 'Bewertung abgeben',
    install: 'App installieren',
    footerText: 'Der Schweizer Barber Shop, bei dem jedes Detail zählt.',
    legal: 'Impressum',
    privacy: 'Datenschutz',
    services: {
      cuts: [
        ['Klassischer Schnitt', '35.–'],
        ['Signature Cut', '48.–'],
        ['Schnitt & Bart', '68.–'],
      ],
      beard: [
        ['Bart trimmen', '28.–'],
        ['Traditionelle Rasur', '38.–'],
        ['Signature Bart', '45.–'],
      ],
      care: [
        ['Express Gesichtsbehandlung', '25.–'],
        ['Heisses Handtuch Ritual', '18.–'],
        ['Pflege Pack', '22.–'],
      ],
    },
  },
}

const fallbackSalons = [
  {
    key: 'bienne',
    city: 'Bienne',
    cityDe: 'Biel',
    address: { FR: 'Rue Centrale 56, 2502 Biel/Bienne', DE: 'Rue Centrale 56, 2502 Biel/Bienne' },
    phone: '076 612 43 33',
    hours: { FR: 'Voir les horaires ci-dessous', DE: 'Öffnungszeiten siehe unten' },
    schedule: {
      FR: [['Mercredi', '09:00–19:00'], ['Jeudi', '09:00–19:00'], ['Vendredi', '09:00–19:00'], ['Samedi', '08:00–16:00'], ['Dimanche', 'Fermé'], ['Lundi', '13:00–18:00'], ['Mardi', '09:00–19:00']],
      DE: [['Mittwoch', '09:00–19:00'], ['Donnerstag', '09:00–19:00'], ['Freitag', '09:00–19:00'], ['Samstag', '08:00–16:00'], ['Sonntag', 'Geschlossen'], ['Montag', '13:00–18:00'], ['Dienstag', '09:00–19:00']],
    },
    onlineSchedule: {
      FR: [['Mercredi', '09:00–19:00'], ['Jeudi', '09:00–19:00'], ['Vendredi', '09:00–19:00'], ['Samedi', 'Fermé'], ['Dimanche', 'Fermé'], ['Lundi', '13:00–18:00'], ['Mardi', '09:00–19:00']],
      DE: [['Mittwoch', '09:00–19:00'], ['Donnerstag', '09:00–19:00'], ['Freitag', '09:00–19:00'], ['Samstag', 'Geschlossen'], ['Sonntag', 'Geschlossen'], ['Montag', '13:00–18:00'], ['Dienstag', '09:00–19:00']],
    },
  },
]

function PublicSite() {
  const [cachedSiteBranding] = useState(readCachedSiteBranding)
  const [language, setLanguage] = useState('FR')
  const [introVisible, setIntroVisible] = useState(() => shouldShowClientIntro())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [installHelpMessage, setInstallHelpMessage] = useState('')
  const [managedSalons, setManagedSalons] = useState([])
  const [managedBranding, setManagedBranding] = useState(cachedSiteBranding.branding)
  const [managedServices, setManagedServices] = useState([])
  const [managedServiceCategoryNames, setManagedServiceCategoryNames] = useState([])
  const [isManagedServicesLoaded, setIsManagedServicesLoaded] = useState(false)
  const [managedBarbers, setManagedBarbers] = useState([])
  const [salonStatus, setSalonStatus] = useState(() => getSalonStatus(fallbackSalons[0].schedule.FR))
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingDraft, setBookingDraft] = useState({ salonId: 'bienne', barberId: '', serviceName: '', clientName: '', clientPhone: '+41 ', appointmentDate: '', slotId: '' })
  const [bookingStatus, setBookingStatus] = useState(null)
  const [isBooking, setIsBooking] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isPastHero, setIsPastHero] = useState(false)
  const t = content[language]
  const siteStyle = {
    '--site-body-color': managedBranding.body_color || BODY_COLOR_OPTIONS[0].value,
    '--site-body-text': getContrastTextColor(managedBranding.body_color || BODY_COLOR_OPTIONS[0].value),
    '--site-footer-color': managedBranding.footer_color || FOOTER_COLOR_OPTIONS[0].value,
    '--site-footer-text': getButtonTextColor(managedBranding.footer_color || FOOTER_COLOR_OPTIONS[0].value),
    '--site-button-color': managedBranding.button_color || BUTTON_COLOR_OPTIONS[0].value,
    '--site-button-text': getButtonTextColor(managedBranding.button_color),
  }

  useEffect(() => {
    const updateSalonStatus = () => {
      const nextStatus = getSalonStatus(fallbackSalons[0].schedule.FR, language)
      setSalonStatus((currentStatus) => currentStatus.isOpen === nextStatus.isOpen && currentStatus.detail === nextStatus.detail
        ? currentStatus
        : nextStatus)
    }
    const refreshOnResume = () => {
      if (document.visibilityState === 'visible') updateSalonStatus()
    }

    updateSalonStatus()
    const timer = window.setInterval(updateSalonStatus, 15_000)
    document.addEventListener('visibilitychange', refreshOnResume)
    window.addEventListener('focus', refreshOnResume)
    window.addEventListener('pageshow', refreshOnResume)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshOnResume)
      window.removeEventListener('focus', refreshOnResume)
      window.removeEventListener('pageshow', refreshOnResume)
    }
  }, [language])

  useEffect(() => {
    if (!introVisible) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const introTimeline = gsap.timeline({ onComplete: () => setIntroVisible(false) })
    introTimeline
      .fromTo('.site-intro-logo',
        { y: -18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
      )
      .fromTo('.site-intro-welcome',
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
        '+=0.35',
      )
      .to('.site-intro', { yPercent: -100, duration: 0.8, ease: 'power4.inOut' }, '+=0.2')

    return () => introTimeline.kill()
  }, [introVisible])

  useEffect(() => {
    if (introVisible) return undefined
    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduceMotion) return

      gsap.fromTo('.navbar-brand-logo',
        { y: -64, opacity: 0 },
        { y: 5, opacity: 1, duration: 1, ease: 'power3.out' },
      )

      const heroTimeline = gsap.timeline({ delay: 0.12 })
      heroTimeline
        .fromTo('.hero-title',
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' },
        )
        .fromTo('.hero-copy .button-primary',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
          '+=0.02',
        )

      gsap.utils.toArray('.site-shell main .section-shell h2, .site-shell main #services h3[id^="services-category-"], .site-footer h2').forEach((heading) => {
        gsap.fromTo(heading,
          { x: -56, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: { trigger: heading, start: 'top 88%', toggleActions: 'play reverse play reverse' },
          },
        )
      })

      gsap.utils.toArray('.site-shell main img').forEach((image) => {
        if (image.closest('.service-marquee')) return
        gsap.fromTo(image,
          { x: -72, opacity: 0, scale: 0.96 },
          {
            x: 0,
            opacity: 1,
            scale: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: image, start: 'top 92%', toggleActions: 'play reverse play reverse' },
          },
        )
      })

    })
    return () => context.revert()
  }, [introVisible])

  useEffect(() => {
    if (introVisible) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const context = gsap.context(() => {
      gsap.utils.toArray('#services .service-marquee-group[aria-hidden="false"] > button').forEach((card) => {
        gsap.fromTo(card,
          { x: -64, y: 12, opacity: 0 },
          {
            x: 0,
            y: 0,
            opacity: 1,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 94%', toggleActions: 'play reverse play reverse' },
          },
        )

        const cardTitle = card.querySelector('.service-card-title')
        if (cardTitle) {
          gsap.fromTo(cardTitle,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              delay: 0.78,
              ease: 'power3.out',
              scrollTrigger: { trigger: card, start: 'top 94%', toggleActions: 'play reverse play reverse' },
            },
          )
        }
      })
    })
    const refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => {
      cancelAnimationFrame(refreshFrame)
      context.revert()
    }
  }, [introVisible, isManagedServicesLoaded, language, managedServices])

  useEffect(() => {
    const hero = document.querySelector('.hero-stage')
    if (!hero) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      setIsPastHero(!entry.isIntersecting)
    }, { threshold: 0 })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
    const handleInstallPrompt = () => {
      const prompt = window.alepInstallPrompt
      if (!prompt) return
      setInstallPrompt(prompt)
      setInstallHelpMessage('')
    }
    const handleAppInstalled = () => {
      window.alepInstallPrompt = null
      setInstallPrompt(null)
      setInstallDialogOpen(false)
      setInstallHelpMessage('')
    }
    const shouldShowInstallPopup = !isInstalled && !new URLSearchParams(window.location.search).has('phonePreview')
    const installPopupTimer = shouldShowInstallPopup
      ? window.setTimeout(() => setInstallDialogOpen(true), 5000)
      : null

    window.addEventListener('alepinstallprompt', handleInstallPrompt)
    handleInstallPrompt()
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      if (installPopupTimer) window.clearTimeout(installPopupTimer)
      window.removeEventListener('alepinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!bookingOpen || !bookingDraft.salonId || !bookingDraft.barberId || !supabase) {
      return undefined
    }
    let isMounted = true
    const loadAvailableSlots = async () => {
      setAvailableSlots([])
      setIsLoadingSlots(true)
      const swissToday = getSwissDateTime()
      const lastAllowedDate = new Date(Number(swissToday.year), Number(swissToday.month) + 1, 0)
      const maxDate = `${lastAllowedDate.getFullYear()}-${String(lastAllowedDate.getMonth() + 1).padStart(2, '0')}-${String(lastAllowedDate.getDate()).padStart(2, '0')}`
      const { data, error } = await supabase
        .from('availability_slots')
        .select('id, appointment_date, appointment_time')
        .eq('salon_id', bookingDraft.salonId)
        .eq('barber_id', bookingDraft.barberId)
        .eq('is_active', true)
        .is('reserved_at', null)
        .gte('appointment_date', `${swissToday.year}-${swissToday.month}-${swissToday.day}`)
        .lte('appointment_date', maxDate)
        .order('appointment_date')
        .order('appointment_time')
      if (!isMounted) return
      setAvailableSlots(error ? [] : (data ?? []).filter((slot) => slot.appointment_date <= maxDate && isFutureSwissSlot(slot.appointment_date, slot.appointment_time)))
      setIsLoadingSlots(false)
    }
    void loadAvailableSlots()
    return () => { isMounted = false }
  }, [bookingOpen, bookingDraft.salonId, bookingDraft.barberId])

  useEffect(() => {
    let isMounted = true

    const loadPublicContent = async () => {
      if (!isSupabaseConfigured || !supabase) return

      const [salonsResult, servicesResult, barbersResult, heroSettingsResult, categoriesResult] = await Promise.all([
        supabase.from('salons').select('id, name, address, hours').eq('id', 'bienne'),
        supabase.from('services').select('id, category, name, price, image_url, image_urls, image_title'),
        supabase.from('barbers').select('id, salon_id, name, image_url').eq('is_active', true).order('name'),
        supabase.from('site_settings').select('hero_image_url, body_color, footer_color, button_color, logo_style').eq('id', true).maybeSingle(),
        supabase.from('service_categories').select('name').order('sort_order').order('name'),
      ])

      if (!isMounted) return
      if (!salonsResult.error) setManagedSalons(salonsResult.data ?? [])
      if (!servicesResult.error) {
        setManagedServices(servicesResult.data ?? [])
        setIsManagedServicesLoaded(true)
      }
      if (!categoriesResult.error) setManagedServiceCategoryNames((categoriesResult.data ?? []).map(({ name }) => name))
      if (!barbersResult.error) setManagedBarbers(barbersResult.data ?? [])
      if (!heroSettingsResult.error && heroSettingsResult.data) {
        const heroImageUrl = heroSettingsResult.data.hero_image_url ?? ''
        const branding = {
          body_color: heroSettingsResult.data.body_color || BODY_COLOR_OPTIONS[0].value,
          footer_color: heroSettingsResult.data.footer_color || FOOTER_COLOR_OPTIONS[0].value,
          button_color: heroSettingsResult.data.button_color || BUTTON_COLOR_OPTIONS[0].value,
          logo_style: heroSettingsResult.data.logo_style || 'classic',
        }
        setManagedBranding(branding)
        cacheSiteBranding(heroImageUrl, branding)
      }
    }

    void loadPublicContent()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined
    let isMounted = true

    const refreshManagedBranding = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('hero_image_url, body_color, footer_color, button_color, logo_style')
        .eq('id', true)
        .maybeSingle()

      if (!isMounted || error || !data) return

      const heroImageUrl = data.hero_image_url ?? ''
      const branding = {
        body_color: data.body_color || BODY_COLOR_OPTIONS[0].value,
        footer_color: data.footer_color || FOOTER_COLOR_OPTIONS[0].value,
        button_color: data.button_color || BUTTON_COLOR_OPTIONS[0].value,
        logo_style: data.logo_style || 'classic',
      }
      setManagedBranding(branding)
      cacheSiteBranding(heroImageUrl, branding)
    }

    const refreshOnResume = () => {
      if (document.visibilityState === 'visible') void refreshManagedBranding()
    }

    const timer = window.setInterval(() => void refreshManagedBranding(), 15_000)
    document.addEventListener('visibilitychange', refreshOnResume)
    window.addEventListener('focus', refreshOnResume)
    window.addEventListener('pageshow', refreshOnResume)

    return () => {
      isMounted = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshOnResume)
      window.removeEventListener('focus', refreshOnResume)
      window.removeEventListener('pageshow', refreshOnResume)
    }
  }, [])

  const salons = useMemo(() => fallbackSalons.map((fallback) => {
    const managed = managedSalons.find((salon) => salon.id === fallback.key)
    if (!managed) return fallback
    const managedAddress = managed.address && !/annoncer|folgt/i.test(managed.address)
      ? managed.address
      : null
    return {
      ...fallback,
      city: managed.name || fallback.city,
      address: {
        FR: managedAddress || fallback.address.FR,
        DE: managedAddress || fallback.address.DE,
      },
      hours: { FR: managed.hours || fallback.hours.FR, DE: managed.hours || fallback.hours.DE },
      schedule: fallback.schedule,
    }
  }), [managedSalons])

  const serviceGroups = useMemo(() => {
    const toItems = (items) => items.map(([name, price]) => ({ name, price, image_url: null }))
    if (!isManagedServicesLoaded) return {
      cuts: toItems(t.services.cuts),
      beard: toItems(t.services.beard),
      care: toItems(t.services.care),
    }
    const categoryNames = managedServiceCategoryNames.length
      ? managedServiceCategoryNames
      : [...new Set(managedServices.map((service) => service.category))]
    const categoryKey = (name) => ({ Coupes: 'cuts', Barbe: 'beard', Soins: 'care' }[name] ?? name)
    return Object.fromEntries(categoryNames.map((name) => [
      categoryKey(name),
      managedServices.filter((service) => service.category === name).map((service) => ({ ...service, price: service.price.replace(/^CHF\s*/i, '') })),
    ]))
  }, [isManagedServicesLoaded, managedServices, managedServiceCategoryNames, t.services])

  const serviceCategories = Object.entries(serviceGroups).map(([key, items]) => ({
    key,
    title: ({ cuts: t.cuts, beard: t.beard, care: t.care }[key] ?? key),
    items,
  })).filter(({ items }) => items.length > 0)

  useEffect(() => {
    document.documentElement.lang = language === 'FR' ? 'fr-CH' : 'de-CH'
    document.title = language === 'FR' ? 'Alep Salon — Suisse' : 'Alep Salon — Schweiz'
  }, [language])

  const handleBooking = (serviceName = '') => {
    setBookingStatus(null)
    setBookingDraft((current) => ({ ...current, salonId: 'bienne', serviceName: serviceName || current.serviceName, appointmentDate: '', slotId: '' }))
    setBookingOpen(true)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('openBooking')) return
    params.delete('openBooking')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    const timer = window.setTimeout(() => {
      setBookingStatus(null)
      setBookingDraft((current) => ({ ...current, salonId: 'bienne', appointmentDate: '', slotId: '' }))
      setBookingOpen(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const submitBooking = async (event) => {
    event.preventDefault()
    if (isBooking || bookingStatus?.type === 'success') return
    setBookingStatus(null)
    if (!isValidSwissPhone(bookingDraft.clientPhone)) {
      setBookingStatus({
        type: 'error',
        text: language === 'FR'
          ? 'Le numéro semble incorrect. Saisissez un numéro suisse valide, par exemple 079 123 45 67.'
          : 'Die Telefonnummer scheint falsch zu sein. Gib eine gültige Schweizer Nummer ein, zum Beispiel 079 123 45 67.',
      })
      return
    }
    if (!supabase || !isSupabaseConfigured) {
      setBookingStatus({ type: 'error', text: 'La réservation est temporairement indisponible.' })
      return
    }
    setIsBooking(true)
    try {
      const { error } = await supabase.rpc('book_available_slot', {
        target_slot_id: bookingDraft.slotId,
        customer_name: bookingDraft.clientName.trim(),
        customer_phone: formatSwissPhone(bookingDraft.clientPhone),
        requested_service: bookingDraft.serviceName,
      })
      if (error) throw error
      setBookingStatus({ type: 'success', text: 'Votre rendez-vous est confirmé immédiatement. À bientôt !' })
      setBookingDraft({ salonId: 'bienne', barberId: '', serviceName: '', clientName: '', clientPhone: '+41 ', appointmentDate: '', slotId: '' })
    } catch {
      setBookingStatus({ type: 'error', text: 'La réservation n’a pas pu être envoyée. Vérifiez les informations et réessayez.' })
    } finally {
      setIsBooking(false)
    }
  }

  const handleInstall = async () => {
    if (!installPrompt) {
      const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const isAndroid = /Android/i.test(navigator.userAgent)
      const helpMessage = language === 'FR'
        ? isAppleMobile
          ? 'Sur iPhone ou iPad : ouvrez ce site dans Safari, touchez Partager, puis « Sur l’écran d’accueil ». iOS ne permet pas l’installation directe par ce bouton.'
          : isAndroid
            ? 'Sur Android : ouvrez ce site dans Chrome, touchez ⋮, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ». '
            : 'Sur ordinateur : dans Chrome ou Edge, cliquez sur l’icône Installer dans la barre d’adresse, ou ouvrez ⋮ puis « Installer Alep Salon ». '
        : isAppleMobile
          ? 'Auf iPhone oder iPad: Öffne diese Seite in Safari, tippe auf „Teilen“ und dann auf „Zum Home-Bildschirm“. iOS unterstützt keine direkte Installation über diese Schaltfläche.'
          : isAndroid
            ? 'Auf Android: Öffne diese Seite in Chrome, tippe auf ⋮ und dann auf „App installieren“ oder „Zum Startbildschirm hinzufügen“. '
            : 'Am Computer: Klicke in Chrome oder Edge auf das Installationssymbol in der Adressleiste oder öffne ⋮ und wähle „Alep Salon installieren“. '
      setInstallHelpMessage(helpMessage)
      setInstallDialogOpen(true)
      return
    }

    try {
      setInstallHelpMessage('')
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice?.outcome === 'accepted') setInstallDialogOpen(false)
    } finally {
      setInstallPrompt(null)
    }
  }

  const closeMenu = () => {
    setMobileMenuOpen(false)
    setServicesMenuOpen(false)
  }
  const scrollToServices = () => {
    closeMenu()
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="site-shell min-h-screen overflow-x-hidden bg-white text-zinc-900 selection:bg-amber-200 selection:text-zinc-950" style={siteStyle}>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className={`site-nav-panel ${isPastHero ? 'site-nav-panel--after-hero' : ''} relative mx-auto grid min-h-[72px] max-w-[1440px] grid-cols-[1fr_auto] items-center rounded-2xl border px-4 sm:px-7 lg:grid-cols-[1fr_auto_1fr] lg:px-5 xl:px-10`}>
          <a href="#top" className="group flex items-center gap-2 justify-self-start" onClick={closeMenu}>
            <span className="navbar-brand-logo inline-flex items-center"><BrandLogo style={managedBranding.logo_style} tone="light" /></span>
          </a>
          <nav className="hidden items-center justify-center gap-3 lg:col-start-2 lg:flex xl:gap-5">
            <div
              className="relative"
              onMouseEnter={() => setServicesMenuOpen(true)}
              onMouseLeave={() => setServicesMenuOpen(false)}
              onFocusCapture={() => setServicesMenuOpen(true)}
              onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setServicesMenuOpen(false) }}
              onKeyDown={(event) => { if (event.key === 'Escape') setServicesMenuOpen(false) }}
            >
              <button type="button" className="nav-link flex items-center gap-2" onClick={() => setServicesMenuOpen((open) => !open)} aria-expanded={servicesMenuOpen} aria-controls="desktop-services-menu">
                {t.nav.services}<ChevronDown size={13} className={`transition-transform duration-300 ${servicesMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <div id="desktop-services-menu" aria-hidden={!servicesMenuOpen} className={`absolute left-1/2 top-full w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 pt-4 transition-all duration-300 ease-out ${servicesMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'}`}>
                <div className="grid grid-cols-3 gap-6 border border-zinc-700 bg-zinc-950/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
                  {serviceCategories.map((category, categoryIndex) => (
                    <section key={category.title} style={{ transitionDelay: `${categoryIndex * 70}ms` }} className={`transition-all duration-300 ${servicesMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
                      <h3 className="mb-3 border-b border-zinc-800 pb-3 font-display text-sm font-bold uppercase tracking-wider text-amber-200">{category.title}</h3>
                      <ul className="space-y-1">
                        {category.items.map(({ name, price }) => (
                          <li key={name}>
                            <button type="button" onClick={scrollToServices} className="group flex w-full items-center justify-between gap-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:text-white">
                              <span>{name}</span>
                              <span className="price-text flex shrink-0 items-center gap-1.5">{formatServicePrice(price)}<ArrowUpRight size={12} className="text-amber-200 opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" /></span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            </div>
            <Link className="nav-link" to="/fidelite">{t.nav.loyalty}</Link>
            <a className="nav-link" href="#salons">{t.nav.contact}</a>
          </nav>

          <div className="hidden items-center justify-end gap-4 lg:col-start-3 lg:flex xl:gap-6">
            <LanguageSwitch language={language} setLanguage={setLanguage} />
            <button className="button-primary !px-5 !py-3 text-[11px]" onClick={() => handleBooking()}>
              {t.reserve}<ArrowUpRight size={15} />
            </button>
          </div>

          <button
            className="col-start-2 flex h-11 w-11 items-center justify-center border border-white/20 text-white lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? t.closeMenu : t.openMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-panel"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-navigation-panel" className="mobile-menu-panel max-h-[calc(100svh-6rem)] overflow-y-auto border-t border-white/[0.08] bg-zinc-950 px-5 py-6 lg:hidden">
            <nav className="flex flex-col gap-5">
              <div>
                <button type="button" className="mobile-nav-link flex w-full items-center justify-between" onClick={() => setServicesMenuOpen((open) => !open)} aria-expanded={servicesMenuOpen} aria-controls="mobile-services-menu">
                  {t.nav.services}<ChevronDown size={15} className={`transition-transform duration-300 ${servicesMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <div id="mobile-services-menu" aria-hidden={!servicesMenuOpen} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${servicesMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="mt-3 space-y-4 border-l border-zinc-800 pl-4">
                      {serviceCategories.map((category) => (
                        <section key={category.title}>
                          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">{category.title}</h3>
                          <ul className="divide-y divide-zinc-900">
                            {category.items.map(({ name, price }) => <li key={name}><button type="button" onClick={scrollToServices} className="flex w-full items-center justify-between gap-3 py-2 text-left text-xs text-zinc-300"><span>{name}</span><span className="price-text shrink-0">{formatServicePrice(price)}</span></button></li>)}
                          </ul>
                        </section>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <Link className="mobile-nav-link" to="/fidelite" onClick={closeMenu}>{t.nav.loyalty}</Link>
              <a className="mobile-nav-link" href="#salons" onClick={closeMenu}>{t.nav.contact}</a>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-5">
                <LanguageSwitch language={language} setLanguage={setLanguage} />
                <button className="button-primary !px-5 !py-3 text-[11px]" onClick={() => { closeMenu(); handleBooking() }}>
                  {t.reserve}<ArrowUpRight size={15} />
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        <section className="hero-stage relative isolate flex min-h-[500px] items-center overflow-hidden border-b border-zinc-800/80 px-5 pb-12 pt-32 text-left sm:min-h-[620px] sm:px-8 md:min-h-[780px] lg:min-h-[min(900px,100svh)] lg:px-10 lg:pb-20 lg:pt-28">
          <h1 className="sr-only">Luzia’s Salon</h1>
          <div data-scroll-parallax className="hero-photo absolute inset-0 z-0" />
          <div className="hero-shade absolute inset-0 z-10" />
          <div className="hero-grid absolute inset-0 z-20" />
          <div className="pointer-events-none absolute inset-x-5 top-[108px] z-30 mx-auto flex max-w-[1440px] justify-start sm:inset-x-8 lg:top-[112px] lg:px-10">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-950">
            <span className={`h-2 w-2 shrink-0 rounded-full ${salonStatus.isOpen ? 'bg-[#25D366]' : 'bg-red-600'}`} />
            <span>{salonStatus.isOpen ? (language === 'FR' ? 'Ouvert' : 'Geöffnet') : (language === 'FR' ? 'Fermé' : 'Geschlossen')}</span>
            <span className="text-xs font-semibold normal-case tracking-normal">· {salonStatus.detail}</span>
            </div>
          </div>
          <a href="#services" className="hero-scroll absolute bottom-7 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.28em] text-white/50 lg:flex">
            <span className="hero-scroll-line" />Scroll to explore
          </a>
        </section>

        {serviceCategories.length > 0 && (
          <section id="services" className="section-shell" data-scroll-reveal>
            <div className="space-y-12">
              {serviceCategories.map((category) => <ServiceCategory key={category.title} categoryKey={category.key} title={category.title} items={category.items} onBook={handleBooking} bookLabel={t.bookThis} />)}
            </div>
          </section>
        )}

        <section className="section-shell" data-scroll-reveal>
          <div>
            <div className="mb-10">
              <h2 className="section-title">{t.trustTitle}</h2>
            </div>
            <ReviewMarquee language={language} trustQuote={t.trustQuote} trustAuthor={t.trustAuthor} />
          </div>
          <a href="https://www.google.com/maps/place/Luzia%E2%80%99s+Salon/@47.1354627,7.2478184,17z/data=!3m1!4b1!4m6!3m5!1s0x478e1f0c1957553b:0x23deb108fec05d78!8m2!3d47.1354627!4d7.2478184!16s%2Fg%2F11g1y13_h6?entry=ttu&g_ep=EgoyMDI2MTAyNy4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="button-primary mt-7 w-fit" aria-label={language === 'FR' ? 'Donner un avis sur Luzia’s Salon sur Google' : 'Luzia’s Salon auf Google bewerten'}>
            <Star size={17} fill="currentColor" />{t.giveReview}<ArrowUpRight size={16} />
          </a>
        </section>

        <section className="hidden">
          <div className="section-shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="section-title whitespace-pre-line">{t.servicesTitle}</h2>
              <button className="button-ghost mt-9" onClick={() => handleBooking()}>{t.reserve}<ArrowUpRight size={16} /></button>
            </div>
            <div className="space-y-12">
              {serviceCategories.map((category) => <ServiceCategory key={category.title} categoryKey={category.key} title={category.title} items={category.items} onBook={handleBooking} bookLabel={t.bookThis} />)}
            </div>
          </div>
        </section>

        <SalonVisitSection salons={salons} language={language} t={t} />
      </main>

      {bookingOpen && <BookingModal
        language="FR"
        services={isManagedServicesLoaded ? managedServices : Object.values(serviceGroups).flat().map((service) => ({ name: service.name, price: formatServicePrice(service.price) }))}
        draft={bookingDraft}
        onChange={(field, value) => setBookingDraft((current) => ({ ...current, [field]: value }))}
        onClose={() => { setBookingOpen(false); setBookingStatus(null) }}
        onSubmit={submitBooking}
        status={bookingStatus}
        isBooking={isBooking}
        availableSlots={availableSlots}
        isLoadingSlots={isLoadingSlots}
        barbers={managedBarbers}
      />}

      <footer className="site-footer border-t border-zinc-800 bg-zinc-950 px-5 sm:px-8 lg:px-10">
        <section className="mx-auto max-w-[1280px] py-8 text-center sm:py-10" data-scroll-reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-6xl">
            {language === 'FR' ? 'Prêt à passer chez le barbier ?' : 'Bereit für deinen Barber-Besuch?'}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
            {language === 'FR'
              ? 'Réserve ton créneau chez nous, ou consulte la grille tarifaire complète.'
              : 'Buche deinen Termin bei uns oder entdecke unsere komplette Preisliste.'}
          </p>
          <button type="button" onClick={() => handleBooking()} className="button-primary mt-6 inline-flex min-h-12 items-center justify-center gap-3 px-7 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500">
            {language === 'FR' ? 'Réserver ma coupe' : 'Schnitt buchen'}<ArrowUpRight size={17} />
          </button>
          <div className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-zinc-200">
            <a href="#services" className="inline-flex items-center gap-2 transition hover:text-amber-200">{language === 'FR' ? 'Tous les tarifs' : 'Alle Preise'} <ArrowUpRight size={15} /></a>
            <a href="#salons" className="inline-flex items-center gap-2 transition hover:text-amber-200">{language === 'FR' ? 'Adresse et horaires' : 'Adresse und Öffnungszeiten'} <ArrowUpRight size={15} /></a>
          </div>
        </section>
        <div className="border-t border-zinc-800 py-4 sm:py-5">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="#top" className="inline-flex items-center" aria-label="Alep Salon — accueil">
              <BrandLogo style={managedBranding.logo_style} tone="light" className="footer-brand-logo" />
            </a>
            <p className="mt-4 max-w-xs text-xs leading-5 text-zinc-600">{t.footerText}</p>
          </div>
          <div className="mx-auto flex w-full max-w-sm items-center justify-center self-center py-3">
            <div className="flex flex-col items-center">
              <p className="mb-2 text-center text-xs text-zinc-400">Développé par</p>
              <a href="https://just-losung.vercel.app/" target="_blank" rel="noopener noreferrer" aria-label="Visiter la plateforme Just Lösung" className="inline-flex transition-opacity hover:opacity-80">
                <img src="/footer-logo.png" alt="Just Lösung" className="h-auto w-full max-w-[240px] object-contain" />
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3 text-xs text-zinc-500 sm:items-end">
            <div className="flex items-center gap-5 uppercase tracking-[0.16em]"><a href="#top" className="hover:text-zinc-200">{t.legal}</a><a href="#top" className="hover:text-zinc-200">{t.privacy}</a><a href="#top" className="hover:text-zinc-200"><AtSign size={15} /></a></div>
            <span>© {new Date().getFullYear()} Luzia’s Salon · {t.country}</span>
          </div>
        </div>
        </div>
      </footer>
      {installDialogOpen && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-3 sm:top-5 sm:px-5">
          <section className="pwa-install-popup pointer-events-auto relative w-full max-w-lg rounded-xl border-0 bg-black p-4 pr-12 text-white shadow-[0_12px_48px_rgba(0,0,0,0.42)]" role="dialog" aria-modal="false" aria-labelledby="install-dialog-title">
            <button type="button" onClick={() => setInstallDialogOpen(false)} aria-label={language === 'FR' ? 'Fermer' : 'Schließen'} className="absolute right-2 top-2 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"><X size={16} /></button>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-black"><Download size={17} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">Luzia’s Salon · PWA</p>
                <h2 id="install-dialog-title" className="mt-0.5 font-display text-base font-bold uppercase tracking-tight">{language === 'FR' ? 'Sur votre écran d’accueil' : 'Auf deinem Startbildschirm'}</h2>
                <p className="mt-1 text-xs leading-5 text-white/80">{language === 'FR' ? 'Installez Luzia’s Salon pour réserver plus rapidement.' : 'Installiere Luzia’s Salon, um schneller Termine zu buchen.'}</p>
              </div>
            </div>
            <div className="mt-3 pl-12">
              <button type="button" className="button-primary !min-h-12 w-full justify-center !border-0 !bg-white px-3 py-3 text-xs !font-black !text-black hover:!bg-zinc-200" onClick={() => void handleInstall()}>
                <Download size={17} />{t.install}
              </button>
              {installHelpMessage && <p role="status" className="mt-3 text-xs leading-5 text-white/80">{installHelpMessage}</p>}
            </div>
          </section>
        </div>
      )}
      {introVisible && (
        <div className="site-intro fixed inset-0 z-[200] flex items-center justify-center bg-black" aria-hidden="true">
          <div className="flex flex-col items-center gap-5">
            <div className="site-intro-logo">
              <BrandLogo style={managedBranding.logo_style} tone="light" />
            </div>
            <p className="site-intro-welcome font-display text-sm font-semibold uppercase tracking-[0.48em] text-amber-200 sm:text-base">WELCOME</p>
          </div>
        </div>
      )}
      <PwaBottomNav language={language} onReserve={() => handleBooking()} />
      {!new URLSearchParams(window.location.search).has('phonePreview') && <WhatsAppContacts language={language} />}
    </div>
  )
}

function WhatsAppContacts({ language }) {
  const [showButton, setShowButton] = useState(false)
  const phone = '41794545861'
  const message = language === 'FR'
    ? 'Bonjour, je souhaite prendre rendez-vous chez Alep Salon.'
    : 'Hallo, ich möchte einen Termin bei Alep Salon buchen.'

  useEffect(() => {
    const hero = document.querySelector('.hero-stage')
    if (!hero) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      setShowButton(!entry.isIntersecting)
    }, { threshold: 0 })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  if (!showButton) return null

  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer"
      aria-label={language === 'FR' ? 'Contacter Alep Salon sur WhatsApp' : 'Alep Salon auf WhatsApp kontaktieren'}
      className="whatsapp-floating-button group fixed right-4 top-1/2 z-[70] flex -translate-y-1/2 flex-col items-center text-white no-underline sm:right-6"
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-110">
        <img src="/whatsapp-icon-transparent.png" alt="" className="h-full w-full object-contain" />
      </span>
    </a>
  )
}

function LanguageSwitch({ language, setLanguage }) {
  return (
    <div className="flex items-center gap-1 text-[10px] font-bold tracking-[0.2em]">
      <button className={language === 'FR' ? 'language-active' : 'language-inactive'} onClick={() => setLanguage('FR')} aria-pressed={language === 'FR'} aria-label="Français">FR</button>
      <span className="text-zinc-700">/</span>
      <button className={language === 'DE' ? 'language-active' : 'language-inactive'} onClick={() => setLanguage('DE')} aria-pressed={language === 'DE'} aria-label="Deutsch">DE</button>
    </div>
  )
}

function BookingModal({ language, services, draft, onChange, onClose, onSubmit, status, isBooking, availableSlots, isLoadingSlots, barbers }) {
  const isGerman = false
  const availableDates = [...new Set(availableSlots.map((slot) => slot.appointment_date))]
  const timeSlots = availableSlots.filter((slot) => slot.appointment_date === draft.appointmentDate)
  const salonBarbers = barbers.filter((barber) => barber.salon_id === draft.salonId)
  const swissToday = getSwissDateTime()
  const currentMonth = new Date(Number(swissToday.year), Number(swissToday.month) - 1, 1)
  const lastAllowedMonth = new Date(Number(swissToday.year), Number(swissToday.month), 1)
  const [calendarMonth, setCalendarMonth] = useState(currentMonth)
  const monthIndex = (date) => date.getFullYear() * 12 + date.getMonth()
  const canGoPrevious = monthIndex(calendarMonth) > monthIndex(currentMonth)
  const canGoNext = monthIndex(calendarMonth) < monthIndex(lastAllowedMonth)
  const monthStartOffset = (calendarMonth.getDay() + 6) % 7
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const calendarCells = [...Array(monthStartOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  while (calendarCells.length % 7) calendarCells.push(null)
  const formatCalendarDate = (day) => `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const monthLabel = new Intl.DateTimeFormat(isGerman ? 'de-CH' : 'fr-CH', { month: 'long', year: 'numeric' }).format(calendarMonth)
  const weekdayLabels = isGerman ? ['M', 'D', 'M', 'D', 'F', 'S', 'S'] : ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-sm sm:px-6" role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <div className="mx-auto my-4 w-full max-w-xl border border-white bg-zinc-950 shadow-2xl shadow-black/80">
        <div className="flex items-start justify-between border-b border-white/40 p-5 sm:p-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">{isGerman ? 'Online-Buchung' : 'Réservation en ligne'}</p>
            <h2 id="booking-title" className="mt-2 font-display text-3xl font-bold uppercase tracking-tight">{isGerman ? 'Dein Termin.' : 'Votre rendez-vous.'}</h2>
            <p className="mt-2 text-sm text-zinc-500">{isGerman ? 'In weniger als einer Minute.' : 'En moins d’une minute.'}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center border border-white text-zinc-200 transition hover:bg-white hover:text-black" aria-label="Fermer"><X size={18} /></button>
        </div>
        {status?.type === 'success' ? <div role="status" aria-live="polite" className="p-7 text-center sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><Check size={30} strokeWidth={3} /></span>
          <h3 className="mt-5 font-display text-2xl font-bold uppercase text-white sm:text-3xl">{isGerman ? 'Termin bestätigt!' : 'Réservation confirmée !'}</h3>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-300">{isGerman ? 'Dein Termin wurde erfolgreich reserviert. Bis bald!' : 'Votre rendez-vous est bien réservé. À bientôt !'}</p>
          <button type="button" onClick={onClose} className="button-primary mt-7 min-w-40">{isGerman ? 'Fermer' : 'Fermer'}</button>
        </div> : <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-7">
          {status?.type === 'error' && <p role="alert" aria-live="assertive" className="rounded-md border border-red-400 bg-red-950 px-4 py-3 text-sm font-semibold leading-6 text-white shadow-lg">{status.text}</p>}
          <BookingField label={isGerman ? 'Vor- und Nachname' : 'Prénom et nom'} value={draft.clientName} onChange={(value) => onChange('clientName', value)} placeholder={isGerman ? 'Max Muster' : 'Jean Dupont'} autoComplete="name" />
          <BookingField label={isGerman ? 'Telefon / WhatsApp' : 'Téléphone / WhatsApp'} type="tel" value={draft.clientPhone || '+41 '} onChange={(value) => onChange('clientPhone', normalizeSwissPhone(value))} placeholder="+41 79 123 45 67" autoComplete="tel" />
          <BookingSelect label="Prestation" value={draft.serviceName} onChange={(value) => onChange('serviceName', value)} placeholder="Choisir une prestation" options={services.map((service) => ({ value: service.name, label: `${service.name} - ${formatBookingPrice(service.price)}` }))} />
          <section>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{isGerman ? 'Dein Barber' : 'Votre barbier'}</span>
            {salonBarbers.length === 0
              ? <p className="border border-dashed border-zinc-700 px-4 py-3 text-xs text-zinc-500">{isGerman ? 'Noch kein Barber verfügbar.' : 'Aucun barbier disponible pour ce salon.'}</p>
              : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{salonBarbers.map((barber) => <button type="button" key={barber.id} onClick={() => { onChange('barberId', barber.id); onChange('appointmentDate', ''); onChange('slotId', '') }} className={`overflow-hidden border text-left transition ${draft.barberId === barber.id ? 'border-amber-200 bg-amber-200/10' : 'border-white hover:bg-white/5'}`}>{barber.image_url ? <img src={barber.image_url} alt={`Photo de ${barber.name}`} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-zinc-900 text-sm text-zinc-500">Photo indisponible</div>}<span className="block px-3 py-3 text-sm font-bold text-zinc-100">{barber.name}</span></button>)}</div>}
          </section>
          <section>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{isGerman ? 'Verfügbares Datum' : 'Date disponible'}</span>
            {!draft.barberId ? <p className="border border-dashed border-zinc-700 px-4 py-3 text-xs text-zinc-500">{isGerman ? 'Wähle zuerst einen Barber.' : 'Choisissez d’abord un barbier.'}</p> : <div className="border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between">
                <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} disabled={!canGoPrevious} aria-label={isGerman ? 'Vorheriger Monat' : 'Mois précédent'} className="p-1 text-sky-300 transition hover:text-white disabled:opacity-20"><ChevronLeft size={18} /></button>
                <h3 className="text-base font-bold capitalize text-zinc-100">{monthLabel}</h3>
                <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} disabled={!canGoNext} aria-label={isGerman ? 'Nächster Monat' : 'Mois suivant'} className="p-1 text-sky-300 transition hover:text-white disabled:opacity-20"><ChevronRight size={18} /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayLabels.map((label, index) => <span key={`${label}-${index}`} className="pb-2 text-xs text-zinc-600">{label}</span>)}
                {calendarCells.map((day, index) => {
                  if (!day) return <span key={`empty-${index}`} aria-hidden="true" />
                  const date = formatCalendarDate(day)
                  const isAvailable = availableDates.includes(date)
                  const isSelected = draft.appointmentDate === date
                  return <button type="button" key={date} disabled={!isAvailable || isLoadingSlots} aria-pressed={isSelected} aria-label={new Intl.DateTimeFormat(isGerman ? 'de-CH' : 'fr-CH', { dateStyle: 'full' }).format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day, 12))} onClick={() => { onChange('appointmentDate', date); onChange('slotId', '') }} className={`flex aspect-square items-center justify-center rounded-xl border text-sm transition ${isSelected ? 'border-amber-200 bg-amber-200 font-bold text-zinc-950' : isAvailable ? 'border-emerald-700 text-zinc-100 hover:bg-emerald-950' : 'border-transparent text-zinc-800 opacity-60'}`}>{day}</button>
                })}
              </div>
              {isLoadingSlots && <p role="status" className="mt-3 text-center text-xs text-zinc-500">{isGerman ? 'Verfügbarkeiten werden geladen…' : 'Chargement des disponibilités…'}</p>}
              {!isLoadingSlots && availableDates.length === 0 && <p className="mt-3 text-center text-xs text-zinc-500">{isGerman ? 'Keine Termine in diesem Zeitraum verfügbar.' : 'Aucune date disponible pour ce barbier dans les deux prochains mois.'}</p>}
            </div>}
          </section>
          <section>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{isGerman ? 'Verfügbare Uhrzeit' : 'Heure disponible'}</span>
            {!draft.appointmentDate ? <p className="border border-dashed border-zinc-700 px-4 py-3 text-xs text-zinc-500">{isGerman ? 'Wähle zuerst ein Datum.' : 'Choisissez d’abord une date.'}</p> : timeSlots.length === 0 ? <p className="border border-dashed border-zinc-700 px-4 py-3 text-xs text-zinc-500">{isGerman ? 'An diesem Tag ist kein Termin verfügbar.' : 'Aucun créneau disponible pour cette date.'}</p> : <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{timeSlots.map((slot) => <button type="button" key={slot.id} onClick={() => onChange('slotId', slot.id)} className={`border px-3 py-3 font-mono text-sm transition ${draft.slotId === slot.id ? 'border-amber-200 bg-amber-200 text-zinc-950' : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-amber-200 hover:text-amber-200'}`}>{slot.appointment_time.slice(0, 5)}</button>)}</div>}
          </section>
      <button type="submit" className="button-primary w-full" disabled={isBooking || status?.type === 'success' || !draft.slotId}>{isBooking ? (isGerman ? 'Wird gebucht…' : 'Réservation…') : (isGerman ? 'Termin buchen' : 'Réserver')}</button>
        </form>}
      </div>
    </div>
  )
}

function BookingField({ label, type = 'text', value, onChange, placeholder, autoComplete, min }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">{label}</span><input required type={type} value={value} min={min} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="dashboard-input !border-white focus:!border-white" /></label>
}

function normalizeSwissPhone(value) {
  const number = value.trim()
  if (!number) return '+41 '
  if (number.startsWith('+41')) return number
  if (number.startsWith('0041')) return `+41 ${number.slice(4).trimStart()}`
  if (number.startsWith('41')) return `+41 ${number.slice(2).trimStart()}`
  return `+41 ${number}`
}

function getSwissPhoneNationalDigits(value) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0041')) digits = digits.slice(4)
  else if (digits.startsWith('41')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

function isValidSwissPhone(value) {
  const digits = getSwissPhoneNationalDigits(value)
  return /^[2-9]\d{8}$/.test(digits)
}

function formatSwissPhone(value) {
  return `+41 ${getSwissPhoneNationalDigits(value)}`
}

function BookingSelect({ label, value, onChange, placeholder, options }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">{label}</span><select required value={value} onChange={(event) => onChange(event.target.value)} className="dashboard-input !border-white focus:!border-white"><option value="" disabled>{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

function SalonVisitSection({ salons, language, t }) {
  const visitSalons = salons.filter((salon) => salon.key === 'bienne')

  return (
    <section id="salons" className="mx-3 mb-6 overflow-hidden rounded-3xl bg-[#11100e] px-5 pb-0 pt-20 text-white sm:mx-6 sm:px-8 lg:mx-10 lg:mb-6 lg:px-10 lg:pt-28">
      <div className="mx-auto max-w-[1440px]">
        <h2 className="mb-12 font-display text-4xl font-bold uppercase leading-none tracking-tight text-white sm:text-5xl lg:mb-16 lg:text-7xl">
          {language === 'FR' ? 'Venir au salon' : 'Zum Salon'}
        </h2>
        <div className="space-y-12 lg:space-y-16">
          {visitSalons.map((salon) => {
            const city = language === 'DE' ? salon.cityDe || salon.city : salon.city
            const address = salon.address?.[language] || t.addressPending
            const hours = salon.hours?.[language] || t.hoursPending
            const schedule = salon.schedule?.[language]
            const onlineSchedule = salon.onlineSchedule?.[language]
            const isPlaceholder = /annoncer|folgt/i.test(address)
            const mapQuery = isPlaceholder ? `${city}, Switzerland` : `${address}, Switzerland`
            const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
            const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`

            return (
              <article key={salon.key} className="grid gap-8 border-t border-white/15 pt-8 lg:grid-cols-2 lg:gap-12 lg:pt-10">
                <div className="grid content-start grid-cols-[100px_1fr] gap-x-5 gap-y-9 sm:grid-cols-[140px_1fr] sm:gap-x-8">
                  <p className="pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:text-xs">Adresse</p>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">{address}</h3>
                    <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 font-semibold text-white underline decoration-amber-400 underline-offset-4 transition hover:text-amber-200">
                      {language === 'FR' ? 'Itinéraire' : 'Route anzeigen'} <ArrowUpRight size={16} />
                    </a>
                    {salon.phone && <a href={`tel:${salon.phone.replace(/\s/g, '')}`} className="mt-3 block font-semibold text-white/80 transition hover:text-amber-200">{salon.phone}</a>}
                  </div>
                  <p className="pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white sm:text-xs">{language === 'FR' ? 'Horaires' : 'Öffnungszeiten'}</p>
                  <div>
                    {schedule ? <OpeningHoursTable rows={schedule} /> : <p className="whitespace-pre-line text-base leading-7 text-white/80 sm:text-lg">{hours}</p>}
                    {onlineSchedule && <div className="mt-7"><h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">{language === 'FR' ? 'Service en ligne' : 'Online-Service'}</h4><OpeningHoursTable rows={onlineSchedule} /></div>}
                  </div>
                </div>
                <div className="salon-map min-h-64 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 sm:min-h-80">
                  <iframe
                    title={`${city} ${language === 'FR' ? 'carte' : 'Karte'}`}
                    src={mapUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-64 w-full grayscale-[0.15] sm:h-80"
                  />
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function OpeningHoursTable({ rows }) {
  return (
    <table className="w-full max-w-md border-collapse text-sm text-white/85 sm:text-base">
      <tbody>
        {rows.map(([day, time]) => (
          <tr key={day} className="border-b border-white/10 last:border-0">
            <th scope="row" className="py-1.5 pr-6 text-left font-semibold capitalize text-white">{day}</th>
            <td className="py-1.5 text-right tabular-nums">{time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ReviewMarquee({ language, trustQuote, trustAuthor }) {
  const reviews = [
    [trustQuote, trustAuthor],
    [language === 'FR' ? 'Une équipe chaleureuse et un résultat impeccable à chaque visite.' : 'Ein freundliches Team und jedes Mal ein perfektes Ergebnis.', language === 'FR' ? '— Cliente fidèle' : '— Treue Kundin'],
    [language === 'FR' ? 'Le service est rapide, soigné et le style correspond exactement à mes attentes.' : 'Schneller, präziser Service und genau der Stil, den ich wollte.', language === 'FR' ? '— Client satisfait' : '— Zufriedener Kunde'],
  ]

  return <div className="review-marquee" aria-label={language === 'FR' ? 'Avis clients' : 'Kundenbewertungen'}><div className="review-marquee-track">{[0, 1].map((copy) => <div key={copy} className="review-marquee-group" aria-hidden={copy === 1}>{reviews.map(([quote, author], index) => <article key={`${copy}-${index}`} className="trust-stat-card w-[min(78vw,330px)] shrink-0"><div className="flex items-center gap-1 text-amber-200">{[0, 1, 2, 3, 4].map((star) => <Star key={star} size={15} fill="currentColor" />)}</div><p className="mt-5 text-base font-bold leading-6 text-white">{quote}</p><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white">{author}</p></article>)}</div>)}</div></div>
}

function ServiceCategory({ categoryKey, title, items, onBook, bookLabel }) {
  const haircutImages = ['/service-cut-1.webp', '/service-cut-2.webp', '/service-cut-3.webp']
  const cards = items.flatMap((service, itemIndex) => {
    const fallbackImage = categoryKey === 'beard'
      ? '/service-beard.webp'
      : categoryKey === 'cuts'
        ? haircutImages[itemIndex % haircutImages.length]
        : ''
    const uploadedImages = Array.isArray(service.image_urls) ? service.image_urls.filter(Boolean).slice(0, 3) : []
    const images = uploadedImages.length ? uploadedImages : [service.image_url || fallbackImage].filter(Boolean)
    return (images.length ? images : [null]).map((imageUrl, photoIndex) => ({ ...service, imageUrl, photoIndex }))
  })
  return (
    <section aria-labelledby={`services-category-${title}`}>
      <div className="mb-5 flex items-end gap-4 border-b border-zinc-800 pb-3">
        <h3 id={`services-category-${title}`} className="font-display text-2xl font-black uppercase tracking-tight text-zinc-100">{title}</h3>
      </div>
      <div className="service-marquee" aria-label={`${title} — ${cards.length} prestations`}>
        <div className="service-marquee-track" style={{ '--service-marquee-duration': `${Math.max(22, cards.length * 7)}s` }}>
          {[0, 1].map((copy) => (
            <div key={copy} className="service-marquee-group" aria-hidden={copy === 1}>
              {cards.map(({ name, price, imageUrl, photoIndex }, cardIndex) => (
                <button key={`${copy}-${name}-${cardIndex}`} type="button" tabIndex={copy === 1 ? -1 : undefined} className="group w-[min(76vw,280px)] shrink-0 overflow-hidden border border-zinc-800 bg-zinc-950 text-left transition-colors hover:border-amber-200/60 focus-visible:border-amber-200 sm:w-[280px]" onClick={() => onBook(name)} aria-label={`${bookLabel}: ${name}`}>
                  {imageUrl ? <div className="relative aspect-[1.2] overflow-hidden"><img src={imageUrl} alt={`${name} — photo ${photoIndex + 1}`} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" /><span className="absolute bottom-4 left-4 right-4 font-display text-lg font-bold leading-tight text-white">{name}</span></div> : <div className="flex min-h-28 items-center px-4 pt-4"><span className="font-display text-lg font-bold leading-tight text-white">{name}</span></div>}
                  <div className="flex items-center justify-between gap-3 px-3 py-3">
                    <span className="price-badge">{formatServicePrice(price)}</span>
                    <ArrowUpRight size={16} className="text-zinc-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-200" />
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AdminPortal() {
  const { isLoading, isAdmin, session } = useAuth()

  if (isLoading) return <RouteLoading />
  if (session && isAdmin) return <Navigate to="/admin-dashboard" replace />
  return <>
    <Suspense fallback={<RouteLoading />}><LoginScreen /></Suspense>
    <AdminPwaInstallPopup />
  </>
}

function AdminPwaInstallPopup() {
  const [visible, setVisible] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(() => window.alepInstallPrompt || null)
  const [helpMessage, setHelpMessage] = useState('')

  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
    if (isInstalled) return undefined

    const handleInstallPrompt = () => setInstallPrompt(window.alepInstallPrompt || null)
    const handleAppInstalled = () => {
      window.alepInstallPrompt = null
      setInstallPrompt(null)
      setVisible(false)
    }

    window.addEventListener('alepinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    const timer = window.setTimeout(() => setVisible(true), 5000)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('alepinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) {
      const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const isAndroid = /Android/i.test(navigator.userAgent)
      setHelpMessage(isAppleMobile
        ? 'Sur iPhone ou iPad : ouvrez cette page dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».'
        : isAndroid
          ? 'Sur Android : ouvrez cette page dans Chrome, touchez ⋮, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».'
          : 'Dans Chrome ou Edge, ouvrez le menu ⋮ puis choisissez « Installer Luzia Admin ».')
      return
    }

    try {
      setHelpMessage('')
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice?.outcome === 'accepted') setVisible(false)
    } finally {
      window.alepInstallPrompt = null
      setInstallPrompt(null)
    }
  }

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex justify-center px-3 sm:top-5 sm:px-5">
      <section className="pointer-events-auto relative w-full max-w-lg rounded-xl border border-white/30 bg-zinc-950/95 p-4 pr-12 text-white shadow-[0_12px_48px_rgba(0,0,0,0.42)] backdrop-blur-md" role="dialog" aria-modal="false" aria-labelledby="admin-install-title">
        <button type="button" onClick={() => setVisible(false)} aria-label="Fermer" className="absolute right-2 top-2 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"><X size={16} /></button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-black"><Download size={17} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">Luzia's Salon · Admin</p>
            <h2 id="admin-install-title" className="mt-0.5 font-display text-base font-bold uppercase tracking-tight">Installer Luzia Admin</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-300">Ajoutez l’administration comme application distincte sur votre téléphone.</p>
          </div>
        </div>
        <div className="mt-3 pl-12">
          <button type="button" className="button-primary !border-0 !bg-white !text-black min-h-9 w-full justify-center px-3 py-2 text-xs hover:!bg-zinc-200" onClick={() => void handleInstall()}><Download size={17} />Installer Luzia Admin</button>
          {helpMessage && <p role="status" className="mt-3 text-xs leading-5 text-zinc-300">{helpMessage}</p>}
        </div>
      </section>
    </div>
  )
}

function RequireAdmin({ children }) {
  const { isLoading, isAdmin } = useAuth()

  if (isLoading) return <RouteLoading />
  if (!isAdmin) return <Navigate to="/admin-portal" replace />
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>
}

function RouteLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Vérification de la session…</main>
}

function PwaManifestSwitcher() {
  const { pathname } = useLocation()

  useEffect(() => {
    const isAdminApp = pathname.startsWith('/admin-')
    const manifest = isAdminApp
      ? '/manifest-admin.webmanifest'
      : '/manifest-alep-v2.webmanifest'
    const title = isAdminApp ? "Luzia's Salon — Admin" : "Luzia's Salon — Suisse"
    document.title = title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (!appleTitle) {
      appleTitle = document.createElement('meta')
      appleTitle.name = 'apple-mobile-web-app-title'
      document.head.appendChild(appleTitle)
    }
    appleTitle.content = isAdminApp ? 'Luzia Admin' : "Luzia's Salon"
    let link = document.querySelector('link[rel="manifest"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    if (new URL(link.href || '/', window.location.origin).pathname !== manifest) {
      link.href = manifest
    }
  }, [pathname])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <PwaManifestSwitcher />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicSite />} />
          <Route path="/admin.html" element={<Navigate to="/admin-pwa" replace />} />
          <Route path="/admin-portal" element={<AdminPortal />} />
          <Route path="/admin-pwa" element={<AdminPortal />} />
          <Route path="/admin-dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/fidelite" element={<Suspense fallback={<RouteLoading />}><LoyaltyScreen /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      <AdminIntroOverlay />
    </BrowserRouter>
  )
}

function AdminIntroOverlay() {
  const [visible, setVisible] = useState(() => window.location.pathname.startsWith('/admin-'))
  const logoStyle = useLogoStyle(visible)

  useEffect(() => {
    if (!visible) return undefined
    const timeline = gsap.timeline({ onComplete: () => setVisible(false) })
    timeline
      .fromTo('.admin-intro-logo', { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' })
      .fromTo('.admin-intro-label', { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' }, '+=0.35')
      .to('.admin-intro', { yPercent: -100, duration: 0.8, ease: 'power4.inOut' }, '+=0.2')
    return () => timeline.kill()
  }, [visible])

  if (!visible) return null

  return (
    <div className="admin-intro site-intro fixed inset-0 z-[250] flex items-center justify-center bg-black" aria-hidden="true">
      <div className="flex flex-col items-center gap-5">
        <div className="admin-intro-logo site-intro-logo">
          <BrandLogo style={logoStyle} tone="light" />
        </div>
        <p className="admin-intro-label font-display text-sm font-semibold uppercase tracking-[0.48em] text-amber-200 sm:text-base">ADMIN</p>
      </div>
    </div>
  )
}

export default App
