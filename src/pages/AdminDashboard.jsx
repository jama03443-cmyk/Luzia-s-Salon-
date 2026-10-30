import { Children, cloneElement, Fragment, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CalendarDays,
  Check,
  ImageUp,
  History,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../auth/useAuth'
import { BARBER_ASSETS_BUCKET, SERVICE_ASSETS_BUCKET, supabase } from '../supabaseClient'
import { BODY_COLOR_OPTIONS, BUTTON_COLOR_OPTIONS, FOOTER_COLOR_OPTIONS, LOGO_STYLE_OPTIONS } from '../siteBranding'
import { DEFAULT_LOYALTY_PROGRAM, getLoyaltyProgramSettings, getLoyaltyProgramSteps } from '../loyaltyProgram'
import BrandLogo from '../BrandLogo'
import { formatSalonPrice } from '../formatSalonPrice'

const salonNames = {
  bienne: 'Bienne',
  neuchatel: 'Neuchâtel',
  berne: 'Berne',
}

const defaultServiceCategories = ['Coupes', 'Barbe', 'Soins']
const suggestedTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']

const adminGermanCopy = {
  'langue': 'Sprache', 'chargement des reservations…': 'Buchungen werden geladen…', 'aucune reservation pour le moment.': 'Zurzeit gibt es keine Buchungen.',
  'client': 'Kunde', 'clients': 'Kunden', 'code membre': 'Mitgliedscode', 'points': 'Punkte', 'derniere activite': 'Letzte Aktivität', 'actions': 'Aktionen',
  'validation de visite': 'Besuch bestätigen', 'arreter la camera': 'Kamera stoppen', 'code qr ou nom du client': 'QR-Code oder Name des Kunden',
  'scanner un qr code': 'QR-Code scannen',
  'scannez ou collez le code': 'Code scannen oder einfügen', 'trouver': 'Suchen', 'client fidelite': 'Treueprogramm-Kunde', 'non disponible': 'Nicht verfügbar',
  'points actuels': 'Aktuelle Punkte', 'valider la visite · +1 point': 'Besuch bestätigen · +1 Punkt', 'chargement des cartes…': 'Karten werden geladen…',
  'aucune carte trouvee.': 'Keine Karte gefunden.', 'e-mail non disponible': 'E-Mail nicht verfügbar', 'historique client': 'Kundenverlauf',
  'remettre a zero': 'Punkte zurücksetzen', 'chargement de l’historique…': 'Verlauf wird geladen…', 'aucun point enregistre pour ce client.': 'Für diesen Kunden sind keine Punkte gespeichert.',
  'ajoutez les creneaux que les clients peuvent reserver. une fois reserve, un creneau disparait automatiquement de leur calendrier.': 'Fügen Sie buchbare Zeitfenster hinzu. Sobald ein Termin gebucht ist, wird er automatisch aus dem Kalender entfernt.',
  'nouveau creneau': 'Neuer Termin', 'salon': 'Salon', 'date': 'Datum', 'heure': 'Uhrzeit', 'statut': 'Status', 'action': 'Aktion',
  'chargement…': 'Wird geladen…', 'aucun creneau configure.': 'Keine Zeitfenster eingerichtet.', 'reserve': 'Gebucht', 'disponible': 'Verfügbar', 'ferme': 'Geschlossen', 'retirer': 'Entfernen',
  'prestations': 'Dienstleistungen', 'ajouter une prestation': 'Dienstleistung hinzufügen', 'categorie': 'Kategorie', 'nom de la prestation': 'Name der Dienstleistung',
  'ex. coupe enfant': 'z. B. Kinderhaarschnitt', 'prix affiche': 'Angezeigter Preis', 'ajouter la prestation': 'Dienstleistung hinzufügen',
  'galerie des services': 'Galerie der Dienstleistungen', 'gerer les photos': 'Fotos verwalten',
  'ajoutez une photo a chaque service. elle apparaitra sur la page services du site client. jpg, png ou webp · 5 mo maximum.': 'Fügen Sie jeder Dienstleistung ein Foto hinzu. Es erscheint auf der Services-Seite der Kundenwebsite. JPG, PNG oder WebP · maximal 5 MB.',
  'aucune photo': 'Kein Foto', 'titre de la photo (facultatif)': 'Fototitel (optional)', 'ex. coupe degradee': 'z. B. Fade-Haarschnitt',
  'televersement…': 'Wird hochgeladen…', 'remplacer': 'Ersetzen', 'ajouter une photo': 'Foto hinzufügen', 'supprimer': 'Löschen',
  'enregistrement…': 'Wird gespeichert…', 'enregistrer le titre': 'Titel speichern', 'suppression…': 'Wird gelöscht…', 'supprimer la prestation': 'Dienstleistung löschen',
  'aucun service a gerer pour le moment.': 'Zurzeit gibt es keine Dienstleistungen zu verwalten.', 'visuel du site': 'Website-Bild', 'photo hero section': 'Hero-Bild',
  'cette image apparait en arriere-plan du hero. vous pouvez la remplacer a tout moment.': 'Dieses Bild erscheint im Hintergrund des Hero-Bereichs. Sie können es jederzeit ersetzen.',
  'nouvelle photo - jpg, png ou webp - 5 mo max': 'Neues Foto – JPG, PNG oder WebP – max. 5 MB', 'televerser et remplacer la photo hero': 'Hero-Foto hochladen und ersetzen',
  'apparence du site client': 'Darstellung der Kundenwebsite', 'couleurs et logo': 'Farben und Logo',
  'choisissez separement le fond du site client, la couleur du footer, les boutons et le style du logo.': 'Wählen Sie Hintergrund, Footer-Farbe, Schaltflächen und Logostil der Kundenwebsite separat aus.',
  'couleur du fond du site': 'Hintergrundfarbe der Website', 'couleur du footer': 'Footer-Farbe', 'couleur des boutons': 'Schaltflächenfarbe', 'style du logo': 'Logostil',
  'enregistrer le design': 'Design speichern', 'programme de fidelite': 'Treueprogramm', 'comment ca marche': 'So funktioniert es',
  'le seuil et les textes ci-dessous seront affiches sur la page fidelite des clients. utilisez {visits} pour afficher le nombre de coupes et {points} pour les points necessaires avant la recompense.': 'Der Schwellenwert und die folgenden Texte erscheinen auf der Treueprogramm-Seite. Verwenden Sie {visits} für die Anzahl der Haarschnitte und {points} für die noch fehlenden Punkte bis zur Prämie.',
  'nombre de coupes avant la recompense': 'Anzahl Haarschnitte bis zur Prämie', 'le nombre est enregistre automatiquement quand vous quittez le champ.': 'Die Zahl wird automatisch gespeichert, sobald Sie das Feld verlassen.',
  'titre': 'Titel', 'explication': 'Erklärung', 'ajouter une etape': 'Schritt hinzufügen', 'enregistrer le programme de fidelite': 'Treueprogramm speichern', 'actualiser les donnees': 'Daten aktualisieren',
  'l’equipe': 'Team', 'ajouter un barbier': 'Barbier hinzufügen', 'nom': 'Name', 'photo': 'Foto', 'planning': 'Planung', 'configurer les creneaux': 'Zeitfenster konfigurieren',
  'choisir le barbier': 'Barbier auswählen',
  'retirer le barbier selectionne': 'Ausgewählten Barbier entfernen', 'heures disponibles': 'Verfügbare Zeiten', 'ajout…': 'Wird hinzugefügt…',
  'ouvrir ce creneau': 'Dieses Zeitfenster öffnen', 'creneaux de cette date': 'Zeitfenster für dieses Datum', 'choisissez un barbier.': 'Wählen Sie einen Barbier aus.',
  'vert : disponible. jaune : reserve. cliquez sur un creneau vert pour le retirer.': 'Grün: verfügbar. Gelb: gebucht. Klicken Sie auf ein grünes Zeitfenster, um es zu entfernen.',
  'tableau des disponibilites par barbier': 'Verfügbarkeitsübersicht nach Barbier', 'chaque colonne est un barbier. un meme horaire peut etre ouvert et reserve pour chaque barbier : a 10:00, trois barbiers peuvent donc recevoir trois clients.': 'Jede Spalte steht für einen Barbier. Derselbe Zeitpunkt kann für jeden Barbier verfügbar sein: Um 10:00 Uhr können also drei Barbier drei Kunden empfangen.',
  'ajoutez des barbiers pour afficher le planning.': 'Fügen Sie Barbier hinzu, um den Plan anzuzeigen.', 'vert : disponible. jaune : reserve. cliquez sur une case pour selectionner ce barbier et modifier ses creneaux.': 'Grün: verfügbar. Gelb: gebucht. Klicken Sie auf ein Feld, um den Barbier auszuwählen und seine Zeitfenster zu ändern.',
  'barbiers actifs': 'Aktive Barbier', 'ajoutez un barbier pour commencer.': 'Fügen Sie einen Barbier hinzu, um zu beginnen.', 'planning par barbier': 'Planung nach Barbier', 'creneaux par barbier': 'Zeitfenster nach Barbier',
  'cliquez sur une case vide : elle devient verte et disponible. cliquez sur une case verte : elle est fermee. une case jaune est deja reservee. chaque barbier possede ses propres creneaux, donc trois barbiers peuvent recevoir trois clients a la meme heure.': 'Klicken Sie auf ein leeres Feld: Es wird grün und verfügbar. Klicken Sie auf ein grünes Feld: Es wird geschlossen. Ein gelbes Feld ist bereits gebucht. Jeder Barbier hat eigene Zeitfenster; so können drei Barbier zur gleichen Zeit drei Kunden empfangen.',
  'barbier': 'Barbier', 'telephone': 'Telefon', 'prestation': 'Dienstleistung', 'prix': 'Preis', 'confirme': 'Bestätigt', 'annule': 'Storniert', 'en attente': 'Ausstehend',
  'rendez-vous': 'Termin', 'supprimer le rendez-vous': 'Termin löschen', 'mois precedent': 'Vorheriger Monat', 'mois suivant': 'Nächster Monat', 'horaires': 'Öffnungszeiten',
  'aucune carte ne correspond a ce code ou ce nom.': 'Keine Karte stimmt mit diesem Code oder Namen überein.', 'carte trouvee.': 'Karte gefunden.',
  '1 point ajoute au client.': 'Dem Kunden wurde 1 Punkt hinzugefügt.', 'la visite ne peut pas etre validee.': 'Der Besuch konnte nicht bestätigt werden.',
  'le nombre de coupes avant la recompense doit etre compris entre 2 et 100.': 'Die Anzahl der Haarschnitte bis zur Prämie muss zwischen 2 und 100 liegen.',
  'seuil fidelite enregistre :': 'Treue-Schwellenwert gespeichert:',
  'coupes': 'Haarschnitte', 'barbe': 'Bart', 'soins': 'Pflege', 'ouvert': 'Offen', 'ouverts': 'Offen',
  'rendez-vous a venir': 'bevorstehende Termine', 'visite': 'Besuch',
  'supprimer cette etape': 'Diesen Schritt löschen', 'supprimer le rendez-vous de': 'Termin löschen für', 'historique client de': 'Kundenverlauf von', 'remettre a zero le compteur de': 'Punktestand zurücksetzen für',
  'les donnees ne peuvent pas etre chargees. verifiez les droits administrateur rls.': 'Die Daten konnten nicht geladen werden. Bitte prüfen Sie die RLS-Adminrechte.',
  'le scanner qr n’est pas pris en charge par ce navigateur. utilisez la saisie manuelle du code.': 'Der QR-Code-Scanner wird von diesem Browser nicht unterstützt. Bitte geben Sie den Code manuell ein.',
  'impossible d’acceder a la camera. autorisez la camera ou saisissez le code manuellement.': 'Kein Zugriff auf die Kamera. Erlauben Sie den Zugriff oder geben Sie den Code manuell ein.',
  'la modification des points a echoue.': 'Die Punkte konnten nicht geändert werden.', 'l’historique de ce client ne peut pas etre charge.': 'Der Verlauf dieses Kunden konnte nicht geladen werden.',
  'le compteur de points n’a pas pu etre remis a zero.': 'Der Punktestand konnte nicht zurückgesetzt werden.', 'le rendez-vous n’a pas pu etre supprime.': 'Der Termin konnte nicht gelöscht werden.',
  'le rendez-vous a ete supprime et son creneau libere.': 'Der Termin wurde gelöscht und das Zeitfenster freigegeben.', 'impossible d’ajouter cette prestation.': 'Diese Dienstleistung konnte nicht hinzugefügt werden.',
  'la prestation a ete ajoutee.': 'Die Dienstleistung wurde hinzugefügt.', 'impossible d’enregistrer le titre de la photo.': 'Der Fototitel konnte nicht gespeichert werden.',
  'choisissez une image jpg, png ou webp de 5 mo maximum.': 'Wählen Sie ein JPG-, PNG- oder WebP-Bild mit maximal 5 MB aus.',
  'impossible de televerser cette image. verifiez la migration des images de services.': 'Das Bild konnte nicht hochgeladen werden. Bitte prüfen Sie die Migration der Dienstleistungsbilder.',
  'l’image a ete televersee, mais le service n’a pas pu etre mis a jour.': 'Das Bild wurde hochgeladen, aber die Dienstleistung konnte nicht aktualisiert werden.',
  'impossible de retirer cette image.': 'Dieses Bild konnte nicht entfernt werden.', 'choisissez un barbier et au moins une heure.': 'Wählen Sie einen Barbier und mindestens eine Uhrzeit aus.',
  'un ou plusieurs creneaux existent deja ou ne peuvent pas etre ajoutes.': 'Ein oder mehrere Zeitfenster existieren bereits oder konnten nicht hinzugefügt werden.',
  'creneaux ajoutes. les clients peuvent maintenant les reserver.': 'Zeitfenster hinzugefügt. Kunden können jetzt buchen.',
  'ajoutez le nom et une photo du barbier.': 'Geben Sie den Namen des Barbiers ein und fügen Sie ein Foto hinzu.',
  'utilisez une image jpg, png ou webp de 5 mo maximum.': 'Verwenden Sie ein JPG-, PNG- oder WebP-Bild mit maximal 5 MB.',
  'le televersement de la photo a echoue.': 'Das Foto konnte nicht hochgeladen werden.', 'le barbier ne peut pas etre ajoute.': 'Der Barbier konnte nicht hinzugefügt werden.',
  'barbier ajoute. vous pouvez maintenant ouvrir ses creneaux.': 'Barbier hinzugefügt. Sie können jetzt seine Zeitfenster öffnen.',
  'ce creneau ne peut pas etre retire.': 'Dieses Zeitfenster konnte nicht entfernt werden.', 'creneau retire des disponibilites.': 'Zeitfenster aus den Verfügbarkeiten entfernt.',
  'un creneau reserve ne peut pas etre modifie.': 'Ein gebuchtes Zeitfenster kann nicht geändert werden.',
  'le creneau ne peut pas etre modifie. actualisez puis reessayez.': 'Das Zeitfenster konnte nicht geändert werden. Aktualisieren Sie die Seite und versuchen Sie es erneut.',
  'creneau ferme.': 'Zeitfenster geschlossen.', 'creneau disponible.': 'Zeitfenster verfügbar.', 'le barbier ne peut pas etre retire.': 'Der Barbier konnte nicht entfernt werden.',
  'barbier retire. ses anciens rendez-vous sont conserves.': 'Barbier entfernt. Frühere Termine bleiben erhalten.', 'selectionnez un fichier image valide.': 'Wählen Sie eine gültige Bilddatei aus.',
  'l’image ne doit pas depasser 5 mo.': 'Das Bild darf maximal 5 MB groß sein.', 'le televersement de l’image a echoue.': 'Das Bild konnte nicht hochgeladen werden.',
  'la photo a ete televersee, mais le hero n’a pas ete mis a jour. executez hero-image-migration.sql.': 'Das Foto wurde hochgeladen, aber der Hero-Bereich konnte nicht aktualisiert werden. Führen Sie hero-image-migration.sql aus.',
  'la photo du hero a ete mise a jour.': 'Das Hero-Foto wurde aktualisiert.', 'le seuil n’a pas ete enregistre. verifiez loyalty-program-settings-migration.sql et les droits admin supabase.': 'Der Schwellenwert wurde nicht gespeichert. Prüfen Sie loyalty-program-settings-migration.sql und die Supabase-Adminrechte.',
  'erreur reseau : le seuil de fidelite n’a pas pu etre enregistre.': 'Netzwerkfehler: Der Treue-Schwellenwert konnte nicht gespeichert werden.',
  'impossible d’enregistrer les reglages. verifiez que hero-image-migration.sql, loyalty-program-settings-migration.sql et loyalty-steps-migration.sql ont ete executes dans supabase.': 'Einstellungen konnten nicht gespeichert werden. Prüfen Sie, ob die Migrationen hero-image-migration.sql, loyalty-program-settings-migration.sql und loyalty-steps-migration.sql in Supabase ausgeführt wurden.',
  'les reglages et le programme de fidelite ont ete enregistres.': 'Einstellungen und Treueprogramm wurden gespeichert.', 'la deconnexion a echoue. reessayez.': 'Abmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.',
  'bienne': 'Biel', 'neuchatel': 'Neuenburg', 'berne': 'Bern', 'ivoire': 'Elfenbein', 'sable': 'Sand', 'sauge': 'Salbei', 'rose clair': 'Hellrosa',
  'turquoise clair': 'Helltürkis', 'rouge suisse clair': 'Helles Schweizer Rot', 'bleu turquoise': 'Türkis', 'rouge suisse': 'Schweizer Rot',
  'noir': 'Schwarz', 'ardoise': 'Schiefer', 'vert': 'Grün', 'or': 'Gold', 'bordeaux': 'Bordeauxrot', 'bleu': 'Blau', 'illustré': 'Illustriert',
  'typographique': 'Typografisch', 'monogramme': 'Monogramm', 'nouvelle étape': 'Neuer Schritt',
}

function normalizeAdminCopy(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '’').toLowerCase().trim()
}

