import React, { useState } from 'react';
import {
  Building,
  Calculator,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FolderKanban,
  FolderTree,
  Hash,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  Plus,
  Receipt,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ChecklistJenisPengadaan,
  ChecklistMetodeEpurchasing,
  ChecklistValue,
  ContractExecutionData,
  JenisPPhOption,
  MasterData,
  PriceSelectionMode,
  ProcurementItem,
  SuratPermohonanTableMode,
  TransactionData,
} from '../../types/procurement';
import {
  ComputedProcurementSummary,
  getItemEffectiveVolume,
  formatItemVolumeSatuan,
} from '../../utils/calculations';
import {
  formatRupiahDec2,
  formatRupiahDoc,
  getItemSurveyTotal,
  tanggalKeEjaanResmi,
} from '../../utils/terbilang';

interface TransactionFormPanelProps {
  transaction: TransactionData;
  master: MasterData;
  summary: ComputedProcurementSummary;
  onChange: (next: TransactionData) => void;
  onOpenRekapModal?: () => void;
}

const SATUAN_OPTIONS = [
  'Liter',
  'Kg',
  'Botol',
  'Buah',
  'Unit',
  'Set',
  'Paket',
  'Kotak',
  'Lembar',
  'Roll',
  'Pasang',
  'Meter',
  'Zak',
  'Galon',
  'Kaleng',
  'Bulan',
  'Orang',
  'Hari',
  'Tahun',
  'Orang/Bulan',
  'OB',
  'OH',
  'Kegiatan',
  'Kali',
  'Pcs',
  'Rim',
  'Dos',
];

