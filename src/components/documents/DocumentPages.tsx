import React from 'react';
import {
  ChecklistValue,
  MasterData,
  TransactionData,
} from '../../types/procurement';
import {
  ComputedProcurementSummary,
  formatItemVolumeSatuan,
  formatItemVolume,
  formatItemSatuan,
} from '../../utils/calculations';
import {
  formatBulanTahunIndo,
  formatRupiahDoc,
  formatTanggalIndo,
  tanggalKeEjaanResmi,
  toTitleCaseIndo,
} from '../../utils/terbilang';
import { KopSurat } from './KopSurat';

interface DocProps {
  master: MasterData;
  transaction: TransactionData;
  summary: ComputedProcurementSummary;
}

const renderChecklistBox = (val?: ChecklistValue) => {
  if (val === 'ada') return <span className="text-[13pt] leading-none">☑</span>;
  if (val === 'tidak_ada') return <span className="text-[13pt] leading-none">☒</span>;
  return <span className="text-[13pt] leading-none">☐</span>;
};

export function getSuratPermohonanTableRows(
  transaction: TransactionData,
  summary: ComputedProcurementSummary
): Array<{
  no: number;
  namaPaket: string;
  sumberDana: string;
  pagu: number;
  hps: number;
}> {
  const sumberDana =
    transaction.sumberDanaTabelPermohonan ||
    transaction.sumberDanaSuratPermohonan ||
    transaction.sumberDanaSingkatKuitansi ||
    'PAD';
  const mode = transaction.modeTabelPermohonan || 'per_item';

  if (mode === 'per_paket') {
    return [
      {
        no: 1,
        namaPaket: transaction.namaPaket,
        sumberDana,
        pagu: summary.totalPagu,
        hps: summary.totalPenetapan,
      },
    ];
  }

  if (mode === 'per_kategori') {
    return summary.groups.map((grp, idx) => ({
      no: idx + 1,
      namaPaket: grp.kategori,
      sumberDana,
      pagu: grp.categoryTotalPagu,
      hps: grp.categoryTotalPenetapan,
    }));
  }

  return summary.flatItems.map((row, idx) => ({
    no: idx + 1,
    namaPaket: row.item.namaBarang,
    sumberDana,
    pagu: row.subtotalPagu,
    hps: row.subtotalPenetapan,
  }));
}

export function formatAngkaStripDoc(val: number): string {
  return `${Math.round(val || 0).toLocaleString('id-ID')},-`;
}

/**
 * 1. CHECKLIST KELENGKAPAN PERMOHONAN PENGADAAN
 */
