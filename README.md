# Job Application Tracker (React Native + Firebase)

A cross-platform app to log and track job applications company, role, status
(Applied / Interview / Offer / Rejected), date, and notes. Data syncs in real time to a
**Firebase Firestore** backend, with authenticated only access enforced via published
security rules (see `firestore.rules`) not just saved locally.

## Architecture

- **Frontend:** React Native (Expo), single-screen CRUD UI with a native date picker
- **Backend:** Firebase Firestore (NoSQL), no custom server to host or maintain
- **Auth:** Anonymous Firebase Authentication every session is authenticated (required
  by the security rules below) with zero login screen shown to the user
- **Real-time sync:** `onSnapshot` pushes data changes to the UI automatically no
  manual refresh, no separate save step
- **Security:** Firestore rules require `request.auth != null` for all reads/writes,
  replacing the open "test mode" rules used during initial development

Why build this one specifically: it demonstrates a full mobile-to-cloud pipeline, not
just a UI state management, a real backend, authentication, and live data sync while
also being a genuinely useful tracker for my own job search.

## 1. Prerequisites

- Node.js LTS installed
- VS Code with the "React Native Tools" extension
- For Android: Android Studio + an emulator (or a physical device with USB debugging)
- For iOS (Mac only): Xcode

## 2. Create the project

Easiest path is Expo (fastest to get running, no native build tooling needed):

```bash
npx create-expo-app job-tracker-app
cd job-tracker-app
npx expo install firebase @react-native-async-storage/async-storage @react-native-community/datetimepicker react-native-safe-area-context
```

Replace the generated `App.js`, and add `firebaseConfig.js` and `metro.config.js` from
this folder (the Metro tweak is required for the Firebase JS SDK to bundle correctly —
see [Expo's Firebase guide](https://docs.expo.dev/guides/using-firebase/)).

Create a free [Firebase project](https://console.firebase.google.com/), enable
**Firestore Database** and **Anonymous Authentication** (Build → Authentication →
Sign-in method), then paste your project's config into `firebaseConfig.js`. Publish
`firestore.rules` from the Rules tab in the Firebase Console (this doesn't happen
automatically from the file it has to be pasted into the console directly).

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone, or press `a` / `i` for an
emulator/simulator.

Recommended extensions: React Native Tools, ESLint, Prettier.

## Known limitation
Every anonymous session currently shares the same `applications` collection there's
no per-user data separation. Fine for a single-user demo; a real multi-user version
would add an `ownerId` field per document and scope the security rules to
`request.auth.uid == resource.data.ownerId` (noted in `firestore.rules`).

## Ideas to extend it further
- Filter/sort by status or date
- Export to CSV
- Push notifications for follow-up reminders
- Per-user accounts with real (non-anonymous) sign-in, building on the auth already in place

<img width="250" height="400" alt="IMG_1" src="https://github.com/user-attachments/assets/937ff6e5-50f3-4762-b44d-627dd815c2b1" />
<img width="250" height="400" alt="IMG_2" src="https://github.com/user-attachments/assets/e0347cac-8631-4af5-8549-ab4346752750" />
<img width="250" height="400" alt="IMG_4" src="https://github.com/user-attachments/assets/b19d5a68-e3a9-41fe-88f2-1bb4d813d42b" />
