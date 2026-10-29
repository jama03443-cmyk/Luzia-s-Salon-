import { useEffect, useState } from 'react'
import { CalendarDays, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'

function isStandalonePwa() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

export default function PwaBottomNav({ language = 'FR', onReserve }) {
  const [isMobilePwa, setIsMobilePwa] = useState(() => (
    isStandalonePwa() && window.matchMedia('(max-width: 767px)').matches
  ))
  const isGerman = language === 'DE'
  const whatsappMessage = isGerman
    ? 'Hallo, ich möchte einen Termin bei Alep Salon buchen.'
    : 'Bonjour, je souhaite prendre rendez-vous chez Alep Salon.'
  const whatsappUrl = `https://wa.me/41766124333?text=${encodeURIComponent(whatsappMessage)}`

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const updateMode = () => setIsMobilePwa(isStandalonePwa() && mobileQuery.matches)

    updateMode()
    standaloneQuery.addEventListener?.('change', updateMode)
    mobileQuery.addEventListener?.('change', updateMode)
    window.addEventListener('resize', updateMode)

    return () => {
      standaloneQuery.removeEventListener?.('change', updateMode)
      mobileQuery.removeEventListener?.('change', updateMode)
      window.removeEventListener('resize', updateMode)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('has-mobile-pwa-nav', isMobilePwa)
    return () => document.documentElement.classList.remove('has-mobile-pwa-nav')
  }, [isMobilePwa])

  if (!isMobilePwa) return null

  return <nav className="pwa-bottom-nav" aria-label={isGerman ? 'Schnellnavigation' : 'Navigation rapide'}>
    <Link to="/fidelite" className="pwa-bottom-nav__item pwa-bottom-nav__item--loyalty" aria-label={isGerman ? 'Treueprogramm' : 'Fidélité'}>
      <CreditCard size={21} strokeWidth={1.8} />
      <span>{isGerman ? 'Treue' : 'Fidélité'}</span>
    </Link>
    {onReserve
      ? <button type="button" onClick={onReserve} className="pwa-bottom-nav__reserve"><CalendarDays size={17} /><span>{isGerman ? 'Schnitt buchen' : 'Réserver ma coupe'}</span></button>
      : <Link to="/?openBooking=1" className="pwa-bottom-nav__reserve"><CalendarDays size={17} /><span>{isGerman ? 'Schnitt buchen' : 'Réserver ma coupe'}</span></Link>}
    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="pwa-bottom-nav__item pwa-bottom-nav__item--whatsapp" aria-label="WhatsApp Alep Salon">
      <img src="/whatsapp-icon-transparent.png" alt="" />
    </a>
  </nav>
}
