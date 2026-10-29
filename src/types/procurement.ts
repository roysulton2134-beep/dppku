export interface SurveyStoreData {
  namaToko: string;
  hargaSatuan: number;
  /** Optional manual override for total when survey total in catalog has rounding differences */
  jumlahOverride?: number | null;
  tanggalSurvei: string; // YYYY-MM-DD
  link: string;
  gambarUrl: string;
}

export type PriceSelectionMode = 'pagu' | 'terendah' | 'rata2' | 'manual';

export interface ProcurementItem {
  id: string;
  kategori: string;
  namaBarang: string;
  keteranganSpesifikasi: string;
  volume: number;
  satuan: string;
  /** Volume tambahan opsional untuk satuan bertingkat (misal: 2 Bulan x 3 Orang => volume: 2, satuan: "Bulan", volumeTambahan: 3, satuanTambahan: "Orang") */
  volumeTambahan?: number | null;
  /** Satuan tambahan opsional (misal: "Orang") */
  satuanTambahan?: string;
  hargaPaguSatuan: number;
  toko1: SurveyStoreData;
  toko2: SurveyStoreData;
  hargaPenetapanSatuan: number;
  modePenetapan: PriceSelectionMode;
  /** Harga satuan negosiasi/kontrak pada Surat Pesanan (sebelum PPN / Harga Asli DPP) */
  hargaKontrakSatuan: number;
  /** Harga satuan negosiasi/kontrak sudah termasuk pajak (PPN) - diinput manual / tersinkron otomatis dengan hargaKontrakSatuan */
  hargaKontrakTermasukPajak?: number;
  /** Harga kirim per produk pada Surat Pesanan (default 0) */
  ongkosKirimKontrak?: number;
}

export interface CategoryAccount {
  id: string;
  kategori: string;
  namaRekening: string;
  kodeRekening: string;
}

export interface MasterData {
  kopMode: 'banner' | 'dynamic';
  logoUrl: string;
  bannerKopUrl: string;
  pemkabName: string;
  dinasName: string;
  alamat: string;
  telepon: string;
  website: string;
  email: string;
  kodePos: string;
  kotaPenetapan: string;
  lokasiDefaultSingkat: string;
  organisasiKLDI: string;
  organisasiSKPD: string;

  /** PPK pada Tahap 1 (Dokumen Persiapan Pengadaan) */
  ppk: {
    jabatanPrefix: string; // e.g., "Plt."
    jabatan: string; // e.g., "Kepala Dinas Pemuda dan Olahraga"
    nama: string;
    pangkat: string;
    nip: string;
    selaku: string; // e.g., "Pejabat Pembuat Komitmen Dinas Pemuda dan Olahraga"
  };

  /** Pengguna Anggaran / PPK pada Tahap 2 (SP, SPMK, BAST, BAPP, Ringkasan Kontrak, Kuitansi) */
  penggunaAnggaran: {
    jabatanPrefix: string;
    jabatan: string;
    nama: string;
    pangkat: string;
    nip: string;
    alamatKantor: string;
  };

  /** Pejabat Pengadaan (Penerima Surat Permohonan & Surat Tugas) */
  pejabatPengadaan: {
    nama: string;
    nip: string;
    jabatanSingkat: string;
    jabatanLengkap: string;
    instansiTujuan: string;
    kotaTujuan: string;
  };

  /** Kabid Sarpras / PPTK (Checklist, KPP, BAHP, BAPP, Ringkasan Kontrak, Kuitansi) */
  kabid: {
    jabatan: string;
    dinas: string;
    nama: string;
    pangkat: string;
    nip: string;
  };

  /** Pejabat Penatausahaan Keuangan / PPK SKPD (Ringkasan Kontrak & Kuitansi) */
  ppkKeuangan: {
    nama: string;
    pangkat: string;
    nip: string;
  };

  /** Bendahara Pengeluaran (Kuitansi) */
  bendahara: {
    nama: string;
    nip: string;
  };

  dasarHukum: string[];

  suratPersetujuanPP: {
    nomor: string;
    tanggalTeks: string;
  };

  tembusan: {
    jabatan: string;
    instansi: string;
  };

  kodeProgramDefault: string;
  programDefault: string;
  kodeKegiatanDefault: string;
  kegiatanDefault: string;
  kodeSubKegiatanDefault: string;
  subKegiatanDefault: string;
  lokasiPekerjaanNama: string;
  lokasiPekerjaanAlamat: string;
}

