import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("research", "output");
fs.mkdirSync(outDir, { recursive: true });

const asOf = "2026-06-21";

const sources = {
  gseStats:
    "https://www.gse.it/dati-e-scenari/statistiche",
  gseXlsx:
    "https://www.gse.it/documenti_site/Documenti%20GSE/Rapporti%20statistici/GSE%20-%20Solare%20fotovoltaico%202024%20-%20Allegato.xlsx",
  coingecko:
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur",
  mempoolHashrate:
    "https://mempool.space/api/v1/mining/hashrate/3d",
  mempoolDifficulty:
    "https://mempool.space/api/v1/difficulty-adjustment",
  heatbitTrio:
    "https://heatbit.com/products/heatbit-trio",
  heatbitMaxiPro:
    "https://heatbit.com/products/heatbit-maxi-pro",
  energy21Ofen2:
    "https://21energy.com/products/ofen-2",
  energy21Ofen2Pro:
    "https://21energy.com/products/ofen-2-pro",
  energy21S21:
    "https://21energy.com/products/bitcoin-antminer-s21",
  energy21Hydro:
    "https://21energy.com/products/bitmain-antminer-s21-xp-hydro",
  ry3t:
    "https://ry3t.com/",
  ce:
    "https://europa.eu/youreurope/business/product-requirements/labels-markings/ce-marking/index_en.htm",
  arera:
    "https://www.arera.it/",
};

const data = {
  btc: {
    priceUsd: 64118,
    priceEur: 55889,
    networkHashrateEHs: 937.4973784462047,
    difficulty: 124_932_866_006_548.2,
    blockSubsidyBtc: 3.125,
    blocksPerDay: 144,
    feeUplift: 0.015,
    poolFee: 0.02,
  },
  gsePv2024: {
    italyTotalPlants: 1_875_870,
    italyResidentialPlants: 1_604_513,
    italyStorageSystems: 734_187,
    taaTotalPlants: 50_297,
    taaResidentialPlants: 38_772,
    bolzanoTotalPlants: 17_780,
    trentoTotalPlants: 32_517,
    bolzanoResidentialPlants: 10_671,
    trentoResidentialPlants: 28_101,
  },
  asic: {
    model: "Bitmain Antminer S21 200 TH/s",
    hashrateTHs: 200,
    powerKW: 3.56,
    marketPriceEur: 1_950,
    energyEfficiencyJPerTH: 17.8,
  },
  household: {
    persons: 3,
    litresPerPersonDay: 45,
    coldWaterC: 10,
    hotWaterC: 45,
    usefulDhwKWhYear: 2_300,
    heatRecoveryEfficiency: 0.85,
  },
};

const n0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const n2 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const money = (value) => `EUR ${n0.format(value)}`;

function fullTimeMiningRevenueYear(factor = 1) {
  const networkTHs = data.btc.networkHashrateEHs * 1_000_000;
  const btcDay =
    (data.asic.hashrateTHs / networkTHs) *
    data.btc.blocksPerDay *
    data.btc.blockSubsidyBtc *
    (1 + data.btc.feeUplift);
  const revenueDay = btcDay * data.btc.priceEur * (1 - data.btc.poolFee) * factor;
  return { btcDay, revenueDay, revenueYear: revenueDay * 365 };
}

const fullMining = fullTimeMiningRevenueYear();
const fullYearElectricityKWh = data.asic.powerKW * 24 * 365;
const miningRevenuePerKWh = fullMining.revenueYear / fullYearElectricityKWh;
const electricityForDhwKWh =
  data.household.usefulDhwKWhYear / data.household.heatRecoveryEfficiency;
const minerHoursForDhw = electricityForDhwKWh / data.asic.powerKW;

const customerScenarios = [
  {
    name: "Pessimistico",
    installedCost: 9_000,
    electricityCost: 0.32,
    alternativeHeatValue: 0.11,
    hashpriceFactor: 0.65,
    note: "Casa senza FV utile, calore alternativo economico (gas/PDC), BTC o difficulty sfavorevoli.",
  },
  {
    name: "Realistico",
    installedCost: 7_900,
    electricityCost: 0.18,
    alternativeHeatValue: 0.22,
    hashpriceFactor: 1.0,
    note: "Mix FV autoconsumato/surplus e rete, sostituzione parziale di ACS elettrica.",
  },
  {
    name: "Ottimistico",
    installedCost: 6_500,
    electricityCost: 0.08,
    alternativeHeatValue: 0.28,
    hashpriceFactor: 1.75,
    note: "FV surplus reale, baseline boiler elettrico, prezzo/difficulty favorevoli e costo impianto basso.",
  },
].map((s) => {
  const energyCost = electricityForDhwKWh * s.electricityCost;
  const heatSavings = data.household.usefulDhwKWhYear * s.alternativeHeatValue;
  const btcRevenue = electricityForDhwKWh * miningRevenuePerKWh * s.hashpriceFactor;
  const netAnnual = heatSavings + btcRevenue - energyCost;
  return {
    ...s,
    minerHours: minerHoursForDhw,
    electricityKWh: electricityForDhwKWh,
    usefulHeatKWh: data.household.usefulDhwKWhYear,
    btcRevenue,
    heatSavings,
    energyCost,
    netAnnual,
    paybackYears: netAnnual > 0 ? s.installedCost / netAnnual : null,
  };
});

