import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

const tabs = [
  { id: "today", label: "Oggi" },
  { id: "vision", label: "Vision" },
  { id: "anti", label: "Anti" },
  { id: "script", label: "Audio" },
  { id: "premium", label: "Pro" }
];

const starterGoals = [
  {
    id: "goal-health",
    title: "Corpo energico",
    area: "Salute",
    horizon: "12 mesi",
    status: "Attivo",
    photo: null,
    vision:
      "Ti svegli leggero, allenato e concentrato. La giornata inizia con controllo, non con recupero.",
    anti:
      "Se continui a rimandare, l'energia diventa piu rara e ogni settimana richiede piu forza solo per tornare al punto di partenza.",
    nextStep: "Allenamento da 25 minuti entro le 19:00"
  },
  {
    id: "goal-money",
    title: "Liberta finanziaria",
    area: "Soldi",
    horizon: "3 anni",
    status: "In costruzione",
    photo: null,
    vision:
      "Hai entrate stabili, margine mentale e puoi decidere con calma. I soldi diventano uno strumento, non una pressione.",
    anti:
      "Senza un sistema, le urgenze continuano a decidere al posto tuo e il futuro resta appeso alle stesse abitudini.",
    nextStep: "Segna una spesa evitabile e automatizza 20 EUR"
  },
  {
    id: "goal-identity",
    title: "Identita disciplinata",
    area: "Mindset",
    horizon: "90 giorni",
    status: "Priorita",
    photo: null,
    vision:
      "Le tue azioni quotidiane confermano una persona solida, presente e affidabile. La motivazione non guida piu tutto.",
    anti:
      "Se aspetti di sentirti pronto, ogni calo d'umore diventa una spiegazione perfetta per restare fermo.",
    nextStep: "Scrivi tre righe prima di guardare il telefono"
  }
];

const areas = ["Salute", "Soldi", "Carriera", "Relazioni", "Mindset"];
const horizons = ["30 giorni", "90 giorni", "12 mesi", "3 anni"];

function makeGoalTitle(text) {
  const clean = text.trim().replace(/[.?!]+$/, "");
  if (!clean) return "Nuovo obiettivo";
  return clean.length > 32 ? `${clean.slice(0, 32)}...` : clean;
}

function buildPrompt(goal) {
  return [
    "Photorealistic aspirational scene for a personal vision board.",
    `Goal: ${goal.title}.`,
    `Life area: ${goal.area}.`,
    `Time horizon: ${goal.horizon}.`,
    "Show a calm, grounded future identity with cinematic natural light.",
    "No text, no logos, no horror, no medical claims, emotionally motivating but safe."
  ].join(" ");
}

