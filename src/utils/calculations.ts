import { ProcurementItem, TransactionData, JenisPPhOption } from '../types/procurement';
import { angkaKeTerbilangRupiah, getItemSurveyTotal } from './terbilang';

export interface GroupedCategoryItems {
  kategori: string;
  namaRekening?: string;
  kodeRekening?: string;
  items: Array<{
    globalIndex: number; // 1-based index across the whole table
    item: ProcurementItem;
    subtotalPagu: number;
    subtotalPenetapan: number;
    subtotalSurvei1: number;
    subtotalSurvei2: number;
    hargaKontrakSatuan: number;
    hargaKontrakTermasukPajak: number;
    subtotalKontrak: number;
    subtotalKontrakTermasukPajak: number;
  }>;
  categoryTotalPagu: number;
  categoryTotalPenetapan: number;
  categoryTotalKontrak: number;
}

export interface ComputedProcurementSummary {
  groups: GroupedCategoryItems[];
  flatItems: Array<{
    globalIndex: number;
    item: ProcurementItem;
    subtotalPagu: number;
    subtotalPenetapan: number;
    subtotalSurvei1: number;
    subtotalSurvei2: number;
    hargaKontrakSatuan: number;
    hargaKontrakTermasukPajak: number;
    subtotalKontrak: number;
    subtotalKontrakTermasukPajak: number;
  }>;
  totalPagu: number;
  totalPenetapan: number;
  totalSurvei1: number;
  totalSurvei2: number;
  terbilangPagu: string;
  terbilangPenetapan: string;
  // Tahap 2 (Kontrak / SP / BAST / Kuitansi)
  jumlahKontrakSebelumPPN: number;
  ppnPersen: number;
  ppnKontrak: number;
  totalNilaiKontrak: number;
  terbilangKontrak: string;
  // Perpajakan (PPN & PPh)
  jenisPPh: JenisPPhOption;
  pphPersen: number;
  namaJenisPPh: string;
  pphKontrak: number;
  totalPotonganPajak: number;
  nilaiBersihDiterima: number;
  terbilangBersih: string;
}

export function getNamaJenisPPh(
  jenis?: JenisPPhOption,
  persen?: number
): string {
  const p = persen !== undefined ? persen : 1.5;
  switch (jenis) {
    case 'pph22':
      return `PPh Pasal 22 (${p}%)`;
    case 'pph22_umkm':
      return `PPh 22 UMKM PP 23/55 (${p}%)`;
    case 'pph22_nonnpwp':
      return `PPh Pasal 22 Non-NPWP (${p}%)`;
    case 'pph23':
      return `PPh Pasal 23 Jasa/Sewa (${p}%)`;
    case 'pph23_nonnpwp':
      return `PPh Pasal 23 Non-NPWP (${p}%)`;
    case 'pph4_2':
      return `PPh Final Ps. 4(2) Konstruksi (${p}%)`;
    case 'pph21':
      return `PPh Pasal 21 Tenaga Ahli (${p}%)`;
    case 'bebas':
      return `Bebas PPh (0%)`;
    case 'custom':
    default:
      return `PPh (${p}%)`;
  }
}

/**
 * Menghitung volume efektif pengali biaya (Volume 1 * Volume Tambahan jika ada)
 * Contoh: 2 Bulan x 3 Orang => 6
 */
export function getItemEffectiveVolume(item: ProcurementItem): number {
  const v1 = typeof item.volume === 'number' && !isNaN(item.volume) ? item.volume : 0;
  const v2 =
    typeof item.volumeTambahan === 'number' &&
    !isNaN(item.volumeTambahan) &&
    item.volumeTambahan > 0
      ? item.volumeTambahan
      : 1;
  return Number((v1 * v2).toFixed(4));
}

/**
 * Format gabungan Kuantitas & Satuan untuk kolom Kuantitas / Volume
 * Contoh: "2 Bulan x 3 Orang" atau "3400 Kg"
 */