const alwaysOnGrid = {
  electricityKWh: fullYearElectricityKWh,
  electricityCost: fullYearElectricityKWh * 0.28,
  btcRevenue: fullMining.revenueYear,
  usefulHeatValue: data.household.usefulDhwKWhYear * 0.28,
};
alwaysOnGrid.netAnnual =
  alwaysOnGrid.btcRevenue + alwaysOnGrid.usefulHeatValue - alwaysOnGrid.electricityCost;

const companyUnit = {
  installedPrice: 8_900,
  materials: {
    asic: 1_950,
    heatRecoveryKit: 750,
    heatExchangerAndHydraulics: 650,
    bufferTankAndControls: 1_050,
    pumpsValvesSensors: 550,
    electricalPanelSafety: 650,
    controllerAndMonitoring: 250,
    logisticsWarrantyConsumables: 450,
  },
  installationLabor: 850,
  engineeringCommissioning: 450,
  assistanceReserve: 250,
};
companyUnit.materialsTotal = Object.values(companyUnit.materials).reduce((a, b) => a + b, 0);
companyUnit.directCost =
  companyUnit.materialsTotal +
  companyUnit.installationLabor +
  companyUnit.engineeringCommissioning +
  companyUnit.assistanceReserve;
companyUnit.grossProfit = companyUnit.installedPrice - companyUnit.directCost;
companyUnit.grossMargin = companyUnit.grossProfit / companyUnit.installedPrice;

const companyScenarios = [
  { installs: 10, fixedOpex: 220_000, serviceRevenue: 1_500 },
  { installs: 50, fixedOpex: 285_000, serviceRevenue: 10_000 },
  { installs: 100, fixedOpex: 360_000, serviceRevenue: 25_000 },
].map((s) => {
  const revenue = s.installs * companyUnit.installedPrice + s.serviceRevenue;
  const grossProfit = s.installs * companyUnit.grossProfit + s.serviceRevenue * 0.55;
  return {
    ...s,
    revenue,
    grossProfit,
    ebit: grossProfit - s.fixedOpex,
    ebitMargin: (grossProfit - s.fixedOpex) / revenue,
  };
});

const tamSamSom = [
  {
    area: "Italia",
    tam: 6_500_000,
    samLow: 80_000,
    samHigh: 180_000,
    som3yLow: 300,
    som3yHigh: 1_000,
    basis:
      "TAM stimato: case con impianto ACS individuale e spazio tecnico; SAM derivato da 1,60M FV residenziali GSE filtrati per casa indipendente, surplus FV, quadro elettrico e interesse BTC.",
  },
  {
    area: "Trentino-Alto Adige",
    tam: 140_000,
    samLow: 1_000,
    samHigh: 2_500,
    som3yLow: 20,
    som3yHigh: 60,
    basis:
      "SAM derivato da 38.772 impianti FV residenziali GSE nelle province di Bolzano e Trento, con filtro severo su compatibilita tecnica e disponibilita ad acquistare.",
  },
];

const segmentRows = [
  ["Possessori FV", "Molto alta", "Media-alta", "Media", "Miglior filtro iniziale, ma solo se esiste surplus o autoconsumo non valorizzato."],
  ["Bitcoiner", "Bassa-media", "Alta", "Media-alta", "Comprano la narrativa, ma spesso preferiscono miner puro o DIY."],
  ["Case indipendenti", "Alta", "Media", "Bassa-media", "Necessarie per spazio, rumore, canna/ventilazione e quadro elettrico."],
  ["Early adopter tecnologici", "Media", "Alta", "Media", "Buoni piloti, ma CAC alto e aspettative di prodotto elevate."],
  ["Agriturismi/piccole strutture", "Media", "Alta", "Media-alta", "Target migliore se hanno ACS continuativa, lavanderia, piscina/spa o accumuli maggiori."],
];

