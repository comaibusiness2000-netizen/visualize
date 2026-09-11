# Kairum Premium Speech

Kairum can play human-like self speech audio through a server-side TTS endpoint. The app never stores the OpenAI API key.

## How it works

1. The app sends the saved self speech text, selected voice, language, and voice instructions to:

   `EXPO_PUBLIC_TTS_ENDPOINT`

2. The Netlify function at `netlify/functions/tts.js` calls OpenAI Text to Speech from the server.
3. The function returns an MP3 as base64.
4. The app saves the MP3 on the device and reuses it when the same text and voice are played again.

## Netlify environment variables

Set these in Netlify > Site configuration > Environment variables:

- `OPENAI_API_KEY`: required. Your OpenAI API key.
- `KAIRUM_TTS_TOKEN`: optional. A simple shared token for the app request.
- `KAIRUM_TTS_MODEL`: optional. Defaults to `gpt-4o-mini-tts`.
- `KAIRUM_TTS_MAX_CHARS`: optional. Defaults to `2400`.

## Expo/EAS environment variables

Set these in EAS before creating a TestFlight build:

- `EXPO_PUBLIC_TTS_ENDPOINT`: required for premium speech.
  Example: `https://your-site.netlify.app/.netlify/functions/tts`
- `EXPO_PUBLIC_TTS_CLIENT_TOKEN`: required only if `KAIRUM_TTS_TOKEN` is set on Netlify.

If `EXPO_PUBLIC_TTS_ENDPOINT` is empty, Kairum automatically falls back to the iPhone local voices.

## Cost control

Premium speech costs OpenAI API usage only when a new audio file is generated. Replaying the same saved self speech from the same device uses the cached MP3 and does not call the API again.

For TestFlight, keep scripts short and test with a few lines first.

## App voice profiles

- Maya: warm, close, emotionally present.
- Noah: grounded male coach, direct and steady.
- Iris: clear, focused, supportive.
- Atlas: deep, slow, motivational.

Each profile sends different speech instructions to the backend, so the voices should feel intentionally different once premium speech is enabled.
