import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore with optional database ID if provided
const db = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export { db };

// Initialize Realtime Database if databaseURL is provided
let rtdb: any = null;
if ((firebaseConfig as any).databaseURL) {
  rtdb = getDatabase(app, (firebaseConfig as any).databaseURL);
  console.log('Realtime Database initialized');
}

export { rtdb };

export const secondaryApp =
  getApps().find(
    (app) => app.name === 'Secondary'
  ) ||
  initializeApp(firebaseConfig, 'Secondary');

export const secondaryAuth =
  getAuth(secondaryApp);  
  
// Log Firebase initialization status
console.log('Firebase initialized with projectId:', firebaseConfig.projectId);