const competitors = [
  ["Heatbit Trio", "USD 849", "10 TH/s, 400 W mining + 1.100 W resistenza; aria, purificatore", "Prodotto consumer semplice, app e brand", "Non recupera calore in ACS; hashrate basso; stagionale"],
  ["Heatbit Maxi Pro", "USD 1.499", "Fino a 60 TH/s, 1.500 W calore mining; aria, purificatore", "Buon benchmark consumer plug-in", "Solo riscaldamento ambiente, non idraulico"],
  ["21Energy Ofen 2", "EUR 1.780-1.940", "Fino a 40 TH/s, 1.000 W, <45 dB", "Prodotto UE, silenzioso, app, prezzo chiaro", "Non ACS; rendimento economico limitato"],
  ["21Energy Ofen 2 Pro", "EUR 2.240-2.410", "Fino a 60 TH/s, 1.100 W, <45 dB", "Segmento premium europeo", "Resta un heater ambiente"],
  ["RY3T ONE", "Non pubblicato", "Modulo in impianto termico esistente, 7-14 kW termici dichiarati", "Competitor piu vicino al concept idronico", "Alta potenza: piu adatto a case grandi/strutture; rischio installazione e CAPEX"],
];

function barChart({ title, labels, values, width = 820, height = 360, suffix = "", colors }) {
  const pad = { l: 74, r: 28, t: 56, b: 70 };
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const y = (v) => pad.t + ((max - v) / span) * plotH;
  const zeroY = y(0);
  const band = plotW / values.length;
  const barW = Math.min(92, band * 0.58);
  const palette = colors || ["#1b6f68", "#d67b2a", "#344b9b", "#7b6d5d"];
  const bars = values
    .map((v, i) => {
      const x = pad.l + i * band + (band - barW) / 2;
      const yTop = v >= 0 ? y(v) : zeroY;
      const h = Math.abs(y(v) - zeroY);
      const label = `${n0.format(v)}${suffix}`;
      return `<rect x="${x}" y="${yTop}" width="${barW}" height="${h}" rx="4" fill="${palette[i % palette.length]}"/><text x="${x + barW / 2}" y="${v >= 0 ? yTop - 8 : yTop + h + 18}" text-anchor="middle" font-size="13" fill="#1d2528">${label}</text><text x="${x + barW / 2}" y="${height - 34}" text-anchor="middle" font-size="13" fill="#334">${labels[i]}</text>`;
    })
    .join("");
  const ticks = [min, min + span * 0.25, min + span * 0.5, min + span * 0.75, max]
    .map((v) => `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#d9e1e2" stroke-width="1"/><text x="${pad.l - 10}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#667">${n0.format(v)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${pad.l}" y="30" font-size="22" font-weight="700" fill="#162125">${title}</text>
  ${ticks}
  <line x1="${pad.l}" x2="${width - pad.r}" y1="${zeroY}" y2="${zeroY}" stroke="#1d2528" stroke-width="1.4"/>
  ${bars}
</svg>`;
}

function funnelChart() {
  const labels = ["TAM Italia", "SAM Italia", "SOM 3 anni Italia", "TAM TAA", "SAM TAA", "SOM 3 anni TAA"];
  const values = [
    tamSamSom[0].tam,
    (tamSamSom[0].samLow + tamSamSom[0].samHigh) / 2,
    (tamSamSom[0].som3yLow + tamSamSom[0].som3yHigh) / 2,
    tamSamSom[1].tam,
    (tamSamSom[1].samLow + tamSamSom[1].samHigh) / 2,
    (tamSamSom[1].som3yLow + tamSamSom[1].som3yHigh) / 2,
  ];
  const logValues = values.map((v) => Math.log10(v));
  const svg = barChart({
    title: "Funnel di mercato (scala log10)",
    labels,
    values: logValues,
    suffix: "",
    colors: ["#1b6f68", "#3f8f88", "#9bbf54", "#344b9b", "#6376bd", "#d67b2a"],
  });
  return svg.replace(
    "</svg>",
    `<text x="74" y="350" font-size="12" fill="#667">Valori etichette in log10 per rendere visibili TAM e SOM nello stesso grafico.</text></svg>`,
  );
}

const charts = {
  customerNet: barChart({
    title: "Cliente: beneficio netto annuo per scenario",
    labels: customerScenarios.map((s) => s.name),
    values: customerScenarios.map((s) => Math.round(s.netAnnual)),
    suffix: " EUR",
    colors: ["#b84d3a", "#d67b2a", "#1b6f68"],
  }),
  companyEbit: barChart({
    title: "Azienda: EBIT stimato per volume installazioni",
    labels: companyScenarios.map((s) => `${s.installs}/anno`),
    values: companyScenarios.map((s) => Math.round(s.ebit)),
    suffix: " EUR",
    colors: ["#b84d3a", "#b84d3a", "#b84d3a"],
  }),
  marketFunnel: funnelChart(),
  alwaysOn: barChart({
    title: "Uso 24/7 da rete: perche non funziona per ACS",
    labels: ["BTC", "Calore ACS", "Energia", "Netto"],
    values: [
      Math.round(alwaysOnGrid.btcRevenue),
      Math.round(alwaysOnGrid.usefulHeatValue),
      -Math.round(alwaysOnGrid.electricityCost),
      Math.round(alwaysOnGrid.netAnnual),
    ],
    suffix: " EUR",
    colors: ["#344b9b", "#1b6f68", "#b84d3a", "#1d2528"],
  }),
};

for (const [name, svg] of Object.entries(charts)) {
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg, "utf8");
}

