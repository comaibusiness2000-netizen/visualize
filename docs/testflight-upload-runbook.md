# TestFlight Upload Runbook

Current target build:

- App version: `0.2.11`
- iOS build number: `19`
- EAS Build ID: `3d0ab418-98e1-487b-8ab5-c950b860ae4c`
- IPA: `https://expo.dev/artifacts/eas/0fyBqtYihQJknqr7Y3FOU6-QJif6B3bQ-JMDaoW6GiQ.ipa`
- App Store Connect app ID: `6795251107`

## Current Situation

The app build is finished on EAS, but EAS Submit is still waiting in queue before Apple receives the upload.

Queued submissions:

- `b41ceed8-9e0f-423c-a150-c20e50501e6d`
- `b4364238-a2fa-4763-a979-81f51fcc1484`

App Store Connect still shows the older TestFlight build `0.2.7 (14)` as the latest uploaded build.

## Check Status

Run:

```powershell
npx.cmd eas-cli submit:view b4364238-a2fa-4763-a979-81f51fcc1484
npx.cmd eas-cli submit:status --platform ios
```

If `submit:status` shows `0.2.11 (19)` under TestFlight, the upload reached Apple.

## Retry Upload Without Rebuilding

If the submission stays in queue for a long time, retry only the upload. Do not rebuild the app unless the code changes.

```powershell
npx.cmd eas-cli submit --platform ios --id 3d0ab418-98e1-487b-8ab5-c950b860ae4c --profile production --non-interactive --auto-testflight-setup
```

Do not add `--what-to-test` from the CLI. In this Expo plan it is treated as a changelog and requires Enterprise access.

## Once Build Appears In App Store Connect

1. Open App Store Connect.
2. Go to Kairum > TestFlight.
3. Open build `0.2.11 (19)`.
4. Add it to the internal tester group.
5. Add this "What to Test" text manually:

```text
Test the first-run profile creation, Life Clock, Why board, Vision and Anti-vision photo decks, full-screen presentation playback, Self Speech playback, local data persistence after closing and reopening the app, theme settings, and language settings.
```

6. Install or update from the TestFlight app.
7. Test persistence by creating a profile, closing the app, reopening it, and checking that profile/photos/scripts remain saved.

## If EAS Submit Remains Stuck

The code and IPA are ready. The remaining issue is only delivery to Apple.

Options:

1. Wait and retry EAS Submit later.
2. Download the IPA from EAS and upload it with Apple's Transporter flow from a Mac, if available.
3. Contact Expo support with the stuck submission IDs above.
