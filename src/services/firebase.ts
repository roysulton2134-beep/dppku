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

const LS_FIREBASE_CONFIG_KEY = 'dpp_firebase_config_v1';
const FIRESTORE_COLLECTION = 'rekap_pengadaan_dispora';

let cachedDb: Firestore | null = null;
let cachedApp: FirebaseApp | null = null;

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(LS_FIREBASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed as FirebaseConfig;
      }
    }
  } catch {
    // ignore
  }

  // Fallback to environment variables if provided
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProject = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (envKey && envProject) {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: envProject,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return null;
}

export function saveFirebaseConfig(cfg: FirebaseConfig | null): void {
  if (!cfg) {
    localStorage.removeItem(LS_FIREBASE_CONFIG_KEY);
    cachedDb = null;
    cachedApp = null;
    return;
  }
  localStorage.setItem(LS_FIREBASE_CONFIG_KEY, JSON.stringify(cfg));
  cachedDb = null;
  cachedApp = null;
}

/**
 * Parsing snippet konfigurasi yang di-copy langsung dari Firebase Console
 * Mendukung format:
 * 1. JSON langsung: {"apiKey": "...", ...}
 * 2. JS Object: const firebaseConfig = { apiKey: "...", ... };
 */
export function parseFirebaseConfigString(raw: string): FirebaseConfig | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Coba parse JSON murni
  try {
    const obj = JSON.parse(trimmed);
    if (obj.apiKey && obj.projectId) {
      return {
        apiKey: String(obj.apiKey),
        authDomain: obj.authDomain ? String(obj.authDomain) : '',
        projectId: String(obj.projectId),
        storageBucket: obj.storageBucket ? String(obj.storageBucket) : '',
        messagingSenderId: obj.messagingSenderId ? String(obj.messagingSenderId) : '',
        appId: obj.appId ? String(obj.appId) : '',
        measurementId: obj.measurementId ? String(obj.measurementId) : undefined,
      };
    }
  } catch {
    // Lanjutkan ke parser regex untuk JS snippet
  }

  // Regex extract field-field dari snippet JS Firebase console
  const extractField = (key: string): string => {
    const reg = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`, 'i');
    const match = trimmed.match(reg);
    return match ? match[1].trim() : '';
  };

  const apiKey = extractField('apiKey');
  const projectId = extractField('projectId');
  const authDomain = extractField('authDomain');
  const storageBucket = extractField('storageBucket');
  const messagingSenderId = extractField('messagingSenderId');
  const appId = extractField('appId');
  const measurementId = extractField('measurementId');

  if (apiKey && projectId) {
    return {
      apiKey,
      projectId,
      authDomain,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId: measurementId || undefined,
    };
  }

  return null;
}

export function getFirestoreInstance(): {
  db: Firestore | null;
  isOnline: boolean;
  error?: string;
} {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { db: null, isOnline: false, error: 'Firebase belum dikonfigurasi' };
  }

  try {
    if (!cachedApp) {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        cachedApp = existingApps[0];
      } else {
        cachedApp = initializeApp(config);
      }
    }
    if (!cachedDb && cachedApp) {
      cachedDb = getFirestore(cachedApp);
    }
    return { db: cachedDb, isOnline: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { db: null, isOnline: false, error: msg };
  }
}

export async function testFirebaseConnection(
  config: FirebaseConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const tempAppName = `test-app-${Date.now()}`;
    const testApp = initializeApp(config, tempAppName);
    const testDb = getFirestore(testApp);

    // Coba baca koleksi untuk memverifikasi izin Firestore
    const colRef = collection(testDb, FIRESTORE_COLLECTION);
    await getDocs(colRef);

    return {
      success: true,
      message: 'Koneksi ke Firebase Firestore berhasil!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal terhubung ke Firebase: ${msg}`,
    };
  }
}

/**
 * Mengambil daftar rekap pengadaan dari Firebase Firestore
 */
export async function fetchRemoteDrafts(): Promise<SavedDraft[]> {
  const { db } = getFirestoreInstance();
  if (!db) return [];

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
  const { db } = getFirestoreInstance();
  if (!db) {
    throw new Error('Firebase Firestore tidak tersedia atau belum dikonfigurasi.');
  }

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
  const { db } = getFirestoreInstance();
  if (!db) return;

  const docRef = doc(db, FIRESTORE_COLLECTION, id);
  await deleteDoc(docRef);
}
