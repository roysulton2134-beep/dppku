import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudCheck,
  Database,
  FileDown,
  HardDrive,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
  FileSpreadsheet,
  FolderOpen,
} from 'lucide-react';
import {
  MasterData,
  SavedDraft,
  TransactionData,
} from '../../types/procurement';
import {
  deleteRemoteDraft,
  fetchRemoteDrafts,
  saveRemoteDraft,
} from '../../services/firebase';
import { formatRupiahDoc } from '../../utils/terbilang';
import { computeProcurementSummary } from '../../utils/calculations';

interface RekapPengadaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTransaction: TransactionData;
  currentMaster: MasterData;
  onLoadDraft: (draft: SavedDraft) => void;
  onPrintDraft: (draft: SavedDraft) => void;
  onExportDocxDraft: (draft: SavedDraft) => void;
  onNewBlankPacket: () => void;
  showToast: (msg: string) => void;
}

export const RekapPengadaanModal: React.FC<RekapPengadaanModalProps> = ({
  isOpen,
  onClose,
  currentTransaction,
  currentMaster,
  onLoadDraft,
  onPrintDraft,
  onExportDocxDraft,
  onNewBlankPacket,
  showToast,
}) => {
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [saveTitleInput, setSaveTitleInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load drafts on mount or when modal opens
  const loadDraftsList = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil dari LocalStorage terlebih dahulu (respons instan)
      const localRaw = localStorage.getItem('dpp_dispora_saved_drafts_v1');
      const localList: SavedDraft[] = localRaw ? JSON.parse(localRaw) : [];

      // 2. Ambil dari Firebase Firestore
      try {
        const remoteList = await fetchRemoteDrafts();
        // Gabungkan remote & local (utamakan remote jika id sama)
        const remoteIds = new Set(remoteList.map((x) => x.id));
        const merged = [
          ...remoteList,
          ...localList.filter((x) => !remoteIds.has(x.id)).map((x) => ({ ...x, isOnline: false })),
        ];
        setDrafts(merged);
        localStorage.setItem('dpp_dispora_saved_drafts_v1', JSON.stringify(merged));
      } catch (fbErr) {
        console.warn('Firebase Firestore saat ini menggunakan fallback lokal:', fbErr);
        setDrafts(localList);
      }
    } catch (err) {
      console.error('Error loading drafts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDraftsList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Save Current Transaction
  const handleSaveCurrentTransaction = async () => {
    setIsSaving(true);
    try {
      const summary = computeProcurementSummary(currentTransaction);
      const title =
        saveTitleInput.trim() ||
        `${currentTransaction.kodeRUP || 'DPP'} - ${currentTransaction.namaPaket.slice(0, 50)}`;

      const newDraft: SavedDraft = {
        id: `pengadaan-${Date.now()}`,
        title,
        savedAt: new Date().toISOString(),
        transaction: currentTransaction,
        master: currentMaster,
        nomorDPP: currentTransaction.nomorDPP,
        namaPaket: currentTransaction.namaPaket,
        tahunAnggaran: currentTransaction.tahunAnggaran,
        sumberDana:
          currentTransaction.sumberDanaAPBD ||
          currentTransaction.sumberDanaSuratPermohonan ||
          'APBD',
        totalPagu: summary.totalPagu,
        totalHPS: summary.totalPenetapan,
        totalKontrak: summary.totalNilaiKontrak,
        itemCount: currentTransaction.items.length,
        penyediaNama: currentTransaction.kontrak?.namaPerusahaan || '-',
        isOnline: false,
      };

      // 1. Simpan ke Firebase Firestore
      try {
        await saveRemoteDraft(newDraft);
        newDraft.isOnline = true;
        showToast(`Paket "${title}" berhasil disimpan secara online di Firebase!`);
      } catch (err) {
        console.warn('Gagal simpan ke Firebase Firestore, tersimpan di browser lokal:', err);
        showToast(`Paket "${title}" berhasil disimpan di memori lokal.`);
      }

      // 2. Simpan ke LocalStorage & update state
      const updated = [newDraft, ...drafts.filter((x) => x.id !== newDraft.id)];
      setDrafts(updated);
      localStorage.setItem('dpp_dispora_saved_drafts_v1', JSON.stringify(updated));
      setSaveTitleInput('');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan paket pengadaan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Draft
  const handleDeleteDraft = async (id: string, title: string) => {
    if (!confirm(`Hapus rekapan pengadaan "${title}"?`)) return;

    try {
      await deleteRemoteDraft(id).catch(console.warn);
      const updated = drafts.filter((x) => x.id !== id);
      setDrafts(updated);
      localStorage.setItem('dpp_dispora_saved_drafts_v1', JSON.stringify(updated));
      showToast(`Paket "${title}" telah dihapus.`);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus rekapan.');
    }
  };

  // Sync all local drafts to Firebase
  const handleSyncLocalToFirebase = async () => {
    setIsSyncing(true);
    try {
      let count = 0;
      for (const d of drafts) {
        await saveRemoteDraft({ ...d, isOnline: true });
        count++;
      }
      await loadDraftsList();
      showToast(`Berhasil menyinkronkan ${count} paket pengadaan ke Cloud Firebase!`);
    } catch (err) {
      console.error(err);
      alert('Sinkronisasi ke Firebase mengalami kendala. Periksa izin aturan Firestore.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered drafts
  const filteredDrafts = drafts.filter((d) => {
    const matchYear =
      yearFilter === 'all' || String(d.tahunAnggaran || d.transaction.tahunAnggaran) === yearFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchYear;
    const nameMatch = (d.namaPaket || d.title || d.transaction.namaPaket).toLowerCase().includes(q);
    const rupMatch = (d.transaction.kodeRUP || '').toLowerCase().includes(q);
    const noMatch = (d.nomorDPP || d.transaction.nomorDPP || '').toLowerCase().includes(q);
    const penyediaMatch = (d.penyediaNama || d.transaction.kontrak?.namaPerusahaan || '')
      .toLowerCase()
      .includes(q);
    return matchYear && (nameMatch || rupMatch || noMatch || penyediaMatch);
  });

  // Calculate Aggregates
  const totalPaket = drafts.length;
  const totalPaguSum = drafts.reduce((sum, d) => sum + (d.totalPagu || 0), 0);
  const totalKontrakSum = drafts.reduce((sum, d) => sum + (d.totalKontrak || 0), 0);
  const efisiensiSum = Math.max(0, totalPaguSum - totalKontrakSum);

  const availableYears = Array.from(
    new Set(drafts.map((d) => String(d.tahunAnggaran || d.transaction.tahunAnggaran || '2026')))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Rekapitulasi Paket Pengadaan
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-300" />
                  Cloud Firebase
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simpan, rekap, cetak ulang, atau load kembali data paket pengadaan secara terpusat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Paket Tersimpan
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {totalPaket} <span className="text-xs font-normal text-slate-500">Paket</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Pagu Anggaran
              </div>
              <div className="text-xl font-bold text-sky-800 mt-1">
                {formatRupiahDoc(totalPaguSum)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Nilai Kontrak
              </div>
              <div className="text-xl font-bold text-emerald-800 mt-1">
                {formatRupiahDoc(totalKontrakSum)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Efisiensi / Penghematan
              </div>
              <div className="text-xl font-bold text-indigo-800 mt-1">
                {formatRupiahDoc(efisiensiSum)}
              </div>
            </div>
          </div>

          {/* Form Simpan Paket Aktif */}
          <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Simpan Paket Pengadaan yang Sedang Terbuka ke Dalam Rekap:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveTitleInput}
                  onChange={(e) => setSaveTitleInput(e.target.value)}
                  placeholder={`Nama Pengenal (Default: ${currentTransaction.namaPaket.slice(
                    0,
                    40
                  )}...)`}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveCurrentTransaction}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Paket Ini</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      'Buat paket baru? Pastikan paket yang sedang aktif saat ini telah disimpan di rekap jika Anda masih membutuhkannya.'
                    )
                  ) {
                    onNewBlankPacket();
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Kosongkan formulir untuk menyusun paket pengadaan baru dari nol"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>+ Buat Paket Baru</span>
              </button>

              <button
                type="button"
                disabled={isSyncing || isLoading}
                onClick={handleSyncLocalToFirebase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer disabled:opacity-50"
                title="Upload semua data lokal ke Cloud Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sinkronkan ke Cloud</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama paket, nomor DPP, kode RUP, atau penyedia..."
                className="w-full text-xs bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Tahun:</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Procurements */}
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            {isLoading ? (
              <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs">Memuat daftar rekap pengadaan...</span>
              </div>
            ) : filteredDrafts.length === 0 ? (
              <div className="p-10 text-center">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-700">
                  Belum Ada Rekap Pengadaan yang Tersimpan
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Klik tombol <b>"Simpan Paket Ini"</b> di atas untuk merekap paket pengadaan yang sedang Anda kerjakan agar dapat diakses atau dicetak kapan saja.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3 w-32">Penyimpanan &amp; Waktu</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Paket Pekerjaan</th>
                      <th className="py-2.5 px-3 w-40">Sumber Dana</th>
                      <th className="py-2.5 px-3 text-right w-36">Pagu / HPS</th>
                      <th className="py-2.5 px-3 text-right w-36">Nilai Kontrak</th>
                      <th className="py-2.5 px-3 text-center w-48">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDrafts.map((draft, idx) => {
                      const pagu = draft.totalPagu || 0;
                      const hps = draft.totalHPS || 0;
                      const kontrak = draft.totalKontrak || 0;
                      const penyedia =
                        draft.penyediaNama || draft.transaction.kontrak?.namaPerusahaan || '-';
                      const dateStr = new Date(draft.savedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr
                          key={draft.id}
                          className="hover:bg-slate-50/80 transition group"
                        >
                          <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                            {idx + 1}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="space-y-1">
                              {draft.isOnline ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  <Cloud className="w-3 h-3 text-emerald-600" />
                                  Cloud
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                                  <HardDrive className="w-3 h-3 text-slate-500" />
                                  Lokal
                                </span>
                              )}
                              <div className="text-[10.5px] text-slate-400 leading-tight">
                                {dateStr}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                              {draft.namaPaket || draft.title}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span>No. DPP: {draft.nomorDPP || draft.transaction.nomorDPP}</span>
                              <span>•</span>
                              <span>RUP: {draft.transaction.kodeRUP || '-'}</span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700">
                                {draft.itemCount || draft.transaction.items.length} Barang
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                              {draft.sumberDana || 'APBD'}
                            </span>
                            <div className="text-[10.5px] text-slate-500 mt-0.5">
                              TA {draft.tahunAnggaran || draft.transaction.tahunAnggaran}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="font-bold text-sky-900">
                              {formatRupiahDoc(pagu)}
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              HPS: {formatRupiahDoc(hps)}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="font-bold text-emerald-900">
                              {formatRupiahDoc(kontrak)}
                            </div>
                            <div className="text-[10.5px] text-slate-500 truncate max-w-[140px] ml-auto">
                              {penyedia}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onLoadDraft(draft);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold shadow-2xs transition cursor-pointer"
                                title="Load data ke formulir untuk diedit atau diperbarui"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>Buka</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onPrintDraft(draft)}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                title="Cetak langsung dokumen paket ini"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onExportDocxDraft(draft)}
                                className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer"
                                title="Download Word (.docx) paket ini"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(draft.id, draft.title)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Hapus paket dari rekapan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