function mdTable(headers, rows) {
  const clean = (v) => String(v).replace(/\n/g, "<br>");
  return [
    `| ${headers.map(clean).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(clean).join(" | ")} |`),
  ].join("\n");
}

function htmlTable(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

const componentRows = [
  ["ASIC SHA-256", "Genera hash e calore quasi pari all'energia elettrica assorbita.", "EUR 1.400-2.000 air S21; EUR 4.000-8.000 modelli recenti/hydro", "Bitmain, MicroBT, Canaan; rivenditori UE come 21Energy"],
  ["Recupero calore", "Convoglia o trasferisce il calore ASIC verso circuito acqua.", "EUR 600-2.500 retrofit air-to-water/hydro; EUR 2.000-5.000 immersione", "DCX, Engineered Fluids, Fog Hashing, fornitori HVAC custom"],
  ["Scambiatore a piastre", "Separa circuito miner da ACS/accumulo e trasferisce potenza termica.", "EUR 150-600", "Alfa Laval, SWEP, Caleffi, Reflex"],
  ["Boiler/accumulo", "Stocca ACS e riduce cicli on/off del miner.", "EUR 700-2.000", "Cordivari, Ariston, Vaillant, Viessmann, Austria Email"],
  ["Pompe/valvole/sensori", "Circolazione, anticondensa, sicurezza, miscelazione anti-scottatura.", "EUR 300-900", "Grundfos, Wilo, Caleffi, Honeywell/Resideo"],
  ["Quadro elettrico", "Linea dedicata, protezioni, sezionamento, misura, gestione carichi.", "EUR 500-1.200", "ABB, Schneider Electric, Gewiss, Finder"],
  ["Monitoraggio software", "Controlla temperatura, hash, consumi, allarmi, wallet/pool non custodial.", "EUR 200-800 setup + EUR 5-20/mese", "Braiins OS, LuxOS, Home Assistant, Node-RED, Hiveon"],
];

const customerRows = customerScenarios.map((s) => [
  s.name,
  money(s.installedCost),
  `${n0.format(s.electricityKWh)} kWh`,
  money(s.energyCost),
  money(s.btcRevenue),
  money(s.heatSavings),
  money(s.netAnnual),
  s.paybackYears ? `${n1.format(s.paybackYears)} anni` : "Mai",
]);

const companyRows = companyScenarios.map((s) => [
  `${s.installs}`,
  money(s.revenue),
  money(s.grossProfit),
  money(s.fixedOpex),
  money(s.ebit),
  `${n1.format(s.ebitMargin * 100)}%`,
]);

const tamRows = tamSamSom.map((r) => [
  r.area,
  n0.format(r.tam),
  `${n0.format(r.samLow)}-${n0.format(r.samHigh)}`,
  `${n0.format(r.som3yLow)}-${n0.format(r.som3yHigh)}`,
  r.basis,
]);

const sourcesRows = [
  ["GSE", "Fotovoltaico Italia 2024, impianti totali/residenziali e dati Bolzano/Trento", sources.gseStats],
  ["GSE allegato XLSX", "Fonte numerica estratta: 1.875.870 impianti FV totali, 1.604.513 residenziali; TAA 50.297 totali, 38.772 residenziali", sources.gseXlsx],
  ["CoinGecko API", `BTC ${money(data.btc.priceEur)} / USD ${n0.format(data.btc.priceUsd)} al ${asOf}`, sources.coingecko],
  ["mempool.space", `Hashrate corrente ${n1.format(data.btc.networkHashrateEHs)} EH/s e difficulty ${n0.format(data.btc.difficulty)}`, sources.mempoolHashrate],
  ["Heatbit", "Prezzi e caratteristiche Trio / Maxi Pro", sources.heatbitTrio],
  ["21Energy", "Prezzi e caratteristiche Ofen 2 / Ofen 2 Pro / Antminer S21", sources.energy21Ofen2],
  ["RY3T", "Sistema idronico RY3T ONE, range dichiarato 7-14 kW", sources.ry3t],
  ["UE CE marking", "Obblighi generali marcatura CE", sources.ce],
  ["ARERA", "Quadro regolatorio energia e riferimento per offerte/tariffe elettriche", sources.arera],
];

const reportMd = `# Startup ASIC Heat Recovery per ACS domestica

**Report di fattibilita - focus Italia e Trentino-Alto Adige**  
Data analisi: ${asOf}

## 1. Executive summary

**Verdetto sintetico:** l'idea e tecnicamente fattibile, ma **non e una startup scalabile interessante se il cliente tipo e la famiglia media che vuole solo acqua calda sanitaria (ACS)**. Il recupero del calore funziona; il problema e economico e di product-market fit: un ASIC moderno da ${data.asic.powerKW} kW produce molta piu potenza termica del fabbisogno ACS medio, mentre il mining con elettricita retail italiana e strutturalmente negativo.

La tesi diventa piu credibile solo in una nicchia: clienti con fotovoltaico, surplus non valorizzato, alto fabbisogno termico continuo e tolleranza verso Bitcoin/mining. In Trentino-Alto Adige il target iniziale migliore non e la famiglia media, ma **agriturismi, B&B, piccole strutture ricettive e case indipendenti di Bitcoiner con FV**, dove ACS, lavanderia, riscaldamento integrativo, spa/piscina o accumuli piu grandi aumentano le ore termiche utili.

- **Sostenibilita dell'idea:** si, come integrazione impiantistica di nicchia; no, come prodotto domestico generalista ACS-only.
- **Vantaggi:** recupero di calore altrimenti disperso; narrativa forte per Bitcoiner; possibilita di usare surplus FV; differenziazione rispetto a heater aria.
- **Rischi principali:** payback cliente debole, stagionalita e sottoutilizzo ACS, prezzo/difficulty BTC, responsabilita installativa, rumore/sicurezza elettrica, CAC alto.
- **Probabilita di successo:** **28/100** per startup B2C domestica ACS-only; **45/100** se riposizionata su piccoli clienti con alto carico termico e FV.
- **Capitale iniziale consigliato:** minimo **EUR 250k-400k** per prototipo, 5-10 piloti e certificazioni/assicurazioni di base; **EUR 800k-1,5M** se si sviluppa hardware proprietario, opzione sconsigliata all'inizio.

![Cliente: beneficio netto annuo](customerNet.svg)

## 2. Analisi tecnica

Il sistema base usa un ASIC SHA-256 come generatore elettrico-termico: quasi tutta l'energia assorbita diventa calore. Il calore viene trasferito a un circuito idraulico tramite air-to-water, waterblock/hydro o immersione, passa in uno scambiatore e carica un accumulo ACS. Una centralina decide quando minare in base a temperatura accumulo, disponibilita FV, prezzo energia, limiti elettrici e allarmi.

${mdTable(["Componente", "Funzione", "Costo indicativo", "Fornitori/produttori"], componentRows)}

**Architettura A - integrazione componenti esistenti:** e la sola strada sensata per i primi 18-24 mesi. Si compra un ASIC CE/UE o importato con documentazione, si integra con componenti idraulici certificati e si vende progettazione, installazione, monitoraggio e manutenzione. Prototipo realistico: EUR 20k-40k; 5 piloti: EUR 80k-150k.

**Architettura B - hardware proprietario:** aumenta il controllo sul prodotto, ma sposta la startup in una traiettoria industriale costosa: progettazione termica/elettrica, CE/EMC/LVD/RED, prove di sicurezza, firmware, tooling, inventory, garanzia e assistenza. NRE realistico: EUR 500k-1,5M prima di avere un prodotto vendibile. Non va fatta prima di aver dimostrato domanda pagante.

**Criticita tecnica maggiore:** per una famiglia da ${data.household.persons} persone assumo ${n0.format(data.household.usefulDhwKWhYear)} kWh/anno utili di ACS. Con recupero ${n0.format(data.household.heatRecoveryEfficiency * 100)}%, il miner deve consumare circa ${n0.format(electricityForDhwKWh)} kWh/anno, cioe solo ${n0.format(minerHoursForDhw)} ore/anno. Un ASIC da 3,56 kW usato 24/7 consuma invece ${n0.format(fullYearElectricityKWh)} kWh/anno: per ACS pura la maggior parte del calore sarebbe inutilizzata.

![Uso 24/7 da rete](alwaysOn.svg)

## 3. Analisi di mercato

I dati GSE 2024 indicano **${n0.format(data.gsePv2024.italyTotalPlants)} impianti FV in Italia**, di cui **${n0.format(data.gsePv2024.italyResidentialPlants)} residenziali**. In Trentino-Alto Adige risultano **${n0.format(data.gsePv2024.taaTotalPlants)} impianti FV totali** e **${n0.format(data.gsePv2024.taaResidentialPlants)} residenziali**: Bolzano ${n0.format(data.gsePv2024.bolzanoResidentialPlants)} residenziali, Trento ${n0.format(data.gsePv2024.trentoResidentialPlants)}.

${mdTable(["Area", "TAM tecnico stimato", "SAM realistico", "SOM 3 anni", "Base stima"], tamRows)}

![Funnel mercato](marketFunnel.svg)

${mdTable(["Segmento", "Dimensione mercato", "Capacita di spesa", "Probabilita acquisto", "Valutazione"], segmentRows)}

**Classifica target iniziali:**

1. **Agriturismi e piccole strutture ricettive con FV e ACS elevata** - miglior target, perche aumentano le ore termiche utili e possono giustificare manutenzione/monitoraggio.
2. **Bitcoiner con casa indipendente e FV** - acquisto emozionale/ideologico piu probabile, ma mercato piccolo.
3. **Case indipendenti con boiler elettrico e surplus FV** - payback possibile solo in scenario ottimistico.
4. **Early adopter tecnologici** - utili per piloti, non sufficienti per scalare.
5. **Famiglia media senza FV** - target da evitare.

## 4. Concorrenza

${mdTable(["Competitor", "Prezzo", "Caratteristiche", "Punti di forza", "Punti deboli"], competitors)}

La concorrenza diretta sui boiler idronici e ancora limitata. Heatbit e 21Energy validano l'idea "heater + mining", ma restano prodotti aria/ambiente. RY3T e piu vicino all'idea di integrazione termica domestica, con potenze dichiarate 7-14 kW: questa e una conferma della direzione tecnica, ma anche un segnale che il mercato naturale potrebbe essere riscaldamento/impianto termico, non ACS-only.

## 5. Modello economico cliente

Assunzioni principali:

- ASIC: ${data.asic.model}, ${data.asic.hashrateTHs} TH/s, ${data.asic.powerKW} kW, prezzo mercato UE circa ${money(data.asic.marketPriceEur)}.
- BTC al ${asOf}: ${money(data.btc.priceEur)}; hashrate rete: ${n1.format(data.btc.networkHashrateEHs)} EH/s.
- Ricavo mining a condizioni correnti: circa ${money(fullMining.revenueYear)} lordi/anno se l'ASIC resta acceso 24/7; circa ${money(miningRevenuePerKWh * 1000)} per MWh elettrico consumato.
- ACS famiglia media modellata: ${n0.format(data.household.usefulDhwKWhYear)} kWh/anno utili; miner acceso solo per coprire ACS: ${n0.format(minerHoursForDhw)} ore/anno.

${mdTable(["Scenario", "Costo impianto", "Consumo elettrico miner", "Costo energia", "BTC minati (valore)", "Risparmio energia termica", "Beneficio netto annuo", "Payback"], customerRows)}

Conclusione cliente: anche nello scenario realistico il payback e circa **${n1.format(customerScenarios[1].paybackYears)} anni**. Lo scenario ottimistico scende sotto 10 anni, ma richiede simultaneamente FV surplus a basso costo opportunita, boiler elettrico come baseline, hashprice favorevole e installazione sotto EUR 6.500. Se il cliente scalda ACS con pompa di calore o gas efficiente, il valore termico scende e il payback peggiora drasticamente.

## 6. Modello economico azienda

Distinta base realistica per integrazione non proprietaria:

${mdTable(
  ["Voce", "Costo"],
  [
    ["Materiali totali", money(companyUnit.materialsTotal)],
    ["Installazione diretta", money(companyUnit.installationLabor)],
    ["Progettazione/commissioning", money(companyUnit.engineeringCommissioning)],
    ["Riserva assistenza", money(companyUnit.assistanceReserve)],
    ["Costo diretto totale", money(companyUnit.directCost)],
    ["Prezzo installato ipotizzato", money(companyUnit.installedPrice)],
    ["Margine lordo unitario", `${money(companyUnit.grossProfit)} (${n1.format(companyUnit.grossMargin * 100)}%)`],
  ],
)}

${mdTable(["Installazioni/anno", "Ricavi", "Margine lordo", "Opex annui", "Utile/EBIT", "EBIT margin"], companyRows)}

![EBIT azienda](companyEbit.svg)

L'azienda non copre una squadra minima ai volumi 10-50/anno e resta fragile anche a 100/anno. Con il margine unitario calcolato qui, il break-even e oltre **300 installazioni/anno**; anche portando il margine a EUR 2.000 servirebbero circa 140-180 installazioni/anno. Aumentare il prezzo sopra EUR 10.500 migliora l'azienda, ma peggiora il payback cliente. Questo e il conflitto centrale del business model.

## 7. Team necessario

${mdTable(
  ["Ruolo", "Competenze", "Costo annuo lordo/fully loaded"],
  [
    ["Founder / business development", "Vendita tecnica, partnership installatori, fundraising, gestione piloti", "EUR 55k-80k"],
    ["Ingegnere energetico / termotecnico", "Schemi ACS, dimensionamento accumuli, sicurezza, pratiche, DICO/relazioni", "EUR 65k-90k"],
    ["Elettricista/installatore lead", "Linee dedicate, protezioni, commissioning, coordinamento idraulico", "EUR 45k-65k"],
    ["Sviluppatore software/IoT", "Telemetria, app, allarmi, firmware, integrazione pool/wallet non custodial", "EUR 55k-85k"],
  ],
)}

Primo anno consigliato: founder full-time, termotecnico part-time/consulente, installazione in subcontract, software contractor. Assumere tutta la squadra prima di 20-30 piloti paganti brucia capitale senza prova di domanda.

## 8. Aspetti normativi

- **Marcatura CE:** obbligatoria per apparecchi immessi sul mercato UE quando ricadono nelle direttive applicabili. Per un sistema proprietario si applicano almeno bassa tensione, compatibilita elettromagnetica e, se radio/Wi-Fi integrati, RED; possibili RoHS/ecodesign e valutazioni su pressione/macchine a seconda dell'architettura.
- **Impianti in edificio:** in Italia l'installazione elettrica e idraulica deve essere eseguita da imprese abilitate con dichiarazioni di conformita. La startup deve vendere tramite installatori qualificati o diventarlo.
- **Sicurezza elettrica:** un carico continuo da 3-6 kW richiede linea dedicata, protezioni, sezionamento, controllo temperatura, verifica potenza contrattuale e spesso aumento kW/monofase-trifase.
- **ACS:** servono miscelatore antiscottatura, valvole di sicurezza, vaso espansione, prevenzione legionella, materiali idonei acqua sanitaria e gestione temperature.
- **Responsabilita legale:** rischio incendio/allagamento, danni da surriscaldamento ASIC, garanzia su componenti modificati, assicurazione RC prodotti/installazione.
- **Mining:** il mining domestico non e vietato in se, ma i proventi possono avere rilevanza fiscale. La startup deve evitare custodia BTC o gestione centralizzata dei wallet per non entrare in rischi AML/finanziari; meglio configurazione non custodial, account pool intestato al cliente.

## 9. Go-to-market

${mdTable(
  ["Fase", "Durata", "Costo", "KPI"],
  [
    ["Prototipo tecnico", "0-3 mesi", "EUR 20k-40k", "COP termico effettivo verso accumulo >80%; spegnimento sicuro; telemetria stabile 30 giorni"],
    ["Cliente pilota", "3-6 mesi", "EUR 30k-70k", "1-3 siti, zero incidenti, ore utili termiche >700/anno proiettate, NPS tecnico positivo"],
    ["Primi 10 clienti", "6-12 mesi", "EUR 120k-220k", "CAC < EUR 1.500, margine lordo >20%, tempo installazione <2 giorni, ticket assistenza <1/mese/sito"],
    ["Espansione TAA/Nord Italia", "12-24 mesi", "EUR 250k-500k", "50+ installazioni cumulative, partnership 3-5 installatori, churn manutenzione <5%, casi studio pubblici"],
  ],
)}

Canali consigliati: installatori FV/termotecnici locali, community Bitcoin italiane, associazioni agriturismi, fiere energia/ospitalita, casi pilota documentati con dashboard pubblica. Evitare advertising B2C largo prima di avere payback dimostrato su clienti ad alto carico termico.

## 10. Verdetto finale

- **Probabilita di successo:** 28/100 come ACS domestico B2C; 45/100 se riposizionato su piccoli utenti con alto carico termico.
- **Capitale minimo necessario:** EUR 250k-400k per provare il modello integratore; EUR 800k-1,5M per hardware proprietario, sconsigliato prima della validazione.
- **Miglior target iniziale:** agriturismi/B&B/case indipendenti premium in Trentino-Alto Adige con FV, boiler/accumulo, ACS elevata e proprietario favorevole a Bitcoin.
- **Principali rischi:** economia cliente debole, potenza ASIC sovradimensionata per ACS, volatilita BTC/difficulty, responsabilita impiantistica, customer acquisition cost, installazioni non standard.
- **Raccomandazione:** procedere solo con **pilota integrato e misurato**, non con sviluppo hardware. La metrica di stop/go deve essere: almeno 5 clienti paganti con beneficio netto dimostrato > EUR 600/anno o disponibilita a pagare non basata sul solo ROI. Se i piloti familiari non raggiungono questa soglia, spostare il prodotto verso carichi termici maggiori o chiudere il caso business.

## Fonti e note

${mdTable(["Fonte", "Uso nel report", "Link"], sourcesRows)}

Le stime TAM/SAM/SOM non sono dati pubblicati: sono derivate dai dati FV GSE e da filtri operativi su compatibilita tecnica, profilo cliente e probabilita di acquisto. Le tariffe elettriche usate negli scenari sono ipotesi operative conservative/realistiche/ottimistiche; nella vendita reale vanno sostituite con bolletta, contratto FV e valore di esportazione del singolo cliente.
`;

function renderMarkdown(md) {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let html = escaped;
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^\*\*(.*)\*\*  $/gm, "<p><strong>$1</strong></p>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/!\[(.*?)\]\((.*?)\.svg\)/g, (_, alt, file) => {
    const svg = fs.readFileSync(path.join(outDir, `${file}.svg`), "utf8");
    return `<figure>${svg}<figcaption>${alt}</figcaption></figure>`;
  });
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2">$1</a>',
  );
  html = html.replace(/(?:^\| .*\|$\n?)+/gm, (block) => {
    const lines = block.trim().split("\n");
    const headers = lines[0].split("|").slice(1, -1).map((s) => s.trim());
    const rows = lines.slice(2).map((line) => line.split("|").slice(1, -1).map((s) => s.trim()));
    return htmlTable(headers, rows);
  });
  html = html.replace(/^- (.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.*)$/gm, "<li>$1</li>");
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h/g, "<h").replace(/<\/h([12])><\/p>/g, "</h$1>");
  html = html.replace(/<p><table/g, "<table").replace(/<\/table><\/p>/g, "</table>");
  html = html.replace(/<p><figure/g, "<figure").replace(/<\/figure><\/p>/g, "</figure>");
  html = html.replace(/<p><ul>/g, "<ul>").replace(/<\/ul><\/p>/g, "</ul>");
  return html;
}

