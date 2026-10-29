import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  CloudCheck,
  Columns2,
  Database,
  Download,
  Eye,
  FileDown,
  FileText,
  FolderOpen,
  Layers,
  LayoutList,
  Loader2,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  DEFAULT_MASTER_DATA,
  DEFAULT_TRANSACTION_DATA,
} from './data/defaultData';
import {
  DocumentTabId,
  MasterData,
  SavedDraft,
  TransactionData,
} from './types/procurement';
import { computeProcurementSummary } from './utils/calculations';
import {
  Doc1Checklist,
  Doc2SuratPermohonan,
  Doc3SuratTugas,
  Doc4DPP,
  Doc5KAK,
  Doc6RAB,
  Doc7SpekTeknis,
  Doc8RiwayatSurvei,
  Doc9LampiranSurvei,
} from './components/documents/DocumentPages';
import {
  Doc10SuratPesanan,
  Doc11SPMK,
  Doc12SertifikatPembayaran,
  Doc13LaporanKemajuanPekerjaan,
  Doc14BAHP,
  Doc15BAST,
  Doc16BAPP,
  Doc17RingkasanKontrak,
  Doc18Kuitansi,
} from './components/documents/ContractDocumentPages';
import { TransactionFormPanel } from './components/forms/TransactionFormPanel';
import { MasterDataPanel } from './components/forms/MasterDataPanel';
import { RekapPengadaanModal } from './components/modals/RekapPengadaanModal';
import { getFirestoreInstance } from './services/firebase';
import { exportProcurementToDocx } from './utils/exportDocx';
import { formatRupiahDoc } from './utils/terbilang';

const LS_MASTER_KEY = 'dpp_dispora_master_v1';
const LS_TX_KEY = 'dpp_dispora_tx_v1';
const LS_DRAFTS_KEY = 'dpp_dispora_saved_drafts_v1';

function normalizeMasterData(raw?: Partial<MasterData> | null): MasterData {
  if (!raw) return DEFAULT_MASTER_DATA;
  const ppk = { ...DEFAULT_MASTER_DATA.ppk, ...(raw.ppk || {}) };
  return {
    ...DEFAULT_MASTER_DATA,
    ...raw,
    ppk,
    penggunaAnggaran: {
      ...DEFAULT_MASTER_DATA.penggunaAnggaran,
      ...(raw.penggunaAnggaran || {}),
      jabatanPrefix: ppk.jabatanPrefix,
      jabatan: ppk.jabatan,
      nama: ppk.nama,
      pangkat: ppk.pangkat,
      nip: ppk.nip,
    },
    pejabatPengadaan: {
      ...DEFAULT_MASTER_DATA.pejabatPengadaan,
      ...(raw.pejabatPengadaan || {}),
    },
    kabid: { ...DEFAULT_MASTER_DATA.kabid, ...(raw.kabid || {}) },
    ppkKeuangan: {
      ...DEFAULT_MASTER_DATA.ppkKeuangan,
      ...(raw.ppkKeuangan || {}),
    },
    bendahara: {
      ...DEFAULT_MASTER_DATA.bendahara,
      ...(raw.bendahara || {}),
    },
    suratPersetujuanPP: {
      ...DEFAULT_MASTER_DATA.suratPersetujuanPP,
      ...(raw.suratPersetujuanPP || {}),
    },
    tembusan: {
      ...DEFAULT_MASTER_DATA.tembusan,
      ...(raw.tembusan || {}),
    },
  };
}