export default function App() {
  const [tab, setTab] = useState("today");
  const [name, setName] = useState("Marco");
  const [goalText, setGoalText] = useState("Diventare disciplinato, forte e libero nelle scelte.");
  const [area, setArea] = useState("Mindset");
  const [horizon, setHorizon] = useState("90 giorni");
  const [intensity, setIntensity] = useState("Diretta");
  const [gentleMode, setGentleMode] = useState(true);
  const [goals, setGoals] = useState(starterGoals);
  const [selectedGoalId, setSelectedGoalId] = useState(starterGoals[0].id);

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) || goals[0];

  const script = useMemo(() => {
    const focus = selectedGoal || goals[0];
    return [
      `${name}, respira. Per i prossimi minuti guardi la tua vita con onesta e direzione.`,
      `Il focus e ${focus.title.toLowerCase()}.`,
      focus.vision,
      gentleMode
        ? "L'anti-vision non serve a spaventarti. Serve a ricordarti che anche non scegliere e una scelta."
        : "Se non agisci, il costo non sparisce: si accumula in energia, tempo e fiducia persa.",
      `Il prossimo passo e semplice: ${focus.nextStep}.`,
      "Non devi dimostrare tutto oggi. Devi solo confermare la tua nuova identita con una scelta reale."
    ].join(" ");
  }, [gentleMode, goals, name, selectedGoal]);

  function addGoal() {
    const title = makeGoalTitle(goalText);
    const goal = {
      id: `goal-${Date.now()}`,
      title,
      area,
      horizon,
      status: "Nuovo",
      photo: null,
      vision: goalText,
      anti: `Se "${title}" resta solo un pensiero, tra ${horizon.toLowerCase()} avrai piu spiegazioni ma meno prove.`,
      nextStep: "Scegli una azione da 10 minuti e falla oggi"
    };
    setGoals([goal, ...goals]);
    setSelectedGoalId(goal.id);
    setTab("vision");
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permesso necessario", "Per usare una foto personale devi autorizzare l'accesso alla libreria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri || !selectedGoal) return;

    setGoals((current) =>
      current.map((goal) => (goal.id === selectedGoal.id ? { ...goal, photo: asset.uri } : goal))
    );
  }

  function speakScript() {
    Speech.stop();
    Speech.speak(script, {
      language: "it-IT",
      rate: 0.92,
      pitch: 0.96
    });
  }

  function stopSpeech() {
    Speech.stop();
  }

  function simulateGeneration() {
    Alert.alert(
      "Prompt AI pronto",
      buildPrompt(selectedGoal),
      [{ text: "OK" }]
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Visualize</Text>
          <Text style={styles.tagline}>Vision board AI, anti-vision e script audio.</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreNumber}>{goals.length}</Text>
          <Text style={styles.scoreLabel}>goals</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {tabs.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => setTab(item.id)}
            style={[styles.tab, tab === item.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === "today" && (
          <View>
            <Text style={styles.heroTitle}>Vedi la persona che stai costruendo.</Text>
            <Text style={styles.heroCopy}>
              Ogni giorno rivedi la vision, ascolti lo script e scegli una prova piccola ma concreta.
            </Text>

            <View style={styles.focusCard}>
              <View style={styles.futureVisual}>
                {selectedGoal?.photo ? (
                  <Image source={{ uri: selectedGoal.photo }} style={styles.photo} />
                ) : (
                  <View style={styles.visualFallback}>
                    <Text style={styles.visualKicker}>Future self</Text>
                    <Text style={styles.visualTitle}>{selectedGoal?.title}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{selectedGoal?.title}</Text>
                <Text style={styles.meta}>{selectedGoal?.area} / {selectedGoal?.horizon}</Text>
                <Text style={styles.body}>{selectedGoal?.vision}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setTab("script")}>
                  <Text style={styles.primaryButtonText}>Ascolta routine</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Azione di oggi</Text>
              <Text style={styles.body}>{selectedGoal?.nextStep}</Text>
            </View>
          </View>
        )}

        {tab === "vision" && (
          <View>
            <Text style={styles.sectionTitle}>Crea o aggiorna la vision</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nome" />
            <TextInput
              value={goalText}
              onChangeText={setGoalText}
              style={[styles.input, styles.textArea]}
              multiline
              placeholder="Descrivi il tuo obiettivo"
            />
            <Text style={styles.label}>Area</Text>
            <View style={styles.chips}>
              {areas.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setArea(item)}
                  style={[styles.chip, area === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, area === item && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Orizzonte</Text>
            <View style={styles.chips}>
              {horizons.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setHorizon(item)}
                  style={[styles.chip, horizon === item && styles.chipActive]}
                >
                  <Text style={[styles.chipText, horizon === item && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={addGoal}>
              <Text style={styles.primaryButtonText}>Aggiungi obiettivo</Text>
            </TouchableOpacity>

            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                onPress={() => setSelectedGoalId(goal.id)}
                style={[styles.goalCard, goal.id === selectedGoalId && styles.goalCardSelected]}
              >
                <View style={styles.thumb}>
                  {goal.photo ? <Image source={{ uri: goal.photo }} style={styles.photo} /> : <Text style={styles.thumbText}>AI</Text>}
                </View>
                <View style={styles.goalText}>
                  <Text style={styles.cardTitle}>{goal.title}</Text>
                  <Text style={styles.meta}>{goal.area} / {goal.horizon} / {goal.status}</Text>
                  <Text style={styles.body}>{goal.vision}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
                <Text style={styles.secondaryButtonText}>Carica foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={simulateGeneration}>
                <Text style={styles.secondaryButtonText}>Prompt AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {tab === "anti" && (
          <View>
            <Text style={styles.sectionTitle}>Anti-vision</Text>
            <Text style={styles.body}>
              Una simulazione del costo del rinvio. E pensata per essere lucida, non traumatica.
            </Text>

            <View style={styles.panel}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.panelTitle}>Modalita protetta</Text>
                  <Text style={styles.muted}>Evita toni troppo duri e contenuti disturbanti.</Text>
                </View>
                <Switch value={gentleMode} onValueChange={setGentleMode} />
              </View>
              <Text style={styles.label}>Intensita</Text>
              <View style={styles.chips}>
                {["Leggera", "Diretta", "Forte"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setIntensity(item)}
                    style={[styles.chip, intensity === item && styles.chipDanger]}
                  >
                    <Text style={[styles.chipText, intensity === item && styles.chipTextDanger]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                onPress={() => setSelectedGoalId(goal.id)}
                style={[styles.warningCard, goal.id === selectedGoalId && styles.warningSelected]}
              >
                <Text style={styles.cardTitle}>{goal.title}</Text>
                <Text style={styles.meta}>{intensity} / {gentleMode ? "protetta" : "senza filtro"}</Text>
                <Text style={styles.body}>{goal.anti}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === "script" && (
          <View>
            <Text style={styles.sectionTitle}>Script audio</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Routine di {name}</Text>
              <Text style={styles.bodyLarge}>{script}</Text>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.primaryButtonFlex} onPress={speakScript}>
                <Text style={styles.primaryButtonText}>Ascolta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButtonFlex} onPress={stopSpeech}>
                <Text style={styles.secondaryButtonText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {tab === "premium" && (
          <View>
            <Text style={styles.sectionTitle}>Visualize Pro</Text>
            <View style={styles.priceCard}>
              <Text style={styles.cardTitle}>Piano consigliato</Text>
              <Text style={styles.price}>9,99 EUR / mese</Text>
              <Text style={styles.body}>
                Immagini AI avanzate, piu obiettivi, audio personalizzati, anti-vision guidata e backup cloud.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => Alert.alert("Paywall demo", "Qui collegheremo StoreKit o RevenueCat per gli abbonamenti iOS.")}
              >
                <Text style={styles.primaryButtonText}>Sblocca Pro</Text>
              </TouchableOpacity>
            </View>

            {["Immagini AI con foto personali", "Script audio illimitati", "Backup cloud", "Routine mattina/sera"].map((item) => (
              <View key={item} style={styles.featureRow}>
                <Text style={styles.check}>✓</Text>
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#101418" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: { color: "#F5F1E8", fontSize: 34, fontWeight: "900" },
  tagline: { color: "#AAB4B8", fontSize: 13, marginTop: 4 },
  scorePill: {
    width: 62,
    height: 62,
    borderRadius: 8,
    backgroundColor: "#E8C468",
    alignItems: "center",
    justifyContent: "center"
  },
  scoreNumber: { color: "#101418", fontSize: 22, fontWeight: "900" },
  scoreLabel: { color: "#101418", fontSize: 11, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 7, paddingHorizontal: 12, paddingBottom: 12 },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: "#1B2228",
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: { backgroundColor: "#E8C468" },
  tabText: { color: "#B9C2C7", fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#101418" },
  content: { padding: 16, paddingBottom: 44 },
  heroTitle: { color: "#F5F1E8", fontSize: 35, lineHeight: 39, fontWeight: "900", marginBottom: 10 },
  heroCopy: { color: "#CFD6D9", fontSize: 16, lineHeight: 23, marginBottom: 16 },
  sectionTitle: { color: "#F5F1E8", fontSize: 26, fontWeight: "900", marginBottom: 14 },
  input: { backgroundColor: "#F8F5EC", color: "#101418", borderRadius: 8, padding: 14, marginBottom: 10 },
  textArea: { minHeight: 98, textAlignVertical: "top" },
  label: { color: "#AAB4B8", fontSize: 13, fontWeight: "800", marginTop: 8, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "#1B2228", borderWidth: 1, borderColor: "#2A353C" },
  chipActive: { backgroundColor: "#E8C468", borderColor: "#E8C468" },
  chipDanger: { backgroundColor: "#DA5A3A", borderColor: "#DA5A3A" },
  chipText: { color: "#CFD6D9", fontWeight: "800" },
  chipTextActive: { color: "#101418" },
  chipTextDanger: { color: "#FFFFFF" },
  focusCard: { backgroundColor: "#182126", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#2A353C", marginBottom: 12 },
  futureVisual: { height: 280, backgroundColor: "#25343A" },
  visualFallback: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
    backgroundColor: "#25343A"
  },
  visualKicker: { color: "#E8C468", fontSize: 12, textTransform: "uppercase", fontWeight: "900" },
  visualTitle: { color: "#F5F1E8", fontSize: 29, lineHeight: 33, fontWeight: "900", marginTop: 6 },
  photo: { width: "100%", height: "100%", resizeMode: "cover" },
  cardBody: { padding: 14 },
  card: { backgroundColor: "#182126", borderRadius: 8, padding: 15, marginTop: 12, borderWidth: 1, borderColor: "#2A353C" },
  panel: { backgroundColor: "#182126", borderRadius: 8, padding: 15, marginTop: 12, borderWidth: 1, borderColor: "#2A353C" },
  panelTitle: { color: "#F5F1E8", fontSize: 17, fontWeight: "900", marginBottom: 5 },
  goalCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#182126",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#2A353C"
  },
  goalCardSelected: { borderColor: "#E8C468" },
  thumb: { width: 78, height: 98, borderRadius: 8, backgroundColor: "#26343C", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbText: { color: "#E8C468", fontWeight: "900", fontSize: 18 },
  goalText: { flex: 1 },
  warningCard: { backgroundColor: "#251D1A", borderRadius: 8, padding: 15, marginTop: 12, borderWidth: 1, borderColor: "#7A3C2D" },
  warningSelected: { borderColor: "#DA5A3A" },
  priceCard: { backgroundColor: "#17231D", borderRadius: 8, padding: 16, borderWidth: 1, borderColor: "#315C45", marginBottom: 12 },
  featureRow: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#182126", borderRadius: 8, padding: 13, marginTop: 8 },
  check: { color: "#6ABF8B", fontSize: 18, fontWeight: "900" },
  cardTitle: { color: "#F5F1E8", fontSize: 18, fontWeight: "900", marginBottom: 4 },
  meta: { color: "#E8C468", fontSize: 12, fontWeight: "800", marginBottom: 8 },
  muted: { color: "#AAB4B8", fontSize: 13, lineHeight: 18 },
  body: { color: "#CFD6D9", fontSize: 15, lineHeight: 22 },
  bodyLarge: { color: "#CFD6D9", fontSize: 17, lineHeight: 27 },
  switchRow: { flexDirection: "row", gap: 14, alignItems: "center", justifyContent: "space-between" },
  primaryButton: { backgroundColor: "#DA5A3A", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  primaryButtonFlex: { flex: 1, backgroundColor: "#DA5A3A", borderRadius: 8, padding: 14, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
  secondaryButton: { flex: 1, backgroundColor: "#1B2228", borderRadius: 8, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#2A353C" },
  secondaryButtonFlex: { flex: 1, backgroundColor: "#1B2228", borderRadius: 8, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#2A353C" },
  secondaryButtonText: { color: "#F5F1E8", fontWeight: "900" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  price: { color: "#E8C468", fontSize: 28, fontWeight: "900", marginVertical: 9 }
});
