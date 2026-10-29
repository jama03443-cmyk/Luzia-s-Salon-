export const BODY_COLOR_OPTIONS = [
  { value: '#000000', label: 'Noir', color: '#000000' },
  { value: '#fffdf7', label: 'Ivoire', color: '#fffdf7' },
  { value: '#f3eee5', label: 'Sable', color: '#f3eee5' },
  { value: '#eaf0e8', label: 'Sauge', color: '#eaf0e8' },
  { value: '#f1e9ed', label: 'Rose clair', color: '#f1e9ed' },
  { value: '#e6f7f7', label: 'Turquoise clair', color: '#e6f7f7' },
  { value: '#14b8a6', label: 'Turquoise', color: '#14b8a6' },
  { value: '#7dd3fc', label: 'Bleu ciel', color: '#7dd3fc' },
  { value: '#fbe9e7', label: 'Rouge suisse clair', color: '#fbe9e7' },
  { value: '#0f8b8d', label: 'Bleu turquoise', color: '#0f8b8d' },
  { value: '#da291c', label: 'Rouge suisse', color: '#da291c' },
]

export const FOOTER_COLOR_OPTIONS = [
  { value: '#000000', label: 'Noir profond', color: '#000000' },
  { value: '#171614', label: 'Noir', color: '#171614' },
  { value: '#252c34', label: 'Ardoise', color: '#252c34' },
  { value: '#24543c', label: 'Vert', color: '#24543c' },
  { value: '#0f8b8d', label: 'Bleu turquoise', color: '#0f8b8d' },
  { value: '#14b8a6', label: 'Turquoise', color: '#14b8a6' },
  { value: '#7dd3fc', label: 'Bleu ciel', color: '#7dd3fc' },
  { value: '#da291c', label: 'Rouge suisse', color: '#da291c' },
  { value: '#fffdf7', label: 'Ivoire', color: '#fffdf7' },
  { value: '#f3eee5', label: 'Sable', color: '#f3eee5' },
]

export const BUTTON_COLOR_OPTIONS = [
  { value: '#ffffff', label: 'Blanc', color: '#ffffff' },
  { value: '#d9ad3b', label: 'Or', color: '#d9ad3b' },
  { value: '#2d6a4f', label: 'Vert', color: '#2d6a4f' },
  { value: '#8e2c3c', label: 'Bordeaux', color: '#8e2c3c' },
  { value: '#345995', label: 'Bleu', color: '#345995' },
  { value: '#0f8b8d', label: 'Bleu turquoise', color: '#0f8b8d' },
  { value: '#14b8a6', label: 'Turquoise', color: '#14b8a6' },
  { value: '#7dd3fc', label: 'Bleu ciel', color: '#7dd3fc' },
  { value: '#da291c', label: 'Rouge suisse', color: '#da291c' },
]

export const LOGO_STYLE_OPTIONS = [
  { value: 'classic', label: 'Illustré' },
  { value: 'wordmark', label: 'Typographique' },
  { value: 'monogram', label: 'Monogramme' },
  { value: 'symbol', label: 'Symbole Z' },
  { value: 'horizontal', label: 'Horizontal' },
]

export function getButtonTextColor(hexColor) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor ?? '')
  if (!match) return '#201a0b'

  const channels = match.slice(1).map((value) => parseInt(value, 16) / 255)
  const luminance = channels
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)

  return luminance > 0.48 ? '#201a0b' : '#ffffff'
}

export function getContrastTextColor(hexColor) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor ?? '')
  if (!match) return '#201d17'

  const channels = match.slice(1).map((value) => parseInt(value, 16) / 255)
  const luminance = channels
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)

  return luminance > 0.179 ? '#000000' : '#ffffff'
}
