import ngrok from "@expo/ngrok";
import "./serve-preview.mjs";

const port = Number(process.env.PORT || 4173);

async function startTunnel() {
  console.log("Creo link pubblico temporaneo...");
  let url = "";
  let lastError = null;

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      url = await ngrok.connect({
        addr: port,
        proto: "http",
        region: "eu"
      });
      break;
    } catch (error) {
      lastError = error;
      console.log(`Tunnel non pronto, riprovo (${attempt}/8)...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  if (!url) {
    throw lastError || new Error("Tunnel non disponibile");
  }

  console.log("");
  console.log("Apri questo link da Safari su iPhone/iPad:");
  console.log(url);
  console.log("");
  console.log("Per aggiungerla alla schermata Home:");
  console.log("Safari -> Condividi -> Aggiungi alla schermata Home");
  console.log("");
  console.log("Lascia questa finestra aperta mentre provi l'app.");
}

startTunnel().catch((error) => {
  console.error("");
  console.error("Non sono riuscito a creare il tunnel pubblico.");
  console.error(error?.message || error);
  console.error("");
  console.error("Fallback: usa start-web-preview e consenti Node.js nel firewall di Windows.");
  process.exitCode = 1;
});
