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
    notifications: false
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
  { id: "life", label: "Life" },
  { id: "goals", label: "Goals" },
  { id: "vision", label: "Vision" },
  { id: "anti", label: "Anti" },
  { id: "speech", label: "Speech" }
];

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
      Alert.alert("Profile", "Add your first name first.");
      return;
    }
    if (age < 1) {
      Alert.alert("Profile", "Add your age first.");
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
        Alert.alert("Goals", "Keep this list focused: maximum 5 items.");
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
      Alert.alert("Photos", "Allow photo access to add images to your deck.");
      return;
    }
    const deckKey = kind === "vision" ? "visionSlides" : "antiSlides";
    const remaining = MAX_DECK_SLIDES - appState[deckKey].length;
    if (remaining <= 0) {
      Alert.alert("Deck full", `Maximum ${MAX_DECK_SLIDES} images for now.`);
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
      Alert.alert("Self speech", "Write the text you want to listen to first.");
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
      Alert.alert("Self speech", "Write a speech first.");
      return;
    }
    Speech.stop();
    Speech.speak(text, { language: "en-US", rate: 0.88, pitch: 0.96 });
  }

  function resetLocalData() {
    Alert.alert("Reset local data", "This removes the profile, goals, images, and self speeches from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
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
        <Text style={[styles.setupKicker, { color: theme.muted }]}>Profile setup</Text>
        <Text style={[styles.setupTitle, { color: theme.ink }]}>Build your life clock first.</Text>
        <Text style={[styles.setupText, { color: theme.muted }]}>
          Visualize starts empty. Create your profile, then add your goals, images, and self speech step by step.
        </Text>
        <View style={styles.setupFields}>
          <TextInput
            value={String(profileDraft.name || "")}
            onChangeText={(name) => setProfileDraft((current) => ({ ...current, name }))}
            placeholder="First name"
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <TextInput
            value={String(profileDraft.age || "")}
            onChangeText={(age) => setProfileDraft((current) => ({ ...current, age }))}
            keyboardType="number-pad"
            placeholder="Age"
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <TextInput
            value={String(profileDraft.expectancy || "")}
            onChangeText={(expectancy) => setProfileDraft((current) => ({ ...current, expectancy }))}
            keyboardType="number-pad"
            placeholder="Life estimate, example 85"
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={saveProfile}>
          <Text style={styles.primaryText}>Create profile</Text>
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
          <Text style={[styles.kicker, { color: theme.muted }]}>Life clock</Text>
          <Text style={[styles.daysNumber, { color: theme.ink }]}>{stats.daysLeft.toLocaleString("en-US")}</Text>
          <Text style={[styles.daysLabel, { color: theme.muted }]}>estimated days left</Text>
          <View style={[styles.bigProgressTrack, { backgroundColor: theme.soft }]}>
            <View style={[styles.bigProgressFill, { width: `${stats.usedPercent}%` }]} />
          </View>
          <Text style={[styles.body, { color: theme.muted }]}>
            Based on age {stats.age} and a life estimate of {stats.expectancy}. Not a prediction, a reminder.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="weeks" value={stats.weeksLeft} theme={theme} />
          <StatCard label="months" value={stats.monthsLeft} theme={theme} />
          <StatCard label="used" value={`${stats.usedPercent}%`} theme={theme} />
        </View>

        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text style={[styles.panelTitle, { color: theme.ink }]}>Life by months</Text>
          <Text style={[styles.body, { color: theme.muted }]}>Each dot is one month. Filled dots are already spent.</Text>
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
            <Text style={[styles.segmentText, goalMode === "daily" && styles.segmentTextActive]}>Daily tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentButton, goalMode === "long" && styles.segmentActive]} onPress={() => setGoalMode("long")}>
            <Text style={[styles.segmentText, goalMode === "long" && styles.segmentTextActive]}>Long-term goals</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text style={[styles.panelTitle, { color: theme.ink }]}>
            {goalMode === "daily" ? "What moves today forward?" : "What are you building this year?"}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>Add up to 5 items and manually move the progress bar.</Text>
          <View style={styles.addRow}>
            <TextInput
              value={draftGoal}
              onChangeText={setDraftGoal}
              placeholder={goalMode === "daily" ? "Add task" : "Add goal"}
              placeholderTextColor={theme.placeholder}
              style={[styles.addInput, { color: theme.ink, backgroundColor: theme.input }]}
            />
            <TouchableOpacity style={styles.roundButton} onPress={addGoal}>
              <Text style={styles.roundButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!activeGoals.length ? (
          <EmptyState theme={theme} title="Nothing here yet." text="Start with one small action or one long-term goal." />
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
              <Text style={[styles.progressText, { color: theme.muted }]}>{goal.progress || 0}% complete</Text>
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
          <Text style={[styles.panelTitle, { color: theme.ink }]}>{positive ? "Create your Vision" : "Create your Anti-vision"}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            {positive
              ? "Add images of who you want to become, what you want to have, and who you want around you."
              : "Add images of the opposite future: what you do not want to become, lose, or tolerate."}
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => addImages(kind)}>
              <Text style={styles.primaryText}>Add images</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.line }]} onPress={() => (deck.length ? setPlayer({ kind, index: 0 }) : Alert.alert("Deck", "Add images first."))}>
              <Text style={[styles.secondaryText, { color: theme.ink }]}>Play</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!deck.length ? (
          <EmptyState theme={theme} title="No images yet." text="The deck starts empty. Add photos from this iPhone to keep them saved locally." />
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
          <Text style={[styles.panelTitle, { color: theme.ink }]}>Self speech</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Write the self-talk you want to hear repeatedly. Keep it personal, direct, and believable.
          </Text>
          <TextInput
            value={draftSpeechTitle}
            onChangeText={setDraftSpeechTitle}
            placeholder="Title"
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <TextInput
            value={draftSpeechText}
            onChangeText={setDraftSpeechText}
            placeholder="Write your speech here"
            placeholderTextColor={theme.placeholder}
            multiline
            style={[styles.input, styles.speechInput, { color: theme.ink, backgroundColor: theme.input }]}
          />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButtonFlex} onPress={saveSpeech}>
              <Text style={styles.primaryText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.line }]} onPress={newSpeech}>
              <Text style={[styles.secondaryText, { color: theme.ink }]}>New</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButtonFlex} onPress={playSpeech}>
              <Text style={styles.primaryText}>Listen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.line }]} onPress={() => Speech.stop()}>
              <Text style={[styles.secondaryText, { color: theme.ink }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {appState.selfSpeeches.map((speech, index) => (
          <TouchableOpacity key={speech.id} style={[styles.speechPill, { backgroundColor: theme.card, borderColor: index === appState.activeSpeechIndex ? "#E8C468" : theme.line }]} onPress={() => selectSpeech(index)}>
            <Text style={[styles.goalTitle, { color: theme.ink }]}>{speech.title || `Self speech ${index + 1}`}</Text>
            <Text style={[styles.body, { color: theme.muted }]} numberOfLines={2}>{speech.text || "Empty draft"}</Text>
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
              <Text style={[styles.kicker, { color: theme.muted }]}>Local-only profile</Text>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>{appState.profile.name || "Your profile"}</Text>
            </View>
            <TouchableOpacity onPress={() => setProfileOpen(false)}>
              <Text style={[styles.closeText, { color: theme.ink }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Text style={[styles.panelTitle, { color: theme.ink }]}>Device storage</Text>
              <Text style={[styles.body, { color: theme.muted }]}>
                Saved on this iPhone only. Closing the app or restarting the phone will keep the data. Deleting the app removes the local data.
              </Text>
            </View>
            <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Text style={[styles.panelTitle, { color: theme.ink }]}>Cloud-ready data</Text>
              <Text style={[styles.body, { color: theme.muted }]}>
                Your local profile, goals, images, and speeches have stable local IDs. When cloud sync is added, this device can upload its existing data into your account before sync is turned on.
              </Text>
              <Text style={[styles.syncFootnote, { color: theme.muted }]}>
                Device key: {String(appState.localInstallId || "").slice(0, 18)}
              </Text>
            </View>
            <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.line }]}>
              <Text style={[styles.panelTitle, { color: theme.ink }]}>Appearance</Text>
              <View style={styles.switchRow}>
                <Text style={[styles.body, { color: theme.ink }]}>Dark mode</Text>
                <Switch
                  value={appState.settings.darkMode}
                  onValueChange={(darkMode) => updateState((current) => ({ ...current, settings: { ...current.settings, darkMode } }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.body, { color: theme.ink }]}>Notifications later</Text>
                <Switch
                  value={appState.settings.notifications}
                  onValueChange={(notifications) => updateState((current) => ({ ...current, settings: { ...current.settings, notifications } }))}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.dangerButton} onPress={resetLocalData}>
              <Text style={styles.primaryText}>Reset this device</Text>
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
            <Text style={styles.playerKicker}>{player.kind === "vision" ? "Vision" : "Anti-vision"}</Text>
            <Text style={styles.playerTitle}>{slide?.title || "Your deck"}</Text>
            <Text style={styles.playerCaption}>{slide?.caption || ""}</Text>
          </View>
          <TouchableOpacity style={styles.playerClose} onPress={() => setPlayer(null)}>
            <Text style={styles.playerCloseText}>Close</Text>
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
                <Text style={[styles.navText, { color: tab === item.id ? "#101418" : theme.muted }]}>{item.label}</Text>
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
