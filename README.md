# Spool (mobile)

*A place for your loose threads.* Spool is the React Native app for people in therapy. You can keep a thought journal between sessions, record a session with everyone's consent, and review an AI-drafted summary with small goals.

It's built with Expo SDK 58, Expo Router, TypeScript and TanStack Query. The backend is [spool-api](https://github.com/jkhandeveloper/spool-api).

## Getting started

```bash
npm install
# Start the API first (see spool-api README); by default the app calls
# http://<the machine running Metro>:3000/api/v1
npx expo start
```

To point at another API, set `EXPO_PUBLIC_API_URL` (for example `EXPO_PUBLIC_API_URL=https://api.example.com/api/v1`). See [.env.example](.env.example).

### Development build required for recording

Live transcription uses [`expo-speech-recognition`](https://github.com/jamsch/expo-speech-recognition), which has native code. Expo Go doesn't include it. Build a development client:

```bash
npx expo run:ios      # or: npx expo run:android
# or in the cloud: npx eas-cli@latest build --profile development
```

In Expo Go or on web, everything else works, and the session screen offers **typed notes** instead of live transcription.

| Script | What it does |
|---|---|
| `npx expo start` | Dev server |
| `npm run typecheck` | `tsc --noEmit` (run `npx expo start` once first to generate typed routes) |
| `npx eslint src` | Lint |
| `npx expo export` | Production bundles for iOS, Android and web |

## CI and Android builds

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and pull request. It checks types, runs lint, and bundles the app for iOS, Android and web.

On pushes to `main` it also builds a release **Android APK** pointed at `https://api.spool.zasstech.com/api/v1`. To get it, open the run under Actions → CI, then download it from the **Artifacts** section at the bottom. Artifacts are kept for 30 days.

The APK is signed with the default debug keystore, so you can sideload it on test phones but can't upload it to Google Play. For a Play release, create an upload keystore and add it as secrets, or switch to EAS Build.

To build the same APK locally (needs JDK 17 and the Android SDK):

```bash
EXPO_PUBLIC_API_URL=https://api.spool.zasstech.com/api/v1 npx expo prebuild --platform android --clean --no-install
cd android && ./gradlew assembleRelease   # → android/app/build/outputs/apk/release/app-release.apk
```

## Screen map

Numbers match the concept wireflow (`01`–`12` mocked up, `P1`–`P10` proposed).

| Screen | Route |
|---|---|
| 08 Welcome | `/welcome` |
| P1 Account access | `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password` |
| 09 Privacy & setup (incl. journal-only route) | `/privacy` |
| 01 Today | `/` (tab) |
| 10 Calendar | `/calendar` (tab) |
| 11 Your sessions | `/sessions` (tab) |
| P2 More / settings | `/more` (tab), `/settings/*` |
| 02 New session (consent + prompt selection) | `/session/new` |
| 03 Live session + P5 recording states | `/session/live` |
| P5 Processing / recovery | `/session/[id]/processing` |
| 12 Review summary | `/session/[id]/review` |
| 04 Saved session summary | `/session/[id]` |
| 05 Next appointment | `/appointment/new` |
| P7 Appointment details | `/appointment/[id]` |
| 06 Journal list · 07 New entry · P6 Entry detail | `/journal`, `/journal/new`, `/journal/[id]` |
| P3 Meditation player | `/meditation/[id]`, `/meditations` |
| P4 Goal detail / check-in | `/goal/[id]`, `/goals` |
| P8 Graduation | `/graduation` |
| P9 Data & privacy details | `/settings/privacy` |
| P10 Everyday states | Loading, empty, offline/error and confirmation states in [src/components/ui.tsx](src/components/ui.tsx), used on every screen |

Routing uses guarded stacks ([src/app/_layout.tsx](src/app/_layout.tsx)):

- Signed out → Welcome and the account screens.
- Signed in without a privacy review → Privacy & setup.
- Otherwise → the app.

## How recording works (privacy)

- Recording starts only after the consent script is read and **Everyone has agreed** is ticked.
- Speech is transcribed **on the device** (`requiresOnDeviceRecognition: true`, `persist: false`), so no audio file is written or uploaded. On devices without on-device recognition, the app doesn't fall back to cloud recognition. It offers typed notes instead.
- When the session ends, only the transcript text goes to the API. It's held in memory on the phone until the upload succeeds, so an interrupted upload can be retried (P5). The API deletes the transcript once the summary draft exists.
- The user reviews and edits every summary before saving. Unticking **Keep this summary** keeps only the goals.

## Project layout

```
src/app/          routes (Expo Router)
src/components/   UI kit (ui.tsx), privacy copy, forms, waveform
src/hooks/        useRecorder (speech), useAction, theme/font scale
src/lib/          API client + token refresh, auth context, notifications, formatting
```

Tokens: the refresh token lives in SecureStore (Keychain/Keystore), and the access token only in memory. Local notifications cover the daily check-in and appointment reminders.

## Known gaps

- There are no custom brand icons or splash art yet; the Expo defaults are still in place.
- Password reset emails depend on the API getting a mail provider. In development, the API returns the reset code directly and the app uses it.
- Transcription language is fixed to `en-US`.
