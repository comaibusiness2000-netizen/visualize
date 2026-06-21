# Pubblicazione stabile Visualize

Obiettivo: avere un link fisso apribile da iPhone/iPad e aggiornabile automaticamente quando il codice cambia.

## Opzione consigliata: GitHub + Netlify

1. Crea un account GitHub, se non lo hai.
2. Crea un nuovo repository chiamato `visualize-app`.
3. Carica questa cartella nel repository.
4. Crea un account Netlify.
5. In Netlify scegli `Add new site` -> `Import an existing project`.
6. Collega GitHub e scegli il repo `visualize-app`.
7. Imposta:
   - Build command: lascia vuoto
   - Publish directory: `preview`
8. Pubblica.

Netlify ti dara un link stabile tipo:

`https://visualize-app.netlify.app`

Ogni volta che aggiorniamo il codice e lo pubblichiamo su GitHub, Netlify aggiorna il sito automaticamente.

## Schermata Home su iPhone

1. Apri il link stabile in Safari.
2. Tocca Condividi.
3. Tocca Aggiungi alla schermata Home.
4. Conferma Aggiungi.

L'icona resta sul telefono. Quando il sito viene aggiornato, l'app caricata dalla schermata Home riceve la nuova versione.

## Opzione manuale stabile

Se non vuoi usare GitHub subito:

1. Crea un account Netlify.
2. Usa `Add new site` -> `Deploy manually`.
3. Carica la cartella `preview`, non il link temporaneo anonimo.

Questo crea un sito stabile, ma gli aggiornamenti non saranno automatici: dovrai ricaricare la cartella ogni volta.

## Alternativa: GitHub Pages

Ho aggiunto una workflow pronta in `.github/workflows/pages.yml`.

Se carichi questo progetto in un repository GitHub chiamato `visualize-app`, puoi pubblicare direttamente con GitHub Pages.

Leggi:

`GITHUB_PAGES_STABLE.md`
