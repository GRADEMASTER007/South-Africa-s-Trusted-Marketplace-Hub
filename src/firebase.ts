import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const customDatabaseId = (firebaseConfig as any).firestoreDatabaseId || "(default)";

let app;
let auth: any = null;
let db: any = null;
let isFirebaseAvailable = false;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  
  // Custom database ID support for Firestore
  db = initializeFirestore(app, {
    databaseId: customDatabaseId,
    ignoreUndefinedProperties: true
  } as any);
  
  isFirebaseAvailable = true;
  console.log("Firebase initialized successfully with database id:", customDatabaseId);
} catch (error) {
  console.warn("Firebase initialization failed. Falling back to local storage and offline capabilities:", error);
  isFirebaseAvailable = false;
}

export { auth, db, isFirebaseAvailable };
export const googleProvider = auth ? new GoogleAuthProvider() : null;
