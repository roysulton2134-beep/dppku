import * as XLSX from 'xlsx';
import { MasterData, TransactionData } from '../types/procurement';
import { ComputedProcurementSummary } from './calculations';
import {
  formatRupiahDoc,
  formatTanggalIndo,
  tanggalKeEjaanResmi,
} from './terbilang';

export function exportProcurementToXlsx(
  master: MasterData,
  transaction: TransactionData,
  summary: ComputedProcurementSummary
): void {
  const wb = XLSX.utils.book_new();
  const ejaanDPP = tanggalKeEjaanResmi(transaction.tanggalDPP);

  // =========================================================================
  // SHEET 1: RINGKASAN & AGENDA
  // =========================================================================
  const ringkasanRows = [
    ['RINGKASAN DOKUMEN PERSIAPAN PENGADAAN (DPP) E-PURCHASING'],
    [master.pemkabName],
    [master.dinasName],
    [''],
    ['INFORMASI AGENDA & PENOMORAN', ''],
    ['Nama Paket Pekerjaan', transaction.namaPaket],
    ['Kode RUP SiRUP', transaction.kodeRUP],
    ['Nomor Surat Permohonan', transaction.nomorSuratPermohonan],
    ['Nomor Surat Tugas PPK', transaction.nomorSuratTugas],
    ['Nomor DPP', transaction.nomorDPP],
    ['Tanggal DPP', `${formatTanggalIndo(transaction.tanggalDPP)} (${ejaanDPP.kalimatLengkap})`],
    [
      'Jadwal Pelaksanaan',
      `${formatTanggalIndo(transaction.tanggalMulaiPelaksanaan)} s.d. ${formatTanggalIndo(
        transaction.tanggalSelesaiPelaksanaan
      )} (${transaction.jangkaWaktuHari} Hari Kalender)`,
    ],
    ['Metode Pengadaan', transaction.metodePengadaan],
    ['Sumber Dana (Permohonan)', transaction.sumberDanaSuratPermohonan],
    ['Sumber Dana (KAK / RAB)', transaction.sumberDanaKAK],
    ['Tahun Anggaran', transaction.tahunAnggaran],
    ['Lokasi Pengiriman', `${transaction.lokasiNama} - ${transaction.lokasiAlamat}`],
    [''],
    ['REKAPITULASI ANGGARAN', ''],
    ['Total Pagu Anggaran (Rp)', summary.totalPagu],
    ['Total Pagu Terformat', formatRupiahDoc(summary.totalPagu)],
    ['Terbilang Pagu', summary.terbilangPagu],
    ['Total HPS / Penetapan (Rp)', summary.totalPenetapan],
    ['Total HPS Terformat', formatRupiahDoc(summary.totalPenetapan)],
    ['Terbilang HPS / RAB', summary.terbilangPenetapan],
    [''],
    ['PEJABAT PENANDATANGAN', ''],
    ['PPK / Kepala Dinas', `${master.ppk.nama} (NIP. ${master.ppk.nip})`],
    ['Pejabat Pengadaan', `${master.pejabatPengadaan.nama} (NIP. ${master.pejabatPengadaan.nip})`],
    ['Kabid / Pembuat Checklist', `${master.kabid.nama} (NIP. ${master.kabid.nip})`],
  ];
  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanRows);
  wsRingkasan['!cols'] = [{ wch: 30 }, { wch: 85 }];
  XLSX.utils.book_append_sheet(wb, wsRingkasan, '1_Ringkasan_Paket');

  // =========================================================================
  // SHEET 2: DPP & RAB
  // =========================================================================
  const rabRows: (string | number)[][] = [
    ['RENCANA ANGGARAN DAN BIAYA (RAB) & RINCIAN DPP'],
    ['PAKET PEKERJAAN', transaction.namaPaket],
    ['KODE RUP', transaction.kodeRUP],
    ['SUMBER DANA', transaction.sumberDanaRAB],
    ['TAHUN ANGGARAN', transaction.tahunAnggaran],
    [],
    [
      'NO',
      'KATEGORI BELANJA',
      'URAIAN / SPESIFIKASI BARANG',
      'VOLUME',
      'SATUAN',
      'HARGA SATUAN PAGU (Rp)',
      'JUMLAH PAGU (Rp)',
      'HARGA SATUAN RAB/HPS (Rp)',
      'JUMLAH RAB/HPS (Rp)',
    ],
  ];

  for (const grp of summary.groups) {
    rabRows.push(['', grp.kategori.toUpperCase(), '', '', '', '', '', '', '']);
    for (const { globalIndex, item, subtotalPagu, subtotalPenetapan } of grp.items) {
      rabRows.push([
        globalIndex,
        grp.kategori,
        item.namaBarang,
        item.volume,
        item.satuan,
        item.hargaPaguSatuan,
        subtotalPagu,
        item.hargaPenetapanSatuan,
        subtotalPenetapan,
      ]);
    }
  }

  rabRows.push([]);
  rabRows.push([
    '',
    '',
    'JUMLAH TOTAL (Termasuk PPN 11% + Ongkos Kirim)',
    '',
    '',
    '',
    summary.totalPagu,
    '',
    summary.totalPenetapan,
  ]);
  rabRows.push(['', '', `Terbilang : ${summary.terbilangPenetapan}`]);

  const wsRab = XLSX.utils.aoa_to_sheet(rabRows);
  wsRab['!cols'] = [
    { wch: 6 },
    { wch: 34 },
    { wch: 30 },
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRab, '2_DPP_dan_RAB');

  // =========================================================================
  // SHEET 3: RIWAYAT SURVEI HARGA
  // =========================================================================
  const surveiRows: (string | number)[][] = [
    ['RIWAYAT SURVEI HARGA'],
    [master.dinasName + ' KABUPATEN MALANG'],
    ['TAHUN ANGGARAN ' + transaction.tahunAnggaran],
    ['Nama Pekerjaan', transaction.namaPaket],
    ['Pagu Anggaran', formatRupiahDoc(summary.totalPagu)],
    [],
    [
      'No.',
      'JENIS BARANG',
      'VOL',
      'SAT',
      'PAGU SATUAN (Rp)',
      'PAGU JUMLAH (Rp)',
      'PENYEDIA SURVEI I',
      'SURVEI I SATUAN (Rp)',
      'SURVEI I JUMLAH (Rp)',
      'PENYEDIA SURVEI II',
      'SURVEI II SATUAN (Rp)',
      'SURVEI II JUMLAH (Rp)',
      'PENETAPAN HARGA PENAWARAN (Rp)',
    ],
  ];

  for (const {
    globalIndex,
    item,
    subtotalPagu,
    subtotalPenetapan,
    subtotalSurvei1,
    subtotalSurvei2,
  } of summary.flatItems) {
    surveiRows.push([
      globalIndex,
      item.namaBarang,
      item.volume,
      item.satuan,
      item.hargaPaguSatuan,
      subtotalPagu,
      item.toko1.namaToko,
      item.toko1.hargaSatuan,
      subtotalSurvei1,
      item.toko2.namaToko,
      item.toko2.hargaSatuan,
      subtotalSurvei2,
      subtotalPenetapan,
    ]);
  }

  surveiRows.push([
    '',
    'JUMLAH TOTAL',
    '',
    '',
    '',
    summary.totalPagu,
    '',
    '',
    summary.totalSurvei1,
    '',
    '',
    summary.totalSurvei2,
    summary.totalPenetapan,
  ]);

  const wsSurvei = XLSX.utils.aoa_to_sheet(surveiRows);
  wsSurvei['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 8 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSurvei, '3_Riwayat_Survei_Harga');

  // =========================================================================
  // SHEET 4: LAMPIRAN LINK SURVEI
  // =========================================================================
  const lampiranRows: (string | number)[][] = [
    ['LAMPIRAN SURVEI HARGA (KATALOG MBIZMARKET / TOKO DARING)'],
    [master.dinasName + ' KABUPATEN MALANG - TA ' + transaction.tahunAnggaran],
    [],
    [
      'No.',
      'JENIS BARANG',
      'NAMA PENYEDIA / TOKO',
      'HARGA SATUAN SURVEI (Rp)',
      'TANGGAL SURVEI',
      'LINK PRODUK MBIZMARKET',
    ],
  ];

  for (const { globalIndex, item } of summary.flatItems) {
    lampiranRows.push([
      `${globalIndex}.a.`,
      item.namaBarang,
      item.toko1.namaToko,
      item.toko1.hargaSatuan,
      formatTanggalIndo(item.toko1.tanggalSurvei, true),
      item.toko1.link,
    ]);
    lampiranRows.push([
      `${globalIndex}.b.`,
      item.namaBarang,
      item.toko2.namaToko,
      item.toko2.hargaSatuan,
      formatTanggalIndo(item.toko2.tanggalSurvei, true),
      item.toko2.link,
    ]);
  }

  const wsLampiran = XLSX.utils.aoa_to_sheet(lampiranRows);
  wsLampiran['!cols'] = [
    { wch: 8 },
    { wch: 26 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 68 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLampiran, '4_Lampiran_Survei');

  // =========================================================================
  // SHEET 5: SPESIFIKASI TEKNIS & KAK
  // =========================================================================
  const spekRows: (string | number)[][] = [
    ['SPESIFIKASI TEKNIS PAKET E-PURCHASING'],
    ['Program', transaction.program],
    ['Kegiatan', transaction.kegiatan],
    ['Sub Kegiatan', transaction.subKegiatan],
    ['Lokasi', `${transaction.lokasiNama} - ${transaction.lokasiAlamat}`],
    ['Nama Paket', transaction.namaPaket],
    ['Jangka Waktu', `${transaction.jangkaWaktuHari} Hari Kalender`],
    [],
    ['No.', 'Barang / Mutu Kualitas', 'Kuantitas / Volume', 'Kategori Belanja'],
    ...summary.flatItems.map(({ globalIndex, item }) => [
      globalIndex,
      item.namaBarang,
      `${item.volume} ${item.satuan}`,
      item.kategori,
    ]),
  ];
  const wsSpek = XLSX.utils.aoa_to_sheet(spekRows);
  wsSpek['!cols'] = [{ wch: 14 }, { wch: 35 }, { wch: 22 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, wsSpek, '5_Spesifikasi_Teknis');

  const safeCode = (transaction.kodeRUP || 'DPP').replace(/[^a-zA-Z0-9_-]/g, '');
  XLSX.writeFile(wb, `Rekap_DPP_EPurchasing_${safeCode}.xlsx`);
}
