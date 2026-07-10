import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  View
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

const STORAGE_VERSION = 2;
const STATE_FILE = `${FileSystem.documentDirectory}visualize-state-v1.json`;
const IMAGE_DIR = `${FileSystem.documentDirectory}visualize-images/`;
const MAX_DECK_SLIDES = 10;

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
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
    updatedAt: ""
  },
  dailyTasks: [],
  longGoals: [],
  visionSlides: [],
  antiSlides: [],
  selfSpeeches: [],
  activeSpeechIndex: 0,
  settings: {
    darkMode: true,
    notifications: false,
    language: "en"
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
  { id: "life" },
  { id: "goals" },
  { id: "vision" },
  { id: "anti" },
  { id: "speech" }
];

const languages = [
  { id: "en", label: "English", speech: "en-US" },
  { id: "es", label: "Spanish", speech: "es-ES" },
  { id: "fr", label: "French", speech: "fr-FR" },
  { id: "pt", label: "Portuguese", speech: "pt-PT" },
  { id: "zh", label: "Chinese", speech: "zh-CN" }
];

const copy = {
  en: {
    "tab.life": "Life",
    "tab.goals": "Goals",
    "tab.vision": "Vision",
    "tab.anti": "Anti",
    "tab.speech": "Speech",
    "setup.kicker": "Profile setup",
    "setup.title": "Build your life clock first.",
    "setup.body": "Visualize starts empty. Create your profile, then add your goals, images, and self speech step by step.",
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
    "deck.visionTitle": "Create your Vision",
    "deck.antiTitle": "Create your Anti-vision",
    "deck.visionBody": "Add images of who you want to become, what you want to have, and who you want around you.",
    "deck.antiBody": "Add images of the opposite future: what you do not want to become, lose, or tolerate.",
    "deck.add": "Add images",
    "deck.play": "Play",
    "deck.emptyTitle": "No images yet.",
    "deck.emptyBody": "The deck starts empty. Add photos from this iPhone to keep them saved locally.",
    "speech.title": "Self speech",
    "speech.body": "Write the self-talk you want to hear repeatedly. Keep it personal, direct, and believable.",
    "speech.titlePlaceholder": "Title",
    "speech.textPlaceholder": "Write your speech here",
    "speech.save": "Save",
    "speech.new": "New",
    "speech.listen": "Listen",
    "speech.stop": "Stop",
    "speech.emptyDraft": "Empty draft",
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
    "tab.life": "Vida", "tab.goals": "Metas", "tab.vision": "Vision", "tab.anti": "Anti", "tab.speech": "Voz",
    "setup.kicker": "Crear perfil", "setup.title": "Crea primero tu reloj de vida.", "setup.body": "Visualize empieza vacio. Crea tu perfil y luego agrega metas, imagenes y self speech paso a paso.", "setup.name": "Nombre", "setup.age": "Edad", "setup.estimate": "Estimacion de vida, ejemplo 85", "setup.create": "Crear perfil",
    "life.kicker": "Reloj de vida", "life.days": "dias estimados restantes", "life.summary": "Basado en edad {age} y una estimacion de vida de {expectancy}. No es una prediccion, es un recordatorio.", "life.weeks": "semanas", "life.months": "meses", "life.used": "usado", "life.monthMap": "Vida por meses", "life.monthMapBody": "Cada punto es un mes. Los puntos llenos ya pasaron.",
    "goals.daily": "Tareas diarias", "goals.long": "Metas a largo plazo", "goals.dailyTitle": "Que hace avanzar el dia?", "goals.longTitle": "Que estas construyendo este ano?", "goals.body": "Agrega hasta 5 items y mueve manualmente la barra de progreso.", "goals.addTask": "Agregar tarea", "goals.addGoal": "Agregar meta", "goals.emptyTitle": "Todavia no hay nada.", "goals.emptyBody": "Empieza con una pequena accion o una meta a largo plazo.", "goals.complete": "{progress}% completo",
    "deck.visionTitle": "Crea tu Vision", "deck.antiTitle": "Crea tu Anti-vision", "deck.visionBody": "Agrega imagenes de quien quieres ser, lo que quieres tener y quien quieres cerca.", "deck.antiBody": "Agrega imagenes del futuro opuesto: lo que no quieres llegar a ser, perder o tolerar.", "deck.add": "Agregar imagenes", "deck.play": "Reproducir", "deck.emptyTitle": "Sin imagenes aun.", "deck.emptyBody": "El deck empieza vacio. Agrega fotos desde este iPhone para guardarlas localmente.",
    "speech.title": "Self speech", "speech.body": "Escribe el dialogo interno que quieres escuchar repetidamente. Hazlo personal, directo y creible.", "speech.titlePlaceholder": "Titulo", "speech.textPlaceholder": "Escribe tu self speech aqui", "speech.save": "Guardar", "speech.new": "Nuevo", "speech.listen": "Escuchar", "speech.stop": "Stop", "speech.emptyDraft": "Borrador vacio",
    "profile.kicker": "Perfil local", "profile.storageTitle": "Guardado en el dispositivo", "profile.storageBody": "Guardado solo en este iPhone. Al cerrar la app o reiniciar el telefono, los datos se mantienen. Si eliminas la app, se eliminan los datos locales.", "profile.cloudTitle": "Datos listos para cloud", "profile.cloudBody": "Tu perfil, metas, imagenes y speeches locales tienen IDs estables. Cuando agreguemos cloud sync, este dispositivo podra subir sus datos existentes antes de activar la sincronizacion.", "profile.deviceKey": "Clave dispositivo", "profile.appearance": "Apariencia", "profile.darkMode": "Modo oscuro", "profile.notifications": "Notificaciones luego", "profile.language": "Idioma", "profile.reset": "Resetear este dispositivo", "profile.close": "Cerrar", "player.close": "Cerrar",
    "alert.profile": "Perfil", "alert.addName": "Agrega tu nombre primero.", "alert.addAge": "Agrega tu edad primero.", "alert.goals": "Metas", "alert.maxGoals": "Mantén la lista enfocada: maximo 5 items.", "alert.photos": "Fotos", "alert.allowPhotos": "Permite acceso a fotos para agregarlas a tu deck.", "alert.deckFull": "Deck lleno", "alert.maxImages": "Maximo {max} imagenes por ahora.", "alert.deck": "Deck", "alert.addImagesFirst": "Agrega imagenes primero.", "alert.selfSpeech": "Self speech", "alert.writeSpeech": "Escribe primero el texto que quieres escuchar.", "alert.writeSpeechPlay": "Escribe un speech primero.", "alert.resetTitle": "Resetear datos locales", "alert.resetBody": "Esto elimina perfil, metas, imagenes y self speeches de este dispositivo.", "alert.cancel": "Cancelar", "alert.reset": "Resetear"
  },
  fr: {
    "tab.life": "Vie", "tab.goals": "Objectifs", "tab.vision": "Vision", "tab.anti": "Anti", "tab.speech": "Voix",
    "setup.kicker": "Creation du profil", "setup.title": "Commence par ton horloge de vie.", "setup.body": "Visualize commence vide. Cree ton profil, puis ajoute tes objectifs, images et self speech pas a pas.", "setup.name": "Prenom", "setup.age": "Age", "setup.estimate": "Estimation de vie, exemple 85", "setup.create": "Creer le profil",
    "life.kicker": "Horloge de vie", "life.days": "jours estimes restants", "life.summary": "Base sur l'age {age} et une estimation de vie de {expectancy}. Ce n'est pas une prediction, c'est un rappel.", "life.weeks": "semaines", "life.months": "mois", "life.used": "utilise", "life.monthMap": "Vie par mois", "life.monthMapBody": "Chaque point est un mois. Les points remplis sont deja passes.",
    "goals.daily": "Taches du jour", "goals.long": "Objectifs long terme", "goals.dailyTitle": "Qu'est-ce qui fait avancer aujourd'hui?", "goals.longTitle": "Que construis-tu cette annee?", "goals.body": "Ajoute jusqu'a 5 elements et ajuste manuellement la progression.", "goals.addTask": "Ajouter tache", "goals.addGoal": "Ajouter objectif", "goals.emptyTitle": "Rien pour l'instant.", "goals.emptyBody": "Commence avec une petite action ou un objectif long terme.", "goals.complete": "{progress}% termine",
    "deck.visionTitle": "Cree ta Vision", "deck.antiTitle": "Cree ton Anti-vision", "deck.visionBody": "Ajoute des images de qui tu veux devenir, ce que tu veux avoir et qui tu veux autour de toi.", "deck.antiBody": "Ajoute les images du futur oppose: ce que tu refuses de devenir, perdre ou tolerer.", "deck.add": "Ajouter images", "deck.play": "Lire", "deck.emptyTitle": "Aucune image.", "deck.emptyBody": "Le deck commence vide. Ajoute des photos depuis cet iPhone pour les garder localement.",
    "speech.title": "Self speech", "speech.body": "Ecris le discours interieur que tu veux ecouter souvent. Personnel, direct, credible.", "speech.titlePlaceholder": "Titre", "speech.textPlaceholder": "Ecris ton self speech ici", "speech.save": "Sauver", "speech.new": "Nouveau", "speech.listen": "Ecouter", "speech.stop": "Stop", "speech.emptyDraft": "Brouillon vide",
    "profile.kicker": "Profil local", "profile.storageTitle": "Stockage appareil", "profile.storageBody": "Sauve seulement sur cet iPhone. Fermer l'app ou redemarrer le telephone garde les donnees. Supprimer l'app supprime les donnees locales.", "profile.cloudTitle": "Donnees pretes pour le cloud", "profile.cloudBody": "Profil, objectifs, images et speeches locaux ont des IDs stables. Quand le cloud sync arrivera, cet appareil pourra envoyer ses donnees existantes avant d'activer la sync.", "profile.deviceKey": "Cle appareil", "profile.appearance": "Apparence", "profile.darkMode": "Mode sombre", "profile.notifications": "Notifications plus tard", "profile.language": "Langue", "profile.reset": "Reinitialiser", "profile.close": "Fermer", "player.close": "Fermer",
    "alert.profile": "Profil", "alert.addName": "Ajoute ton prenom d'abord.", "alert.addAge": "Ajoute ton age d'abord.", "alert.goals": "Objectifs", "alert.maxGoals": "Garde la liste concentree: maximum 5 elements.", "alert.photos": "Photos", "alert.allowPhotos": "Autorise l'acces aux photos pour les ajouter au deck.", "alert.deckFull": "Deck plein", "alert.maxImages": "Maximum {max} images pour l'instant.", "alert.deck": "Deck", "alert.addImagesFirst": "Ajoute d'abord des images.", "alert.selfSpeech": "Self speech", "alert.writeSpeech": "Ecris d'abord le texte a ecouter.", "alert.writeSpeechPlay": "Ecris d'abord un speech.", "alert.resetTitle": "Reinitialiser les donnees locales", "alert.resetBody": "Cela supprime le profil, les objectifs, les images et les self speeches de cet appareil.", "alert.cancel": "Annuler", "alert.reset": "Reinitialiser"
  },
  pt: {
    "tab.life": "Vida", "tab.goals": "Metas", "tab.vision": "Visao", "tab.anti": "Anti", "tab.speech": "Voz",
    "setup.kicker": "Criar perfil", "setup.title": "Crie primeiro seu relogio de vida.", "setup.body": "Visualize comeca vazio. Crie seu perfil e depois adicione metas, imagens e self speech passo a passo.", "setup.name": "Nome", "setup.age": "Idade", "setup.estimate": "Estimativa de vida, exemplo 85", "setup.create": "Criar perfil",
    "life.kicker": "Relogio de vida", "life.days": "dias estimados restantes", "life.summary": "Baseado na idade {age} e estimativa de vida de {expectancy}. Nao e previsao, e lembrete.", "life.weeks": "semanas", "life.months": "meses", "life.used": "usado", "life.monthMap": "Vida por meses", "life.monthMapBody": "Cada ponto e um mes. Pontos preenchidos ja passaram.",
    "goals.daily": "Tarefas diarias", "goals.long": "Metas de longo prazo", "goals.dailyTitle": "O que move hoje para frente?", "goals.longTitle": "O que voce esta construindo este ano?", "goals.body": "Adicione ate 5 itens e mova manualmente a barra de progresso.", "goals.addTask": "Adicionar tarefa", "goals.addGoal": "Adicionar meta", "goals.emptyTitle": "Nada aqui ainda.", "goals.emptyBody": "Comece com uma pequena acao ou uma meta de longo prazo.", "goals.complete": "{progress}% completo",
    "deck.visionTitle": "Crie sua Visao", "deck.antiTitle": "Crie sua Anti-visao", "deck.visionBody": "Adicione imagens de quem voce quer ser, do que quer ter e de quem quer perto.", "deck.antiBody": "Adicione imagens do futuro oposto: o que voce nao quer se tornar, perder ou tolerar.", "deck.add": "Adicionar imagens", "deck.play": "Reproduzir", "deck.emptyTitle": "Sem imagens ainda.", "deck.emptyBody": "O deck comeca vazio. Adicione fotos deste iPhone para salva-las localmente.",
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
  const [goalMode, setGoalMode] = useState("daily");
  const [draftGoal, setDraftGoal] = useState("");
  const [draftSpeechTitle, setDraftSpeechTitle] = useState("");
  const [draftSpeechText, setDraftSpeechText] = useState("");
  const [profileDraft, setProfileDraft] = useState(blankState.profile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const setupPulse = useRef(new Animated.Value(0)).current;

  const theme = appState.settings.darkMode ? darkTheme : lightTheme;
  const language = appState.settings.language || "en";
  const languageMeta = languages.find((item) => item.id === language) || languages[0];
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
    Animated.loop(
      Animated.sequence([
        Animated.timing(setupPulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(setupPulse, { toValue: 0, duration: 1300, useNativeDriver: true })
      ])
    ).start();
  }, [setupPulse]);

  useEffect(() => {
    if (!player) return undefined;
    const timer = setInterval(() => {
      setPlayer((current) => {
        if (!current) return current;
        const deck = current.kind === "vision" ? appState.visionSlides : appState.antiSlides;
        if (!deck.length) return null;
        return { ...current, index: (current.index + 1) % deck.length };
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [player, appState.visionSlides, appState.antiSlides]);

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
    updateState((current) => ({
      ...current,
      profile: {
        complete: true,
        name,
        age,
        expectancy: Math.max(expectancy, age + 1),
        createdAt: current.profile.createdAt || nowIso(),
        updatedAt: nowIso()
      }
    }));
    setProfileOpen(false);
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
    Speech.speak(text, { language: languageMeta.speech, rate: 0.88, pitch: 0.96 });
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
          setAppState(blankState);
          setProfileDraft(blankState.profile);
          setDraftSpeechTitle("");
          setDraftSpeechText("");
          setTab("life");
        }
      }
    ]);
  }

  function renderOnboarding() {
    const scale = setupPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
    const translateY = setupPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.centerFill}>
        <Animated.View style={[styles.setupLogo, { transform: [{ scale }, { translateY }] }]}>
          <View style={styles.logoSlash} />
          <View style={styles.logoSlashSecond} />
          <View style={styles.logoDot} />
        </Animated.View>
        <Text style={[styles.setupKicker, { color: theme.muted }]}>{t("setup.kicker")}</Text>
        <Text style={[styles.setupTitle, { color: theme.ink }]}>{t("setup.title")}</Text>
        <Text style={[styles.setupText, { color: theme.muted }]}>
          {t("setup.body")}
        </Text>
        <View style={styles.setupFields}>
          <TextInput
            value={String(profileDraft.name || "")}
            onChangeText={(name) => setProfileDraft((current) => ({ ...current, name }))}
            placeholder={t("setup.name")}
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <TextInput
            value={String(profileDraft.age || "")}
            onChangeText={(age) => setProfileDraft((current) => ({ ...current, age }))}
            keyboardType="number-pad"
            placeholder={t("setup.age")}
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <TextInput
            value={String(profileDraft.expectancy || "")}
            onChangeText={(expectancy) => setProfileDraft((current) => ({ ...current, expectancy }))}
            keyboardType="number-pad"
            placeholder={t("setup.estimate")}
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={saveProfile}>
          <Text style={styles.primaryText}>{t("setup.create")}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  function renderLife() {
    const stats = lifeStats(appState.profile);
    const dots = Array.from({ length: stats.totalMonths }, (_, index) => index < stats.spentMonths);
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text style={[styles.kicker, { color: theme.muted }]}>{t("life.kicker")}</Text>
          <Text style={[styles.daysNumber, { color: theme.ink }]}>{stats.daysLeft.toLocaleString("en-US")}</Text>
          <Text style={[styles.daysLabel, { color: theme.muted }]}>{t("life.days")}</Text>
          <View style={[styles.bigProgressTrack, { backgroundColor: theme.soft }]}>
            <View style={[styles.bigProgressFill, { width: `${stats.usedPercent}%` }]} />
          </View>
          <Text style={[styles.body, { color: theme.muted }]}>
            {t("life.summary", { age: stats.age, expectancy: stats.expectancy })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label={t("life.weeks")} value={stats.weeksLeft} theme={theme} />
          <StatCard label={t("life.months")} value={stats.monthsLeft} theme={theme} />
          <StatCard label={t("life.used")} value={`${stats.usedPercent}%`} theme={theme} />
        </View>

        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text style={[styles.panelTitle, { color: theme.ink }]}>{t("life.monthMap")}</Text>
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
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.segment, { backgroundColor: theme.soft }]}>
          <TouchableOpacity style={[styles.segmentButton, goalMode === "daily" && styles.segmentActive]} onPress={() => setGoalMode("daily")}>
            <Text style={[styles.segmentText, goalMode === "daily" && styles.segmentTextActive]}>{t("goals.daily")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentButton, goalMode === "long" && styles.segmentActive]} onPress={() => setGoalMode("long")}>
            <Text style={[styles.segmentText, goalMode === "long" && styles.segmentTextActive]}>{t("goals.long")}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text style={[styles.panelTitle, { color: theme.ink }]}>
            {goalMode === "daily" ? t("goals.dailyTitle") : t("goals.longTitle")}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>{t("goals.body")}</Text>
          <View style={styles.addRow}>
            <TextInput
              value={draftGoal}
              onChangeText={setDraftGoal}
              placeholder={goalMode === "daily" ? t("goals.addTask") : t("goals.addGoal")}
              placeholderTextColor={theme.placeholder}
              style={[styles.addInput, { color: theme.ink, backgroundColor: theme.input }]}
            />
            <TouchableOpacity style={styles.roundButton} onPress={addGoal}>
              <Text style={styles.roundButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!activeGoals.length ? (
          <EmptyState theme={theme} title={t("goals.emptyTitle")} text={t("goals.emptyBody")} />
        ) : (
          activeGoals.map((goal) => (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: theme.ink }]}>{goal.title}</Text>
                <TouchableOpacity onPress={() => removeGoal(goal.id)}>
                  <Text style={[styles.deleteText, { color: theme.muted }]}>x</Text>
                </TouchableOpacity>
              </View>
              <ProgressScrubber value={goal.progress || 0} onChange={(progress) => updateGoalProgress(goal.id, progress)} />
              <Text style={[styles.progressText, { color: theme.muted }]}>{t("goals.complete", { progress: goal.progress || 0 })}</Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderDeck(kind) {
    const positive = kind === "vision";
    const deck = positive ? appState.visionSlides : appState.antiSlides;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text style={[styles.panelTitle, { color: theme.ink }]}>{positive ? t("deck.visionTitle") : t("deck.antiTitle")}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            {positive
              ? t("deck.visionBody")
              : t("deck.antiBody")}
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => addImages(kind)}>
              <Text style={styles.primaryText}>{t("deck.add")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.line }]} onPress={() => (deck.length ? setPlayer({ kind, index: 0 }) : Alert.alert(t("alert.deck"), t("alert.addImagesFirst")))}>
              <Text style={[styles.secondaryText, { color: theme.ink }]}>{t("deck.play")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!deck.length ? (
          <EmptyState theme={theme} title={t("deck.emptyTitle")} text={t("deck.emptyBody")} />
        ) : (
          <View style={styles.grid}>
            {deck.map((slide) => (
              <View key={slide.id} style={[styles.imageTile, { borderColor: theme.line }]}>
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
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text style={[styles.panelTitle, { color: theme.ink }]}>{t("speech.title")}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            {t("speech.body")}
          </Text>
          <TextInput
            value={draftSpeechTitle}
            onChangeText={setDraftSpeechTitle}
            placeholder={t("speech.titlePlaceholder")}
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <TextInput
            value={draftSpeechText}
            onChangeText={setDraftSpeechText}
            placeholder={t("speech.textPlaceholder")}
            placeholderTextColor={theme.placeholder}
            multiline
            style={[styles.input, styles.speechInput, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButtonFlex} onPress={saveSpeech}>
              <Text style={styles.primaryText}>{t("speech.save")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.line }]} onPress={newSpeech}>
              <Text style={[styles.secondaryText, { color: theme.ink }]}>{t("speech.new")}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButtonFlex} onPress={playSpeech}>
              <Text style={styles.primaryText}>{t("speech.listen")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.line }]} onPress={() => Speech.stop()}>
              <Text style={[styles.secondaryText, { color: theme.ink }]}>{t("speech.stop")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {appState.selfSpeeches.map((speech, index) => (
          <TouchableOpacity key={speech.id} style={[styles.speechPill, { backgroundColor: theme.card, borderColor: index === appState.activeSpeechIndex ? "#E8C468" : theme.line }]} onPress={() => selectSpeech(index)}>
            <Text style={[styles.goalTitle, { color: theme.ink }]}>{speech.title || `Self speech ${index + 1}`}</Text>
            <Text style={[styles.body, { color: theme.muted }]} numberOfLines={2}>{speech.text || t("speech.emptyDraft")}</Text>
          </TouchableOpacity>
        ))}
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
    const slide = deck[player.index % Math.max(deck.length, 1)];
    return (
      <Modal visible animationType="fade" onRequestClose={() => setPlayer(null)}>
        <View style={styles.player}>
          {slide?.imageUri ? <Image source={{ uri: slide.imageUri }} style={styles.playerImage} /> : null}
          <View style={styles.playerShade} />
          <View style={styles.playerText}>
            <Text style={styles.playerKicker}>{player.kind === "vision" ? t("tab.vision") : t("tab.anti")}</Text>
            <Text style={styles.playerTitle}>{slide?.title || "Your deck"}</Text>
            <Text style={styles.playerCaption}>{slide?.caption || ""}</Text>
          </View>
          <TouchableOpacity style={styles.playerClose} onPress={() => setPlayer(null)}>
            <Text style={styles.playerCloseText}>{t("player.close")}</Text>
          </TouchableOpacity>
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
            {tab === "life" && renderLife()}
            {tab === "goals" && renderGoals()}
            {tab === "vision" && renderDeck("vision")}
            {tab === "anti" && renderDeck("anti")}
            {tab === "speech" && renderSpeech()}
          </View>
          <View style={[styles.nav, { backgroundColor: theme.nav }]}>
            {tabs.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.navItem, tab === item.id && styles.navActive]} onPress={() => setTab(item.id)}>
                <Text style={[styles.navText, { color: tab === item.id ? "#101418" : theme.muted }]}>{t(`tab.${item.id}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderProfileModal()}
          {renderPlayer()}
        </>
      ) : (
        renderOnboarding()
      )}
    </SafeAreaView>
  );
}

function StatCard({ label, value, theme }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
      <Text style={[styles.statValue, { color: theme.ink }]}>{String(value).toLocaleString("en-US")}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
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
  nav: "rgba(27,32,35,0.96)",
  soft: "#272C2E",
  input: "#F4EFE4",
  ink: "#FFF9ED",
  muted: "#C9C4BA",
  line: "rgba(255,255,255,0.14)",
  placeholder: "#847E75"
};

const lightTheme = {
  bg: "#F4F2EE",
  card: "#FFFFFF",
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
  setupLogo: {
    width: 92,
    height: 92,
    alignSelf: "center",
    marginBottom: 24,
    borderRadius: 30,
    backgroundColor: "#101418",
    alignItems: "center",
    justifyContent: "center"
  },
  logoSlash: { position: "absolute", width: 11, height: 50, left: 29, top: 18, transform: [{ skewX: "-20deg" }], backgroundColor: "#E8C468" },
  logoSlashSecond: { position: "absolute", width: 11, height: 50, left: 45, top: 18, transform: [{ skewX: "-20deg" }], backgroundColor: "#E8C468" },
  logoDot: { position: "absolute", width: 18, height: 18, borderRadius: 9, right: 22, bottom: 23, backgroundColor: "#DA5A3A" },
  setupKicker: { textAlign: "center", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  setupTitle: { marginTop: 10, textAlign: "center", fontSize: 38, lineHeight: 40, fontWeight: "900" },
  setupText: { marginTop: 12, textAlign: "center", fontSize: 16, lineHeight: 23, fontWeight: "700" },
  setupFields: { marginTop: 24, gap: 10 },
  input: { minHeight: 50, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, fontWeight: "700" },
  speechInput: { minHeight: 220, textAlignVertical: "top", lineHeight: 22 },
  primaryButton: { minHeight: 54, borderRadius: 999, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#DA5A3A", marginTop: 18 },
  primaryButtonFlex: { flex: 1, minHeight: 50, borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#DA5A3A" },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
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
  content: { padding: 18, paddingBottom: 118 },
  heroCard: { borderWidth: 1, borderRadius: 30, padding: 22, marginBottom: 14 },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase" },
  daysNumber: { marginTop: 14, fontSize: 48, lineHeight: 52, fontWeight: "900" },
  daysLabel: { fontSize: 16, fontWeight: "850", marginBottom: 18 },
  bigProgressTrack: { height: 12, overflow: "hidden", borderRadius: 999, marginBottom: 14 },
  bigProgressFill: { height: "100%", borderRadius: 999, backgroundColor: "#E8C468" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  syncFootnote: { marginTop: 10, fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 22, padding: 14 },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { marginTop: 3, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  panel: { borderWidth: 1, borderRadius: 26, padding: 18, marginBottom: 14 },
  panelTitle: { fontSize: 22, lineHeight: 26, fontWeight: "900", marginBottom: 8 },
  dotMap: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  lifeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(232,196,104,0.28)" },
  lifeDotSpent: { backgroundColor: "#E8C468" },
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imageTile: { width: "48%", aspectRatio: 0.74, overflow: "hidden", borderRadius: 24, borderWidth: 1, backgroundColor: "#24292C" },
  tileImage: { width: "100%", height: "100%" },
  removeImage: { position: "absolute", right: 8, top: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.58)", alignItems: "center", justifyContent: "center" },
  removeImageText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  speechPill: { borderWidth: 1, borderRadius: 22, padding: 15, marginBottom: 10 },
  switchRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  languageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  languageButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10 },
  languageText: { fontSize: 13, fontWeight: "900" },
  dangerButton: { minHeight: 52, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#9D3326", marginTop: 4 },
  modalHeader: { minHeight: 74, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 26, fontWeight: "900" },
  closeText: { fontSize: 15, fontWeight: "900" },
  nav: { position: "absolute", left: 14, right: 14, bottom: 14, height: 70, borderRadius: 35, flexDirection: "row", alignItems: "center", padding: 6 },
  navItem: { flex: 1, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  navActive: { backgroundColor: "#E8C468" },
  navText: { fontSize: 12, fontWeight: "900" },
  player: { flex: 1, backgroundColor: "#000000", justifyContent: "flex-end" },
  playerImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  playerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.32)" },
  playerText: { padding: 28, paddingBottom: 88 },
  playerKicker: { color: "#E8C468", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  playerTitle: { color: "#FFFFFF", fontSize: 38, lineHeight: 42, fontWeight: "900", marginTop: 8 },
  playerCaption: { color: "#F4EFE4", fontSize: 17, lineHeight: 24, fontWeight: "700", marginTop: 10 },
  playerClose: { position: "absolute", right: 18, top: 58, minHeight: 42, borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  playerCloseText: { color: "#FFFFFF", fontWeight: "900" }
});
