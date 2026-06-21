# Building iOS From Windows

## Recommended path

Use Expo and EAS Build.

Windows can be used for development, code editing, backend work, and previewing. EAS Build creates the iOS build in the cloud.

## Requirements

- Node.js installed on Windows.
- Expo account.
- Apple Developer Program account.
- EAS CLI.
- App Store Connect access.

## Commands

Install dependencies:

```powershell
npm install
```

Start local development:

```powershell
npm run start
```

Create an iOS build:

```powershell
npx eas build --platform ios
```

Submit to App Store Connect:

```powershell
npx eas submit --platform ios
```

## Notes

- A physical iPhone is strongly recommended for testing.
- App Store review will need a demo account or demo mode.
- Privacy policy and terms are required before launch.
- AI images and user photos need clear consent, retention, and deletion controls.
