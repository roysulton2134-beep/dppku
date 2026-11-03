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
import { prepareDraftForFirestore } from '../utils/imageCompressor';

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
const FIREBASE_TIMEOUT_MS = 4000;

// Helper timeout agar request ke Firestore tidak pernah menggantung (hang)
function withTimeout<T>(promise: Promise<T>, ms = FIREBASE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firebase request timeout (${ms}ms)`)), ms)
    ),
  ]);
}

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
  try {
    const colRef = collection(db, FIRESTORE_COLLECTION);
    const snapshot = await withTimeout(getDocs(colRef));
    const results: SavedDraft[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SavedDraft;
      if (data && data.savedAt) {
        results.push({
          ...data,
          id: docSnap.id,
          isOnline: true,
        });
      }
    });

    // Urutkan berdasarkan waktu simpan terbaru
    results.sort(
      (a, b) =>
        new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
    );
    return results;
  } catch (err) {
    console.warn('fetchRemoteDrafts: gagal mengambil dari Firebase, fallback lokal:', err);
    return [];
  }
}

/**
 * Menyimpan atau memperbarui data rekap pengadaan ke Firebase Firestore
 * Melakukan kompresi gambar Base64 menjadi thumbnail dan memastikan ukuran dokumen < 1 MB
 */
export async function saveRemoteDraft(draft: SavedDraft): Promise<void> {
  const docRef = doc(db, FIRESTORE_COLLECTION, draft.id);

  // Kompresi thumbnail gambar Base64 & proteksi agar ukuran dokumen selalu < 1 MB
  const safeDraft = await prepareDraftForFirestore(draft);

  const payload = {
    ...safeDraft,
    isOnline: true,
    updatedAt: new Date().toISOString(),
  };

  // Bersihkan field undefined yang ditolak oleh Firestore
  const cleanPayload = JSON.parse(JSON.stringify(payload));
  await withTimeout(setDoc(docRef, cleanPayload, { merge: true }));
}

/**
 * Menghapus data rekap pengadaan dari Firebase Firestore
 */
export async function deleteRemoteDraft(id: string): Promise<void> {
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await withTimeout(deleteDoc(docRef));
  } catch (err) {
    console.warn('deleteRemoteDraft: gagal menghapus dari Firebase:', err);
  }
}