function normalizeTransactionData(
  raw?: Partial<TransactionData> | null
): TransactionData {
  if (!raw) return DEFAULT_TRANSACTION_DATA;
  const defaultItemsById = new Map(
    DEFAULT_TRANSACTION_DATA.items.map((it) => [it.id, it])
  );
  const ppnPersen = raw?.kontrak?.ppnPersen ?? 11;
  const ppnDiv = 1 + ppnPersen / 100;
  const items = Array.isArray(raw.items)
    ? raw.items.map((it, idx) => {
        const def =
          defaultItemsById.get(it.id) || DEFAULT_TRANSACTION_DATA.items[idx];
        const hargaPagu =
          typeof it.hargaPaguSatuan === 'number' && it.hargaPaguSatuan > 0
            ? it.hargaPaguSatuan
            : def?.hargaPaguSatuan || 0;
        const hargaPenetapan =
          typeof it.hargaPenetapanSatuan === 'number' && it.hargaPenetapanSatuan > 0
            ? it.hargaPenetapanSatuan
            : hargaPagu;

        const autoTurn9Kontrak =
          ppnPersen > 0
            ? Number((hargaPenetapan / ppnDiv).toFixed(2))
            : hargaPenetapan;

        const isDefaultUnmodified =
          def &&
          it.id === def.id &&
          hargaPenetapan === def.hargaPenetapanSatuan &&
          it.hargaKontrakTermasukPajak === undefined &&
          it.hargaKontrakSatuan === autoTurn9Kontrak;

        const hargaKontrak = isDefaultUnmodified
          ? def.hargaKontrakSatuan
          : typeof it.hargaKontrakSatuan === 'number' && it.hargaKontrakSatuan > 0
          ? it.hargaKontrakSatuan
          : def?.hargaKontrakSatuan || autoTurn9Kontrak;

        const hargaKontrakInc = isDefaultUnmodified
          ? def.hargaKontrakTermasukPajak ??
            Number((hargaKontrak * ppnDiv).toFixed(2))
          : typeof it.hargaKontrakTermasukPajak === 'number' &&
            it.hargaKontrakTermasukPajak > 0
          ? it.hargaKontrakTermasukPajak
          : ppnPersen > 0
          ? Number((hargaKontrak * ppnDiv).toFixed(2))
          : hargaKontrak;

        return {
          ...it,
          hargaPaguSatuan: hargaPagu,
          hargaPenetapanSatuan: hargaPenetapan,
          hargaKontrakSatuan: hargaKontrak,
          hargaKontrakTermasukPajak: hargaKontrakInc,
          ongkosKirimKontrak:
            typeof it.ongkosKirimKontrak === 'number'
              ? it.ongkosKirimKontrak
              : 0,
          volumeTambahan:
            typeof it.volumeTambahan === 'number'
              ? it.volumeTambahan
              : it.volumeTambahan === null
              ? null
              : def?.volumeTambahan ?? null,
          satuanTambahan:
            typeof it.satuanTambahan === 'string'
              ? it.satuanTambahan
              : def?.satuanTambahan ?? '',
        };
      })
    : DEFAULT_TRANSACTION_DATA.items;

  const merged: TransactionData = {
    ...DEFAULT_TRANSACTION_DATA,
    ...raw,
    items,
    checklistStatus: {
      ...DEFAULT_TRANSACTION_DATA.checklistStatus,
      ...(raw.checklistStatus || {}),
    },
    kontrak: {
      ...DEFAULT_TRANSACTION_DATA.kontrak,
      ...(raw.kontrak || {}),
    },
  };

  // Migrasi otomatis kategori legacy 'Bahan untuk Kegiatan Kantor-Perabot Kantor'
  const fixLegacyKat = (k?: string) =>
    k === 'Bahan untuk Kegiatan Kantor-Perabot Kantor'
      ? 'Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor'
      : k || '';

  if (merged.kategoriRekening) {
    merged.kategoriRekening = merged.kategoriRekening.map((kr) => ({
      ...kr,
      kategori: fixLegacyKat(kr.kategori),
      namaRekening: fixLegacyKat(kr.namaRekening) || kr.namaRekening,
    }));
  }

  if (merged.items) {
    merged.items = merged.items.map((it) => ({
      ...it,
      kategori: fixLegacyKat(it.kategori),
    }));
  }

  if (merged.namaPaket?.includes('Bahan untuk Kegiatan Kantor-Perabot Kantor')) {
    merged.namaPaket = merged.namaPaket.replace(
      'Bahan untuk Kegiatan Kantor-Perabot Kantor',
      'Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor'
    );
  }

  if (merged.kakMaksud?.includes('Bahan Untuk Kegiatan Kantor Perabot Kantor')) {
    merged.kakMaksud = merged.kakMaksud.replace(
      'Bahan Untuk Kegiatan Kantor Perabot Kantor',
      'Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor'
    );
  }

  if (!merged.sumberDanaAPBD) {
    merged.sumberDanaAPBD = 'APBD';
  }

  if (
    merged.sumberDanaSuratPermohonan === 'APBD Tahun Anggaran 2026' ||
    !merged.sumberDanaSuratPermohonan
  ) {
    merged.sumberDanaSuratPermohonan =
      merged.sumberDanaTabelPermohonan ||
      merged.sumberDanaSingkatKuitansi ||
      'PAD';
  } else if (
    (!raw.sumberDanaTabelPermohonan || raw.sumberDanaTabelPermohonan === 'PAD') &&
    raw.sumberDanaSuratPermohonan &&
    raw.sumberDanaSuratPermohonan !== 'PAD'
  ) {
    merged.sumberDanaTabelPermohonan = raw.sumberDanaSuratPermohonan;
  }

  if (
    merged.kontrak.potonganPPNText === 'Rp. 5.637.450,-' ||
    merged.kontrak.potonganPPNText === 'Rp. 5.531.187,-'
  ) {
    merged.kontrak.potonganPPNText =
      DEFAULT_TRANSACTION_DATA.kontrak.potonganPPNText;
  }
  if (merged.kontrak.potonganPPHText === 'Rp. 768.743,-') {
    merged.kontrak.potonganPPHText =
      DEFAULT_TRANSACTION_DATA.kontrak.potonganPPHText;
  }

  // Pastikan nomor 35.07.318 pada penomoran tidak pernah rusak/terubah menjadi nomor urut
  const restoreKodeMalang = (str?: string) =>
    str ? str.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/') : str || '';

  if (merged.nomorSuratPermohonan) {
    merged.nomorSuratPermohonan = restoreKodeMalang(merged.nomorSuratPermohonan);
    // Jika ada nomor bertumpuk akibat bug sebelumnya (misal "000.3.1/02/01/35.07.318")
    merged.nomorSuratPermohonan = merged.nomorSuratPermohonan.replace(
      /^(000\.3\.1\/\s*)[^/]+\/([^/]+\/35\.07\.318\/)/,
      '$1$2'
    );
  }
  if (merged.nomorSuratTugas) {
    merged.nomorSuratTugas = restoreKodeMalang(merged.nomorSuratTugas);
  }
  if (merged.nomorDPP) {
    merged.nomorDPP = restoreKodeMalang(merged.nomorDPP);
  }
  if (merged.kontrak) {
    merged.kontrak.nomorSP = restoreKodeMalang(merged.kontrak.nomorSP);
    merged.kontrak.nomorSPMK = restoreKodeMalang(merged.kontrak.nomorSPMK);
    merged.kontrak.nomorKPP = restoreKodeMalang(merged.kontrak.nomorKPP);
    merged.kontrak.nomorBAHP = restoreKodeMalang(merged.kontrak.nomorBAHP);
    merged.kontrak.nomorBAST = restoreKodeMalang(merged.kontrak.nomorBAST);
    merged.kontrak.nomorBAPP = restoreKodeMalang(merged.kontrak.nomorBAPP);
  }

  return merged;
}

