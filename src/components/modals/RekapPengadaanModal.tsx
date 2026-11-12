import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  FileDown,
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  MasterData,
  SavedDraft,
  TransactionData,
} from '../../types/procurement';
import {
  deleteRemoteDraft,
  fetchRemoteDrafts,
  hydrateDraftAssets,
  saveRemoteDraft,
  updateDraftOrderIndex,
} from '../../services/firebase';
import { formatRupiahDoc } from '../../utils/terbilang';
import { computeProcurementSummary } from '../../utils/calculations';

interface RekapPengadaanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTransaction: TransactionData;
  currentMaster: MasterData;
  activeDraftId: string | null;
  setActiveDraftId: (id: string | null) => void;
  onLoadDraft: (draft: SavedDraft) => void;
  onPrintDraft: (draft: SavedDraft) => void;
  onExportDocxDraft: (draft: SavedDraft) => void;
  onNewBlankPacket: () => void;
  showToast: (msg: string) => void;
  onDraftsChange?: (drafts: SavedDraft[]) => void;
}

export const RekapPengadaanModal: React.FC<RekapPengadaanModalProps> = ({
  isOpen,
  onClose,
  currentTransaction,
  currentMaster,
  activeDraftId,
  setActiveDraftId,
  onLoadDraft,
  onPrintDraft,
  onExportDocxDraft,
  onNewBlankPacket,
  showToast,
  onDraftsChange,
}) => {
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [saveTitleInput, setSaveTitleInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper untuk menyimpan ke localStorage & trigger callback sinkronisasi
  const persistDrafts = (newDraftList: SavedDraft[]) => {
    setDrafts(newDraftList);
    try {
      localStorage.setItem('dpp_dispora_saved_drafts_v1', JSON.stringify(newDraftList));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    if (onDraftsChange) {
      onDraftsChange(newDraftList);
    }
  };

  // Helper untuk sorting konsisten (orderIndex ascending, lalu savedAt descending)
  const sortDraftsList = (list: SavedDraft[]): SavedDraft[] => {
    return [...list].sort((a, b) => {
      const orderA = typeof a.orderIndex === 'number' ? a.orderIndex : 999999;
      const orderB = typeof b.orderIndex === 'number' ? b.orderIndex : 999999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime();
    });
  };

  // Load drafts on mount or when modal opens
  const loadDraftsList = async () => {
    // 1. Ambil dari LocalStorage terlebih dahulu (respons instan)
    const localRaw = localStorage.getItem('dpp_dispora_saved_drafts_v1');
    const localList: SavedDraft[] = localRaw ? JSON.parse(localRaw) : [];
    const sortedLocal = sortDraftsList(localList);
    setDrafts(sortedLocal);

    // 2. Ambil dari Firebase Firestore (sinkronisasi online di latar belakang)
    setIsLoading(true);
    try {
      const remoteList = await fetchRemoteDrafts();
      if (remoteList && remoteList.length > 0) {
        // Gabungkan remote & local (utamakan remote jika id sama)
        const remoteIds = new Set(remoteList.map((x) => x.id));
        const merged = [
          ...remoteList,
          ...sortedLocal.filter((x) => !remoteIds.has(x.id)).map((x) => ({ ...x, isOnline: false })),
        ];
        const sortedMerged = sortDraftsList(merged);
        persistDrafts(sortedMerged);
      }
    } catch (fbErr) {
      console.warn('Firebase Firestore saat ini menggunakan fallback lokal:', fbErr);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDraftsList();
    }
  }, [isOpen]);

  // Deteksi apakah paket yang sedang terbuka di formulir sudah pernah tersimpan di daftar rekap
  const matchedExistingDraft = useMemo(() => {
    if (activeDraftId) {
      const byId = drafts.find((d) => d.id === activeDraftId);
      if (byId) return byId;
    }
    const byTxId = drafts.find((d) => d.transaction?.id === currentTransaction.id);
    if (byTxId) return byTxId;

    if (
      currentTransaction.kodeRUP &&
      currentTransaction.kodeRUP.length > 5 &&
      currentTransaction.kodeRUP !== '65070473'
    ) {
      const byRUP = drafts.find((d) => d.transaction?.kodeRUP === currentTransaction.kodeRUP);
      if (byRUP) return byRUP;
    }

    if (
      currentTransaction.nomorDPP &&
      currentTransaction.namaPaket &&
      currentTransaction.namaPaket !== 'Pengadaan Belanja Bahan Baru'
    ) {
      const byNomorAndName = drafts.find(
        (d) =>
          d.nomorDPP === currentTransaction.nomorDPP ||
          (d.namaPaket?.trim().toLowerCase() === currentTransaction.namaPaket.trim().toLowerCase())
      );
      if (byNomorAndName) return byNomorAndName;
    }

    return null;
  }, [drafts, activeDraftId, currentTransaction]);

  if (!isOpen) return null;

  // Handle Save Current Transaction (Update existing or create new)
  const handleSaveCurrentTransaction = async (asNewCopy = false) => {
    setIsSaving(true);
    try {
      const summary = computeProcurementSummary(currentTransaction);
      const isUpdating = !asNewCopy && Boolean(matchedExistingDraft);

      let targetId: string;
      let title: string;

      if (isUpdating && matchedExistingDraft) {
        targetId = matchedExistingDraft.id;
        title =
          saveTitleInput.trim() ||
          matchedExistingDraft.title ||
          `${currentTransaction.kodeRUP || 'DPP'} - ${currentTransaction.namaPaket.slice(0, 50)}`;
      } else {
        targetId = `pengadaan-${Date.now()}`;
        const defaultTitle = `${currentTransaction.kodeRUP || 'DPP'} - ${currentTransaction.namaPaket.slice(0, 50)}`;
        title = saveTitleInput.trim() || (asNewCopy ? `${defaultTitle} (Salinan)` : defaultTitle);
      }

      const draftPayload: SavedDraft = {
        id: targetId,
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

      // 1. Simpan ke LocalStorage & update state (perbarui jika ada, tambah jika baru)
      let updatedList: SavedDraft[];
      if (isUpdating) {
        const existingIdx = drafts.findIndex((d) => d.id === targetId);
        draftPayload.orderIndex =
          matchedExistingDraft?.orderIndex ?? (existingIdx >= 0 ? existingIdx : 0);
        updatedList = drafts.map((d) => (d.id === targetId ? draftPayload : d));
      } else {
        draftPayload.orderIndex = 0;
        const remaining = drafts.filter((d) => d.id !== targetId);
        updatedList = [draftPayload, ...remaining].map((d, idx) => ({
          ...d,
          orderIndex: idx,
        }));
      }
      persistDrafts(updatedList);
      setActiveDraftId(targetId);
      setSaveTitleInput('');

      // 2. Sinkronkan ke Cloud Firebase Firestore
      try {
        await saveRemoteDraft(draftPayload);
        draftPayload.isOnline = true;
        const onlineUpdated = updatedList.map((d) =>
          d.id === targetId ? { ...draftPayload, isOnline: true } : d
        );
        persistDrafts(onlineUpdated);
        if (isUpdating) {
          showToast(`Perubahan data paket "${title}" berhasil diperbarui!`);
        } else {
          showToast(`Paket "${title}" berhasil direkap!`);
        }
      } catch (err) {
        console.warn('Gagal simpan ke server, data tersimpan di perangkat:', err);
        if (isUpdating) {
          showToast(`Perubahan data paket "${title}" berhasil diperbarui!`);
        } else {
          showToast(`Paket "${title}" berhasil disimpan!`);
        }
      }
    } catch (err) {
      console.error('Error saat menyimpan paket:', err);
      alert('Gagal menyimpan paket pengadaan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Bersihkan rekapan ganda / duplikat dari data sebelumnya
  const handleCleanupDuplicates = async () => {
    const seen = new Map<string, SavedDraft>();
    const toDelete: SavedDraft[] = [];

    const sorted = [...drafts].sort(
      (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
    );

    for (const d of sorted) {
      const rup = d.transaction?.kodeRUP?.trim();
      const key =
        rup && rup.length > 5 && rup !== '65070473'
          ? `rup_${rup}`
          : `dpp_${(d.nomorDPP || d.transaction?.nomorDPP || '').trim()}_${(
              d.namaPaket ||
              d.transaction?.namaPaket ||
              ''
            )
              .trim()
              .toLowerCase()}`;

      if (seen.has(key)) {
        toDelete.push(d);
      } else {
        seen.set(key, d);
      }
    }

    if (toDelete.length === 0) {
      alert('Tidak ada paket pengadaan ganda / duplikat yang terdeteksi.');
      return;
    }

    if (
      !confirm(
        `Ditemukan ${toDelete.length} paket pengadaan ganda (versi lama). Hapus versi lama dan pertahankan versi terbaru?`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const deleteIds = new Set(toDelete.map((x) => x.id));
      for (const d of toDelete) {
        await deleteRemoteDraft(d.id).catch(console.warn);
      }
      const cleaned = drafts.filter((d) => !deleteIds.has(d.id));
      persistDrafts(cleaned);
      showToast(`Berhasil membersihkan ${toDelete.length} paket duplikat!`);
    } catch (err) {
      console.error(err);
      alert('Gagal membersihkan duplikat.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete Draft
  const handleDeleteDraft = async (id: string, title: string) => {
    if (!confirm(`Hapus rekapan pengadaan "${title}"?`)) return;

    try {
      deleteRemoteDraft(id).catch(console.warn);
      const updated = drafts.filter((x) => x.id !== id);
      persistDrafts(updated);
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
      showToast(`Berhasil menyinkronkan ${count} paket pengadaan!`);
    } catch (err) {
      console.error(err);
      alert('Sinkronisasi mengalami kendala. Periksa koneksi internet Anda.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pindahkan urutan paket 1 langkah ke atas atau ke bawah
  const handleMoveDraft = async (draftId: string, direction: 'up' | 'down') => {
    const currentFilteredIdx = filteredDrafts.findIndex((d) => d.id === draftId);
    if (currentFilteredIdx === -1) return;

    const targetFilteredIdx = direction === 'up' ? currentFilteredIdx - 1 : currentFilteredIdx + 1;
    if (targetFilteredIdx < 0 || targetFilteredIdx >= filteredDrafts.length) return;

    const targetDraftId = filteredDrafts[targetFilteredIdx].id;

    const currentIdx = drafts.findIndex((d) => d.id === draftId);
    const targetIdx = drafts.findIndex((d) => d.id === targetDraftId);
    if (currentIdx === -1 || targetIdx === -1) return;

    const newDrafts = [...drafts];
    const [movedItem] = newDrafts.splice(currentIdx, 1);
    newDrafts.splice(targetIdx, 0, movedItem);

    const reindexedDrafts = newDrafts.map((d, idx) => ({
      ...d,
      orderIndex: idx,
    }));

    persistDrafts(reindexedDrafts);

    // Sinkronisasi perubahan urutan ke Cloud Firebase di latar belakang
    Promise.all(
      reindexedDrafts.map((d) => updateDraftOrderIndex(d.id, d.orderIndex!))
    ).catch(console.warn);

    showToast(`Urutan paket "${movedItem.namaPaket || movedItem.title}" berhasil diubah.`);
  };

  // Pindahkan urutan paket langsung ke nomor tertentu (1-based)
  const handleSetDraftPosition = async (draftId: string, targetPositionOneBased: number) => {
    const currentIdx = drafts.findIndex((d) => d.id === draftId);
    if (currentIdx === -1) return;
    const targetIndex = Math.max(0, Math.min(drafts.length - 1, targetPositionOneBased - 1));
    if (currentIdx === targetIndex) return;

    const newDrafts = [...drafts];
    const [movedItem] = newDrafts.splice(currentIdx, 1);
    newDrafts.splice(targetIndex, 0, movedItem);

    const reindexedDrafts = newDrafts.map((d, idx) => ({
      ...d,
      orderIndex: idx,
    }));

    persistDrafts(reindexedDrafts);

    Promise.all(
      reindexedDrafts.map((d) => updateDraftOrderIndex(d.id, d.orderIndex!))
    ).catch(console.warn);

    showToast(`Paket "${movedItem.namaPaket || movedItem.title}" dipindahkan ke urutan ke-${targetIndex + 1}.`);
  };

  // Dialog cepat untuk mengubah posisi urutan dengan mengetikkan angka
  const handlePromptChangePosition = (draft: SavedDraft) => {
    const currentIdx = drafts.findIndex((d) => d.id === draft.id);
    if (currentIdx === -1) return;

    const input = prompt(
      `Ubah nomor urut rekap paket:\n"${draft.namaPaket || draft.title}"\n\nMasukkan nomor urut tujuan (1 s.d. ${drafts.length}):`,
      String(currentIdx + 1)
    );
    if (!input) return;

    const targetNum = parseInt(input.trim(), 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > drafts.length) {
      alert(`Nomor urut tidak valid. Harap masukkan angka antara 1 sampai ${drafts.length}.`);
      return;
    }

    handleSetDraftPosition(draft.id, targetNum);
  };

  // Reset urutan berdasarkan tanggal simpan terbaru
  const handleResetToDateOrder = () => {
    if (!confirm('Urutkan ulang seluruh daftar rekap berdasarkan tanggal simpan terbaru?')) return;
    const sorted = [...drafts].sort(
      (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
    );
    const reindexed = sorted.map((d, idx) => ({ ...d, orderIndex: idx }));
    persistDrafts(reindexed);
    Promise.all(reindexed.map((d) => updateDraftOrderIndex(d.id, d.orderIndex!))).catch(console.warn);
    showToast('Urutan rekap telah diatur ulang berdasarkan tanggal terbaru.');
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
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  Rekapitulasi Paket Pengadaan
                </h2>
                <p className="text-xs text-slate-400">
                  Simpan, cetak ulang, atau muat kembali data paket pengadaan
                </p>
              </div>
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
          <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {matchedExistingDraft ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Mode Perbarui Paket (Update)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Mode Paket Baru
                  </span>
                )}
                {matchedExistingDraft && (
                  <span className="text-xs text-slate-500">
                    Mengedit data: <strong className="text-slate-800">{matchedExistingDraft.title || matchedExistingDraft.namaPaket}</strong>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Kosongkan formulir untuk menyusun paket pengadaan baru dari nol"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ Buat Paket Baru</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncing || isLoading}
                  onClick={handleSyncLocalToFirebase}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer disabled:opacity-50"
                  title="Sinkronkan semua data rekap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sinkronkan</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading || isSyncing}
                  onClick={handleCleanupDuplicates}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer disabled:opacity-50"
                  title="Deteksi dan bersihkan rekapan paket yang dobel/duplikat"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Bersihkan Duplikat</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={saveTitleInput}
                onChange={(e) => setSaveTitleInput(e.target.value)}
                placeholder={
                  matchedExistingDraft
                    ? `Perbarui judul: ${matchedExistingDraft.title}`
                    : `Nama Pengenal (Default: ${currentTransaction.namaPaket.slice(0, 40)}...)`
                }
                className="flex-1 min-w-[260px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              {matchedExistingDraft ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveCurrentTransaction(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                    title="Perbarui data rekapan yang sudah ada (tidak membuat paket ganda)"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Perbarui Data Paket</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveCurrentTransaction(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer disabled:opacity-50"
                    title="Simpan sebagai paket baru / salinan terpisah"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan Salinan Baru</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveCurrentTransaction(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                  title="Simpan paket baru ke dalam rekapan"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Paket Ini</span>
                </button>
              )}
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

              <button
                type="button"
                onClick={handleResetToDateOrder}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg transition cursor-pointer"
                title="Urutkan ulang seluruh rekap berdasarkan tanggal simpan terbaru"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Urutkan Tanggal</span>
              </button>
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
                  Belum Ada Data Tersimpan
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Klik <b>"Simpan Paket Ini"</b> di atas untuk menyimpan data paket.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-2.5 px-2 text-center w-14" title="Urutan baris rekap">Urutan</th>
                      <th className="py-2.5 px-3 w-32">Tanggal Simpan</th>
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
                          <td className="py-2 px-1 text-center select-none">
                            <div className="flex flex-col items-center justify-center">
                              <button
                                type="button"
                                disabled={filteredDrafts.findIndex((d) => d.id === draft.id) === 0}
                                onClick={() => handleMoveDraft(draft.id, 'up')}
                                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition"
                                title="Naikkan urutan (Pindah ke atas)"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePromptChangePosition(draft)}
                                className="px-1.5 py-0.5 my-0.5 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer border border-transparent hover:border-indigo-200"
                                title="Klik untuk ubah nomor urut langsung"
                              >
                                {idx + 1}
                              </button>
                              <button
                                type="button"
                                disabled={
                                  filteredDrafts.findIndex((d) => d.id === draft.id) ===
                                  filteredDrafts.length - 1
                                }
                                onClick={() => handleMoveDraft(draft.id, 'down')}
                                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition"
                                title="Turunkan urutan (Pindah ke bawah)"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="text-[11px] text-slate-500 leading-tight">
                              {dateStr}
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
                                onClick={async () => {
                                  const fullDraft = await hydrateDraftAssets(draft);
                                  setActiveDraftId(draft.id);
                                  onLoadDraft(fullDraft);
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
                                onClick={async () => {
                                      const fullDraft = await hydrateDraftAssets(draft);
                                      onPrintDraft(fullDraft);
                                    }}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                title="Cetak langsung dokumen paket ini"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                      const fullDraft = await hydrateDraftAssets(draft);
                                      onExportDocxDraft(fullDraft);
                                    }}
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