export function formatItemVolumeSatuan(item: ProcurementItem): string {
  if (item.volumeTambahan && item.satuanTambahan) {
    return `${item.volume} ${item.satuan} x ${item.volumeTambahan} ${item.satuanTambahan}`;
  }
  if (item.volumeTambahan && !item.satuanTambahan) {
    return `${item.volume} ${item.satuan} x ${item.volumeTambahan}`;
  }
  if (!item.volumeTambahan && item.satuanTambahan) {
    return `${item.volume} ${item.satuan} x ${item.satuanTambahan}`;
  }
  return `${item.volume} ${item.satuan}`;
}

/**
 * Format kolom Volume tersendiri (untuk tabel dengan kolom Volume dan Satuan terpisah)
 * Contoh: "2 x 3" atau "3400"
 */
export function formatItemVolume(item: ProcurementItem): string {
  if (item.volumeTambahan && item.volumeTambahan > 0) {
    return `${item.volume} x ${item.volumeTambahan}`;
  }
  return String(item.volume);
}

/**
 * Format kolom Satuan tersendiri (untuk tabel dengan kolom Volume dan Satuan terpisah)
 * Contoh: "Bulan x Orang" atau "Kg"
 */
export function formatItemSatuan(item: ProcurementItem): string {
  if (item.satuanTambahan && item.satuanTambahan.trim()) {
    return `${item.satuan} x ${item.satuanTambahan}`;
  }
  return item.satuan;
}

