# Visualize

Visualize is a mobile-first product prototype for a personal vision app.

The app helps a user define goals, generate or upload visual scenes, compare a desired future with an anti-vision, and listen to a personalized mindset script.

## What is included

- `preview/index.html`: a working browser prototype you can open now.
- `App.js`: Expo/React Native app shell for the future iOS app.
- `app.json`: Expo app configuration.
- `package.json`: project scripts and dependency plan.
- `docs/product-plan.md`: product and monetization plan.
- `docs/ios-windows-build.md`: how to build iOS from Windows.

## First preview

Open this file in your browser:

`preview/index.html`

## Test on iPhone with Expo Go

Run:

`start-visualize.bat`

Then scan the QR code with Expo Go on your iPhone.

This starts Expo in tunnel mode, which is usually the most reliable option when Windows firewall or Wi-Fi isolation blocks LAN access.

If you prefer local network mode, run:

`start-visualize-lan.bat`

## Reliable test on iPhone/iPad without Expo Go

If Expo Go says the project is incompatible, use the browser/PWA prototype:

`start-web-preview.bat`

Open the printed iPhone/iPad URL in Safari. You can then use Safari's share button and choose "Add to Home Screen" to test it like an app.

If the local Wi-Fi URL does not open from iPhone/iPad, run:

`start-web-tunnel.bat`

It prints a temporary public HTTPS link that works without local network access.

## Permanent Link

For a permanent phone link with automatic updates, use one of:

- GitHub Pages: see `GITHUB_PAGES_STABLE.md`.
- Netlify connected to GitHub: see `DEPLOY_STABLE.md`.

## Future iOS build

The recommended path is Expo + EAS Build:

1. Install Node.js on Windows.
2. Install project dependencies.
3. Create an Expo account.
4. Enroll in Apple Developer Program.
5. Run an EAS iOS build.
6. Submit through App Store Connect.

This repository is prepared for that path.

Current TestFlight prep:

- Bundle ID: `com.comaibusiness2000.visualize`
- App version: `0.2.0`
- iOS build number: `1`
- EAS config: `eas.json`
- Privacy URL: `https://comaibusiness2000-netizen.github.io/visualize/privacy.html`
- Support URL: `https://comaibusiness2000-netizen.github.io/visualize/support.html`
- App Store prep notes: `docs/app-store-prep.md`
