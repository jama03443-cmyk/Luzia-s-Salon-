export function formatSalonPrice(price) {
  const amount = String(price ?? '').replace(/\s*CHF\s*/gi, '').trim()
  if (!amount) return ''
  const normalized = amount.replace(/[.,][–-]$/, '').replace(',', '.')
  return /\d+[.]\d{1,2}$/.test(normalized) ? normalized : `${normalized}.-`
}
