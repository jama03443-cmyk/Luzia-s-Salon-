import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'

function getCachedLogoStyle() {
  try {
    const cached = JSON.parse(window.localStorage.getItem('alep-site-branding-v1') || 'null')
    return cached?.branding?.logo_style || 'classic'
  } catch {
    return 'classic'
  }
}

export default function useLogoStyle(enabled = true) {
  const [logoStyle, setLogoStyle] = useState(getCachedLogoStyle)

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) return undefined
    let mounted = true

    const refreshLogoStyle = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('logo_style')
          .eq('id', true)
          .maybeSingle()
        if (!mounted || error || !data?.logo_style) return

        setLogoStyle(data.logo_style)
        try {
          const cached = JSON.parse(window.localStorage.getItem('alep-site-branding-v1') || '{}')
          window.localStorage.setItem('alep-site-branding-v1', JSON.stringify({
            ...cached,
            branding: { ...cached.branding, logo_style: data.logo_style },
          }))
        } catch {
          // The logo still updates for this screen if browser storage is unavailable.
        }
      } catch {
        // Keep the cached or default logo when the network is unavailable.
      }
    }

    const refreshOnResume = () => {
      if (document.visibilityState === 'visible') void refreshLogoStyle()
    }

    void refreshLogoStyle()
    const timer = window.setInterval(() => void refreshLogoStyle(), 15_000)
    document.addEventListener('visibilitychange', refreshOnResume)
    window.addEventListener('focus', refreshOnResume)
    window.addEventListener('pageshow', refreshOnResume)

    return () => {
      mounted = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshOnResume)
      window.removeEventListener('focus', refreshOnResume)
      window.removeEventListener('pageshow', refreshOnResume)
    }
  }, [enabled])

  return logoStyle
}