export type ChecklistValue = 'kosong' | 'ada' | 'tidak_ada';

export type ChecklistJenisPengadaan =
  | ''
  | 'Barang'
  | 'Jasa Lainnya'
  | 'Pekerjaan Konstruksi';

export type ChecklistMetodeEpurchasing = '' | 'Negosiasi' | 'Mini Kompetisi';

export type SuratPermohonanTableMode = 'per_item' | 'per_paket' | 'per_kategori';

export type JenisPPhOption =
  | 'pph22'
  | 'pph22_umkm'
  | 'pph22_nonnpwp'
  | 'pph23'
  | 'pph23_nonnpwp'
  | 'pph4_2'
  | 'pph21'
  | 'bebas'
  | 'custom';

export interface ContractExecutionData {
  // Penyedia Pemenang / Pelaksana Kontrak
  namaPerusahaan: string; // e.g. "CV. Berkah Mandiri Solusindo"
  namaDirektur: string; // e.g. "Ahmad Junaedi"
  jabatanDirektur: string; // e.g. "Direktur"
  alamatPerusahaan: string; // e.g. "Jl. Abdul Razak rt. 11 rw. 03, Desa Pagak Kecamatan Pagak"
  namaBank: string;
  nomorRekeningBank: string; // e.g. "0041102802"
  npwpPenyedia: string; // e.g. "0415669233654000"

  // Surat Pesanan (SP) & SPMK
  nomorSP: string; // e.g. "00.3.2/01-SP/35.07.318/2026"
  tanggalSP: string; // e.g. "2026-03-12"
  nomorSPMK: string; // e.g. "00.3.2/01-SPMK/35.07.318/2026"
  tanggalSPMK: string; // e.g. "2026-03-12"
  tanggalMulaiKerja: string; // e.g. "2026-03-12"
  tanggalSelesaiKerja: string; // e.g. "2026-03-17"
  waktuPenyelesaianHari: number; // e.g. 5
  ppnPersen: number; // default 11 (bisa 11, 12, 10, 0, dsb)
  jenisPPh?: JenisPPhOption;
  pphPersen?: number; // default 1.5 (PPh 22) atau 2 (PPh 23), dsb
  autoCalcTax?: boolean; // kalkulasi otomatis potongan PPN dan PPh ke Ringkasan Kontrak & Kuitansi

  // KPP, BAHP, BAST, BAPP
  nomorKPP: string; // e.g. "00.3.2/01-KPP/35.07.318/2026"
  tanggalKPP: string; // e.g. "2026-03-17"
  nomorBAHP: string; // e.g. "00.3.2/01-BAHP/35.07.318/2026"
  tanggalBAHP: string; // e.g. "2026-03-17"
  nomorBAST: string; // e.g. "00.3.2/01-BAST/35.07.318/2026"
  tanggalBAST: string; // e.g. "2026-03-17"
  nomorBAPP: string; // e.g. "00.3.2/01-BAPP/35.07.318/2026"
  tanggalBAPP: string; // e.g. "2026-03-17"

  // DPA, Ringkasan Kontrak & Kuitansi
  nomorDPA: string;
  tanggalDPA: string;
  kodeProgram: string; // e.g. "2.19.03"
  kodeKegiatan: string; // e.g. "2.19.03.2.01"
  kodeSubKegiatan: string; // e.g. "2.19.03.2.01.05"
  uraianVolumeRingkasan: string;
  tataCaraPembayaran: string; // e.g. "Sekaligus"
  potonganPPNText: string;
  potonganPPHText: string;

  // Kuitansi & Tagihan
  nomorKuitansi: string; // e.g. "35.07/02.0/000000/LS/2.19.0.00.19.0.00.0000/PR/11/2026"
  kodeRekeningKuitansi: string; // e.g. "5.2.02.05.02.0003"
  tahunKuitansiLabel: string; // e.g. "2026"
  nomorSuratTagihan: string; // e.g. "12/Term-BMS/III/2026"
  tanggalSuratTagihan: string; // e.g. "2026-03-16"
}

export interface TransactionData {
  id: string;
  updatedAt: string;
  namaPaket: string;

