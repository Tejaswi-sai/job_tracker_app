// Firebase project config + Firestore initialization.
// Note: getAnalytics is deliberately NOT imported here — it relies on
// browser-only APIs (like `navigator`) that don't exist in React Native
// and will crash the app on a real device.

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDK0AT6ntJm02CMw2TzmNKXuVKQnrWiBXg',
  authDomain: 'jobtracker-db-445d1.firebaseapp.com',
  projectId: 'jobtracker-db-445d1',
  storageBucket: 'jobtracker-db-445d1.firebasestorage.app',
  messagingSenderId: '747094621754',
  appId: '1:747094621754:web:bed8791e6de17c716ebf03',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// AsyncStorage-backed persistence, so the anonymous auth session survives
// app restarts instead of silently starting a brand-new anonymous user
// (and therefore losing any per-user data separation) every launch.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

