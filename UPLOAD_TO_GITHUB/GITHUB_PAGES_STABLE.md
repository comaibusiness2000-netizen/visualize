# Link stabile con GitHub Pages

Questa opzione crea un link permanente tipo:

`https://TUO-NOME.github.io/visualize-app/`

## Passaggi

Metodo piu guidato:

1. Apri `START_HERE_STABLE_LINK.bat`.
2. Crea il repository `visualize-app` nella pagina GitHub che si apre.
3. Copia l'URL HTTPS del repository.
4. Incollalo nello script.
5. Completa l'eventuale login GitHub.
6. Lo script aprira `Settings -> Pages` e `Actions`.

Quando il deploy finisce, avrai il link stabile.

## Passaggi manuali

1. Crea o apri un account GitHub.
2. Crea un nuovo repository chiamato `visualize-app`.
3. Carica tutti i file di questa cartella nel repository.
4. Vai su `Settings` -> `Pages`.
5. In `Build and deployment`, scegli `GitHub Actions`.
6. Vai su `Actions`.
7. Apri `Deploy Visualize Preview`.
8. Avvia o attendi il deploy.

Quando il deploy finisce, GitHub mostra il link pubblico.

## Metodo con gli script Windows

Metodo piu semplice:

1. Crea un repository GitHub chiamato `visualize-app`.
2. Apri `3-publish-stable-link.bat`.
3. Incolla l'URL HTTPS del repository quando richiesto.
4. Completa l'eventuale login GitHub.
5. Lo script aprira le pagine GitHub `Pages` e `Actions`.

Per aggiornare il sito in futuro:

1. Dopo le modifiche, apri `update-live-site.bat`.
2. GitHub Pages aggiornera automaticamente lo stesso link.

Metodo manuale alternativo:

1. Apri `1-prepare-git-commit.bat`.
2. Crea un repository GitHub chiamato `visualize-app`.
3. Copia l'URL del repository, per esempio:

   `https://github.com/TUO-UTENTE/visualize-app.git`

4. Apri un terminale nella cartella del progetto.
5. Esegui:

   `2-connect-github-pages.bat https://github.com/TUO-UTENTE/visualize-app.git`

6. Su GitHub vai in `Settings` -> `Pages` e scegli `GitHub Actions`.

## Aggiornamenti automatici

Ogni volta che carichi modifiche su GitHub nel branch `main`, la workflow aggiorna automaticamente lo stesso link.

## iPhone

1. Apri il link in Safari.
2. Tocca Condividi.
3. Tocca Aggiungi alla schermata Home.
4. Conferma Aggiungi.

L'icona rimane stabile e punta sempre allo stesso link.