export const Doc1Checklist: React.FC<DocProps> = ({ master, transaction }) => {
  const cs = transaction.checklistStatus || {};
  const jenisPengadaan = transaction.checklistJenisPengadaan || '';
  const metodeEpurchasing = transaction.checklistMetodeEpurchasing || '';
  const satuanKerja = master.kabid?.dinas || 'Dinas Pemuda dan Olahraga';

  return (
    <div className="doc-page text-[10pt] leading-[1.3] text-black">
      <div className="text-center font-bold text-[11pt] mb-3 uppercase leading-snug">
        <div>
          CHECKLIST KELENGKAPAN PENGAJUAN DOKUMEN PERSIAPAN PENGADAAN (DPP)
        </div>
        <div>UNTUK E-PURCHASING MELALUI KATALOG ELEKTRONIK</div>
      </div>

      {/* Tabel Metadata Paket */}
      <table className="doc-table w-full border-collapse mb-3.5 text-[10pt]">
        <tbody>
          <tr>
            <td className="w-[30%] align-top py-1 px-2">Nama Paket</td>
            <td className="align-top py-1 px-2">{transaction.namaPaket}</td>
          </tr>
          <tr>
            <td className="align-top py-1 px-2">Satuan Kerja</td>
            <td className="align-top py-1 px-2">{satuanKerja}</td>
          </tr>
          <tr>
            <td className="align-top py-1 px-2">Tahun Anggaran</td>
            <td className="align-top py-1 px-2">{transaction.tahunAnggaran}</td>
          </tr>
          <tr>
            <td className="align-top py-1 px-2">Jenis Pengadaan</td>
            <td className="align-top py-1 px-2 space-y-0.5">
              <div>
                <span className="inline-block w-5 text-[11pt] leading-none">
                  {jenisPengadaan === 'Barang' ? '☑' : '☐'}
                </span>
                Barang
              </div>
              <div>
                <span className="inline-block w-5 text-[11pt] leading-none">
                  {jenisPengadaan === 'Jasa Lainnya' ? '☑' : '☐'}
                </span>
                Jasa Lainnya
              </div>
              <div>
                <span className="inline-block w-5 text-[11pt] leading-none">
                  {jenisPengadaan === 'Pekerjaan Konstruksi' ? '☑' : '☐'}
                </span>
                Pekerjaan Konstruksi
              </div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-1 px-2">Metode E-purchasing</td>
            <td className="align-top py-1 px-2 space-y-0.5">
              <div>
                <span className="inline-block w-5 text-[11pt] leading-none">
                  {metodeEpurchasing === 'Negosiasi' ? '☑' : '☐'}
                </span>
                Negosiasi
              </div>
              <div>
                <span className="inline-block w-5 text-[11pt] leading-none">
                  {metodeEpurchasing === 'Mini Kompetisi' ? '☑' : '☐'}
                </span>
                Mini Kompetisi
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tabel Item Pengecekan */}
      <table className="doc-table w-full border-collapse text-[10pt]">
        <thead>
          <tr
            className="font-bold text-center"
            style={{ backgroundColor: '#D9E2F3' }}
          >
            <th className="w-[46px] py-1.5">No.</th>
            <th className="py-1.5">Item Pengecekan</th>
            <th className="w-[95px] py-1.5">Checklist</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-center align-middle py-1">1</td>
            <td className="align-middle py-1 px-2">
              Surat pengantar/permohonan pelaksanaan E-purchasing kepada Kepala UKPBJ.
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['1'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">2</td>
            <td className="align-middle py-1 px-2">
              <div>Dokumen Perencanaan Pengadaan:</div>
              <div className="pl-5">a. Dokumen identifikasi kebutuhan</div>
              <div className="pl-5">b. Formulir perencanaan pengadaan</div>
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['2'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">3</td>
            <td className="align-middle py-1 px-2">
              RUP/ID RUP sesuai dengan paket yang diajukan
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['3'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">4</td>
            <td className="align-middle py-1 px-2">
              DPA/dokumen anggaran yang memuat ketersediaan anggaran untuk paket
              pekerjaan
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['4'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">5</td>
            <td className="align-middle py-1 px-2">
              Spesifikasi Teknis dan gambar (apabila ada)
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['5'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">6</td>
            <td className="align-middle py-1 px-2">HPS</td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['6'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">7</td>
            <td className="align-middle py-1 px-2">
              Daftar Kuantitas dan Harga/Bill of Quantity (BQ)
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['7'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">8</td>
            <td className="align-middle py-1 px-2">
              Rancangan kontrak: Surat Pesanan, Surat Perjanjian beserta ketentuan
              yang dipersyaratkan (termasuk SSUK/SSKK apabila digunakan)
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['8'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">9</td>
            <td className="align-middle py-1 px-2">
              Bukti/hasil penelusuran ketersediaan produk dan kesesuaian kategori
              produk dengan kebutuhan (untuk pengadaan barang dan jasa lainnya)
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['9'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">10</td>
            <td className="align-middle py-1 px-2">
              <div>Khusus Pekerjaan Konstruksi:</div>
              <div className="pl-5">a. Analisa Harga Satuan Pekerjaan (AHSP)</div>
              <div className="pl-5">
                b. Dokumen penetapan Rencana Keselamatan Konstruksi (RKK)
              </div>
              <div className="pl-5">
                c. Laporan Hasil Reviu (LHR) atas HPS dari Inspektorat (apabila
                dipersyaratkan)
              </div>
              <div className="pl-5">
                d. Kertas Kerja Pengecekan Produk pada Katalog Elektronik sesuai
                Master Produk Pekerjaan Konstruksi.
              </div>
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['10'])}
            </td>
          </tr>
          <tr>
            <td className="text-center align-middle py-1">11</td>
            <td className="align-middle py-1 px-2">
              Dokumen pendukung lainnya sesuai jenis pengadaan, karakteristik paket,
              dan persyaratan pada Katalog Elektronik (apabila ada)
            </td>
            <td className="text-center align-middle py-1">
              {renderChecklistBox(cs['11'])}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/**
 * 2. SURAT PERMOHONAN PELAKSANAAN PENGADAAN BARANG/JASA
 */
export const Doc2SuratPermohonan: React.FC<DocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const tglSurat =
    transaction.formatTanggalPermohonan === 'lengkap'
      ? formatTanggalIndo(transaction.tanggalSuratPermohonan, false)
      : `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${formatBulanTahunIndo(
          transaction.tanggalSuratPermohonan
        )}`;

  const jenisDokAnggaran = transaction.jenisDokumenAnggaranPermohonan || 'DPPA';
  const nomorDPAPermohonan =
    transaction.nomorDPAPermohonan ||
    transaction.kontrak?.nomorDPA ||
    'DPPA/A.3/2.19.0.00.0.00.19.0000/001/2026';
  const tanggalDPAPermohonan =
    transaction.tanggalDPAPermohonan ||
    transaction.kontrak?.tanggalDPA ||
    '19 Oktober Tahun 2026';

  const tableRows = getSuratPermohonanTableRows(transaction, summary);

  return (
    <div className="doc-page text-[10.5pt] leading-[1.35] text-black">
      <KopSurat master={master} />

      <div className="flex justify-end mb-1">
        <div className="w-[290px] text-left">
          <div>
            {master.kotaPenetapan}, {tglSurat}
          </div>
          <div className="mt-2 pl-6">Kepada</div>
        </div>
      </div>

      {/* Header Nomor, Sifat, Lampiran, Perihal & Tujuan */}
      <table className="w-full border-collapse mb-4 text-[10.5pt]">
        <tbody>
          <tr>
            <td className="w-[78px] align-top py-0.5">Nomor</td>
            <td className="w-[14px] align-top py-0.5">:</td>
            <td className="align-top py-0.5 pr-4">
              {transaction.nomorSuratPermohonan}
            </td>
            <td className="w-[290px] align-top py-0.5" rowSpan={4}>
              <div className="flex items-start">
                <span className="w-[34px] shrink-0">Yth.</span>
                <span className="w-[34px] shrink-0">Sdr.</span>
                <span className="flex-1 text-justify">
                  Kepala Bagian Pengadaan Barang dan Jasa Kabupaten Malang
                </span>
              </div>
              <div className="pl-[68px] mt-1">di</div>
              <div className="pl-[96px] font-bold tracking-[0.2em] mt-0.5">
                {master.pejabatPengadaan.kotaTujuan || 'K E P A N J E N'}
              </div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Sifat</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 pr-4">
              {transaction.sifatSuratPermohonan}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Lampiran</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 pr-4">
              {transaction.lampiranSuratPermohonan}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Perihal</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 pr-4 font-bold">
              {transaction.perihalSuratPermohonan}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pl-3">
        <p className="text-justify indent-9 mb-3 leading-relaxed">
          Dalam rangka Pelaksanaan Program dan Kegiatan pada {jenisDokAnggaran}{' '}
          {master.organisasiSKPD ||
            'Dinas Pemuda dan Olahraga Kabupaten Malang'}{' '}
          Nomor : {nomorDPAPermohonan} Tanggal {tanggalDPAPermohonan}, dengan ini
          mengajukan permohonan pelaksanaan pengadaan barang/jasa untuk dapat
          diproses melalui Bagian Pengadaan Barang dan Jasa sebagaimana ketentuan
          peraturan perundang-undangan yang berlaku. Adapun data paket pekerjaan
          sebagai berikut:
        </p>

        {/* Tabel 5 Kolom Paket Pekerjaan */}
        <table className="doc-table w-full border-collapse mb-3 text-[10.5pt]">
          <thead>
            <tr
              className="text-center align-middle font-normal"
              style={{ backgroundColor: '#F2F2F2' }}
            >
              <th className="w-[45px] py-1.5 font-normal">No.</th>
              <th className="w-[29%] py-1.5 font-normal">Nama Paket Pekerjaan</th>
              <th className="w-[30%] py-1.5 font-normal leading-tight">
                <div>Sumber Dana</div>
                <div>(DAU/DAK/DBHCHT/</div>
                <div>DBH/PAD/LAIN-LAIN)</div>
              </th>
              <th className="w-[17.5%] py-1.5 font-normal">Pagu (Rp)</th>
              <th className="w-[17.5%] py-1.5 font-normal">HPS (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.no}>
                <td className="text-center align-middle py-1.5">{row.no}.</td>
                <td className="text-left align-middle py-1.5 px-2">
                  {row.namaPaket}
                </td>
                <td className="text-center align-middle py-1.5 px-2">
                  {row.sumberDana}
                </td>
                <td className="text-right align-middle py-1.5 px-2">
                  {formatAngkaStripDoc(row.pagu)}
                </td>
                <td className="text-right align-middle py-1.5 px-2">
                  {formatAngkaStripDoc(row.hps)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-justify indent-9 mb-2.5 leading-relaxed">
          Bersama ini dilampirkan dokumen-dokumen dan data-data kelengkapan proses
          lelang sebagaimana terlampir.
        </p>

        <p className="text-justify indent-9 mb-6 leading-relaxed">
          Demikian atas perhatian dan perkenannya disampaikan terima kasih.
        </p>
      </div>

      <div className="flex justify-end mt-2">
        <div className="w-[290px] text-left">
          <div>
            {[master.ppk.jabatanPrefix, master.ppk.jabatan]
              .filter(Boolean)
              .join(' ')}
          </div>
          <div>Selaku</div>
          <div>Pejabat Pembuat Komitmen</div>
          <div className="h-16" />
          <div className="font-bold underline">{master.ppk.nama}</div>
          <div>{master.ppk.pangkat || 'Pembina Utama Muda'}</div>
          <div>NIP. {master.ppk.nip}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 3. SURAT TUGAS PPK
 */
export const Doc3SuratTugas: React.FC<DocProps> = ({ master, transaction }) => {
  const tglSuratTugas =
    transaction.formatTanggalSuratTugas === 'lengkap'
      ? formatTanggalIndo(transaction.tanggalSuratTugas, false)
      : `\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${formatBulanTahunIndo(
          transaction.tanggalSuratTugas
        )}`;

  return (
    <div className="doc-page text-[10.5pt] leading-[1.35] text-black">
      <KopSurat master={master} />

      <div className="text-center mb-3">
        <div className="font-bold text-[12pt] underline tracking-wide">SURAT TUGAS</div>
        <div className="text-[10.5pt]">Nomor : {transaction.nomorSuratTugas}</div>
      </div>

      {/* Dasar Hukum */}
      <table className="w-full border-collapse mb-3 text-[10.5pt]">
        <tbody>
          {master.dasarHukum.map((dasar, idx) => (
            <tr key={idx}>
              <td className="w-[65px] align-top py-0.5 font-normal">
                {idx === 0 ? 'Dasar' : ''}
              </td>
              <td className="w-[15px] align-top py-0.5">{idx === 0 ? ':' : ''}</td>
              <td className="w-[24px] align-top py-0.5">{idx + 1}.</td>
              <td className="align-top py-0.5 text-justify">{dasar}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center font-bold my-3 tracking-wide">MENUGASKAN :</div>

      {/* Kepada */}
      <table className="w-full border-collapse mb-3 text-[10.5pt]">
        <tbody>
          <tr>
            <td className="w-[65px] align-top py-0.5">Kepada</td>
            <td className="w-[15px] align-top py-0.5">:</td>
            <td className="w-[100px] align-top py-0.5">Nama / NIP</td>
            <td className="w-[15px] align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-semibold">
              {master.pejabatPengadaan.nama} / {master.pejabatPengadaan.nip}
            </td>
          </tr>
          <tr>
            <td />
            <td />
            <td className="align-top py-0.5">Jabatan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">{master.pejabatPengadaan.jabatanLengkap}</td>
          </tr>
        </tbody>
      </table>

      {/* Untuk */}
      <table className="w-full border-collapse mb-4 text-[10.5pt]">
        <tbody>
          <tr>
            <td className="w-[65px] align-top py-0.5">Untuk</td>
            <td className="w-[15px] align-top py-0.5">:</td>
            <td className="align-top py-0.5 text-justify">
              Melaksanakan pemilihan penyedia barang/jasa terhadap paket pekerjaan{' '}
              <span className="font-medium">{transaction.namaPaket}</span> dengan metode{' '}
              {transaction.metodePengadaan}.
            </td>
          </tr>
        </tbody>
      </table>

      <p className="indent-8 mb-1.5 text-justify">
        Sesuai prosedur, setelah melaksanakan kegiatan dimaksud agar melaporkan hasilnya
        sesuai dengan ketentuan yang berlaku.
      </p>
      <p className="indent-8 mb-5">
        Demikian untuk dilaksanakan dengan penuh tanggung jawab.
      </p>

      <div className="flex justify-end">
        <div className="w-[310px]">
          <table className="w-full border-collapse mb-1 text-[10.5pt]">
            <tbody>
              <tr>
                <td className="w-[110px] py-0">Dikeluarkan di</td>
                <td className="w-[12px] py-0">:</td>
                <td className="py-0">{master.kotaPenetapan}</td>
              </tr>
              <tr>
                <td className="py-0">Pada tanggal</td>
                <td className="py-0">:</td>
                <td className="py-0">{tglSuratTugas}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-1 text-left">
            <div>
              {[master.ppk.jabatanPrefix, master.ppk.jabatan].filter(Boolean).join(' ')}
            </div>
            <div className="h-16" />
            <div className="font-bold underline">{master.ppk.nama}</div>
            <div>{master.ppk.pangkat}</div>
            <div>NIP {master.ppk.nip}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 4. DOKUMEN PERSIAPAN PENGADAAN (DPP)
 */
export const Doc4DPP: React.FC<DocProps> = ({ master, transaction, summary }) => {
  const ejaan = tanggalKeEjaanResmi(transaction.tanggalDPP);

  return (
    <div className="doc-page text-[9.5pt] leading-[1.3] text-black">
      <KopSurat master={master} />

      <div className="text-center mb-2">
        <div className="font-bold text-[11pt] underline">
          DOKUMEN PERSIAPAN PENGADAAN (DPP)
        </div>
        <div className="text-[9.5pt]">Nomor : {transaction.nomorDPP}</div>
      </div>

      <div className="mb-1">Yang bertandatangan di bawah ini:</div>
      <table className="w-full border-collapse mb-1.5 text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-[95px] align-top py-0">Nama</td>
            <td className="w-[15px] align-top py-0">:</td>
            <td className="align-top py-0 font-semibold">{master.ppk.nama}</td>
          </tr>
          <tr>
            <td className="align-top py-0">Selaku</td>
            <td className="align-top py-0">:</td>
            <td className="align-top py-0">
              {master.ppk.selaku} Kabupaten Malang Tahun Anggaran{' '}
              {transaction.tahunAnggaran}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-justify mb-1.5">
        Pada hari ini <span className="font-bold">{ejaan.hari}</span> tanggal{' '}
        <span className="font-bold">{ejaan.tanggalTerbilang}</span> bulan{' '}
        <span className="font-bold">{ejaan.bulan}</span> tahun{' '}
        <span className="font-bold">{ejaan.tahunTerbilang}</span> menetapkan Dokumen
        Persiapan Pengadaan (DPP) sebagai berikut:
      </p>

      <table className="w-full border-collapse mb-1.5 text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-[95px] align-top py-0">Nama Paket</td>
            <td className="w-[15px] align-top py-0">:</td>
            <td className="align-top py-0">{transaction.namaPaket}.</td>
          </tr>
          <tr>
            <td className="align-top py-0">Kode RUP</td>
            <td className="align-top py-0">:</td>
            <td className="align-top py-0">{transaction.kodeRUP}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-1">
        Spesifikasi Teknis, Pagu Anggaran, dan Rancangan Kontrak sebagai berikut:
      </div>

      <table className="doc-table w-full border-collapse text-[9pt] mb-2">
        <thead>
          <tr className="font-bold text-center">
            <th className="w-[32px]">No.</th>
            <th className="w-[130px]">Kode Rekening</th>
            <th>Spesifikasi Teknis</th>
            <th className="w-[105px]">Spesifikasi Jumlah</th>
            <th className="w-[145px]">Harga Satuan termasuk Pajak (Rp.)</th>
            <th className="w-[135px]">Pagu Anggaran (Rp.)</th>
          </tr>
        </thead>
        <tbody>
          {summary.groups.map((grp) => (
            <React.Fragment key={grp.kategori}>
              {grp.items.map(({ globalIndex, item, subtotalPagu }, itemIdx) => (
                <tr key={item.id}>
                  <td className="text-center">{globalIndex}</td>
                  {itemIdx === 0 ? (
                    <td
                      rowSpan={grp.items.length}
                      className="text-center font-mono align-middle px-1 text-[8.5pt]"
                    >
                      <div className="font-bold">{grp.kodeRekening || '-'}</div>
                      {grp.namaRekening && (
                        <div className="text-[7.5pt] font-sans text-slate-700 leading-tight mt-0.5">
                          {grp.namaRekening}
                        </div>
                      )}
                    </td>
                  ) : null}
                  <td>{item.namaBarang}</td>
                  <td className="text-center">
                    {formatItemVolumeSatuan(item)}
                  </td>
                  <td className="text-right">{formatRupiahDoc(item.hargaPaguSatuan)}</td>
                  <td className="text-right">{formatRupiahDoc(subtotalPagu)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}

          {/* Klausul 1: Spesifikasi Waktu */}
          <tr>
            <td colSpan={6} className="text-justify leading-snug">
              <span className="font-bold">Spesifikasi Waktu:</span> Pelaksanaan pekerjaan
              mulai tanggal{' '}
              <span className="font-semibold">
                {formatTanggalIndo(transaction.tanggalMulaiPelaksanaan)}
              </span>{' '}
              s.d.{' '}
              <span className="font-semibold">
                {formatTanggalIndo(transaction.tanggalSelesaiPelaksanaan)}
              </span>
              , spesifikasi jumlah yang tertuang bersifat perkiraan, jumlah pesanan sesuai
              yang tertuang di Surat Pesanan tertulis yang akan disampaikan kepada
              Penyedia Barang/Jasa. Penyedia Barang/Jasa melakukan pengiriman barang/jasa
              setelah menerima rekaman Surat Pesanan tertulis.
            </td>
          </tr>

          {/* Klausul 2: Spesifikasi Layanan */}
          <tr>
            <td colSpan={6} className="text-justify leading-snug">
              <div>
                <span className="font-bold">Spesifikasi Layanan:</span> Termasuk
                pengiriman sampai ke lokasi {transaction.lokasiNama}
              </div>
              <div>{transaction.lokasiAlamat}</div>
            </td>
          </tr>

          {/* Klausul 3: Prioritas TKDN */}
          <tr>
            <td colSpan={6} className="text-justify leading-snug">
              <div>Prioritas TKDN, PPK/PP memilih dengan urutan/prioritas:</div>
              <ol className="list-[lower-alpha] pl-5 my-0.5 space-y-0">
                <li>Produk dalam negeri dengan nilai TKDN paling sedikit 25%;</li>
                <li>Produk dalam negeri dengan nilai TKDN kurang dari 25%;</li>
                <li>produk dengan label PDN namun belum mempunyai nilai TKDN;</li>
                <li>Produk impor;</li>
                <li>Menggunakan metode lain selain E-purchasing Katalog.</li>
              </ol>
              <div>
                Berdasarkan urutan/prioritas diatas, barang/jasa yang ditetapkan memiliki
                nilai TKDN <span className="font-bold">{transaction.nilaiTKDN}</span>,
                dengan alasan {transaction.alasanTKDN}.
              </div>
            </td>
          </tr>

          {/* Klausul 4: Referensi Harga & Rancangan Kontrak */}
          <tr>
            <td colSpan={6} className="text-justify leading-snug">
              <div>
                Referensi harga yang berfungsi sebagai referensi untuk melakukan Negosiasi
                Harga sebagaimana terlampir.
              </div>
              <div>
                Rancangan kontrak ditetapkan menggunakan Surat Pesanan sebagaimana
                terlampir atau jika tidak ada maka menggunakan Surat Pesanan sesuai yang
                tertuang di aplikasi E-purchasing.
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-justify mb-2 leading-snug">
        Demikian Dokumen Persiapan Pengadaan ini dibuat untuk digunakan sebagai dasar
        pelaksanaan pengadaan. Pelaksanaan pengadaan berdasarkan prioritas penggunaan
        produk dalam negeri dan prioritas penggunaan produk dari penyedia dengan
        kualifikasi usaha kecil serta koperasi.
      </p>

      <div className="flex justify-between items-end mt-1">
        <div className="text-[9pt]">
          <div>Tembusan :</div>
          <div>Yth. Sdr. {master.tembusan.jabatan}</div>
          <div className="pl-12">{master.tembusan.instansi}.</div>
        </div>

        <div className="w-[290px] text-[9.5pt] text-left">
          <div>
            {[master.ppk.jabatanPrefix, master.ppk.jabatan].filter(Boolean).join(' ')}
          </div>
          <div>selaku</div>
          <div>Pejabat Pembuat Komitmen</div>
          <div className="h-12" />
          <div className="font-bold underline">{master.ppk.nama}</div>
          <div>{master.ppk.pangkat}</div>
          <div>NIP {master.ppk.nip}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 5. KERANGKA ACUAN KERJA (KAK)
 */
export const Doc5KAK: React.FC<DocProps> = ({ master, transaction, summary }) => {
  return (
    <div className="doc-page text-[10pt] leading-[1.35] text-black">
      <KopSurat master={master} />

      <div className="text-center font-bold text-[10.5pt] uppercase mb-3 leading-snug">
        <div>KERANGKA ACUAN KERJA (KAK)</div>
        <div>{transaction.namaPaket}</div>
        <div>
          {master.dinasName} KABUPATEN MALANG
        </div>
        <div>TAHUN ANGGARAN {transaction.tahunAnggaran}</div>
      </div>

      <table className="doc-table w-full border-collapse text-[9.5pt] mb-3">
        <tbody>
          <tr>
            <td className="w-[32px] text-center align-top">1.</td>
            <td className="w-[155px] align-top">Latar Belakang :</td>
            <td className="align-top text-justify space-y-1.5">
              <div>
                <div className="font-bold">Gambaran Umum</div>
                <div>{transaction.kakLatarBelakang}</div>
              </div>
              <div>
                <div className="font-bold">Lokasi Pekerjaan</div>
                <div>{transaction.lokasiNama}</div>
                <div>{transaction.lokasiAlamat}</div>
              </div>
              <div>
                <div className="font-bold">Permasalahan</div>
                <div>{transaction.kakPermasalahan || '-'}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-center align-top">2.</td>
            <td className="align-top">Maksud dan Tujuan :</td>
            <td className="align-top text-justify space-y-1.5">
              <div>
                <div className="font-bold">Maksud</div>
                <div>{transaction.kakMaksud}</div>
              </div>
              <div>
                <div className="font-bold">Tujuan</div>
                <div>{transaction.kakTujuan}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-center align-top">3.</td>
            <td className="align-top">Target / Sasaran :</td>
            <td className="align-top text-justify">{transaction.kakTargetSasaran}</td>
          </tr>
          <tr>
            <td className="text-center align-top">4.</td>
            <td className="align-top">
              <div>Nama Organisasi :</div>
            </td>
            <td className="align-top space-y-1">
              <div>
                <div className="font-semibold">a. K/L/D/I</div>
                <div className="pl-4">{master.organisasiKLDI}</div>
              </div>
              <div>
                <div className="font-semibold">b. SKPD</div>
                <div className="pl-4">{master.organisasiSKPD}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-center align-top">5.</td>
            <td className="align-top">
              <div>Sumber Dana dan :</div>
              <div>Perkiraan Biaya</div>
            </td>
            <td className="align-top space-y-1">
              <div>
                <div className="font-semibold">a. Sumber Dana</div>
                <div className="pl-4">{transaction.sumberDanaKAK}</div>
              </div>
              <div>
                <div className="font-semibold">b. Perkiraan Biaya</div>
                <div className="pl-4">
                  Jumlah Total{' '}
                  <span className="font-bold">{formatRupiahDoc(summary.totalPagu)}</span>{' '}
                  (<span className="italic">{summary.terbilangPagu}</span>)
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-center align-top">6.</td>
            <td className="align-top">
              <div>Jangka Waktu :</div>
              <div>Pelaksanaan Pekerjaan</div>
            </td>
            <td className="align-top">{transaction.jangkaWaktuHari} Hari Kalender</td>
          </tr>
          <tr>
            <td className="text-center align-top">7.</td>
            <td className="align-top">Keterangan :</td>
            <td className="align-top">
              <div className="font-semibold mb-0.5">Kode Rekening</div>
              {transaction.kategoriRekening.map((kr, idx) => (
                <div key={kr.id}>
                  {kr.namaRekening} {kr.kodeRekening}
                  {idx < transaction.kategoriRekening.length - 1 ? ';' : '.'}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-[290px] text-[9.5pt] text-left">
          <div>
            {[master.ppk.jabatanPrefix, master.ppk.jabatan].filter(Boolean).join(' ')}
          </div>
          <div>selaku</div>
          <div>Pejabat Pembuat Komitmen</div>
          <div className="h-14" />
          <div className="font-bold underline">{master.ppk.nama}</div>
          <div>{master.ppk.pangkat}</div>
          <div>NIP {master.ppk.nip}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 6. RENCANA ANGGARAN DAN BIAYA (RAB)
 */
export const Doc6RAB: React.FC<DocProps> = ({ master, transaction, summary }) => {
  return (
    <div className="doc-page text-[10pt] leading-[1.35] text-black">
      <KopSurat master={master} />

      <div className="text-center font-bold text-[11.5pt] underline mb-3">
        RENCANA ANGGARAN DAN BIAYA (RAB)
      </div>

      <table className="w-full border-collapse mb-3 text-[10pt] font-bold">
        <tbody>
          <tr>
            <td className="w-[155px] align-top py-0.5 font-bold">Paket Pekerjaan</td>
            <td className="w-[15px] align-top py-0.5 font-bold">:</td>
            <td className="align-top py-0.5 font-bold">
              {toTitleCaseIndo(transaction.namaPaket)}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5 font-bold">Lokasi</td>
            <td className="w-[15px] align-top py-0.5 font-bold">:</td>
            <td className="align-top py-0.5 font-bold">
              {toTitleCaseIndo(master.lokasiDefaultSingkat || 'Malang')}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5 font-bold">Sumber Dana</td>
            <td className="w-[15px] align-top py-0.5 font-bold">:</td>
            <td className="align-top py-0.5 font-bold">
              {toTitleCaseIndo(transaction.sumberDanaAPBD || 'APBD')}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5 font-bold">Tahun Anggaran</td>
            <td className="w-[15px] align-top py-0.5 font-bold">:</td>
            <td className="align-top py-0.5 font-bold">{transaction.tahunAnggaran}</td>
          </tr>
        </tbody>
      </table>

      <table className="doc-table w-full border-collapse text-[10pt] mb-4">
        <thead>
          <tr className="font-bold text-center">
            <th className="w-[40px]">NO</th>
            <th>URAIAN</th>
            <th className="w-[115px]">VOLUME</th>
            <th className="w-[155px]">HARGA SATUAN</th>
            <th className="w-[155px]">JUMLAH</th>
          </tr>
        </thead>
        <tbody>
          {summary.groups.map((grp) => (
            <React.Fragment key={grp.kategori}>
              <tr>
                <td />
                <td colSpan={4} className="font-bold">
                  {grp.kategori}
                </td>
              </tr>
              {grp.items.map(({ globalIndex, item, subtotalPenetapan }) => (
                <tr key={item.id}>
                  <td className="text-center">{globalIndex}</td>
                  <td>{item.namaBarang}</td>
                  <td className="text-center">
                    {formatItemVolumeSatuan(item)}
                  </td>
                  <td className="text-right">
                    {formatRupiahDoc(item.hargaPenetapanSatuan)}
                  </td>
                  <td className="text-right">{formatRupiahDoc(subtotalPenetapan)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          <tr className="font-bold">
            <td colSpan={4} className="text-center">
              JUMLAH (termasuk PPN + Ongkos Kirim)
            </td>
            <td className="text-right">{formatRupiahDoc(summary.totalPenetapan)}</td>
          </tr>
          <tr>
            <td colSpan={5} className="font-bold italic">
              Terbilang : {summary.terbilangPenetapan}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end mt-4">
        <div className="w-[290px] text-[10pt] text-left">
          <div>
            {[master.ppk.jabatanPrefix, master.ppk.jabatan].filter(Boolean).join(' ')}
          </div>
          <div>selaku</div>
          <div>Pejabat Pembuat Komitmen</div>
          <div className="h-16" />
          <div className="font-bold underline">{master.ppk.nama}</div>
          <div>{master.ppk.pangkat}</div>
          <div>NIP {master.ppk.nip}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 7. SPESIFIKASI TEKNIS PAKET E-PURCHASING
 */
export const Doc7SpekTeknis: React.FC<DocProps> = ({ master, transaction }) => {
  const items = transaction.items;
  return (
    <div className="doc-page text-[9.5pt] leading-[1.3] text-black">
      <KopSurat master={master} />

      <div className="text-center font-bold text-[11pt] underline mb-2.5">
        SPESIFIKASI TEKNIS PAKET E-PURCHASING
      </div>

      <table className="w-full border-collapse mb-2.5 text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-[140px] align-top py-0.5">Program</td>
            <td className="w-[14px] align-top py-0.5">:</td>
            <td className="align-top py-0.5">{transaction.program}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Kegiatan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">{transaction.kegiatan}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Sub Kegiatan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 text-justify">{transaction.subKegiatan}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Lokasi</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>{transaction.lokasiNama}</div>
              <div>{transaction.lokasiAlamat}.</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Nama paket pengadaan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-medium">{transaction.namaPaket}.</td>
          </tr>
        </tbody>
      </table>

      <table className="doc-table w-full border-collapse text-[9.5pt] mb-3">
        <thead>
          <tr className="font-bold text-center">
            <th className="w-[38px]">No.</th>
            <th className="w-[175px]">Elemen Spesifikasi</th>
            <th>Uraian Spesifikasi</th>
            <th className="w-[125px]">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {/* 1. Mutu / kualitas */}
          {items.map((item, idx) => (
            <tr key={`mutu-${item.id}`}>
              <td className="text-center align-top">{idx === 0 ? '1.' : ''}</td>
              <td className="align-top">{idx === 0 ? 'Mutu / kualitas' : ''}</td>
              <td className="align-top">{item.namaBarang}</td>
              <td className="align-top">{item.keteranganSpesifikasi || ''}</td>
            </tr>
          ))}

          {/* 2. Jumlah / Kuantitas */}
          {items.map((item, idx) => (
            <tr key={`qty-${item.id}`}>
              <td className="text-center align-top">{idx === 0 ? '2.' : ''}</td>
              <td className="align-top">{idx === 0 ? 'Jumlah / Kuantitas' : ''}</td>
              <td className="align-top">
                {formatItemVolumeSatuan(item)}
              </td>
              <td className="align-top"></td>
            </tr>
          ))}

          {/* 3. Tempat */}
          <tr>
            <td className="text-center align-top">3.</td>
            <td className="align-top">Tempat</td>
            <td className="align-top">
              <div>{transaction.lokasiNama}</div>
              <div>{transaction.lokasiAlamat}</div>
            </td>
            <td className="align-top"></td>
          </tr>

          {/* 4. Waktu */}
          <tr>
            <td className="text-center align-top">4.</td>
            <td className="align-top">Waktu</td>
            <td className="align-top">{transaction.jangkaWaktuHari} Hari Kalender</td>
            <td className="align-top"></td>
          </tr>

          {/* 5. Tingkat Layanan */}
          <tr>
            <td className="text-center align-top">5.</td>
            <td className="align-top">Tingkat Layanan</td>
            <td className="align-top">
              Produk diantarkan ke {transaction.lokasiNama} {transaction.lokasiAlamat}
            </td>
            <td className="align-top"></td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-[290px] text-[9.5pt] text-left">
          <div>
            {[master.ppk.jabatanPrefix, master.ppk.jabatan].filter(Boolean).join(' ')}
          </div>
          <div>selaku</div>
          <div>Pejabat Pembuat Komitmen</div>
          <div className="h-14" />
          <div className="font-bold underline">{master.ppk.nama}</div>
          <div>{master.ppk.pangkat}</div>
          <div>NIP {master.ppk.nip}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 8. RIWAYAT SURVEI HARGA
 */
export const Doc8RiwayatSurvei: React.FC<DocProps> = ({
  master,
  transaction,
  summary,
}) => {
  return (
    <div className="doc-page doc-page-landscape text-[8.5pt] leading-[1.25] text-black">
      <div className="text-center font-bold text-[10.5pt] uppercase mb-2.5 leading-snug">
        <div>RIWAYAT SURVEI HARGA</div>
        <div>{master.dinasName} KABUPATEN MALANG</div>
        <div>TAHUN ANGGARAN {transaction.tahunAnggaran}</div>
      </div>

      <table className="w-full border-collapse mb-2 text-[9pt] font-bold">
        <tbody>
          <tr>
            <td className="w-[130px] align-top py-0">Nama Pekerjaan</td>
            <td className="w-[15px] align-top py-0">:</td>
            <td className="align-top py-0">{transaction.namaPaket}</td>
          </tr>
          <tr>
            <td className="align-top py-0">Pagu Anggaran</td>
            <td className="align-top py-0">:</td>
            <td className="align-top py-0">{formatRupiahDoc(summary.totalPagu)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-2 text-[8.5pt] font-bold space-y-0.5">
        {transaction.kategoriRekening.map((kr) => (
          <div key={kr.id}>
            <div>{kr.namaRekening}</div>
            <div>{kr.kodeRekening}</div>
          </div>
        ))}
      </div>

      <table className="doc-table w-full border-collapse text-[8pt] mb-3">
        <thead>
          <tr className="font-bold text-center">
            <th rowSpan={2} className="w-[28px]">
              No.
            </th>
            <th rowSpan={2}>JENIS BARANG</th>
            <th rowSpan={2} className="w-[38px]">
              VOL
            </th>
            <th rowSpan={2} className="w-[44px]">
              SAT
            </th>
            <th colSpan={2}>PAGU ANGGARAN (termasuk pajak)</th>
            <th colSpan={2}>SURVEI I</th>
            <th colSpan={2}>SURVEI II</th>
            <th rowSpan={2} className="w-[105px]">
              PENETAPAN HARGA PENAWARAN
            </th>
          </tr>
          <tr className="font-bold text-center">
            <th className="w-[88px]">HARGA SATUAN</th>
            <th className="w-[95px]">JUMLAH</th>
            <th className="w-[88px]">HARGA SATUAN</th>
            <th className="w-[95px]">JUMLAH</th>
            <th className="w-[88px]">HARGA SATUAN</th>
            <th className="w-[95px]">JUMLAH</th>
          </tr>
        </thead>
        <tbody>
          {summary.flatItems.map(
            ({
              globalIndex,
              item,
              subtotalPagu,
              subtotalPenetapan,
              subtotalSurvei1,
              subtotalSurvei2,
            }) => (
              <React.Fragment key={item.id}>
                {/* Baris Nama Penyedia Survei I dan Survei II */}
                <tr>
                  <td colSpan={6} />
                  <td colSpan={2} className="text-center font-bold uppercase text-[7.5pt]">
                    {item.toko1.namaToko}
                  </td>
                  <td colSpan={2} className="text-center font-bold uppercase text-[7.5pt]">
                    {item.toko2.namaToko}
                  </td>
                  <td />
                </tr>
                {/* Baris Harga Item */}
                <tr>
                  <td className="text-center">{globalIndex}</td>
                  <td>{item.namaBarang}</td>
                  <td className="text-center">{formatItemVolume(item)}</td>
                  <td className="text-center">{formatItemSatuan(item)}</td>
                  <td className="text-right">{formatRupiahDoc(item.hargaPaguSatuan)}</td>
                  <td className="text-right">{formatRupiahDoc(subtotalPagu)}</td>
                  <td className="text-right">
                    {formatRupiahDoc(item.toko1.hargaSatuan)}
                  </td>
                  <td className="text-right">{formatRupiahDoc(subtotalSurvei1)}</td>
                  <td className="text-right">
                    {formatRupiahDoc(item.toko2.hargaSatuan)}
                  </td>
                  <td className="text-right">{formatRupiahDoc(subtotalSurvei2)}</td>
                  <td className="text-right font-semibold">
                    {formatRupiahDoc(subtotalPenetapan)}
                  </td>
                </tr>
              </React.Fragment>
            )
          )}
          <tr className="font-bold">
            <td colSpan={5} className="text-center">
              Jumlah
            </td>
            <td className="text-right">{formatRupiahDoc(summary.totalPagu)}</td>
            <td />
            <td />
            <td />
            <td />
            <td className="text-right">{formatRupiahDoc(summary.totalPenetapan)}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-[270px] text-[9pt] text-left">
          <div>
            {[master.ppk.jabatanPrefix, master.ppk.jabatan].filter(Boolean).join(' ')}
          </div>
          <div>selaku</div>
          <div>Pejabat Pembuat Komitmen</div>
          <div className="h-12" />
          <div className="font-bold underline">{master.ppk.nama}</div>
          <div>{master.ppk.pangkat}</div>
          <div>NIP {master.ppk.nip}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 9. LAMPIRAN SURVEI HARGA
 */
export const Doc9LampiranSurvei: React.FC<DocProps> = ({
  master,
  transaction,
  summary,
}) => {
  return (
    <div className="doc-page text-[9pt] leading-[1.3] text-black">
      <div className="text-center font-bold text-[10.5pt] uppercase mb-3 leading-snug">
        <div>LAMPIRAN SURVEI HARGA</div>
        <div>{master.dinasName} KABUPATEN MALANG</div>
        <div>TAHUN ANGGARAN {transaction.tahunAnggaran}</div>
      </div>

      <div className="space-y-4">
        {summary.flatItems.map(({ globalIndex, item }) => (
          <table
            key={item.id}
            className="doc-table w-full border-collapse text-[8.5pt] break-inside-avoid"
          >
            <thead>
              <tr className="font-bold text-center">
                <th className="w-[42px]">No.</th>
                <th className="w-[130px]">JENIS BARANG</th>
                <th className="w-[215px]">DOKUMENTASI</th>
                <th className="w-[105px]">TANGGAL SURVEI</th>
                <th>LINK SURVEI</th>
              </tr>
            </thead>
            <tbody>
              {/* Survei a (Toko 1) */}
              <tr>
                <td className="text-center align-top font-semibold">{globalIndex}.a.</td>
                <td className="align-top">{item.namaBarang}</td>
                <td className="align-top text-center p-2">
                  <div className="font-bold uppercase mb-1.5 text-[8pt]">
                    {item.toko1.namaToko}
                  </div>
                  {item.toko1.gambarUrl ? (
                    <img
                      src={item.toko1.gambarUrl}
                      alt={`${item.namaBarang} - ${item.toko1.namaToko}`}
                      className="max-h-[135px] max-w-[175px] object-contain mx-auto border border-slate-200 rounded bg-white p-0.5"
                    />
                  ) : (
                    <div className="h-[90px] flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs">
                      Belum ada foto produk
                    </div>
                  )}
                </td>
                <td className="text-center align-middle">
                  {formatTanggalIndo(item.toko1.tanggalSurvei, true)}
                </td>
                <td className="align-middle break-all">
                  {item.toko1.link ? (
                    <a
                      href={item.toko1.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 underline"
                    >
                      {item.toko1.link}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>

              {/* Survei b (Toko 2) */}
              <tr>
                <td className="text-center align-top font-semibold">{globalIndex}.b.</td>
                <td className="align-top">{item.namaBarang}</td>
                <td className="align-top text-center p-2">
                  <div className="font-bold uppercase mb-1.5 text-[8pt]">
                    {item.toko2.namaToko}
                  </div>
                  {item.toko2.gambarUrl ? (
                    <img
                      src={item.toko2.gambarUrl}
                      alt={`${item.namaBarang} - ${item.toko2.namaToko}`}
                      className="max-h-[135px] max-w-[175px] object-contain mx-auto border border-slate-200 rounded bg-white p-0.5"
                    />
                  ) : (
                    <div className="h-[90px] flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs">
                      Belum ada foto produk
                    </div>
                  )}
                </td>
                <td className="text-center align-middle">
                  {formatTanggalIndo(item.toko2.tanggalSurvei, true)}
                </td>
                <td className="align-middle break-all">
                  {item.toko2.link ? (
                    <a
                      href={item.toko2.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 underline"
                    >
                      {item.toko2.link}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        ))}
      </div>

      <div className="mt-3 text-[8.5pt] leading-snug">
        <div className="font-semibold">Keterangan :</div>
        <div>1. Survey bisa dilakukan lebih dari 2 sumber data</div>
        <div>
          2. Penetapan harga referensi ditetapkan oleh PPK dapat menggunakan harga
          terendah hasil survey/harga rata2/harga tertinggi dengan dasar pertimbangan yang
          dapat dipertanggungjawabkan
        </div>
      </div>
    </div>
  );
};