const DOCUMENT_TABS: Array<{
  id: DocumentTabId;
  stage: 'group' | 1 | 2;
  shortLabel: string;
  fullTitle: string;
}> = [
  {
    id: 'all',
    stage: 'group',
    shortLabel: 'Semua (18 Dokumen)',
    fullTitle: 'Seluruh 18 Dokumen (Tahap 1 DPP + Tahap 2 Kontrak & SPJ)',
  },
  {
    id: 'all_tahap1',
    stage: 'group',
    shortLabel: 'Tahap 1: DPP (1–9)',
    fullTitle: 'Tahap 1: 9 Dokumen Persiapan Pengadaan (DPP & Survei)',
  },
  {
    id: 'all_tahap2',
    stage: 'group',
    shortLabel: 'Tahap 2: Kontrak & SPJ (10–18)',
    fullTitle: 'Tahap 2: 9 Dokumen Kontrak, BAST & Pencairan Pembayaran',
  },
  // Tahap 1 (Dokumen 1 - 9)
  {
    id: 'doc1_checklist',
    stage: 1,
    shortLabel: '1. Checklist',
    fullTitle: '1. Checklist Kelengkapan Permohonan Pengadaan',
  },
  {
    id: 'doc2_permohonan',
    stage: 1,
    shortLabel: '2. Surat Permohonan',
    fullTitle: '2. Surat Permohonan Pengadaan Langsung',
  },
  {
    id: 'doc3_surat_tugas',
    stage: 1,
    shortLabel: '3. Surat Tugas',
    fullTitle: '3. Surat Tugas PPK',
  },
  {
    id: 'doc4_dpp',
    stage: 1,
    shortLabel: '4. DPP',
    fullTitle: '4. Dokumen Persiapan Pengadaan (DPP)',
  },
  {
    id: 'doc5_kak',
    stage: 1,
    shortLabel: '5. KAK',
    fullTitle: '5. Kerangka Acuan Kerja (KAK)',
  },
  {
    id: 'doc6_rab',
    stage: 1,
    shortLabel: '6. RAB',
    fullTitle: '6. Rencana Anggaran Biaya (RAB)',
  },
  {
    id: 'doc7_spektek',
    stage: 1,
    shortLabel: '7. Spek Teknis',
    fullTitle: '7. Spesifikasi Teknis Paket E-Purchasing',
  },
  {
    id: 'doc8_riwayat_survei',
    stage: 1,
    shortLabel: '8. Riwayat Survei',
    fullTitle: '8. Riwayat Survei Harga',
  },
  {
    id: 'doc9_lampiran_survei',
    stage: 1,
    shortLabel: '9. Lampiran Survei',
    fullTitle: '9. Lampiran Survei Harga (Katalog Produk)',
  },
  // Tahap 2 (Dokumen 10 - 18)
  {
    id: 'doc10_sp',
    stage: 2,
    shortLabel: '10. Surat Pesanan (SP)',
    fullTitle: '10. Surat Pesanan (SP) — Kontrak E-Purchasing 3 Rangkap',
  },
  {
    id: 'doc11_spmk',
    stage: 2,
    shortLabel: '11. SPMK',
    fullTitle: '11. Surat Perintah Mulai Kerja (SPMK)',
  },
  {
    id: 'doc12_sertifikat',
    stage: 2,
    shortLabel: '12. Cover Sertifikat',
    fullTitle: '12. Cover Sertifikat Pembayaran',
  },
  {
    id: 'doc13_kpp',
    stage: 2,
    shortLabel: '13. Lap. Kemajuan (KPP)',
    fullTitle: '13. Laporan Kemajuan Pekerjaan (KPP)',
  },
  {
    id: 'doc14_bahp',
    stage: 2,
    shortLabel: '14. BA Pemeriksaan (BAHP)',
    fullTitle: '14. Berita Acara Pemeriksaan Hasil Pekerjaan (BAHP)',
  },
  {
    id: 'doc15_bast',
    stage: 2,
    shortLabel: '15. BA Serah Terima (BAST)',
    fullTitle: '15. Berita Acara Serah Terima Pekerjaan (BAST)',
  },
  {
    id: 'doc16_bapp',
    stage: 2,
    shortLabel: '16. BA Pembayaran (BAPP)',
    fullTitle: '16. Berita Acara Persetujuan Pembayaran (BAPP)',
  },
  {
    id: 'doc17_ringkasan_kontrak',
    stage: 2,
    shortLabel: '17. Ringkasan Kontrak',
    fullTitle: '17. Ringkasan Kontrak (15 Poin)',
  },
  {
    id: 'doc18_kuitansi',
    stage: 2,
    shortLabel: '18. Kuitansi (3 Rangkap)',
    fullTitle: '18. Kuitansi Pembayaran (3 Rangkap)',
  },
];