  // Penomoran & Tanggal Tahap 1 (DPP)
  nomorSuratPermohonan: string;
  sifatSuratPermohonan: string;
  lampiranSuratPermohonan: string;
  perihalSuratPermohonan: string;
  tanggalSuratPermohonan: string; // YYYY-MM-DD
  formatTanggalPermohonan: 'lengkap' | 'bulan_tahun';
  jenisDokumenAnggaranPermohonan?: string; // e.g. "DPPA" or "DPA"
  nomorDPAPermohonan?: string; // e.g. "DPPA/A.3/2.19.0.00.0.00.19.0000/001/2026"
  tanggalDPAPermohonan?: string; // e.g. "19 Oktober Tahun 2026"
  sumberDanaTabelPermohonan?: string; // e.g. "SILPA" / "PAD"
  modeTabelPermohonan?: SuratPermohonanTableMode;

  nomorSuratTugas: string;
  tanggalSuratTugas: string; // YYYY-MM-DD
  formatTanggalSuratTugas: 'lengkap' | 'bulan_tahun';
  metodePengadaan: string;

  nomorDPP: string;
  tanggalDPP: string; // YYYY-MM-DD
  kodeRUP: string;

  tanggalMulaiPelaksanaan: string; // YYYY-MM-DD
  tanggalSelesaiPelaksanaan: string; // YYYY-MM-DD
  jangkaWaktuHari: number;

  // Anggaran & Sumber Dana
  sumberDanaAPBD?: string; // e.g. "APBD" atau "APBD-P" (digunakan pada RAB)
  sumberDanaSuratPermohonan: string; // e.g. "PAD"
  sumberDanaKAK: string; // e.g. "Pendapatan Asli Daerah Kabupaten Malang Tahun Anggaran 2026"
  sumberDanaRAB: string; // e.g. "Pendapatan Asli Daerah" (digunakan pada KAK & Ringkasan Kontrak)
  sumberDanaSingkatKuitansi: string; // e.g. "PAD"
  tahunAnggaran: string; // e.g. "2026"

  // Kegiatan & Lokasi
  program: string;
  kegiatan: string;
  subKegiatan: string;
  lokasiNama: string;
  lokasiAlamat: string;

  // Klausul DPP & KAK
  nilaiTKDN: string;
  alasanTKDN: string;
  kakLatarBelakang: string;
  kakPermasalahan: string;
  kakMaksud: string;
  kakTujuan: string;
  kakTargetSasaran: string;

  // Checklist status per item key
  checklistJenisPengadaan?: ChecklistJenisPengadaan;
  checklistMetodeEpurchasing?: ChecklistMetodeEpurchasing;
  checklistStatus: Record<string, ChecklistValue>;

  // Kategori & Rekening Belanja
  kategoriRekening: CategoryAccount[];

  // Daftar Barang & Survei
  items: ProcurementItem[];

  // Data Tahap 2: Kontrak (SP, SPMK), Pemeriksaan & Serah Terima (KPP, BAHP, BAST, BAPP), Ringkasan Kontrak & Kuitansi
  kontrak: ContractExecutionData;
}

export interface SavedDraft {
  id: string;
  title: string;
  savedAt: string;
  transaction: TransactionData;
  master?: MasterData;
  nomorDPP?: string;
  namaPaket?: string;
  tahunAnggaran?: number | string;
  sumberDana?: string;
  totalPagu?: number;
  totalHPS?: number;
  totalKontrak?: number;
  itemCount?: number;
  penyediaNama?: string;
  isOnline?: boolean;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export type DocumentStageFilter = 'all' | 'tahap1' | 'tahap2';

export type DocumentTabId =
  | 'all'
  | 'all_tahap1'
  | 'all_tahap2'
  | 'doc1_checklist'
  | 'doc2_permohonan'
  | 'doc3_surat_tugas'
  | 'doc4_dpp'
  | 'doc5_kak'
  | 'doc6_rab'
  | 'doc7_spektek'
  | 'doc8_riwayat_survei'
  | 'doc9_lampiran_survei'
  | 'doc10_sp'
  | 'doc11_spmk'
  | 'doc12_sertifikat'
  | 'doc12_sertifikat_bayar'
  | 'doc13_kpp'
  | 'doc14_bahp'
  | 'doc15_bast'
  | 'doc16_bapp'
  | 'doc17_ringkasan_kontrak'
  | 'doc18_kuitansi';
