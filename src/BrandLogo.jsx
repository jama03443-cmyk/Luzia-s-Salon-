export default function BrandLogo({ style = 'classic', tone = 'dark', className = '' }) {
  const isLight = tone === 'light'
  const mark = isLight ? '/luzias-mark-white.svg' : '/luzias-mark.svg'
  const primaryText = isLight ? 'text-white' : 'text-zinc-950'
  const secondaryText = isLight ? 'text-white/70' : 'text-zinc-600'

  if (style === 'symbol') {
    return <img src={mark} alt="Luzia's Salon" className={`h-12 w-12 object-contain ${className}`} />
  }

  if (style === 'horizontal' || style === 'monogram') {
    return <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Luzia's Salon">
      <img src={mark} alt="" className={style === 'monogram' ? 'h-11 w-11 object-contain' : 'h-10 w-10 object-contain'} />
      <span className="flex flex-col font-display uppercase leading-none">
        <span className={`${style === 'monogram' ? 'text-sm' : 'text-base'} font-black tracking-[0.12em] ${primaryText}`}>Luzia's</span>
        <span className={`mt-1 text-[9px] font-semibold tracking-[0.3em] ${secondaryText}`}>Salon</span>
      </span>
    </span>
  }

  if (style === 'wordmark') {
    return <span className={`brand-logo-wordmark inline-flex flex-col items-center font-display leading-none ${className}`} aria-label="Luzia's Salon">
      <span className={`text-xl font-black tracking-[0.12em] sm:text-2xl ${primaryText}`}>LUZIA'S</span>
      <span className="mt-1 border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.3em]" style={{ borderColor: 'var(--site-button-color, #fff)', color: 'var(--site-button-color, #fff)' }}>SALON</span>
    </span>
  }

  const logoSource = isLight ? '/luzias-logo-white.svg' : '/luzias-logo.svg'
  return <img src={logoSource} alt="Luzia's Salon" className={`h-14 w-auto max-w-[190px] object-contain ${className}`} />
}