export const TransactionFormPanel: React.FC<TransactionFormPanelProps> = ({
  transaction,
  summary,
  onChange,
  onOpenRekapModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'utama' | 'barang' | 'kontrak' | 'kak_checklist'
  >('barang');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [seqNoInput, setSeqNoInput] = useState('01');
  const [numUpdateMessage, setNumUpdateMessage] = useState<string | null>(null);

  const ejaanDPP = tanggalKeEjaanResmi(transaction.tanggalDPP);
  const kontrak = transaction.kontrak;

  const updateKontrak = (patch: Partial<ContractExecutionData>) => {
    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      kontrak: {
        ...transaction.kontrak,
        ...patch,
      },
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    transaction.items.forEach((it) => {
      next[it.id] = open;
    });
    setExpandedItems(next);
  };

  const updateItem = (id: string, updater: (item: ProcurementItem) => ProcurementItem) => {
    const nextItems = transaction.items.map((it) => (it.id === id ? updater(it) : it));
    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      items: nextItems,
    });
  };

  const applyPriceSelectionMode = (
    item: ProcurementItem,
    mode: PriceSelectionMode
  ): ProcurementItem => {
    let hargaPenetapan = item.hargaPenetapanSatuan;
    if (mode === 'pagu') {
      hargaPenetapan = item.hargaPaguSatuan;
    } else if (mode === 'terendah') {
      const candidates = [
        item.hargaPaguSatuan,
        item.toko1.hargaSatuan,
        item.toko2.hargaSatuan,
      ].filter((v) => v > 0);
      hargaPenetapan = candidates.length > 0 ? Math.min(...candidates) : 0;
    } else if (mode === 'rata2') {
      const s1 = item.toko1.hargaSatuan || 0;
      const s2 = item.toko2.hargaSatuan || 0;
      if (s1 > 0 && s2 > 0) {
        hargaPenetapan = Math.round((s1 + s2) / 2);
      }
    }
    return {
      ...item,
      modePenetapan: mode,
      hargaPenetapanSatuan: hargaPenetapan,
    };
  };

  const handleBatchSyncHPSFromPagu = () => {
    const nextItems = transaction.items.map((it) => ({
      ...it,
      modePenetapan: 'pagu' as PriceSelectionMode,
      hargaPenetapanSatuan: it.hargaPaguSatuan,
    }));
    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      items: nextItems,
    });
  };

  const handleBatchSyncKontrakFromHPS = () => {
    const ppnPersen = transaction.kontrak?.ppnPersen ?? 11;
    const ppnDivisor = 1 + ppnPersen / 100;
    const nextItems = transaction.items.map((it) => ({
      ...it,
      hargaKontrakTermasukPajak: it.hargaPenetapanSatuan,
      hargaKontrakSatuan:
        ppnPersen > 0
          ? Number((it.hargaPenetapanSatuan / ppnDivisor).toFixed(2))
          : it.hargaPenetapanSatuan,
    }));
    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      items: nextItems,
    });
  };

  const handleAddItem = (targetKategori?: string) => {
    const defaultKategori =
      targetKategori ||
      transaction.kategoriRekening[0]?.kategori ||
      'Belanja Bahan Kimia';
    const lastSurveyDate =
      transaction.items[transaction.items.length - 1]?.toko1.tanggalSurvei ||
      transaction.tanggalDPP;
    const ppnPersen = transaction.kontrak?.ppnPersen ?? 11;
    const ppnDiv = 1 + ppnPersen / 100;
    const newId = `item-${Date.now()}`;
    const newItem: ProcurementItem = {
      id: newId,
      kategori: defaultKategori,
      namaBarang: 'Barang Baru',
      keteranganSpesifikasi: '',
      volume: 1,
      satuan: 'Buah',
      volumeTambahan: null,
      satuanTambahan: '',
      hargaPaguSatuan: 50000,
      toko1: {
        namaToko: 'BERKAH MANDIRI SOLUSINDO',
        hargaSatuan: 50200,
        tanggalSurvei: lastSurveyDate,
        link: 'https://www.mbizmarket.co.id/',
        gambarUrl: '',
      },
      toko2: {
        namaToko: 'CV MITRA UTAMA',
        hargaSatuan: 55000,
        tanggalSurvei: lastSurveyDate,
        link: 'https://www.mbizmarket.co.id/',
        gambarUrl: '',
      },
      hargaPenetapanSatuan: 50000,
      modePenetapan: 'pagu',
      hargaKontrakTermasukPajak: 49500,
      hargaKontrakSatuan:
        ppnPersen > 0 ? Number((49500 / ppnDiv).toFixed(2)) : 49500,
      ongkosKirimKontrak: 0,
    };
    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      items: [...transaction.items, newItem],
    });
    setExpandedItems((prev) => ({ ...prev, [newId]: true }));
  };

  const handleDuplicateItem = (item: ProcurementItem) => {
    const newId = `item-${Date.now()}`;
    const copy: ProcurementItem = {
      ...item,
      id: newId,
      namaBarang: `${item.namaBarang} (Salinan)`,
      toko1: { ...item.toko1 },
      toko2: { ...item.toko2 },
    };
    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      items: [...transaction.items, copy],
    });
    setExpandedItems((prev) => ({ ...prev, [newId]: true }));
  };

  const handleRemoveItem = (id: string) => {
    if (transaction.items.length <= 1) {
      alert('Minimal harus terdapat 1 item barang dalam paket pengadaan.');
      return;
    }
    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      items: transaction.items.filter((it) => it.id !== id),
    });
  };

  const handleSurveyImageUpload = (
    itemId: string,
    storeKey: 'toko1' | 'toko2',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateItem(itemId, (it) => ({
          ...it,
          [storeKey]: {
            ...it[storeKey],
            gambarUrl: reader.result as string,
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategoryRekening = () => {
    const newIdx = transaction.kategoriRekening.length + 1;
    const newName = `Belanja Rekening Baru ${newIdx}`;
    onChange({
      ...transaction,
      kategoriRekening: [
        ...transaction.kategoriRekening,
        {
          id: `kat-${Date.now()}`,
          kategori: newName,
          namaRekening: newName,
          kodeRekening: '5.1.02.01.01.0000',
        },
      ],
    });
  };

  const handleAutoGenerateKAKFromItems = () => {
    const itemNames = transaction.items
      .slice(0, 5)
      .map((i) => i.namaBarang.toLowerCase())
      .join(', ');
    const nextLatar = `Dalam rangka menjaga kebersihan, kesehatan, dan kelayakan sarana dan prasarana olahraga yang digunakan secara rutin oleh masyarakat, diperlukan dukungan pengadaan belanja bahan secara berkelanjutan. Kebutuhan barang seperti ${itemNames}, merupakan kebutuhan penting dalam menunjang pemeliharaan sarana dan prasarana olahraga pada ${transaction.lokasiNama} agar tetap bersih, aman, dan nyaman digunakan. Ketersediaan bahan yang memadai diharapkan dapat mendukung kelancaran operasional serta meningkatkan kualitas pelayanan fasilitas olahraga kepada masyarakat.`;
    const nextMaksud = `Maksud dari pengadaan belanja operasional dan pemeliharaan sarana prasarana olahraga adalah untuk menunjang kegiatan operasional dan pemeliharaan sarana prasarana olahraga yang lebih efektif dan efisien. Untuk itu, perlu dilaksanakan kegiatan ${transaction.namaPaket}.`;
    const nextTujuan = `Pengadaan ini bertujuan untuk mendukung pemeliharaan kebersihan, kesehatan, dan kelayakan fasilitas olahraga melalui ketersediaan bahan pendukung operasional seperti ${itemNames}, dan perlengkapan lainnya, sehingga sarana dan prasarana olahraga dapat digunakan secara aman, nyaman, dan berkelanjutan.`;

    onChange({
      ...transaction,
      kakLatarBelakang: nextLatar,
      kakMaksud: nextMaksud,
      kakTujuan: nextTujuan,
    });
  };

  const handleBatchUpdateAllDocumentNumbers = (customNum?: string) => {
    const rawUrut = (customNum !== undefined ? customNum : seqNoInput).trim();
    const urut = rawUrut || '01';
    const thn = transaction.tahunAnggaran || '2026';

    // 1. Surat Permohonan: e.g. "000.3.1/02/35.07.318/2026" or "800.1.11.1/02.sarpras/35.07.318/2026"
    let nextPermohonan = transaction.nomorSuratPermohonan || '';
    // Kembalikan 35.07.318 jika sebelumnya sempat rusak menjadi nomor lain
    nextPermohonan = nextPermohonan.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');

    if (/\.sarpras\/(?:35|\d+)\.07\.318/i.test(nextPermohonan)) {
      nextPermohonan = nextPermohonan.replace(
        /(\/\s*)[^/]*?(\.sarpras\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/\/(?:35|\d+)\.07\.318/i.test(nextPermohonan)) {
      if (/^([^\/]+\/\s*)[^\/]+(?:\/[^\/]+)*(\/35\.07\.318\/[^\s]*)$/.test(nextPermohonan)) {
        nextPermohonan = nextPermohonan.replace(
          /^([^\/]+\/\s*)[^\/]+(?:\/[^\/]+)*(\/35\.07\.318\/[^\s]*)$/,
          `$1${urut}$2`
        );
      } else {
        nextPermohonan = nextPermohonan.replace(
          /(\/\s*)[^/]*?(\/35\.07\.318\/[^\s]*)/,
          `$1${urut}$2`
        );
      }
    } else {
      nextPermohonan = `000.3.1/${urut}/35.07.318/${thn}`;
    }

    // 2. Surat Tugas: e.g. "800.1.11.1/ 02.sarpras-ST/35.07.318/2026"
    let nextTugas = transaction.nomorSuratTugas || '';
    nextTugas = nextTugas.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/\.sarpras-ST\/(?:35|\d+)\.07\.318/i.test(nextTugas)) {
      nextTugas = nextTugas.replace(
        /(\/\s*)[^/]*?(\.sarpras-ST\/35\.07\.318\/[^\s]*)/i,
        `$1 ${urut}$2`
      );
    } else if (/-ST\/(?:35|\d+)\.07\.318/i.test(nextTugas)) {
      nextTugas = nextTugas.replace(
        /(\/\s*)[^/]*?(-ST\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/\/(?:35|\d+)\.07\.318/i.test(nextTugas)) {
      nextTugas = nextTugas.replace(
        /(\/\s*)[^/]*?(\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else {
      nextTugas = `800.1.11.1/ ${urut}.sarpras-ST/35.07.318/${thn}`;
    }

    // 3. DPP: e.g. "00.3.2/02-DPP/35.07.318/2026"
    let nextDPP = transaction.nomorDPP || '';
    nextDPP = nextDPP.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/-DPP\/(?:35|\d+)\.07\.318/i.test(nextDPP)) {
      nextDPP = nextDPP.replace(
        /(\/\s*)[^/]*?(-DPP\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/(\/\s*)[^/]*?(-DPP)/i.test(nextDPP)) {
      nextDPP = nextDPP.replace(/(\/\s*)[^/]*?(-DPP)/i, `$1${urut}$2`);
    } else {
      nextDPP = `00.3.2/${urut}-DPP/35.07.318/${thn}`;
    }

    // 4. SP: e.g. "00.3.2/01-SP/35.07.318/2026"
    let nextSP = transaction.kontrak.nomorSP || '';
    nextSP = nextSP.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/-SP\/(?:35|\d+)\.07\.318/i.test(nextSP)) {
      nextSP = nextSP.replace(
        /(\/\s*)[^/]*?(-SP\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/(\/\s*)[^/]*?(-SP\/)/i.test(nextSP)) {
      nextSP = nextSP.replace(/(\/\s*)[^/]*?(-SP\/)/i, `$1${urut}$2`);
    } else {
      nextSP = `00.3.2/${urut}-SP/35.07.318/${thn}`;
    }

    // 5. SPMK: e.g. "00.3.2/01-SPMK/35.07.318/2026"
    let nextSPMK = transaction.kontrak.nomorSPMK || '';
    nextSPMK = nextSPMK.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/-SPMK\/(?:35|\d+)\.07\.318/i.test(nextSPMK)) {
      nextSPMK = nextSPMK.replace(
        /(\/\s*)[^/]*?(-SPMK\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/(\/\s*)[^/]*?(-SPMK\/)/i.test(nextSPMK)) {
      nextSPMK = nextSPMK.replace(/(\/\s*)[^/]*?(-SPMK\/)/i, `$1${urut}$2`);
    } else {
      nextSPMK = `00.3.2/${urut}-SPMK/35.07.318/${thn}`;
    }

    // 6. KPP: e.g. "00.3.2/01-KPP/35.07.318/2026"
    let nextKPP = transaction.kontrak.nomorKPP || '';
    nextKPP = nextKPP.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/-KPP\/(?:35|\d+)\.07\.318/i.test(nextKPP)) {
      nextKPP = nextKPP.replace(
        /(\/\s*)[^/]*?(-KPP\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/(\/\s*)[^/]*?(-KPP\/)/i.test(nextKPP)) {
      nextKPP = nextKPP.replace(/(\/\s*)[^/]*?(-KPP\/)/i, `$1${urut}$2`);
    } else {
      nextKPP = `00.3.2/${urut}-KPP/35.07.318/${thn}`;
    }

    // 7. BAHP: e.g. "00.3.2/01-BAHP/35.07.318/2026"
    let nextBAHP = transaction.kontrak.nomorBAHP || '';
    nextBAHP = nextBAHP.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/-BAHP\/(?:35|\d+)\.07\.318/i.test(nextBAHP)) {
      nextBAHP = nextBAHP.replace(
        /(\/\s*)[^/]*?(-BAHP\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/(\/\s*)[^/]*?(-BAHP\/)/i.test(nextBAHP)) {
      nextBAHP = nextBAHP.replace(/(\/\s*)[^/]*?(-BAHP\/)/i, `$1${urut}$2`);
    } else {
      nextBAHP = `00.3.2/${urut}-BAHP/35.07.318/${thn}`;
    }

    // 8. BAST: e.g. "00.3.2/01-BAST/35.07.318/2026"
    let nextBAST = transaction.kontrak.nomorBAST || '';
    nextBAST = nextBAST.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/-BAST\/(?:35|\d+)\.07\.318/i.test(nextBAST)) {
      nextBAST = nextBAST.replace(
        /(\/\s*)[^/]*?(-BAST\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/(\/\s*)[^/]*?(-BAST\/)/i.test(nextBAST)) {
      nextBAST = nextBAST.replace(/(\/\s*)[^/]*?(-BAST\/)/i, `$1${urut}$2`);
    } else {
      nextBAST = `00.3.2/${urut}-BAST/35.07.318/${thn}`;
    }

    // 9. BAPP (Persetujuan Pembayaran): e.g. "00.3.2/01-BAPP/35.07.318/2026"
    let nextBAPP = transaction.kontrak.nomorBAPP || '';
    nextBAPP = nextBAPP.replace(/\/(?:\d+|\s*)\.07\.318\//g, '/35.07.318/');
    if (/-BAPP\/(?:35|\d+)\.07\.318/i.test(nextBAPP)) {
      nextBAPP = nextBAPP.replace(
        /(\/\s*)[^/]*?(-BAPP\/35\.07\.318\/[^\s]*)/i,
        `$1${urut}$2`
      );
    } else if (/(\/\s*)[^/]*?(-BAPP\/)/i.test(nextBAPP)) {
      nextBAPP = nextBAPP.replace(/(\/\s*)[^/]*?(-BAPP\/)/i, `$1${urut}$2`);
    } else {
      nextBAPP = `00.3.2/${urut}-BAPP/35.07.318/${thn}`;
    }

    onChange({
      ...transaction,
      updatedAt: new Date().toISOString(),
      nomorSuratPermohonan: nextPermohonan,
      nomorSuratTugas: nextTugas,
      nomorDPP: nextDPP,
      kontrak: {
        ...transaction.kontrak,
        nomorSP: nextSP,
        nomorSPMK: nextSPMK,
        nomorKPP: nextKPP,
        nomorBAHP: nextBAHP,
        nomorBAST: nextBAST,
        nomorBAPP: nextBAPP,
      },
    });

    setNumUpdateMessage(
      `Semua nomor dokumen dari data DPP diawal s.d. Persetujuan Pembayaran (BAPP) berhasil diubah menjadi nomor "${urut}"!`
    );
    setTimeout(() => {
      setNumUpdateMessage(null);
    }, 4500);
  };

  const handleAutoGenerateContractNumbers = () => {
    handleBatchUpdateAllDocumentNumbers(seqNoInput);
  };

  const setAllChecklist = (val: ChecklistValue) => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    const next: Record<string, ChecklistValue> = {};
    keys.forEach((k) => {
      next[k] = val;
    });
    onChange({ ...transaction, checklistStatus: next });
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Ringkasan Pagu, HPS, Kontrak & Penomoran Cepat */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-sm border border-slate-800 space-y-2.5">
        {/* 3 Kartu Utama: Nilai Pagu, Nilai HPS, Nilai Kontrak */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-sky-500/15 border border-sky-400/30 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-sky-300 font-bold">
              Nilai Pagu
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {formatRupiahDoc(summary.totalPagu)}
            </div>
          </div>

          <div className="bg-indigo-500/15 border border-indigo-400/30 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold">
              Nilai HPS
            </div>
            <div className="text-sm font-bold text-indigo-200 mt-0.5">
              {formatRupiahDoc(summary.totalPenetapan)}
            </div>
          </div>

          <div className="bg-emerald-500/15 border border-emerald-400/35 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
              Nilai Kontrak
            </div>
            <div className="text-sm font-bold text-emerald-300 mt-0.5">
              {formatRupiahDoc(summary.totalNilaiKontrak)}
            </div>
          </div>
        </div>

        {/* Rincian Pajak & Netto Kontrak (Ringkas 4 Kolom) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[10px]">Harga Asli (DPP)</span>
            <span className="font-bold text-white">
              {formatRupiahDoc(summary.jumlahKontrakSebelumPPN)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">
              PPN ({summary.ppnPersen}%)
            </span>
            <span className="font-bold text-amber-300">
              {formatRupiahDoc(summary.ppnKontrak)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">
              PPh ({summary.pphPersen}%)
            </span>
            <span className="font-bold text-rose-300">
              {formatRupiahDoc(summary.pphKontrak)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Bersih (Netto)</span>
            <span className="font-bold text-emerald-300">
              {formatRupiahDoc(summary.nilaiBersihDiterima)}
            </span>
          </div>
        </div>

        {/* Baris Ubah Semua Nomor Dokumen & Tombol Rekap */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-medium">No. Urut Dokumen (DPP–BAPP):</span>
            <input
              id="input-seq-no"
              type="text"
              value={seqNoInput}
              onChange={(e) => setSeqNoInput(e.target.value)}
              placeholder="01"
              className="w-14 px-2 py-1 text-xs font-mono font-bold text-slate-900 bg-white rounded-md text-center focus:outline-none ml-1"
            />
            <button
              type="button"
              onClick={() => handleBatchUpdateAllDocumentNumbers(seqNoInput)}
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Terapkan</span>
            </button>
          </div>

          {onOpenRekapModal && (
            <button
              type="button"
              onClick={onOpenRekapModal}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-md transition cursor-pointer shadow-xs"
              title="Buka daftar rekapan paket pengadaan"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Rekap Pengadaan</span>
            </button>
          )}
        </div>

        {numUpdateMessage && (
          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[11px] px-2.5 py-1 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{numUpdateMessage}</span>
          </div>
        )}
      </div>

      {/* 4 Step-by-Step Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSubTab('utama')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'utama'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">1. Paket &amp; Anggaran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('barang')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'barang'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">2. Barang ({transaction.items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('kontrak')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'kontrak'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">3. Kontrak &amp; BAST</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('kak_checklist')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'kak_checklist'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">4. KAK &amp; Checklist</span>
        </button>
      </div>

      {/* =====================================================================
          STEP 1: IDENTITAS PAKET, PENOMORAN DPP, ANGGARAN/SUMBER DANA & PROGRAM/REKENING TERPADU
      ===================================================================== */}
      {activeSubTab === 'utama' && (
        <div className="space-y-3">
          {/* A. Identitas Paket, Penomoran & Jadwal DPP (Dok. 1–4) */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                <FolderKanban className="w-4 h-4 text-indigo-600" />
                A. Identitas Paket, Nomor &amp; Tanggal DPP (Dok. 1–4)
              </div>
              <button
                type="button"
                onClick={() => {
                  const namaOtomatis = `Pengadaan ${transaction.kategoriRekening
                    .map((k) => k.kategori)
                    .join('; ')}`;
                  onChange({ ...transaction, namaPaket: namaOtomatis });
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Susun dari Kategori
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nama Paket Pekerjaan
                </label>
                <textarea
                  rows={2}
                  value={transaction.namaPaket}
                  onChange={(e) =>
                    onChange({ ...transaction, namaPaket: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Kode RUP
                  </label>
                  <input
                    type="text"
                    value={transaction.kodeRUP}
                    onChange={(e) =>
                      onChange({ ...transaction, kodeRUP: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Metode Pengadaan
                  </label>
                  <input
                    type="text"
                    value={transaction.metodePengadaan}
                    onChange={(e) =>
                      onChange({ ...transaction, metodePengadaan: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Mode Tabel Surat Permohonan (Dok. 2)
                  </label>
                  <select
                    value={transaction.modeTabelPermohonan || 'per_item'}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        modeTabelPermohonan:
                          e.target.value as SuratPermohonanTableMode,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="per_item">Per Item Barang</option>
                    <option value="per_paket">1 Baris Nama Paket Utama</option>
                    <option value="per_kategori">Per Kategori Belanja</option>
                  </select>
                </div>
              </div>

              {/* Baris Sifat, Lampiran, Perihal Surat Permohonan */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                    Sifat Surat Permohonan
                  </label>
                  <input
                    type="text"
                    value={transaction.sifatSuratPermohonan}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        sifatSuratPermohonan: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                    Lampiran Permohonan
                  </label>
                  <input
                    type="text"
                    value={transaction.lampiranSuratPermohonan}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        lampiranSuratPermohonan: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                    Perihal Surat Permohonan
                  </label>
                  <input
                    type="text"
                    value={transaction.perihalSuratPermohonan}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        perihalSuratPermohonan: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Nomor & Tanggal Dokumen Tahap 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700">
                    2. Surat Permohonan
                  </label>
                  <input
                    type="text"
                    value={transaction.nomorSuratPermohonan}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        nomorSuratPermohonan: e.target.value,
                      })
                    }
                    placeholder="Nomor Surat Permohonan"
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={transaction.tanggalSuratPermohonan}
                      onChange={(e) =>
                        onChange({
                          ...transaction,
                          tanggalSuratPermohonan: e.target.value,
                        })
                      }
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                    <select
                      value={transaction.formatTanggalPermohonan}
                      onChange={(e) =>
                        onChange({
                          ...transaction,
                          formatTanggalPermohonan: e.target.value as
                            | 'lengkap'
                            | 'bulan_tahun',
                        })
                      }
                      className="px-1.5 py-1 text-[11px] border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option value="bulan_tahun">Bln Thn</option>
                      <option value="lengkap">Lengkap</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700">
                    3. Surat Tugas PPK
                  </label>
                  <input
                    type="text"
                    value={transaction.nomorSuratTugas}
                    onChange={(e) =>
                      onChange({ ...transaction, nomorSuratTugas: e.target.value })
                    }
                    placeholder="Nomor Surat Tugas"
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={transaction.tanggalSuratTugas}
                      onChange={(e) =>
                        onChange({
                          ...transaction,
                          tanggalSuratTugas: e.target.value,
                        })
                      }
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg"
                    />
                    <select
                      value={transaction.formatTanggalSuratTugas}
                      onChange={(e) =>
                        onChange({
                          ...transaction,
                          formatTanggalSuratTugas: e.target.value as
                            | 'lengkap'
                            | 'bulan_tahun',
                        })
                      }
                      className="px-1.5 py-1 text-[11px] border border-slate-200 rounded-lg bg-slate-50"
                    >
                      <option value="bulan_tahun">Bln Thn</option>
                      <option value="lengkap">Lengkap</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-700">
                    4. Dokumen DPP
                  </label>
                  <input
                    type="text"
                    value={transaction.nomorDPP}
                    onChange={(e) =>
                      onChange({ ...transaction, nomorDPP: e.target.value })
                    }
                    placeholder="Nomor DPP"
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                  <input
                    type="date"
                    value={transaction.tanggalDPP}
                    onChange={(e) =>
                      onChange({ ...transaction, tanggalDPP: e.target.value })
                    }
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Jadwal Pelaksanaan DPP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Mulai Pelaksanaan (DPP)
                  </label>
                  <input
                    type="date"
                    value={transaction.tanggalMulaiPelaksanaan}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        tanggalMulaiPelaksanaan: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Selesai Pelaksanaan (DPP)
                  </label>
                  <input
                    type="date"
                    value={transaction.tanggalSelesaiPelaksanaan}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        tanggalSelesaiPelaksanaan: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                    Jangka Waktu (Hari Kalender)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={transaction.jangkaWaktuHari}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        jangkaWaktuHari: Number(e.target.value) || 7,
                      })
                    }
                    className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* B. Sumber Dana, Tahun Anggaran & Dokumen DPA/DPPA Terpadu */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                <Calculator className="w-4 h-4 text-indigo-600" />
                B. Sumber Dana, Tahun Anggaran &amp; DPA / DPPA (Terpadu)
              </div>
            </div>

            {/* Baris 1: Tahun Anggaran & 3 Format Sumber Dana sesuai Dokumen */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  Tahun Anggaran
                </label>
                <input
                  type="text"
                  value={transaction.tahunAnggaran}
                  onChange={(e) => {
                    const thn = e.target.value;
                    const cleanLengkap = (
                      transaction.sumberDanaRAB || 'Pendapatan Asli Daerah'
                    )
                      .replace(/\s*Tahun\s+Anggaran\s+\d{4}\s*$/i, '')
                      .replace(/\s*Kabupaten\s+Malang\s*$/i, '')
                      .trim();
                    onChange({
                      ...transaction,
                      tahunAnggaran: thn,
                      sumberDanaKAK: `${cleanLengkap} Kabupaten Malang Tahun Anggaran ${
                        thn || '2026'
                      }`,
                      kontrak: {
                        ...transaction.kontrak,
                        tahunKuitansiLabel: thn,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">
                  Sumber Dana APBD / APBD-P (RAB)
                </label>
                <input
                  type="text"
                  list="sumber-dana-apbd-options"
                  placeholder="APBD / APBD-P"
                  value={transaction.sumberDanaAPBD || 'APBD'}
                  onChange={(e) =>
                    onChange({
                      ...transaction,
                      sumberDanaAPBD: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-bold text-indigo-950 bg-indigo-50/50 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="sumber-dana-apbd-options">
                  <option value="APBD" />
                  <option value="APBD-P" />
                  <option value="PAPBD" />
                </datalist>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  Sumber Dana Singkat (Permohonan &amp; Kuitansi)
                </label>
                <input
                  type="text"
                  list="sumber-dana-singkat-options"
                  placeholder="PAD / SILPA / DAU"
                  value={
                    transaction.sumberDanaTabelPermohonan ||
                    transaction.sumberDanaSuratPermohonan ||
                    transaction.sumberDanaSingkatKuitansi ||
                    'PAD'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      ...transaction,
                      sumberDanaTabelPermohonan: val,
                      sumberDanaSuratPermohonan: val,
                      sumberDanaSingkatKuitansi: val,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                />
                <datalist id="sumber-dana-singkat-options">
                  <option value="PAD" />
                  <option value="SILPA" />
                  <option value="DAU" />
                  <option value="DAK" />
                  <option value="DBHCHT" />
                  <option value="DBH" />
                </datalist>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">
                  Sumber Dana Lengkap (KAK &amp; Ringkasan Kontrak)
                </label>
                <input
                  type="text"
                  placeholder="Pendapatan Asli Daerah"
                  value={transaction.sumberDanaRAB}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cleanVal = val
                      .replace(/\s*Tahun\s+Anggaran\s+\d{4}\s*$/i, '')
                      .replace(/\s*Kabupaten\s+Malang\s*$/i, '')
                      .trim();
                    onChange({
                      ...transaction,
                      sumberDanaRAB: val,
                      sumberDanaKAK: `${cleanVal} Kabupaten Malang Tahun Anggaran ${
                        transaction.tahunAnggaran || '2026'
                      }`,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-50/50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Baris 2: Dokumen Anggaran (DPA / DPPA Terpadu untuk Surat Permohonan, KPP, BAST & Ringkasan Kontrak) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-100">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  Jenis Dok. Anggaran
                </label>
                <input
                  type="text"
                  list="jenis-dpa-options"
                  placeholder="DPPA / DPA"
                  value={transaction.jenisDokumenAnggaranPermohonan || 'DPPA'}
                  onChange={(e) =>
                    onChange({
                      ...transaction,
                      jenisDokumenAnggaranPermohonan: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                />
                <datalist id="jenis-dpa-options">
                  <option value="DPPA" />
                  <option value="DPA" />
                </datalist>
              </div>
              <div className="sm:col-span-6">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  Nomor DPA / DPPA (Permohonan, KPP, BAST &amp; Ringkasan Kontrak)
                </label>
                <input
                  type="text"
                  value={
                    transaction.nomorDPAPermohonan ||
                    transaction.kontrak?.nomorDPA ||
                    ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      ...transaction,
                      nomorDPAPermohonan: val,
                      kontrak: {
                        ...transaction.kontrak,
                        nomorDPA: val,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  Tanggal DPA / DPPA
                </label>
                <input
                  type="text"
                  placeholder="19 Oktober Tahun 2026"
                  value={
                    transaction.tanggalDPAPermohonan ||
                    transaction.kontrak?.tanggalDPA ||
                    ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      ...transaction,
                      tanggalDPAPermohonan: val,
                      kontrak: {
                        ...transaction.kontrak,
                        tanggalDPA: val,
                      },
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* C. Program, Kegiatan, Sub Kegiatan, Lokasi & Kode Rekening Belanja (Terpadu) */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                C. Program, Kegiatan, Lokasi &amp; Kode Rekening (Terpadu)
              </div>
              <button
                type="button"
                onClick={handleAddCategoryRekening}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Kategori Rekening
              </button>
            </div>

            {/* Kode & Uraian Program, Kegiatan, Sub Kegiatan */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Kode Program
                  </label>
                  <input
                    type="text"
                    value={kontrak.kodeProgram}
                    onChange={(e) => updateKontrak({ kodeProgram: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs font-mono font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-9">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Uraian Program
                  </label>
                  <input
                    type="text"
                    value={transaction.program}
                    onChange={(e) =>
                      onChange({ ...transaction, program: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Kode Kegiatan
                  </label>
                  <input
                    type="text"
                    value={kontrak.kodeKegiatan}
                    onChange={(e) => updateKontrak({ kodeKegiatan: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs font-mono font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-9">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Uraian Kegiatan
                  </label>
                  <input
                    type="text"
                    value={transaction.kegiatan}
                    onChange={(e) =>
                      onChange({ ...transaction, kegiatan: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Kode Sub Kegiatan
                  </label>
                  <input
                    type="text"
                    value={kontrak.kodeSubKegiatan}
                    onChange={(e) =>
                      updateKontrak({ kodeSubKegiatan: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs font-mono font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-9">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Uraian Sub Kegiatan
                  </label>
                  <textarea
                    rows={2}
                    value={transaction.subKegiatan}
                    onChange={(e) =>
                      onChange({ ...transaction, subKegiatan: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Lokasi Pekerjaan Terpadu */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Nama Lokasi Pekerjaan
                  </label>
                  <input
                    type="text"
                    value={transaction.lokasiNama}
                    onChange={(e) =>
                      onChange({ ...transaction, lokasiNama: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-7">
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                    Alamat Lengkap Lokasi Pekerjaan
                  </label>
                  <input
                    type="text"
                    value={transaction.lokasiAlamat}
                    onChange={(e) =>
                      onChange({ ...transaction, lokasiAlamat: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Daftar Kategori Barang & Kode Rekening */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-700">
                Kategori Barang &amp; Kode Rekening Belanja
              </div>
              {transaction.kategoriRekening.map((kr, idx) => (
                <div
                  key={kr.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200/80"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-slate-500">
                      Kategori Barang
                    </label>
                    <input
                      type="text"
                      value={kr.kategori}
                      onChange={(e) => {
                        const oldKat = kr.kategori;
                        const newKat = e.target.value;
                        const nextKr = [...transaction.kategoriRekening];
                        nextKr[idx] = { ...kr, kategori: newKat };
                        const nextItems = transaction.items.map((it) =>
                          it.kategori === oldKat ? { ...it, kategori: newKat } : it
                        );
                        onChange({
                          ...transaction,
                          kategoriRekening: nextKr,
                          items: nextItems,
                        });
                      }}
                      className="w-full px-2 py-1 text-xs font-medium bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-slate-500">
                      Uraian Rekening
                    </label>
                    <input
                      type="text"
                      value={kr.namaRekening}
                      onChange={(e) => {
                        const nextKr = [...transaction.kategoriRekening];
                        nextKr[idx] = { ...kr, namaRekening: e.target.value };
                        onChange({ ...transaction, kategoriRekening: nextKr });
                      }}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-slate-500">
                      Kode Rekening
                    </label>
                    <input
                      type="text"
                      value={kr.kodeRekening}
                      onChange={(e) => {
                        const nextKr = [...transaction.kategoriRekening];
                        nextKr[idx] = { ...kr, kodeRekening: e.target.value };
                        onChange({ ...transaction, kategoriRekening: nextKr });
                      }}
                      className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pt-3">
                    {transaction.kategoriRekening.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...transaction,
                            kategoriRekening: transaction.kategoriRekening.filter(
                              (x) => x.id !== kr.id
                            ),
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          STEP 2: TABEL DINAMIS ITEM BARANG, SURVEI 2 TOKO & HARGA KONTRAK SP
      ===================================================================== */}
      {activeSubTab === 'barang' && (() => {
        const activeCategories = new Set(
          transaction.kategoriRekening.map((k) => k.kategori)
        );
        const orphanItems = transaction.items.filter(
          (it) => !activeCategories.has(it.kategori)
        );

        const renderItemCard = (item: ProcurementItem, index: number) => {
          const isExpanded = !!expandedItems[item.id];
          const effectiveVol = getItemEffectiveVolume(item);
          const subtotalPagu = Math.round(effectiveVol * item.hargaPaguSatuan);
          const subtotalPenetapan = Math.round(
            effectiveVol * item.hargaPenetapanSatuan
          );
          const ppnPersenItem = transaction.kontrak?.ppnPersen ?? 11;
          const ppnDivItem = 1 + ppnPersenItem / 100;
          const hargaKontrakDpp =
            typeof item.hargaKontrakSatuan === 'number' &&
            item.hargaKontrakSatuan > 0
              ? item.hargaKontrakSatuan
              : ppnPersenItem > 0
              ? Number((item.hargaPenetapanSatuan / ppnDivItem).toFixed(2))
              : item.hargaPenetapanSatuan;
          const hargaKontrakInc =
            typeof item.hargaKontrakTermasukPajak === 'number' &&
            item.hargaKontrakTermasukPajak > 0
              ? item.hargaKontrakTermasukPajak
              : ppnPersenItem > 0
              ? Number((hargaKontrakDpp * ppnDivItem).toFixed(2))
              : hargaKontrakDpp;
          const subtotalKontrakDpp = Number(
            (
              effectiveVol * hargaKontrakDpp +
              (item.ongkosKirimKontrak || 0)
            ).toFixed(2)
          );
          const subtotalKontrakInc =
            Math.round(effectiveVol * hargaKontrakInc) +
            (item.ongkosKirimKontrak || 0);
          const s1Total = getItemSurveyTotal(
            item.toko1.hargaSatuan,
            effectiveVol,
            item.toko1.jumlahOverride
          );
          const s2Total = getItemSurveyTotal(
            item.toko2.hargaSatuan,
            effectiveVol,
            item.toko2.jumlahOverride
          );

          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition hover:border-indigo-300"
            >
                  {/* Main Item Card */}
                  <div className="p-3 bg-slate-50/60 border-b border-slate-100 space-y-2.5">
                    {/* Baris 1: No, Kategori, Subtotal Badges (Pagu, HPS, Kontrak) & Aksi */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">
                          {index + 1}
                        </span>
                        <select
                          value={item.kategori}
                          onChange={(e) =>
                            updateItem(item.id, (it) => ({
                              ...it,
                              kategori: e.target.value,
                            }))
                          }
                          className="max-w-[280px] px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 border border-slate-200 rounded-lg focus:outline-none"
                        >
                          {transaction.kategoriRekening.map((kr) => (
                            <option key={kr.id} value={kr.kategori}>
                              {kr.kodeRekening ? `${kr.kodeRekening} — ` : ''}{kr.namaRekening || kr.kategori}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                          Pagu: {formatRupiahDoc(subtotalPagu)}
                        </span>
                        <span className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          HPS: {formatRupiahDoc(subtotalPenetapan)}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Kontrak: {formatRupiahDoc(subtotalKontrakInc)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                            isExpanded
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Store className="w-3.5 h-3.5" />
                          <span>Survei</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          title="Duplikat"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Baris 2: Nama Barang / Jasa (Leluasa & Jelas) */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Barang / Pekerjaan / Jasa
                      </label>
                      <input
                        type="text"
                        value={item.namaBarang}
                        onChange={(e) =>
                          updateItem(item.id, (it) => ({
                            ...it,
                            namaBarang: e.target.value,
                          }))
                        }
                        placeholder="Contoh: Herbisida / Pupuk Urea / Jasa Pemeliharaan..."
                        className="w-full px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    {/* Baris 3: Volume & Satuan Kuantitas (Besar, Jelas, Rapi & Terbaca) */}
                    <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200/90 shadow-2xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          Volume &amp; Satuan Kuantitas
                        </span>
                        <div
                          className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md truncate shadow-2xs"
                          title={`Teks di dokumen: ${formatItemVolumeSatuan(item)}`}
                        >
                          <span className="text-slate-500 font-normal mr-1">Teks Dokumen:</span>
                          <span className="text-indigo-900">{formatItemVolumeSatuan(item)}</span>
                          {item.volumeTambahan && item.volumeTambahan > 0 ? (
                            <span className="text-emerald-700 ml-1.5 font-semibold">
                              (Pengali: {getItemEffectiveVolume(item)})
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Volume
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.volume}
                            onChange={(e) =>
                              updateItem(item.id, (it) => ({
                                ...it,
                                volume: Math.max(0, Number(e.target.value)),
                              }))
                            }
                            placeholder="Contoh: 10"
                            className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Satuan
                          </label>
                          <input
                            type="text"
                            list={`satuan-list-${item.id}`}
                            value={item.satuan}
                            onChange={(e) =>
                              updateItem(item.id, (it) => ({
                                ...it,
                                satuan: e.target.value,
                              }))
                            }
                            placeholder="Contoh: Liter, Kg, Bulan..."
                            className="w-full px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                          />
                          <datalist id={`satuan-list-${item.id}`}>
                            {SATUAN_OPTIONS.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        </div>

                        <div className="hidden sm:flex sm:col-span-1 justify-center items-center pt-5 text-slate-400 font-extrabold text-base select-none">
                          ×
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">
                            Vol. Tambahan
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.volumeTambahan ?? ''}
                            onChange={(e) => {
                              const val =
                                e.target.value === '' ? null : Number(e.target.value);
                              updateItem(item.id, (it) => ({
                                ...it,
                                volumeTambahan: val,
                              }));
                            }}
                            placeholder="Opsional (e.g. 3)"
                            className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold text-indigo-950 bg-indigo-50/50 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">
                            Satuan Tambahan
                          </label>
                          <input
                            type="text"
                            list={`satuan-tambahan-list-${item.id}`}
                            value={item.satuanTambahan ?? ''}
                            onChange={(e) =>
                              updateItem(item.id, (it) => ({
                                ...it,
                                satuanTambahan: e.target.value,
                              }))
                            }
                            placeholder="Opsional (e.g. Orang)"
                            className="w-full px-3 py-1.5 text-xs sm:text-sm font-semibold text-indigo-950 bg-indigo-50/50 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                          />
                          <datalist id={`satuan-tambahan-list-${item.id}`}>
                            {SATUAN_OPTIONS.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    </div>

                    {/* Baris 3: 4 Kolom Input Harga Satuan Manual (Pagu, HPS, Kontrak +Pajak, Harga Asli DPP) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* 1. Harga Pagu */}
                      <div className="bg-sky-50/60 border border-sky-200 rounded-lg p-2">
                        <label className="block text-[10px] font-bold text-sky-800 mb-0.5">
                          1. Harga Pagu (Rp)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.hargaPaguSatuan}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateItem(item.id, (it) => ({
                              ...it,
                              hargaPaguSatuan: val,
                            }));
                          }}
                          className="w-full px-2 py-1 text-xs font-bold bg-white border border-sky-200 rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* 2. Harga HPS */}
                      <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-2">
                        <label className="block text-[10px] font-bold text-indigo-800 mb-0.5">
                          2. Harga HPS (Rp)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.hargaPenetapanSatuan}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateItem(item.id, (it) => ({
                              ...it,
                              modePenetapan: 'manual',
                              hargaPenetapanSatuan: val,
                            }));
                          }}
                          className="w-full px-2 py-1 text-xs font-bold bg-white border border-indigo-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* 3. Harga Kontrak (+Pajak) - Ketik Manual */}
                      <div className="bg-emerald-50/70 border border-emerald-300 rounded-lg p-2">
                        <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">
                          3. Harga Kontrak +Pajak (Rp)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={hargaKontrakInc}
                          onChange={(e) => {
                            const valInc = Number(e.target.value) || 0;
                            const valDpp =
                              ppnPersenItem > 0
                                ? Number((valInc / ppnDivItem).toFixed(2))
                                : valInc;
                            updateItem(item.id, (it) => ({
                              ...it,
                              hargaKontrakTermasukPajak: valInc,
                              hargaKontrakSatuan: valDpp,
                            }));
                          }}
                          className="w-full px-2 py-1 text-xs font-bold text-emerald-950 bg-white border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* 4. Harga Asli Kontrak / Sebelum Pajak (DPP) - Ketik Manual */}
                      <div className="bg-slate-100/80 border border-slate-300 rounded-lg p-2">
                        <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                          4. Harga Asli / DPP (Rp)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={hargaKontrakDpp}
                          onChange={(e) => {
                            const valDpp = Number(e.target.value) || 0;
                            const valInc =
                              ppnPersenItem > 0
                                ? Number((valDpp * ppnDivItem).toFixed(2))
                                : valDpp;
                            updateItem(item.id, (it) => ({
                              ...it,
                              hargaKontrakSatuan: valDpp,
                              hargaKontrakTermasukPajak: valInc,
                            }));
                          }}
                          className="w-full px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section: Data Survei Toko 1 & Toko 2 */}
                  {isExpanded && (
                    <div className="p-3.5 bg-white space-y-3">
                      {/* Quick Price Selection Pills */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80">
                        <div className="text-slate-600 font-medium">
                          Pilih Cepat Harga HPS:
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(
                            [
                              { id: 'pagu', label: 'Sama dgn Pagu' },
                              { id: 'terendah', label: 'Terendah' },
                              { id: 'rata2', label: 'Rata-rata Survei' },
                              { id: 'manual', label: 'Manual' },
                            ] as const
                          ).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() =>
                                updateItem(item.id, (it) =>
                                  applyPriceSelectionMode(it, m.id)
                                )
                              }
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                                item.modePenetapan === m.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Two-column Survey Cards (Toko 1 & Toko 2) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* TOKO 1 */}
                        <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                            <span className="text-xs font-bold text-blue-900">
                              SURVEI TOKO 1 ({index + 1}.a)
                            </span>
                            <span className="text-[11px] font-semibold text-blue-700">
                              Total: {formatRupiahDoc(s1Total)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-medium text-slate-600">
                                Nama Toko 1
                              </label>
                              <input
                                type="text"
                                value={item.toko1.namaToko}
                                onChange={(e) =>
                                  updateItem(item.id, (it) => ({
                                    ...it,
                                    toko1: { ...it.toko1, namaToko: e.target.value },
                                  }))
                                }
                                className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-600">
                                Harga Survei 1 (Rp)
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={item.toko1.hargaSatuan}
                                onChange={(e) =>
                                  updateItem(item.id, (it) => ({
                                    ...it,
                                    toko1: {
                                      ...it.toko1,
                                      hargaSatuan: Number(e.target.value) || 0,
                                      jumlahOverride: null,
                                    },
                                  }))
                                }
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-600">
                                Tgl Survei 1
                              </label>
                              <input
                                type="date"
                                value={item.toko1.tanggalSurvei}
                                onChange={(e) =>
                                  updateItem(item.id, (it) => ({
                                    ...it,
                                    toko1: {
                                      ...it.toko1,
                                      tanggalSurvei: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-medium text-slate-600">
                                Link Katalog Toko 1
                              </label>
                              <div className="flex gap-1">
                                <input
                                  type="url"
                                  value={item.toko1.link}
                                  onChange={(e) =>
                                    updateItem(item.id, (it) => ({
                                      ...it,
                                      toko1: { ...it.toko1, link: e.target.value },
                                    }))
                                  }
                                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                                />
                                {item.toko1.link && (
                                  <a
                                    href={item.toko1.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-blue-50"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                              {item.toko1.gambarUrl ? (
                                <img
                                  src={item.toko1.gambarUrl}
                                  alt="Preview Toko 1"
                                  className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                              <div className="flex-1 space-y-1">
                                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
                                  <Upload className="w-3 h-3" />
                                  Upload Foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleSurveyImageUpload(item.id, 'toko1', e)
                                    }
                                  />
                                </label>
                                {item.toko1.gambarUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItem(item.id, (it) => ({
                                        ...it,
                                        toko1: { ...it.toko1, gambarUrl: '' },
                                      }))
                                    }
                                    className="block text-[10px] text-rose-600 hover:underline"
                                  >
                                    Hapus Gambar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TOKO 2 */}
                        <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                            <span className="text-xs font-bold text-purple-900">
                              SURVEI TOKO 2 ({index + 1}.b)
                            </span>
                            <span className="text-[11px] font-semibold text-purple-700">
                              Total: {formatRupiahDoc(s2Total)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-medium text-slate-600">
                                Nama Toko 2
                              </label>
                              <input
                                type="text"
                                value={item.toko2.namaToko}
                                onChange={(e) =>
                                  updateItem(item.id, (it) => ({
                                    ...it,
                                    toko2: { ...it.toko2, namaToko: e.target.value },
                                  }))
                                }
                                className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-600">
                                Harga Survei 2 (Rp)
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={item.toko2.hargaSatuan}
                                onChange={(e) =>
                                  updateItem(item.id, (it) => ({
                                    ...it,
                                    toko2: {
                                      ...it.toko2,
                                      hargaSatuan: Number(e.target.value) || 0,
                                      jumlahOverride: null,
                                    },
                                  }))
                                }
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-600">
                                Tgl Survei 2
                              </label>
                              <input
                                type="date"
                                value={item.toko2.tanggalSurvei}
                                onChange={(e) =>
                                  updateItem(item.id, (it) => ({
                                    ...it,
                                    toko2: {
                                      ...it.toko2,
                                      tanggalSurvei: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-medium text-slate-600">
                                Link Katalog Toko 2
                              </label>
                              <div className="flex gap-1">
                                <input
                                  type="url"
                                  value={item.toko2.link}
                                  onChange={(e) =>
                                    updateItem(item.id, (it) => ({
                                      ...it,
                                      toko2: { ...it.toko2, link: e.target.value },
                                    }))
                                  }
                                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                                />
                                {item.toko2.link && (
                                  <a
                                    href={item.toko2.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-purple-600 bg-white border border-slate-200 rounded-lg hover:bg-purple-50"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                              {item.toko2.gambarUrl ? (
                                <img
                                  src={item.toko2.gambarUrl}
                                  alt="Preview Toko 2"
                                  className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                              <div className="flex-1 space-y-1">
                                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
                                  <Upload className="w-3 h-3" />
                                  Upload Foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleSurveyImageUpload(item.id, 'toko2', e)
                                    }
                                  />
                                </label>
                                {item.toko2.gambarUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateItem(item.id, (it) => ({
                                        ...it,
                                        toko2: { ...it.toko2, gambarUrl: '' },
                                      }))
                                    }
                                    className="block text-[10px] text-rose-600 hover:underline"
                                  >
                                    Hapus Gambar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap justify-between gap-2 pt-1 border-t border-slate-100">
                        <span>
                          Pagu: <b>{formatRupiahDoc(subtotalPagu)}</b> | HPS:{' '}
                          <b>{formatRupiahDoc(subtotalPenetapan)}</b>
                        </span>
                        <span>
                          Survei 1: <b>{formatRupiahDoc(s1Total)}</b> | Survei 2:{' '}
                          <b>{formatRupiahDoc(s2Total)}</b>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          DPP Kontrak: {formatRupiahDec2(subtotalKontrakDpp)} | +Pajak:{' '}
                          {formatRupiahDoc(subtotalKontrakInc)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="space-y-4">
                {/* =====================================================================
                    PENGELOMPOKAN KODE REKENING PENGADAAN (DAPAT LEBIH DARI 1 REKENING)
                ===================================================================== */}
                <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FolderTree className="w-4 h-4 text-indigo-600" />
                        <span>Pengelompokan Kode Rekening Belanja</span>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {transaction.kategoriRekening.length} Rekening
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tentukan kelompok kode rekening sebelum atau saat menambahkan pengadaan barang. Satu paket dapat memuat lebih dari satu kode rekening.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCategoryRekening}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Kode Rekening
                    </button>
                  </div>

                  {/* Cards Daftar Kode Rekening */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {transaction.kategoriRekening.map((kr, idx) => {
                      const itemsInKr = transaction.items.filter(
                        (it) => it.kategori === kr.kategori
                      );
                      const paguInKr = itemsInKr.reduce(
                        (sum, it) =>
                          sum + Math.round(getItemEffectiveVolume(it) * it.hargaPaguSatuan),
                        0
                      );
                      return (
                        <div
                          key={kr.id}
                          className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              Rekening #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                {itemsInKr.length} Barang
                              </span>
                              {transaction.kategoriRekening.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (itemsInKr.length > 0) {
                                      if (
                                        !confirm(
                                          `Rekening ini memiliki ${itemsInKr.length} barang. Pindahkan barang ke rekening pertama dan hapus kelompok ini?`
                                        )
                                      ) {
                                        return;
                                      }
                                      const fallbackKat =
                                        transaction.kategoriRekening.find((x) => x.id !== kr.id)
                                          ?.kategori || '';
                                      onChange({
                                        ...transaction,
                                        kategoriRekening: transaction.kategoriRekening.filter(
                                          (x) => x.id !== kr.id
                                        ),
                                        items: transaction.items.map((it) =>
                                          it.kategori === kr.kategori
                                            ? { ...it, kategori: fallbackKat }
                                            : it
                                        ),
                                      });
                                    } else {
                                      onChange({
                                        ...transaction,
                                        kategoriRekening: transaction.kategoriRekening.filter(
                                          (x) => x.id !== kr.id
                                        ),
                                      });
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="Hapus Rekening"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div>
                              <label className="block text-[9.5px] font-bold text-slate-600 mb-0.5">
                                Kode Rekening
                              </label>
                              <input
                                type="text"
                                value={kr.kodeRekening}
                                onChange={(e) => {
                                  const nextKr = [...transaction.kategoriRekening];
                                  nextKr[idx] = { ...kr, kodeRekening: e.target.value };
                                  onChange({ ...transaction, kategoriRekening: nextKr });
                                }}
                                placeholder="5.1.02.01.01.0038"
                                className="w-full px-2 py-1 text-xs font-mono font-semibold bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[9.5px] font-bold text-slate-600 mb-0.5">
                                Uraian Rekening Belanja
                              </label>
                              <input
                                type="text"
                                value={kr.namaRekening}
                                onChange={(e) => {
                                  const oldKat = kr.kategori;
                                  const newName = e.target.value;
                                  const nextKr = [...transaction.kategoriRekening];
                                  nextKr[idx] = {
                                    ...kr,
                                    namaRekening: newName,
                                    kategori: newName,
                                  };
                                  const nextItems = transaction.items.map((it) =>
                                    it.kategori === oldKat ? { ...it, kategori: newName } : it
                                  );
                                  onChange({
                                    ...transaction,
                                    kategoriRekening: nextKr,
                                    items: nextItems,
                                  });
                                }}
                                placeholder="Belanja Alat/Bahan untuk Kegiatan Kantor..."
                                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="text-[10.5px] font-medium text-slate-600 pt-1.5 border-t border-slate-200/60 flex justify-between items-center">
                            <span>Pagu Rekening:</span>
                            <span className="font-bold text-slate-800">
                              {formatRupiahDoc(paguInKr)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Action Bar Item */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleBatchSyncHPSFromPagu}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                      title="Samakan semua Harga HPS dengan Harga Pagu"
                    >
                      HPS = Pagu
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchSyncKontrakFromHPS}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                      title="Samakan semua Harga Kontrak (+Pajak) dengan Harga HPS"
                    >
                      Kontrak = HPS
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => expandAll(true)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Buka Survei
                    </button>
                    <button
                      type="button"
                      onClick={() => expandAll(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Tutup Survei
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Barang
                    </button>
                  </div>
                </div>

                {/* List of Items Grouped by Kode Rekening */}
                <div className="space-y-4">
                  {transaction.kategoriRekening.map((kr, krIdx) => {
                    const itemsInKr = transaction.items.filter(
                      (it) => it.kategori === kr.kategori
                    );
                    const paguInKr = itemsInKr.reduce(
                      (sum, it) =>
                        sum + Math.round(getItemEffectiveVolume(it) * it.hargaPaguSatuan),
                      0
                    );
                    const penetapanInKr = itemsInKr.reduce(
                      (sum, it) =>
                        sum +
                        Math.round(getItemEffectiveVolume(it) * it.hargaPenetapanSatuan),
                      0
                    );
                    const kontrakInKr = itemsInKr.reduce((sum, it) => {
                      const vol = getItemEffectiveVolume(it);
                      const inc =
                        typeof it.hargaKontrakTermasukPajak === 'number' &&
                        it.hargaKontrakTermasukPajak > 0
                          ? it.hargaKontrakTermasukPajak
                          : it.hargaPenetapanSatuan;
                      return sum + Math.round(vol * inc) + (it.ongkosKirimKontrak || 0);
                    }, 0);

                    return (
                      <div
                        key={kr.id}
                        className="bg-white border-2 border-slate-200/90 rounded-2xl p-3.5 shadow-xs space-y-3"
                      >
                        {/* Header Kelompok Kode Rekening */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-slate-50 to-indigo-50/50 p-2.5 rounded-xl border border-slate-200/70">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold">
                              {krIdx + 1}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200">
                                  {kr.kodeRekening || 'Tanpa Kode'}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                  {kr.namaRekening || kr.kategori}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                              Pagu: {formatRupiahDoc(paguInKr)}
                            </span>
                            <span className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              HPS: {formatRupiahDoc(penetapanInKr)}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              Kontrak: {formatRupiahDoc(kontrakInKr)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddItem(kr.kategori)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer ml-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Barang di Rekening Ini</span>
                            </button>
                          </div>
                        </div>

                        {/* Daftar Barang di kelompok rekening ini */}
                        {itemsInKr.length === 0 ? (
                          <div className="text-center py-6 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="text-xs text-slate-500 mb-2">
                              Belum ada barang di kelompok kode rekening ini.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleAddItem(kr.kategori)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Tambah Barang Pertama
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {itemsInKr.map((item) => {
                              const globalIndex = transaction.items.findIndex(
                                (x) => x.id === item.id
                              );
                              return renderItemCard(
                                item,
                                globalIndex >= 0 ? globalIndex : 0
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Item yang belum terpetakan ke rekening aktif (jika ada) */}
                  {orphanItems.length > 0 && (
                    <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 shadow-xs space-y-3">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <span>
                          Barang Belum Dikelompokkan ({orphanItems.length} Barang)
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {orphanItems.map((item) => {
                          const globalIndex = transaction.items.findIndex(
                            (x) => x.id === item.id
                          );
                          return renderItemCard(
                            item,
                            globalIndex >= 0 ? globalIndex : 0
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddCategoryRekening}
                    className="px-3.5 py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Kelompok Kode Rekening Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="px-3.5 py-2.5 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Barang Baru (Umum)
                  </button>
                </div>
              </div>
            );
          })()}

      {/* =====================================================================
          STEP 3: DATA KONTRAK (SP & SPMK), BAST, RINGKASAN KONTRAK & KUITANSI
      ===================================================================== */}
      {activeSubTab === 'kontrak' && (
        <div className="space-y-4">
          {/* Card A: Identitas Penyedia Pemenang */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                <Building className="w-4 h-4 text-emerald-600" />
                A. Identitas Penyedia
              </div>
              <button
                type="button"
                onClick={() => {
                  const namaToko1 = transaction.items[0]?.toko1.namaToko;
                  if (namaToko1) {
                    updateKontrak({
                      namaPerusahaan: namaToko1.startsWith('CV')
                        ? namaToko1
                        : `CV. ${namaToko1}`,
                    });
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Ambil dari Toko 1
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nama Perusahaan
                </label>
                <input
                  type="text"
                  value={kontrak.namaPerusahaan}
                  onChange={(e) => updateKontrak({ namaPerusahaan: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nama Direktur
                </label>
                <input
                  type="text"
                  value={kontrak.namaDirektur}
                  onChange={(e) => updateKontrak({ namaDirektur: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={kontrak.jabatanDirektur}
                  onChange={(e) => updateKontrak({ jabatanDirektur: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-12">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Alamat Perusahaan
                </label>
                <input
                  type="text"
                  value={kontrak.alamatPerusahaan}
                  onChange={(e) => updateKontrak({ alamatPerusahaan: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nama Bank
                </label>
                <input
                  type="text"
                  value={kontrak.namaBank}
                  onChange={(e) => updateKontrak({ namaBank: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  No. Rekening
                </label>
                <input
                  type="text"
                  value={kontrak.nomorRekeningBank}
                  onChange={(e) => updateKontrak({ nomorRekeningBank: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  NPWP
                </label>
                <input
                  type="text"
                  value={kontrak.npwpPenyedia}
                  onChange={(e) => updateKontrak({ npwpPenyedia: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* Card B: Penomoran & Jadwal Kontrak / BAST */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 border-b border-slate-100 pb-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              B. Nomor &amp; Tanggal Kontrak (SP–BAPP)
            </div>

            {/* Jadwal Pelaksanaan Kontrak / SP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Tgl Mulai (SP &amp; SPMK)
                </label>
                <input
                  type="date"
                  value={kontrak.tanggalMulaiKerja}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateKontrak({
                      tanggalMulaiKerja: val,
                      tanggalSP: val,
                      tanggalSPMK: val,
                    });
                  }}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Tgl Selesai (KPP–BAPP)
                </label>
                <input
                  type="date"
                  value={kontrak.tanggalSelesaiKerja}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateKontrak({
                      tanggalSelesaiKerja: val,
                      tanggalKPP: val,
                      tanggalBAHP: val,
                      tanggalBAST: val,
                      tanggalBAPP: val,
                    });
                  }}
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Masa Kerja (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  value={kontrak.waktuPenyelesaianHari}
                  onChange={(e) =>
                    updateKontrak({
                      waktuPenyelesaianHari: Number(e.target.value) || 5,
                    })
                  }
                  className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Grid 6 Nomor & Tanggal Dokumen Tahap 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">
                  10. Surat Pesanan (SP)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={kontrak.nomorSP}
                    onChange={(e) => updateKontrak({ nomorSP: e.target.value })}
                    className="sm:col-span-7 px-2 py-1 text-xs border border-slate-200 rounded"
                    placeholder="Nomor SP"
                  />
                  <input
                    type="date"
                    value={kontrak.tanggalSP}
                    onChange={(e) => updateKontrak({ tanggalSP: e.target.value })}
                    className="sm:col-span-5 px-2 py-1 text-xs border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">
                  11. Surat Perintah Mulai Kerja (SPMK)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={kontrak.nomorSPMK}
                    onChange={(e) => updateKontrak({ nomorSPMK: e.target.value })}
                    className="sm:col-span-7 px-2 py-1 text-xs border border-slate-200 rounded"
                    placeholder="Nomor SPMK"
                  />
                  <input
                    type="date"
                    value={kontrak.tanggalSPMK}
                    onChange={(e) => updateKontrak({ tanggalSPMK: e.target.value })}
                    className="sm:col-span-5 px-2 py-1 text-xs border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">
                  13. Laporan Kemajuan Pekerjaan (KPP)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={kontrak.nomorKPP}
                    onChange={(e) => updateKontrak({ nomorKPP: e.target.value })}
                    className="sm:col-span-7 px-2 py-1 text-xs border border-slate-200 rounded"
                    placeholder="Nomor KPP"
                  />
                  <input
                    type="date"
                    value={kontrak.tanggalKPP}
                    onChange={(e) => updateKontrak({ tanggalKPP: e.target.value })}
                    className="sm:col-span-5 px-2 py-1 text-xs border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">
                  14. BA Pemeriksaan Hasil Pekerjaan (BAHP)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={kontrak.nomorBAHP}
                    onChange={(e) => updateKontrak({ nomorBAHP: e.target.value })}
                    className="sm:col-span-7 px-2 py-1 text-xs border border-slate-200 rounded"
                    placeholder="Nomor BAHP"
                  />
                  <input
                    type="date"
                    value={kontrak.tanggalBAHP}
                    onChange={(e) => updateKontrak({ tanggalBAHP: e.target.value })}
                    className="sm:col-span-5 px-2 py-1 text-xs border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">
                  15. Berita Acara Serah Terima (BAST)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={kontrak.nomorBAST}
                    onChange={(e) => updateKontrak({ nomorBAST: e.target.value })}
                    className="sm:col-span-7 px-2 py-1 text-xs border border-slate-200 rounded"
                    placeholder="Nomor BAST"
                  />
                  <input
                    type="date"
                    value={kontrak.tanggalBAST}
                    onChange={(e) => updateKontrak({ tanggalBAST: e.target.value })}
                    className="sm:col-span-5 px-2 py-1 text-xs border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">
                  16. BA Persetujuan Pembayaran (BAPP)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={kontrak.nomorBAPP}
                    onChange={(e) => updateKontrak({ nomorBAPP: e.target.value })}
                    className="sm:col-span-7 px-2 py-1 text-xs border border-slate-200 rounded"
                    placeholder="Nomor BAPP"
                  />
                  <input
                    type="date"
                    value={kontrak.tanggalBAPP}
                    onChange={(e) => updateKontrak({ tanggalBAPP: e.target.value })}
                    className="sm:col-span-5 px-2 py-1 text-xs border border-slate-200 rounded"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Card C: Pengaturan Pajak (PPN & PPh) */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 border-b border-slate-100 pb-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              C. Pengaturan PPN &amp; PPh
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* 1. PPN */}
              <div className="sm:col-span-5 p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Tarif PPN (%)</span>
                  <span className="text-xs font-bold text-emerald-700">
                    {formatRupiahDoc(summary.ppnKontrak)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 shrink-0 relative">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.1}
                      value={kontrak.ppnPersen}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const div = 1 + val / 100;
                        const nextItems = transaction.items.map((it) => {
                          const inc =
                            it.hargaKontrakTermasukPajak &&
                            it.hargaKontrakTermasukPajak > 0
                              ? it.hargaKontrakTermasukPajak
                              : it.hargaPenetapanSatuan;
                          return {
                            ...it,
                            hargaKontrakTermasukPajak: inc,
                            hargaKontrakSatuan:
                              val > 0 ? Number((inc / div).toFixed(2)) : inc,
                          };
                        });
                        const nextDpp =
                          val > 0
                            ? Math.round(summary.totalNilaiKontrak / div)
                            : summary.totalNilaiKontrak;
                        const nextPpn = summary.totalNilaiKontrak - nextDpp;
                        const nextPph = Math.round(
                          nextDpp * ((kontrak.pphPersen ?? 1.5) / 100)
                        );
                        onChange({
                          ...transaction,
                          updatedAt: new Date().toISOString(),
                          items: nextItems,
                          kontrak: {
                            ...transaction.kontrak,
                            ppnPersen: val,
                            autoCalcTax: true,
                            potonganPPNText: formatRupiahDoc(nextPpn),
                            potonganPPHText: formatRupiahDoc(nextPph),
                          },
                        });
                      }}
                      className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg pr-5"
                    />
                    <span className="absolute right-2 top-1 text-xs text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[11, 12, 10, 0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          const div = 1 + val / 100;
                          const nextItems = transaction.items.map((it) => {
                            const inc =
                              it.hargaKontrakTermasukPajak &&
                              it.hargaKontrakTermasukPajak > 0
                                ? it.hargaKontrakTermasukPajak
                                : it.hargaPenetapanSatuan;
                            return {
                              ...it,
                              hargaKontrakTermasukPajak: inc,
                              hargaKontrakSatuan:
                                val > 0 ? Number((inc / div).toFixed(2)) : inc,
                            };
                          });
                          const nextDpp =
                            val > 0
                              ? Math.round(summary.totalNilaiKontrak / div)
                              : summary.totalNilaiKontrak;
                          const nextPpn = summary.totalNilaiKontrak - nextDpp;
                          const nextPph = Math.round(
                            nextDpp * ((kontrak.pphPersen ?? 1.5) / 100)
                          );
                          onChange({
                            ...transaction,
                            updatedAt: new Date().toISOString(),
                            items: nextItems,
                            kontrak: {
                              ...transaction.kontrak,
                              ppnPersen: val,
                              autoCalcTax: true,
                              potonganPPNText: formatRupiahDoc(nextPpn),
                              potonganPPHText: formatRupiahDoc(nextPph),
                            },
                          });
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                          kontrak.ppnPersen === val
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. PPh */}
              <div className="sm:col-span-7 p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Jenis &amp; Tarif PPh</span>
                  <span className="text-xs font-bold text-indigo-700">
                    {formatRupiahDoc(summary.pphKontrak)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8">
                    <select
                      value={kontrak.jenisPPh || 'pph22'}
                      onChange={(e) => {
                        const jenis = e.target.value as JenisPPhOption;
                        let defaultPersen = kontrak.pphPersen ?? 1.5;
                        if (jenis === 'pph22') defaultPersen = 1.5;
                        else if (jenis === 'pph22_umkm') defaultPersen = 0.5;
                        else if (jenis === 'pph22_nonnpwp') defaultPersen = 3.0;
                        else if (jenis === 'pph23') defaultPersen = 2.0;
                        else if (jenis === 'pph23_nonnpwp') defaultPersen = 4.0;
                        else if (jenis === 'pph4_2') defaultPersen = 1.75;
                        else if (jenis === 'pph21') defaultPersen = 5.0;
                        else if (jenis === 'bebas') defaultPersen = 0;

                        const newPPh = Math.round(
                          summary.jumlahKontrakSebelumPPN * (defaultPersen / 100)
                        );
                        updateKontrak({
                          jenisPPh: jenis,
                          pphPersen: defaultPersen,
                          autoCalcTax: true,
                          potonganPPHText: formatRupiahDoc(newPPh),
                        });
                      }}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="pph22">PPh Pasal 22 Barang (1,5%)</option>
                      <option value="pph22_umkm">PPh 22 UMKM PP 23/55 (0,5%)</option>
                      <option value="pph22_nonnpwp">PPh Pasal 22 Tanpa NPWP (3,0%)</option>
                      <option value="pph23">PPh Pasal 23 Jasa/Sewa (2,0%)</option>
                      <option value="pph23_nonnpwp">PPh Pasal 23 Tanpa NPWP (4,0%)</option>
                      <option value="pph4_2">PPh Final Ps. 4(2) Konstruksi (1,75%)</option>
                      <option value="pph21">PPh Pasal 21 (5,0%)</option>
                      <option value="bebas">Bebas PPh (0%)</option>
                      <option value="custom">Kustom (%)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-4 relative">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.05}
                      value={kontrak.pphPersen}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newPPh = Math.round(
                          summary.jumlahKontrakSebelumPPN * (val / 100)
                        );
                        updateKontrak({
                          pphPersen: val,
                          autoCalcTax: true,
                          potonganPPHText: formatRupiahDoc(newPPh),
                        });
                      }}
                      className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg pr-5"
                    />
                    <span className="absolute right-2 top-1 text-xs text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Card D: Kuitansi & Surat Tagihan (Dok. 18) */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 border-b border-slate-100 pb-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              D. Kuitansi, Pembayaran &amp; Surat Tagihan (Dok. 17–18)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nomor Kuitansi
                </label>
                <input
                  type="text"
                  value={kontrak.nomorKuitansi}
                  onChange={(e) => updateKontrak({ nomorKuitansi: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Tata Cara Pembayaran
                </label>
                <input
                  type="text"
                  value={kontrak.tataCaraPembayaran}
                  onChange={(e) =>
                    updateKontrak({ tataCaraPembayaran: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="sm:col-span-7">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nomor Invoice / Surat Tagihan
                </label>
                <input
                  type="text"
                  value={kontrak.nomorSuratTagihan}
                  onChange={(e) => updateKontrak({ nomorSuratTagihan: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Tanggal Surat Tagihan
                </label>
                <input
                  type="date"
                  value={kontrak.tanggalSuratTagihan}
                  onChange={(e) =>
                    updateKontrak({ tanggalSuratTagihan: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          STEP 4: NARASI KAK, TKDN & CHECKLIST
      ===================================================================== */}
      {activeSubTab === 'kak_checklist' && (
        <div className="space-y-3">
          {/* Narasi KAK & Prioritas TKDN */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-semibold text-sm text-slate-800">
                Narasi KAK &amp; TKDN (Dok. 4 &amp; 5)
              </div>
              <button
                type="button"
                onClick={handleAutoGenerateKAKFromItems}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Susun Otomatis
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-2 border-b border-slate-100">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nilai TKDN (DPP)
                </label>
                <input
                  type="text"
                  value={transaction.nilaiTKDN}
                  onChange={(e) =>
                    onChange({ ...transaction, nilaiTKDN: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg"
                />
              </div>
              <div className="sm:col-span-9">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Alasan / Keterangan TKDN (DPP)
                </label>
                <input
                  type="text"
                  value={transaction.alasanTKDN}
                  onChange={(e) =>
                    onChange({ ...transaction, alasanTKDN: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  1. Latar Belakang
                </label>
                <textarea
                  rows={4}
                  value={transaction.kakLatarBelakang}
                  onChange={(e) =>
                    onChange({ ...transaction, kakLatarBelakang: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  2.a. Maksud
                </label>
                <textarea
                  rows={2}
                  value={transaction.kakMaksud}
                  onChange={(e) =>
                    onChange({ ...transaction, kakMaksud: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  2.b. Tujuan
                </label>
                <textarea
                  rows={3}
                  value={transaction.kakTujuan}
                  onChange={(e) =>
                    onChange({ ...transaction, kakTujuan: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  3. Target / Sasaran
                </label>
                <input
                  type="text"
                  value={transaction.kakTargetSasaran}
                  onChange={(e) =>
                    onChange({ ...transaction, kakTargetSasaran: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* Checklist Status */}
          <section className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="font-semibold text-sm text-slate-800">
                Checklist Kelengkapan DPP (Dok. 1)
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllChecklist('kosong')}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Kosongkan (☐)
                </button>
                <button
                  type="button"
                  onClick={() => setAllChecklist('ada')}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  Centang Semua (☑)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Jenis Pengadaan
                </label>
                <select
                  value={transaction.checklistJenisPengadaan || ''}
                  onChange={(e) =>
                    onChange({
                      ...transaction,
                      checklistJenisPengadaan:
                        e.target.value as ChecklistJenisPengadaan,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">☐ Kosong</option>
                  <option value="Barang">☑ Barang</option>
                  <option value="Jasa Lainnya">☑ Jasa Lainnya</option>
                  <option value="Pekerjaan Konstruksi">☑ Pekerjaan Konstruksi</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Metode E-Purchasing
                </label>
                <select
                  value={transaction.checklistMetodeEpurchasing || ''}
                  onChange={(e) =>
                    onChange({
                      ...transaction,
                      checklistMetodeEpurchasing:
                        e.target.value as ChecklistMetodeEpurchasing,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">☐ Kosong</option>
                  <option value="Negosiasi">☑ Negosiasi</option>
                  <option value="Mini Kompetisi">☑ Mini Kompetisi</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {[
                {
                  key: '1',
                  label:
                    '1. Surat pengantar/permohonan pelaksanaan E-purchasing kepada Kepala UKPBJ',
                },
                {
                  key: '2',
                  label:
                    '2. Dokumen Perencanaan Pengadaan (Identifikasi Kebutuhan & Formulir)',
                },
                {
                  key: '3',
                  label: '3. RUP/ID RUP sesuai dengan paket yang diajukan',
                },
                {
                  key: '4',
                  label: '4. DPA/dokumen anggaran ketersediaan anggaran',
                },
                {
                  key: '5',
                  label: '5. Spesifikasi Teknis dan gambar (apabila ada)',
                },
                { key: '6', label: '6. HPS' },
                {
                  key: '7',
                  label: '7. Daftar Kuantitas dan Harga/Bill of Quantity (BQ)',
                },
                {
                  key: '8',
                  label: '8. Rancangan kontrak: Surat Pesanan / Surat Perjanjian',
                },
                {
                  key: '9',
                  label: '9. Bukti/hasil penelusuran ketersediaan produk & kategori',
                },
                {
                  key: '10',
                  label: '10. Khusus Pekerjaan Konstruksi (AHSP, RKK, LHR, Kertas Kerja)',
                },
                {
                  key: '11',
                  label: '11. Dokumen pendukung lainnya sesuai Katalog Elektronik',
                },
              ].map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/70"
                >
                  <span className="text-slate-700 truncate pr-2" title={row.label}>
                    {row.label}
                  </span>
                  <select
                    value={transaction.checklistStatus?.[row.key] || 'kosong'}
                    onChange={(e) =>
                      onChange({
                        ...transaction,
                        checklistStatus: {
                          ...transaction.checklistStatus,
                          [row.key]: e.target.value as ChecklistValue,
                        },
                      })
                    }
                    className="px-2 py-0.5 text-[11px] bg-white border border-slate-200 rounded shrink-0"
                  >
                    <option value="kosong">☐ Kosong</option>
                    <option value="ada">☑ Tercentang</option>
                    <option value="tidak_ada">☒ Tidak Ada</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