function translateAdminValue(value, language) {
  if (language !== 'DE' || typeof value !== 'string') return value
  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  const normalized = normalizeAdminCopy(value)
  if (adminGermanCopy[normalized]) return `${leading}${adminGermanCopy[normalized]}${trailing}`
  const pointUpdate = value.match(/^([+-]?\d+) point(?:s)? appliqu[eé]\.$/i)
  if (pointUpdate) return `${pointUpdate[1]} Punkt${Math.abs(Number(pointUpdate[1])) === 1 ? '' : 'e'} hinzugefügt.`
  const resetHistory = value.match(/^Historique de (.+)$/)
  if (resetHistory) return `Verlauf von ${resetHistory[1]}`
  const stepLabel = value.match(/^Supprimer l’(?:e|é)tape (\d+)$/i)
  if (stepLabel) return `Schritt ${stepLabel[1]} löschen`
  const resetLabel = value.match(/^Remettre à zéro le compteur de (.+)$/i)
  if (resetLabel) return `Punktestand von ${resetLabel[1]} zurücksetzen`
  const historyLabel = value.match(/^Historique client de (.+)$/i)
  if (historyLabel) return `Kundenverlauf von ${historyLabel[1]}`
  const deleteAppointmentLabel = value.match(/^Supprimer le rendez-vous de (.+)$/i)
  if (deleteAppointmentLabel) return `Termin von ${deleteAppointmentLabel[1]} löschen`
  const appointmentCount = value.match(/^(\d+)\s+rendez-vous$/i)
  if (appointmentCount) return `${appointmentCount[1]} ${Number(appointmentCount[1]) === 1 ? 'Termin' : 'Termine'}`
  const namedReset = value.match(/^Le compteur de (.+) est à zéro\. Son historique est conservé\.$/i)
  if (namedReset) return `Der Punktestand von ${namedReset[1]} wurde zurückgesetzt. Der Verlauf bleibt erhalten.`
  const deleteService = value.match(/^Supprimer la prestation «\s*(.+?)\s*» \? Cette action est définitive\.$/i)
  if (deleteService) return `Dienstleistung « ${deleteService[1]} » löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.`
  const namedService = value.match(/^Impossible de supprimer «\s*(.+?)\s*»\.$/i)
  if (namedService) return `Dienstleistung « ${namedService[1]} » konnte nicht gelöscht werden.`
  const savedTitle = value.match(/^Titre enregistré pour «\s*(.+?)\s*»\.$/i)
  if (savedTitle) return `Titel für « ${savedTitle[1]} » gespeichert.`
  const imageUpdated = value.match(/^Image mise à jour pour «\s*(.+?)\s*»\.$/i)
  if (imageUpdated) return `Bild für « ${imageUpdated[1]} » aktualisiert.`
  const imageRemoved = value.match(/^Image retirée pour «\s*(.+?)\s*»\.$/i)
  if (imageRemoved) return `Bild für « ${imageRemoved[1]} » entfernt.`
  return value
}

function AdminGermanContent({ children, language }) {
  return Children.map(children, (child) => {
    if (typeof child === 'string') return translateAdminValue(child, language)
    if (!isValidElement(child)) return child
    const props = { ...child.props }
    for (const attribute of ['placeholder', 'title', 'aria-label', 'label']) {
      if (typeof props[attribute] === 'string') props[attribute] = translateAdminValue(props[attribute], language)
    }
    if (props.children !== undefined) props.children = <AdminGermanContent language={language}>{props.children}</AdminGermanContent>
    return cloneElement(child, props)
  })
}

