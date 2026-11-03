/**
 * Utilitas kompresi dan sanitasi gambar untuk mencegah ukuran dokumen Firestore
 * melebihi batas 1 MB (1,048,576 bytes).
 */

/**
 * Kompresi data URL gambar Base64 ke ukuran thumbnail ringan
 * @param dataUrl String gambar data URL
 * @param maxDim Dimensi maksimum lebar/tinggi (default 120px untuk thumbnail Firestore)
 * @param quality Kualitas kompresi JPEG 0-1 (default 0.35)
 */
export async function compressBase64Image(
  dataUrl: string,
  maxDim = 120,
  quality = 0.35
): Promise<string> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !dataUrl ||
    typeof dataUrl !== 'string' ||
    !dataUrl.startsWith('data:image')
  ) {
    return dataUrl || '';
  }

  // Jika ukurannya sudah sangat kecil (< 3 KB), tidak perlu dikompresi lagi
  if (dataUrl.length < 3000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    // Timeout pelindung agar tidak pernah macet/hang (maks 1.5 detik per gambar)
    const timer = setTimeout(() => {
      resolve(''); // Jika timeout, kosongkan gambar agar Firestore tetap aman di bawah 1 MB
    }, 1500);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timer);
      try {
        let width = img.width || maxDim;
        let height = img.height || maxDim;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve('');
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve('');
    };

    img.src = dataUrl;
  });
}

/**
 * Kompresi berkas File (dari input upload) langsung menjadi Base64 yang dioptimalkan
 * (misal maks 600px, JPEG 0.75) agar tajam di pratinjau/cetak tetapi ukurannya hanya ~30-60 KB
 */
export async function compressFileToDataUrl(
  file: File,
  maxDim = 600,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      if (!rawUrl.startsWith('data:image')) {
        resolve(rawUrl);
        return;
      }
      compressBase64Image(rawUrl, maxDim, quality)
        .then((res) => resolve(res || rawUrl))
        .catch(() => resolve(rawUrl));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Menghapus string Base64 yang melebihi batas ukuran (default 2048 karakter)
 * secara rekursif dari seluruh properti objek/array.
 */
export function stripOversizedBase64<T>(obj: T, maxLen = 2048): T {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && (obj.startsWith('data:image') || obj.length > maxLen)) {
      return '' as unknown as T;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripOversizedBase64(item, maxLen)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof val === 'string' && (val.startsWith('data:image') || val.length > maxLen)) {
      result[key] = '';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = stripOversizedBase64(val, maxLen);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

/**
 * Memproses dan mengoptimalkan draft pengadaan sebelum disimpan ke Firestore:
 * 1. Sanitasi nilai undefined
 * 2. Mengompresi semua gambar Base64 menjadi thumbnail mini (~1-2 KB per gambar)
 * 3. Memverifikasi ukuran payload akhir; jika masih > 750 KB, bersihkan seluruh Base64
 *    sehingga ukuran dokumen dijamin selalu berada di bawah batas 1 MB (1,048,576 bytes).
 */
export async function prepareDraftForFirestore<T>(draft: T): Promise<T> {
  // 1. Sanitasi undefined dan clone objek
  const payload: T = JSON.parse(JSON.stringify(draft));

  // 2. Kumpulkan tugas kompresi untuk seluruh field gambar Base64 yang ada
  const compressTasks: Array<() => Promise<void>> = [];

  const draftObj = payload as Record<string, any>;

  // Master logo & banner
  if (draftObj.master) {
    if (typeof draftObj.master.logoUrl === 'string' && draftObj.master.logoUrl.startsWith('data:image')) {
      compressTasks.push(async () => {
        draftObj.master.logoUrl = await compressBase64Image(draftObj.master.logoUrl, 120, 0.35);
      });
    }
    if (typeof draftObj.master.bannerKopUrl === 'string' && draftObj.master.bannerKopUrl.startsWith('data:image')) {
      compressTasks.push(async () => {
        draftObj.master.bannerKopUrl = await compressBase64Image(draftObj.master.bannerKopUrl, 240, 0.35);
      });
    }
  }

  // Transaction items survey images
  if (draftObj.transaction?.items && Array.isArray(draftObj.transaction.items)) {
    draftObj.transaction.items.forEach((item: any) => {
      if (typeof item.toko1?.gambarUrl === 'string' && item.toko1.gambarUrl.startsWith('data:image')) {
        compressTasks.push(async () => {
          if (item.toko1) {
            item.toko1.gambarUrl = await compressBase64Image(item.toko1.gambarUrl, 100, 0.35);
          }
        });
      }
      if (typeof item.toko2?.gambarUrl === 'string' && item.toko2.gambarUrl.startsWith('data:image')) {
        compressTasks.push(async () => {
          if (item.toko2) {
            item.toko2.gambarUrl = await compressBase64Image(item.toko2.gambarUrl, 100, 0.35);
          }
        });
      }
    });
  }

  // Jalankan kompresi secara paralel
  if (compressTasks.length > 0) {
    try {
      await Promise.all(compressTasks.map((fn) => fn()));
    } catch (err) {
      console.warn('Gagal memproses thumbnail kompresi:', err);
    }
  }

  // 3. Verifikasi ukuran byte payload
  let jsonStr = JSON.stringify(payload);
  const encoder = new TextEncoder();
  let byteSize = encoder.encode(jsonStr).length;

  // Batas toleransi aman: 750 KB (maksimum Firestore adalah 1,048,576 bytes)
  if (byteSize > 750_000) {
    console.warn(
      `Ukuran dokumen (${byteSize} bytes) mendekati 1 MB, menghapus field gambar Base64 untuk Firestore...`
    );
    const lean = stripOversizedBase64(payload, 1024);
    return lean;
  }

  return payload;
}
