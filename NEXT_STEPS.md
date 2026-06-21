# Next Steps

## Aprire la preview

Apri:

`preview/index.html`

La preview funziona anche senza server.

## Provare l'app su iPhone

Apri `start-visualize.bat`.

Quando compare il QR code, apri Expo Go sull'iPhone e scansionalo.

Se Expo Go mostra un errore, chiudi la finestra, riapri `start-visualize.bat` e assicurati di usare l'ultimo QR generato. Questo progetto ora usa Expo SDK 56, compatibile con la versione attuale di Expo Go.

Se il tunnel fosse lento, puoi provare `start-visualize-lan.bat` con PC e iPhone sulla stessa Wi-Fi.

## Piano stabile senza Expo Go

Se Expo Go mostra ancora incompatibilita, apri `start-web-preview.bat`.

Nella finestra apparira un indirizzo tipo `http://192.168.x.x:4173`. Aprilo in Safari su iPhone/iPad.

Da Safari puoi usare Condividi -> Aggiungi alla schermata Home per provarla come mini-app.

## Rendere l'app iOS reale

1. Crea un account Apple Developer.
2. Configura EAS Build.
3. Aggiungi backend, AI images reali e pagamenti.
4. Prepara TestFlight.

## Prossima feature da costruire

La prossima modifica consigliata e collegare:

- upload foto;
- generazione prompt AI;
- salvataggio obiettivi;
- script audio reale.
