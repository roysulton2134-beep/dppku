import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import { FirebaseConfig, SavedDraft } from '../types/procurement';

// Konfigurasi resmi Firebase Project: yuhaba-ac5c4
export const firebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyCTTHDxR3oM3o1R6QoPQleiRcyS6sL_jls',
  authDomain: 'yuhaba-ac5c4.firebaseapp.com',
  projectId: 'yuhaba-ac5c4',
  storageBucket: 'yuhaba-ac5c4.firebasestorage.app',
  messagingSenderId: '860407453726',
  appId: '1:860407453726:web:6548b2406724e8a9fab60f',
};

const FIRESTORE_COLLECTION = 'rekap_pengadaan_dispora';

// Initialize Firebase App
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db: Firestore = getFirestore(app);

export function getStoredFirebaseConfig(): FirebaseConfig {
  return firebaseConfig;
}

export function getFirestoreInstance(): {
  db: Firestore;
  isOnline: boolean;
  error?: string;
} {
  return { db, isOnline: true };
}

/**
 * Mengambil daftar rekap pengadaan dari Firebase Firestore
 */
export async function fetchRemoteDrafts(): Promise<SavedDraft[]> {
  const colRef = collection(db, FIRESTORE_COLLECTION);
  const snapshot = await getDocs(colRef);
  const results: SavedDraft[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as SavedDraft;
    results.push({
      ...data,
      id: docSnap.id,
      isOnline: true,
    });
  });

  // Urutkan berdasarkan waktu simpan terbaru
  results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return results;
}

/**
 * Menyimpan atau memperbarui data rekap pengadaan ke Firebase Firestore
 */
export async function saveRemoteDraft(draft: SavedDraft): Promise<void> {
  const docRef = doc(db, FIRESTORE_COLLECTION, draft.id);
  const payload = {
    ...draft,
    isOnline: true,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Menghapus data rekap pengadaan dari Firebase Firestore
 */
export async function deleteRemoteDraft(id: string): Promise<void> {
  const docRef = doc(db, FIRESTORE_COLLECTION, id);
  await deleteDoc(docRef);
}
