# Stato link stabile Visualize

## Obiettivo

Creare un link stabile apribile da iPhone/iPad che mostri il prototipo dell'app e che si aggiorni automaticamente quando il codice viene modificato.

## Cosa e pronto

- Prototipo web in `preview/`.
- PWA installabile su schermata Home.
- Manifest web in `preview/manifest.webmanifest`.
- Service worker in `preview/service-worker.js`.
- Configurazione GitHub Pages in `.github/workflows/pages.yml`.
- Configurazione Netlify alternativa in `netlify.toml`.
- Cartella pronta da caricare in `UPLOAD_TO_GITHUB/`.
- Pacchetto finale in `visualize-stable-github-ready-final.zip`.
- Script guidato in `START_HERE_STABLE_LINK.bat`.
- Script per aggiornamenti futuri in `update-live-site.bat`.

## Cosa manca

Serve il login del proprietario su GitHub.

Io non posso creare o collegare il repository al posto tuo senza accesso al tuo account GitHub.

## Prossimo passo

1. Apri `START_HERE_STABLE_LINK.bat`.
2. Crea un repository GitHub chiamato `visualize-app`.
3. Copia l'URL HTTPS del repository.
4. Incollalo nello script quando richiesto.
5. Completa l'eventuale login GitHub.
6. Vai su GitHub `Settings -> Pages`.
7. Scegli `GitHub Actions`.
8. Attendi il deploy in `Actions`.

Il link finale sara simile a:

`https://TUO-UTENTE.github.io/visualize-app/`

## Dopo il link

Apri il link da Safari su iPhone e usa:

`Condividi -> Aggiungi alla schermata Home`

## Aggiornamenti

Dopo modifiche future:

1. Apri `update-live-site.bat`.
2. Lo script invia le modifiche su GitHub.
3. GitHub Pages aggiorna automaticamente lo stesso link.