function formatDate(date, language = 'FR') {
  if (!date) return '—'
  const parsedDate = new Date(date.includes('T') ? date : `${date}T12:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return '—'
  return new Intl.DateTimeFormat(language === 'DE' ? 'de-CH' : 'fr-CH', { dateStyle: 'medium' }).format(
    parsedDate,
  )
}

function getReservationBarber(reservation) {
  const slot = Array.isArray(reservation.availability_slots)
    ? reservation.availability_slots[0]
    : reservation.availability_slots
  const barber = Array.isArray(slot?.barbers) ? slot.barbers[0] : slot?.barbers
  return barber ?? null
}

function getStorageObjectPath(publicUrl, bucket) {
  if (!publicUrl) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const markerIndex = publicUrl.indexOf(marker)
  if (markerIndex < 0) return null
  try {
    return decodeURIComponent(publicUrl.slice(markerIndex + marker.length).split('?')[0])
  } catch {
    return null
  }
}

function getServiceImages(service) {
  const images = Array.isArray(service.image_urls) ? service.image_urls.filter(Boolean).slice(0, 3) : []
  return images.length ? images : service.image_url ? [service.image_url] : []
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()
  const [language, setLanguage] = useState(() => window.localStorage.getItem('alep-admin-language') === 'DE' ? 'DE' : 'FR')
  const [activeTab, setActiveTab] = useState('reservations')
  const [reservations, setReservations] = useState([])
  const [services, setServices] = useState([])
  const [serviceCategories, setServiceCategories] = useState(defaultServiceCategories)
  const [loyaltyCards, setLoyaltyCards] = useState([])
  const [availabilitySlots, setAvailabilitySlots] = useState([])
  const [barbers, setBarbers] = useState([])
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [siteBodyColor, setSiteBodyColor] = useState(BODY_COLOR_OPTIONS[0].value)
  const [siteFooterColor, setSiteFooterColor] = useState(FOOTER_COLOR_OPTIONS[0].value)
  const [siteButtonColor, setSiteButtonColor] = useState(BUTTON_COLOR_OPTIONS[0].value)
  const [siteLogoStyle, setSiteLogoStyle] = useState('classic')
  const [loyaltyProgram, setLoyaltyProgram] = useState(DEFAULT_LOYALTY_PROGRAM)
  const [isRewardThresholdDirty, setIsRewardThresholdDirty] = useState(false)
  const [loyaltySteps, setLoyaltySteps] = useState(() => getLoyaltyProgramSteps(DEFAULT_LOYALTY_PROGRAM))
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingService, setIsSavingService] = useState(false)
  const [serviceImageUploadId, setServiceImageUploadId] = useState(null)
  const [serviceImageTitleDrafts, setServiceImageTitleDrafts] = useState({})
  const [serviceImageTitleSavingId, setServiceImageTitleSavingId] = useState(null)
  const [serviceDeleteId, setServiceDeleteId] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingBranding, setIsSavingBranding] = useState(false)
  const [isSavingRewardThreshold, setIsSavingRewardThreshold] = useState(false)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)
  const [isSavingBarber, setIsSavingBarber] = useState(false)
  const [isClearingReservations, setIsClearingReservations] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [newService, setNewService] = useState({ category: 'Coupes', name: '', price: '' })
  const [isRenamingServiceCategory, setIsRenamingServiceCategory] = useState(false)
  const [serviceCategoryNameDraft, setServiceCategoryNameDraft] = useState('')
  const [isSavingServiceCategory, setIsSavingServiceCategory] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [availabilityDraft, setAvailabilityDraft] = useState({ salonId: 'bienne', appointmentDate: new Date().toISOString().slice(0, 10) })
  const [barberDraft, setBarberDraft] = useState({ salonId: 'bienne', name: '' })
  const [barberFile, setBarberFile] = useState(null)
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [selectedSlotTimes, setSelectedSlotTimes] = useState([])
  const [loyaltySearch, setLoyaltySearch] = useState('')
  const [selectedLoyaltyCard, setSelectedLoyaltyCard] = useState(null)
  const [historyCardId, setHistoryCardId] = useState(null)
  const [loyaltyHistory, setLoyaltyHistory] = useState([])
  const [isLoadingLoyaltyHistory, setIsLoadingLoyaltyHistory] = useState(false)
  const [deletingReservationId, setDeletingReservationId] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannerMessage, setScannerMessage] = useState('')
  const videoRef = useRef(null)
  const loyaltyLiveChannelRef = useRef(null)
  const labels = language === 'DE'
    ? { admin: 'Administration', logout: 'Abmelden', private: 'Interne Verwaltung', dashboard: 'Dashboard', reservations: 'Buchungen', loyalty: 'Treueprogramm', availability: 'Verfügbarkeiten', management: 'Verwaltung', reservationsTitle: 'Kundenbuchungen', loyaltyTitle: 'Treuekarten', availabilityTitle: 'Verfügbarkeiten', clearReservations: 'Buchungen leeren', clearReservationsConfirm: 'Alle Buchungen löschen und reservierte Zeitfenster wieder freigeben? Treuekarten und Kundenprofile bleiben unverändert.', clearReservationsDone: 'Alle Buchungen wurden gelöscht; reservierte Zeitfenster sind wieder frei.' }
    : { admin: 'Espace administration', logout: 'Déconnexion', private: 'Gestion privée', dashboard: 'Tableau de bord', reservations: 'Réservations', loyalty: 'Fidélité', availability: 'Disponibilités', management: 'Gestion', reservationsTitle: 'Réservations clients', loyaltyTitle: 'Cartes de fidélité', availabilityTitle: 'Disponibilités', clearReservations: 'Vider les réservations', clearReservationsConfirm: 'Supprimer toutes les réservations et libérer les créneaux réservés ? Les cartes de fidélité et les profils clients resteront inchangés.', clearReservationsDone: 'Toutes les réservations ont été supprimées et les créneaux réservés ont été libérés.' }

  useEffect(() => {
    if (feedback?.type !== 'success') return undefined

    const timeoutId = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage)
    window.localStorage.setItem('alep-admin-language', nextLanguage)
  }

  const refreshLoyaltyCards = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('loyalty_cards')
      .select('id, member_code, points, downloaded_at, updated_at, profiles(full_name, first_name, last_name, email, phone, whatsapp, role)')
      .order('updated_at', { ascending: false })
    if (error) return
    const cards = (data ?? []).filter((card) => card.profiles?.role !== 'admin')
    setLoyaltyCards(cards)
    setSelectedLoyaltyCard((selected) => selected ? cards.find((card) => card.id === selected.id) ?? selected : null)
  }, [])

  const refreshReception = useCallback(async () => {
    if (!supabase) return
    const [reservationsResult, slotsResult] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, client_name, client_phone, service_name, appointment_date, appointment_time, status, confirmed_at, created_at, availability_slot_id, availability_slots(barber_id, barbers(id, name, image_url))')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true }),
      supabase
        .from('availability_slots')
        .select('id, salon_id, barber_id, appointment_date, appointment_time, is_active, reserved_at')
        .order('appointment_date')
        .order('appointment_time'),
    ])
    if (!reservationsResult.error) setReservations(reservationsResult.data ?? [])
    if (!slotsResult.error) setAvailabilitySlots(slotsResult.data ?? [])
  }, [])

  const loadDashboard = useCallback(async ({ clearFeedback = false } = {}) => {
    if (!supabase) return
    setIsLoading(true)
    if (clearFeedback) setFeedback(null)

    const [reservationsResult, servicesResult, loyaltyResult, availabilityResult, barbersResult, heroSettingsResult, categoriesResult] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, client_name, client_phone, service_name, appointment_date, appointment_time, status, confirmed_at, created_at, availability_slot_id, availability_slots(barber_id, barbers(id, name, image_url))')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true }),
      supabase.from('services').select('id, category, name, price, image_url, image_urls, image_title').order('category').order('name'),
      supabase
        .from('loyalty_cards')
        .select('id, member_code, points, downloaded_at, updated_at, profiles(full_name, first_name, last_name, email, phone, whatsapp, role)')
        .order('updated_at', { ascending: false }),
      supabase
        .from('availability_slots')
        .select('id, salon_id, barber_id, appointment_date, appointment_time, is_active, reserved_at')
        .order('appointment_date')
        .order('appointment_time'),
      supabase.from('barbers').select('id, salon_id, name, image_url, is_active').order('name'),
      supabase.from('site_settings').select('hero_image_url, body_color, footer_color, button_color, logo_style, loyalty_visits_for_reward, loyalty_reward_title, loyalty_reward_description, loyalty_birthday_title, loyalty_birthday_description, loyalty_referral_title, loyalty_referral_description, loyalty_review_title, loyalty_review_description, loyalty_steps').eq('id', true).maybeSingle(),
      supabase.from('service_categories').select('name').order('sort_order').order('name'),
    ])

    const failedQuery = [
      ['réservations/créneaux', reservationsResult],
      ['prestations', servicesResult],
      ['cartes fidélité', loyaltyResult],
      ['disponibilités', availabilityResult],
      ['barbiers', barbersResult],
      ['catégories de prestations', categoriesResult],
    ].find(([, result]) => result.error)
    if (failedQuery) {
      const [queryName, result] = failedQuery
      setFeedback({ type: 'error', text: `Chargement impossible (${queryName}) : ${result.error.message}` })
    } else {
      setReservations(reservationsResult.data ?? [])
      setServices(servicesResult.data ?? [])
      setLoyaltyCards((loyaltyResult.data ?? []).filter((card) => card.profiles?.role !== 'admin'))
      setAvailabilitySlots(availabilityResult.data ?? [])
      setBarbers(barbersResult.data ?? [])
      const nextCategories = (categoriesResult.data ?? []).map((category) => category.name)
      setServiceCategories(nextCategories)
      setNewService((current) => ({ ...current, category: nextCategories.includes(current.category) ? current.category : (nextCategories[0] ?? '') }))
      if (!heroSettingsResult.error) {
        setHeroImageUrl(heroSettingsResult.data?.hero_image_url ?? '')
        setSiteBodyColor(heroSettingsResult.data?.body_color ?? BODY_COLOR_OPTIONS[0].value)
        setSiteFooterColor(heroSettingsResult.data?.footer_color ?? FOOTER_COLOR_OPTIONS[0].value)
        setSiteButtonColor(heroSettingsResult.data?.button_color ?? BUTTON_COLOR_OPTIONS[0].value)
        setSiteLogoStyle(heroSettingsResult.data?.logo_style ?? 'classic')
        setLoyaltyProgram(getLoyaltyProgramSettings(heroSettingsResult.data))
        setIsRewardThresholdDirty(false)
        setLoyaltySteps(getLoyaltyProgramSteps(heroSettingsResult.data))
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  useEffect(() => {
    if (!supabase) return undefined
    const refresh = () => { void refreshLoyaltyCards() }
    const channel = supabase.channel('admin-loyalty-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyalty_cards' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyalty_point_events' }, refresh)
      .subscribe()
    loyaltyLiveChannelRef.current = channel
    const timer = window.setInterval(refresh, 4000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      loyaltyLiveChannelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [refreshLoyaltyCards])

  useEffect(() => {
    if (!supabase) return undefined
    const refresh = () => { void refreshReception() }
    const channel = supabase.channel('admin-reception-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_slots' }, refresh)
      .subscribe()
    const timer = window.setInterval(refresh, 3000)
    const onFocus = () => refresh()
    const onVisibilityChange = () => { if (!document.hidden) refresh() }
    const onPageShow = () => refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void supabase.removeChannel(channel)
    }
  }, [refreshReception])

  useEffect(() => {
    if (!isScanning) return undefined
    let stream
    let timer
    let isActive = true

    const startScanner = async () => {
      if (!('BarcodeDetector' in window)) {
        setScannerMessage('Le scanner QR n’est pas pris en charge par ce navigateur. Utilisez la saisie manuelle du code.')
        setIsScanning(false)
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (!isActive || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        timer = window.setInterval(async () => {
          if (!videoRef.current || !isActive) return
          const codes = await detector.detect(videoRef.current)
          const scannedCode = codes[0]?.rawValue?.replace('ALEP-LOYALTY:', '').trim()
          if (!scannedCode) return
          const card = loyaltyCards.find((item) => item.member_code === scannedCode)
          setSelectedLoyaltyCard(card ?? null)
          setLoyaltySearch(scannedCode)
          setScannerMessage(card ? 'Carte trouvée.' : 'Aucune carte ne correspond à ce QR code.')
          setIsScanning(false)
        }, 700)
      } catch {
        setScannerMessage('Impossible d’accéder à la caméra. Autorisez la caméra ou saisissez le code manuellement.')
        setIsScanning(false)
      }
    }

    void startScanner()
    return () => {
      isActive = false
      if (timer) window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [isScanning, loyaltyCards])

  const upcomingReservationCount = useMemo(() => {
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const today = `${dateParts.find((part) => part.type === 'year')?.value}-${dateParts.find((part) => part.type === 'month')?.value}-${dateParts.find((part) => part.type === 'day')?.value}`
    return reservations.filter((reservation) => reservation.status !== 'cancelled' && reservation.appointment_date >= today).length
  }, [reservations])

  const reservationGroups = useMemo(() => {
    const groups = new Map()
    reservations.forEach((reservation) => {
      const barber = getReservationBarber(reservation)
      const key = barber?.id ?? 'unassigned'
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: barber?.name ?? 'Barbier non attribué',
          imageUrl: barber?.image_url ?? null,
          reservations: [],
        })
      }
      groups.get(key).reservations.push(reservation)
    })
    return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'fr-CH'))
  }, [reservations])

  const pricesByService = useMemo(
    () => new Map(services.map((service) => [service.name, service.price])),
    [services],
  )

  const filteredLoyaltyCards = useMemo(() => {
    const term = loyaltySearch.trim().toLowerCase()
    if (!term) return loyaltyCards
    return loyaltyCards.filter((card) =>
      card.member_code.toLowerCase().includes(term)
      || card.profiles?.full_name?.toLowerCase().includes(term)
      || card.profiles?.email?.toLowerCase().includes(term)
      || card.profiles?.phone?.toLowerCase().includes(term),
    )
  }, [loyaltyCards, loyaltySearch])

  const selectLoyaltyCard = () => {
    const match = loyaltyCards.find((card) => card.member_code === loyaltySearch.trim())
      || loyaltyCards.find((card) => card.profiles?.full_name?.toLowerCase() === loyaltySearch.trim().toLowerCase())
      || loyaltyCards.find((card) => card.profiles?.phone === loyaltySearch.trim())
    setSelectedLoyaltyCard(match ?? null)
    setScannerMessage(match ? 'Carte trouvée.' : 'Aucune carte ne correspond à ce code ou ce nom.')
  }

  const validateVisit = async (cardId) => {
    if (!supabase) return
    setFeedback(null)
    let soundContext
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        soundContext = new AudioContextClass()
        if (soundContext.state === 'suspended') void soundContext.resume().catch(() => {})
      }
    } catch {
      soundContext = null
    }

    const { error } = await supabase.rpc('adjust_loyalty_points', {
      target_card_id: cardId,
      point_delta: 1,
    })
    if (error) setFeedback({ type: 'error', text: 'La visite ne peut pas être validée.' })
    else {
      if (soundContext) {
        if (soundContext.state === 'suspended') await soundContext.resume().catch(() => {})
        const master = soundContext.createGain()
        master.gain.setValueAtTime(0.0001, soundContext.currentTime)
        master.gain.exponentialRampToValueAtTime(0.65, soundContext.currentTime + 0.025)
        master.gain.exponentialRampToValueAtTime(0.0001, soundContext.currentTime + 1.05)
        master.connect(soundContext.destination)

        ;[784, 988, 1175, 1568].forEach((frequency, index) => {
          const start = soundContext.currentTime + index * 0.12
          const oscillator = soundContext.createOscillator()
          const noteGain = soundContext.createGain()
          oscillator.type = index === 3 ? 'sine' : 'triangle'
          oscillator.frequency.setValueAtTime(frequency, start)
          noteGain.gain.setValueAtTime(0.0001, start)
          noteGain.gain.exponentialRampToValueAtTime(0.8, start + 0.018)
          noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38)
          oscillator.connect(noteGain)
          noteGain.connect(master)
          oscillator.start(start)
          oscillator.stop(start + 0.4)
        })

        window.setTimeout(() => { void soundContext.close().catch(() => {}) }, 1300)
      }
      setFeedback({ type: 'success', text: '1 point ajouté au client.' })
      await refreshLoyaltyCards()
      await loyaltyLiveChannelRef.current?.send({
        type: 'broadcast',
        event: 'loyalty-points-updated',
        payload: { cardId },
      })
    }
  }

  const refreshLoyaltyHistory = async (cardId) => {
    if (historyCardId !== cardId) return
    const { data, error } = await supabase
      .from('loyalty_point_events')
      .select('id, point_delta, created_at')
      .eq('loyalty_card_id', cardId)
      .order('created_at', { ascending: false })
    if (!error) setLoyaltyHistory(data ?? [])
  }

  const adjustPoints = async (cardId, delta) => {
    if (!supabase) return
    const { error } = await supabase.rpc('adjust_loyalty_points', {
      target_card_id: cardId,
      point_delta: delta,
    })
    if (error) setFeedback({ type: 'error', text: 'La modification des points a échoué.' })
    else {
      setFeedback({ type: 'success', text: `${delta > 0 ? '+' : ''}${delta} point appliqué.` })
      await refreshLoyaltyCards()
      await refreshLoyaltyHistory(cardId)
      await loyaltyLiveChannelRef.current?.send({
        type: 'broadcast',
        event: 'loyalty-points-updated',
        payload: { cardId },
      })
    }
  }

  const toggleLoyaltyHistory = async (card) => {
    if (historyCardId === card.id) {
      setHistoryCardId(null)
      setLoyaltyHistory([])
      return
    }
    setHistoryCardId(card.id)
    setIsLoadingLoyaltyHistory(true)
    setLoyaltyHistory([])
    const { data, error } = await supabase
      .from('loyalty_point_events')
      .select('id, point_delta, created_at')
      .eq('loyalty_card_id', card.id)
      .order('created_at', { ascending: false })
    setIsLoadingLoyaltyHistory(false)
    if (error) {
      setFeedback({ type: 'error', text: 'L’historique de ce client ne peut pas être chargé.' })
      return
    }
    setLoyaltyHistory(data ?? [])
  }

  const resetLoyaltyPoints = async (card) => {
    if (!supabase || card.points <= 0) return
    const clientName = card.profiles?.full_name || card.profiles?.email || 'ce client'
    const confirmation = language === 'DE'
      ? `Punktestand von ${clientName} auf null setzen? Der Verlauf bleibt erhalten.`
      : `Remettre le compteur de ${clientName} à zéro ? Son historique sera conservé.`
    if (!window.confirm(confirmation)) return

    setFeedback(null)
    const { error } = await supabase.rpc('adjust_loyalty_points', {
      target_card_id: card.id,
      point_delta: -card.points,
    })
    if (error) {
      setFeedback({ type: 'error', text: 'Le compteur de points n’a pas pu être remis à zéro.' })
      return
    }
    setFeedback({ type: 'success', text: `Le compteur de ${clientName} est à zéro. Son historique est conservé.` })
    await refreshLoyaltyCards()
      await refreshLoyaltyHistory(card.id)
    await loyaltyLiveChannelRef.current?.send({
      type: 'broadcast',
      event: 'loyalty-points-updated',
      payload: { cardId: card.id },
    })
  }

  const deleteReservation = async (reservation) => {
    if (!supabase || deletingReservationId) return
    const confirmation = language === 'DE'
      ? `Den Termin von ${reservation.client_name} am ${formatDate(reservation.appointment_date, language)} löschen?`
      : `Supprimer le rendez-vous de ${reservation.client_name} du ${formatDate(reservation.appointment_date, language)} ?`
    if (!window.confirm(confirmation)) return

    setDeletingReservationId(reservation.id)
    const { data, error } = await supabase.rpc('delete_client_reservation', {
      target_reservation_id: reservation.id,
    })
    if (error || !data) {
      setFeedback({ type: 'error', text: error?.message || 'Le rendez-vous n’a pas pu être supprimé.' })
    } else {
      setReservations((current) => current.filter((item) => item.id !== reservation.id))
      if (reservation.availability_slot_id) {
        setAvailabilitySlots((current) => current.map((slot) => slot.id === reservation.availability_slot_id ? { ...slot, reserved_at: null } : slot))
      }
      setFeedback({ type: 'success', text: 'Le rendez-vous a été supprimé et son créneau libéré.' })
    }
    setDeletingReservationId(null)
  }

  const handleAddService = async (event) => {
    event.preventDefault()
    if (!supabase || !newService.category || !newService.name.trim() || !newService.price.trim()) return

    setIsSavingService(true)
    setFeedback(null)
    const { error } = await supabase.from('services').insert({
      category: newService.category,
      name: newService.name.trim(),
      price: newService.price.trim(),
    })

    if (error) {
      setFeedback({ type: 'error', text: 'Impossible d’ajouter cette prestation.' })
    } else {
      setNewService({ category: serviceCategories[0] ?? '', name: '', price: '' })
      setFeedback({ type: 'success', text: 'La prestation a été ajoutée.' })
      await loadDashboard()
    }
    setIsSavingService(false)
  }

  const handleRenameServiceCategory = async () => {
    const oldName = newService.category
    const newName = serviceCategoryNameDraft.trim().replace(/\s+/g, ' ')
    if (!supabase || !oldName || !newName || isSavingServiceCategory) return
    if (newName === oldName) {
      setIsRenamingServiceCategory(false)
      return
    }
    if (serviceCategories.some((category) => category.toLocaleLowerCase('fr-CH') === newName.toLocaleLowerCase('fr-CH'))) {
      setFeedback({ type: 'error', text: 'Cette catégorie existe déjà.' })
      return
    }
    setIsSavingServiceCategory(true)
    setFeedback(null)
    const { error } = await supabase.from('service_categories').update({ name: newName }).eq('name', oldName)
    if (error) {
      setFeedback({ type: 'error', text: `Impossible de renommer cette catégorie : ${error.message}` })
    } else {
      setNewService((current) => ({ ...current, category: newName }))
      setIsRenamingServiceCategory(false)
      setFeedback({ type: 'success', text: `Catégorie « ${oldName} » renommée en « ${newName} ».` })
      await loadDashboard()
    }
    setIsSavingServiceCategory(false)
  }

  const handleDeleteService = async (service) => {
    if (!supabase || serviceDeleteId) return
    const confirmed = window.confirm(`Supprimer la prestation « ${service.name} » ? Cette action est définitive.`)
    if (!confirmed) return

    setServiceDeleteId(service.id)
    setFeedback(null)
    const { error } = await supabase.from('services').delete().eq('id', service.id)
    if (error) {
      setFeedback({ type: 'error', text: `Impossible de supprimer « ${service.name} ».` })
      setServiceDeleteId(null)
      return
    }

    const imagePaths = getServiceImages(service)
      .map((url) => getStorageObjectPath(url, SERVICE_ASSETS_BUCKET))
      .filter((path) => path?.startsWith(`services/${service.id}/`))
    let imageCleanupFailed = false
    if (imagePaths.length) {
      const { error: cleanupError } = await supabase.storage.from(SERVICE_ASSETS_BUCKET).remove(imagePaths)
      imageCleanupFailed = Boolean(cleanupError)
    }
    setServiceImageTitleDrafts((drafts) => {
      const nextDrafts = { ...drafts }
      delete nextDrafts[service.id]
      return nextDrafts
    })
    setFeedback({
      type: 'success',
      text: imageCleanupFailed
        ? `La prestation « ${service.name} » a été supprimée. Son fichier photo reste dans le stockage.`
        : `La prestation « ${service.name} » a été supprimée.`,
    })
    setServiceDeleteId(null)
    await loadDashboard()
  }

  const handleSaveServiceImageTitle = async (service) => {
    if (!supabase || serviceImageTitleSavingId) return
    setServiceImageTitleSavingId(service.id)
    setFeedback(null)
    const title = serviceImageTitleDrafts[service.id]?.trim() ?? service.image_title ?? ''
    const { error } = await supabase.from('services').update({ image_title: title || null }).eq('id', service.id)
    if (error) {
      setFeedback({ type: 'error', text: 'Impossible d’enregistrer le titre de la photo.' })
    } else {
      setFeedback({ type: 'success', text: `Titre enregistré pour « ${service.name} ».` })
      await loadDashboard()
    }
    setServiceImageTitleSavingId(null)
  }

  const handleServiceImageUpload = async (event, service) => {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (!supabase || files.length === 0) return
    const currentImages = getServiceImages(service)
    if (currentImages.length + files.length > 3) {
      setFeedback({ type: 'error', text: `Une prestation peut avoir au maximum 3 photos. Il reste ${3 - currentImages.length} emplacement${3 - currentImages.length === 1 ? '' : 's'}.` })
      return
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setFeedback({ type: 'error', text: 'Chaque photo doit être au format JPG, PNG ou WebP et faire 5 Mo maximum.' })
      return
    }

    setServiceImageUploadId(service.id)
    setFeedback(null)
    const uploadedPaths = []
    const uploadedUrls = []
    let uploadFailure = null
    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `services/${service.id}/${globalThis.crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage
        .from(SERVICE_ASSETS_BUCKET)
        .upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
      if (error) {
        uploadFailure = error
        break
      }
      uploadedPaths.push(path)
      uploadedUrls.push(supabase.storage.from(SERVICE_ASSETS_BUCKET).getPublicUrl(path).data.publicUrl)
    }

    if (uploadFailure) {
      if (uploadedPaths.length) await supabase.storage.from(SERVICE_ASSETS_BUCKET).remove(uploadedPaths)
      setFeedback({ type: 'error', text: `Impossible de téléverser les photos : ${uploadFailure.message}. Vérifiez la migration des images et les droits admin.` })
      setServiceImageUploadId(null)
      return
    }

    const nextImages = [...currentImages, ...uploadedUrls]
    const imageTitle = serviceImageTitleDrafts[service.id]?.trim() ?? service.image_title ?? ''
    const { error: updateError } = await supabase
      .from('services')
      .update({ image_urls: nextImages, image_url: nextImages[0] ?? null, image_title: imageTitle || null })
      .eq('id', service.id)

    if (updateError) {
      await supabase.storage.from(SERVICE_ASSETS_BUCKET).remove(uploadedPaths)
      setFeedback({ type: 'error', text: `Les photos ont été téléversées, mais le service n’a pas pu être mis à jour : ${updateError.message}` })
      setServiceImageUploadId(null)
      return
    }

    setFeedback({ type: 'success', text: `${files.length} photo${files.length > 1 ? 's' : ''} ajoutée${files.length > 1 ? 's' : ''} à « ${service.name} » (${nextImages.length}/3).` })
    setServiceImageUploadId(null)
    await loadDashboard()
  }

  const handleRemoveServiceImage = async (service, imageIndex) => {
    const currentImages = getServiceImages(service)
    const removedUrl = currentImages[imageIndex]
    if (!supabase || !removedUrl) return
    const nextImages = currentImages.filter((_, index) => index !== imageIndex)
    setServiceImageUploadId(service.id)
    setFeedback(null)
    const { error } = await supabase.from('services').update({ image_urls: nextImages, image_url: nextImages[0] ?? null, image_title: nextImages.length ? service.image_title : null }).eq('id', service.id)
    if (error) {
      setFeedback({ type: 'error', text: `Impossible de retirer cette photo : ${error.message}` })
      setServiceImageUploadId(null)
      return
    }
    const path = getStorageObjectPath(removedUrl, SERVICE_ASSETS_BUCKET)
    if (path?.startsWith(`services/${service.id}/`)) {
      await supabase.storage.from(SERVICE_ASSETS_BUCKET).remove([path])
    }
    if (nextImages.length === 0) setServiceImageTitleDrafts((drafts) => ({ ...drafts, [service.id]: '' }))
    setFeedback({ type: 'success', text: `Photo retirée de « ${service.name} ».` })
    setServiceImageUploadId(null)
    await loadDashboard()
  }

  const handleAddAvailability = async (event) => {
    event.preventDefault()
    if (!supabase || !selectedBarberId || selectedSlotTimes.length === 0) {
      setFeedback({ type: 'error', text: 'Choisissez un barbier et au moins une heure.' })
      return
    }
    setIsSavingAvailability(true)
    setFeedback(null)
    const { error } = await supabase.from('availability_slots').insert(selectedSlotTimes.map((appointmentTime) => ({
      salon_id: availabilityDraft.salonId,
      barber_id: selectedBarberId,
      appointment_date: availabilityDraft.appointmentDate,
      appointment_time: appointmentTime,
    })))
    setIsSavingAvailability(false)
    if (error) {
      setFeedback({ type: 'error', text: 'Un ou plusieurs créneaux existent déjà ou ne peuvent pas être ajoutés.' })
      return
    }
    setSelectedSlotTimes([])
    setFeedback({ type: 'success', text: 'Créneaux ajoutés. Les clients peuvent maintenant les réserver.' })
    await loadDashboard()
  }

  const toggleSuggestedTime = (time) => {
    setSelectedSlotTimes((times) => times.includes(time) ? times.filter((item) => item !== time) : [...times, time])
  }

  const handleAddBarber = async (event) => {
    event.preventDefault()
    if (!supabase || !barberDraft.name.trim() || !barberFile) {
      setFeedback({ type: 'error', text: 'Ajoutez le nom et une photo du barbier.' })
      return
    }
    if (!barberFile.type.startsWith('image/') || barberFile.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Utilisez une image JPG, PNG ou WebP de 5 Mo maximum.' })
      return
    }
    setIsSavingBarber(true)
    setFeedback(null)
    const extension = barberFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = barberDraft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'barbier'
    const path = `barbers/${barberDraft.salonId}/${globalThis.crypto?.randomUUID?.() ?? Date.now()}-${safeName}.${extension}`
    const { error: uploadError } = await supabase.storage.from(BARBER_ASSETS_BUCKET).upload(path, barberFile, { cacheControl: '31536000', contentType: barberFile.type, upsert: false })
    if (uploadError) {
      setIsSavingBarber(false)
      setFeedback({ type: 'error', text: 'Le téléversement de la photo a échoué.' })
      return
    }
    const { data: publicUrlData } = supabase.storage.from(BARBER_ASSETS_BUCKET).getPublicUrl(path)
    const { data: barber, error } = await supabase.from('barbers').insert({ salon_id: barberDraft.salonId, name: barberDraft.name.trim(), image_url: publicUrlData.publicUrl }).select('id').single()
    setIsSavingBarber(false)
    if (error) {
      await supabase.storage.from(BARBER_ASSETS_BUCKET).remove([path])
      setFeedback({ type: 'error', text: 'Le barbier ne peut pas être ajouté.' })
      return
    }
    setBarberDraft((draft) => ({ ...draft, name: '' }))
    setBarberFile(null)
    const input = document.getElementById('barber-image-upload')
    if (input) input.value = ''
    setSelectedBarberId(barber.id)
    setFeedback({ type: 'success', text: 'Barbier ajouté. Vous pouvez maintenant ouvrir ses créneaux.' })
    await loadDashboard()
  }

  const deactivateAvailability = async (slotId) => {
    if (!supabase) return
    setFeedback(null)
    const { error } = await supabase
      .from('availability_slots')
      .update({ is_active: false })
      .eq('id', slotId)
      .is('reserved_at', null)
    if (error) {
      setFeedback({ type: 'error', text: 'Ce créneau ne peut pas être retiré.' })
      return
    }
    setFeedback({ type: 'success', text: 'Créneau retiré des disponibilités.' })
    await loadDashboard()
  }

  const toggleAvailabilityCell = async (barberId, appointmentDate, appointmentTime, existingSlot) => {
    if (!supabase || !barberId) return
    if (existingSlot?.reserved_at) {
      setFeedback({ type: 'error', text: 'Un créneau réservé ne peut pas être modifié.' })
      return
    }

    setFeedback(null)
    const { error } = existingSlot
      ? await supabase.from('availability_slots').update({ is_active: !existingSlot.is_active }).eq('id', existingSlot.id)
      : await supabase.from('availability_slots').insert({
        salon_id: availabilityDraft.salonId,
        barber_id: barberId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      })

    if (error) {
      setFeedback({ type: 'error', text: 'Le créneau ne peut pas être modifié. Actualisez puis réessayez.' })
      return
    }
    setFeedback({ type: 'success', text: existingSlot?.is_active ? 'Créneau fermé.' : 'Créneau disponible.' })
    await loadDashboard()
  }

  const deactivateBarber = async (barberId) => {
    if (!supabase || !barberId) return
    setFeedback(null)
    const { error } = await supabase
      .from('barbers')
      .update({ is_active: false })
      .eq('id', barberId)
    if (error) {
      setFeedback({ type: 'error', text: 'Le barbier ne peut pas etre retire.' })
      return
    }
    if (selectedBarberId === barberId) setSelectedBarberId('')
    setSelectedSlotTimes([])
    setFeedback({ type: 'success', text: 'Barbier retire. Ses anciens rendez-vous sont conserves.' })
    await loadDashboard()
  }

  const handleImageUpload = async (event) => {
    event.preventDefault()
    if (!supabase || !imageFile) return

    if (!imageFile.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Sélectionnez un fichier image valide.' })
      return
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'L’image ne doit pas dépasser 5 Mo.' })
      return
    }

    setIsUploading(true)
    setFeedback(null)
    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeName = imageFile.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
    const path = `hero/${uniqueId}-${safeName || 'photo'}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(BARBER_ASSETS_BUCKET)
      .upload(path, imageFile, {
        cacheControl: '31536000',
        contentType: imageFile.type,
        upsert: false,
      })

    if (uploadError) {
      setFeedback({ type: 'error', text: 'Le téléversement de l’image a échoué.' })
      setIsUploading(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from(BARBER_ASSETS_BUCKET)
      .getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('site_settings')
      .upsert({ id: true, hero_image_url: publicUrlData.publicUrl }, { onConflict: 'id' })

    if (updateError) {
      await supabase.storage.from(BARBER_ASSETS_BUCKET).remove([path])
      setFeedback({ type: 'error', text: 'La photo a été téléversée, mais le hero n’a pas été mis à jour. Exécutez hero-image-migration.sql.' })
    } else {
      const oldPath = getStorageObjectPath(heroImageUrl, BARBER_ASSETS_BUCKET)
      if (oldPath?.startsWith('hero/')) await supabase.storage.from(BARBER_ASSETS_BUCKET).remove([oldPath])
      setHeroImageUrl(publicUrlData.publicUrl)
      setImageFile(null)
      const input = document.getElementById('hero-image-upload')
      if (input) input.value = ''
      setFeedback({ type: 'success', text: 'La photo du hero a été mise à jour.' })
      await loadDashboard()
    }
    setIsUploading(false)
  }

  const saveRewardThreshold = async () => {
    if (!supabase || !isRewardThresholdDirty || isSavingRewardThreshold) return false
    const rewardVisits = Number(loyaltyProgram.loyalty_visits_for_reward)
    if (!Number.isInteger(rewardVisits) || rewardVisits < 2 || rewardVisits > 100) {
      setFeedback({ type: 'error', text: 'Le nombre de points requis doit être compris entre 2 et 100.' })
      return false
    }

    setIsSavingRewardThreshold(true)
    setFeedback(null)
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .update({ loyalty_visits_for_reward: rewardVisits })
        .eq('id', true)
        .select('loyalty_visits_for_reward')
        .maybeSingle()

      if (error || !data) {
        setFeedback({ type: 'error', text: 'Le seuil n’a pas été enregistré. Vérifiez loyalty-program-settings-migration.sql et les droits admin Supabase.' })
        return false
      }

      setLoyaltyProgram((current) => ({ ...current, loyalty_visits_for_reward: data.loyalty_visits_for_reward }))
      setIsRewardThresholdDirty(false)
      setFeedback({ type: 'success', text: `Seuil fidélité enregistré : ${data.loyalty_visits_for_reward} points.` })
      return true
    } catch {
      setFeedback({ type: 'error', text: 'Erreur réseau : le seuil de fidélité n’a pas pu être enregistré.' })
      return false
    } finally {
      setIsSavingRewardThreshold(false)
    }
  }

  const handleRefreshDashboard = async () => {
    if (isRewardThresholdDirty && !(await saveRewardThreshold())) return
    await loadDashboard({ clearFeedback: true })
  }

  const handleSaveSiteAppearance = async () => {
    if (!supabase || isSavingBranding) return
    setIsSavingBranding(true)
    setFeedback(null)

    const { data, error } = await supabase
      .from('site_settings')
      .update({ body_color: siteBodyColor, footer_color: siteFooterColor, button_color: siteButtonColor, logo_style: siteLogoStyle })
      .eq('id', true)
      .select('body_color, footer_color, button_color, logo_style')
      .maybeSingle()

    if (error) {
      setFeedback({ type: 'error', text: `Le design n’a pas pu être enregistré : ${error.message}` })
    } else if (!data) {
      setFeedback({ type: 'error', text: 'Le design n’a pas été enregistré : la ligne site_settings est introuvable ou l’accès Admin est refusé.' })
    } else {
      setSiteBodyColor(data.body_color)
      setSiteFooterColor(data.footer_color)
      setSiteButtonColor(data.button_color)
      setSiteLogoStyle(data.logo_style)
      setFeedback({ type: 'success', text: 'Le design du site client a été enregistré.' })
    }

    setIsSavingBranding(false)
  }

  const handleSaveBranding = async () => {
    if (!supabase || isSavingBranding) return
    const rewardVisits = Number(loyaltyProgram.loyalty_visits_for_reward)
    if (!Number.isInteger(rewardVisits) || rewardVisits < 2 || rewardVisits > 100) {
      setFeedback({ type: 'error', text: 'Le nombre de points requis doit être compris entre 2 et 100.' })
      return
    }
    setIsSavingBranding(true)
    setFeedback(null)
    const { data, error } = await supabase
      .from('site_settings')
      .update({ ...loyaltyProgram, loyalty_visits_for_reward: rewardVisits, loyalty_steps: loyaltySteps })
      .eq('id', true)
      .select('loyalty_visits_for_reward, loyalty_steps')
      .maybeSingle()

    if (!error && !data) {
      setFeedback({ type: 'error', text: 'Aucun réglage n’a été modifié. Vérifiez la ligne site_settings et les droits administrateur Supabase.' })
    } else if (error) {
      setFeedback({ type: 'error', text: 'Impossible d’enregistrer les réglages. Vérifiez que hero-image-migration.sql, loyalty-program-settings-migration.sql et loyalty-steps-migration.sql ont été exécutés dans Supabase.' })
    } else {
      setFeedback({ type: 'success', text: 'Les réglages et le programme de fidélité ont été enregistrés.' })
      setIsRewardThresholdDirty(false)
      await loadDashboard()
    }
    setIsSavingBranding(false)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setFeedback({ type: 'error', text: 'La déconnexion a échoué. Réessayez.' })
      return
    }
    await refreshAuth(null)
    navigate('/admin-portal', { replace: true })
  }

  const handleClearReservations = async () => {
    if (!supabase || isClearingReservations || !window.confirm(labels.clearReservationsConfirm)) return
    setIsClearingReservations(true)
    setFeedback(null)
    const { error } = await supabase.rpc('clear_client_reservations')
    if (error) {
      setFeedback({ type: 'error', text: language === 'DE'
        ? `Löschen fehlgeschlagen: ${error.message}. Migration clear-client-records-migration.sql ausführen und Admin-Zugang prüfen.`
        : `La suppression a échoué : ${error.message}. Exécutez clear-client-records-migration.sql dans le bon projet Supabase et vérifiez l’accès admin.` })
    } else {
      setFeedback({ type: 'success', text: labels.clearReservationsDone })
      await loadDashboard()
    }
    setIsClearingReservations(false)
  }

  const barbersForSelectedSalon = barbers.filter((barber) => barber.is_active && barber.salon_id === availabilityDraft.salonId)
  const selectedBarberSlots = availabilitySlots.filter((slot) => slot.barber_id === selectedBarberId && slot.appointment_date === availabilityDraft.appointmentDate)

  return (
    <main className="admin-dashboard min-h-screen overflow-x-clip bg-zinc-950 text-zinc-100">
      <AdminGermanContent language={language}>
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-8 sm:py-5 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo style={siteLogoStyle} tone="light" className="!h-10 w-auto max-w-[52vw] object-contain sm:!h-12 sm:max-w-[190px]" />
            <p className="min-w-0 border-l border-zinc-700 pl-3 text-[9px] font-bold uppercase leading-4 tracking-[0.12em] text-zinc-500 sm:text-[10px] sm:tracking-[0.2em]">{labels.admin}</p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center gap-1 rounded-full border border-zinc-800 p-1" aria-label="Langue">
              {['FR', 'DE'].map((option) => <button key={option} type="button" onClick={() => changeLanguage(option)} aria-pressed={language === option} className={`rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wider transition ${language === option ? 'bg-amber-200 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>{option}</button>)}
            </div>
            <button type="button" className="button-ghost !min-h-0 !px-4 !py-2.5 text-[10px]" onClick={handleSignOut}>
              <LogOut size={15} /> {labels.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
        <div className="mb-9 flex flex-col gap-5 border-b border-zinc-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200">{labels.private}</p>
            <h1 className="break-words font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-6xl">{labels.dashboard}</h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <DashboardTab active={activeTab === 'reservations'} onClick={() => setActiveTab('reservations')} icon={<CalendarDays size={15} />}>
              {labels.reservations}
            </DashboardTab>
            <DashboardTab active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} icon={<QrCode size={15} />}>
              {labels.loyalty}
            </DashboardTab>
            <DashboardTab active={activeTab === 'availability'} onClick={() => setActiveTab('availability')} icon={<CalendarDays size={15} />}>
              {labels.availability}
            </DashboardTab>
            <DashboardTab active={activeTab === 'cms'} onClick={() => setActiveTab('cms')} icon={<ImageUp size={15} />}>
              {labels.management}
            </DashboardTab>
            <DashboardTab active={activeTab === 'client-qr'} onClick={() => setActiveTab('client-qr')} icon={<QrCode size={15} />}>
              {language === 'DE' ? 'Kunden-App' : 'QR client'}
            </DashboardTab>
          </div>
        </div>

        {feedback && (
          <div role="status" className={`mb-6 border-l-2 px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-400 bg-emerald-400/5 text-emerald-100' : 'border-amber-200 bg-amber-200/5 text-amber-100'}`}>
            {feedback.text}
          </div>
        )}

        {activeTab === 'reservations' ? (
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex min-w-0 items-center gap-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl"><Users size={20} className="shrink-0 text-amber-200 sm:h-[22px] sm:w-[22px]" /> {labels.reservationsTitle}</h2>
                <p className="mt-2 text-sm text-zinc-500">{upcomingReservationCount} {language === 'DE' ? 'bevorstehende Termine' : `rendez-vous à venir${upcomingReservationCount > 1 ? 's' : ''}`}.</p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <button type="button" onClick={() => void handleClearReservations()} disabled={isClearingReservations} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-400/50 px-4 text-[10px] font-bold uppercase tracking-wider text-red-300 transition hover:border-red-300 hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-50">
                  <Trash2 size={14} />{isClearingReservations ? (language === 'DE' ? 'Lösche…' : 'Suppression…') : labels.clearReservations}
                </button>
              </div>
            </div>

            {isLoading ? <p className="border border-zinc-800 px-5 py-14 text-center text-zinc-500">Chargement des réservations…</p> : reservationGroups.length === 0 ? <p className="border border-zinc-800 px-5 py-14 text-center text-zinc-500">Aucune réservation pour le moment.</p> : <div className="space-y-6">{reservationGroups.map((group) => <ReservationGroup key={group.id} group={group} pricesByService={pricesByService} onDeleteReservation={deleteReservation} deletingReservationId={deletingReservationId} language={language} />)}</div>}
          </section>
        ) : activeTab === 'loyalty' ? (
          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex min-w-0 items-center gap-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl"><QrCode size={20} className="shrink-0 text-amber-200 sm:h-[22px] sm:w-[22px]" /> {labels.loyaltyTitle}</h2>
                <p className="mt-2 text-sm text-zinc-500">{loyaltyCards.length} client{loyaltyCards.length === 1 ? '' : 's'} inscrit{loyaltyCards.length === 1 ? '' : 's'} au programme.</p>
              </div>
              <button type="button" className="button-primary !min-h-0 !px-4 !py-3 text-[10px]" onClick={() => { setScannerMessage(''); setIsScanning(true) }}><Camera size={15} /> Scanner un QR code</button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <article className="min-w-0 border border-zinc-800 bg-zinc-900/35 p-4 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Validation de visite</p>
                {isScanning && <div className="mt-5 overflow-hidden border border-amber-200/50 bg-black"><video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" /><button type="button" className="w-full border-t border-zinc-800 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-100" onClick={() => setIsScanning(false)}>Arrêter la caméra</button></div>}
                {!isScanning && <><label className="mt-5 block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Code QR ou nom du client</span><div className="flex min-w-0 gap-2"><input value={loyaltySearch} onChange={(event) => setLoyaltySearch(event.target.value)} className="dashboard-input min-w-0 flex-1" placeholder="Scannez ou collez le code" /><button type="button" onClick={selectLoyaltyCard} className="shrink-0 border border-zinc-700 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:border-amber-200 hover:text-amber-200 sm:px-4">Trouver</button></div></label>{scannerMessage && <p className="mt-3 text-xs leading-5 text-zinc-400">{scannerMessage}</p>}</>}
                {selectedLoyaltyCard && <div className="mt-6 border border-amber-200/40 bg-amber-200/5 p-5"><p className="font-display text-2xl font-bold uppercase">{selectedLoyaltyCard.profiles?.full_name || 'Client fidélité'}</p><p className="mt-1 text-xs text-zinc-400">E-mail : {selectedLoyaltyCard.profiles?.email || 'Non disponible'}</p><p className="mt-1 text-xs text-zinc-400">WhatsApp : {selectedLoyaltyCard.profiles?.whatsapp || 'Non disponible'}</p><p className="mt-1 font-mono text-xs text-zinc-500">{selectedLoyaltyCard.member_code}</p><p className="mt-5 text-sm text-zinc-300"><strong className="text-4xl text-amber-200">{selectedLoyaltyCard.points}</strong> points actuels</p><button type="button" className="button-primary mt-5 w-full" onClick={() => void validateVisit(selectedLoyaltyCard.id)}><Check size={16} /> Valider la visite · +1 point</button></div>}
              </article>

              <div className="overflow-x-auto border border-zinc-800 bg-zinc-900/35">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    <tr><th className="px-5 py-4">Client</th><th className="px-5 py-4">Code membre</th><th className="px-5 py-4">Points</th><th className="px-5 py-4">Dernière activité</th><th className="px-5 py-4">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {isLoading ? <tr><td colSpan="5" className="px-5 py-14 text-center text-zinc-500">Chargement des cartes…</td></tr>
                      : filteredLoyaltyCards.length === 0 ? <tr><td colSpan="5" className="px-5 py-14 text-center text-zinc-500">Aucune carte trouvée.</td></tr>
                        : filteredLoyaltyCards.map((card) => (
                          <Fragment key={card.id}>
                            <tr className="hover:bg-zinc-900/80">
                              <td className="px-5 py-4">
                                <button type="button" onClick={() => void toggleLoyaltyHistory(card)} className="block text-left font-semibold text-zinc-200 hover:text-amber-200">{card.profiles?.full_name || 'Client fidélité'}</button>
                                <span className="mt-1 block text-xs text-zinc-500">{card.profiles?.email || 'E-mail non disponible'}</span>
                                <span className="mt-1 block text-xs text-zinc-600">WhatsApp : {card.profiles?.whatsapp || '-'}</span>
                              </td>
                              <td className="px-5 py-4 font-mono text-xs text-zinc-500">{card.member_code.slice(0, 8)}...</td>
                              <td className="px-5 py-4"><span className="font-display text-2xl text-amber-200">{card.points}</span></td>
                              <td className="px-5 py-4 text-zinc-400">{formatDate(card.updated_at, language)}</td>
                              <td className="px-5 py-4"><div className="flex items-center gap-2">
                                <button type="button" onClick={() => void toggleLoyaltyHistory(card)} aria-label={`Historique client de ${card.profiles?.full_name || 'ce client'}`} title="Historique client" className="rounded-full border border-zinc-700 p-2 text-zinc-400 hover:border-amber-200 hover:text-amber-200"><History size={15} /></button>
                                <button type="button" onClick={() => void adjustPoints(card.id, 1)} className="border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-amber-200 hover:text-amber-200">+1</button>
                                <button type="button" onClick={() => void adjustPoints(card.id, -1)} disabled={card.points === 0} className="border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-amber-200 hover:text-amber-200 disabled:opacity-40">-1</button>
                                <button type="button" onClick={() => void resetLoyaltyPoints(card)} disabled={card.points === 0} aria-label={`Remettre à zéro le compteur de ${card.profiles?.full_name || 'ce client'}`} title="Remettre à zéro" className="rounded-full border border-zinc-700 p-2 text-zinc-400 hover:border-amber-200 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={15} /></button>
                              </div></td>
                            </tr>
                            {historyCardId === card.id && <tr><td colSpan="5" className="bg-zinc-950/70 px-5 py-4">
                              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200"><History size={14} /> Historique de {card.profiles?.full_name || 'ce client'}</h3>
                              {isLoadingLoyaltyHistory ? <p className="text-sm text-zinc-500">Chargement de l’historique…</p>
                                : loyaltyHistory.length === 0 ? <p className="text-sm text-zinc-500">Aucun point enregistré pour ce client.</p>
                                  : <ul className="divide-y divide-zinc-800">{loyaltyHistory.map((event) => <li key={event.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-zinc-400">{new Intl.DateTimeFormat(language === 'DE' ? 'de-CH' : 'fr-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.created_at))}</span><strong className={event.point_delta > 0 ? 'text-emerald-400' : 'text-amber-200'}>{event.point_delta > 0 ? '+' : ''}{event.point_delta} point{Math.abs(event.point_delta) === 1 ? '' : 's'}</strong></li>)}</ul>}
                            </td></tr>}
                          </Fragment>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : activeTab === 'availability' ? (
          <section>
            <div className="mb-6">
              <h2 className="flex min-w-0 items-center gap-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl"><CalendarDays size={20} className="shrink-0 text-amber-200 sm:h-[22px] sm:w-[22px]" /> {labels.availabilityTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Ajoutez les créneaux que les clients peuvent réserver. Une fois réservé, un créneau disparaît automatiquement de leur calendrier.</p>
            </div>
            <AvailabilityConfiguration availabilityDraft={availabilityDraft} setAvailabilityDraft={setAvailabilityDraft} barbers={barbersForSelectedSalon} allSlots={availabilitySlots.filter((slot) => slot.salon_id === availabilityDraft.salonId)} selectedBarberId={selectedBarberId} setSelectedBarberId={setSelectedBarberId} selectedSlotTimes={selectedSlotTimes} toggleSuggestedTime={toggleSuggestedTime} onSubmitSlots={handleAddAvailability} isSavingSlots={isSavingAvailability} existingSlots={selectedBarberSlots} onRemoveSlot={deactivateAvailability} onToggleSlot={toggleAvailabilityCell} onDeactivateBarber={deactivateBarber} barberDraft={barberDraft} setBarberDraft={setBarberDraft} barberFile={barberFile} setBarberFile={setBarberFile} onSubmitBarber={handleAddBarber} isSavingBarber={isSavingBarber} language={language} />
            {activeTab === 'legacy' && <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Nouveau créneau</p>
                <form className="mt-6 space-y-5" onSubmit={handleAddAvailability}>
                  <DashboardField label="Salon"><select value={availabilityDraft.salonId} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, salonId: event.target.value }))} className="dashboard-input">{Object.entries(salonNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></DashboardField>
                  <DashboardField label="Date"><input required type="date" min={new Date().toISOString().slice(0, 10)} value={availabilityDraft.appointmentDate} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, appointmentDate: event.target.value }))} className="dashboard-input" /></DashboardField>
                  <DashboardField label="Heure"><input required type="time" value={availabilityDraft.appointmentTime} onChange={(event) => setAvailabilityDraft((current) => ({ ...current, appointmentTime: event.target.value }))} className="dashboard-input" /></DashboardField>
                  <button type="submit" className="button-primary w-full" disabled={isSavingAvailability}><Plus size={16} />{isSavingAvailability ? 'Ajout…' : 'Ouvrir ce créneau'}</button>
                </form>
              </article>
              <article className="overflow-hidden border border-zinc-800 bg-zinc-900/35">
                <div className="border-b border-zinc-800 px-6 py-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Créneaux configurés · {availabilitySlots.length}</p></div>
                <div className="overflow-x-auto"><table className="min-w-[620px] w-full text-left text-sm"><thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500"><tr><th className="px-5 py-4">Salon</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Heure</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y divide-zinc-800">{isLoading ? <tr><td colSpan="5" className="px-5 py-12 text-center text-zinc-500">Chargement…</td></tr> : availabilitySlots.length === 0 ? <tr><td colSpan="5" className="px-5 py-12 text-center text-zinc-500">Aucun créneau configuré.</td></tr> : availabilitySlots.map((slot) => <tr key={slot.id}><td className="px-5 py-4 text-zinc-200">{salonNames[slot.salon_id] ?? slot.salon_id}</td><td className="px-5 py-4 text-zinc-400">{formatDate(slot.appointment_date)}</td><td className="px-5 py-4 font-mono text-zinc-300">{slot.appointment_time.slice(0, 5)}</td><td className="px-5 py-4"><span className={slot.reserved_at ? 'text-amber-200' : slot.is_active ? 'text-emerald-400' : 'text-zinc-600'}>{slot.reserved_at ? 'Réservé' : slot.is_active ? 'Disponible' : 'Fermé'}</span></td><td className="px-5 py-4">{slot.is_active && !slot.reserved_at ? <button type="button" onClick={() => void deactivateAvailability(slot.id)} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-amber-200">Retirer</button> : '—'}</td></tr>)}</tbody></table></div>
              </article>
            </div>}
          </section>
        ) : activeTab === 'client-qr' ? (
          <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
            <article className="border border-zinc-800 bg-zinc-900/35 p-5 sm:p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Luzia’s Salon</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">{language === 'DE' ? 'Kunden-App installieren' : 'Installer l’application client'}</h2>
              <div className="mx-auto mt-6 flex aspect-square w-full max-w-[340px] items-center justify-center border border-zinc-700 bg-white p-2">
                <QRCodeSVG
                  value="https://alep-salon-seven.vercel.app/"
                  size={320}
                  level="H"
                  includeMargin
                  title={language === 'DE' ? 'QR-Code zur Luzia’s Salon Kunden-App' : 'QR code de l’application client Luzia’s Salon'}
                  imageSettings={{ src: '/luzias-icon.svg', width: 72, height: 72, excavate: true }}
                  className="h-full w-full"
                />
              </div>
              <a href="/qr-client.svg" download="alep-salon-qr-client.svg" className="button-ghost mt-5 w-full justify-center">
                {language === 'DE' ? 'QR-Code herunterladen' : 'Télécharger le QR code'}
              </a>
            </article>

            <article className="border border-zinc-800 bg-zinc-900/35 p-5 sm:p-7">
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-zinc-100">{language === 'DE' ? 'So geht’s' : 'Comment faire'}</h3>
              <ol className="mt-5 space-y-4 text-sm leading-6 text-zinc-300">
                <li><span className="mr-2 font-bold text-amber-200">1.</span>{language === 'DE' ? 'Zeige diesen QR-Code dem Kunden.' : 'Montrez ce QR code au client.'}</li>
                <li><span className="mr-2 font-bold text-amber-200">2.</span>{language === 'DE' ? 'Der Kunde scannt ihn mit der Telefonkamera und öffnet den Link.' : 'Le client le scanne avec l’appareil photo de son téléphone et ouvre le lien.'}</li>
                <li><span className="mr-2 font-bold text-amber-200">3.</span>{language === 'DE' ? 'In Chrome öffnet er das Menü und wählt „App installieren“ oder „Zum Startbildschirm hinzufügen“.' : 'Dans Chrome, il ouvre le menu puis choisit « Installer l’application » ou « Ajouter à l’écran d’accueil ».'}</li>
              </ol>
              <a href="https://alep-salon-seven.vercel.app/" target="_blank" rel="noreferrer" className="button-primary mt-7 inline-flex min-h-11 justify-center px-5">
                {language === 'DE' ? 'Kundenseite öffnen' : 'Ouvrir le site client'}
              </a>
              <p className="mt-4 break-all font-mono text-xs text-zinc-500">https://alep-salon-seven.vercel.app/</p>
            </article>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-2">
            <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Prestations</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Ajouter une prestation</h2>
              <form className="mt-7 space-y-5" onSubmit={handleAddService}>
                <DashboardField label="Catégorie">
                  <div className="flex gap-2">
                    <select value={newService.category} onChange={(event) => setNewService((service) => ({ ...service, category: event.target.value }))} className="dashboard-input min-w-0 flex-1">
                      {serviceCategories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                    {!isRenamingServiceCategory && <button type="button" title="Renommer la catégorie sélectionnée" aria-label="Renommer la catégorie sélectionnée" onClick={() => { setServiceCategoryNameDraft(newService.category); setIsRenamingServiceCategory(true) }} className="inline-flex shrink-0 items-center gap-2 border border-zinc-700 px-3 text-xs font-bold text-zinc-300 hover:border-amber-200 hover:text-amber-200"><Pencil size={14} />Renommer</button>}
                  </div>
                </DashboardField>
                {isRenamingServiceCategory && <div className="flex flex-col gap-2 sm:flex-row">
                  <input autoFocus required maxLength={50} value={serviceCategoryNameDraft} onChange={(event) => setServiceCategoryNameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleRenameServiceCategory() } }} className="dashboard-input min-w-0 flex-1" aria-label="Nouveau nom de catégorie" />
                  <button type="button" className="button-primary" onClick={() => void handleRenameServiceCategory()} disabled={isSavingServiceCategory}>{isSavingServiceCategory ? 'Enregistrement…' : 'Enregistrer le nom'}</button>
                  <button type="button" className="border border-zinc-700 px-4 text-sm font-bold text-zinc-300" onClick={() => setIsRenamingServiceCategory(false)}>Annuler</button>
                </div>}
                <DashboardField label="Nom de la prestation">
                  <input required value={newService.name} onChange={(event) => setNewService((service) => ({ ...service, name: event.target.value }))} className="dashboard-input" placeholder="Ex. Coupe enfant" />
                </DashboardField>
                <DashboardField label="Prix affiché">
                  <input required value={newService.price} onChange={(event) => setNewService((service) => ({ ...service, price: event.target.value }))} className="dashboard-input" placeholder="35.-" />
                </DashboardField>
                <button type="submit" className="button-primary w-full" disabled={isSavingService}><Plus size={16} />{isSavingService ? 'Ajout…' : 'Ajouter la prestation'}</button>
              </form>
            </article>

            <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8 xl:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Galerie des services</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Gérer les photos</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Ajoutez une photo à chaque service. Elle apparaîtra sur la page Services du site client. JPG, PNG ou WebP · 5 Mo maximum.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => {
                  const photos = getServiceImages(service)
                  return <div key={service.id} className="overflow-hidden border border-zinc-800 bg-zinc-950/60">
                    <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1">
                      {[0, 1, 2].map((index) => <div key={index} className="relative aspect-square overflow-hidden bg-zinc-950 text-zinc-600">{photos[index] ? <><img src={photos[index]} alt={`${service.image_title || service.name} — photo ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => void handleRemoveServiceImage(service, index)} disabled={serviceImageUploadId === service.id} aria-label={`Supprimer la photo ${index + 1} de ${service.name}`} className="absolute right-1 top-1 rounded bg-black/75 px-1.5 py-1 text-[9px] font-bold text-white hover:bg-red-700 disabled:opacity-50">×</button></> : <div className="flex h-full items-center justify-center text-[9px] font-bold uppercase tracking-wider">Photo {index + 1}</div>}</div>)}
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">{service.category}</p>
                      <p className="mt-1 font-semibold text-zinc-100">{service.name}</p>
                      <p className="mt-1 text-sm text-zinc-500">{formatSalonPrice(service.price)}</p>
                      <DashboardField label="Titre de la photo (facultatif)">
                        <input value={serviceImageTitleDrafts[service.id] ?? service.image_title ?? ''} onChange={(event) => setServiceImageTitleDrafts((drafts) => ({ ...drafts, [service.id]: event.target.value }))} className="dashboard-input" placeholder="Ex. Coupe dégradée" />
                      </DashboardField>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <label htmlFor={`service-image-${service.id}`} className={`inline-flex cursor-pointer items-center gap-2 border border-zinc-700 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300 transition hover:border-amber-200 hover:text-amber-200 ${serviceImageUploadId === service.id || photos.length >= 3 ? 'pointer-events-none opacity-50' : ''}`}>
                          <Upload size={14} />{serviceImageUploadId === service.id ? 'Téléversement…' : `Ajouter des photos (${photos.length}/3)`}
                        </label>
                        <input id={`service-image-${service.id}`} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={serviceImageUploadId === service.id || photos.length >= 3} onChange={(event) => void handleServiceImageUpload(event, service)} />
                        {photos.length > 0 && <button type="button" onClick={() => void handleSaveServiceImageTitle(service)} disabled={serviceImageTitleSavingId === service.id || serviceImageUploadId === service.id} className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300 transition hover:text-amber-200 disabled:opacity-50">{serviceImageTitleSavingId === service.id ? 'Enregistrement…' : 'Enregistrer le titre'}</button>}
                      </div>
                      <button type="button" onClick={() => void handleDeleteService(service)} disabled={serviceDeleteId !== null || serviceImageUploadId === service.id || serviceImageTitleSavingId === service.id} className="mt-4 inline-flex items-center gap-2 border border-red-900/70 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-300 transition hover:border-red-500 hover:text-red-100 disabled:opacity-50"><Trash2 size={14} />{serviceDeleteId === service.id ? 'Suppression…' : 'Supprimer la prestation'}</button>
                    </div>
                  </div>
                })}
                {services.length === 0 && <p className="border border-dashed border-zinc-700 p-5 text-sm text-zinc-500">Aucun service à gérer pour le moment.</p>}
              </div>
            </article>

            <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Visuel du site</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Photo hero section</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Cette image apparaît en arrière-plan du hero. Vous pouvez la remplacer à tout moment.</p>
              <form className="mt-7 space-y-5 border-t border-zinc-800 pt-7" onSubmit={handleImageUpload}>
                <DashboardField label="Nouvelle photo - JPG, PNG ou WebP - 5 Mo max">
                  <input id="hero-image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="block w-full border border-dashed border-zinc-700 bg-zinc-950 px-3 py-3 text-xs text-zinc-400 file:mr-4 file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-zinc-200" />
                </DashboardField>
                <button type="submit" className="button-primary w-full" disabled={!imageFile || isUploading}><Upload size={16} />{isUploading ? "Téléversement…" : "Téléverser et remplacer la photo hero"}</button>
              </form>
            </article>

            <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Apparence du site client</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Couleurs et logo</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Choisissez séparément le fond du site client, la couleur du footer, les boutons et le style du logo.</p>
              <div className="mt-8 space-y-8 border-t border-zinc-800 pt-7">
                <section>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide">Couleur du fond du site</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {BODY_COLOR_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={siteBodyColor === option.value} onClick={() => setSiteBodyColor(option.value)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${siteBodyColor === option.value ? 'border-amber-200 text-amber-200' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}><span className="h-5 w-5 rounded-full border border-black/20" style={{ backgroundColor: option.color }} />{option.label}</button>)}
                  </div>
                </section>
                <section>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide">Couleur du footer</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {FOOTER_COLOR_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={siteFooterColor === option.value} onClick={() => setSiteFooterColor(option.value)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${siteFooterColor === option.value ? 'border-amber-200 text-amber-200' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}><span className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: option.color }} />{option.label}</button>)}
                  </div>
                </section>
                <section>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide">Couleur des boutons</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {BUTTON_COLOR_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={siteButtonColor === option.value} onClick={() => setSiteButtonColor(option.value)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${siteButtonColor === option.value ? 'border-amber-200 text-amber-200' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}><span className="h-5 w-5 rounded-full border border-white/20" style={{ backgroundColor: option.color }} />{option.label}</button>)}
                  </div>
                </section>
                <section>
                  <h3 className="font-display text-lg font-bold uppercase tracking-wide">Style du logo</h3>
                  <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {LOGO_STYLE_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={siteLogoStyle === option.value} onClick={() => setSiteLogoStyle(option.value)} className={`flex min-h-24 flex-col items-center justify-center gap-2 border p-3 transition ${siteLogoStyle === option.value ? 'border-amber-200 bg-amber-200/5' : 'border-zinc-700 hover:border-zinc-500'}`}>
                      <LogoStylePreview style={option.value} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">{option.label}</span>
                    </button>)}
                  </div>
                </section>
                <button type="button" className="button-primary w-full" onClick={() => void handleSaveSiteAppearance()} disabled={isSavingBranding}><Check size={16} />{isSavingBranding ? 'Enregistrement…' : 'Enregistrer le design'}</button>
              </div>
            </article>

            <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8 xl:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Programme de fidélité</p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Comment ça marche</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">Le seuil est le nombre de points requis. Dans les textes, {`{points}`} affiche ce seuil et {`{visits}`} affiche le numéro de la coupe offerte.</p>
              <div className="mt-7 max-w-sm">
                <DashboardField label="Points nécessaires avant la coupe offerte">
                  <input required type="number" min="2" max="100" value={loyaltyProgram.loyalty_visits_for_reward} onChange={(event) => { setLoyaltyProgram((current) => ({ ...current, loyalty_visits_for_reward: event.target.value })); setIsRewardThresholdDirty(true) }} onBlur={(event) => { if (isRewardThresholdDirty && !event.relatedTarget?.dataset.saveLoyaltyProgram) void saveRewardThreshold() }} className="dashboard-input" />
                </DashboardField>
                <p className="mt-2 text-xs leading-5 text-zinc-500">Le nombre est enregistré automatiquement quand vous quittez le champ.</p>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {loyaltySteps.map((step, index) => (
                  <section key={step.id} className="space-y-4 border border-zinc-800 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Étape {index + 1}</p>
                      <button type="button" onClick={() => setLoyaltySteps((current) => current.filter((item) => item.id !== step.id))} aria-label={`Supprimer l’étape ${index + 1}`} title="Supprimer cette étape" className="rounded-full border border-red-900/70 p-2 text-red-300 transition hover:border-red-500 hover:text-red-100"><Trash2 size={14} /></button>
                    </div>
                    <DashboardField label="Titre">
                      <input maxLength="80" value={step.title} onChange={(event) => setLoyaltySteps((current) => current.map((item) => item.id === step.id ? { ...item, title: event.target.value } : item))} className="dashboard-input" />
                    </DashboardField>
                    <DashboardField label="Explication">
                      <textarea maxLength="500" rows="3" value={step.description} onChange={(event) => setLoyaltySteps((current) => current.map((item) => item.id === step.id ? { ...item, description: event.target.value } : item))} className="dashboard-input resize-y" />
                    </DashboardField>
                  </section>
                ))}
              </div>
              <button type="button" className="button-ghost mt-5 w-full justify-center" onClick={() => setLoyaltySteps((current) => [...current, { id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: 'Nouvelle étape', description: 'Décrivez cette étape du programme de fidélité.', icon: 'sparkles' }])}><Plus size={16} />Ajouter une étape</button>
              <button type="button" data-save-loyalty-program="true" className="button-primary mt-6 w-full" onClick={() => void handleSaveBranding()} disabled={isSavingBranding || isSavingRewardThreshold}><Check size={16} />{isSavingBranding ? 'Enregistrement…' : 'Enregistrer le programme de fidélité'}</button>
            </article>
          </section>
        )}

        <div className="mt-8 flex justify-end">
          <button type="button" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 transition hover:text-amber-200" onClick={() => void handleRefreshDashboard()} disabled={isLoading || isSavingBranding || isSavingRewardThreshold}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Actualiser les données
          </button>
        </div>
      </div>
      </AdminGermanContent>
    </main>
  )
}

function LogoStylePreview({ style }) {
  const sizeClass = style === 'classic'
    ? '!h-12 !w-auto max-w-[38px]'
    : style === 'symbol'
      ? '!h-9 !w-9'
      : style === 'horizontal'
        ? 'max-w-full'
        : ''
  return <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded bg-black/35 px-2"><BrandLogo style={style} tone="light" className={sizeClass} /></div>
}

function DashboardTab({ active, onClick, icon, children }) {
  return <button type="button" onClick={onClick} className={`flex min-w-0 items-center justify-center gap-1.5 border px-2 py-3 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.06em] transition sm:flex-none sm:gap-2 sm:px-4 sm:text-[10px] sm:tracking-[0.14em] ${active ? 'border-amber-200 bg-amber-200 text-zinc-950' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'}`}>{icon}{children}</button>
}

function DashboardField({ label, children }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>{children}</label>
}

function AvailabilityConfiguration({ availabilityDraft, setAvailabilityDraft, barbers, allSlots, selectedBarberId, setSelectedBarberId, selectedSlotTimes, toggleSuggestedTime, onSubmitSlots, isSavingSlots, existingSlots, onRemoveSlot, onToggleSlot, onDeactivateBarber, barberDraft, setBarberDraft, barberFile, setBarberFile, onSubmitBarber, isSavingBarber, language }) {
  const today = new Date().toISOString().slice(0, 10)
  const updateAvailabilitySalon = (salonId) => {
    setAvailabilityDraft((draft) => ({ ...draft, salonId }))
    setSelectedBarberId('')
  }

  return <AdminGermanContent language={language}><><AvailabilityGrid availabilityDraft={availabilityDraft} setAvailabilityDraft={setAvailabilityDraft} barbers={barbers} allSlots={allSlots} onToggleSlot={onToggleSlot} onDeactivateBarber={onDeactivateBarber} barberDraft={barberDraft} setBarberDraft={setBarberDraft} barberFile={barberFile} setBarberFile={setBarberFile} onSubmitBarber={onSubmitBarber} isSavingBarber={isSavingBarber} today={today} language={language} /><div className="hidden">
    <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">L’équipe</p>
      <h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Ajouter un barbier</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-500">La photo et le nom seront affichés au client avant le choix du créneau.</p>
      <form className="mt-7 space-y-5" onSubmit={onSubmitBarber}>
        <DashboardField label="Salon"><select value={barberDraft.salonId} onChange={(event) => setBarberDraft((draft) => ({ ...draft, salonId: event.target.value }))} className="dashboard-input">{Object.entries(salonNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></DashboardField>
        <DashboardField label="Nom du barbier"><input required value={barberDraft.name} onChange={(event) => setBarberDraft((draft) => ({ ...draft, name: event.target.value }))} className="dashboard-input" placeholder="Ex. Moha" /></DashboardField>
        <DashboardField label="Photo · JPG, PNG ou WebP · 5 Mo max"><input id="barber-image-upload" required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBarberFile(event.target.files?.[0] ?? null)} className="block w-full border border-dashed border-zinc-700 bg-zinc-950 px-3 py-3 text-xs text-zinc-400 file:mr-4 file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-zinc-200" /></DashboardField>
        <button type="submit" className="button-primary w-full" disabled={!barberFile || isSavingBarber}><Upload size={16} />{isSavingBarber ? 'Ajout…' : 'Ajouter le barbier'}</button>
      </form>
    </article>
    <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Planning</p>
      <h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Configurer les créneaux</h3>
      <div className="mt-7 space-y-6">
        <DashboardField label="Salon"><select value={availabilityDraft.salonId} onChange={(event) => updateAvailabilitySalon(event.target.value)} className="dashboard-input">{Object.entries(salonNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></DashboardField>
        <section><span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Choisir le barbier</span>{barbers.length === 0 ? <p className="border border-dashed border-zinc-700 px-4 py-4 text-sm text-zinc-500">Ajoutez d’abord un barbier pour ce salon.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{barbers.map((barber) => <button type="button" key={barber.id} onClick={() => setSelectedBarberId(barber.id)} className={`overflow-hidden border text-left transition ${selectedBarberId === barber.id ? 'border-amber-200 bg-amber-200/10' : 'border-zinc-700 hover:border-zinc-500'}`}><span className="block px-3 py-3 text-sm font-bold text-zinc-100">{barber.name}</span></button>)}</div>}</section>
        <div className="flex justify-end"><button type="button" disabled={!selectedBarberId} onClick={() => onDeactivateBarber(selectedBarberId)} className="border border-red-500/40 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-300 transition hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40">Retirer le barbier sélectionné</button></div>
        <DashboardField label="Date"><input required type="date" min={today} value={availabilityDraft.appointmentDate} onChange={(event) => setAvailabilityDraft((draft) => ({ ...draft, appointmentDate: event.target.value }))} className="dashboard-input" /></DashboardField>
        <form onSubmit={onSubmitSlots}><section><span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Heures disponibles</span><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{suggestedTimes.map((time) => <button type="button" key={time} onClick={() => toggleSuggestedTime(time)} className={`border px-3 py-3 font-mono text-sm transition ${selectedSlotTimes.includes(time) ? 'border-amber-200 bg-amber-200 text-zinc-950' : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-amber-200 hover:text-amber-200'}`}>{time}</button>)}</div></section><button type="submit" className="button-primary mt-6 w-full" disabled={!selectedBarberId || selectedSlotTimes.length === 0 || isSavingSlots}><Plus size={16} />{isSavingSlots ? 'Ajout…' : `Ouvrir ${selectedSlotTimes.length || ''} créneau${selectedSlotTimes.length > 1 ? 'x' : ''}`}</button></form>
        <section className="border-t border-zinc-800 pt-6"><span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Créneaux de cette date</span>{!selectedBarberId ? <p className="text-sm text-zinc-600">Choisissez un barbier.</p> : existingSlots.length === 0 ? <p className="text-sm text-zinc-600">Aucun créneau configuré.</p> : <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{existingSlots.map((slot) => <button key={slot.id} type="button" disabled={Boolean(slot.reserved_at)} onClick={() => !slot.reserved_at && onRemoveSlot(slot.id)} className={`border px-3 py-3 font-mono text-sm ${slot.reserved_at ? 'cursor-not-allowed border-amber-200/40 bg-amber-200/10 text-amber-200' : slot.is_active ? 'border-emerald-400/50 text-emerald-400 hover:border-amber-200 hover:text-amber-200' : 'border-zinc-800 text-zinc-600'}`}>{slot.appointment_time.slice(0, 5)}</button>)}</div>}<p className="mt-3 text-[10px] text-zinc-600">Vert : disponible. Jaune : réservé. Cliquez sur un créneau vert pour le retirer.</p></section>
        <section className="border-t border-zinc-800 pt-6">
          <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Tableau des disponibilités par barbier</span>
          <p className="mb-4 text-sm leading-6 text-zinc-500">Chaque colonne est un barbier. Un même horaire peut être ouvert et réservé pour chaque barbier : à 10:00, trois barbiers peuvent donc recevoir trois clients.</p>
          {barbers.length === 0 ? <p className="text-sm text-zinc-600">Ajoutez des barbiers pour afficher le planning.</p> : <div className="overflow-x-auto border border-zinc-800"><table className="min-w-[680px] w-full text-left text-sm"><thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500"><tr><th className="px-4 py-3">Heure</th>{barbers.map((barber) => <th key={barber.id} className="min-w-36 px-4 py-3">{barber.name}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{suggestedTimes.map((time) => <tr key={time}><td className="px-4 py-3 font-mono text-zinc-300">{time}</td>{barbers.map((barber) => { const slot = allSlots.find((item) => item.barber_id === barber.id && item.appointment_time.slice(0, 5) === time); return <td key={barber.id} className="px-4 py-3"><button type="button" onClick={() => setSelectedBarberId(barber.id)} className={`w-full border px-2 py-2 text-[10px] font-bold uppercase tracking-wide ${slot?.reserved_at ? 'border-amber-200/40 bg-amber-200/10 text-amber-200' : slot?.is_active ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}>{slot?.reserved_at ? 'Réservé' : slot?.is_active ? 'Ouvert' : '—'}</button></td>})}</tr>)}</tbody></table></div>}
          <p className="mt-3 text-[10px] text-zinc-600">Vert : disponible. Jaune : réservé. Cliquez sur une case pour sélectionner ce barbier et modifier ses créneaux.</p>
        </section>
      </div>
    </article>
  </div></></AdminGermanContent>
}

function AvailabilityGrid({ availabilityDraft, setAvailabilityDraft, barbers, allSlots, onToggleSlot, onDeactivateBarber, barberDraft, setBarberDraft, barberFile, setBarberFile, onSubmitBarber, isSavingBarber, today, language }) {
  return <AdminGermanContent language={language}><><BarberAvailabilityCards availabilityDraft={availabilityDraft} setAvailabilityDraft={setAvailabilityDraft} barbers={barbers} allSlots={allSlots} onToggleSlot={onToggleSlot} onDeactivateBarber={onDeactivateBarber} barberDraft={barberDraft} setBarberDraft={setBarberDraft} barberFile={barberFile} setBarberFile={setBarberFile} onSubmitBarber={onSubmitBarber} isSavingBarber={isSavingBarber} today={today} language={language} /><div className="hidden space-y-6">
    <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">L'équipe</p>
      <h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Ajouter un barbier</h3>
      <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={onSubmitBarber}>
        <DashboardField label="Nom"><input required value={barberDraft.name} onChange={(event) => setBarberDraft((draft) => ({ ...draft, name: event.target.value }))} className="dashboard-input" placeholder="Ex. Moha" /></DashboardField>
        <DashboardField label="Photo"><input id="barber-image-upload" required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBarberFile(event.target.files?.[0] ?? null)} className="block w-full border border-dashed border-zinc-700 bg-zinc-950 px-3 py-3 text-xs text-zinc-400" /></DashboardField>
        <button type="submit" className="button-primary self-end" disabled={!barberFile || isSavingBarber}><Upload size={16} />{isSavingBarber ? 'Ajout…' : 'Ajouter'}</button>
      </form>
    </article>

    <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Disponibilités</p><h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Planning par barbier</h3></div><div className="grid grid-cols-2 gap-3"><DashboardField label="Salon"><select value={availabilityDraft.salonId} onChange={(event) => setAvailabilityDraft((draft) => ({ ...draft, salonId: event.target.value }))} className="dashboard-input">{Object.entries(salonNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></DashboardField><DashboardField label="Date"><input type="date" min={today} value={availabilityDraft.appointmentDate} onChange={(event) => setAvailabilityDraft((draft) => ({ ...draft, appointmentDate: event.target.value }))} className="dashboard-input" /></DashboardField></div></div>
      <section className="mt-7"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Barbiers actifs</p>{barbers.length === 0 ? <p className="border border-dashed border-zinc-700 px-4 py-4 text-sm text-zinc-500">Ajoutez un barbier pour commencer.</p> : <div className="flex flex-wrap gap-2">{barbers.map((barber) => <span key={barber.id} className="border border-zinc-700 px-3 py-2 text-sm text-zinc-200">{barber.name}</span>)}</div>}</section>
      <section className="mt-7 overflow-x-auto border border-zinc-800"><table className="min-w-[1250px] w-full text-center text-sm"><thead className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500"><tr><th className="sticky left-0 z-10 min-w-40 bg-zinc-900 px-4 py-4 text-left">Barbier</th>{suggestedTimes.map((time) => <th key={time} className="min-w-20 px-2 py-4 font-mono">{time}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{barbers.map((barber) => <tr key={barber.id}><th className="sticky left-0 z-10 bg-zinc-950 px-4 py-3 text-left font-semibold text-zinc-200"><div className="flex items-center gap-3"><span>{barber.name}</span><button type="button" onClick={() => onDeactivateBarber(barber.id)} className="ml-auto text-[10px] font-bold uppercase text-red-300 hover:text-red-100">Retirer</button></div></th>{suggestedTimes.map((time) => { const slot = allSlots.find((item) => item.barber_id === barber.id && item.appointment_time.slice(0, 5) === time); const state = slot?.reserved_at ? 'reserved' : slot?.is_active ? 'open' : 'closed'; return <td key={time} className="px-2 py-3"><button type="button" disabled={state === 'reserved'} onClick={() => onToggleSlot(barber.id, time, slot)} aria-label={`${barber.name}, ${time}`} className={`h-10 w-full border text-[10px] font-bold uppercase transition ${state === 'reserved' ? 'cursor-not-allowed border-amber-200/40 bg-amber-200/10 text-amber-200' : state === 'open' ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300 hover:border-emerald-300' : 'border-zinc-800 bg-zinc-950 text-zinc-600 hover:border-emerald-400/60 hover:text-emerald-300'}`}>{state === 'reserved' ? 'Réservé' : state === 'open' ? 'Disponible' : '—'}</button></td>})}</tr>)}</tbody></table></section>
      <p className="mt-4 text-xs text-zinc-500">Cliquez sur une case vide : elle devient verte et disponible. Cliquez sur une case verte : elle est fermée. Une case jaune est déjà réservée. Chaque barbier possède ses propres créneaux, donc trois barbiers peuvent recevoir trois clients à la même heure.</p>
    </article>
  </div></></AdminGermanContent>
}

function BarberAvailabilityCards({ availabilityDraft, setAvailabilityDraft, barbers, allSlots, onToggleSlot, onDeactivateBarber, barberDraft, setBarberDraft, barberFile, setBarberFile, onSubmitBarber, isSavingBarber, today, language }) {
  const [datesByBarber, setDatesByBarber] = useState({})
  const [barberPreviewUrl, setBarberPreviewUrl] = useState('')
  const defaultDate = availabilityDraft.appointmentDate || today

  useEffect(() => {
    if (!barberFile) {
      setBarberPreviewUrl('')
      return undefined
    }
    const previewUrl = URL.createObjectURL(barberFile)
    setBarberPreviewUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [barberFile])

  return <AdminGermanContent language={language}><div className="space-y-6">
    <article className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">L'équipe</p>
      <h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Ajouter un barbier</h3>
      <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={onSubmitBarber}>

        <DashboardField label="Nom"><input required value={barberDraft.name} onChange={(event) => setBarberDraft((draft) => ({ ...draft, name: event.target.value }))} className="dashboard-input" placeholder="Ex. Moha" /></DashboardField>
        <DashboardField label="Photo"><input id="barber-image-upload" required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBarberFile(event.target.files?.[0] ?? null)} className="block w-full border border-dashed border-zinc-700 bg-zinc-950 px-3 py-3 text-xs text-zinc-400" /></DashboardField>
        <button type="submit" className="button-primary self-end" disabled={!barberFile || isSavingBarber}><Upload size={16} />{isSavingBarber ? 'Ajout…' : 'Ajouter'}</button>
      </form>
      {barberPreviewUrl && <div className="mt-5 flex items-center gap-4 border border-zinc-800 bg-zinc-950/60 p-3"><img src={barberPreviewUrl} alt={`Aperçu de ${barberDraft.name || 'la photo du barbier'}`} className="h-20 w-20 rounded object-cover" /><div className="min-w-0"><p className="font-semibold text-zinc-100">{barberDraft.name || 'Nouveau barbier'}</p><p className="mt-1 truncate text-xs text-zinc-500">{barberFile?.name}</p></div></div>}
    </article>

    <section className="border border-zinc-800 bg-zinc-900/35 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Disponibilités</p><h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight">Créneaux par barbier</h3></div></div>
      {barbers.length === 0 ? <p className="mt-6 border border-dashed border-zinc-700 px-4 py-5 text-sm text-zinc-500">Ajoutez un barbier pour commencer.</p> : <div className="mt-7 grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 34rem), 1fr))' }}>{barbers.map((barber) => <BarberAvailabilityCard key={barber.id} barber={barber} slots={allSlots.filter((slot) => slot.barber_id === barber.id)} selectedDate={datesByBarber[barber.id] || defaultDate} onDateChange={(date) => { setDatesByBarber((dates) => ({ ...dates, [barber.id]: date })); setAvailabilityDraft((draft) => ({ ...draft, appointmentDate: date })) }} onToggleSlot={onToggleSlot} onDeactivate={() => onDeactivateBarber(barber.id)} today={today} language={language} />)}</div>}
    </section>
  </div></AdminGermanContent>
}

function BarberAvailabilityCard({ barber, slots, selectedDate, onDateChange, onToggleSlot, onDeactivate, today, language }) {
  const [monthCursor, setMonthCursor] = useState(() => new Date(`${selectedDate}T12:00:00`))
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate()
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const label = new Intl.DateTimeFormat(language === 'DE' ? 'de-CH' : 'fr-CH', { month: 'long', year: 'numeric' }).format(monthStart)
  const weekdayLabels = language === 'DE' ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] : ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const calendarDays = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1)
  const toDate = (day) => `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const dayHasSlot = (date) => slots.some((slot) => slot.appointment_date === date && slot.is_active)
  const timeSlots = slots.filter((slot) => slot.appointment_date === selectedDate)

  return <AdminGermanContent language={language}><article className="border border-zinc-800 bg-zinc-950/50 p-4 sm:p-5"><header className="flex items-center gap-3 border-b border-zinc-800 pb-4">{barber.image_url ? <img src={barber.image_url} alt={barber.name} className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-full bg-zinc-800" />}<h4 className="font-display text-xl font-bold uppercase tracking-tight text-zinc-100">{barber.name}</h4><button type="button" onClick={onDeactivate} className="ml-auto text-[10px] font-bold uppercase tracking-wide text-red-300 hover:text-red-100">Retirer</button></header><div className="mt-5 grid gap-5 md:grid-cols-2"><section><div className="mb-3 flex items-center justify-between"><button type="button" onClick={() => setMonthCursor((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} className="px-2 text-zinc-400 hover:text-amber-200" aria-label="Mois précédent">‹</button><p className="text-sm font-bold capitalize text-zinc-200">{label}</p><button type="button" onClick={() => setMonthCursor((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} className="px-2 text-zinc-400 hover:text-amber-200" aria-label="Mois suivant">›</button></div><div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-600">{weekdayLabels.map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}{calendarDays.map((day, index) => { if (!day) return <span key={`blank-${index}`} />; const date = toDate(day); const isPast = date < today; return <button key={date} type="button" disabled={isPast} onClick={() => onDateChange(date)} className={`relative h-8 rounded-sm text-xs transition ${selectedDate === date ? 'bg-amber-200 font-bold text-zinc-950' : isPast ? 'cursor-not-allowed text-zinc-800' : 'text-zinc-300 hover:bg-zinc-800'} ${dayHasSlot(date) && selectedDate !== date ? 'ring-1 ring-emerald-400/60' : ''}`}>{day}</button>})}</div></section><section><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{language === 'DE' ? `Zeiten · ${selectedDate}` : `Horaires · ${selectedDate}`}</p><div className="grid grid-cols-3 gap-2">{suggestedTimes.map((time) => { const slot = timeSlots.find((item) => item.appointment_time.slice(0, 5) === time); const state = slot?.reserved_at ? 'reserved' : slot?.is_active ? 'open' : 'closed'; return <button type="button" key={time} disabled={state === 'reserved'} onClick={() => onToggleSlot(barber.id, selectedDate, time, slot)} className={`border px-2 py-3 font-mono text-sm transition ${state === 'reserved' ? 'cursor-not-allowed border-amber-200/40 bg-amber-200/10 text-amber-200' : state === 'open' ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300' : 'border-zinc-800 text-zinc-500 hover:border-emerald-400/60 hover:text-emerald-300'}`}>{time}</button>})}</div></section></div></article></AdminGermanContent>
}

function ReservationGroup({ group, pricesByService, onDeleteReservation, deletingReservationId, language }) {
  return (
    <AdminGermanContent language={language}>    <section className="overflow-hidden border border-zinc-800 bg-zinc-900/35">
      <header className="flex items-center gap-3 border-b border-white/30 bg-zinc-900 px-5 py-4">
        <span className="relative h-12 w-12 shrink-0">
          {group.imageUrl ? <img src={group.imageUrl} alt={`Photo de ${group.name}`} className="h-12 w-12 rounded-full border border-white object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white bg-black"><BrandLogo style="symbol" tone="light" className="!h-7 !w-7" /></span>}
          {group.imageUrl && <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-black bg-white"><BrandLogo style="symbol" tone="dark" className="!h-4 !w-4" /></span>}
        </span>
        <h3 className="font-display text-xl font-bold uppercase text-zinc-100">{group.name}</h3>
        <span className="ml-auto text-xs text-zinc-500">{language === 'DE' ? `${group.reservations.length} ${group.reservations.length === 1 ? 'Termin' : 'Termine'}` : `${group.reservations.length} rendez-vous`}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-[840px] w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            <tr><th className="px-5 py-4">Client</th><th className="px-5 py-4">Téléphone</th><th className="px-5 py-4">Prestation</th><th className="px-5 py-4">Prix</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Heure</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {group.reservations.map((reservation) => (
              <tr key={reservation.id} className="transition-colors hover:bg-zinc-900/80">
                <td className="px-5 py-4 font-semibold text-zinc-200">{reservation.client_name}</td>
                <td className="px-5 py-4 text-zinc-400">{reservation.client_phone}</td>
                <td className="px-5 py-4 text-zinc-300">{reservation.service_name}</td>
                <td className="px-5 py-4"><span className="price-badge">{formatSalonPrice(pricesByService.get(reservation.service_name)) || '—'}</span></td>
                <td className="px-5 py-4 text-zinc-300">{formatDate(reservation.appointment_date, language)}</td>
                <td className="px-5 py-4 font-mono text-zinc-300">{reservation.appointment_time?.slice(0, 5) ?? '—'}</td>
                <td className="px-5 py-4"><span className={reservation.status === 'cancelled' ? 'text-zinc-500' : 'text-emerald-400'}>{reservation.status === 'cancelled' ? 'Annulé' : 'Confirmé'}</span></td>
                <td className="px-5 py-4"><button type="button" onClick={() => void onDeleteReservation(reservation)} disabled={Boolean(deletingReservationId)} aria-label={`Supprimer le rendez-vous de ${reservation.client_name}`} title="Supprimer le rendez-vous" className="rounded-full border border-red-400/40 p-2 text-red-300 hover:border-red-300 hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-50"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section></AdminGermanContent>
  )
}
