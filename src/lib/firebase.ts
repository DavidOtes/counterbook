import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === "true";

const config = {
  apiKey: env.VITE_FB_API_KEY as string | undefined,
  authDomain: env.VITE_FB_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FB_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FB_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FB_APP_ID as string | undefined,
};

/** True when we have real credentials OR we're pointed at local emulators. */
export const firebaseReady = useEmulators || Boolean(config.apiKey && config.projectId);

let app!: FirebaseApp;
let auth!: Auth;
let db!: Firestore;
let storage!: FirebaseStorage;

if (firebaseReady) {
  app = initializeApp(
    useEmulators
      ? {
          apiKey: config.apiKey || "demo-key",
          authDomain: "localhost",
          projectId: config.projectId || "demo-invoice",
          storageBucket: `${config.projectId || "demo-invoice"}.appspot.com`,
          appId: config.appId || "demo-app",
        }
      : (config as Record<string, string>),
  );

  // Offline-first: Firestore caches data and queued writes in IndexedDB,
  // shared across tabs. The app keeps working with no connection.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  auth = getAuth(app);
  storage = getStorage(app);

  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
}

export { app, auth, db, storage };
