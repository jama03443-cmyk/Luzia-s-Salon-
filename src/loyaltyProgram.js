export const DEFAULT_LOYALTY_PROGRAM = {
  loyalty_visits_for_reward: 10,
  loyalty_reward_title: 'Votre {visits}e coupe offerte',
  loyalty_reward_description: 'À chaque visite avec une coupe, vos points sont ajoutés directement dans l’application mobile Alep Salon. Suivez votre progression sur votre téléphone, sans carte papier à garder : après {points} points, votre {visits}e coupe est offerte.',
  loyalty_birthday_title: 'Cadeau d’anniversaire',
  loyalty_birthday_description: 'Pendant le mois de votre anniversaire, nous vous offrons une coupe. Une fois par an, si votre date de naissance est enregistrée chez nous.',
  loyalty_referral_title: 'Inviter des amis',
  loyalty_referral_description: 'Partagez votre lien personnel. Quand une nouvelle personne vient chez Alep et reçoit son premier point, vous recevez un point bonus sur votre carte numérique.',
  loyalty_review_title: 'Avis Google',
  loyalty_review_description: 'Pour votre avis Google sincère, vous recevez une seule fois un point bonus sur votre carte numérique.',
}

export const LOYALTY_PROGRAM_CARDS = [
  { id: 'reward', titleKey: 'loyalty_reward_title', descriptionKey: 'loyalty_reward_description', icon: 'scissors' },
  { id: 'birthday', titleKey: 'loyalty_birthday_title', descriptionKey: 'loyalty_birthday_description', icon: 'gift' },
  { id: 'referral', titleKey: 'loyalty_referral_title', descriptionKey: 'loyalty_referral_description', icon: 'friends' },
  { id: 'review', titleKey: 'loyalty_review_title', descriptionKey: 'loyalty_review_description', icon: 'star' },
]

export function getLoyaltyProgramSteps(data = {}) {
  if (Array.isArray(data.loyalty_steps)) {
    return data.loyalty_steps.map((step, index) => ({
      id: String(step.id ?? `step-${index + 1}`),
      title: normalizeLegacyStepTitle(String(step.id ?? `step-${index + 1}`), String(step.title ?? '')),
      description: normalizeLegacyStepDescription(String(step.id ?? `step-${index + 1}`), String(step.description ?? '')),
      icon: String(step.icon ?? 'sparkles'),
    }))
  }

  return LOYALTY_PROGRAM_CARDS.map(({ id, titleKey, descriptionKey, icon }) => ({
    id,
    title: normalizeLegacyStepTitle(id, data[titleKey] ?? DEFAULT_LOYALTY_PROGRAM[titleKey]),
    description: normalizeLegacyStepDescription(id, data[descriptionKey] ?? DEFAULT_LOYALTY_PROGRAM[descriptionKey]),
    icon,
  }))
}

const legacyStampWord = /\b(?:tampon(?:s)?|stempel|stamps?)\b/i

function normalizeLegacyStepTitle(id, title) {
  if (!legacyStampWord.test(title)) return title
  if (id === 'reward') return 'Vos points dans l’application Alep Salon'
  if (id === 'referral') return 'Inviter des amis et gagner des points'
  if (id === 'review') return 'Votre avis récompensé'
  return 'Suivez vos points dans l’application Alep Salon'
}

function normalizeLegacyStepDescription(id, description) {
  if (!legacyStampWord.test(description)) return description
  if (id === 'reward') return DEFAULT_LOYALTY_PROGRAM.loyalty_reward_description
  if (id === 'referral') return DEFAULT_LOYALTY_PROGRAM.loyalty_referral_description
  if (id === 'review') return DEFAULT_LOYALTY_PROGRAM.loyalty_review_description
  return 'Vos points sont ajoutés directement dans l’application mobile Alep Salon. Suivez votre progression sur votre téléphone, sans carte papier.'
}

const OLD_REWARD_DESCRIPTIONS = [
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque {stamps} tampons sont réunis, la coupe suivante est offerte.',
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque 9 tampons sont réunis, la coupe suivante est offerte.',
  'Cumulez vos points directement dans l’application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
  'Cumulez vos points avec l’application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
  'Cumulez vos points avec votre application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
]

export function getLoyaltyProgramSettings(data = {}) {
  const settings = { ...DEFAULT_LOYALTY_PROGRAM, ...data }
  if (OLD_REWARD_DESCRIPTIONS.includes(data.loyalty_reward_description)) {
    settings.loyalty_reward_description = DEFAULT_LOYALTY_PROGRAM.loyalty_reward_description
  }
  return settings
}
