# Kairum Today Release Checklist

Use this checklist before creating the next TestFlight build and before sending the app to Apple review.

## Current Target

- Build type: TestFlight beta first.
- Data mode: local-only on the user's device.
- Cloud sync: not active in this build, but the saved local data structure already includes migration fields so a future cloud sync can import existing local profiles.
- Payments: not active in this build.
- AI image generation: not active in this build.
- Premium speech: prepared, but only active if the endpoint is configured before the build.

## What Is Already Ready

- First-run profile creation starts from an empty app.
- Profile, settings, Why photos, Vision photos, Anti-vision photos, goals, and Self Speech scripts are saved locally.
- The app writes a primary local state file and a backup state file.
- Selected photos are copied into app storage so the user does not need to reload them after closing the app.
- Language defaults from the device where possible and can be changed in settings.
- Dark and light mode are available.
- TestFlight/App Store bundle ID is `com.samuelecomai.visualize`.
- App Store Connect app name is `Kairum`.

## What You Need To Do

1. Test the latest build from zero:
   - delete the app from iPhone if you want a completely fresh first-run test;
   - install from TestFlight;
   - create the profile;
   - close and reopen the app;
   - confirm the profile is still there.

2. Test local persistence:
   - add Why photos;
   - add Vision photos;
   - add Anti-vision photos;
   - add a Self Speech script;
   - close and reopen the app;
   - confirm everything is still there.

3. Decide premium speech for this TestFlight:
   - if you want human-like voices now, configure the Netlify/OpenAI endpoint before building;
   - if you want to avoid API setup today, leave it disabled and the app will use iPhone voices.

4. In App Store Connect, complete:
   - privacy answers;
   - age rating;
   - support URL;
   - privacy URL;
   - screenshots;
   - TestFlight tester access.

## Premium Speech Setup

Only needed if you want the improved voices in the next TestFlight build.

1. Deploy the current repository to Netlify.
2. In Netlify environment variables, add:
   - `OPENAI_API_KEY`
   - optional `KAIRUM_TTS_TOKEN`
3. Use this endpoint in EAS:
   - `https://your-netlify-site.netlify.app/.netlify/functions/tts`
4. Set EAS variables before building:
   - `EXPO_PUBLIC_TTS_ENDPOINT`
   - `EXPO_PUBLIC_TTS_CLIENT_TOKEN` only if you used `KAIRUM_TTS_TOKEN`

Without these variables, the app still works, but speech uses local iPhone voices.

## Apple Review Notes

Use this summary in App Review notes:

Kairum is a local-only personal productivity and visualization app. It does not require account login in this TestFlight version. Photos are selected by the user and copied into local app storage. Profile data, decks, Why images, settings, and Self Speech scripts remain on the device. The app is not a medical device, therapy product, or diagnostic tool.

If premium speech is enabled, Self Speech text is sent to a server-side text-to-speech endpoint only when the user taps Listen. The OpenAI API key is stored on the server, not inside the app.

## Not For This First TestFlight

- Public subscription paywall.
- Apple In-App Purchase.
- Cloud account sync.
- AI image generation.
- Analytics.
- Cross-device backup.

Add these only after the first beta is stable.
