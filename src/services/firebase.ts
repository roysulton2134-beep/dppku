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
const FIREBASE_TIMEOUT_MS = 6000;
const ASSET_CHUNK_SIZE = 550_000; // Ukuran chunk aman di bawah batas 1 MB Firestore

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
 * Memisahkan string Base64 gambar ukuran normal dari dokumen utama
 * agar dokumen utama selalu sangat ringan (~15-25 KB) dan tidak pernah
 * melebihi batas 1 MB Firestore.
 */
function extractAssetsFromDraft(draft: SavedDraft): {
  cleanDraft: SavedDraft;
  assets: Record<string, string>;
} {
  const assets: Record<string, string> = {};
  let assetCounter = 0;

  function traverse(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(traverse);
    }
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string' && val.startsWith('data:image')) {
        const assetKey = `asset_${assetCounter++}_${key}`;
        assets[assetKey] = val;
        result[key] = `__asset__:${assetKey}`;
      } else if (typeof val === 'object' && val !== null) {
        result[key] = traverse(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  // Clone objek dan bersihkan undefined
  const cleanDraft = traverse(JSON.parse(JSON.stringify(draft)));
  return { cleanDraft, assets };
}

/**
 * Mengembalikan kembali string Base64 gambar ukuran normal ke dalam objek draft
 */
export function restoreAssetsToDraft(draft: SavedDraft, assetsMap: Record<string, string>): SavedDraft {
  function traverse(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string' && obj.startsWith('__asset__:')) {
        const assetKey = obj.slice('__asset__:'.length);
        return assetsMap[assetKey] || '';
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(traverse);
    }
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string' && val.startsWith('__asset__:')) {
        const assetKey = val.slice('__asset__:'.length);
        result[key] = assetsMap[assetKey] || '';
      } else if (typeof val === 'object' && val !== null) {
        result[key] = traverse(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
  return traverse(draft);
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

    // Urutkan berdasarkan urutan manual (orderIndex) jika ada, fallback ke waktu simpan terbaru
    results.sort((a, b) => {
      const orderA = typeof a.orderIndex === 'number' ? a.orderIndex : 999999;
      const orderB = typeof b.orderIndex === 'number' ? b.orderIndex : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime();
    });
    return results;
  } catch (err) {
    console.warn('fetchRemoteDrafts: gagal mengambil dari Firebase, fallback lokal:', err);
    return [];
  }
}

/**
 * Memperbarui urutan manual (orderIndex) paket di Cloud Firestore
 */
export async function updateDraftOrderIndex(draftId: string, orderIndex: number): Promise<void> {
  try {
    const mainRef = doc(db, FIRESTORE_COLLECTION, draftId);
    await withTimeout(setDoc(mainRef, { orderIndex, updatedAt: new Date().toISOString() }, { merge: true }));
  } catch (err) {
    console.warn('updateDraftOrderIndex: gagal memperbarui urutan ke Firebase:', draftId, err);
  }
}

/**
 * Memuat gambar ukuran normal dari subcollection assets jika draft memuat pointer __asset__:
 */
export async function hydrateDraftAssets(draft: SavedDraft): Promise<SavedDraft> {
  const jsonStr = JSON.stringify(draft);
  if (!jsonStr.includes('__asset__:')) {
    // Draft sudah lengkap dan memuat gambar asli (misalnya dari cache lokal)
    return draft;
  }

  try {
    const assetsCol = collection(db, FIRESTORE_COLLECTION, draft.id, 'assets');
    const snap = await withTimeout(getDocs(assetsCol));
    const rawParts: Record<string, Array<{ chunk: number; data: string }>> = {};
    const singleAssets: Record<string, string> = {};

    snap.forEach((d) => {
      const data = d.data();
      if (data.rootKey) {
        if (!rawParts[data.rootKey]) rawParts[data.rootKey] = [];
        rawParts[data.rootKey].push({ chunk: data.chunk, data: data.data });
      } else if (data.data) {
        singleAssets[d.id] = data.data;
      }
    });

    const finalAssetsMap: Record<string, string> = { ...singleAssets };
    for (const [rootKey, parts] of Object.entries(rawParts)) {
      parts.sort((a, b) => a.chunk - b.chunk);
      finalAssetsMap[rootKey] = parts.map((p) => p.data).join('');
    }

    return restoreAssetsToDraft(draft, finalAssetsMap);
  } catch (err) {
    console.warn('hydrateDraftAssets error:', err);
    return draft;
  }
}

/**
 * Menyimpan atau memperbarui data rekap pengadaan ke Firebase Firestore.
 * Gambar Base64 ukuran normal disimpan ke subcollection assets (dengan chunking otomatis jika > 550KB)
 * sehingga dokumen utama selalu sangat ringan dan ukuran dokumen tidak pernah melampaui 1 MB.
 */
export async function saveRemoteDraft(draft: SavedDraft): Promise<void> {
  const { cleanDraft, assets } = extractAssetsFromDraft(draft);

  // 1. Simpan dokumen utama (hanya memuat data teks, angka, dan pointer referensi gambar)
  const mainRef = doc(db, FIRESTORE_COLLECTION, draft.id);
  const payload = {
    ...cleanDraft,
    isOnline: true,
    updatedAt: new Date().toISOString(),
  };

  const cleanPayload = JSON.parse(JSON.stringify(payload));
  await withTimeout(setDoc(mainRef, cleanPayload, { merge: true }));

  // 2. Simpan setiap gambar Base64 ukuran normal ke subcollection 'assets'
  const assetTasks: Array<Promise<void>> = [];

  for (const [assetKey, dataString] of Object.entries(assets)) {
    if (dataString.length <= ASSET_CHUNK_SIZE) {
      const assetRef = doc(db, FIRESTORE_COLLECTION, draft.id, 'assets', assetKey);
      assetTasks.push(setDoc(assetRef, { data: dataString, chunkCount: 1 }));
    } else {
      // Chunking otomatis jika satu file gambar berukuran > 550KB
      let chunkIdx = 0;
      const totalChunks = Math.ceil(dataString.length / ASSET_CHUNK_SIZE);
      for (let i = 0; i < dataString.length; i += ASSET_CHUNK_SIZE) {
        const chunkData = dataString.slice(i, i + ASSET_CHUNK_SIZE);
        const chunkRef = doc(
          db,
          FIRESTORE_COLLECTION,
          draft.id,
          'assets',
          `${assetKey}_part_${chunkIdx}`
        );
        assetTasks.push(
          setDoc(chunkRef, {
            chunk: chunkIdx,
            totalChunks,
            data: chunkData,
            rootKey: assetKey,
          })
        );
        chunkIdx++;
      }
    }
  }

  if (assetTasks.length > 0) {
    await withTimeout(Promise.all(assetTasks), 10000);
  }
}

/**
 * Menghapus data rekap pengadaan dari Firebase Firestore beserta seluruh dokumen aset gambarnya
 */
export async function deleteRemoteDraft(id: string): Promise<void> {
  try {
    // 1. Hapus semua dokumen gambar di subcollection assets
    const assetsCol = collection(db, FIRESTORE_COLLECTION, id, 'assets');
    const snap = await withTimeout(getDocs(assetsCol));
    const deleteTasks: Array<Promise<void>> = [];
    snap.forEach((d) => {
      deleteTasks.push(deleteDoc(d.ref));
    });
    if (deleteTasks.length > 0) {
      await withTimeout(Promise.all(deleteTasks), 5000).catch(console.warn);
    }

    // 2. Hapus dokumen utama
    const docRef = doc(db, FIRESTORE_COLLECTION, id);
    await withTimeout(deleteDoc(docRef));
  } catch (err) {
    console.warn('deleteRemoteDraft: gagal menghapus dari Firebase:', err);
  }
}
