import { TransactionData } from '../types/procurement';

export type DocumentNumberType =
  | 'permohonan'
  | 'tugas'
  | 'dpp'
  | 'sp'
  | 'spmk'
  | 'kpp'
  | 'bahp'
  | 'bast'
  | 'bapp';

/**
 * Memulihkan kode instansi Malang 35.07.318 dan membersihkan nomor ganda (double nomor urut)
 * yang mungkin pernah terakumulasi akibat regex sebelumnya.
 */
export function cleanDoubleNumber(str?: string): string {
  if (!str) return str || '';
  let s = str.trim();

  // 1. Pulihkan kode Malang 35.07.318
  s = s.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');

  // 2. Bersihkan nomor dobel di Surat Permohonan:
  // e.g. "000.3.1/04/09/35.07.318/2026" -> "000.3.1/09/35.07.318/2026"
  // e.g. "000.3.1/04/SPRS/09/35.07.318/2026" -> "000.3.1/09/SPRS/35.07.318/2026"
  // e.g. "000.3.1/04/09/SPRS/35.07.318/2026" -> "000.3.1/09/SPRS/35.07.318/2026"
  s = s.replace(/000\.3\.1\/\d+\/SPRS\/\s*(\d+)\//gi, '000.3.1/$1/SPRS/');
  s = s.replace(/000\.3\.1\/(?:\d+\/)+(\d+)\/SPRS\//gi, '000.3.1/$1/SPRS/');
  s = s.replace(/000\.3\.1\/(?:\d+\/)+(\d+)\//gi, '000.3.1/$1/');

  // 3. Bersihkan nomor dobel di Dokumen DPP & Kontrak (SP, SPMK, KPP, BAHP, BAST, BAPP):
  // e.g. "00.3.2/04/09-DPP" -> "00.3.2/09-DPP"
  // e.g. "00.3.2/04/SPRS-09-DPP" -> "00.3.2/09/SPRS-DPP"
  s = s.replace(
    /00\.3\.2\/\d+\/SPRS-(\d+)-(DPP|SP|SPMK|KPP|BAHP|BAST|BAPP)/gi,
    '00.3.2/$1/SPRS-$2'
  );
  s = s.replace(
    /00\.3\.2\/(?:\d+\/)+(\d+)-(DPP|SP|SPMK|KPP|BAHP|BAST|BAPP)/gi,
    '00.3.2/$1-$2'
  );
  s = s.replace(
    /00\.3\.2\/(?:\d+\/)+(\d+)\/SPRS-(DPP|SP|SPMK|KPP|BAHP|BAST|BAPP)/gi,
    '00.3.2/$1/SPRS-$2'
  );

  // 4. Bersihkan nomor dobel di Surat Tugas:
  // e.g. "800.1.11.1/04/ 09.sarpras-ST" -> "800.1.11.1/ 09.sarpras-ST"
  // e.g. "800.1.11.1/04/09/SPRS.sarpras-ST" -> "800.1.11.1/09/SPRS.sarpras-ST"
  s = s.replace(/800\.1\.11\.1\/(?:\d+\/)+\s*(\d+)\.sarpras/gi, '800.1.11.1/ $1.sarpras');
  s = s.replace(/800\.1\.11\.1\/(?:\d+\/)+(\d+)\/SPRS/gi, '800.1.11.1/$1/SPRS');

  return s;
}

/**
 * Mengekstrak nomor urut saat ini dari DPP, Surat Permohonan, atau Surat Tugas.
 */
export function extractSeqNo(tx: TransactionData): string {
  if (tx.nomorDPP) {
    const cleanedDPP = cleanDoubleNumber(tx.nomorDPP);
    const mDPP = cleanedDPP.match(/00\.3\.2\/(\d+)(?:-|\/)/);
    if (mDPP) return mDPP[1];
  }

  if (tx.nomorSuratPermohonan) {
    const cleanedPermohonan = cleanDoubleNumber(tx.nomorSuratPermohonan);
    const mPermohonan = cleanedPermohonan.match(/000\.3\.1\/(\d+)\//);
    if (mPermohonan) return mPermohonan[1];
  }

  if (tx.nomorSuratTugas) {
    const cleanedTugas = cleanDoubleNumber(tx.nomorSuratTugas);
    const mTugas = cleanedTugas.match(/800\.1\.11\.1\/\s*(\d+)/);
    if (mTugas) return mTugas[1];
  }

  return '01';
}

/**
 * Memformat nomor dokumen sesuai tipe dokumen dan nomor urut tunggal (tanpa duplikasi nomor).
 */
export function formatDocumentNumber(
  docType: DocumentNumberType,
  rawUrut: string,
  currentStr?: string,
  defaultThn: string = '2026'
): string {
  const urut = (rawUrut || '01').trim();
  const cleanedCurrent = cleanDoubleNumber(currentStr);
  const thnMatch = cleanedCurrent?.match(/\/(20\d\d)(?:[^\d]|$)/);
  const thn = thnMatch ? thnMatch[1] : defaultThn;
  const hasSPRS = /SPRS/i.test(cleanedCurrent || '');

  switch (docType) {
    case 'permohonan': {
      if (/sarpras/i.test(cleanedCurrent || '')) {
        return `800.1.11.1/${urut}.sarpras/35.07.318/${thn}`;
      }
      if (hasSPRS) {
        return `000.3.1/${urut}/SPRS/35.07.318/${thn}`;
      }
      return `000.3.1/${urut}/35.07.318/${thn}`;
    }

    case 'tugas': {
      if (hasSPRS) {
        if (/sarpras/i.test(cleanedCurrent || '')) {
          return `800.1.11.1/${urut}/SPRS.sarpras-ST/35.07.318/${thn}`;
        }
        return `800.1.11.1/${urut}/SPRS-ST/35.07.318/${thn}`;
      }
      return `800.1.11.1/ ${urut}.sarpras-ST/35.07.318/${thn}`;
    }

    case 'dpp': {
      if (hasSPRS) {
        return `00.3.2/${urut}/SPRS-DPP/35.07.318/${thn}`;
      }
      return `00.3.2/${urut}-DPP/35.07.318/${thn}`;
    }

    case 'sp':
    case 'spmk':
    case 'kpp':
    case 'bahp':
    case 'bast':
    case 'bapp': {
      const tag = docType.toUpperCase();
      if (hasSPRS) {
        return `00.3.2/${urut}/SPRS-${tag}/35.07.318/${thn}`;
      }
      return `00.3.2/${urut}-${tag}/35.07.318/${thn}`;
    }
  }
}

/**
 * Memperbarui semua nomor dokumen (Tahap 1 s.d. Tahap 2) secara serentak
 * dengan nomor urut baru tanpa ada bagian nomor yang dobel.
 */
export function updateAllDocumentNumbers(
  tx: TransactionData,
  rawUrut: string
): TransactionData {
  const urut = (rawUrut || '01').trim();
  const thn = tx.tahunAnggaran || '2026';

  const nextPermohonan = formatDocumentNumber('permohonan', urut, tx.nomorSuratPermohonan, thn);
  const nextTugas = formatDocumentNumber('tugas', urut, tx.nomorSuratTugas, thn);
  const nextDPP = formatDocumentNumber('dpp', urut, tx.nomorDPP, thn);

  const nextSP = formatDocumentNumber('sp', urut, tx.kontrak?.nomorSP, thn);
  const nextSPMK = formatDocumentNumber('spmk', urut, tx.kontrak?.nomorSPMK, thn);
  const nextKPP = formatDocumentNumber('kpp', urut, tx.kontrak?.nomorKPP, thn);
  const nextBAHP = formatDocumentNumber('bahp', urut, tx.kontrak?.nomorBAHP, thn);
  const nextBAST = formatDocumentNumber('bast', urut, tx.kontrak?.nomorBAST, thn);
  const nextBAPP = formatDocumentNumber('bapp', urut, tx.kontrak?.nomorBAPP, thn);

  return {
    ...tx,
    updatedAt: new Date().toISOString(),
    nomorSuratPermohonan: nextPermohonan,
    nomorSuratTugas: nextTugas,
    nomorDPP: nextDPP,
    kontrak: {
      ...tx.kontrak,
      nomorSP: nextSP,
      nomorSPMK: nextSPMK,
      nomorKPP: nextKPP,
      nomorBAHP: nextBAHP,
      nomorBAST: nextBAST,
      nomorBAPP: nextBAPP,
    },
  };
}
