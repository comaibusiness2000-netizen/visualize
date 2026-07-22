# Visualize App Store Prep

Last updated: July 22, 2026.

## Current release target

- First target: TestFlight beta.
- App mode: local-only.
- Cloud sync: not active yet.
- AI generation/editing: not active yet.
- Payments/subscriptions: not active yet.

## App identity

- App name: Visualize
- Bundle ID: `com.comaibusiness2000.visualize`
- SKU suggestion: `com.comaibusiness2000.visualize`
- Primary language: English
- Category suggestion: Productivity
- Secondary category suggestion: Health & Fitness or Lifestyle

## Public URLs

- Privacy Policy URL: `https://comaibusiness2000-netizen.github.io/visualize/privacy.html`
- Support URL: `https://comaibusiness2000-netizen.github.io/visualize/support.html`
- Web preview: `https://comaibusiness2000-netizen.github.io/visualize/?v=59`

Replace the support email in `preview/support.html` before App Store submission.

## App Store listing draft

### Subtitle

See your goals daily.

### Short promotional text

Build a private life clock, Why board, Vision deck, Anti-vision deck, and Self Speech routine.

### Description draft

Visualize helps you keep your future in front of you.

Create a simple profile, see a life clock based on your age and life estimate, add the people and reasons you are doing it for, build private Vision and Anti-vision photo decks, and write Self Speech scripts that can be read aloud by your device.

The current version is local-only. Your profile, selected photos, decks, scripts, and settings are saved on your device.

Core features:
- Life clock with estimated days, weeks, and months remaining
- Why board for the people, memories, and future reasons behind your goals
- Vision deck for the future you are building
- Anti-vision deck for the life you want to avoid
- Self Speech scripts with text-to-speech playback
- Light and dark mode
- Interface language selection

Visualize is not a medical device, therapy product, or mental health diagnosis tool. It is a private personal productivity and visualization tool.

### Keywords draft

visualization,goals,mindset,vision board,habits,productivity,self talk,life clock,motivation

## Privacy answers draft

For the current local-only TestFlight version:

- Data collected by developer: none.
- Tracking: no.
- Third-party analytics: no.
- Account creation: no.
- Photos: selected by the user and stored locally on device.
- User content: profile, Why photos, decks, scripts, and settings are stored locally on device.

If cloud sync, subscriptions, analytics, or AI generation are added later, the privacy answers must be updated before public release.

## TestFlight beta notes

First tester email: `comaisamuele@gmail.com`

### What to test

Please test the first-run flow and core local-only features:

1. Create a profile.
2. Review the life clock and full-screen daily update animation.
3. Add images to the Why tab.
4. Add images to Vision and Anti-vision decks.
5. Play the decks full screen.
6. Create a Self Speech script and test text-to-speech playback.
7. Close and reopen the app to confirm local data is still saved.
8. Change language and theme in settings.

### Review notes for Apple

Visualize is a local-only personal productivity and visualization app. It does not require account login in this TestFlight version.

The app asks for photo library permission only when the user chooses to add photos to the Why tab, a Vision deck, or an Anti-vision deck. Selected images are copied into the app's local storage on the device.

Self Speech uses device text-to-speech. The app does not upload audio scripts to a server in this version.

No paid features, subscriptions, cloud sync, AI generation, or third-party analytics are active in this build.

## Screenshots needed

Prepare screenshots for:

1. Onboarding/profile setup
2. Life clock
3. Why tab
4. Vision deck
5. Anti-vision deck
6. Self Speech
7. Settings

## What is needed tomorrow

1. Active Apple Developer Program membership.
2. Apple Team Name.
3. Apple Team ID.
4. Confirm whether App Store seller name can be your personal legal name.
5. Support email to replace `support@example.com`.
6. App name availability check in App Store Connect.
7. Expo account login on this PC.
8. EAS project init, which will replace the temporary `extra.eas.projectId` placeholder in `app.json`.
9. iOS build upload to TestFlight.

## Future production work

Before public paid release:

- Add StoreKit / Apple In-App Purchase.
- Add restore purchases.
- Add final paywall text and terms.
- Add full privacy policy reviewed for subscriptions and any future cloud/AI features.
- Add support email/domain.
- Add cloud migration if we decide to move from local-only to account sync.

## Technical note

`npx expo-doctor` currently passes. `npm audit --omit=dev --audit-level=high` exits cleanly; the remaining `npm audit --omit=dev` finding is a moderate `uuid` advisory through Expo tooling. Do not run `npm audit fix --force`: npm proposes a breaking Expo downgrade. Revisit this when Expo ships a non-breaking dependency update.