export function App() {
  const [master, setMaster] = useState<MasterData>(() => {
    try {
      const saved = localStorage.getItem(LS_MASTER_KEY);
      return saved ? normalizeMasterData(JSON.parse(saved)) : DEFAULT_MASTER_DATA;
    } catch {
      return DEFAULT_MASTER_DATA;
    }
  });

  const [transaction, setTransaction] = useState<TransactionData>(() => {
    try {
      const saved = localStorage.getItem(LS_TX_KEY);
      return saved
        ? normalizeTransactionData(JSON.parse(saved))
        : DEFAULT_TRANSACTION_DATA;
    } catch {
      return DEFAULT_TRANSACTION_DATA;
    }
  });

  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(() => {
    try {
      const saved = localStorage.getItem(LS_DRAFTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Layout & Navigation States
  const [layoutMode, setLayoutMode] = useState<'split' | 'form' | 'preview'>('split');
  const [leftTab, setLeftTab] = useState<'transaksi' | 'master'>('transaksi');
  const [activeDocTab, setActiveDocTab] = useState<DocumentTabId>('all');
  const [docStageFilter, setDocStageFilter] = useState<'all' | 1 | 2>('all');
  const [previewZoom, setPreviewZoom] = useState<number>(0.72);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [forcePrintAll, setForcePrintAll] = useState(false);

  const { isOnline: isFbOnline } = getFirestoreInstance();

  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Save to LocalStorage automatically
  useEffect(() => {
    try {
      localStorage.setItem(LS_MASTER_KEY, JSON.stringify(master));
    } catch {
      // ignore quota error
    }
  }, [master]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_TX_KEY, JSON.stringify(transaction));
    } catch {
      // ignore quota error
    }
  }, [transaction]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_DRAFTS_KEY, JSON.stringify(savedDrafts));
    } catch {
      // ignore quota error
    }
  }, [savedDrafts]);

  // Reset forcePrintAll after print dialog closes
  useEffect(() => {
    const handleAfterPrint = () => {
      setForcePrintAll(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const summary = useMemo(
    () => computeProcurementSummary(transaction),
    [transaction]
  );

  // Print All 18 Documents handler
  const handlePrintAllDocuments = () => {
    setForcePrintAll(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Print Active View (exact match with what is currently displayed in preview)
  const handlePrintCurrentView = () => {
    setForcePrintAll(false);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Export Word (.docx)
  const handleExportDocx = async (
    target: DocumentTabId = 'all',
    overrideTx?: TransactionData,
    overrideMaster?: MasterData,
    overrideSummary?: ReturnType<typeof computeProcurementSummary>
  ) => {
    try {
      setIsExportingDocx(true);
      await exportProcurementToDocx(
        overrideMaster || master,
        overrideTx || transaction,
        overrideSummary || summary,
        target
      );
      showToast('Dokumen Word (.docx) berhasil diunduh!');
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor dokumen Word (.docx). Silakan coba kembali.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Handlers untuk Rekapitulasi Pengadaan
  const handleLoadDraftFromRekap = (draft: SavedDraft) => {
    setTransaction(normalizeTransactionData(draft.transaction));
    if (draft.master) setMaster(normalizeMasterData(draft.master));
    showToast(
      `Paket "${draft.title || draft.namaPaket}" berhasil dimuat! Anda dapat mengedit kembali formulir.`
    );
  };

  const handlePrintDraftDirectly = (draft: SavedDraft) => {
    setTransaction(normalizeTransactionData(draft.transaction));
    if (draft.master) setMaster(normalizeMasterData(draft.master));
    setForcePrintAll(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleExportDocxDraftDirectly = (draft: SavedDraft) => {
    const dMaster = draft.master ? normalizeMasterData(draft.master) : master;
    const dTx = normalizeTransactionData(draft.transaction);
    const dSummary = computeProcurementSummary(dTx);
    handleExportDocx('all', dTx, dMaster, dSummary);
  };

  const handleNewBlankPacket = () => {
    const randomSuffix = String(Math.floor(Math.random() * 90) + 10);
    const newTx: TransactionData = {
      ...DEFAULT_TRANSACTION_DATA,
      id: `paket-dispora-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      namaPaket: 'Pengadaan Belanja Bahan Baru',
      nomorDPP: `00.3.2/${randomSuffix}-DPP/35.07.318/2026`,
      kodeRUP: String(Math.floor(Math.random() * 90000000) + 10000000),
      items: [
        {
          id: `item-${Date.now()}-1`,
          kategori: 'Belanja Bahan Kimia',
          namaBarang: 'Item Pengadaan 1',
          keteranganSpesifikasi: '',
          volume: 1,
          satuan: 'Paket',
          volumeTambahan: null,
          satuanTambahan: '',
          hargaPaguSatuan: 100000,
          hargaPenetapanSatuan: 100000,
          modePenetapan: 'pagu',
          hargaKontrakSatuan: 90090.09,
          hargaKontrakTermasukPajak: 100000,
          ongkosKirimKontrak: 0,
          toko1: {
            namaToko: 'BERKAH MANDIRI SOLUSINDO',
            hargaSatuan: 100000,
            tanggalSurvei: new Date().toISOString().slice(0, 10),
            link: 'https://www.mbizmarket.co.id/',
            gambarUrl: '',
          },
          toko2: {
            namaToko: 'CV MITRA UTAMA',
            hargaSatuan: 105000,
            tanggalSurvei: new Date().toISOString().slice(0, 10),
            link: 'https://www.mbizmarket.co.id/',
            gambarUrl: '',
          },
        },
      ],
    };
    setTransaction(normalizeTransactionData(newTx));
    showToast('Formulir paket pengadaan baru siap diisi!');
  };

  // Export Draft JSON
  const handleDownloadJsonDraft = () => {
    const payload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      master,
      transaction,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeCode = (transaction.kodeRUP || 'paket').replace(/[^a-zA-Z0-9_-]/g, '');
    a.href = url;
    a.download = `Draft_EPurchasing_Dispora_${safeCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File Draft JSON berhasil diunduh!');
  };

  // Import Draft JSON
  const handleImportJsonDraft = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.transaction) {
          setTransaction(normalizeTransactionData(parsed.transaction));
        }
        if (parsed.master) {
          setMaster(normalizeMasterData(parsed.master));
        }
        setShowDraftModal(false);
        showToast('Draft JSON berhasil dimuat!');
      } catch {
        alert('Format file JSON tidak valid.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Save slot in browser LocalStorage
  const handleSaveSlotToBrowser = () => {
    const title =
      draftNameInput.trim() ||
      `${transaction.kodeRUP} - ${transaction.namaPaket.slice(0, 48)}`;
    const newDraft: SavedDraft = {
      id: `draft-${Date.now()}`,
      title,
      savedAt: new Date().toISOString(),
      transaction,
      master,
    };
    setSavedDrafts([newDraft, ...savedDrafts]);
    setDraftNameInput('');
    showToast('Draft berhasil disimpan di penyimpanan browser!');
  };

  const handleApplyDefaultsToTransaction = () => {
    setTransaction((prev) => ({
      ...prev,
      program: master.programDefault,
      kegiatan: master.kegiatanDefault,
      subKegiatan: master.subKegiatanDefault,
      lokasiNama: master.lokasiPekerjaanNama,
      lokasiAlamat: master.lokasiPekerjaanAlamat,
      kontrak: {
        ...prev.kontrak,
        kodeProgram: master.kodeProgramDefault,
        kodeKegiatan: master.kodeKegiatanDefault,
        kodeSubKegiatan: master.kodeSubKegiatanDefault,
      },
    }));
    showToast('Program, Kegiatan, & Lokasi Default diterapkan ke paket aktif!');
  };

  const effectiveDocTab = forcePrintAll ? 'all' : activeDocTab;
  const currentScale =
    layoutMode === 'split' ? previewZoom : Math.max(previewZoom, 0.85);

  const docEntries: Array<{
    id: Exclude<DocumentTabId, 'all' | 'all_tahap1' | 'all_tahap2'>;
    stage: 1 | 2;
    element: React.ReactNode;
  }> = [
    // Tahap 1: Persiapan Pengadaan / DPP (Dokumen 1 - 9)
    {
      id: 'doc1_checklist',
      stage: 1,
      element: (
        <Doc1Checklist master={master} transaction={transaction} summary={summary} />
      ),
    },
    {
      id: 'doc2_permohonan',
      stage: 1,
      element: (
        <Doc2SuratPermohonan
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
    {
      id: 'doc3_surat_tugas',
      stage: 1,
      element: (
        <Doc3SuratTugas master={master} transaction={transaction} summary={summary} />
      ),
    },
    {
      id: 'doc4_dpp',
      stage: 1,
      element: <Doc4DPP master={master} transaction={transaction} summary={summary} />,
    },
    {
      id: 'doc5_kak',
      stage: 1,
      element: <Doc5KAK master={master} transaction={transaction} summary={summary} />,
    },
    {
      id: 'doc6_rab',
      stage: 1,
      element: <Doc6RAB master={master} transaction={transaction} summary={summary} />,
    },
    {
      id: 'doc7_spektek',
      stage: 1,
      element: (
        <Doc7SpekTeknis master={master} transaction={transaction} summary={summary} />
      ),
    },
    {
      id: 'doc8_riwayat_survei',
      stage: 1,
      element: (
        <Doc8RiwayatSurvei
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
    {
      id: 'doc9_lampiran_survei',
      stage: 1,
      element: (
        <Doc9LampiranSurvei
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
    // Tahap 2: Kontrak, Serah Terima / BAST & Pencairan / SPJ (Dokumen 10 - 18)
    {
      id: 'doc10_sp',
      stage: 2,
      element: (
        <Doc10SuratPesanan
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
    {
      id: 'doc11_spmk',
      stage: 2,
      element: (
        <Doc11SPMK master={master} transaction={transaction} summary={summary} />
      ),
    },
    {
      id: 'doc12_sertifikat',
      stage: 2,
      element: (
        <Doc12SertifikatPembayaran
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
    {
      id: 'doc13_kpp',
      stage: 2,
      element: (
        <Doc13LaporanKemajuanPekerjaan
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
    {
      id: 'doc14_bahp',
      stage: 2,
      element: (
        <Doc14BAHP master={master} transaction={transaction} summary={summary} />
      ),
    },
    {
      id: 'doc15_bast',
      stage: 2,
      element: (
        <Doc15BAST master={master} transaction={transaction} summary={summary} />
      ),
    },
    {
      id: 'doc16_bapp',
      stage: 2,
      element: (
        <Doc16BAPP master={master} transaction={transaction} summary={summary} />
      ),
    },
    {
      id: 'doc17_ringkasan_kontrak',
      stage: 2,
      element: (
        <Doc17RingkasanKontrak
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
    {
      id: 'doc18_kuitansi',
      stage: 2,
      element: (
        <Doc18Kuitansi
          master={master}
          transaction={transaction}
          summary={summary}
        />
      ),
    },
  ];

  const filteredDocTabs = DOCUMENT_TABS.filter((tab) => {
    if (tab.stage === 'group') return false;
    if (docStageFilter === 'all') return true;
    return tab.stage === docStageFilter;
  });

  return (
    <div className="app-shell min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* =====================================================================
          TOP HEADER & QUICK ACTION TOOLBAR (HIDDEN ON PRINT)
      ===================================================================== */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-3">
            <img
              src={master.logoUrl || '/sample-media/logo-malang.png'}
              alt="Logo Kab. Malang"
              className="w-9 h-10 object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  SI-DPP &amp; Kontrak E-Purchasing
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Dispora Kab. Malang
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Sistem Terpadu 18 Dokumen Pengadaan: Persiapan/DPP (1–9) &amp; Kontrak/BAST/Kuitansi (10–18)
              </p>
            </div>
          </div>

          {/* Layout Mode Switcher (Form / Split / Preview) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLayoutMode('form')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                layoutMode === 'form'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Form Input</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                layoutMode === 'split'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split Screen</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                layoutMode === 'preview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview 18 Dokumen</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintCurrentView}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition cursor-pointer"
              title="Cetak sesuai tampilan Preview saat ini (atau simpan sebagai PDF A4)"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-300" />
              <span>
                {activeDocTab === 'all'
                  ? 'Cetak Semua 18 / PDF'
                  : activeDocTab === 'all_tahap1'
                  ? 'Cetak Tahap 1 (1–9)'
                  : activeDocTab === 'all_tahap2'
                  ? 'Cetak Tahap 2 (10–18)'
                  : 'Cetak Preview / PDF'}
              </span>
            </button>

            {activeDocTab !== 'all' && (
              <button
                type="button"
                onClick={handlePrintAllDocuments}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-700 text-white hover:bg-indigo-800 shadow-xs transition cursor-pointer"
                title="Cetak seluruh 18 dokumen sekaligus"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak 18 Dokumen</span>
              </button>
            )}

            <button
              type="button"
              disabled={isExportingDocx}
              onClick={() => handleExportDocx(activeDocTab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-xs transition cursor-pointer"
              title="Download Dokumen dalam format Microsoft Word (.docx)"
            >
              {isExportingDocx ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>
                {activeDocTab === 'all'
                  ? 'Download Word (18 Dok)'
                  : activeDocTab === 'all_tahap1'
                  ? 'Word Tahap 1 (.docx)'
                  : activeDocTab === 'all_tahap2'
                  ? 'Word Tahap 2 (.docx)'
                  : 'Download Word (.docx)'}
              </span>
            </button>

            {/* Tombol Utama: Rekap Pengadaan (Online Cloud Firebase) */}
            <button
              type="button"
              onClick={() => setShowRekapModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
              title="Buka daftar rekapan paket pengadaan"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Rekap Pengadaan</span>
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-indigo-300 animate-pulse"
                title="Cloud Firebase Firestore Aktif"
              />
            </button>

            <button
              type="button"
              onClick={() => setShowDraftModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-indigo-600" />
              <span>Slot Cepat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          MAIN WORKSPACE (SPLIT SCREEN / TAB VIEW)
      ===================================================================== */}
      <main className="app-main flex-1 max-w-[1920px] w-full mx-auto flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT PANEL: FORM INPUT TRANSAKSI & MASTER DATA */}
        {layoutMode !== 'preview' && (
          <div
            className={`no-print flex flex-col border-r border-slate-200 bg-slate-50/70 ${
              layoutMode === 'split'
                ? 'w-full lg:w-[46%] xl:w-[44%] lg:h-[calc(100vh-57px)] lg:overflow-y-auto'
                : 'w-full max-w-5xl mx-auto'
            }`}
          >
            {/* Left Panel Mode Switcher: Input Paket vs Master Data Instansi */}
            <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs px-4 pt-3 pb-2 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLeftTab('transaksi')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    leftTab === 'transaksi'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Input Paket, Barang &amp; Kontrak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab('master')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    leftTab === 'master'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Master Data &amp; Pejabat</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 hidden sm:block">
                Auto-saved ke LocalStorage
              </div>
            </div>

            <div className="p-4">
              {leftTab === 'transaksi' ? (
                <TransactionFormPanel
                  transaction={transaction}
                  master={master}
                  summary={summary}
                  onChange={setTransaction}
                  onOpenRekapModal={() => setShowRekapModal(true)}
                />
              ) : (
                <MasterDataPanel
                  master={master}
                  onChange={setMaster}
                  onApplyDefaultsToTransaction={handleApplyDefaultsToTransaction}
                />
              )}
            </div>
          </div>
        )}

        {/* RIGHT PANEL: LIVE PREVIEW 18 DOKUMEN A4 & PRINT CONTAINER */}
        <div
          className={`preview-panel flex-1 flex flex-col bg-slate-200/70 ${
            layoutMode === 'form' ? 'hidden print:block' : ''
          } ${
            layoutMode === 'split'
              ? 'lg:h-[calc(100vh-57px)] lg:overflow-y-auto'
              : 'min-h-[calc(100vh-57px)]'
          }`}
        >
          {/* Document Stage & Tab Selector + Zoom Controls (Hidden on Print) */}
          <div className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-3 py-2 shadow-2xs space-y-2">
            {/* Row 1: Stage Selector + Active Document Title + Zoom */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 mr-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Tahap:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDocStageFilter('all');
                    setActiveDocTab('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    docStageFilter === 'all' && activeDocTab === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua 18 Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocStageFilter(1);
                    setActiveDocTab('all_tahap1');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    docStageFilter === 1
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  Tahap 1: Persiapan / DPP (1–9)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocStageFilter(2);
                    setActiveDocTab('all_tahap2');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    docStageFilter === 2
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Tahap 2: Kontrak, BAST &amp; Kuitansi (10–18)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrintCurrentView}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                  title="Cetak dokumen yang sedang tampil di Preview"
                >
                  <Printer className="w-3 h-3" />
                  Cetak Tampilan Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDocx(activeDocTab)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                  title="Unduh Word (.docx) untuk tampilan ini"
                >
                  <FileDown className="w-3 h-3" />
                  .docx Tampilan Ini
                </button>

                <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))
                    }
                    className="p-0.5 text-slate-600 hover:text-slate-900"
                    title="Perkecil tampilan kertas"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono w-10 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewZoom((z) => Math.min(1.15, Number((z + 0.1).toFixed(2))))
                    }
                    className="p-0.5 text-slate-600 hover:text-slate-900"
                    title="Perbesar tampilan kertas"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(1)}
                    className="text-[10px] text-indigo-600 hover:underline pl-1"
                  >
                    100%
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Individual Document Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {docStageFilter === 1 && (
                <button
                  type="button"
                  onClick={() => setActiveDocTab('all_tahap1')}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeDocTab === 'all_tahap1'
                      ? 'bg-indigo-700 text-white shadow-2xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  Semua Tahap 1 (Dok 1–9)
                </button>
              )}
              {docStageFilter === 2 && (
                <button
                  type="button"
                  onClick={() => setActiveDocTab('all_tahap2')}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeDocTab === 'all_tahap2'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Semua Tahap 2 (Dok 10–18)
                </button>
              )}

              {filteredDocTabs.map((tab) => {
                const isSelected = activeDocTab === tab.id;
                const activeClass =
                  tab.stage === 2
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-indigo-600 text-white shadow-2xs';
                const inactiveClass =
                  tab.stage === 2
                    ? 'bg-emerald-50/70 text-emerald-900 border border-emerald-200/70 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveDocTab(tab.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isSelected ? activeClass : inactiveClass
                    }`}
                  >
                    {tab.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* A4 Paper Canvas Container */}
          <div className="print-container flex-1 p-4 sm:p-6 overflow-x-auto">
            <div
              className="print-scale-wrapper mx-auto"
              style={
                {
                  '--preview-scale': currentScale,
                } as React.CSSProperties
              }
            >
              {docEntries
                .filter((entry) => {
                  if (effectiveDocTab === 'all') return true;
                  if (effectiveDocTab === 'all_tahap1') return entry.stage === 1;
                  if (effectiveDocTab === 'all_tahap2') return entry.stage === 2;
                  return effectiveDocTab === entry.id;
                })
                .map((entry) => (
                  <React.Fragment key={entry.id}>{entry.element}</React.Fragment>
                ))}
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          MODAL: SIMPAN / MUAT DRAFT (JSON & LOCALSTORAGE)
      ===================================================================== */}
      {showDraftModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-base text-slate-900">
                  Manajemen Draft Paket Pengadaan (18 Dokumen)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* 1. Export / Import File JSON */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Cadangkan / Pindah Perangkat via File JSON
                </div>
                <p className="text-xs text-slate-600">
                  Unduh seluruh data paket (Tahap 1 DPP &amp; Tahap 2 Kontrak/BAST/Kuitansi) ke komputer Anda sebagai file{' '}
                  <code>.json</code> atau muat kembali file draft yang pernah disimpan.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadJsonDraft}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Simpan Draft ke File (.json)
                  </button>

                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Muat File Draft (.json)
                  </button>
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportJsonDraft}
                  />
                </div>
              </div>

              {/* 2. Simpan Multi-Paket di Browser */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Daftar Draft Paket Tersimpan di Browser
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftNameInput}
                    onChange={(e) => setDraftNameInput(e.target.value)}
                    placeholder="Nama slot draft (opsional, misal: Paket Kebersihan Maret 2026)"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSlotToBrowser}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"
                  >
                    + Simpan Slot
                  </button>
                </div>

                {savedDrafts.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Belum ada slot draft tambahan yang disimpan.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {savedDrafts.map((d) => {
                      const total = d.transaction.items.reduce(
                        (acc, it) => acc + it.volume * it.hargaPenetapanSatuan,
                        0
                      );
                      return (
                        <div
                          key={d.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              {d.title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {d.transaction.items.length} Barang •{' '}
                              {formatRupiahDoc(total)} •{' '}
                              {new Date(d.savedAt).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setTransaction(normalizeTransactionData(d.transaction));
                                if (d.master) setMaster(normalizeMasterData(d.master));
                                setShowDraftModal(false);
                                showToast(`Draft "${d.title}" berhasil dimuat!`);
                              }}
                              className="px-2.5 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                            >
                              Muat
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSavedDrafts(savedDrafts.filter((x) => x.id !== d.id))
                              }
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Hapus Slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Reset ke Contoh Standar Dispora */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Ingin mengembalikan contoh data asli Dispora Kab. Malang (Pagu Rp 56.887.000,- &amp; Kontrak Rp 55.814.850,-)?
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Kembalikan seluruh data transaksi & master ke contoh bawaan Dispora Kabupaten Malang?'
                      )
                    ) {
                      setMaster(DEFAULT_MASTER_DATA);
                      setTransaction(DEFAULT_TRANSACTION_DATA);
                      setShowDraftModal(false);
                      showToast('Data berhasil direset ke contoh Dispora Kab. Malang!');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Data Contoh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rekapitulasi Pengadaan (Online Firebase & Lokal) */}
      <RekapPengadaanModal
        isOpen={showRekapModal}
        onClose={() => setShowRekapModal(false)}
        currentTransaction={transaction}
        currentMaster={master}
        onLoadDraft={handleLoadDraftFromRekap}
        onPrintDraft={handlePrintDraftDirectly}
        onExportDocxDraft={handleExportDocxDraftDirectly}
        onNewBlankPacket={handleNewBlankPacket}
        showToast={showToast}
      />
    </div>
  );
}

export default App;
