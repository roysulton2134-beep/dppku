import React from 'react';
import { MasterData, TransactionData } from '../../types/procurement';
import {
  ComputedProcurementSummary,
  formatItemVolumeSatuan,
  formatItemVolume,
  formatItemSatuan,
} from '../../utils/calculations';
import {
  angkaKeTerbilang,
  formatRupiahDec2,
  formatRupiahDoc,
  formatTanggalIndo,
  formatTanggalSlash,
  tanggalKeEjaanResmi,
} from '../../utils/terbilang';
import { KopSurat } from './KopSurat';

interface ContractDocProps {
  master: MasterData;
  transaction: TransactionData;
  summary: ComputedProcurementSummary;
}

/**
 * Header Kotak Berbingkai Standar untuk KPP, BAHP, BAST, dan BAPP
 */
const BeritaAcaraBoxHeader: React.FC<{
  kegiatan: string;
  subKegiatan: string;
  pekerjaan: string;
  lokasi: string;
  judulDokumen: string;
  nomor: string;
  tanggal: string;
  lampiran: string;
  serif?: boolean;
}> = ({
  kegiatan,
  subKegiatan,
  pekerjaan,
  lokasi,
  judulDokumen,
  nomor,
  tanggal,
  lampiran,
}) => {
  return (
    <table
      className="w-full border-collapse border-2 border-black mb-3 text-[9pt] leading-tight"
    >
      <tbody>
        <tr>
          <td className="w-[52%] border border-black p-2 align-top text-center">
            <div className="font-bold uppercase text-[9.5pt]">KEGIATAN</div>
            <div className="mb-1.5 text-[8.5pt]">{kegiatan}</div>
            <div className="font-bold uppercase text-[9.5pt]">SUB KEGIATAN</div>
            <div className="text-[8.5pt]">{subKegiatan}</div>
          </td>
          <td className="w-[48%] border border-black p-2 align-middle text-center">
            <div className="font-bold uppercase text-[11pt] tracking-wide px-2">
              {judulDokumen}
            </div>
          </td>
        </tr>
        <tr>
          <td className="border border-black p-2 align-top">
            <table className="w-full border-collapse text-[8.5pt]">
              <tbody>
                <tr>
                  <td className="w-[62px] align-top py-0.5">Pekerjaan</td>
                  <td className="w-[10px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{pekerjaan}</td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Lokasi</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{lokasi}</td>
                </tr>
              </tbody>
            </table>
          </td>
          <td className="border border-black p-2 align-top">
            <table className="w-full border-collapse text-[8.5pt]">
              <tbody>
                <tr>
                  <td className="w-[62px] align-top py-0.5">Nomor</td>
                  <td className="w-[10px] align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{nomor}</td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Tanggal</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="align-top py-0.5">
                    {tanggal ? formatTanggalIndo(tanggal) : ''}
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Lampiran</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="align-top py-0.5">{lampiran}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

/**
 * 10. SURAT PESANAN (SP) - KONTRAK E-PURCHASING
 */
export const Doc10SuratPesanan: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');
  const tglKirimIndo = formatTanggalIndo(k.tanggalSelesaiKerja);
  const tglKirimSlash = formatTanggalSlash(k.tanggalSelesaiKerja);

  const renderSignatureBlock = () => (
    <div className="mt-4 pt-2 break-inside-avoid">
      <p className="mb-3 text-justify">
        Demikian SP ini dibuat dan ditandatangani dalam 2 (dua) rangkap bermaterai dan
        masing-masing memiliki kekuatan hukum yang sama.
      </p>
      <table className="w-full border-collapse text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top p-1">
              <div className="w-[260px] text-left">
                <div>{jabatanKadis}</div>
                <div>Kabupaten Malang</div>
                <div>selaku</div>
                <div>Pejabat Pembuat Komitmen</div>
                <div className="h-20" />
                <div className="font-bold underline">{ppk.nama}</div>
                <div>{ppk.pangkat}</div>
                <div>NIP. {ppk.nip}</div>
              </div>
            </td>
            <td className="w-1/2 align-top p-1">
              <div className="w-[240px] ml-auto text-left">
                <div>Penyedia</div>
                <div className="h-[36px]" />
                <div>{k.namaPerusahaan}</div>
                <div className="h-20" />
                <div className="font-bold underline">{k.namaDirektur}</div>
                <div>{k.jabatanDirektur}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="doc-page text-[9.5pt] leading-[1.32] text-black">
      <KopSurat master={master} />

      <div className="text-center font-bold text-[11pt] mb-2">SURAT PESANAN</div>

      {/* Tabel Header Kotak SP */}
      <table className="doc-table w-full border-collapse mb-3 text-[9.5pt]">
        <tbody>
          <tr>
            <td
              rowSpan={2}
              className="w-[46%] text-center align-middle font-bold text-[10.5pt]"
            >
              SURAT PESANAN (SP)
            </td>
            <td className="p-2">
              <div>
                Satuan Kerja Pejabat Penandatangan / Pengesahan Tanda Bukti Perjanjian :
              </div>
              <div className="font-bold uppercase">
                {master.dinasName} KABUPATEN MALANG
              </div>
            </td>
          </tr>
          <tr>
            <td className="p-2">
              <div>Nomor : {k.nomorSP}</div>
              <div>Tanggal : {formatTanggalIndo(k.tanggalSP)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mb-2">Yang bertanda tangan di bawah ini :</div>

      <div className="mb-2">
        <div className="font-bold">{ppk.nama}</div>
        <div>{jabatanKadis}</div>
        <div>{master.organisasiSKPD}</div>
        <div>{master.alamat}</div>
      </div>

      <div className="mb-2">selanjutnya disebut sebagai Pejabat Pembuat Komitmen;</div>

      <div className="mb-2">
        <div className="font-bold">{k.namaDirektur}</div>
        <div>
          {k.jabatanDirektur} {k.namaPerusahaan}
        </div>
        <div>{k.alamatPerusahaan}</div>
      </div>

      <div className="mb-2">selanjutnya disebut sebagai Penyedia;</div>

      <div className="mb-2">
        untuk mengirimkan barang dengan memperhatikan ketentuan-ketentuan sebagai berikut
        :
      </div>

      <div className="mb-1">Rincian Barang</div>
      <div className="font-bold mb-1">Daftar Produk PAKET</div>

      {/* Tabel Produk Kontrak / SP */}
      <table className="doc-table w-full border-collapse text-[8.5pt] mb-2">
        <thead>
          <tr className="font-bold text-center">
            <th>Nama Produk</th>
            <th className="w-[68px]">Kuantitas</th>
            <th className="w-[42px]">Mata Uang</th>
            <th className="w-[98px]">Harga Satuan</th>
            <th className="w-[52px]">Harga Kirim</th>
            <th className="w-[82px]">Tanggal Pengiriman Produk</th>
            <th className="w-[108px]">Total Harga</th>
          </tr>
        </thead>
        <tbody>
          {summary.groups.map((grp) => (
            <React.Fragment key={grp.kategori}>
              <tr>
                <td colSpan={7} className="font-bold">
                  {grp.kategori}
                </td>
              </tr>
              {grp.items.map(
                ({ item, hargaKontrakSatuan, subtotalKontrak }) => (
                  <tr key={item.id}>
                    <td>{item.namaBarang}</td>
                    <td className="text-center font-medium">
                      {formatItemVolumeSatuan(item)}
                    </td>
                    <td className="text-center">Rp.</td>
                    <td className="text-right">
                      {formatRupiahDec2(hargaKontrakSatuan)}
                    </td>
                    <td className="text-center">
                      Rp. {item.ongkosKirimKontrak || 0}
                    </td>
                    <td className="text-center">{tglKirimIndo}</td>
                    <td className="text-right">{formatRupiahDec2(subtotalKontrak)}</td>
                  </tr>
                )
              )}
            </React.Fragment>
          ))}
          <tr>
            <td colSpan={6} className="text-right pr-2">
              Jumlah
            </td>
            <td className="text-right">
              {formatRupiahDoc(summary.jumlahKontrakSebelumPPN)}
            </td>
          </tr>
          <tr>
            <td colSpan={6} className="text-right pr-2">
              PPn {summary.ppnPersen}%
            </td>
            <td className="text-right">{formatRupiahDoc(summary.ppnKontrak)}</td>
          </tr>
          <tr className="font-bold">
            <td colSpan={6} className="text-right pr-2">
              TOTAL
            </td>
            <td className="text-right">{formatRupiahDoc(summary.totalNilaiKontrak)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-1 border-b border-black pb-1">
        Terbilang : {summary.terbilangKontrak}
      </div>
      <div className="mb-3">
        Keterangan : Sudah termasuk beban pajak yang berlaku dan ongkos kirim
      </div>

      {/* SYARAT DAN KETENTUAN (20 PASAL) */}
      <div className="space-y-2 text-[9pt] text-justify leading-snug">
        <div className="font-semibold">SYARAT DAN KETENTUAN :</div>

        <div>
          <div className="font-medium">1. Hak dan Kewajiban</div>
          <div className="pl-4 space-y-1">
            <div>
              <div>a. Penyedia</div>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>
                  Penyedia memiliki hak menerima pembayaran atas pembelian barang sesuai
                  dengan total harga dan waktu yang tercantum di dalam SP ini.
                </li>
                <li>
                  Penyedia memiliki kewajiban:
                  <ol className="list-[lower-alpha] pl-5 space-y-0.5">
                    <li>
                      tidak membuat dan/atau menyampaikan dokumen dan/atau keterangan lain
                      yang tidak benar untuk memenuhi persyaratan Katalog Elektronik;
                    </li>
                    <li>
                      tidak menjual barang melalui e-Purchasing lebih mahal dari harga
                      barang yang dijual selain melalui e-Purchasing pada periode
                      penjualan, jumlah, dan tempat serta spesifikasi teknis dan
                      persyaratan yang sama;
                    </li>
                    <li>
                      mengirimkan barang sesuai spesifikasi dalam SP ini
                      selambat-lambatnya pada ({tglKirimSlash}) sejak SP ini diterima oleh
                      Penyedia;
                    </li>
                    <li>
                      bertanggungjawab atas keamanan, kualitas, dan kuantitas barang yang
                      dipesan;
                    </li>
                    <li>
                      mengganti barang setelah Pejabat Penandatangan/Pengesahan Tanda
                      Bukti Perjanjian melalui Pejabat/Panitia Penerima Hasil Pekerjaan
                      (PPHP) melakukan pemeriksaan barang dan menemukan bahwa:
                      <ol className="list-decimal pl-5">
                        <li>barang rusak akibat cacat produksi;</li>
                        <li>
                          barang rusak pada saat pengiriman barang hingga barang diterima
                          oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian;
                          dan/atau
                        </li>
                        <li>
                          barang yang diterima tidak sesuai dengan spesifikasi barang
                          sebagaimana tercantum pada SP ini.
                        </li>
                      </ol>
                    </li>
                    <li>
                      memberikan layanan tambahan yang diperjanjikan seperti instalasi,
                      testing, dan pelatihan (apabila ada);
                    </li>
                    <li>
                      memberikan layanan purnajual sesuai dengan ketentuan garansi
                      masing-masing barang.
                    </li>
                  </ol>
                </li>
              </ol>
            </div>

            <div>
              <div>b. PEJABAT PENANDATANGAN/PENGESAHAN TANDA BUKTI PERJANJIAN</div>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>
                  Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian memiliki hak:
                  <ol className="list-[lower-alpha] pl-5 space-y-0.5">
                    <li>
                      menerima barang dari Penyedia sesuai dengan spesifikasi yang
                      tercantum di dalam SP ini.
                    </li>
                    <li>
                      mendapatkan jaminan keamanan, kualitas, dan kuantitas barang yang
                      dipesan;
                    </li>
                    <li>
                      mendapatkan penggantian barang, dalam hal:
                      <ol className="list-decimal pl-5">
                        <li>barang rusak akibat cacat produksi;</li>
                        <li>
                          barang rusak pada saat pengiriman barang hingga barang diterima
                          oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian;
                          dan/atau
                        </li>
                        <li>
                          barang yang diterima tidak sesuai dengan spesifikasi barang
                          sebagaimana tercantum pada SP ini.
                        </li>
                      </ol>
                    </li>
                    <li>
                      Mendapatkan layanan tambahan yang diperjanjikan seperti instalasi,
                      testing, dan pelatihan (apabila ada);
                    </li>
                    <li>
                      Mendapatkan layanan purnajual sesuai dengan ketentuan garansi
                      masing-masing barang.
                    </li>
                  </ol>
                </li>
                <li>
                  Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian memiliki
                  kewajiban:
                  <ol className="list-[lower-alpha] pl-5">
                    <li>
                      melakukan pembayaran sesuai dengan total harga yang tercantum di
                      dalam SP ini; dan
                    </li>
                    <li>memeriksa kualitas dan kuantitas barang;</li>
                    <li>
                      memastikan layanan tambahan telah dilaksanakan oleh penyedia seperti
                      instalasi, testing, dan pelatihan (apabila ada).
                    </li>
                  </ol>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <div>
          <div>2. Waktu Pengiriman Barang</div>
          <div className="pl-4">
            Penyedia mengirimkan barang dan melaksanakan layanan sesuai spesifikasi dalam
            SP ini selambat-lambatnya pada ({tglKirimSlash}) sejak SP ini diterima oleh
            Penyedia.
          </div>
        </div>

        <div>
          <div>3. Alamat Pengiriman Barang</div>
          <div className="pl-4">
            <div>Penyedia mengirimkan barang ke alamat sebagai berikut:</div>
            <div>{transaction.lokasiNama}</div>
            <div>{transaction.lokasiAlamat}</div>
          </div>
        </div>

        <div>
          <div>4. Tanggal Barang Diterima</div>
          <div className="pl-4">Barang diterima pada ({tglKirimSlash})</div>
        </div>

        <div>
          <div>5. Penerimaan, Pemeriksaan, dan Retur Barang</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian melalui PPHP
              menerima barang dan melakukan pemeriksaan barang berdasarkan ketentuan di
              dalam SP ini.
            </li>
            <li>
              Dalam hal pada saat pemeriksaan barang, Pejabat Penandatangan/Pengesahan
              Tanda Bukti Perjanjian menemukan bahwa:
              <ol className="list-decimal pl-5">
                <li>barang rusak akibat cacat produksi;</li>
                <li>
                  barang rusak pada saat pengiriman barang hingga barang diterima oleh
                  Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian; dan/atau
                </li>
                <li>
                  barang yang diterima tidak sesuai dengan spesifikasi barang sebagaimana
                  tercantum pada SP ini.
                </li>
              </ol>
              Maka Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat menolak
              penerimaan barang dan menyampaikan pemberitahuan tertulis kepada Penyedia
              atas cacat mutu atau kerusakan barang tersebut.
            </li>
            <li>
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat meminta Tim
              Teknis untuk melakukan pemeriksaan atau uji mutu terhadap barang yang
              diterima.
            </li>
            <li>
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat memerintahkan
              Penyedia untuk menemukan dan mengungkapkan cacat mutu serta melakukan
              pengujian terhadap barang yang dianggap Pejabat Penandatangan/Pengesahan
              Tanda Bukti Perjanjian mengandung cacat mutu atau kerusakan.
            </li>
            <li>
              Penyedia bertanggungjawab atas cacat mutu atau kerusakan barang dengan
              memberikan penggantian barang.
            </li>
          </ol>
        </div>

        <div>
          <div>6. Harga</div>
          <ol className="list-decimal pl-8 space-y-0.5">
            <li>
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian membayar kepada
              Penyedia atas pelaksanaan pekerjaan sebesar harga yang tercantum pada SP
              ini.
            </li>
            <li>
              Harga SP telah memperhitungkan keuntungan, pajak, biaya overhead, biaya
              pengiriman, biaya asuransi, biaya layanan tambahan (apabila ada) dan biaya
              layanan purna jual.
            </li>
            <li>
              Rincian harga SP sesuai dengan rincian yang tercantum dalam daftar kuantitas
              dan harga.
            </li>
          </ol>
        </div>

        <div>
          <div>7. Perpajakan</div>
          <div className="pl-4">
            Penyedia berkewajiban untuk membayar semua pajak, bea, retribusi, dan pungutan
            lain yang sah yang dibebankan oleh hukum yang berlaku atas pelaksanaan SP.
            Semua pengeluaran perpajakan ini dianggap telah termasuk dalam harga SP.
          </div>
        </div>

        <div>
          <div>8. Pengalihan dan/atau subkontrak</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Pengalihan seluruh Kontrak hanya diperbolehkan dalam hal terdapat pergantian
              nama Penyedia, baik sebagai akibat peleburan (merger), konsolidasi, atau
              pemisahan.
            </li>
            <li>
              Pengalihan sebagian pelaksanaan Kontrak dilakukan dengan ketentuan sebagai
              berikut:
              <ol className="list-decimal pl-5">
                <li>
                  Pengalihan sebagian pelaksanaan Kontrak untuk barang/jasa yang bersifat
                  standar dilakukan untuk pekerjaan seperti pengiriman barang (distribusi
                  barang) dari Penyedia kepada Kementerian/Lembaga/Satuan Kerja Perangkat
                  Daerah/Institusi; dan
                </li>
                <li>
                  Pengalihan sebagian pelaksanaan Kontrak dapat dilakukan untuk
                  barang/jasa yang bersifat tidak standar misalnya untuk pekerjaan
                  konstruksi (minor), pengadaan ambulans, ready mix, hot mix dan lain
                  sebagainya.
                </li>
              </ol>
            </li>
          </ol>
        </div>

        <div>
          <div>9. Perubahan SP</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>SP hanya dapat diubah melalui adendum SP.</li>
            <li>
              Perubahan SP dapat dilakukan apabila disetujui oleh para pihak dalam hal
              terjadi perubahan jadwal pengiriman barang atas permintaan Pejabat
              Penandatangan/Pengesahan Tanda Bukti Perjanjian atau permohonan Penyedia
              yang disepakati oleh Pejabat Penandatangan/Pengesahan Tanda Bukti
              Perjanjian.
            </li>
          </ol>
        </div>

        <div>
          <div>10. Peristiwa Kompensasi</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Peristiwa Kompensasi dapat diberikan kepada penyedia dalam hal Pejabat
              Penandatangan/Pengesahan Tanda Bukti Perjanjian terlambat melakukan
              pembayaran prestasi pekerjaan kepada Penyedia.
            </li>
            <li>
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dikenakan ganti rugi
              atas keterlambatan pembayaran sebesar.
            </li>
          </ol>
        </div>

        <div>
          <div>11. Hak Atas Kekayaan Intelektual</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Penyedia berkewajiban untuk memastikan bahwa barang yang dikirimkan/dipasok
              tidak melanggar Hak Atas Kekayaan Intelektual (HAKI) pihak manapun dan dalam
              bentuk apapun.
            </li>
            <li>
              Penyedia berkewajiban untuk menanggung Pejabat Penandatangan/Pengesahan
              Tanda Bukti Perjanjian dari atau atas semua tuntutan, tanggung jawab,
              kewajiban, kehilangan, kerugian, denda, gugatan atau tuntutan hukum, proses
              pemeriksaan hukum, dan biaya yang dikenakan terhadap Pejabat
              Penandatangan/Pengesahan Tanda Bukti Perjanjian sehubungan dengan klaim atas
              pelanggaran HAKI, termasuk pelanggaran hak cipta, merek dagang, hak paten,
              dan bentuk HAKI lainnya yang dilakukan atau diduga dilakukan oleh Penyedia.
            </li>
          </ol>
        </div>

        <div>
          <div>12. Jaminan Bebas Cacat Mutu/Garansi</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Penyedia dengan jaminan pabrikan dari produsen pabrikan (jika ada)
              berkewajiban untuk menjamin bahwa selama penggunaan secara wajar oleh
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian, Barang tidak
              mengandung cacat mutu yang disebabkan oleh tindakan atau kelalaian Penyedia,
              atau cacat mutu akibat desain, bahan, dan cara kerja.
            </li>
            <li>
              Jaminan bebas cacat mutu ini berlaku sampai dengan 90 (Sembilan Puluh) hari
              setelah serah terima Barang atau jangka waktu lain yang ditetapkan dalam SP
              ini.
            </li>
            <li>
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian akan menyampaikan
              pemberitahuan cacat mutu kepada Penyedia segera setelah ditemukan cacat mutu
              tersebut selama Masa Layanan Purnajual.
            </li>
            <li>
              Terhadap pemberitahuan cacat mutu oleh Pejabat Penandatangan/Pengesahan
              Tanda Bukti Perjanjian, Penyedia berkewajiban untuk memperbaiki atau
              mengganti Barang dalam jangka waktu yang ditetapkan dalam pemberitahuan
              tersebut.
            </li>
            <li>
              Jika Penyedia tidak memperbaiki atau mengganti Barang akibat cacat mutu
              dalam jangka waktu yang ditentukan, maka Pejabat Penandatangan/Pengesahan
              Tanda Bukti Perjanjian akan menghitung biaya perbaikan yang diperlukan dan
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian secara langsung atau
              melalui pihak ketiga yang ditunjuk oleh Pejabat Penandatangan/Pengesahan
              Tanda Bukti Perjanjian akan melakukan perbaikan tersebut. Penyedia
              berkewajiban untuk membayar biaya perbaikan atau penggantian tersebut sesuai
              dengan klaim yang diajukan secara tertulis oleh Pejabat
              Penandatangan/Pengesahan Tanda Bukti Perjanjian. Biaya tersebut dapat
              dipotong oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dari
              nilai tagihan Penyedia.
            </li>
          </ol>
        </div>

        <div>
          <div>13. Pembayaran</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              pembayaran prestasi hasil pekerjaan yang disepakati dilakukan oleh Pejabat
              Penandatangan/Pengesahan Tanda Bukti Perjanjian, dengan ketentuan:
              <ol className="list-decimal pl-5">
                <li>penyedia telah mengajukan tagihan;</li>
                <li>pembayaran dilakukan dengan menggunakan slip transfer; dan</li>
                <li>pembayaran harus dipotong denda (apabila ada) dan pajak.</li>
              </ol>
            </li>
            <li>
              pembayaran terakhir hanya dilakukan setelah pekerjaan selesai 100% (seratus
              perseratus) dan bukti penyerahan pekerjaan diterbitkan.
            </li>
            <li>
              Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian melakukan proses
              pembayaran atas pembelian barang selambat-lambatnya 7 (Tujuh) hari kerja
              setelah PPK menilai bahwa dokumen pembayaran lengkap dan sah.
            </li>
          </ol>
        </div>

        <div>
          <div>14. Sanksi</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Penyedia dikenakan sanksi apabila:
              <ol className="list-decimal pl-5">
                <li>
                  Tidak menanggapi pesanan barang selambat-lambatnya 3 (Tiga) hari kerja;
                </li>
                <li>
                  Tidak dapat memenuhi pesanan sesuai dengan kesepakatan dalam transaksi
                  melalui e-Purchasing dan SP ini tanpa disertai alasan yang dapat
                  diterima; dan/atau
                </li>
                <li>
                  menjual barang melalui proses e-Purchasing dengan harga yang lebih mahal
                  dari harga Barang/Jasa yang dijual selain melalui e-Purchasing pada
                  periode penjualan, jumlah, dan tempat serta spesifikasi teknis dan
                  persyaratan yang sama.
                </li>
              </ol>
            </li>
            <li>
              Penyedia yang melakukan perbuatan sebagaimana dimaksud dalam huruf a
              dikenakan sanksi administratif berupa:
              <ol className="list-decimal pl-5">
                <li>peringatan tertulis;</li>
                <li>denda; dan</li>
                <li>
                  pelaporan kepada LKPP untuk dilakukan:
                  <ol className="list-[lower-alpha] pl-5">
                    <li>
                      penghentian sementara dalam sistem transaksi e-Purchasing; atau
                    </li>
                    <li>
                      penurunan pencantuman dari Katalog Elektronik (e-Catalogue).
                    </li>
                  </ol>
                </li>
              </ol>
            </li>
            <li>
              <div>Tata Cara Pengenaan Sanksi</div>
              <div>
                Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian mengenakan sanksi
                sebagaimana dimaksud dalam huruf a dan huruf b berdasarkan ketentuan
                mengenai sanksi sebagaimana diatur dalam Peraturan Kepala LKPP tentang
                e-Purchasing.
              </div>
            </li>
          </ol>
        </div>

        <div>
          <div>15. Penghentian dan Pemutusan SP</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Penghentian SP dapat dilakukan karena pekerjaan sudah selesai atau terjadi
              Keadaan Kahar.
            </li>
            <li>
              Pemutusan SP oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian
              <ol className="list-decimal pl-5">
                <li>
                  Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat melakukan
                  pemutusan SP apabila:
                  <ol className="list-[lower-alpha] pl-5">
                    <li>
                      kebutuhan barang/jasa tidak dapat ditunda melebihi batas berakhirnya
                      SP;
                    </li>
                    <li>
                      berdasarkan penelitian Pejabat Penandatangan/Pengesahan Tanda Bukti
                      Perjanjian, Penyedia tidak akan mampu menyelesaikan keseluruhan
                      pekerjaan walaupun diberikan kesempatan sampai dengan 7 (Tujuh) hari
                      kalender sejak masa berakhirnya pelaksanaan pekerjaan untuk
                      menyelesaikan pekerjaan;
                    </li>
                    <li>
                      setelah diberikan kesempatan menyelesaikan pekerjaan sampai dengan 7
                      (Tujuh) hari kalender sejak masa berakhirnya pelaksanaan pekerjaan,
                      Penyedia Barang/Jasa tidak dapat menyelesaikan pekerjaan;
                    </li>
                    <li>
                      Penyedia lalai/cidera janji dalam melaksanakan kewajibannya dan
                      tidak memperbaiki kelalaiannya dalam jangka waktu yang telah
                      ditetapkan;
                    </li>
                    <li>
                      Penyedia terbukti melakukan KKN, kecurangan dan/atau pemalsuan dalam
                      proses Pengadaan yang diputuskan oleh instansi yang berwenang;
                      dan/atau
                    </li>
                    <li>
                      pengaduan tentang penyimpangan prosedur, dugaan KKN dan/atau
                      pelanggaran persaingan sehat dalam pelaksanaan pengadaan dinyatakan
                      benar oleh instansi yang berwenang.
                    </li>
                  </ol>
                </li>
                <li>
                  Pemutusan SP sebagaimana dimaksud pada angka 1) dilakukan
                  selambat-lambatnya 7 (Tujuh) hari kerja setelah Pejabat
                  Penandatangan/Pengesahan Tanda Bukti Perjanjian menyampaikan
                  pemberitahuan rencana pemutusan SP secara tertulis kepada Penyedia.
                </li>
              </ol>
            </li>
            <li>
              Pemutusan SP oleh Penyedia
              <ol className="list-decimal pl-5">
                <li>
                  Penyedia dapat melakukan pemutusan Kontrak jika terjadi hal-hal sebagai
                  berikut:
                  <ol className="list-[lower-alpha] pl-5">
                    <li>
                      akibat keadaan kahar sehingga Penyedia tidak dapat melaksanakan
                      pekerjaan sesuai ketentuan SP atau adendum SP;
                    </li>
                    <li>
                      Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian gagal
                      mematuhi keputusan akhir penyelesaian perselisihan; atau
                    </li>
                    <li>
                      Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian tidak
                      memenuhi kewajiban sebagaimana dimaksud dalam SP atau Adendum SP.
                    </li>
                  </ol>
                </li>
                <li>
                  Pemutusan SP sebagaimana dimaksud pada angka 1) dilakukan
                  selambat-lambatnya 7 (Tujuh) kerja setelah Penyedia menyampaikan
                  pemberitahuan rencana pemutusan SP secara tertulis kepada Pejabat
                  Penandatangan/Pengesahan Tanda Bukti Perjanjian.
                </li>
              </ol>
            </li>
          </ol>
        </div>

        <div>
          <div>16. Denda Keterlambatan Pelaksanaan Pekerjaan</div>
          <div className="pl-4">
            Penyedia yang terlambat menyelesaikan pekerjaan dalam jangka waktu sebagaimana
            ditetapkan dalam SP ini karena kesalahan Penyedia, dikenakan denda
            keterlambatan sebesar 1/1000 (satu perseribu) dari total harga atau dari
            sebagian total harga sebagaimana tercantum dalam SP ini untuk setiap hari
            keterlambatan.
          </div>
        </div>

        <div>
          <div>17. Keadaan Kahar</div>
          <ol className="list-[lower-alpha] pl-8 space-y-0.5">
            <li>
              Keadaan Kahar adalah suatu keadaan yang terjadi diluar kehendak para pihak
              dan tidak dapat diperkirakan sebelumnya, sehingga kewajiban yang ditentukan
              dalam SP menjadi tidak dapat dipenuhi.
            </li>
            <li>
              Dalam hal terjadi Keadaan Kahar, Penyedia memberitahukan tentang terjadinya
              Keadaan Kahar kepada Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian
              secara tertulis dalam waktu selambat-lambatnya 14 (empat belas) hari
              kalender sejak terjadinya Keadaan Kahar yang dikeluarkan oleh pihak/instansi
              yang berwenang sesuai ketentuan peraturan perundang-undangan.
            </li>
            <li>
              Tidak termasuk Keadaan Kahar adalah hal-hal merugikan yang disebabkan oleh
              perbuatan atau kelalaian para pihak.
            </li>
            <li>
              Keterlambatan pelaksanaan pekerjaan yang diakibatkan oleh terjadinya Keadaan
              Kahar tidak dikenakan sanksi.
            </li>
            <li>
              Setelah terjadinya Keadaan Kahar, para pihak dapat melakukan kesepakatan,
              yang dituangkan dalam perubahan SP.
            </li>
          </ol>
        </div>

        <div>
          <div>18. Penyelesaian Perselisihan</div>
          <div className="pl-4">
            Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dan penyedia
            berkewajiban untuk berupaya sungguh-sungguh menyelesaikan secara damai semua
            perselisihan yang timbul dari atau berhubungan dengan SP ini atau
            interpretasinya selama atau setelah pelaksanaan pekerjaan. Jika perselisihan
            tidak dapat diselesaikan secara musyawarah maka perselisihan akan diselesaikan
            melalui arbitrase, mediasi, konsiliasi atau pengadilan negeri dalam wilayah
            hukum Republik Indonesia.
          </div>
        </div>

        <div>
          <div>19. Larangan Pemberian Komisi</div>
          <div className="pl-4">
            Penyedia menjamin bahwa tidak satu pun personil satuan kerja Pejabat
            Penandatangan/Pengesahan Tanda Bukti Perjanjian telah atau akan menerima
            komisi dalam bentuk apapun (gratifikasi) atau keuntungan tidak sah lainnya
            baik langsung maupun tidak langsung dari SP ini. Penyedia menyetujui bahwa
            pelanggaran syarat ini merupakan pelanggaran yang mendasar terhadap SP ini.
          </div>
        </div>

        <div>
          <div>20. Masa Berlaku SP</div>
          <div className="pl-4">
            SP ini berlaku sejak tanggal SP ini ditandatangani oleh para pihak sampai
            dengan selesainya pelaksanaan pekerjaan.
          </div>
        </div>
      </div>

      {/* Lembar Tanda Tangan Tunggal (Tanpa Materai) */}
      {renderSignatureBlock()}
    </div>
  );
};

/**
 * 11. SURAT PERINTAH MULAI KERJA (SPMK)
 */
export const Doc11SPMK: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');
  const hariTerbilang = angkaKeTerbilang(k.waktuPenyelesaianHari || 5);

  return (
    <div
      className="doc-page text-[10pt] leading-[1.35] text-black"
    >
      <KopSurat master={master} />

      <div className="text-center mb-3">
        <div className="font-bold text-[11.5pt] underline">
          SURAT PERINTAH MULAI KERJA (SPMK)
        </div>
        <div className="font-bold text-[10pt]">Nomor : {k.nomorSPMK}</div>
        <div className="mt-1">Paket Pekerjaan :</div>
        <div className="font-bold">{transaction.namaPaket}</div>
        <div className="font-bold">Tahun Anggaran {transaction.tahunAnggaran}</div>
      </div>

      <div className="mb-1.5">Yang bertanda tangan dibawah ini :</div>
      <table className="w-full border-collapse mb-2.5 text-[10pt]">
        <tbody>
          <tr>
            <td className="w-[140px] align-top py-0.5">Nama</td>
            <td className="w-[15px] align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-bold">{ppk.nama}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Jabatan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              {jabatanKadis} Kabupaten Malang selaku Pejabat Pembuat Komitmen
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Alamat</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>{master.alamat}</div>
              <div>
                Selanjutnya disebut sebagai <span className="font-bold italic">Pengguna Jasa</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mb-2 text-justify">
        Berdasarkan Surat Perintah Kerja (SPK) Nomor : {k.nomorSP} tanggal{' '}
        {formatTanggalIndo(k.tanggalSP)}, bersama ini memerintahkan :
      </p>

      <table className="w-full border-collapse mb-2.5 text-[10pt]">
        <tbody>
          <tr>
            <td className="w-[140px] align-top py-0.5">Nama</td>
            <td className="w-[15px] align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-bold">{k.namaDirektur}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Jabatan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              {k.jabatanDirektur} {k.namaPerusahaan}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Alamat</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">{k.alamatPerusahaan}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Nilai Kontrak</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 text-justify">
              <div>
                <span className="font-bold">
                  {formatRupiahDoc(summary.totalNilaiKontrak)}
                </span>{' '}
                (<span className="italic">{summary.terbilangKontrak}</span>) termasuk PPN.
              </div>
              <div>
                selanjutnya disebut sebagai{' '}
                <span className="font-bold italic">Penyedia Jasa</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mb-1.5">
        Untuk segera memulai pelaksanaan pekerjaan dengan memperhatikan ketentuan -
        ketentuan sebagai berikut :
      </div>

      <table className="w-full border-collapse mb-4 text-[10pt]">
        <tbody>
          <tr>
            <td className="w-[165px] align-top py-0.5">Paket Pengadaan</td>
            <td className="w-[15px] align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-bold">{transaction.namaPaket}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Tanggal Mulai Kerja</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              {formatTanggalIndo(k.tanggalMulaiKerja)} s/d{' '}
              {formatTanggalIndo(k.tanggalSelesaiKerja)}.
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Syarat - syarat pekerjaan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              sesuai dengan Surat Perintah Kerja (SPK)
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Waktu penyelesaian</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              selama {k.waktuPenyelesaianHari} ({hariTerbilang}) Hari Kalender dan
              pekerjaan harus sudah selesai pada tanggal{' '}
              {formatTanggalIndo(k.tanggalSelesaiKerja)}.
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">Denda</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 text-justify">
              Terhadap setiap hari keterlambatan pelaksanaan / penyelesaian pekerjaan,
              Penyedia akan dikenakan Denda Keterlambatan sebesar 1/1000 (satu per seribu)
              dari Nilai Kontrak sebelum PPN sesuai dengan ketentuan dalam Syarat Umum
              SPK.
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-[10pt]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="w-[260px] text-left">
                <div className="h-[18px]" />
                <div className="font-bold">PENGGUNA JASA</div>
                <div>{jabatanKadis}</div>
                <div>Kabupaten Malang</div>
                <div>selaku</div>
                <div className="font-bold">Pejabat Pembuat Komitmen</div>
                <div className="h-16" />
                <div className="font-bold underline">{ppk.nama}</div>
                <div>{ppk.pangkat}</div>
                <div>NIP. {ppk.nip}</div>
              </div>
            </td>
            <td className="w-1/2 align-top">
              <div className="w-[250px] ml-auto text-left">
                <div>
                  {master.kotaPenetapan}, {formatTanggalIndo(k.tanggalSPMK)}
                </div>
                <div>Setuju dan sanggup melaksanakan</div>
                <div className="font-bold">PENYEDIA JASA</div>
                <div className="font-bold">{k.namaPerusahaan}</div>
                <div className="h-[84px]" />
                <div className="font-bold underline">{k.namaDirektur}</div>
                <div>{k.jabatanDirektur}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/**
 * 12. COVER SERTIFIKAT PEMBAYARAN
 */
export const Doc12SertifikatPembayaran: React.FC<ContractDocProps> = ({
  master,
  transaction,
}) => {
  const k = transaction.kontrak;
  return (
    <div
      className="doc-page text-black flex flex-col"
    >
      <div className="border-2 border-black flex-1 p-8 flex flex-col justify-between text-center min-h-[245mm]">
        <div className="space-y-4 pt-2">
          {master.logoUrl && (
            <img
              src={master.logoUrl}
              alt="Logo Kabupaten Malang"
              className="w-[115px] h-[135px] object-contain mx-auto"
            />
          )}

          <div className="text-[13pt] uppercase tracking-wide leading-snug pt-2">
            <div>{master.dinasName}</div>
            <div>KABUPATEN MALANG</div>
          </div>

          <div className="pt-4">
            <h1 className="text-[22pt] font-bold tracking-wider uppercase">
              SERTIFIKAT PEMBAYARAN
            </h1>
          </div>

          <div className="text-[12pt] font-bold leading-relaxed pt-1">
            <div>SURAT PESANAN (SP)</div>
            <div>Nomor : {k.nomorSP}</div>
            <div>Tanggal : {formatTanggalIndo(k.tanggalSP)}</div>
          </div>

          <div className="space-y-3 pt-3 text-[11.5pt] font-bold px-4">
            <div>
              <div>KEGIATAN :</div>
              <div>{transaction.kegiatan}</div>
            </div>

            <div>
              <div>SUB KEGIATAN :</div>
              <div>{transaction.subKegiatan}</div>
            </div>

            <div>
              <div>PEKERJAAN :</div>
              <div>{transaction.namaPaket}</div>
            </div>

            <div className="pt-1">TAHUN ANGGARAN {transaction.tahunAnggaran}</div>
          </div>
        </div>

        <div className="pt-6 pb-4">
          <div className="border-t border-black mb-4" />
          <div className="text-[12pt] font-bold mb-1">Pelaksana :</div>
          <div className="text-[12.5pt] font-bold mb-1">
            {k.namaPerusahaan}
          </div>
          <div className="text-[11.5pt]">{k.alamatPerusahaan}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 13. LAPORAN KEMAJUAN PEKERJAAN (KPP)
 */
export const Doc13LaporanKemajuanPekerjaan: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  return (
    <div
      className="doc-page text-[9.5pt] leading-[1.32] text-black"
    >
      <BeritaAcaraBoxHeader
        kegiatan={transaction.kegiatan}
        subKegiatan={transaction.subKegiatan}
        pekerjaan={transaction.namaPaket}
        lokasi={transaction.lokasiAlamat}
        judulDokumen="LAPORAN KEMAJUAN PEKERJAAN"
        nomor={k.nomorKPP}
        tanggal={k.tanggalKPP}
        lampiran="-"
      />

      <div className="mb-2">
        <div>1. Telah melaksanakan pekerjaan untuk :</div>
        <table className="w-full border-collapse ml-4 text-[9.5pt]">
          <tbody>
            <tr>
              <td className="w-[145px] align-top py-0.5">a. Pekerjaan</td>
              <td className="w-[12px] align-top py-0.5">:</td>
              <td className="align-top py-0.5">{transaction.namaPaket}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">b. Lokasi</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">{transaction.lokasiAlamat}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">c. Departemen/Instansi</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">{master.organisasiSKPD}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">d. SKPD</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">
                <div>Nomor : {k.nomorDPA}</div>
                <div>Tanggal : {k.tanggalDPA}</div>
              </td>
            </tr>
            <tr>
              <td className="align-top py-0.5">e. Pelaksana</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5 font-semibold">{k.namaPerusahaan}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">f. Surat Pesanan (SP)</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">
                <div>Nomor : {k.nomorSP}</div>
                <div>Tanggal : {formatTanggalIndo(k.tanggalSP)}</div>
                <div>
                  Biaya Pelaksanaan :{' '}
                  <span className="font-bold">
                    {formatRupiahDoc(summary.totalNilaiKontrak)}
                  </span>
                </div>
                <div className="italic">({summary.terbilangKontrak})</div>
              </td>
            </tr>
            <tr>
              <td className="align-top py-0.5">h. Waktu Pelaksanaan</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">
                <div>Tanggal selesai : {formatTanggalIndo(k.tanggalSelesaiKerja)}</div>
                <div>Jumlah hari : {k.waktuPenyelesaianHari} Hari Kalender</div>
                <div>Realisasi : Cepat ( ± )</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-1.5">
        2. Pelaksanaan Pekerjaan tersebut dengan prestasi sebagai berikut :
      </div>

      <table className="doc-table w-full border-collapse text-[9pt] mb-2">
        <thead>
          <tr>
            <th colSpan={6} className="text-center font-normal">
              Rincian Barang
            </th>
          </tr>
          <tr className="font-normal text-center">
            <th className="w-[34px]">No.</th>
            <th>Jenis Barang</th>
            <th className="w-[68px]">Kuantitas</th>
            <th className="w-[68px]">Satuan Ukuran</th>
            <th className="w-[115px]">Harga satuan</th>
            <th className="w-[120px]">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {summary.groups.map((grp) => (
            <React.Fragment key={grp.kategori}>
              <tr>
                <td colSpan={6} className="font-bold">
                  {grp.kategori}
                </td>
              </tr>
              {grp.items.map(
                ({ globalIndex, item, hargaKontrakSatuan, subtotalKontrak }) => (
                  <tr key={item.id}>
                    <td className="text-center">{globalIndex}.</td>
                    <td>{item.namaBarang}</td>
                    <td className="text-center">{formatItemVolume(item)}</td>
                    <td className="text-center">{formatItemSatuan(item)}</td>
                    <td className="text-right">
                      {formatRupiahDec2(hargaKontrakSatuan)}
                    </td>
                    <td className="text-right">{formatRupiahDec2(subtotalKontrak)}</td>
                  </tr>
                )
              )}
            </React.Fragment>
          ))}
          <tr>
            <td colSpan={5} className="text-right pr-2">
              Jumlah
            </td>
            <td className="text-right">
              {formatRupiahDoc(summary.jumlahKontrakSebelumPPN)}
            </td>
          </tr>
          <tr>
            <td colSpan={5} className="text-right pr-2">
              PPn {summary.ppnPersen}%
            </td>
            <td className="text-right">{formatRupiahDoc(summary.ppnKontrak)}</td>
          </tr>
          <tr className="font-bold">
            <td colSpan={5} className="text-right pr-2">
              TOTAL
            </td>
            <td className="text-right">{formatRupiahDoc(summary.totalNilaiKontrak)}</td>
          </tr>
          <tr>
            <td colSpan={6}>Terbilang : {summary.terbilangKontrak}</td>
          </tr>
          <tr>
            <td colSpan={6}>
              Keterangan : Sudah termasuk beban pajak yang berlaku dan ongkos kirim.
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mb-3">
        Kemajuan Pekerjaan telah mencapai prestasi sebesar 100% ( Seratus ) Prosen.
      </div>

      <p className="indent-8 mb-4">
        Demikian Laporan Kemajuan Pekerjaan ini dibuat dan ditanda
        tangani untuk dipergunakan sebagaimana mestinya.
      </p>

      <table className="w-full border-collapse text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="w-[260px] text-left">
                <div>Diperiksa Oleh :</div>
                <div>{master.kabid.jabatan}</div>
                <div>selaku</div>
                <div className="font-bold">Pejabat Pelaksana Teknis Kegiatan</div>
                <div className="h-16" />
                <div className="font-bold underline">{master.kabid.nama}</div>
                <div>{master.kabid.pangkat}</div>
                <div>NIP. {master.kabid.nip}</div>
              </div>
            </td>
            <td className="w-1/2 align-top">
              <div className="w-[250px] ml-auto text-left">
                <div className="mt-4">Penyedia Jasa</div>
                <div className="font-bold">{k.namaPerusahaan}</div>
                <div className="h-16" />
                <div className="font-bold underline">{k.namaDirektur}</div>
                <div>{k.jabatanDirektur}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/**
 * 14. BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAHP)
 */
export const Doc14BAHP: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');
  const ejaan = tanggalKeEjaanResmi(k.tanggalBAHP);

  return (
    <div className="doc-page text-[9.5pt] leading-[1.35] text-black">
      <BeritaAcaraBoxHeader
        kegiatan={transaction.kegiatan}
        subKegiatan={transaction.subKegiatan}
        pekerjaan={transaction.namaPaket}
        lokasi={transaction.lokasiAlamat}
        judulDokumen="BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN"
        nomor={k.nomorBAHP}
        tanggal={k.tanggalBAHP}
        lampiran="Laporan Kemajuan Pekerjaan"
      />

      <p className="text-justify mb-2.5">
        Pada hari ini <span className="font-bold">{ejaan.hari}</span>, Tanggal{' '}
        <span className="font-bold">{ejaan.tanggalTerbilang}</span> Bulan{' '}
        <span className="font-bold">{ejaan.bulan}</span> Tahun{' '}
        <span className="font-bold">{ejaan.tahunTerbilang}</span> bertempat di{' '}
        <span className="font-bold">{master.organisasiSKPD}</span>, kami yang bertanda -
        tangan dibawah ini :
      </p>

      {/* Pihak I, II, III */}
      <table className="w-full border-collapse mb-3 text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-[24px] align-top">I.</td>
            <td className="w-[95px] align-top">Nama</td>
            <td className="w-[12px] align-top">:</td>
            <td className="align-top font-bold">{ppk.nama}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {jabatanKadis} Kabupaten Malang selaku{' '}
              <span className="font-bold">Pejabat Pembuat Komitmen</span>
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top pb-2">Alamat Kantor</td>
            <td className="align-top pb-2">:</td>
            <td className="align-top pb-2">{master.alamat}</td>
          </tr>

          <tr>
            <td className="align-top">II.</td>
            <td className="align-top">Nama</td>
            <td className="align-top">:</td>
            <td className="align-top font-bold">{master.kabid.nama}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {master.kabid.jabatan} {master.organisasiSKPD} selaku{' '}
              <span className="font-bold">Pejabat Pelaksana Teknis Kegiatan</span>
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top pb-2">Alamat Kantor</td>
            <td className="align-top pb-2">:</td>
            <td className="align-top pb-2">{master.alamat}</td>
          </tr>

          <tr>
            <td className="align-top">III.</td>
            <td className="align-top">Nama</td>
            <td className="align-top">:</td>
            <td className="align-top font-bold">{k.namaDirektur}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {k.jabatanDirektur} {k.namaPerusahaan}
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Alamat Kantor</td>
            <td className="align-top">:</td>
            <td className="align-top">{k.alamatPerusahaan}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-2.5">
        <div>
          A. Telah mengadakan pemeriksaan dan penelitian atas kemajuan pelaksanaan :
        </div>
        <table className="w-full border-collapse ml-4 text-[9.5pt]">
          <tbody>
            <tr>
              <td className="w-[140px] align-top py-0.5">a. Pekerjaan</td>
              <td className="w-[12px] align-top py-0.5">:</td>
              <td className="align-top py-0.5">{transaction.namaPaket}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">b. Lokasi</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">{transaction.lokasiAlamat}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">c. Pelaksana</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5 font-semibold">{k.namaPerusahaan}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">d. Surat Pesanan (SP)</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">
                <div>Nomor : {k.nomorSP}</div>
                <div>Tanggal : {formatTanggalIndo(k.tanggalSP)}</div>
              </td>
            </tr>
            <tr>
              <td className="align-top py-0.5">e. Biaya Pelaksanaan</td>
              <td className="align-top py-0.5">:</td>
              <td className="align-top py-0.5">
                <div className="font-bold">
                  {formatRupiahDoc(summary.totalNilaiKontrak)}
                </div>
                <div className="italic">({summary.terbilangKontrak})</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-3">
        <div>B. Berdasarkan Pemeriksaan dan Penelitian tersebut terbukti bahwa :</div>
        <ol className="list-decimal pl-8 space-y-1 text-justify">
          <li>
            Penyedia Jasa telah melaksanakan pekerjaan hingga mencapai 100% (seratus
            prosen) sebagaimana tersebut pada Surat Pesanan (SP), atas pekerjaan{' '}
            {transaction.namaPaket}.
          </li>
          <li>
            Penyedia telah memenuhi seluruh kewajibannya sesuai dengan Syarat Umum Kontrak
            (SU) yang tercantum dalam Surat Pesanan (SP).
          </li>
        </ol>
      </div>

      <p className="indent-8 mb-4 text-justify">
        Demikian Berita Acara Pemeriksaan Hasil Pekerjaan ini dibuat dan
        ditanda-tangani untuk dipergunakan sebagaimana mestinya.
      </p>

      <table className="w-full border-collapse text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="w-[260px] text-left">
                <div>Menyetujui :</div>
                <div>{master.kabid.jabatan}</div>
                <div>selaku</div>
                <div className="font-bold">Pejabat Pelaksana Teknis Kegiatan</div>
                <div className="h-14" />
                <div className="font-bold underline">{master.kabid.nama}</div>
                <div>{master.kabid.pangkat}</div>
                <div>NIP. {master.kabid.nip}</div>
              </div>
            </td>
            <td className="w-1/2 align-top">
              <div className="w-[250px] ml-auto text-left">
                <div>Dibuat Oleh :</div>
                <div className="font-bold mt-1">{k.namaPerusahaan}</div>
                <div className="h-[74px]" />
                <div className="font-bold underline">{k.namaDirektur}</div>
                <div>{k.jabatanDirektur}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="pt-4">
              <div className="w-[260px] mx-auto text-left">
                <div>Mengetahui;</div>
                <div>{jabatanKadis}</div>
                <div>Kabupaten Malang</div>
                <div>selaku</div>
                <div className="font-bold">Pejabat Pembuat Komitmen</div>
                <div className="h-14" />
                <div className="font-bold underline">{ppk.nama}</div>
                <div>{ppk.pangkat}</div>
                <div>NIP. {ppk.nip}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/**
 * 15. BERITA ACARA SERAH TERIMA (BAST)
 */
export const Doc15BAST: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');
  const ejaan = tanggalKeEjaanResmi(k.tanggalBAST);

  return (
    <div className="doc-page text-[9.5pt] leading-[1.32] text-black">
      <BeritaAcaraBoxHeader
        kegiatan={transaction.kegiatan}
        subKegiatan={transaction.subKegiatan}
        pekerjaan={transaction.namaPaket}
        lokasi={transaction.lokasiAlamat}
        judulDokumen="BERITA ACARA SERAH TERIMA"
        nomor={k.nomorBAST}
        tanggal={k.tanggalBAST}
        lampiran="Berita Acara Pemeriksaan Hasil Pekerjaan"
      />

      <p className="text-justify mb-2">
        Pada hari ini <span className="font-bold">{ejaan.hari}</span>, Tanggal{' '}
        <span className="font-bold">{ejaan.tanggalTerbilang}</span> Bulan{' '}
        <span className="font-bold">{ejaan.bulan}</span> Tahun{' '}
        <span className="font-bold">{ejaan.tahunTerbilang}</span> bertempat di{' '}
        <span className="font-bold">{master.organisasiSKPD}</span>, kami yang bertanda -
        tangan dibawah ini :
      </p>

      <table className="w-full border-collapse mb-2 text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-[24px] align-top">I.</td>
            <td className="w-[95px] align-top">Nama</td>
            <td className="w-[12px] align-top">:</td>
            <td className="align-top font-bold">{ppk.nama}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {jabatanKadis} Kabupaten Malang selaku{' '}
              <span className="font-bold">Pejabat Pembuat Komitmen</span>
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top pb-1.5">Alamat Kantor</td>
            <td className="align-top pb-1.5">:</td>
            <td className="align-top pb-1.5">{master.alamat}</td>
          </tr>

          <tr>
            <td className="align-top">II.</td>
            <td className="align-top">Nama</td>
            <td className="align-top">:</td>
            <td className="align-top font-bold">{k.namaDirektur}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {k.jabatanDirektur} {k.namaPerusahaan}
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Alamat Kantor</td>
            <td className="align-top">:</td>
            <td className="align-top">{k.alamatPerusahaan}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-2">
        <div>berdasarkan :</div>
        <ol className="list-decimal pl-5 space-y-0.5">
          <li>
            <span className="font-bold">Surat Pesanan (SP)</span>
            <div>
              Nomor : {k.nomorSP} , tanggal {formatTanggalIndo(k.tanggalSP)}
            </div>
          </li>
          <li>
            <span className="font-bold">
              Berita Acara Pemeriksaan Hasil Pekerjaan
            </span>
            <div>
              Nomor : {k.nomorBAHP}, tanggal {formatTanggalIndo(k.tanggalBAHP)}
            </div>
          </li>
        </ol>
      </div>

      <p className="mb-2 text-justify">
        Dengan ini telah menyetujui dan bersepakat untuk melakukan{' '}
        <span className="font-bold">Serah Terima Pekerjaan</span> dengan
        ketentuan-ketentuan sebagai berikut :
      </p>

      <div className="text-center font-bold mb-1">Pasal 1</div>
      <p className="text-justify mb-1.5">
        Setelah mempelajari Berita Acara Pemeriksaan Hasil Pekerjaan,
        No. {k.nomorBAHP}, tanggal {formatTanggalIndo(k.tanggalBAHP)}, yang merupakan
        satu kesatuan dengan Berita Acara ini, maka{' '}
        <span className="font-bold">PENGGUNA JASA</span> menyatakan bahwa semua pekerjaan
        telah dilaksanakan dengan baik oleh <span className="font-bold">PENYEDIA JASA</span>{' '}
        yaitu :
      </p>

      <table className="w-full border-collapse mb-2 text-[9pt]">
        <tbody>
          <tr>
            <td className="w-[20px] align-top">1.</td>
            <td className="w-[125px] align-top">Kegiatan</td>
            <td className="w-[12px] align-top">:</td>
            <td className="align-top">{transaction.kegiatan}</td>
          </tr>
          <tr>
            <td className="align-top">2.</td>
            <td className="align-top">Sub Kegiatan</td>
            <td className="align-top">:</td>
            <td className="align-top">{transaction.subKegiatan}</td>
          </tr>
          <tr>
            <td className="align-top">3.</td>
            <td className="align-top">Pekerjaan</td>
            <td className="align-top">:</td>
            <td className="align-top">{transaction.namaPaket}</td>
          </tr>
          <tr>
            <td className="align-top">4.</td>
            <td className="align-top">Lokasi</td>
            <td className="align-top">:</td>
            <td className="align-top">{transaction.lokasiAlamat}</td>
          </tr>
          <tr>
            <td className="align-top">5.</td>
            <td className="align-top">Departemen/Instansi</td>
            <td className="align-top">:</td>
            <td className="align-top">{master.organisasiSKPD}</td>
          </tr>
          <tr>
            <td className="align-top">6.</td>
            <td className="align-top">SKPD</td>
            <td className="align-top">:</td>
            <td className="align-top">
              Nomor : {k.nomorDPA} / Tanggal : {k.tanggalDPA}
            </td>
          </tr>
          <tr>
            <td className="align-top">7.</td>
            <td className="align-top">Pelaksana</td>
            <td className="align-top">:</td>
            <td className="align-top font-semibold">{k.namaPerusahaan}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Biaya Pelaksanaan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              <div className="font-bold">
                {formatRupiahDoc(summary.totalNilaiKontrak)}
              </div>
              <div className="italic">({summary.terbilangKontrak})</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-center font-bold mb-1">Pasal 2</div>
      <p className="text-justify mb-2">
        <span className="font-bold">PENYEDIA JASA</span> menyerahkan hasil Pekerjaan
        kepada <span className="font-bold">PENGGUNA JASA</span>, dan{' '}
        <span className="font-bold">PENGGUNA JASA</span> menerima penyerahan pekerjaan
        dimaksud dari <span className="font-bold">PENYEDIA JASA</span>.
      </p>

      <div className="text-center font-bold mb-1">Pasal 3</div>
      <p className="text-justify mb-1.5">
        Sebagaimana dimaksud untuk kelengkapan Berita Acara Serah Terima ini, dilampirkan
        Berita Acara Pemeriksaan Hasil Pekerjaan.
      </p>
      <p className="text-justify mb-4">
        Demikian Berita Acara Serah Terima Pekerjaan ini dibuat dan
        ditanda-tangani pada tanggal tersebut diatas oleh kedua belah pihak dalam rangkap
        seperlunya.
      </p>

      <table className="w-full border-collapse text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="w-[260px] text-left">
                <div className="font-bold">PENGGUNA JASA</div>
                <div>{jabatanKadis}</div>
                <div>Kabupaten Malang</div>
                <div>
                  selaku <span className="font-bold">Pejabat Pembuat Komitmen</span>
                </div>
                <div className="h-14" />
                <div className="font-bold underline">{ppk.nama}</div>
                <div>{ppk.pangkat}</div>
                <div>NIP. {ppk.nip}</div>
              </div>
            </td>
            <td className="w-1/2 align-top">
              <div className="w-[250px] ml-auto text-left">
                <div className="font-bold">PENYEDIA JASA</div>
                <div className="font-bold mt-1">{k.namaPerusahaan}</div>
                <div className="h-[72px]" />
                <div className="font-bold underline">{k.namaDirektur}</div>
                <div>{k.jabatanDirektur}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/**
 * 16. BERITA ACARA PERSETUJUAN PEMBAYARAN (BAPP)
 */
export const Doc16BAPP: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');
  const ejaan = tanggalKeEjaanResmi(k.tanggalBAPP);

  return (
    <div className="doc-page text-[9.5pt] leading-[1.35] text-black">
      <BeritaAcaraBoxHeader
        kegiatan={transaction.kegiatan}
        subKegiatan={transaction.subKegiatan}
        pekerjaan={transaction.namaPaket}
        lokasi={transaction.lokasiAlamat}
        judulDokumen="BERITA ACARA PERSETUJUAN PEMBAYARAN"
        nomor={k.nomorBAPP}
        tanggal={k.tanggalBAPP}
        lampiran="Berita Acara Serah Terima"
      />

      <p className="text-justify mb-2.5">
        Pada hari ini <span className="font-bold">{ejaan.hari}</span>, Tanggal{' '}
        <span className="font-bold">{ejaan.tanggalTerbilang}</span> Bulan{' '}
        <span className="font-bold">{ejaan.bulan}</span> Tahun{' '}
        <span className="font-bold">{ejaan.tahunTerbilang}</span>, kami yang bertanda –
        tangan dibawah ini :
      </p>

      <table className="w-full border-collapse mb-3 text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-[24px] align-top">I.</td>
            <td className="w-[95px] align-top">Nama</td>
            <td className="w-[12px] align-top">:</td>
            <td className="align-top font-bold">{ppk.nama}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {jabatanKadis} Kabupaten Malang selaku{' '}
              <span className="font-bold">Pengguna Anggaran</span>
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top pb-2">Alamat Kantor</td>
            <td className="align-top pb-2">:</td>
            <td className="align-top pb-2">{master.alamat}</td>
          </tr>

          <tr>
            <td className="align-top">II.</td>
            <td className="align-top">Nama</td>
            <td className="align-top">:</td>
            <td className="align-top font-bold">{master.kabid.nama}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {master.kabid.jabatan} {master.organisasiSKPD} selaku{' '}
              <span className="font-bold">Pejabat Pelaksana Teknis Kegiatan</span>
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top pb-2">Alamat Kantor</td>
            <td className="align-top pb-2">:</td>
            <td className="align-top pb-2">{master.alamat}</td>
          </tr>

          <tr>
            <td className="align-top">III.</td>
            <td className="align-top">Nama</td>
            <td className="align-top">:</td>
            <td className="align-top font-bold">{k.namaDirektur}</td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Jabatan</td>
            <td className="align-top">:</td>
            <td className="align-top">
              {k.jabatanDirektur} {k.namaPerusahaan}
            </td>
          </tr>
          <tr>
            <td />
            <td className="align-top">Alamat Kantor</td>
            <td className="align-top">:</td>
            <td className="align-top">{k.alamatPerusahaan}</td>
          </tr>
          <tr>
            <td />
            <td colSpan={3} className="pt-0.5">
              Selanjutnya disebut sebagai <span className="font-bold">PENYEDIA JASA</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mb-3">
        <div className="font-bold mb-1">berdasarkan :</div>
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            <div className="font-bold">Surat Pesanan (SP) Kontrak</div>
            <div>
              Nomor : {k.nomorSP} , tanggal {formatTanggalIndo(k.tanggalSP)}
            </div>
          </li>
          <li>
            <div className="font-bold">
              Berita Acara Serah Terima Pekerjaan
            </div>
            <div>
              Nomor : {k.nomorBAST} , tanggal {formatTanggalIndo(k.tanggalBAST)}
            </div>
          </li>
        </ol>
      </div>

      <p className="text-justify mb-3 leading-relaxed">
        Berdasarkan Surat Pesanan (SP) pada Klausul Sistem Pembayaran dan Syarat Umum (SU)
        Nomor 13 perihal Pembayaran Prestasi Pekerjaan untuk mengajukan tagihan
        pembayaran, maka <span className="font-bold">PENYEDIA JASA</span> berhak atas
        pembayaran sebesar <span className="font-bold">100 %</span> dari harga kontrak.
      </p>

      <div className="mb-3 font-semibold">
        Termyn = {formatRupiahDoc(summary.totalNilaiKontrak)} X (100%) ={' '}
        <span className="font-bold">{formatRupiahDoc(summary.totalNilaiKontrak)}</span>
      </div>

      <div className="mb-4">
        <span className="font-bold">Terbilang : </span>
        <span className="italic">({summary.terbilangKontrak})</span>
      </div>

      <p className="indent-8 mb-5 text-justify">
        Demikian <span className="font-bold">Berita Acara Persetujuan Pembayaran (100%)</span>{' '}
        ini dibuat dan ditandatangani pada tanggal tersebut diatas, dalam rangkap
        secukupnya untuk dipergunakan sebagaimana mestinya.
      </p>

      <table className="w-full border-collapse text-[9.5pt]">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="w-[260px] text-left">
                <div className="font-bold">Mengetahui dan Menyetujui;</div>
                <div>{jabatanKadis}</div>
                <div>Kabupaten Malang</div>
                <div>selaku</div>
                <div className="font-bold">Pengguna Anggaran</div>
                <div className="h-16" />
                <div className="font-bold underline">{ppk.nama}</div>
                <div>{ppk.pangkat}</div>
                <div>NIP. {ppk.nip}</div>
              </div>
            </td>
            <td className="w-1/2 align-top">
              <div className="w-[250px] ml-auto text-left">
                <div className="font-bold">PENYEDIA JASA</div>
                <div className="font-bold mt-1">{k.namaPerusahaan}</div>
                <div className="h-[82px]" />
                <div className="font-bold underline">{k.namaDirektur}</div>
                <div>{k.jabatanDirektur}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/**
 * 17. RINGKASAN KONTRAK
 */
export const Doc17RingkasanKontrak: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');
  const uraianRingkas =
    k.uraianVolumeRingkasan ||
    transaction.items
      .map((it) => `${it.namaBarang} (${formatItemVolumeSatuan(it)})`)
      .join(', ');
  const ppnDisplay =
    k.autoCalcTax !== false
      ? formatRupiahDoc(summary.ppnKontrak)
      : k.potonganPPNText || formatRupiahDoc(summary.ppnKontrak);
  const pphDisplay =
    k.autoCalcTax !== false
      ? formatRupiahDoc(summary.pphKontrak)
      : k.potonganPPHText || formatRupiahDoc(summary.pphKontrak);
  const sumberDanaLengkap = (
    transaction.sumberDanaRAB ||
    transaction.sumberDanaKAK ||
    'Pendapatan Asli Daerah'
  )
    .replace(/\s*Tahun\s+Anggaran\s+\d{4}\s*$/i, '')
    .trim();

  return (
    <div
      className="doc-page text-[9.5pt] leading-[1.35] text-black"
    >
      <KopSurat master={master} />

      <div className="text-center font-bold text-[12pt] underline mb-2">
        RINGKASAN KONTRAK
      </div>

      <div className="mb-2">
        Untuk kegiatan yang dananya berasal dari {sumberDanaLengkap} Tahun Anggaran{' '}
        {transaction.tahunAnggaran} :
      </div>

      <table className="w-full border-collapse text-[9.5pt] mb-3">
        <tbody>
          <tr>
            <td className="w-[24px] align-top py-0.5">1.</td>
            <td className="w-[185px] align-top py-0.5">
              Dokumen Pelaksanaan Anggaran SKPD
            </td>
            <td className="w-[12px] align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>Nomor : {k.nomorDPA}</div>
              <div>Tanggal : {k.tanggalDPA}</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">2.</td>
            <td className="align-top py-0.5">Kode dan Uraian Program</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>{k.kodeProgram}</div>
              <div>{transaction.program}</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">3.</td>
            <td className="align-top py-0.5">Kode dan Uraian Kegiatan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>{k.kodeKegiatan}</div>
              <div>{transaction.kegiatan}</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">4.</td>
            <td className="align-top py-0.5">Kode dan Uraian Sub Kegiatan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>{k.kodeSubKegiatan}</div>
              <div className="text-justify">{transaction.subKegiatan}</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">5.</td>
            <td className="align-top py-0.5">Nama Rekanan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-semibold">
              {k.namaPerusahaan} ({k.namaDirektur})
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">6.</td>
            <td className="align-top py-0.5">Alamat Rekanan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">{k.alamatPerusahaan}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">7.</td>
            <td className="align-top py-0.5">Surat Pesanan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>Nomor : {k.nomorSP}</div>
              <div>Tanggal : {formatTanggalIndo(k.tanggalSP)}</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">8.</td>
            <td className="align-top py-0.5">Nilai Kontrak</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-bold italic">
              {formatRupiahDoc(summary.totalNilaiKontrak)}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">9.</td>
            <td className="align-top py-0.5">Beban Rekening</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              {transaction.kategoriRekening.map((kr, idx) => (
                <div key={kr.id}>
                  {kr.kodeRekening} {kr.namaRekening}
                  {idx < transaction.kategoriRekening.length - 1 ? ';' : ''}
                </div>
              ))}
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">10.</td>
            <td className="align-top py-0.5">Uraian dan Volume</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">{uraianRingkas}</td>
          </tr>
          <tr>
            <td className="align-top py-0.5">11.</td>
            <td className="align-top py-0.5">
              <div>Tata Cara Pembayaran</div>
              <div>Bank</div>
              <div>No. Rek</div>
              <div>NPWP</div>
            </td>
            <td className="align-top py-0.5">
              <div>:</div>
              <div>:</div>
              <div>:</div>
              <div>:</div>
            </td>
            <td className="align-top py-0.5">
              <div>{k.tataCaraPembayaran}</div>
              <div>{k.namaBank}</div>
              <div>{k.nomorRekeningBank}</div>
              <div>{k.npwpPenyedia}</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">12.</td>
            <td className="align-top py-0.5">Periode Pelaksanaan</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              {formatTanggalIndo(k.tanggalMulaiKerja)} s.d.{' '}
              {formatTanggalIndo(k.tanggalSelesaiKerja)} ({k.waktuPenyelesaianHari} Hari
              Kalender)
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">13.</td>
            <td className="align-top py-0.5">Berita Acara</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              Berita Acara Pemeriksaan dan Serah Terima Hasil Pekerjaan
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">14.</td>
            <td className="align-top py-0.5">Potongan Pajak</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5 font-bold">
              <div>PPN : {ppnDisplay}</div>
              <div>PPH : {pphDisplay}</div>
            </td>
          </tr>
          <tr>
            <td className="align-top py-0.5">15.</td>
            <td className="align-top py-0.5">Ketentuan Sanksi</td>
            <td className="align-top py-0.5">:</td>
            <td className="align-top py-0.5">
              <div>
                a. Denda keterlambatan 1/1000 (satu perseribu) dari biaya kontrak, apabila
                bagian pekerjaan belum diterima oleh PPKom.
              </div>
              <div>
                b. Pemutusan hubungan kontrak bila pihak Rekanan tidak dapat melaksanakan
                kewajiban.
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-[9.5pt] mt-2">
        <tbody>
          <tr>
            <td className="w-1/2 align-top">
              <div className="w-[260px] text-left">
                <div className="h-[18px]" />
                <div>Pejabat Penatausahaan Keuangan</div>
                <div className="h-14" />
                <div className="font-bold underline">
                  {master.ppkKeuangan.nama}
                </div>
                <div>{master.ppkKeuangan.pangkat}</div>
                <div>NIP. {master.ppkKeuangan.nip}</div>
              </div>
            </td>
            <td className="w-1/2 align-top">
              <div className="w-[250px] ml-auto text-left">
                <div>
                  Malang, {formatTanggalIndo(k.tanggalBAPP || k.tanggalBAST)}
                </div>
                <div>Pejabat Pelaksana Teknis Kegiatan</div>
                <div className="h-14" />
                <div className="font-bold underline">{master.kabid.nama}</div>
                <div>{master.kabid.pangkat}</div>
                <div>NIP. {master.kabid.nip}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="pt-4">
              <div className="w-[260px] mx-auto text-left">
                <div>Mengetahui :</div>
                <div className="font-bold">Pengguna Anggaran</div>
                <div>{jabatanKadis}</div>
                <div>Kabupaten Malang</div>
                <div className="h-14" />
                <div className="font-bold underline">{ppk.nama}</div>
                <div>{ppk.pangkat}</div>
                <div>NIP. {ppk.nip}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/**
 * 18. KUITANSI PEMBAYARAN (3 RANGKAP)
 */
export const Doc18Kuitansi: React.FC<ContractDocProps> = ({
  master,
  transaction,
  summary,
}) => {
  const k = transaction.kontrak;
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');

  const renderKuitansiSheet = (sheetIdx: number) => (
    <div
      key={sheetIdx}
      className={`doc-page text-[9.5pt] leading-[1.35] text-black ${
        sheetIdx > 1 ? 'break-before-page' : ''
      }`}
    >
      {/* Header Nomor Kuitansi & Kode Rekening */}
      <div className="flex justify-between items-start pb-2 mb-3 text-[9pt]">
        <div>
          No. Kuitansi : <span className="font-semibold">{k.nomorKuitansi}</span>
        </div>
        <div>
          <div className="flex gap-1">
            <span>Kode Rekening :</span>
            <div>
              {transaction.kategoriRekening.map((kr) => (
                <div key={kr.id}>- {kr.kodeRekening}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Isi Kuitansi */}
      <table className="w-full border-collapse mb-4 text-[10pt]">
        <tbody>
          <tr>
            <td className="w-[155px] align-top py-1.5">Sudah terima dari</td>
            <td className="w-[15px] align-top py-1.5">:</td>
            <td className="align-top py-1.5 font-bold uppercase">
              {master.pemkabName}
            </td>
          </tr>
          <tr>
            <td className="align-top py-1.5">Terbilang</td>
            <td className="align-top py-1.5">:</td>
            <td className="align-top py-1.5 italic font-semibold">
              #{summary.terbilangKontrak}#
            </td>
          </tr>
          <tr>
            <td className="align-top py-1.5">Untuk Pembayaran</td>
            <td className="align-top py-1.5">:</td>
            <td className="align-top py-1.5">
              <div>
                {transaction.namaPaket} ({transaction.sumberDanaSingkatKuitansi || 'PAD'})
              </div>
              <div>{k.tahunKuitansiLabel || transaction.tahunAnggaran}</div>
              <div className="mt-1">Dasar Pembayaran berdasarkan :</div>
              <div>Surat Tagihan</div>
              <div>Nomor : {k.nomorSuratTagihan}</div>
              <div>Tanggal : {formatTanggalIndo(k.tanggalSuratTagihan)}</div>
            </td>
          </tr>
          <tr>
            <td className="align-middle py-2 font-bold">Jumlah</td>
            <td className="align-middle py-2 font-bold">:</td>
            <td className="align-middle py-2">
              <span className="font-bold text-[11pt]">
                {formatRupiahDoc(summary.totalNilaiKontrak)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Yang Menerima (Penyedia) */}
      <div className="flex justify-end mb-4">
        <div className="w-[260px] text-left text-[9.5pt]">
          <div>Yang Menerima</div>
          <div className="font-bold">{k.namaPerusahaan}</div>
          <div className="h-16" />
          <div className="font-bold underline">{k.namaDirektur}</div>
          <div>{k.jabatanDirektur}</div>
        </div>
      </div>

      {/* Tabel Pejabat Keuangan, PPTK, Bendahara, dan Pengguna Anggaran */}
      <table className="doc-table w-full border-collapse text-[9pt] text-left">
        <tbody>
          <tr>
            <td className="w-1/3 align-top p-2.5 text-left">
              <div>Pejabat Penatausahaan</div>
              <div>Keuangan (PPK)</div>
              <div className="h-14" />
              <div className="font-bold underline">
                {master.ppkKeuangan.nama}
              </div>
              <div>NIP. {master.ppkKeuangan.nip}</div>
            </td>
            <td className="w-1/3 align-top p-2.5 text-left">
              <div>Pejabat Pelaksana Teknis</div>
              <div>Kegiatan (PPTK)</div>
              <div className="h-14" />
              <div className="font-bold underline">{master.kabid.nama}</div>
              <div>NIP. {master.kabid.nip}</div>
            </td>
            <td className="w-1/3 align-top p-2.5 text-left">
              <div>Bendahara Pengeluaran</div>
              <div className="h-[68px]" />
              <div className="font-bold underline">
                {master.bendahara.nama}
              </div>
              <div>NIP. {master.bendahara.nip}</div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="p-3">
              <div className="w-[250px] mx-auto text-left">
                <div>Mengetahui/Menyetujui</div>
                <div className="font-bold">Pengguna Anggaran</div>
                <div>{jabatanKadis}</div>
                <div className="h-14" />
                <div className="font-bold underline">{ppk.nama}</div>
                <div>{ppk.pangkat}</div>
                <div>NIP. {ppk.nip}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {renderKuitansiSheet(1)}
      {renderKuitansiSheet(2)}
      {renderKuitansiSheet(3)}
    </>
  );
};
