# Visualize TestFlight Tomorrow

Use this when the Apple Developer Program membership is active.

## What you must do

1. Confirm the Apple Developer Program is active.
2. Tell Codex the Apple Team Name.
3. Tell Codex the Apple Team ID.
4. Confirm the Bundle ID: `com.comaibusiness2000.visualize`.
5. Provide the real support email to replace `support@example.com`.
6. Confirm whether the app name `Visualize` is available in App Store Connect.
7. Log in to Expo/EAS on this PC when prompted.

Do not send Apple ID password, 2FA codes, recovery keys, or payment details in chat.

## First tester

- Tester email: `comaisamuele@gmail.com`

Use this as the first TestFlight invite after the build is available.

## What Codex can do after that

1. Replace the support email in the support page.
2. Run the final Expo checks.
3. Log in to Expo/EAS and initialize or link the EAS project.
4. Create the iOS production build.
5. Guide you through Apple login and 2FA prompts.
6. Upload the build to App Store Connect.
7. Prepare the TestFlight beta notes.
8. Help invite the first tester.

## App Store Connect values

- Platform: iOS
- Name: Visualize
- Primary language: English
- Bundle ID: `com.comaibusiness2000.visualize`
- SKU: `com.comaibusiness2000.visualize`
- User Access: Full Access

## URLs

- Privacy Policy URL: `https://comaibusiness2000-netizen.github.io/visualize/privacy.html`
- Support URL: `https://comaibusiness2000-netizen.github.io/visualize/support.html`
- Web preview: `https://comaibusiness2000-netizen.github.io/visualize/?v=59`

## TestFlight "What to Test"

Test the first-run experience:

1. Create a profile.
2. Check the life clock and the full-screen daily update animation.
3. Add photos to the Why tab.
4. Add photos to Vision and Anti-vision decks.
5. Play both decks full screen.
6. Create and play a Self Speech script.
7. Close and reopen the app to confirm data is still saved locally.
8. Change theme and language.

## Apple review note

Visualize is currently a local-only personal productivity and visualization app. It does not require account login in this TestFlight version.

The app asks for photo library permission only when the user chooses to add photos to the Why tab, a Vision deck, or an Anti-vision deck. Selected images are copied into local app storage on the device.

Self Speech uses device text-to-speech. The current build does not upload scripts, photos, goals, or profile data to a Visualize server.

No subscriptions, paid features, AI generation, cloud sync, or third-party analytics are active in this build.

## Expected terminal sequence

These commands are for Codex to run/guided-run tomorrow:

```powershell
npx.cmd expo-doctor
npx.cmd expo export --platform ios --output-dir .tmp\expo-export-check --clear
npx.cmd eas-cli login
npx.cmd eas-cli init
npx.cmd eas-cli build --platform ios --profile production
npx.cmd eas-cli submit --platform ios --profile production
```

If EAS asks Expo or Apple credential questions, the user must answer them locally on the machine or approve the 2FA prompt on an Apple device.