export function computeProcurementSummary(
  transaction: TransactionData
): ComputedProcurementSummary {
  const orderedCategoryNames: string[] = [];
  for (const kr of transaction.kategoriRekening) {
    if (kr.kategori && !orderedCategoryNames.includes(kr.kategori)) {
      orderedCategoryNames.push(kr.kategori);
    }
  }
  for (const it of transaction.items) {
    const kat = it.kategori || 'Lainnya';
    if (!orderedCategoryNames.includes(kat)) {
      orderedCategoryNames.push(kat);
    }
  }

  let globalCounter = 1;
  const groups: GroupedCategoryItems[] = [];
  const flatItems: ComputedProcurementSummary['flatItems'] = [];

  for (const katName of orderedCategoryNames) {
    const matchingItems = transaction.items.filter(
      (i) => (i.kategori || 'Lainnya') === katName
    );
    if (matchingItems.length === 0) continue;

    const rekInfo = transaction.kategoriRekening.find(
      (r) => r.kategori === katName || r.namaRekening === katName
    );
    const groupItems = matchingItems.map((item) => {
      const effectiveVol = getItemEffectiveVolume(item);
      const subtotalPagu = Math.round(effectiveVol * item.hargaPaguSatuan);
      const subtotalPenetapan = Math.round(effectiveVol * item.hargaPenetapanSatuan);
      const subtotalSurvei1 = getItemSurveyTotal(
        item.toko1.hargaSatuan,
        effectiveVol,
        item.toko1.jumlahOverride
      );
      const subtotalSurvei2 = getItemSurveyTotal(
        item.toko2.hargaSatuan,
        effectiveVol,
        item.toko2.jumlahOverride
      );

      // Harga Kontrak Satuan (sebelum PPN) & Harga Kontrak Termasuk Pajak (diinput manual & konsisten)
      const ppnPersenItem = transaction.kontrak?.ppnPersen ?? 11;
      const ppnDiv = 1 + ppnPersenItem / 100;
      const hargaKontrakSatuan =
        typeof item.hargaKontrakSatuan === 'number' && item.hargaKontrakSatuan > 0
          ? item.hargaKontrakSatuan
          : ppnPersenItem > 0
          ? Number((item.hargaPenetapanSatuan / ppnDiv).toFixed(2))
          : item.hargaPenetapanSatuan;

      const hargaKontrakTermasukPajak =
        typeof item.hargaKontrakTermasukPajak === 'number' &&
        item.hargaKontrakTermasukPajak > 0
          ? item.hargaKontrakTermasukPajak
          : ppnPersenItem > 0
          ? Number((hargaKontrakSatuan * ppnDiv).toFixed(2))
          : hargaKontrakSatuan;

      const subtotalKontrak = Number(
        (
          effectiveVol * hargaKontrakSatuan +
          (item.ongkosKirimKontrak || 0)
        ).toFixed(2)
      );

      const subtotalKontrakTermasukPajak =
        Math.round(effectiveVol * hargaKontrakTermasukPajak) +
        (item.ongkosKirimKontrak || 0);

      const entry = {
        globalIndex: globalCounter++,
        item,
        subtotalPagu,
        subtotalPenetapan,
        subtotalSurvei1,
        subtotalSurvei2,
        hargaKontrakSatuan,
        hargaKontrakTermasukPajak,
        subtotalKontrak,
        subtotalKontrakTermasukPajak,
      };
      flatItems.push(entry);
      return entry;
    });

    const categoryTotalPagu = groupItems.reduce((acc, c) => acc + c.subtotalPagu, 0);
    const categoryTotalPenetapan = groupItems.reduce(
      (acc, c) => acc + c.subtotalPenetapan,
      0
    );
    const categoryTotalKontrak = groupItems.reduce(
      (acc, c) => acc + c.subtotalKontrak,
      0
    );

    groups.push({
      kategori: katName,
      namaRekening: rekInfo?.namaRekening,
      kodeRekening: rekInfo?.kodeRekening,
      items: groupItems,
      categoryTotalPagu,
      categoryTotalPenetapan,
      categoryTotalKontrak,
    });
  }

  const totalPagu = flatItems.reduce((acc, c) => acc + c.subtotalPagu, 0);
  const totalPenetapan = flatItems.reduce((acc, c) => acc + c.subtotalPenetapan, 0);
  const totalSurvei1 = flatItems.reduce((acc, c) => acc + c.subtotalSurvei1, 0);
  const totalSurvei2 = flatItems.reduce((acc, c) => acc + c.subtotalSurvei2, 0);

  const totalOngkir = flatItems.reduce(
    (acc, c) => acc + (c.item.ongkosKirimKontrak || 0),
    0
  );
  const ppnPersen = transaction.kontrak?.ppnPersen ?? 11;
  const ppnDivTotal = 1 + ppnPersen / 100;
  const totalNilaiKontrak = flatItems.reduce(
    (acc, c) => acc + c.subtotalKontrakTermasukPajak,
    0
  );
  const jumlahKontrakSebelumPPN =
    ppnPersen > 0
      ? Math.round((totalNilaiKontrak - totalOngkir) / ppnDivTotal) + totalOngkir
      : totalNilaiKontrak;
  const ppnKontrak = totalNilaiKontrak - jumlahKontrakSebelumPPN;

  // Kalkulasi PPh sesuai peraturan perpajakan pemerintah (DPP PPh = nilai kontrak sebelum PPN)
  const jenisPPh = transaction.kontrak?.jenisPPh ?? 'pph22';
  const pphPersen =
    jenisPPh === 'bebas'
      ? 0
      : transaction.kontrak?.pphPersen !== undefined
      ? transaction.kontrak.pphPersen
      : 1.5;
  const pphKontrak = Math.round(jumlahKontrakSebelumPPN * (pphPersen / 100));
  const totalPotonganPajak = ppnKontrak + pphKontrak;
  const nilaiBersihDiterima = totalNilaiKontrak - totalPotonganPajak;

  return {
    groups,
    flatItems,
    totalPagu,
    totalPenetapan,
    totalSurvei1,
    totalSurvei2,
    terbilangPagu: angkaKeTerbilangRupiah(totalPagu),
    terbilangPenetapan: angkaKeTerbilangRupiah(totalPenetapan),
    jumlahKontrakSebelumPPN,
    ppnPersen,
    ppnKontrak,
    totalNilaiKontrak,
    terbilangKontrak: angkaKeTerbilangRupiah(totalNilaiKontrak),
    jenisPPh,
    pphPersen,
    namaJenisPPh: getNamaJenisPPh(jenisPPh, pphPersen),
    pphKontrak,
    totalPotonganPajak,
    nilaiBersihDiterima,
    terbilangBersih: angkaKeTerbilangRupiah(nilaiBersihDiterima),
  };
}