const reportHtml = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Startup ASIC Heat Recovery per ACS domestica</title>
  <style>
    :root { color-scheme: light; --ink:#162125; --muted:#5d6a70; --line:#d9e1e2; --accent:#1b6f68; --warn:#b84d3a; }
    body { margin:0; font-family: Arial, Helvetica, sans-serif; color:var(--ink); background:#f5f7f7; line-height:1.48; }
    main { max-width: 1040px; margin: 0 auto; padding: 42px 32px 72px; background:#fff; box-shadow:0 0 0 1px #e6ecec; }
    h1 { font-size: 34px; line-height:1.12; margin: 0 0 8px; }
    h2 { font-size: 24px; margin: 34px 0 12px; border-top: 2px solid var(--line); padding-top: 22px; }
    p { margin: 0 0 13px; }
    ul { margin: 0 0 16px 22px; padding:0; }
    li { margin: 4px 0; }
    table { width:100%; border-collapse: collapse; margin: 14px 0 22px; font-size: 13px; }
    th { text-align:left; background:#eaf2f1; color:#102023; padding:9px; border:1px solid var(--line); vertical-align:top; }
    td { padding:9px; border:1px solid var(--line); vertical-align:top; }
    figure { margin: 20px 0 28px; border:1px solid var(--line); padding:12px; background:#fff; }
    figure svg { width:100%; height:auto; display:block; }
    figcaption { color:var(--muted); font-size:12px; margin-top:8px; }
    a { color:#185f85; }
    strong { color:#0f1e22; }
    @media print {
      body { background:#fff; }
      main { box-shadow:none; max-width:none; padding:18mm; }
      h2 { break-after: avoid; }
      table, figure { break-inside: avoid; }
    }
  </style>
</head>
<body><main>${renderMarkdown(reportMd)}</main></body></html>`;

fs.writeFileSync(path.join(outDir, "asic_heat_recovery_startup_report.md"), reportMd, "utf8");
fs.writeFileSync(path.join(outDir, "asic_heat_recovery_startup_report.html"), reportHtml, "utf8");
fs.writeFileSync(
  path.join(outDir, "model_data.json"),
  JSON.stringify(
    {
      asOf,
      sources,
      data,
      fullMining,
      fullYearElectricityKWh,
      miningRevenuePerKWh,
      electricityForDhwKWh,
      minerHoursForDhw,
      alwaysOnGrid,
      customerScenarios,
      companyUnit,
      companyScenarios,
      tamSamSom,
      segmentRows,
      competitors,
    },
    null,
    2,
  ),
  "utf8",
);

function csv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

fs.writeFileSync(
  path.join(outDir, "client_scenarios.csv"),
  csv([
    ["scenario", "installed_cost_eur", "electricity_kwh", "energy_cost_eur", "btc_revenue_eur", "heat_savings_eur", "net_annual_eur", "payback_years"],
    ...customerScenarios.map((s) => [
      s.name,
      Math.round(s.installedCost),
      Math.round(s.electricityKWh),
      Math.round(s.energyCost),
      Math.round(s.btcRevenue),
      Math.round(s.heatSavings),
      Math.round(s.netAnnual),
      s.paybackYears ? s.paybackYears.toFixed(1) : "never",
    ]),
  ]),
  "utf8",
);

fs.writeFileSync(
  path.join(outDir, "company_scenarios.csv"),
  csv([
    ["installs_year", "revenue_eur", "gross_profit_eur", "fixed_opex_eur", "ebit_eur", "ebit_margin"],
    ...companyScenarios.map((s) => [
      s.installs,
      Math.round(s.revenue),
      Math.round(s.grossProfit),
      Math.round(s.fixedOpex),
      Math.round(s.ebit),
      s.ebitMargin.toFixed(3),
    ]),
  ]),
  "utf8",
);

console.log(`Report written to ${path.join(outDir, "asic_heat_recovery_startup_report.html")}`);
