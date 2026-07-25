import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

const STORAGE_VERSION = 2;
const STATE_FILE = `${FileSystem.documentDirectory}visualize-state-v1.json`;
const IMAGE_DIR = `${FileSystem.documentDirectory}visualize-images/`;
const MAX_DECK_SLIDES = 10;
const MAX_WHY_PEOPLE = 12;
const LIFE_UPDATE_ANIMATION_VERSION = "life-reveal-v8";
const QUOTE_RITUAL_VERSION = "quote-ritual-v6";
const SUPPORTED_LANGUAGE_IDS = ["en", "es", "fr", "pt", "zh"];

function normalizeLanguageId(locale) {
  const normalized = String(locale || "").trim().toLowerCase();
  if (!normalized) return "en";
  if (normalized.startsWith("zh")) return "zh";
  const base = normalized.split(/[-_]/)[0];
  return SUPPORTED_LANGUAGE_IDS.includes(base) ? base : "en";
}

function detectPreferredLanguage() {
  const candidates = [];
  try {
    candidates.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch (error) {}
  try {
    const settings = NativeModules.SettingsManager?.settings || {};
    candidates.push(settings.AppleLocale);
    candidates.push(...(settings.AppleLanguages || []));
  } catch (error) {}
  const detected = candidates.map(normalizeLanguageId).find((language) => language !== "en");
  return detected || "en";
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dayNumberFromKey(dateKey) {
  const parts = String(dateKey || todayKey()).split("-").map(Number);
  const year = parts[0] || 1970;
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function quoteForDate(dateKey = todayKey()) {
  return dailyQuotes[quoteIndexForDate(dateKey)];
}

function quoteIndexForDate(dateKey = todayKey()) {
  if (!dailyQuotes.length) return 0;
  return dayNumberFromKey(dateKey) % dailyQuotes.length;
}

function softImpact() {
  if (Platform.OS === "web") return;
  Vibration.vibrate(7);
}

const blankState = {
  storageVersion: STORAGE_VERSION,
  localInstallId: uid("install"),
  profile: {
    complete: false,
    name: "",
    age: "",
    expectancy: 85,
    createdAt: "",
    updatedAt: "",
    lastAnimatedDate: "",
    lastQuoteDate: "",
    lastQuoteRitualVersion: "",
    lastSnapshot: null,
    lifeUpdateAnimationVersion: ""
  },
  dailyTasks: [],
  longGoals: [],
  whyPeople: [],
  visionSlides: [],
  antiSlides: [],
  selfSpeeches: [],
  activeSpeechIndex: 0,
  settings: {
    darkMode: true,
    notifications: false,
    language: detectPreferredLanguage(),
    voiceProfileId: "maya"
  },
  sync: {
    mode: "local",
    cloudEnabled: false,
    cloudUserId: "",
    migrationStatus: "not-started",
    lastSyncedAt: "",
    hasLocalChanges: false,
    localCreatedAt: nowIso(),
    localUpdatedAt: ""
  }
};

const tabs = [
  { id: "life", glyph: "life" },
  { id: "goals", glyph: "people" },
  { id: "vision", glyph: "vision" },
  { id: "anti", glyph: "anti" },
  { id: "speech", glyph: "voice" }
];

const languages = [
  { id: "en", label: "English", speech: "en-US" },
  { id: "es", label: "Spanish", speech: "es-ES" },
  { id: "fr", label: "French", speech: "fr-FR" },
  { id: "pt", label: "Portuguese", speech: "pt-PT" },
  { id: "zh", label: "Chinese", speech: "zh-CN" }
];

const voiceProfiles = [
  { id: "maya", name: "Maya", note: "Warm female", rate: 0.86, pitch: 1.04 },
  { id: "elias", name: "Elias", note: "Calm male", rate: 0.84, pitch: 0.9 },
  { id: "nora", name: "Nora", note: "Grounded female", rate: 0.88, pitch: 0.98 },
  { id: "matteo", name: "Matteo", note: "Steady male", rate: 0.82, pitch: 0.86 }
];

const dailyQuotes = [
  { text: "If there is no struggle, there is no progress.", author: "Frederick Douglass", source: "Wikiquote" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Diligence is the mother of good luck.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Resolve to perform what you ought; perform without fail what you resolve.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Dost thou love life? Then do not squander time.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "He that can have patience can have what he will.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Never leave that till tomorrow which you can do today.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Little strokes fell great oaks.", author: "Benjamin Franklin", source: "Bartlett" },
  { text: "Victory belongs to the most persevering.", author: "Napoleon Bonaparte", source: "Wikiquote" },
  { text: "The harder the conflict, the more glorious the triumph.", author: "Thomas Paine", source: "Project Gutenberg" },
  { text: "Either I will find a way, or make one.", author: "Hannibal", source: "Bartlett" },
  { text: "Fortune favors the brave.", author: "Virgil", source: "Bartlett" },
  { text: "He who has begun has half done.", author: "Horace", source: "Bartlett" },
  { text: "Begin, be bold, and venture to be wise.", author: "Horace", source: "Bartlett" },
  { text: "Rule your mind, or it will rule you.", author: "Horace", source: "Bartlett" },
  { text: "Seize the day.", author: "Horace", source: "Bartlett" },
  { text: "Dream lofty dreams, and as you dream, so shall you become.", author: "James Allen", source: "Project Gutenberg" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", source: "Project Gutenberg" },
  { text: "He who conquers himself is mighty.", author: "Lao Tzu", source: "Project Gutenberg" },
  { text: "Great acts are made up of small deeds.", author: "Lao Tzu", source: "Project Gutenberg" },
  { text: "Cherish your visions; cherish your ideals.", author: "James Allen", source: "Project Gutenberg" },
  { text: "Well begun is half done.", author: "Aristotle", source: "Bartlett" },
  { text: "The greatest achievement was at first and for a time a dream.", author: "James Allen", source: "Project Gutenberg" },
  { text: "Small opportunities are often the beginning of great enterprises.", author: "Demosthenes", source: "Bartlett" },
  { text: "Practice is the best of all instructors.", author: "Publilius Syrus", source: "Bartlett" },
  { text: "Strike while the iron is hot.", author: "Proverb", source: "Bartlett" },
  { text: "Valor grows by daring, fear by holding back.", author: "Publilius Syrus", source: "Bartlett" },
  { text: "Dreams are the seedlings of realities.", author: "James Allen", source: "Project Gutenberg" },
  { text: "Our remedies oft in ourselves do lie.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Action is eloquence.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Strong reasons make strong actions.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Once more unto the breach.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Things won are done; joy's soul lies in the doing.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Defer no time, delays have dangerous ends.", author: "William Shakespeare", source: "Bartlett" },
  { text: "There is nothing either good or bad, but thinking makes it so.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Our doubts are traitors, and make us lose the good we might win.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Be great in act, as you have been in thought.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Boldness be my friend.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Men at some time are masters of their fates.", author: "William Shakespeare", source: "Bartlett" },
  { text: "Without ambition one starts nothing.", author: "Ralph Waldo Emerson", source: "Bartlett" },
  { text: "Nothing great was ever achieved without enthusiasm.", author: "Ralph Waldo Emerson", source: "Bartlett" },
  { text: "Make the most of yourself, for that is all there is of you.", author: "Ralph Waldo Emerson", source: "Bartlett" },
  { text: "Always do what you are afraid to do.", author: "Ralph Waldo Emerson", source: "Bartlett" },
  { text: "Do the thing and you shall have the power.", author: "Ralph Waldo Emerson", source: "Bartlett" },
  { text: "Self-trust is the first secret of success.", author: "Ralph Waldo Emerson", source: "Bartlett" },
  { text: "Trust thyself: every heart vibrates to that iron string.", author: "Ralph Waldo Emerson", source: "Bartlett" },
  { text: "The vision that you glorify in your mind is what you will build your life by.", author: "James Allen", source: "Project Gutenberg" },
  { text: "Go confidently in the direction of your dreams.", author: "Henry David Thoreau", source: "Project Gutenberg" },
  { text: "Live the life you have imagined.", author: "Henry David Thoreau", source: "Project Gutenberg" },
  { text: "First say to yourself what you would be; then do what you have to do.", author: "Epictetus", source: "Project Gutenberg" },
  { text: "No great thing is created suddenly.", author: "Epictetus", source: "Project Gutenberg" },
  { text: "No man is free who is not master of himself.", author: "Epictetus", source: "Project Gutenberg" },
  { text: "Practice yourself in little things; then proceed to greater.", author: "Epictetus", source: "Project Gutenberg" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca", source: "Project Gutenberg" },
  { text: "Achievement is the crown of effort.", author: "James Allen", source: "Project Gutenberg" },
  { text: "It is not that we have little time, but that we waste much.", author: "Seneca", source: "Project Gutenberg" },
  { text: "No man was ever wise by chance.", author: "Seneca", source: "Project Gutenberg" },
  { text: "He who is brave is free.", author: "Seneca", source: "Project Gutenberg" },
  { text: "No prize fighter can go with high spirits into the strife if he has never been beaten black and blue.", author: "Seneca", source: "Project Gutenberg" },
  { text: "Begin at once to live.", author: "Seneca", source: "Project Gutenberg" },
  { text: "While we wait for life, life passes.", author: "Seneca", source: "Project Gutenberg" },
  { text: "Waste no more time talking about what a good man ought to be. Be one.", author: "Marcus Aurelius", source: "Project Gutenberg" },
  { text: "The impediment to action advances action.", author: "Marcus Aurelius", source: "Project Gutenberg" },
  { text: "Because a thing seems difficult for you, do not think it impossible.", author: "Marcus Aurelius", source: "Project Gutenberg" },
  { text: "The blazing fire makes flame and brightness out of everything thrown into it.", author: "Marcus Aurelius", source: "Project Gutenberg" },
  { text: "Do every act of your life as if it were your last.", author: "Marcus Aurelius", source: "Project Gutenberg" },
  { text: "What stands in the way becomes the way.", author: "Marcus Aurelius", source: "Project Gutenberg" },
  { text: "A man can only rise, conquer, and achieve by lifting up his thoughts.", author: "James Allen", source: "Project Gutenberg" },
  { text: "Let us, then, be up and doing.", author: "Henry Wadsworth Longfellow", source: "Bartlett" },
  { text: "Act in the living present.", author: "Henry Wadsworth Longfellow", source: "Bartlett" },
  { text: "The heights by great men reached and kept were not attained by sudden flight.", author: "Henry Wadsworth Longfellow", source: "Bartlett" },
  { text: "Still achieving, still pursuing, learn to labor and to wait.", author: "Henry Wadsworth Longfellow", source: "Bartlett" },
  { text: "To strive, to seek, to find, and not to yield.", author: "Alfred, Lord Tennyson", source: "Bartlett" },
  { text: "It is not too late to seek a newer world.", author: "Alfred, Lord Tennyson", source: "Bartlett" },
  { text: "Do not wait for extraordinary opportunities; seize common occasions and make them great.", author: "Orison Swett Marden", source: "Project Gutenberg" },
  { text: "Grow old along with me! The best is yet to be.", author: "Robert Browning", source: "Bartlett" },
  { text: "The best is yet to be.", author: "Robert Browning", source: "Bartlett" },
  { text: "He never turned his back but marched breast forward.", author: "Robert Browning", source: "Bartlett" },
  { text: "Act well your part; there all the honour lies.", author: "Alexander Pope", source: "Bartlett" },
  { text: "The golden opportunity you are seeking is in yourself.", author: "Orison Swett Marden", source: "Project Gutenberg" },
  { text: "Great works are performed not by strength, but perseverance.", author: "Samuel Johnson", source: "Bartlett" },
  { text: "Few things are impossible to diligence and skill.", author: "Samuel Johnson", source: "Bartlett" },
  { text: "The will to do springs from the knowledge that we can do.", author: "James Allen", source: "Project Gutenberg" },
  { text: "A wise man will make more opportunities than he finds.", author: "Francis Bacon", source: "Bartlett" },
  { text: "Weak men wait for opportunities; strong men make them.", author: "Orison Swett Marden", source: "Project Gutenberg" },
  { text: "Where the willingness is great, the difficulties cannot be great.", author: "Niccolo Machiavelli", source: "Project Gutenberg" },
  { text: "Awake, arise, or be forever fallen.", author: "John Milton", source: "Bartlett" },
  { text: "Believe you can and you are halfway there.", author: "Theodore Roosevelt", source: "Project Gutenberg" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", source: "Project Gutenberg" },
  { text: "It is hard to fail, but worse never to have tried to succeed.", author: "Theodore Roosevelt", source: "Project Gutenberg" },
  { text: "The credit belongs to the man who is actually in the arena.", author: "Theodore Roosevelt", source: "Project Gutenberg" },
  { text: "Always bear in mind your own resolution to succeed.", author: "Abraham Lincoln", source: "Wikiquote" },
  { text: "Leave nothing for tomorrow which can be done today.", author: "Abraham Lincoln", source: "Wikiquote" },
  { text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche", source: "Project Gutenberg" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche", source: "Project Gutenberg" },
  { text: "Become who you are.", author: "Friedrich Nietzsche", source: "Project Gutenberg" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", source: "Wikiquote" },
  { text: "Courage is resistance to fear, mastery of fear, not absence of fear.", author: "Mark Twain", source: "Wikiquote" }
];

const copy = {
  en: {
    "tab.life": "Life",
    "tab.goals": "For who",
    "tab.vision": "Vision",
    "tab.anti": "Anti",
    "tab.speech": "Speech",
    "setup.kicker": "Profile setup",
    "setup.title": "Build your life clock first.",
    "setup.body": "Visualize starts empty. Create your profile, then add your why, images, and self speech step by step.",
    "setup.name": "First name",
    "setup.age": "Age",
    "setup.estimate": "Life estimate, example 85",
    "setup.create": "Create profile",
    "life.kicker": "Life clock",
    "life.days": "estimated days left",
    "life.summary": "Based on age {age} and a life estimate of {expectancy}. Not a prediction, a reminder.",
    "life.weeks": "weeks",
    "life.months": "months",
    "life.used": "used",
    "life.monthMap": "Life by months",
    "life.monthMapBody": "Each dot is one month. Filled dots are already spent.",
    "quote.kicker": "Daily quote",
    "quote.title": "Read it. Move.",
    "quote.open": "open",
    "quote.close": "Carry it",
    "goals.daily": "Daily tasks",
    "goals.long": "Long-term goals",
    "goals.dailyTitle": "What moves today forward?",
    "goals.longTitle": "What are you building this year?",
    "goals.body": "Add up to 5 items and manually move the progress bar.",
    "goals.addTask": "Add task",
    "goals.addGoal": "Add goal",
    "goals.emptyTitle": "Nothing here yet.",
    "goals.emptyBody": "Start with one small action or one long-term goal.",
    "goals.complete": "{progress}% complete",
    "why.title": "Who are you doing this for?",
    "why.body": "Upload photos of the people behind your effort: family, an ex you want to outgrow, the child you were, a future child, a rival, or someone you want to prove wrong.",
    "why.examples": "family|younger self|future child|prove them wrong",
    "why.add": "Add people",
    "why.emptyTitle": "No faces here yet.",
    "why.emptyBody": "Add the people, memories, or future people that make your goals personal.",
    "deck.visionTitle": "Create your Vision",
    "deck.antiTitle": "Create your Anti-vision",
    "deck.visionBody": "Start with photos of identity, environment, people, and the future you want to make familiar.",
    "deck.antiBody": "Start with photos of the drift, costs, and future you refuse to normalize.",
    "deck.add": "Add images",
    "deck.play": "Play",
    "deck.emptyTitle": "No images yet.",
    "deck.emptyBody": "The deck starts empty. Add photos from this iPhone to keep them saved locally.",
    "speech.title": "Self speech",
    "speech.heading": "Script your inner voice.",
    "speech.body": "Write the self-talk you want to hear repeatedly. Keep it personal, direct, and believable.",
    "speech.library": "Scripts",
    "speech.current": "Current script",
    "speech.titlePlaceholder": "Title",
    "speech.textPlaceholder": "Write your speech here",
    "speech.save": "Save",
    "speech.new": "New",
    "speech.listen": "Listen",
    "speech.stop": "Stop",
    "speech.emptyDraft": "Empty draft",
    "speech.voice": "Voice",
    "speech.swipe": "Swipe to change voice",
    "speech.ready": "Ready",
    "speech.playing": "Playing",
    "speech.words": "words",
    "profile.kicker": "Local-only profile",
    "profile.storageTitle": "Device storage",
    "profile.storageBody": "Saved on this iPhone only. Closing the app or restarting the phone will keep the data. Deleting the app removes the local data.",
    "profile.cloudTitle": "Cloud-ready data",
    "profile.cloudBody": "Your local profile, goals, images, and speeches have stable local IDs. When cloud sync is added, this device can upload its existing data into your account before sync is turned on.",
    "profile.deviceKey": "Device key",
    "profile.appearance": "Appearance",
    "profile.darkMode": "Dark mode",
    "profile.notifications": "Notifications later",
    "profile.language": "Language",
    "profile.reset": "Reset this device",
    "profile.close": "Close",
    "player.close": "Close",
    "alert.profile": "Profile",
    "alert.addName": "Add your first name first.",
    "alert.addAge": "Add your age first.",
    "alert.goals": "Goals",
    "alert.maxGoals": "Keep this list focused: maximum 5 items.",
    "alert.photos": "Photos",
    "alert.allowPhotos": "Allow photo access to add images to your deck.",
    "alert.deckFull": "Deck full",
    "alert.maxImages": "Maximum {max} images for now.",
    "alert.deck": "Deck",
    "alert.addImagesFirst": "Add images first.",
    "alert.selfSpeech": "Self speech",
    "alert.writeSpeech": "Write the text you want to listen to first.",
    "alert.writeSpeechPlay": "Write a speech first.",
    "alert.resetTitle": "Reset local data",
    "alert.resetBody": "This removes the profile, goals, images, and self speeches from this device.",
    "alert.cancel": "Cancel",
    "alert.reset": "Reset"
  },
  es: {
    "tab.life": "Vida", "tab.goals": "Por quien", "tab.vision": "Vision", "tab.anti": "Anti", "tab.speech": "Voz",
    "setup.kicker": "Crear perfil", "setup.title": "Crea tu reloj de vida.", "setup.body": "Empieza vacio. Luego agregas tu por que, imagenes y self speech paso a paso.", "setup.name": "Nombre", "setup.age": "Edad", "setup.estimate": "Estimacion de vida, ejemplo 85", "setup.create": "Crear perfil",
    "life.kicker": "Reloj de vida", "life.days": "dias estimados restantes", "life.summary": "Basado en edad {age} y una estimacion de vida de {expectancy}. No es una prediccion, es un recordatorio.", "life.weeks": "semanas", "life.months": "meses", "life.used": "usado", "life.monthMap": "Vida por meses", "life.monthMapBody": "Cada punto es un mes. Los puntos llenos ya pasaron.",
    "goals.daily": "Tareas diarias", "goals.long": "Metas a largo plazo", "goals.dailyTitle": "Que hace avanzar el dia?", "goals.longTitle": "Que estas construyendo este ano?", "goals.body": "Agrega hasta 5 items y mueve manualmente la barra de progreso.", "goals.addTask": "Agregar tarea", "goals.addGoal": "Agregar meta", "goals.emptyTitle": "Todavia no hay nada.", "goals.emptyBody": "Empieza con una pequena accion o una meta a largo plazo.", "goals.complete": "{progress}% completo",
    "why.title": "Por quien haces esto?", "why.body": "Sube fotos de las personas detras de tu esfuerzo: familia, un ex que quieres superar, tu yo de nino, un futuro hijo, un rival o alguien a quien quieres demostrar que se equivoco.", "why.examples": "familia|tu yo pequeno|futuro hijo|demostrarles", "why.add": "Agregar personas", "why.emptyTitle": "Aun no hay rostros.", "why.emptyBody": "Agrega personas, recuerdos o personas futuras que vuelvan tus metas personales.",
    "deck.visionTitle": "Crea tu Vision", "deck.antiTitle": "Crea tu Anti-vision", "deck.visionBody": "Empieza con fotos de identidad, ambiente, personas y el futuro que quieres volver familiar.", "deck.antiBody": "Empieza con fotos del desvio, los costes y el futuro que te niegas a normalizar.", "deck.add": "Agregar imagenes", "deck.play": "Reproducir", "deck.emptyTitle": "Sin imagenes aun.", "deck.emptyBody": "El deck empieza vacio. Agrega fotos desde este iPhone para guardarlas localmente.",
    "speech.title": "Self speech", "speech.body": "Escribe el dialogo interno que quieres escuchar repetidamente. Hazlo personal, directo y creible.", "speech.titlePlaceholder": "Titulo", "speech.textPlaceholder": "Escribe tu self speech aqui", "speech.save": "Guardar", "speech.new": "Nuevo", "speech.listen": "Escuchar", "speech.stop": "Stop", "speech.emptyDraft": "Borrador vacio",
    "profile.kicker": "Perfil local", "profile.storageTitle": "Guardado en el dispositivo", "profile.storageBody": "Guardado solo en este iPhone. Al cerrar la app o reiniciar el telefono, los datos se mantienen. Si eliminas la app, se eliminan los datos locales.", "profile.cloudTitle": "Datos listos para cloud", "profile.cloudBody": "Tu perfil, metas, imagenes y speeches locales tienen IDs estables. Cuando agreguemos cloud sync, este dispositivo podra subir sus datos existentes antes de activar la sincronizacion.", "profile.deviceKey": "Clave dispositivo", "profile.appearance": "Apariencia", "profile.darkMode": "Modo oscuro", "profile.notifications": "Notificaciones luego", "profile.language": "Idioma", "profile.reset": "Resetear este dispositivo", "profile.close": "Cerrar", "player.close": "Cerrar",
    "alert.profile": "Perfil", "alert.addName": "Agrega tu nombre primero.", "alert.addAge": "Agrega tu edad primero.", "alert.goals": "Metas", "alert.maxGoals": "Mantén la lista enfocada: maximo 5 items.", "alert.photos": "Fotos", "alert.allowPhotos": "Permite acceso a fotos para agregarlas a tu deck.", "alert.deckFull": "Deck lleno", "alert.maxImages": "Maximo {max} imagenes por ahora.", "alert.deck": "Deck", "alert.addImagesFirst": "Agrega imagenes primero.", "alert.selfSpeech": "Self speech", "alert.writeSpeech": "Escribe primero el texto que quieres escuchar.", "alert.writeSpeechPlay": "Escribe un speech primero.", "alert.resetTitle": "Resetear datos locales", "alert.resetBody": "Esto elimina perfil, metas, imagenes y self speeches de este dispositivo.", "alert.cancel": "Cancelar", "alert.reset": "Resetear"
  },
  fr: {
    "tab.life": "Vie", "tab.goals": "Pourquoi", "tab.vision": "Vision", "tab.anti": "Anti", "tab.speech": "Voix",
    "setup.kicker": "Creation profil", "setup.title": "Cree ton horloge de vie.", "setup.body": "L'app commence vide. Ajoute ensuite ton pourquoi, tes images et ton self speech.", "setup.name": "Prenom", "setup.age": "Age", "setup.estimate": "Estimation de vie, exemple 85", "setup.create": "Creer profil",
    "life.kicker": "Horloge de vie", "life.days": "jours estimes restants", "life.summary": "Base sur l'age {age} et une estimation de vie de {expectancy}. Ce n'est pas une prediction, c'est un rappel.", "life.weeks": "semaines", "life.months": "mois", "life.used": "utilise", "life.monthMap": "Vie par mois", "life.monthMapBody": "Chaque point est un mois. Les points remplis sont deja passes.",
    "goals.daily": "Taches du jour", "goals.long": "Objectifs long terme", "goals.dailyTitle": "Qu'est-ce qui fait avancer aujourd'hui?", "goals.longTitle": "Que construis-tu cette annee?", "goals.body": "Ajoute jusqu'a 5 elements et ajuste manuellement la progression.", "goals.addTask": "Ajouter tache", "goals.addGoal": "Ajouter objectif", "goals.emptyTitle": "Rien pour l'instant.", "goals.emptyBody": "Commence avec une petite action ou un objectif long terme.", "goals.complete": "{progress}% termine",
    "why.title": "Pour qui fais-tu ca?", "why.body": "Ajoute les photos des personnes derriere ton effort: famille, un ex que tu veux depasser, l'enfant que tu etais, un futur enfant, un rival ou quelqu'un a qui tu veux prouver qu'il avait tort.", "why.examples": "famille|toi enfant|futur enfant|leur prouver", "why.add": "Ajouter personnes", "why.emptyTitle": "Aucun visage encore.", "why.emptyBody": "Ajoute les personnes, souvenirs ou futurs visages qui rendent tes objectifs personnels.",
    "deck.visionTitle": "Cree ta Vision", "deck.antiTitle": "Cree ton Anti-vision", "deck.visionBody": "Commence avec des photos d'identite, d'environnement, de personnes et du futur a rendre familier.", "deck.antiBody": "Commence avec des photos de la derive, du cout et du futur que tu refuses de normaliser.", "deck.add": "Ajouter images", "deck.play": "Lire", "deck.emptyTitle": "Aucune image.", "deck.emptyBody": "Le deck commence vide. Ajoute des photos depuis cet iPhone pour les garder localement.",
    "speech.title": "Self speech", "speech.body": "Ecris le discours interieur que tu veux ecouter souvent. Personnel, direct, credible.", "speech.titlePlaceholder": "Titre", "speech.textPlaceholder": "Ecris ton self speech ici", "speech.save": "Sauver", "speech.new": "Nouveau", "speech.listen": "Ecouter", "speech.stop": "Stop", "speech.emptyDraft": "Brouillon vide",
    "profile.kicker": "Profil local", "profile.storageTitle": "Stockage appareil", "profile.storageBody": "Sauve seulement sur cet iPhone. Fermer l'app ou redemarrer le telephone garde les donnees. Supprimer l'app supprime les donnees locales.", "profile.cloudTitle": "Donnees pretes pour le cloud", "profile.cloudBody": "Profil, objectifs, images et speeches locaux ont des IDs stables. Quand le cloud sync arrivera, cet appareil pourra envoyer ses donnees existantes avant d'activer la sync.", "profile.deviceKey": "Cle appareil", "profile.appearance": "Apparence", "profile.darkMode": "Mode sombre", "profile.notifications": "Notifications plus tard", "profile.language": "Langue", "profile.reset": "Reinitialiser", "profile.close": "Fermer", "player.close": "Fermer",
    "alert.profile": "Profil", "alert.addName": "Ajoute ton prenom d'abord.", "alert.addAge": "Ajoute ton age d'abord.", "alert.goals": "Objectifs", "alert.maxGoals": "Garde la liste concentree: maximum 5 elements.", "alert.photos": "Photos", "alert.allowPhotos": "Autorise l'acces aux photos pour les ajouter au deck.", "alert.deckFull": "Deck plein", "alert.maxImages": "Maximum {max} images pour l'instant.", "alert.deck": "Deck", "alert.addImagesFirst": "Ajoute d'abord des images.", "alert.selfSpeech": "Self speech", "alert.writeSpeech": "Ecris d'abord le texte a ecouter.", "alert.writeSpeechPlay": "Ecris d'abord un speech.", "alert.resetTitle": "Reinitialiser les donnees locales", "alert.resetBody": "Cela supprime le profil, les objectifs, les images et les self speeches de cet appareil.", "alert.cancel": "Annuler", "alert.reset": "Reinitialiser"
  },
  pt: {
    "tab.life": "Vida", "tab.goals": "Por quem", "tab.vision": "Visao", "tab.anti": "Anti", "tab.speech": "Voz",
    "setup.kicker": "Criar perfil", "setup.title": "Crie seu relogio de vida.", "setup.body": "O app comeca vazio. Depois adicione seu por que, imagens e self speech.", "setup.name": "Nome", "setup.age": "Idade", "setup.estimate": "Estimativa de vida, exemplo 85", "setup.create": "Criar perfil",
    "life.kicker": "Relogio de vida", "life.days": "dias estimados restantes", "life.summary": "Baseado na idade {age} e estimativa de vida de {expectancy}. Nao e previsao, e lembrete.", "life.weeks": "semanas", "life.months": "meses", "life.used": "usado", "life.monthMap": "Vida por meses", "life.monthMapBody": "Cada ponto e um mes. Pontos preenchidos ja passaram.",
    "goals.daily": "Tarefas diarias", "goals.long": "Metas de longo prazo", "goals.dailyTitle": "O que move hoje para frente?", "goals.longTitle": "O que voce esta construindo este ano?", "goals.body": "Adicione ate 5 itens e mova manualmente a barra de progresso.", "goals.addTask": "Adicionar tarefa", "goals.addGoal": "Adicionar meta", "goals.emptyTitle": "Nada aqui ainda.", "goals.emptyBody": "Comece com uma pequena acao ou uma meta de longo prazo.", "goals.complete": "{progress}% completo",
    "why.title": "Por quem voce faz isso?", "why.body": "Adicione fotos das pessoas por tras do seu esforco: familia, um ex que quer superar, voce quando crianca, um futuro filho, um rival ou alguem a quem quer provar que estava errado.", "why.examples": "familia|voce crianca|futuro filho|provar errado", "why.add": "Adicionar pessoas", "why.emptyTitle": "Ainda sem rostos.", "why.emptyBody": "Adicione pessoas, memorias ou pessoas futuras que tornam suas metas pessoais.",
    "deck.visionTitle": "Crie sua Visao", "deck.antiTitle": "Crie sua Anti-visao", "deck.visionBody": "Comece com fotos de identidade, ambiente, pessoas e do futuro que voce quer tornar familiar.", "deck.antiBody": "Comece com fotos do desvio, dos custos e do futuro que voce recusa normalizar.", "deck.add": "Adicionar imagens", "deck.play": "Reproduzir", "deck.emptyTitle": "Sem imagens ainda.", "deck.emptyBody": "O deck comeca vazio. Adicione fotos deste iPhone para salva-las localmente.",
    "speech.title": "Self speech", "speech.body": "Escreva o dialogo interno que quer ouvir repetidamente. Pessoal, direto e crivel.", "speech.titlePlaceholder": "Titulo", "speech.textPlaceholder": "Escreva seu self speech aqui", "speech.save": "Salvar", "speech.new": "Novo", "speech.listen": "Ouvir", "speech.stop": "Parar", "speech.emptyDraft": "Rascunho vazio",
    "profile.kicker": "Perfil local", "profile.storageTitle": "Armazenamento no dispositivo", "profile.storageBody": "Salvo apenas neste iPhone. Fechar o app ou reiniciar o telefone mantem os dados. Apagar o app remove os dados locais.", "profile.cloudTitle": "Dados prontos para cloud", "profile.cloudBody": "Perfil, metas, imagens e speeches locais tem IDs estaveis. Quando adicionarmos cloud sync, este dispositivo podera enviar os dados existentes antes de ativar a sincronizacao.", "profile.deviceKey": "Chave do dispositivo", "profile.appearance": "Aparencia", "profile.darkMode": "Modo escuro", "profile.notifications": "Notificacoes depois", "profile.language": "Idioma", "profile.reset": "Resetar dispositivo", "profile.close": "Fechar", "player.close": "Fechar",
    "alert.profile": "Perfil", "alert.addName": "Adicione seu nome primeiro.", "alert.addAge": "Adicione sua idade primeiro.", "alert.goals": "Metas", "alert.maxGoals": "Mantenha a lista focada: maximo 5 itens.", "alert.photos": "Fotos", "alert.allowPhotos": "Permita acesso as fotos para adiciona-las ao deck.", "alert.deckFull": "Deck cheio", "alert.maxImages": "Maximo {max} imagens por agora.", "alert.deck": "Deck", "alert.addImagesFirst": "Adicione imagens primeiro.", "alert.selfSpeech": "Self speech", "alert.writeSpeech": "Escreva primeiro o texto que quer ouvir.", "alert.writeSpeechPlay": "Escreva um speech primeiro.", "alert.resetTitle": "Resetar dados locais", "alert.resetBody": "Isso remove perfil, metas, imagens e self speeches deste dispositivo.", "alert.cancel": "Cancelar", "alert.reset": "Resetar"
  },
  zh: {
    "tab.life": "生命", "tab.goals": "目标", "tab.vision": "愿景", "tab.anti": "反愿景", "tab.speech": "自我对话",
    "setup.kicker": "创建资料", "setup.title": "先建立你的生命时钟。", "setup.body": "Visualize 会从空白开始。先创建资料，再一步步添加目标、图片和自我对话。", "setup.name": "名字", "setup.age": "年龄", "setup.estimate": "寿命估计，例如 85", "setup.create": "创建资料",
    "life.kicker": "生命时钟", "life.days": "预计剩余天数", "life.summary": "基于年龄 {age} 和寿命估计 {expectancy}。这不是预测，而是提醒。", "life.weeks": "周", "life.months": "月", "life.used": "已用", "life.monthMap": "按月显示生命", "life.monthMapBody": "每个点代表一个月。填满的点表示已经过去。",
    "goals.daily": "每日任务", "goals.long": "长期目标", "goals.dailyTitle": "今天什么能推动你前进？", "goals.longTitle": "今年你在建立什么？", "goals.body": "最多添加 5 项，并手动调整进度条。", "goals.addTask": "添加任务", "goals.addGoal": "添加目标", "goals.emptyTitle": "这里还没有内容。", "goals.emptyBody": "从一个小行动或一个长期目标开始。", "goals.complete": "完成 {progress}%",
    "deck.visionTitle": "创建你的愿景", "deck.antiTitle": "创建你的反愿景", "deck.visionBody": "添加你想成为什么样的人、想拥有什么、想和谁在一起的图片。", "deck.antiBody": "添加相反未来的图片：你不想成为什么、不想失去什么、不想容忍什么。", "deck.add": "添加图片", "deck.play": "播放", "deck.emptyTitle": "还没有图片。", "deck.emptyBody": "卡组从空白开始。从这台 iPhone 添加照片，并保存在本机。",
    "speech.title": "自我对话", "speech.body": "写下你想反复听到的自我对话。让它个人化、直接、可信。", "speech.titlePlaceholder": "标题", "speech.textPlaceholder": "在这里写下你的自我对话", "speech.save": "保存", "speech.new": "新建", "speech.listen": "聆听", "speech.stop": "停止", "speech.emptyDraft": "空草稿",
    "profile.kicker": "本地资料", "profile.storageTitle": "设备存储", "profile.storageBody": "只保存在这台 iPhone。关闭 app 或重启手机后数据仍会保留。删除 app 会删除本地数据。", "profile.cloudTitle": "可迁移到云端的数据", "profile.cloudBody": "你的本地资料、目标、图片和自我对话都有稳定的本地 ID。未来加入云同步时，这台设备可以先上传现有数据，再开启同步。", "profile.deviceKey": "设备键", "profile.appearance": "外观", "profile.darkMode": "深色模式", "profile.notifications": "稍后通知", "profile.language": "语言", "profile.reset": "重置此设备", "profile.close": "关闭", "player.close": "关闭",
    "alert.profile": "资料", "alert.addName": "请先填写名字。", "alert.addAge": "请先填写年龄。", "alert.goals": "目标", "alert.maxGoals": "保持专注：最多 5 项。", "alert.photos": "照片", "alert.allowPhotos": "允许访问照片，才能添加到卡组。", "alert.deckFull": "卡组已满", "alert.maxImages": "目前最多 {max} 张图片。", "alert.deck": "卡组", "alert.addImagesFirst": "请先添加图片。", "alert.selfSpeech": "自我对话", "alert.writeSpeech": "请先写下要聆听的文字。", "alert.writeSpeechPlay": "请先写一段自我对话。", "alert.resetTitle": "重置本地数据", "alert.resetBody": "这会从此设备删除资料、目标、图片和自我对话。", "alert.cancel": "取消", "alert.reset": "重置"
  }
};

Object.assign(copy.zh, {
  "tab.goals": "For who",
  "why.title": "Who are you doing this for?",
  "why.body": "Upload photos of family, the child you were, a future child, a rival, or someone you want to prove wrong.",
  "why.examples": "family|younger self|future child|prove them wrong",
  "why.add": "Add people",
  "why.emptyTitle": "No faces here yet.",
  "why.emptyBody": "Add the people, memories, or future people that make your goals personal.",
  "speech.voice": "Voice",
  "speech.heading": "Script your inner voice.",
  "speech.library": "Scripts",
  "speech.current": "Current script",
  "speech.swipe": "Swipe to change voice",
  "speech.ready": "Ready",
  "speech.playing": "Playing",
  "speech.words": "words",
  "quote.kicker": "Daily quote",
  "quote.title": "Read it. Move.",
  "quote.open": "open",
  "quote.close": "Carry it"
});

Object.assign(copy.es, {
  "speech.library": "Scripts",
  "speech.current": "Script actual"
});

Object.assign(copy.fr, {
  "speech.library": "Scripts",
  "speech.current": "Script actuel"
});

Object.assign(copy.pt, {
  "speech.library": "Scripts",
  "speech.current": "Script atual"
});

Object.assign(copy.en, {
  "life.updateTitle": "One day spent. Use the next one.",
  "life.updateSub": "Your clock moved. Make today earn its place.",
  "quote.close": "Start today"
});

Object.assign(copy.es, {
  "life.updateTitle": "Un dia paso. Usa el siguiente.",
  "life.updateSub": "Tu reloj avanzo. Haz que hoy valga.",
  "speech.heading": "Escribe tu voz interior.",
  "speech.voice": "Voz",
  "speech.swipe": "Desliza para cambiar voz",
  "speech.ready": "Listo",
  "speech.playing": "Reproduciendo",
  "speech.words": "palabras",
  "quote.kicker": "Cita diaria",
  "quote.title": "Leela. Avanza.",
  "quote.open": "abrir",
  "quote.close": "Llevarlo"
});

Object.assign(copy.fr, {
  "life.updateTitle": "Un jour est passe. Utilise le suivant.",
  "life.updateSub": "Ton horloge avance. Fais compter aujourd'hui.",
  "speech.heading": "Ecris ta voix interieure.",
  "speech.voice": "Voix",
  "speech.swipe": "Glisse pour changer la voix",
  "speech.ready": "Pret",
  "speech.playing": "Lecture",
  "speech.words": "mots",
  "quote.kicker": "Citation du jour",
  "quote.title": "Lis-la. Avance.",
  "quote.open": "ouvrir",
  "quote.close": "Garder"
});

Object.assign(copy.pt, {
  "life.updateTitle": "Um dia passou. Use o proximo.",
  "life.updateSub": "Seu relogio avancou. Faca hoje valer.",
  "speech.heading": "Escreva sua voz interior.",
  "speech.voice": "Voz",
  "speech.swipe": "Deslize para mudar voz",
  "speech.ready": "Pronto",
  "speech.playing": "Tocando",
  "speech.words": "palavras",
  "quote.kicker": "Citacao diaria",
  "quote.title": "Leia. Avance.",
  "quote.open": "abrir",
  "quote.close": "Levar comigo"
});

Object.assign(copy.zh, {
  "life.updateTitle": "One day spent. Use the next one.",
  "life.updateSub": "Your clock moved. Make today earn its place."
});

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function normalizeLocalRecord(record, prefix, localInstallId) {
  const value = record && typeof record === "object" ? record : {};
  const timestamp = value.createdAt || value.updatedAt || nowIso();
  return {
    ...value,
    id: value.id || uid(prefix),
    source: value.source || "local",
    syncStatus: value.syncStatus || "local",
    sourceInstallId: value.sourceInstallId || localInstallId,
    createdAt: value.createdAt || timestamp,
    updatedAt: value.updatedAt || timestamp
  };
}

function mergeStoredState(saved) {
  if (!saved || typeof saved !== "object") return blankState;
  const localInstallId = saved.localInstallId || uid("install");
  const profile = { ...blankState.profile, ...(saved.profile || {}) };
  if (profile.complete && !profile.updatedAt) {
    profile.updatedAt = profile.createdAt || nowIso();
  }
  return {
    ...blankState,
    ...saved,
    localInstallId,
    profile,
    settings: { ...blankState.settings, ...(saved.settings || {}) },
    sync: {
      ...blankState.sync,
      ...(saved.sync || {}),
      mode: (saved.sync && saved.sync.mode) || "local",
      cloudEnabled: Boolean(saved.sync && saved.sync.cloudEnabled),
      migrationStatus: (saved.sync && saved.sync.migrationStatus) || "not-started",
      localCreatedAt: (saved.sync && saved.sync.localCreatedAt) || nowIso()
    },
    dailyTasks: Array.isArray(saved.dailyTasks)
      ? saved.dailyTasks.map((item) => normalizeLocalRecord(item, "task", localInstallId))
      : [],
    longGoals: Array.isArray(saved.longGoals)
      ? saved.longGoals.map((item) => normalizeLocalRecord(item, "goal", localInstallId))
      : [],
    whyPeople: Array.isArray(saved.whyPeople)
      ? saved.whyPeople.map((item) => normalizeLocalRecord(item, "why", localInstallId))
      : [],
    visionSlides: Array.isArray(saved.visionSlides)
      ? saved.visionSlides.map((item) => normalizeLocalRecord(item, "vision", localInstallId))
      : [],
    antiSlides: Array.isArray(saved.antiSlides)
      ? saved.antiSlides.map((item) => normalizeLocalRecord(item, "anti", localInstallId))
      : [],
    selfSpeeches: Array.isArray(saved.selfSpeeches)
      ? saved.selfSpeeches.map((item) => normalizeLocalRecord(item, "speech", localInstallId))
      : []
  };
}

async function ensureImageDirectory() {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

function imageExtension(uri) {
  const clean = String(uri || "").split("?")[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

async function persistPickedImage(uri, kind) {
  await ensureImageDirectory();
  const destination = `${IMAGE_DIR}${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}.${imageExtension(uri)}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

function lifeStats(profile) {
  const age = clamp(profile.age, 0, 120);
  const expectancy = Math.max(clamp(profile.expectancy, 50, 120), age + 1);
  const now = new Date();
  const createdAt = profile.createdAt ? new Date(profile.createdAt) : now;
  const elapsedDays = Math.max(0, Math.floor((now - createdAt) / 86400000));
  const currentAge = Math.min(expectancy, age + elapsedDays / 365.25);
  const daysLeft = Math.max(0, Math.round((expectancy - currentAge) * 365.25));
  const weeksLeft = Math.round(daysLeft / 7);
  const monthsLeft = Math.round(daysLeft / 30.44);
  const totalMonths = Math.round(expectancy * 12);
  const spentMonths = Math.min(totalMonths, Math.round(currentAge * 12));
  const usedPercent = Math.min(100, Math.round((currentAge / expectancy) * 100));
  return { age, expectancy, daysLeft, weeksLeft, monthsLeft, totalMonths, spentMonths, usedPercent };
}

function lifeSnapshot(stats) {
  return {
    daysLeft: stats.daysLeft,
    weeksLeft: stats.weeksLeft,
    monthsLeft: stats.monthsLeft,
    totalMonths: stats.totalMonths,
    spentMonths: stats.spentMonths,
    usedPercent: stats.usedPercent
  };
}

function ProgressScrubber({ value, onChange }) {
  const widthRef = useRef(1);
  const commit = (locationX) => {
    const next = clamp(Math.round((locationX / widthRef.current) * 100), 0, 100);
    onChange(next);
  };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => commit(event.nativeEvent.locationX),
        onPanResponderMove: (event) => commit(event.nativeEvent.locationX)
      }),
    [onChange]
  );

  return (
    <View
      style={styles.progressTrack}
      onLayout={(event) => {
        widthRef.current = Math.max(1, event.nativeEvent.layout.width);
      }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.progressFill, { width: `${clamp(value, 0, 100)}%` }]} />
      <View style={[styles.progressKnob, { left: `${clamp(value, 0, 100)}%` }]} />
    </View>
  );
}

export default function App() {
  const [appState, setAppState] = useState(blankState);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState("life");
  const [tabDirection, setTabDirection] = useState(1);
  const [goalMode, setGoalMode] = useState("daily");
  const [draftGoal, setDraftGoal] = useState("");
  const [draftSpeechTitle, setDraftSpeechTitle] = useState("");
  const [draftSpeechText, setDraftSpeechText] = useState("");
  const [profileDraft, setProfileDraft] = useState(blankState.profile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const [speechPlaying, setSpeechPlaying] = useState(false);
  const [lifeUpdate, setLifeUpdate] = useState(null);
  const [quoteRevealOpen, setQuoteRevealOpen] = useState(false);
  const setupPulse = useRef(new Animated.Value(0)).current;
  const screenPulse = useRef(new Animated.Value(1)).current;
  const lifeUpdatePulse = useRef(new Animated.Value(0)).current;
  const playerPulse = useRef(new Animated.Value(0)).current;
  const quotePulse = useRef(new Animated.Value(0)).current;
  const speechPulse = useRef(new Animated.Value(0)).current;
  const lifeScrollRef = useRef(null);
  const voiceScrollRef = useRef(null);
  const appStateRef = useRef("active");

  const theme = appState.settings.darkMode ? darkTheme : lightTheme;
  const language = appState.settings.language || "en";
  const languageMeta = languages.find((item) => item.id === language) || languages[0];
  const activeVoiceProfile = voiceProfiles.find((item) => item.id === appState.settings.voiceProfileId) || voiceProfiles[0];
  const t = (key, values = {}) => {
    const template = (copy[language] && copy[language][key]) || copy.en[key] || key;
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value)),
      template
    );
  };
  const profileComplete = appState.profile.complete;
  const activeGoals = goalMode === "daily" ? appState.dailyTasks : appState.longGoals;
  const activeSpeech = appState.selfSpeeches[appState.activeSpeechIndex] || null;
  const dailyQuoteIndex = quoteIndexForDate();
  const dailyQuote = dailyQuotes[dailyQuoteIndex] || quoteForDate();
  const dailyQuoteOrdinal = `${dailyQuoteIndex + 1} / ${dailyQuotes.length}`;
  const dailyQuoteProgress = `${Math.round(((dailyQuoteIndex + 1) / Math.max(dailyQuotes.length, 1)) * 100)}%`;
  const screenOpacity = screenPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const screenTranslate = screenPulse.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const screenTranslateX = screenPulse.interpolate({ inputRange: [0, 1], outputRange: [tabDirection * 26, 0] });
  const screenScale = screenPulse.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const info = await FileSystem.getInfoAsync(STATE_FILE);
        if (info.exists) {
          const raw = await FileSystem.readAsStringAsync(STATE_FILE);
          if (mounted) {
            const merged = mergeStoredState(JSON.parse(raw));
            setAppState(merged);
            setProfileDraft(merged.profile);
            setDraftSpeechTitle(merged.selfSpeeches[merged.activeSpeechIndex]?.title || "");
            setDraftSpeechText(merged.selfSpeeches[merged.activeSpeechIndex]?.text || "");
          }
        }
      } catch (error) {
        Alert.alert("Local data", "The saved local profile could not be loaded.");
      } finally {
        if (mounted) setHydrated(true);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    FileSystem.writeAsStringAsync(STATE_FILE, JSON.stringify(appState)).catch(() => {});
  }, [appState, hydrated]);

  useEffect(() => {
    if (!speechPlaying) {
      speechPulse.stopAnimation();
      speechPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(speechPulse, { toValue: 1, duration: 760, useNativeDriver: true }),
        Animated.timing(speechPulse, { toValue: 0, duration: 620, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [speechPlaying, speechPulse]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(setupPulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(setupPulse, { toValue: 0, duration: 1300, useNativeDriver: true })
      ])
    ).start();
  }, [setupPulse]);

  useEffect(() => {
    screenPulse.setValue(0);
    Animated.timing(screenPulse, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true
    }).start();
  }, [tab, screenPulse]);

  useEffect(() => {
    if (!player) return;
    playerPulse.setValue(0);
    Animated.timing(playerPulse, {
      toValue: 1,
      duration: 620,
      useNativeDriver: true
    }).start();
  }, [player?.kind, player?.index, playerPulse]);

  useEffect(() => {
    if (!quoteRevealOpen) return;
    quotePulse.setValue(0);
    Animated.spring(quotePulse, {
      toValue: 1,
      friction: 8,
      tension: 72,
      useNativeDriver: true
    }).start();
  }, [quoteRevealOpen, quotePulse]);

  useEffect(() => {
    if (!player) return undefined;
    const timer = setInterval(() => {
      setPlayer((current) => {
        if (!current) return current;
        if (current.paused) return current;
        const deck = current.kind === "vision" ? appState.visionSlides : appState.antiSlides;
        if (!deck.length) return null;
        return { ...current, index: (current.index + 1) % deck.length };
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [player, appState.visionSlides, appState.antiSlides]);

  useEffect(() => {
    if (!hydrated || !profileComplete) return undefined;
    const timer = setTimeout(() => maybeRunDailyLifeUpdate(), 550);
    return () => clearTimeout(timer);
  }, [hydrated, profileComplete, appState.profile.lastAnimatedDate, appState.profile.lifeUpdateAnimationVersion]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway = appStateRef.current === "inactive" || appStateRef.current === "background";
      appStateRef.current = nextState;
      if (wasAway && nextState === "active") {
        if (tab === "life") setTimeout(() => resetLifeScroll(false), 120);
        setTimeout(() => maybeRunDailyLifeUpdate(), 260);
      }
    });
    return () => subscription.remove();
  }, [hydrated, profileComplete, tab, appState.profile.lastAnimatedDate, appState.profile.lastSnapshot, appState.profile.lifeUpdateAnimationVersion]);

  useEffect(() => {
    if (tab !== "life" || !profileComplete) return;
    setTimeout(() => resetLifeScroll(false), 80);
  }, [tab, profileComplete]);

  useEffect(() => {
    if (!hydrated || !profileComplete || quoteRevealOpen) return undefined;
    const dateKey = todayKey();
    if (
      appState.profile.lastQuoteDate === dateKey &&
      appState.profile.lastQuoteRitualVersion === QUOTE_RITUAL_VERSION
    ) {
      return undefined;
    }
    const lifeRevealPending =
      appState.profile.lastAnimatedDate !== dateKey ||
      appState.profile.lifeUpdateAnimationVersion !== LIFE_UPDATE_ANIMATION_VERSION;
    const timer = setTimeout(() => maybeShowDailyQuote(), lifeRevealPending ? 6900 : 900);
    return () => clearTimeout(timer);
  }, [hydrated, profileComplete, appState.profile.lastQuoteDate, appState.profile.lastQuoteRitualVersion, appState.profile.lastAnimatedDate, appState.profile.lifeUpdateAnimationVersion, quoteRevealOpen]);

  function updateState(mutator) {
    setAppState((current) => {
      const next = typeof mutator === "function" ? mutator(current) : mutator;
      const merged = mergeStoredState({ ...next, storageVersion: STORAGE_VERSION });
      return {
        ...merged,
        sync: {
          ...merged.sync,
          mode: merged.sync.mode || "local",
          migrationStatus: merged.sync.cloudEnabled ? merged.sync.migrationStatus : "local-ready",
          hasLocalChanges: true,
          localUpdatedAt: nowIso()
        }
      };
    });
  }

  function navigateTab(nextTab) {
    if (!nextTab || nextTab === tab) return;
    const currentIndex = tabs.findIndex((item) => item.id === tab);
    const nextIndex = tabs.findIndex((item) => item.id === nextTab);
    setTabDirection(nextIndex >= currentIndex ? 1 : -1);
    setTab(nextTab);
    if (nextTab === "life") setTimeout(() => resetLifeScroll(true), 120);
  }

  function resetLifeScroll(animated = true) {
    requestAnimationFrame(() => {
      lifeScrollRef.current?.scrollTo({ y: 0, animated });
    });
  }

  function saveProfile() {
    const name = String(profileDraft.name || "").trim();
    const age = clamp(profileDraft.age, 0, 120);
    const expectancy = clamp(profileDraft.expectancy || 85, 50, 120);
    if (!name) {
      Alert.alert(t("alert.profile"), t("alert.addName"));
      return;
    }
    if (age < 1) {
      Alert.alert(t("alert.profile"), t("alert.addAge"));
      return;
    }
    updateState((current) => {
      const timestamp = nowIso();
      const nextProfile = {
        complete: true,
        name,
        age,
        expectancy: Math.max(expectancy, age + 1),
        createdAt: current.profile.createdAt || timestamp,
        updatedAt: timestamp,
        lastAnimatedDate: "",
        lifeUpdateAnimationVersion: ""
      };
      nextProfile.lastSnapshot = lifeSnapshot(lifeStats(nextProfile));
      return { ...current, profile: nextProfile };
    });
    setProfileOpen(false);
  }

  function maybeRunDailyLifeUpdate() {
    if (!hydrated || !appState.profile.complete || lifeUpdate) return;
    const dateKey = todayKey();
    const shouldForceReveal = appState.profile.lifeUpdateAnimationVersion !== LIFE_UPDATE_ANIMATION_VERSION;
    if (appState.profile.lastAnimatedDate === dateKey && !shouldForceReveal) return;

    const currentStats = lifeStats(appState.profile);
    const currentSnapshot = lifeSnapshot(currentStats);
    const storedSnapshot = appState.profile.lastSnapshot;
    const fallbackPrevious = {
      ...currentSnapshot,
      daysLeft: currentSnapshot.daysLeft + 1,
      weeksLeft: Math.max(currentSnapshot.weeksLeft, Math.round((currentSnapshot.daysLeft + 1) / 7)),
      monthsLeft: Math.max(currentSnapshot.monthsLeft, Math.round((currentSnapshot.daysLeft + 1) / 30.44)),
      spentMonths: Math.max(0, currentSnapshot.spentMonths - 1),
      usedPercent: Math.max(0, currentSnapshot.usedPercent - 1)
    };
    const previous = storedSnapshot && typeof storedSnapshot === "object" && !shouldForceReveal ? storedSnapshot : fallbackPrevious;

    lifeUpdatePulse.setValue(0);
    navigateTab("life");
    setTimeout(() => resetLifeScroll(false), 80);
    setLifeUpdate({ previous, current: currentSnapshot });
    if (Platform.OS !== "web") Vibration.vibrate([0, 14, 70, 18]);
    updateState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        lastAnimatedDate: dateKey,
        lastSnapshot: currentSnapshot,
        lifeUpdateAnimationVersion: LIFE_UPDATE_ANIMATION_VERSION
      }
    }));

    Animated.sequence([
      Animated.timing(lifeUpdatePulse, { toValue: 0.34, duration: 1180, useNativeDriver: true }),
      Animated.timing(lifeUpdatePulse, { toValue: 0.78, duration: 3100, useNativeDriver: true }),
      Animated.timing(lifeUpdatePulse, { toValue: 1, duration: 1250, useNativeDriver: true })
    ]).start(() => {
      setTimeout(() => setLifeUpdate(null), 220);
    });
  }

  function addGoal() {
    const title = draftGoal.trim();
    if (!title) return;
    const timestamp = nowIso();
    const item = {
      id: uid("goal"),
      title,
      progress: 0,
      source: "local",
      syncStatus: "local",
      sourceInstallId: appState.localInstallId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    updateState((current) => {
      const key = goalMode === "daily" ? "dailyTasks" : "longGoals";
      if (current[key].length >= 5) {
        Alert.alert(t("alert.goals"), t("alert.maxGoals"));
        return current;
      }
      return { ...current, [key]: [...current[key], item] };
    });
    setDraftGoal("");
  }

  function updateGoalProgress(id, progress) {
    updateState((current) => {
      const key = goalMode === "daily" ? "dailyTasks" : "longGoals";
      const timestamp = nowIso();
      return {
        ...current,
        [key]: current[key].map((goal) => (goal.id === id ? { ...goal, progress, updatedAt: timestamp } : goal))
      };
    });
  }

  function removeGoal(id) {
    updateState((current) => ({
      ...current,
      dailyTasks: current.dailyTasks.filter((goal) => goal.id !== id),
      longGoals: current.longGoals.filter((goal) => goal.id !== id)
    }));
  }

  async function addWhyPeople() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("alert.photos"), t("alert.allowPhotos"));
      return;
    }
    const currentPeople = appState.whyPeople || [];
    const remaining = MAX_WHY_PEOPLE - currentPeople.length;
    if (remaining <= 0) {
      Alert.alert(t("alert.photos"), t("alert.maxImages", { max: MAX_WHY_PEOPLE }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.82,
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });
    if (result.canceled) return;
    const assets = (result.assets || []).slice(0, remaining);
    const savedPeople = [];
    for (const asset of assets) {
      if (!asset.uri) continue;
      const timestamp = nowIso();
      const localUri = await persistPickedImage(asset.uri, "why");
      savedPeople.push({
        id: uid("why"),
        imageUri: localUri,
        source: "local",
        syncStatus: "local",
        sourceInstallId: appState.localInstallId,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    if (!savedPeople.length) return;
    updateState((current) => ({ ...current, whyPeople: [...(current.whyPeople || []), ...savedPeople] }));
  }

  async function removeWhyPerson(id) {
    const person = (appState.whyPeople || []).find((item) => item.id === id);
    updateState((current) => ({ ...current, whyPeople: (current.whyPeople || []).filter((item) => item.id !== id) }));
    if (person?.imageUri) {
      FileSystem.deleteAsync(person.imageUri, { idempotent: true }).catch(() => {});
    }
  }

  async function addImages(kind) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("alert.photos"), t("alert.allowPhotos"));
      return;
    }
    const deckKey = kind === "vision" ? "visionSlides" : "antiSlides";
    const remaining = MAX_DECK_SLIDES - appState[deckKey].length;
    if (remaining <= 0) {
      Alert.alert(t("alert.deckFull"), t("alert.maxImages", { max: MAX_DECK_SLIDES }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.82,
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });
    if (result.canceled) return;
    const assets = (result.assets || []).slice(0, remaining);
    const savedSlides = [];
    for (const asset of assets) {
      if (!asset.uri) continue;
      const timestamp = nowIso();
      const localUri = await persistPickedImage(asset.uri, kind);
      savedSlides.push({
        id: uid("slide"),
        imageUri: localUri,
        source: "local",
        syncStatus: "local",
        sourceInstallId: appState.localInstallId,
        createdAt: timestamp,
        updatedAt: timestamp,
        title: kind === "vision" ? `Vision scene ${appState[deckKey].length + savedSlides.length + 1}` : `Anti-vision scene ${appState[deckKey].length + savedSlides.length + 1}`,
        caption:
          kind === "vision"
            ? "A concrete image of the future you are building."
            : "A clear reminder of the future you refuse to choose."
      });
    }
    if (!savedSlides.length) return;
    updateState((current) => ({ ...current, [deckKey]: [...current[deckKey], ...savedSlides] }));
  }

  async function removeSlide(kind, id) {
    const deckKey = kind === "vision" ? "visionSlides" : "antiSlides";
    const slide = appState[deckKey].find((item) => item.id === id);
    updateState((current) => ({ ...current, [deckKey]: current[deckKey].filter((item) => item.id !== id) }));
    if (slide?.imageUri) {
      FileSystem.deleteAsync(slide.imageUri, { idempotent: true }).catch(() => {});
    }
  }

  function saveSpeech() {
    const title = draftSpeechTitle.trim() || "Self speech";
    const text = draftSpeechText.trim();
    if (!text) {
      Alert.alert(t("alert.selfSpeech"), t("alert.writeSpeech"));
      return;
    }
    updateState((current) => {
      const existing = current.selfSpeeches[current.activeSpeechIndex];
      const timestamp = nowIso();
      if (!existing) {
        return {
          ...current,
          selfSpeeches: [{
            id: uid("speech"),
            title,
            text,
            source: "local",
            syncStatus: "local",
            sourceInstallId: current.localInstallId,
            createdAt: timestamp,
            updatedAt: timestamp
          }],
          activeSpeechIndex: 0
        };
      }
      return {
        ...current,
        selfSpeeches: current.selfSpeeches.map((speech, index) =>
          index === current.activeSpeechIndex ? { ...speech, title, text, updatedAt: timestamp } : speech
        )
      };
    });
  }

  function newSpeech() {
    stopSpeech();
    const timestamp = nowIso();
    updateState((current) => ({
      ...current,
      selfSpeeches: [...current.selfSpeeches, {
        id: uid("speech"),
        title: "",
        text: "",
        source: "local",
        syncStatus: "local",
        sourceInstallId: current.localInstallId,
        createdAt: timestamp,
        updatedAt: timestamp
      }],
      activeSpeechIndex: current.selfSpeeches.length
    }));
    setDraftSpeechTitle("");
    setDraftSpeechText("");
  }

  function selectSpeech(index) {
    stopSpeech();
    const speech = appState.selfSpeeches[index];
    updateState((current) => ({ ...current, activeSpeechIndex: index }));
    setDraftSpeechTitle(speech?.title || "");
    setDraftSpeechText(speech?.text || "");
  }

  function playSpeech() {
    const text = draftSpeechText.trim() || activeSpeech?.text || "";
    if (!text) {
      Alert.alert(t("alert.selfSpeech"), t("alert.writeSpeechPlay"));
      return;
    }
    Speech.stop();
    setSpeechPlaying(true);
    Speech.speak(text, {
      language: languageMeta.speech,
      rate: activeVoiceProfile.rate,
      pitch: activeVoiceProfile.pitch,
      onDone: () => setSpeechPlaying(false),
      onStopped: () => setSpeechPlaying(false),
      onError: () => setSpeechPlaying(false)
    });
  }

  function stopSpeech() {
    setSpeechPlaying(false);
    Speech.stop();
  }

  function selectVoiceProfile(index, { scroll = true } = {}) {
    const nextIndex = clamp(index, 0, voiceProfiles.length - 1);
    const profile = voiceProfiles[nextIndex];
    updateState((current) => ({
      ...current,
      settings: { ...current.settings, voiceProfileId: profile.id }
    }));
    if (scroll && voiceScrollRef.current) {
      voiceScrollRef.current.scrollTo({ x: nextIndex * 238, animated: true });
    }
  }

  function handleVoiceMomentumEnd(event) {
    const x = event.nativeEvent.contentOffset.x || 0;
    const index = clamp(Math.round(x / 238), 0, voiceProfiles.length - 1);
    selectVoiceProfile(index, { scroll: false });
  }

  function maybeShowDailyQuote(options = {}) {
    const force = Boolean(options.force);
    const dateKey = todayKey();
    if (!appState.profile.complete) return;
    if (
      !force &&
      appState.profile.lastQuoteDate === dateKey &&
      appState.profile.lastQuoteRitualVersion === QUOTE_RITUAL_VERSION
    ) {
      return;
    }
    softImpact();
    setQuoteRevealOpen(true);
    if (
      appState.profile.lastQuoteDate !== dateKey ||
      appState.profile.lastQuoteRitualVersion !== QUOTE_RITUAL_VERSION
    ) {
      updateState((current) => ({
        ...current,
        profile: {
          ...current.profile,
          lastQuoteDate: dateKey,
          lastQuoteRitualVersion: QUOTE_RITUAL_VERSION
        }
      }));
    }
  }

  function resetLocalData() {
    Alert.alert(t("alert.resetTitle"), t("alert.resetBody"), [
      { text: t("alert.cancel"), style: "cancel" },
      {
        text: t("alert.reset"),
        style: "destructive",
        onPress: async () => {
          await FileSystem.deleteAsync(STATE_FILE, { idempotent: true }).catch(() => {});
          await FileSystem.deleteAsync(IMAGE_DIR, { idempotent: true }).catch(() => {});
          Speech.stop();
          setSpeechPlaying(false);
          setAppState(blankState);
          setProfileDraft(blankState.profile);
          setDraftSpeechTitle("");
          setDraftSpeechText("");
          navigateTab("life");
        }
      }
    ]);
  }

  function renderOnboarding() {
    const scale = setupPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
    const translateY = setupPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    const previewAge = clamp(Number(profileDraft.age) || 28, 1, 120);
    const previewExpectancy = Math.max(clamp(Number(profileDraft.expectancy) || 85, 50, 120), previewAge + 1);
    const previewMonths = 84;
    const previewSpent = clamp(Math.round((previewAge / previewExpectancy) * previewMonths), 1, previewMonths - 1);
    const previewRemainingYears = Math.max(1, Math.round(previewExpectancy - previewAge));
    const previewDots = Array.from({ length: previewMonths }, (_, index) => index);
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.onboardingShell, { backgroundColor: theme.bg }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.onboardingContent}
        >
          <View style={[styles.setupCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
            <Animated.View style={[styles.setupMiniLogo, { transform: [{ scale }, { translateY }] }]}>
              <View style={styles.logoSlash} />
              <View style={styles.logoSlashSecond} />
              <View style={styles.logoDot} />
            </Animated.View>
            <Text style={[styles.setupKicker, { color: theme.muted }]}>{t("setup.kicker")}</Text>
            <Text style={[styles.setupTitle, { color: theme.ink }]}>{t("setup.title")}</Text>
            <Text style={[styles.setupText, { color: theme.muted }]}>
              {t("setup.body")}
            </Text>
            <View style={styles.setupPreview}>
              <View style={styles.setupPreviewHeader}>
                <Text style={styles.setupPreviewKicker}>{t("life.monthMap")}</Text>
                <Text style={styles.setupPreviewAge}>{previewRemainingYears}y</Text>
              </View>
              <View style={styles.setupPreviewDots}>
                {previewDots.map((dot) => (
                  <View
                    key={dot}
                    style={[
                      styles.setupPreviewDot,
                      dot < previewSpent && styles.setupPreviewDotSpent,
                      dot === previewSpent && styles.setupPreviewDotNow
                    ]}
                  />
                ))}
              </View>
              <View style={styles.setupPreviewRail}>
                <View style={[styles.setupPreviewRailFill, { width: `${Math.round((previewSpent / previewMonths) * 100)}%` }]} />
                <Text style={styles.setupPreviewRailText}>{previewSpent}/{previewMonths}</Text>
              </View>
              <View style={styles.setupPreviewFooter}>
                <Text style={styles.setupPreviewFootText}>{t("tab.life")}</Text>
                <Text style={styles.setupPreviewFootText}>{t("tab.vision")}</Text>
                <Text style={styles.setupPreviewFootText}>{t("tab.speech")}</Text>
              </View>
            </View>
            <View style={styles.setupJourney}>
              <View style={[styles.setupJourneyItem, styles.setupJourneyItemActive]}>
                <Text style={styles.setupJourneyNumber}>1</Text>
                <Text style={[styles.setupJourneyText, { color: theme.ink }]}>{t("tab.life")}</Text>
              </View>
              <View style={styles.setupJourneyLine} />
              <View style={styles.setupJourneyItem}>
                <Text style={[styles.setupJourneyNumber, styles.setupJourneyNumberMuted]}>2</Text>
                <Text style={[styles.setupJourneyText, { color: theme.muted }]}>{t("tab.goals")}</Text>
              </View>
              <View style={styles.setupJourneyLine} />
              <View style={styles.setupJourneyItem}>
                <Text style={[styles.setupJourneyNumber, styles.setupJourneyNumberMuted]}>3</Text>
                <Text style={[styles.setupJourneyText, { color: theme.muted }]}>{t("tab.vision")}</Text>
              </View>
            </View>
            <View style={styles.setupFields}>
              <View style={styles.setupField}>
                <Text style={[styles.setupFieldLabel, { color: theme.muted }]}>{t("setup.name")}</Text>
                <TextInput
                  value={String(profileDraft.name || "")}
                  onChangeText={(name) => setProfileDraft((current) => ({ ...current, name }))}
                  placeholder={t("setup.name")}
                  placeholderTextColor={theme.placeholder}
                  style={[styles.input, { color: theme.ink, backgroundColor: theme.input, borderColor: theme.line }]}
                />
              </View>
              <View style={styles.setupFieldRow}>
                <View style={[styles.setupField, styles.setupFieldHalf]}>
                  <Text style={[styles.setupFieldLabel, { color: theme.muted }]}>{t("setup.age")}</Text>
                  <TextInput
                    value={String(profileDraft.age || "")}
                    onChangeText={(age) => setProfileDraft((current) => ({ ...current, age }))}
                    keyboardType="number-pad"
                    placeholder="28"
                    placeholderTextColor={theme.placeholder}
                    style={[styles.input, { color: theme.ink, backgroundColor: theme.input, borderColor: theme.line }]}
                  />
                </View>
                <View style={[styles.setupField, styles.setupFieldHalf]}>
                  <Text style={[styles.setupFieldLabel, { color: theme.muted }]}>{t("setup.estimate")}</Text>
                  <TextInput
                    value={String(profileDraft.expectancy || "")}
                    onChangeText={(expectancy) => setProfileDraft((current) => ({ ...current, expectancy }))}
                    keyboardType="number-pad"
                    placeholder="85"
                    placeholderTextColor={theme.placeholder}
                    style={[styles.input, { color: theme.ink, backgroundColor: theme.input, borderColor: theme.line }]}
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => { softImpact(); saveProfile(); }}>
              <Text style={styles.primaryText}>{t("setup.create")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  function renderLife() {
    const stats = lifeStats(appState.profile);
    const dots = Array.from({ length: stats.totalMonths }, (_, index) => index < stats.spentMonths);
    const quoteNumber = String(dailyQuoteIndex + 1).padStart(2, "0");
    return (
      <ScrollView
        ref={lifeScrollRef}
        contentContainerStyle={styles.lifeContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.hero, borderColor: theme.heroLine }]}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroWatermark}>{Math.round(stats.usedPercent)}%</Text>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroKicker}>{t("life.kicker")}</Text>
            <TouchableOpacity style={styles.heroMiniButton} onPress={() => setProfileOpen(true)}>
              <Text style={styles.heroMiniButtonText}>{(appState.profile.name || "V").slice(0, 1).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.daysNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{stats.daysLeft.toLocaleString("en-US")}</Text>
          <Text style={styles.daysLabel}>{t("life.days")}</Text>
          <View style={[styles.bigProgressTrack, { backgroundColor: theme.soft }]}>
            <View style={[styles.bigProgressFill, { width: `${stats.usedPercent}%` }]} />
          </View>
          <Text style={styles.heroBody}>
            {t("life.summary", { age: stats.age, expectancy: stats.expectancy })}
          </Text>
          <View style={styles.heroStatsStrip}>
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatValue}>{stats.weeksLeft.toLocaleString("en-US")}</Text>
              <Text style={styles.heroStatLabel}>{t("life.weeks")}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatValue}>{stats.monthsLeft.toLocaleString("en-US")}</Text>
              <Text style={styles.heroStatLabel}>{t("life.months")}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatValue}>{stats.usedPercent}%</Text>
              <Text style={styles.heroStatLabel}>{t("life.used")}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.quoteCard, appState.settings.darkMode ? styles.quoteCardDark : styles.quoteCardLight]}
          onPress={() => {
            softImpact();
            maybeShowDailyQuote({ force: true });
          }}
        >
          <View style={styles.quoteCardGlow} />
          <Text style={styles.quoteCardWatermark}>{quoteNumber}</Text>
          <View style={styles.quoteCardTop}>
            <View style={styles.quoteMark}>
              <Text style={styles.quoteMarkText}>{quoteNumber}</Text>
            </View>
            <View style={styles.quoteMetaBlock}>
              <Text style={styles.quoteCardKicker}>{t("quote.kicker")}</Text>
              <Text style={styles.quoteCardDay}>{dailyQuoteOrdinal}</Text>
            </View>
            <Text style={styles.quoteOpenHint}>{t("quote.open")}</Text>
          </View>
          <Text style={styles.quoteCardText}>"{dailyQuote.text}"</Text>
          <View style={styles.quoteCardFooter}>
            <Text style={styles.quoteAuthor}>{dailyQuote.author}</Text>
            <View style={styles.quoteFooterLine} />
          </View>
        </TouchableOpacity>

        <View style={[styles.panel, styles.monthPanel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <View style={styles.panelHeaderRow}>
            <Text style={[styles.panelTitle, { color: theme.ink }]}>{t("life.monthMap")}</Text>
            <Text style={[styles.monthCounter, { color: theme.muted }]}>{stats.spentMonths}/{stats.totalMonths}</Text>
          </View>
          <Text style={[styles.body, { color: theme.muted }]}>{t("life.monthMapBody")}</Text>
          <View style={styles.dotMap}>
            {dots.map((spent, index) => (
              <View key={`${index}`} style={[styles.lifeDot, spent && styles.lifeDotSpent]} />
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderGoals() {
    const people = appState.whyPeople || [];
    const examples = t("why.examples").split("|");
    const motiveSlots = people.length ? people.slice(0, 3) : examples.slice(0, 3).map((label, index) => ({ id: `empty-${index}`, label }));
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.whyHero, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <View style={styles.whyAuraTop} />
          <View style={styles.whyAuraBottom} />
          <Text style={[styles.kicker, { color: theme.muted }]}>{t("tab.goals")}</Text>
          <Text style={[styles.whyTitle, { color: theme.ink }]}>{t("why.title")}</Text>
          <Text style={[styles.body, styles.centerText, { color: theme.muted }]}>{t("why.body")}</Text>
          <View style={styles.whyMotiveStack} pointerEvents="none">
            {motiveSlots.map((slot, index) => {
              const imageUri = slot.imageUri;
              return (
                <View
                  key={slot.id}
                  style={[
                    styles.whyMotiveCard,
                    index === 0 && styles.whyMotiveCardOne,
                    index === 1 && styles.whyMotiveCardTwo,
                    index === 2 && styles.whyMotiveCardThree,
                    { borderColor: imageUri ? "rgba(255,249,237,0.78)" : theme.line, backgroundColor: imageUri ? "#222629" : theme.soft }
                  ]}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.whyMotiveImage} />
                  ) : (
                    <Text style={[styles.whyMotivePlaceholder, { color: theme.ink }]} numberOfLines={2}>{slot.label}</Text>
                  )}
                </View>
              );
            })}
            {people.length ? (
              <View style={styles.whyMotiveCount}>
                <Text style={styles.whyMotiveCountText}>{people.length}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.whyChips}>
            {examples.map((example) => (
              <View key={example} style={[styles.whyChip, { backgroundColor: theme.soft, borderColor: theme.line }]}>
                <Text style={[styles.whyChipText, { color: theme.ink }]}>{example}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => { softImpact(); addWhyPeople(); }}>
            <Text style={styles.primaryText}>{t("why.add")}</Text>
          </TouchableOpacity>
        </View>

        {!people.length ? (
          <EmptyState theme={theme} title={t("why.emptyTitle")} text={t("why.emptyBody")} />
        ) : (
          <View style={styles.photoWall}>
            {people.map((person, index) => (
              <View key={person.id} style={[styles.imageTile, styles.whyTile, { borderColor: theme.line }]}>
                <Image source={{ uri: person.imageUri }} style={styles.tileImage} />
                <View style={styles.whyImageBadge}>
                  <Text style={styles.whyImageBadgeText}>{index + 1}</Text>
                </View>
                <TouchableOpacity style={styles.removeImage} onPress={() => removeWhyPerson(person.id)}>
                  <Text style={styles.removeImageText}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  function renderDeckEmptyPreview(kind) {
    const positive = kind === "vision";
    const frames = positive
      ? ["Identity", "Environment", "People"]
      : ["Drift", "Cost", "Regret"];
    return (
      <View style={styles.deckFrameStack} pointerEvents="none">
        {frames.map((label, index) => (
          <View
            key={label}
            style={[
              styles.deckFrame,
              index === 0 && styles.deckFrameOne,
              index === 1 && styles.deckFrameTwo,
              index === 2 && styles.deckFrameThree,
              !positive && styles.deckFrameAnti
            ]}
          >
            <Text style={[styles.deckFrameLabel, !positive && styles.deckFrameLabelAnti]}>{label}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderDeck(kind) {
    const positive = kind === "vision";
    const deck = positive ? appState.visionSlides : appState.antiSlides;
    const cover = deck[0];
    const title = positive ? t("deck.visionTitle") : t("deck.antiTitle");
    const body = positive ? t("deck.visionBody") : t("deck.antiBody");
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.deckHero, !cover?.imageUri && styles.deckHeroEmpty, !positive && styles.deckHeroAnti, { backgroundColor: theme.card, borderColor: theme.line }]}>
          {cover?.imageUri ? <Image source={{ uri: cover.imageUri }} style={styles.deckHeroImage} /> : null}
          {!cover?.imageUri ? renderDeckEmptyPreview(kind) : null}
          <View style={[styles.deckHeroShade, !cover?.imageUri && { opacity: 0.25 }]} />
          <View style={[styles.deckHeroText, !cover?.imageUri && styles.deckHeroTextEmpty]}>
            <Text style={styles.deckHeroKicker}>{positive ? t("tab.vision") : t("tab.anti")}</Text>
            <Text style={styles.deckHeroTitle}>{title}</Text>
            <Text style={styles.deckHeroBody}>{body}</Text>
          </View>
          <View style={styles.deckCountBadge}>
            <Text style={styles.deckCountText}>{deck.length}/{MAX_DECK_SLIDES}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => { softImpact(); addImages(kind); }}>
            <Text style={styles.primaryText}>{t("deck.add")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.line, backgroundColor: theme.control }]} onPress={() => { softImpact(); deck.length ? setPlayer({ kind, index: 0, paused: false }) : Alert.alert(t("alert.deck"), t("alert.addImagesFirst")); }}>
            <Text style={[styles.secondaryText, { color: theme.ink }]}>{t("deck.play")}</Text>
          </TouchableOpacity>
        </View>

        {!deck.length ? (
          <EmptyState theme={theme} title={t("deck.emptyTitle")} text={t("deck.emptyBody")} />
        ) : (
          <View style={styles.deckRail}>
            {deck.map((slide) => (
              <View key={slide.id} style={[styles.imageTile, styles.deckTile, { borderColor: theme.line }]}>
                <Image source={{ uri: slide.imageUri }} style={styles.tileImage} />
                <TouchableOpacity style={styles.removeImage} onPress={() => removeSlide(kind, slide.id)}>
                  <Text style={styles.removeImageText}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  function renderSpeech() {
    const activeVoiceIndex = Math.max(0, voiceProfiles.findIndex((item) => item.id === activeVoiceProfile.id));
    const currentSpeechTitle = draftSpeechTitle.trim() || activeSpeech?.title || t("speech.heading");
    const speechWords = (draftSpeechText.trim() || activeSpeech?.text || "").split(/\s+/).filter(Boolean).length;
    const speechMinutes = Math.max(1, Math.ceil(speechWords / 135));
    const waveform = [16, 30, 22, 42, 26, 36, 18, 32, 24];
    return (
      <ScrollView contentContainerStyle={styles.speechContent}>
        <View style={[styles.speechHero, speechPlaying && styles.speechHeroPlaying]}>
          <View style={styles.speechHeroAuraTop} />
          <View style={styles.speechHeroAuraBottom} />
          <Text style={styles.speechHeroKicker}>{t("speech.title")}</Text>
          <Text style={styles.speechHeroTitle} numberOfLines={2}>{currentSpeechTitle}</Text>
          <Text style={styles.speechHeroBody}>{t("speech.body")}</Text>
          <View style={styles.speechHeroMeta}>
            <Text style={styles.speechHeroMetaText}>{speechPlaying ? t("speech.playing") : t("speech.ready")}</Text>
            <View style={styles.speechHeroDot} />
            <Text style={styles.speechHeroMetaText}>{activeVoiceProfile.name}</Text>
            <View style={styles.speechHeroDot} />
            <Text style={styles.speechHeroMetaText}>{speechMinutes} min</Text>
          </View>
          <View style={styles.speechWaveform}>
            {waveform.map((height, index) => {
              const scaleY = speechPlaying
                ? speechPulse.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [
                      0.68 + ((index % 3) * 0.06),
                      1.18 - ((index % 4) * 0.04),
                      0.78 + ((index % 2) * 0.08)
                    ]
                  })
                : 1;
              return (
                <Animated.View
                  key={`${index}`}
                  style={[
                    styles.speechWaveBar,
                    { height, transform: [{ scaleY }] },
                    speechPlaying && styles.speechWaveBarPlaying
                  ]}
                />
              );
            })}
          </View>
          <TouchableOpacity style={[styles.speechPlayButton, speechPlaying && styles.speechPlayButtonActive]} onPress={playSpeech} activeOpacity={0.88}>
            <Text style={styles.speechPlayText}>{speechPlaying ? t("speech.playing") : t("speech.listen")}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.speechLibraryPanel, { backgroundColor: theme.soft, borderColor: theme.line }]}>
          <View style={styles.speechLibraryHeader}>
            <Text style={[styles.speechLibraryLabel, { color: theme.muted }]}>{t("speech.library")}</Text>
            <TouchableOpacity style={[styles.speechNewButton, { backgroundColor: theme.card, borderColor: theme.line }]} onPress={newSpeech} activeOpacity={0.88}>
              <Text style={[styles.speechNewButtonText, { color: theme.ink }]}>+</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speechListRail}>
            {appState.selfSpeeches.map((speech, index) => (
              <TouchableOpacity key={speech.id} style={[styles.speechPill, { backgroundColor: index === appState.activeSpeechIndex ? "rgba(232,196,104,0.18)" : theme.card, borderColor: index === appState.activeSpeechIndex ? "#E8C468" : theme.line }]} onPress={() => selectSpeech(index)} activeOpacity={0.88}>
                <Text style={[styles.speechPillTitle, { color: theme.ink }]} numberOfLines={1}>{speech.title || `Self speech ${index + 1}`}</Text>
                <Text style={[styles.speechPillBody, { color: theme.muted }]} numberOfLines={2}>{speech.text || t("speech.emptyDraft")}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.speechEditorCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <View style={styles.speechEditorHeader}>
            <Text style={[styles.kicker, { color: theme.muted }]}>{t("speech.current")}</Text>
            <Text style={[styles.speechEditorCount, { color: theme.muted }]}>{speechWords} {t("speech.words")}</Text>
          </View>
          <TextInput
            value={draftSpeechTitle}
            onChangeText={setDraftSpeechTitle}
            placeholder={t("speech.titlePlaceholder")}
            placeholderTextColor={theme.placeholder}
            style={[styles.speechTitleInput, { color: theme.ink, borderColor: theme.line }]}
          />
          <TextInput
            value={draftSpeechText}
            onChangeText={setDraftSpeechText}
            placeholder={t("speech.textPlaceholder")}
            placeholderTextColor={theme.placeholder}
            multiline
            style={[styles.speechScriptInput, { color: theme.ink, borderColor: theme.line }]}
          />
        </View>

        <View style={[styles.voicePanel, styles.voicePanelPremium, { backgroundColor: theme.soft }]}>
            <View style={styles.voiceHeader}>
              <Text style={[styles.voiceLabel, { color: theme.muted }]}>{t("speech.voice")}</Text>
              <Text style={[styles.voiceHint, { color: theme.muted }]}>{t("speech.swipe")}</Text>
            </View>
            <ScrollView
              ref={voiceScrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={238}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleVoiceMomentumEnd}
              contentOffset={{ x: activeVoiceIndex * 238, y: 0 }}
              contentContainerStyle={styles.voiceRail}
            >
              {voiceProfiles.map((profile, index) => (
                <TouchableOpacity
                  key={profile.id}
                  activeOpacity={0.88}
                  style={[
                    styles.voiceCard,
                    {
                      backgroundColor: profile.id === activeVoiceProfile.id ? "#101418" : theme.card,
                      borderColor: profile.id === activeVoiceProfile.id ? "#E8C468" : theme.line
                    }
                  ]}
                  onPress={() => selectVoiceProfile(index)}
                >
                  <Text style={[styles.voiceName, { color: profile.id === activeVoiceProfile.id ? "#FFF9ED" : theme.ink }]}>{profile.name}</Text>
                  <Text style={[styles.voiceNote, { color: profile.id === activeVoiceProfile.id ? "#D8D1C2" : theme.muted }]}>{profile.note}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.voiceDots}>
              {voiceProfiles.map((profile) => (
                <View key={profile.id} style={[styles.voiceDot, profile.id === activeVoiceProfile.id && styles.voiceDotActive]} />
              ))}
            </View>
        </View>

        <View style={styles.speechActionDock}>
            <TouchableOpacity style={[styles.speechDockButton, styles.speechDockPrimary]} onPress={saveSpeech}>
              <Text style={styles.primaryText}>{t("speech.save")}</Text>
            </TouchableOpacity>
            {speechPlaying ? (
              <TouchableOpacity style={[styles.speechDockButton, { borderColor: theme.line }]} onPress={stopSpeech}>
                <Text style={[styles.secondaryText, { color: theme.ink }]}>{t("speech.stop")}</Text>
              </TouchableOpacity>
            ) : null}
        </View>
      </ScrollView>
    );
  }

  function renderProfileModal() {
    return (
      <Modal visible={profileOpen} animationType="slide" onRequestClose={() => setProfileOpen(false)}>
        <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.kicker, { color: theme.muted }]}>{t("profile.kicker")}</Text>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>{appState.profile.name || "Your profile"}</Text>
            </View>
            <TouchableOpacity onPress={() => setProfileOpen(false)}>
              <Text style={[styles.closeText, { color: theme.ink }]}>{t("profile.close")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Text style={[styles.panelTitle, { color: theme.ink }]}>{t("profile.storageTitle")}</Text>
              <Text style={[styles.body, { color: theme.muted }]}>
                {t("profile.storageBody")}
              </Text>
            </View>
            <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Text style={[styles.panelTitle, { color: theme.ink }]}>{t("profile.cloudTitle")}</Text>
              <Text style={[styles.body, { color: theme.muted }]}>
                {t("profile.cloudBody")}
              </Text>
              <Text style={[styles.syncFootnote, { color: theme.muted }]}>
                {t("profile.deviceKey")}: {String(appState.localInstallId || "").slice(0, 18)}
              </Text>
            </View>
            <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Text style={[styles.panelTitle, { color: theme.ink }]}>{t("profile.appearance")}</Text>
              <View style={styles.switchRow}>
                <Text style={[styles.body, { color: theme.ink }]}>{t("profile.darkMode")}</Text>
                <Switch
                  value={appState.settings.darkMode}
                  onValueChange={(darkMode) => updateState((current) => ({ ...current, settings: { ...current.settings, darkMode } }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.body, { color: theme.ink }]}>{t("profile.notifications")}</Text>
                <Switch
                  value={appState.settings.notifications}
                  onValueChange={(notifications) => updateState((current) => ({ ...current, settings: { ...current.settings, notifications } }))}
                />
              </View>
            </View>
            <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Text style={[styles.panelTitle, { color: theme.ink }]}>{t("profile.language")}</Text>
              <View style={styles.languageGrid}>
                {languages.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.languageButton,
                      { borderColor: item.id === language ? "#E8C468" : theme.line, backgroundColor: item.id === language ? "rgba(232,196,104,0.18)" : "transparent" }
                    ]}
                    onPress={() => updateState((current) => ({ ...current, settings: { ...current.settings, language: item.id } }))}
                  >
                    <Text style={[styles.languageText, { color: theme.ink }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.dangerButton} onPress={resetLocalData}>
              <Text style={styles.primaryText}>{t("profile.reset")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  function renderPlayer() {
    if (!player) return null;
    const deck = player.kind === "vision" ? appState.visionSlides : appState.antiSlides;
    const count = Math.max(deck.length, 1);
    const currentIndex = player.index % count;
    const slide = deck[currentIndex];
    const positive = player.kind === "vision";
    const imageOpacity = playerPulse.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.18, 1, 1] });
    const imageScale = playerPulse.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1.16] });
    const imageTranslateY = playerPulse.interpolate({ inputRange: [0, 1], outputRange: [10, -16] });
    const copyOpacity = playerPulse.interpolate({ inputRange: [0, 0.26, 1], outputRange: [0, 0, 1] });
    const copyTranslateY = playerPulse.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
    const progress = `${Math.round(((currentIndex + 1) / count) * 100)}%`;
    const shiftPlayer = (direction) => {
      softImpact();
      setPlayer((current) => {
        if (!current) return current;
        const activeDeck = current.kind === "vision" ? appState.visionSlides : appState.antiSlides;
        if (!activeDeck.length) return null;
        return { ...current, index: (current.index + direction + activeDeck.length) % activeDeck.length };
      });
    };
    const togglePause = () => {
      softImpact();
      setPlayer((current) => current ? { ...current, paused: !current.paused } : current);
    };
    const closePlayer = () => {
      softImpact();
      setPlayer(null);
    };
    return (
      <Modal visible animationType="fade" onRequestClose={closePlayer}>
        <View style={styles.player}>
          {slide?.imageUri ? (
            <Animated.Image
              source={{ uri: slide.imageUri }}
              style={[styles.playerImage, { opacity: imageOpacity, transform: [{ translateY: imageTranslateY }, { scale: imageScale }] }]}
            />
          ) : null}
          <View style={[styles.playerShade, player.kind === "anti" && styles.playerShadeAnti]} />
          <View style={styles.playerVignetteTop} />
          <View style={styles.playerVignetteBottom} />
          <View style={styles.playerTop}>
            <TouchableOpacity style={styles.playerIconButton} onPress={closePlayer}>
              <Text style={styles.playerIconText}>x</Text>
            </TouchableOpacity>
            <View style={styles.playerTopPill}>
              <Text style={[styles.playerTopKicker, !positive && styles.playerTopKickerAnti]}>{positive ? t("tab.vision") : t("tab.anti")}</Text>
              <Text style={styles.playerCount}>{currentIndex + 1} / {deck.length}</Text>
            </View>
          </View>
          <View style={styles.playerProgressBar}>
            <View style={[styles.playerProgressFill, !positive && styles.playerProgressFillAnti, { width: progress }]} />
          </View>
          <Animated.Text style={[styles.playerIndex, !positive && styles.playerIndexAnti, { opacity: copyOpacity }]}>
            {String(currentIndex + 1).padStart(2, "0")}
          </Animated.Text>
          <Animated.View style={[styles.playerText, { opacity: copyOpacity, transform: [{ translateY: copyTranslateY }] }]}>
            <Text style={[styles.playerKicker, !positive && styles.playerKickerAnti]}>{positive ? t("tab.vision") : t("tab.anti")}</Text>
            <Text style={styles.playerTitle}>{slide?.title || "Your deck"}</Text>
            <Text style={styles.playerCaption}>{slide?.caption || ""}</Text>
          </Animated.View>
          <View style={styles.playerControls}>
            <TouchableOpacity style={styles.playerControl} onPress={() => shiftPlayer(-1)}>
              <Text style={styles.playerControlText}>Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.playerControl, styles.playerControlPrimary]} onPress={togglePause}>
              <Text style={styles.playerControlPrimaryText}>{player.paused ? "Play" : "Pause"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playerControl} onPress={() => shiftPlayer(1)}>
              <Text style={styles.playerControlText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderLifeUpdateOverlay() {
    if (!lifeUpdate) return null;
    const previousDays = Math.max(
      lifeUpdate.current.daysLeft + 1,
      Number(lifeUpdate.previous.daysLeft) || 0
    );
    const fade = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.12, 0.86, 1],
      outputRange: [0, 1, 1, 0]
    });
    const stageTranslate = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.42, 0.78, 1],
      outputRange: [34, -6, -6, -18]
    });
    const stageScale = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.34, 0.82, 1],
      outputRange: [0.92, 1, 1, 0.98]
    });
    const newScale = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.32, 0.62, 0.86, 1],
      outputRange: [0.64, 1.12, 1, 1.08, 0.98]
    });
    const oldTranslate = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.42, 1],
      outputRange: [0, -30, -38]
    });
    const fillScale = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.72, 1],
      outputRange: [
        Math.max(0.04, Number(lifeUpdate.previous.usedPercent || 0) / 100),
        Math.max(0.04, Number(lifeUpdate.current.usedPercent || 0) / 100),
        Math.max(0.04, Number(lifeUpdate.current.usedPercent || 0) / 100)
      ]
    });
    const ringScale = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.34, 0.74, 1],
      outputRange: [0.56, 1.12, 1, 1.04]
    });
    const ringOpacity = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.16, 0.78, 1],
      outputRange: [0, 0.62, 0.4, 0]
    });
    const minusScale = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.3, 0.58, 1],
      outputRange: [0.72, 1.16, 1, 0.96]
    });
    const statsOpacity = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.38, 0.86, 1],
      outputRange: [0, 1, 1, 0]
    });
    const titleOpacity = lifeUpdatePulse.interpolate({
      inputRange: [0, 0.2, 0.86, 1],
      outputRange: [0, 1, 1, 0]
    });
    const dots = Array.from({ length: 18 }, (_, index) => index);
    const safeNumber = (value, fallback) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const updateStats = [
      {
        label: t("life.weeks"),
        previous: safeNumber(lifeUpdate.previous.weeksLeft, lifeUpdate.current.weeksLeft),
        current: Number(lifeUpdate.current.weeksLeft),
        formatter: (value) => Math.round(value).toLocaleString("en-US")
      },
      {
        label: t("life.months"),
        previous: safeNumber(lifeUpdate.previous.monthsLeft, lifeUpdate.current.monthsLeft),
        current: Number(lifeUpdate.current.monthsLeft),
        formatter: (value) => Math.round(value).toLocaleString("en-US")
      },
      {
        label: t("life.used"),
        previous: safeNumber(lifeUpdate.previous.usedPercent, lifeUpdate.current.usedPercent),
        current: Number(lifeUpdate.current.usedPercent),
        formatter: (value) => `${Math.round(value)}%`
      }
    ];
    return (
      <Modal visible transparent animationType="none">
        <Animated.View style={[styles.lifeUpdateOverlay, { opacity: fade }]}>
          <Animated.View style={[styles.lifeUpdateStage, { transform: [{ translateY: stageTranslate }, { scale: stageScale }] }]}>
            <Animated.View style={[styles.lifeUpdateRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <View style={styles.lifeUpdateLogo}>
              <View style={styles.logoSmallSlash} />
              <View style={styles.logoSmallSlashSecond} />
              <View style={styles.logoSmallDot} />
            </View>
            <Text style={styles.lifeUpdateKicker}>{t("life.kicker")}</Text>
            <Animated.Text style={[styles.lifeUpdateTitle, { opacity: titleOpacity }]}>
              {t("life.updateTitle")}
            </Animated.Text>
            <Animated.Text style={[styles.lifeUpdateSubtitle, { opacity: titleOpacity }]}>
              {t("life.updateSub")}
            </Animated.Text>
            <Animated.View style={[styles.lifeUpdateMinusBadge, { transform: [{ scale: minusScale }] }]}>
              <Text style={styles.lifeUpdateMinusText}>-1</Text>
            </Animated.View>
            <Animated.Text style={[styles.lifeUpdateOldNumber, { transform: [{ translateY: oldTranslate }] }]}>
              {previousDays.toLocaleString("en-US")}
            </Animated.Text>
            <Animated.Text style={[styles.lifeUpdateNumber, { transform: [{ scale: newScale }] }]}>
              {lifeUpdate.current.daysLeft.toLocaleString("en-US")}
            </Animated.Text>
            <Text style={styles.lifeUpdateLabel}>{t("life.days")}</Text>
            <Animated.View style={[styles.lifeUpdateStats, { opacity: statsOpacity }]}>
              {updateStats.map((item) => {
                const changed = Math.round(item.previous) !== Math.round(item.current);
                return (
                  <View key={item.label} style={[styles.lifeUpdateStat, changed && styles.lifeUpdateStatChanged]}>
                    <Text style={styles.lifeUpdateStatLabel}>{item.label}</Text>
                    <View style={styles.lifeUpdateStatRow}>
                      <Text style={styles.lifeUpdateStatOld}>{item.formatter(item.previous)}</Text>
                      <Text style={styles.lifeUpdateStatArrow}>-&gt;</Text>
                      <Text style={styles.lifeUpdateStatNew}>{item.formatter(item.current)}</Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
            <View style={styles.lifeUpdateBar}>
              <Animated.View style={[styles.lifeUpdateBarFill, { transform: [{ scaleX: fillScale }] }]} />
            </View>
            <View style={styles.lifeUpdateDots}>
              {dots.map((dot) => (
                <View key={dot} style={[styles.lifeUpdateDot, dot === dots.length - 1 && styles.lifeUpdateDotHot]} />
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  function renderQuoteReveal() {
    if (!quoteRevealOpen) return null;
    const scale = quotePulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
    const translateY = quotePulse.interpolate({ inputRange: [0, 1], outputRange: [76, 0] });
    const opacity = quotePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const sweepY = quotePulse.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] });
    const indexScale = quotePulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
    const quoteTranslate = quotePulse.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });
    const bottomTranslate = quotePulse.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setQuoteRevealOpen(false)}>
        <View style={styles.quoteOverlay}>
          <Animated.View style={[styles.quoteRevealStage, { opacity, transform: [{ translateY }, { scale }] }]}>
            <View style={styles.quoteRevealAuraTop} />
            <View style={styles.quoteRevealAuraBottom} />
            <Animated.View style={[styles.quoteRevealSweep, { transform: [{ translateY: sweepY }] }]} />
            <View style={styles.quoteRevealTop}>
              <View style={styles.quoteRevealLogo}>
                <View style={styles.logoSmallSlash} />
                <View style={styles.logoSmallSlashSecond} />
                <View style={styles.logoSmallDot} />
              </View>
              <Text style={styles.quoteRevealDay}>{dailyQuoteOrdinal}</Text>
            </View>
            <Animated.Text style={[styles.quoteRevealIndex, { opacity, transform: [{ scale: indexScale }] }]}>
              {String(dailyQuoteIndex + 1).padStart(2, "0")}
            </Animated.Text>
            <View style={styles.quoteRevealMeter}>
              <View style={[styles.quoteRevealMeterFill, { width: dailyQuoteProgress }]} />
            </View>
            <View style={styles.quoteRevealCenter}>
              <Text style={styles.quoteRevealKicker}>{t("quote.kicker")}</Text>
              <Text style={styles.quoteRevealTitle}>{t("quote.title")}</Text>
              <Animated.View style={[styles.quoteRevealPlate, { transform: [{ translateY: quoteTranslate }] }]}>
                <Text
                  style={styles.quoteRevealText}
                  adjustsFontSizeToFit
                  minimumFontScale={0.68}
                  numberOfLines={6}
                >
                  "{dailyQuote.text}"
                </Text>
              </Animated.View>
            </View>
            <Animated.View style={[styles.quoteRevealBottom, { transform: [{ translateY: bottomTranslate }] }]}>
              <View style={styles.quoteRevealAuthorBox}>
                <Text style={styles.quoteRevealAuthor}>{dailyQuote.author}</Text>
                <Text style={styles.quoteRevealSource}>{dailyQuote.source}</Text>
              </View>
              <TouchableOpacity style={styles.quoteCloseButton} onPress={() => { softImpact(); setQuoteRevealOpen(false); }}>
                <Text style={styles.quoteCloseText}>{t("quote.close")}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  if (!hydrated) {
    return (
      <SafeAreaView style={[styles.screen, styles.loader]}>
        <ActivityIndicator color="#E8C468" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={appState.settings.darkMode ? "light-content" : "dark-content"} />
      {profileComplete ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity style={[styles.profileButton, { borderColor: theme.line }]} onPress={() => setProfileOpen(true)}>
              <Text style={[styles.profileInitial, { color: theme.ink }]}>{(appState.profile.name || "V").slice(0, 1).toUpperCase()}</Text>
            </TouchableOpacity>
            <View style={styles.headerLogo}>
              <View style={styles.logoSmallSlash} />
              <View style={styles.logoSmallSlashSecond} />
              <View style={styles.logoSmallDot} />
            </View>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.main}>
            <Animated.View style={[styles.mainMotion, { opacity: screenOpacity, transform: [{ translateX: screenTranslateX }, { translateY: screenTranslate }, { scale: screenScale }] }]}>
            {tab === "life" && renderLife()}
            {tab === "goals" && renderGoals()}
            {tab === "vision" && renderDeck("vision")}
            {tab === "anti" && renderDeck("anti")}
            {tab === "speech" && renderSpeech()}
            </Animated.View>
          </View>
          <View style={[styles.nav, { backgroundColor: theme.nav, borderColor: theme.line }]}>
          {tabs.map((item) => {
            const active = tab === item.id;
            const glyphColor = active ? "#101418" : theme.muted;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.78}
                style={[styles.navItem, active && styles.navActive]}
                onPress={() => { softImpact(); navigateTab(item.id); }}
              >
                <TabGlyph id={item.glyph} color={glyphColor} active={active} />
                <Text style={[styles.navText, { color: glyphColor }]} numberOfLines={1} adjustsFontSizeToFit>
                  {t(`tab.${item.id}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
          </View>
          {renderProfileModal()}
          {renderPlayer()}
          {renderLifeUpdateOverlay()}
          {renderQuoteReveal()}
        </>
      ) : (
        renderOnboarding()
      )}
    </SafeAreaView>
  );
}

function TabGlyph({ id, color, active }) {
  if (id === "life") {
    return (
      <View style={styles.navGlyph}>
        <View style={[styles.navLifeRing, { borderColor: color }]}>
          <View style={[styles.navLifeNeedle, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }
  if (id === "people") {
    return (
      <View style={styles.navGlyph}>
        <View style={styles.navPeopleRow}>
          <View style={[styles.navPeopleDot, { backgroundColor: color }]} />
          <View style={[styles.navPeopleDot, styles.navPeopleDotSmall, { backgroundColor: color }]} />
        </View>
        <View style={[styles.navPeopleBase, { backgroundColor: color }]} />
      </View>
    );
  }
  if (id === "vision") {
    return (
      <View style={styles.navGlyph}>
        <View style={[styles.navSlash, { backgroundColor: color }]} />
        <View style={[styles.navSlash, styles.navSlashSecond, { backgroundColor: color }]} />
        <View style={[styles.navDot, { backgroundColor: active ? "#DA5A3A" : color }]} />
      </View>
    );
  }
  if (id === "anti") {
    return (
      <View style={styles.navGlyph}>
        <View style={[styles.navAntiFrame, { borderColor: color }]} />
        <View style={[styles.navAntiSlash, { backgroundColor: active ? "#101418" : "#DA5A3A" }]} />
      </View>
    );
  }
  return (
    <View style={styles.navGlyph}>
      <View style={[styles.navVoiceLine, { backgroundColor: color, width: 19 }]} />
      <View style={[styles.navVoiceLine, { backgroundColor: color, width: 13 }]} />
      <View style={[styles.navVoiceLine, { backgroundColor: color, width: 17 }]} />
    </View>
  );
}

function EmptyState({ theme, title, text }) {
  return (
    <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.line }]}>
      <Text style={[styles.panelTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

const darkTheme = {
  bg: "#101418",
  card: "#1B2023",
  control: "#20262A",
  hero: "#07090B",
  heroLine: "rgba(232,196,104,0.18)",
  nav: "rgba(27,32,35,0.96)",
  soft: "#272C2E",
  input: "#242A2D",
  ink: "#FFF9ED",
  muted: "#C9C4BA",
  line: "rgba(255,255,255,0.14)",
  placeholder: "#A9A196"
};

const lightTheme = {
  bg: "#F4F2EE",
  card: "#FFFFFF",
  control: "#FFFFFF",
  hero: "#101418",
  heroLine: "rgba(17,17,17,0.08)",
  nav: "rgba(255,255,255,0.96)",
  soft: "#ECE8DF",
  input: "#FFFFFF",
  ink: "#111315",
  muted: "#6E6B66",
  line: "rgba(17,17,17,0.1)",
  placeholder: "#9A948B"
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loader: { alignItems: "center", justifyContent: "center", backgroundColor: "#101418" },
  centerFill: { flex: 1, justifyContent: "center", padding: 24 },
  onboardingShell: { flex: 1 },
  onboardingContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 18, paddingVertical: 18 },
  setupCard: {
    width: "100%",
    overflow: "hidden",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 40,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8
  },
  setupMiniLogo: {
    width: 54,
    height: 54,
    alignSelf: "center",
    borderRadius: 18,
    backgroundColor: "#101418",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  logoSlash: { position: "absolute", width: 7, height: 31, left: 17, top: 12, transform: [{ skewX: "-20deg" }], backgroundColor: "#E8C468" },
  logoSlashSecond: { position: "absolute", width: 7, height: 31, left: 27, top: 12, transform: [{ skewX: "-20deg" }], backgroundColor: "#E8C468" },
  logoDot: { position: "absolute", width: 11, height: 11, borderRadius: 6, right: 13, bottom: 14, backgroundColor: "#DA5A3A" },
  setupPreview: { overflow: "hidden", borderRadius: 32, padding: 17, marginTop: 16, marginBottom: 14, backgroundColor: "#101418" },
  setupPreviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  setupPreviewKicker: { color: "rgba(255,249,237,0.58)", fontSize: 10, lineHeight: 13, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase" },
  setupPreviewAge: { color: "#E8C468", fontSize: 22, lineHeight: 26, fontWeight: "900" },
  setupPreviewDots: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  setupPreviewDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,249,237,0.16)" },
  setupPreviewDotSpent: { backgroundColor: "rgba(255,249,237,0.46)" },
  setupPreviewDotNow: { backgroundColor: "#DA5A3A", shadowColor: "#DA5A3A", shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  setupPreviewRail: { height: 28, marginTop: 14, borderRadius: 14, overflow: "hidden", justifyContent: "center", backgroundColor: "rgba(255,249,237,0.1)" },
  setupPreviewRailFill: { position: "absolute", left: 0, top: 0, bottom: 0, width: "46%", borderRadius: 14, backgroundColor: "rgba(232,196,104,0.28)" },
  setupPreviewRailText: { color: "rgba(255,249,237,0.78)", textAlign: "center", fontSize: 11, lineHeight: 14, fontWeight: "900" },
  setupPreviewFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,249,237,0.1)" },
  setupPreviewFootText: { color: "#FFF9ED", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  setupJourney: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 14, paddingHorizontal: 4 },
  setupJourneyItem: { minWidth: 58, alignItems: "center", gap: 5 },
  setupJourneyItemActive: {},
  setupJourneyNumber: { width: 25, height: 25, borderRadius: 13, overflow: "hidden", color: "#101418", backgroundColor: "#E8C468", textAlign: "center", fontSize: 12, lineHeight: 25, fontWeight: "900" },
  setupJourneyNumberMuted: { color: "#807A70", backgroundColor: "rgba(128,128,128,0.16)" },
  setupJourneyText: { maxWidth: 72, color: "#101418", textAlign: "center", fontSize: 10.5, lineHeight: 13, fontWeight: "900" },
  setupJourneyLine: { flex: 1, maxWidth: 48, height: 1, marginTop: -15, backgroundColor: "rgba(128,128,128,0.22)" },
  setupKicker: { alignSelf: "center", maxWidth: "100%", textAlign: "center", fontSize: 10, lineHeight: 14, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase" },
  setupTitle: { alignSelf: "center", maxWidth: 322, marginTop: 8, textAlign: "center", fontSize: 29, lineHeight: 32, fontWeight: "900" },
  setupText: { alignSelf: "center", maxWidth: 322, marginTop: 9, textAlign: "center", fontSize: 14, lineHeight: 19, fontWeight: "700" },
  setupFields: { marginTop: 4, gap: 10 },
  setupField: { minWidth: 0 },
  setupFieldRow: { flexDirection: "row", gap: 10 },
  setupFieldHalf: { flex: 1 },
  setupFieldLabel: { marginBottom: 7, paddingLeft: 2, fontSize: 11, lineHeight: 14, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  input: { minHeight: 52, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, fontWeight: "750" },
  speechInput: { minHeight: 220, textAlignVertical: "top", lineHeight: 22 },
  primaryButton: { minHeight: 56, minWidth: 190, maxWidth: "100%", alignSelf: "center", borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#DA5A3A", marginTop: 18, shadowColor: "#DA5A3A", shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  primaryButtonFlex: { flex: 1, minHeight: 52, borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#DA5A3A", shadowColor: "#DA5A3A", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  primaryText: { color: "#FFFFFF", fontSize: 15, lineHeight: 19, textAlign: "center", fontWeight: "900" },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  secondaryText: { fontSize: 15, fontWeight: "900" },
  header: { height: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  profileInitial: { fontSize: 17, fontWeight: "900" },
  headerLogo: { width: 54, height: 34, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 44 },
  logoSmallSlash: { position: "absolute", width: 6, height: 30, left: 19, top: 1, transform: [{ skewX: "-20deg" }], backgroundColor: "#E8C468" },
  logoSmallSlashSecond: { position: "absolute", width: 6, height: 30, left: 29, top: 1, transform: [{ skewX: "-20deg" }], backgroundColor: "#E8C468" },
  logoSmallDot: { position: "absolute", width: 10, height: 10, borderRadius: 5, right: 10, bottom: 5, backgroundColor: "#DA5A3A" },
  main: { flex: 1 },
  mainMotion: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  lifeContent: { padding: 16, paddingBottom: 126 },
  heroCard: { minHeight: 314, overflow: "hidden", borderWidth: 1, borderRadius: 36, padding: 20, marginBottom: 11, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 7 },
  heroGlow: { position: "absolute", right: -48, top: -68, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(232,196,104,0.15)" },
  heroWatermark: { position: "absolute", left: 16, right: 16, bottom: -22, color: "rgba(255,249,237,0.055)", fontSize: 116, lineHeight: 122, fontWeight: "900", textAlign: "center" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  heroKicker: { color: "#E8C468", fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  heroMiniButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  heroMiniButtonText: { color: "#FFF9ED", fontSize: 15, fontWeight: "900" },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase" },
  daysNumber: { color: "#FFFFFF", marginTop: 0, fontSize: 54, lineHeight: 61, fontWeight: "900", letterSpacing: 0, textAlign: "center" },
  daysLabel: { color: "rgba(255,249,237,0.76)", fontSize: 15, lineHeight: 19, fontWeight: "850", marginBottom: 14, textAlign: "center" },
  bigProgressTrack: { height: 10, overflow: "hidden", borderRadius: 999, marginBottom: 11 },
  bigProgressFill: { height: "100%", borderRadius: 999, backgroundColor: "#E8C468" },
  heroBody: { color: "rgba(255,249,237,0.72)", fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  heroStatsStrip: { minHeight: 66, marginTop: 14, borderRadius: 22, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,249,237,0.075)", borderWidth: 1, borderColor: "rgba(255,249,237,0.08)" },
  heroStatCell: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  heroStatValue: { color: "#FFF9ED", fontSize: 18, lineHeight: 22, fontWeight: "900", textAlign: "center" },
  heroStatLabel: { color: "rgba(255,249,237,0.58)", marginTop: 2, fontSize: 9.5, lineHeight: 12, fontWeight: "900", textAlign: "center", letterSpacing: 0.9, textTransform: "uppercase" },
  heroStatDivider: { width: 1, height: 36, backgroundColor: "rgba(255,249,237,0.11)" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  syncFootnote: { marginTop: 10, fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 0.5 },
  quoteCard: { minHeight: 168, overflow: "hidden", borderWidth: 1, borderRadius: 32, padding: 18, marginBottom: 11, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 7 },
  quoteCardLight: { backgroundColor: "#0D1113", borderColor: "rgba(232,196,104,0.18)" },
  quoteCardDark: { backgroundColor: "#11171A", borderColor: "rgba(232,196,104,0.24)" },
  quoteCardGlow: { position: "absolute", right: -46, top: -64, width: 166, height: 166, borderRadius: 83, backgroundColor: "rgba(232,196,104,0.18)" },
  quoteCardWatermark: { position: "absolute", right: 0, bottom: -17, color: "rgba(255,249,237,0.06)", fontSize: 112, lineHeight: 118, fontWeight: "900" },
  quoteCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  quoteMark: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#E8C468" },
  quoteMarkText: { color: "#101418", fontSize: 14, lineHeight: 17, fontWeight: "900" },
  quoteMetaBlock: { flex: 1, minWidth: 0 },
  quoteCardKicker: { color: "rgba(255,249,237,0.72)", fontSize: 10, lineHeight: 13, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase" },
  quoteCardDay: { color: "#E8C468", marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "900" },
  quoteOpenHint: { overflow: "hidden", minHeight: 32, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, color: "#101418", backgroundColor: "#FFF9ED", fontSize: 12, lineHeight: 14, fontWeight: "900", textTransform: "lowercase" },
  quoteCardText: { marginTop: 17, color: "#FFF9ED", fontSize: 22, lineHeight: 27, fontWeight: "900" },
  quoteCardFooter: { marginTop: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  quoteAuthor: { color: "rgba(255,249,237,0.72)", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  quoteFooterLine: { flex: 1, height: 1, backgroundColor: "rgba(232,196,104,0.26)" },
  panel: { borderWidth: 1, borderRadius: 28, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  monthPanel: { borderRadius: 32, padding: 18, paddingBottom: 18, marginBottom: 0 },
  panelHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  panelTitle: { fontSize: 22, lineHeight: 26, fontWeight: "900", marginBottom: 8 },
  monthCounter: { fontSize: 12, lineHeight: 16, fontWeight: "900" },
  dotMap: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 3.5 },
  lifeDot: { width: 6.5, height: 6.5, borderRadius: 4, backgroundColor: "rgba(232,196,104,0.24)" },
  lifeDotSpent: { backgroundColor: "#E8C468" },
  lifeUpdateOverlay: { flex: 1, backgroundColor: "rgba(6,8,9,0.998)", alignItems: "center", justifyContent: "center" },
  lifeUpdateStage: { width: "100%", minHeight: "100%", overflow: "hidden", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 34, alignItems: "center", justifyContent: "center", backgroundColor: "#090D0F" },
  lifeUpdateRing: { position: "absolute", width: 330, height: 330, borderRadius: 165, borderWidth: 1, borderColor: "rgba(232,196,104,0.34)", backgroundColor: "rgba(232,196,104,0.035)" },
  lifeUpdateLogo: { width: 70, height: 50, marginBottom: 14, alignItems: "center", justifyContent: "center" },
  lifeUpdateKicker: { color: "#E8C468", fontSize: 12, lineHeight: 16, fontWeight: "900", letterSpacing: 2.2, textTransform: "uppercase", textAlign: "center" },
  lifeUpdateTitle: { maxWidth: 330, marginTop: 16, color: "#FFF9ED", fontSize: 28, lineHeight: 33, fontWeight: "900", textAlign: "center" },
  lifeUpdateSubtitle: { maxWidth: 290, marginTop: 8, color: "rgba(255,249,237,0.68)", fontSize: 15, lineHeight: 21, fontWeight: "800", textAlign: "center" },
  lifeUpdateMinusBadge: { marginTop: 22, minWidth: 78, height: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#DA5A3A", shadowColor: "#DA5A3A", shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  lifeUpdateMinusText: { color: "#FFF9ED", fontSize: 22, lineHeight: 25, fontWeight: "900" },
  lifeUpdateOldNumber: { marginTop: 20, color: "rgba(255,255,255,0.28)", fontSize: 40, lineHeight: 44, fontWeight: "900", textDecorationLine: "line-through" },
  lifeUpdateNumber: { color: "#FFFFFF", fontSize: 100, lineHeight: 106, fontWeight: "900", letterSpacing: 0, textAlign: "center" },
  lifeUpdateLabel: { color: "rgba(255,255,255,0.82)", fontSize: 18, lineHeight: 23, fontWeight: "900", textAlign: "center" },
  lifeUpdateStats: { width: "100%", flexDirection: "row", gap: 8, marginTop: 24 },
  lifeUpdateStat: { flex: 1, minHeight: 76, borderRadius: 22, paddingHorizontal: 8, paddingVertical: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  lifeUpdateStatChanged: { borderColor: "rgba(232,196,104,0.48)", backgroundColor: "rgba(232,196,104,0.12)" },
  lifeUpdateStatLabel: { color: "rgba(255,255,255,0.64)", fontSize: 10, lineHeight: 13, fontWeight: "900", textAlign: "center", textTransform: "uppercase" },
  lifeUpdateStatRow: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  lifeUpdateStatOld: { color: "rgba(255,255,255,0.42)", fontSize: 12, lineHeight: 15, fontWeight: "900", textDecorationLine: "line-through" },
  lifeUpdateStatArrow: { color: "#E8C468", fontSize: 11, lineHeight: 15, fontWeight: "900" },
  lifeUpdateStatNew: { color: "#FFFFFF", fontSize: 15, lineHeight: 18, fontWeight: "900" },
  lifeUpdateBar: { width: "100%", height: 13, marginTop: 26, overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  lifeUpdateBarFill: { width: "100%", height: "100%", borderRadius: 999, backgroundColor: "#E8C468" },
  lifeUpdateDots: { marginTop: 24, flexDirection: "row", gap: 8 },
  lifeUpdateDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.22)" },
  lifeUpdateDotHot: { backgroundColor: "#DA5A3A", shadowColor: "#DA5A3A", shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  quoteOverlay: { flex: 1, backgroundColor: "#060809" },
  quoteRevealStage: { position: "relative", width: "100%", minHeight: "100%", overflow: "hidden", paddingHorizontal: 24, paddingTop: 56, paddingBottom: 30, justifyContent: "space-between", backgroundColor: "#080B0D" },
  quoteRevealAuraTop: { position: "absolute", width: 280, height: 280, right: -108, top: -96, borderRadius: 140, backgroundColor: "rgba(232,196,104,0.18)" },
  quoteRevealAuraBottom: { position: "absolute", width: 260, height: 260, left: -128, bottom: -112, borderRadius: 130, backgroundColor: "rgba(218,90,58,0.14)" },
  quoteRevealSweep: { position: "absolute", left: 24, right: 24, top: 124, height: 2, borderRadius: 2, backgroundColor: "rgba(232,196,104,0.78)", shadowColor: "#E8C468", shadowOpacity: 0.58, shadowRadius: 24, shadowOffset: { width: 0, height: 9 } },
  quoteRevealTop: { position: "absolute", left: 24, right: 24, top: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quoteRevealLogo: { width: 50, height: 38, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  quoteRevealDay: { color: "rgba(255,249,237,0.6)", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  quoteRevealIndex: { position: "absolute", left: 20, right: 20, top: 106, color: "rgba(255,249,237,0.07)", fontSize: 176, lineHeight: 180, fontWeight: "900", textAlign: "center" },
  quoteRevealMeter: { position: "absolute", left: 24, right: 24, top: 134, height: 4, overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" },
  quoteRevealMeterFill: { height: "100%", borderRadius: 999, backgroundColor: "#E8C468" },
  quoteRevealCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 86, paddingBottom: 22 },
  quoteRevealKicker: { color: "#E8C468", fontSize: 12, lineHeight: 16, fontWeight: "900", letterSpacing: 2.2, textTransform: "uppercase", textAlign: "center" },
  quoteRevealTitle: { color: "rgba(255,249,237,0.78)", marginTop: 14, fontSize: 18, lineHeight: 23, fontWeight: "900", textAlign: "center" },
  quoteRevealPlate: { width: "100%", marginTop: 26, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,249,237,0.1)", paddingVertical: 26 },
  quoteRevealText: { color: "#FFF9ED", fontSize: 36, lineHeight: 41, fontWeight: "900", textAlign: "center" },
  quoteRevealBottom: { alignItems: "center" },
  quoteRevealAuthorBox: { alignSelf: "center", minWidth: 196, borderRadius: 26, paddingHorizontal: 18, paddingVertical: 13, alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  quoteRevealAuthor: { color: "#FFF9ED", fontSize: 15, lineHeight: 20, fontWeight: "900", textAlign: "center" },
  quoteRevealSource: { color: "rgba(255,249,237,0.56)", marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "850", textAlign: "center" },
  quoteCloseButton: { minHeight: 56, minWidth: 248, marginTop: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF9ED" },
  quoteCloseText: { color: "#101418", fontSize: 15, fontWeight: "900" },
  segment: { flexDirection: "row", borderRadius: 999, padding: 5, marginBottom: 14 },
  segmentButton: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  segmentActive: { backgroundColor: "#E8C468" },
  segmentText: { color: "#807A70", fontWeight: "900" },
  segmentTextActive: { color: "#101418" },
  addRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  addInput: { flex: 1, minHeight: 50, borderRadius: 18, paddingHorizontal: 14, fontSize: 15, fontWeight: "800" },
  roundButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#101418", alignItems: "center", justifyContent: "center" },
  roundButtonText: { color: "#FFFFFF", fontSize: 30, lineHeight: 32, fontWeight: "900" },
  empty: { borderWidth: 1, borderRadius: 26, padding: 22, alignItems: "center" },
  goalCard: { borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 12 },
  goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  goalTitle: { flex: 1, fontSize: 18, fontWeight: "900", lineHeight: 23 },
  deleteText: { fontSize: 22, fontWeight: "800", paddingHorizontal: 4 },
  progressTrack: { height: 34, justifyContent: "center", marginTop: 15 },
  progressFill: { position: "absolute", left: 0, height: 10, borderRadius: 999, backgroundColor: "#E8C468" },
  progressKnob: { position: "absolute", width: 26, height: 26, marginLeft: -13, borderRadius: 13, backgroundColor: "#DA5A3A", borderWidth: 3, borderColor: "#FFFFFF" },
  progressText: { marginTop: 2, fontSize: 12, fontWeight: "900" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  centerText: { textAlign: "center" },
  whyHero: { overflow: "hidden", borderWidth: 1, borderRadius: 38, padding: 22, marginBottom: 14, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 5 },
  whyAuraTop: { position: "absolute", width: 190, height: 190, right: -72, top: -86, borderRadius: 95, backgroundColor: "rgba(232,196,104,0.16)" },
  whyAuraBottom: { position: "absolute", width: 210, height: 210, left: -104, bottom: -116, borderRadius: 105, backgroundColor: "rgba(218,90,58,0.1)" },
  whyTitle: { maxWidth: 320, marginTop: 8, fontSize: 32, lineHeight: 35, fontWeight: "900", textAlign: "center" },
  whyMotiveStack: { width: 260, height: 130, marginTop: 18, marginBottom: 4, alignSelf: "center" },
  whyMotiveCard: { position: "absolute", width: 96, height: 120, overflow: "hidden", borderWidth: 2, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  whyMotiveCardOne: { left: 4, top: 18, transform: [{ rotate: "-7deg" }] },
  whyMotiveCardTwo: { left: 82, top: 0, transform: [{ rotate: "1deg" }] },
  whyMotiveCardThree: { right: 4, top: 18, transform: [{ rotate: "7deg" }] },
  whyMotiveImage: { width: "100%", height: "100%" },
  whyMotivePlaceholder: { paddingHorizontal: 10, fontSize: 12, lineHeight: 15, fontWeight: "900", textAlign: "center" },
  whyMotiveCount: { position: "absolute", right: 2, top: 6, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#E8C468", borderWidth: 2, borderColor: "#FFF9ED" },
  whyMotiveCountText: { color: "#101418", fontSize: 13, fontWeight: "900" },
  whyChips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 15 },
  whyChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  whyChipText: { fontSize: 12, lineHeight: 15, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoWall: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imageTile: { width: "48%", aspectRatio: 0.74, overflow: "hidden", borderRadius: 24, borderWidth: 1, backgroundColor: "#24292C" },
  whyTile: { aspectRatio: 0.84 },
  tileImage: { width: "100%", height: "100%" },
  whyImageBadge: { position: "absolute", left: 9, bottom: 9, minWidth: 32, height: 32, borderRadius: 16, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(232,196,104,0.92)" },
  whyImageBadgeText: { color: "#111315", fontSize: 13, fontWeight: "900" },
  removeImage: { position: "absolute", right: 8, top: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.58)", alignItems: "center", justifyContent: "center" },
  removeImageText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  deckHero: { minHeight: 318, overflow: "hidden", borderWidth: 1, borderRadius: 34, marginBottom: 14, backgroundColor: "#101418", shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
  deckHeroEmpty: { backgroundColor: "#111417" },
  deckHeroAnti: { backgroundColor: "#171412" },
  deckHeroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  deckHeroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.48)" },
  deckHeroText: { flex: 1, justifyContent: "flex-end", padding: 22 },
  deckHeroTextEmpty: { paddingTop: 168 },
  deckHeroKicker: { color: "#E8C468", fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  deckHeroTitle: { color: "#FFFFFF", marginTop: 8, fontSize: 33, lineHeight: 36, fontWeight: "900" },
  deckHeroBody: { color: "rgba(255,249,237,0.78)", marginTop: 10, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  deckCountBadge: { position: "absolute", right: 14, top: 14, minWidth: 50, height: 34, paddingHorizontal: 10, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  deckCountText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  deckFrameStack: { position: "absolute", left: 20, right: 20, top: 20, height: 144 },
  deckFrame: { position: "absolute", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,249,237,0.12)", borderRadius: 24, padding: 13, justifyContent: "flex-end", backgroundColor: "rgba(255,249,237,0.08)" },
  deckFrameOne: { left: 0, top: 18, width: "47%", height: 112, transform: [{ rotate: "-4deg" }] },
  deckFrameTwo: { left: "27%", top: 0, width: "47%", height: 132, transform: [{ rotate: "2deg" }] },
  deckFrameThree: { right: 0, top: 26, width: "42%", height: 106, transform: [{ rotate: "5deg" }] },
  deckFrameAnti: { borderColor: "rgba(218,90,58,0.24)", backgroundColor: "rgba(218,90,58,0.08)" },
  deckFrameLabel: { color: "rgba(255,249,237,0.78)", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  deckFrameLabelAnti: { color: "rgba(255,220,210,0.82)" },
  deckRail: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  deckTile: { aspectRatio: 0.68 },
  speechContent: { padding: 20, paddingBottom: 132 },
  speechHero: { minHeight: 244, overflow: "hidden", borderRadius: 34, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, marginBottom: 13, alignItems: "center", backgroundColor: "#080B0D", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 8 },
  speechHeroPlaying: { shadowOpacity: 0.28, shadowRadius: 34 },
  speechHeroAuraTop: { position: "absolute", width: 190, height: 190, right: -64, top: -72, borderRadius: 95, backgroundColor: "rgba(232,196,104,0.18)" },
  speechHeroAuraBottom: { position: "absolute", width: 190, height: 190, left: -84, bottom: -104, borderRadius: 95, backgroundColor: "rgba(218,90,58,0.13)" },
  speechHeroKicker: { color: "#E8C468", fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 2.1, textTransform: "uppercase" },
  speechHeroTitle: { maxWidth: 316, marginTop: 7, color: "#FFF9ED", fontSize: 32, lineHeight: 34, fontWeight: "900", textAlign: "center" },
  speechHeroBody: { maxWidth: 306, marginTop: 8, color: "rgba(255,249,237,0.72)", fontSize: 13, lineHeight: 18, fontWeight: "750", textAlign: "center" },
  speechHeroMeta: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  speechHeroMetaText: { color: "rgba(255,249,237,0.78)", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  speechHeroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#E8C468" },
  speechWaveform: { height: 42, marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  speechWaveBar: { width: 7, borderRadius: 999, backgroundColor: "#E8C468" },
  speechWaveBarPlaying: { shadowColor: "#E8C468", shadowOpacity: 0.28, shadowRadius: 9, shadowOffset: { width: 0, height: 0 } },
  speechPlayButton: { minHeight: 50, minWidth: 176, marginTop: 11, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF9ED" },
  speechPlayButtonActive: { backgroundColor: "#E8C468" },
  speechPlayText: { color: "#101418", fontSize: 16, lineHeight: 20, fontWeight: "900" },
  speechLibraryPanel: { borderWidth: 1, borderRadius: 28, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 14, marginBottom: 12 },
  speechLibraryHeader: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  speechLibraryLabel: { fontSize: 11, lineHeight: 14, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  speechNewButton: { width: 34, height: 34, borderWidth: 1, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  speechNewButtonText: { marginTop: -2, fontSize: 23, lineHeight: 25, fontWeight: "850" },
  speechEditorCard: { borderWidth: 1, borderRadius: 30, padding: 18, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
  speechEditorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  speechEditorCount: { fontSize: 11, lineHeight: 14, fontWeight: "900", textTransform: "uppercase" },
  speechTitleInput: { minHeight: 50, borderWidth: 0, borderBottomWidth: 1, paddingHorizontal: 0, paddingVertical: 8, fontSize: 24, lineHeight: 29, fontWeight: "900" },
  speechScriptInput: { minHeight: 156, marginTop: 12, borderWidth: 0, paddingHorizontal: 0, paddingVertical: 6, textAlignVertical: "top", fontSize: 16, lineHeight: 23, fontWeight: "750" },
  voicePanel: { marginBottom: 12, borderRadius: 26, paddingVertical: 13, overflow: "hidden" },
  voicePanelPremium: { borderWidth: 1, borderColor: "rgba(128,128,128,0.1)" },
  voiceHeader: { paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  voiceLabel: { fontSize: 11, lineHeight: 14, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  voiceHint: { fontSize: 12, lineHeight: 15, fontWeight: "850" },
  voiceRail: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, gap: 12 },
  voiceCard: { width: 226, minHeight: 78, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 14, justifyContent: "center" },
  voiceName: { fontSize: 21, lineHeight: 24, fontWeight: "900" },
  voiceNote: { marginTop: 4, fontSize: 13, lineHeight: 16, fontWeight: "800" },
  voiceDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  voiceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(128,128,128,0.34)" },
  voiceDotActive: { width: 18, backgroundColor: "#E8C468" },
  speechListRail: { gap: 10, paddingRight: 2 },
  speechPill: { width: 190, minHeight: 68, borderWidth: 1, borderRadius: 23, paddingHorizontal: 14, paddingVertical: 12 },
  speechPillTitle: { fontSize: 16, lineHeight: 20, fontWeight: "900" },
  speechPillBody: { marginTop: 5, fontSize: 12, lineHeight: 16, fontWeight: "750" },
  speechActionDock: { flexDirection: "row", gap: 10, marginTop: 2 },
  speechDockButton: { flex: 1, minHeight: 54, borderRadius: 999, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  speechDockPrimary: { borderColor: "#DA5A3A", backgroundColor: "#DA5A3A", shadowColor: "#DA5A3A", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  switchRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  languageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  languageButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10 },
  languageText: { fontSize: 13, fontWeight: "900" },
  dangerButton: { minHeight: 52, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#9D3326", marginTop: 4 },
  modalHeader: { minHeight: 74, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 26, fontWeight: "900" },
  closeText: { fontSize: 15, fontWeight: "900" },
  nav: { position: "absolute", left: 16, right: 16, bottom: 12, height: 78, borderRadius: 39, flexDirection: "row", alignItems: "center", padding: 7, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  navItem: { flex: 1, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", gap: 4 },
  navActive: { backgroundColor: "#E8C468", shadowColor: "#E8C468", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  navText: { maxWidth: "100%", paddingHorizontal: 2, fontSize: 10.5, lineHeight: 13, fontWeight: "900", textAlign: "center" },
  navGlyph: { width: 28, height: 24, alignItems: "center", justifyContent: "center" },
  navLifeRing: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  navLifeNeedle: { width: 2, height: 8, borderRadius: 2, transform: [{ rotate: "38deg" }] },
  navPeopleRow: { height: 13, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  navPeopleDot: { width: 11, height: 11, borderRadius: 6 },
  navPeopleDotSmall: { width: 8, height: 8, borderRadius: 4, marginBottom: 1 },
  navPeopleBase: { width: 22, height: 6, marginTop: 2, borderRadius: 6 },
  navSlash: { position: "absolute", width: 4, height: 22, left: 9, top: 1, borderRadius: 2, transform: [{ skewX: "-18deg" }] },
  navSlashSecond: { left: 16 },
  navDot: { position: "absolute", width: 7, height: 7, right: 2, bottom: 2, borderRadius: 4 },
  navAntiFrame: { width: 22, height: 16, borderWidth: 2, borderRadius: 7 },
  navAntiSlash: { position: "absolute", width: 4, height: 24, borderRadius: 2, transform: [{ rotate: "38deg" }] },
  navVoiceLine: { height: 3, borderRadius: 3, marginVertical: 2 },
  player: { flex: 1, backgroundColor: "#050607", justifyContent: "flex-end" },
  playerImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  playerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.34)" },
  playerShadeAnti: { backgroundColor: "rgba(18,8,4,0.56)" },
  playerVignetteTop: { position: "absolute", left: 0, right: 0, top: 0, height: 190, backgroundColor: "rgba(5,6,7,0.42)" },
  playerVignetteBottom: { position: "absolute", left: 0, right: 0, bottom: 0, height: 360, backgroundColor: "rgba(5,6,7,0.5)" },
  playerTop: { position: "absolute", left: 20, right: 20, top: 58, zIndex: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  playerIconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  playerIconText: { color: "#FFFFFF", fontSize: 18, lineHeight: 20, fontWeight: "900" },
  playerTopPill: { minHeight: 44, minWidth: 128, borderRadius: 22, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  playerTopKicker: { color: "#E8C468", fontSize: 10, lineHeight: 13, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase" },
  playerTopKickerAnti: { color: "#F09A76" },
  playerCount: { color: "rgba(255,249,237,0.76)", marginTop: 1, fontSize: 12, lineHeight: 15, fontWeight: "900" },
  playerProgressBar: { position: "absolute", left: 20, right: 20, top: 116, zIndex: 3, height: 4, overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" },
  playerProgressFill: { width: "0%", height: "100%", borderRadius: 999, backgroundColor: "#E8C468" },
  playerProgressFillAnti: { backgroundColor: "#DA5A3A" },
  playerIndex: { position: "absolute", left: 18, right: 18, top: 132, color: "rgba(255,249,237,0.08)", fontSize: 142, lineHeight: 150, fontWeight: "900", textAlign: "center" },
  playerIndexAnti: { color: "rgba(218,90,58,0.14)" },
  playerText: { marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", borderRadius: 30, paddingHorizontal: 20, paddingTop: 19, paddingBottom: 21, backgroundColor: "rgba(5,6,7,0.42)" },
  playerKicker: { color: "#E8C468", fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase" },
  playerKickerAnti: { color: "#F09A76" },
  playerTitle: { color: "#FFFFFF", fontSize: 36, lineHeight: 38, fontWeight: "900", marginTop: 8 },
  playerCaption: { color: "rgba(255,249,237,0.82)", fontSize: 16, lineHeight: 23, fontWeight: "750", marginTop: 10 },
  playerControls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 32 },
  playerControl: { flex: 1, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  playerControlPrimary: { flex: 1.2, backgroundColor: "#FFF9ED", borderColor: "#FFF9ED" },
  playerControlText: { color: "#FFFFFF", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  playerControlPrimaryText: { color: "#101418", fontSize: 13, lineHeight: 17, fontWeight: "900" }
});
