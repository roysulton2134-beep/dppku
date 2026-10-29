# SI-DPP E-Purchasing — Otomatisasi 9 Dokumen Pengadaan (Dispora Kab. Malang)

Aplikasi web berbasis client-side untuk mengotomatisasi penyusunan **9 Dokumen Persiapan Pengadaan (DPP) E-Purchasing / Toko Daring (Mbizmarket)** sesuai tata naskah dinas **Dinas Pemuda dan Olahraga Kabupaten Malang**.

## Fitur Utama
1. **Master Data Instansi (Tersimpan di LocalStorage)**
   - Mode KOP Surat ganda: **Teks Dinamis + Logo Daerah** atau **Gambar Banner KOP Penuh**.
   - Pengaturan Pejabat Penandatangan (PPK / Plt. Kepala Dinas, Pejabat Pengadaan, Kabid Sarpras).
   - Dasar Hukum Standar & Program/Kegiatan/Lokasi Default.
2. **Form Input Transaksi Ringkas (Sekali Input)**
   - Agenda & Penomoran (Surat Permohonan, Surat Tugas, DPP, Kode RUP SiRUP, Jadwal Pelaksanaan).
   - Tabel Dinamis Item Barang beserta **Data Survei 2 Toko Pembanding (Mbizmarket)** dan upload screenshot/foto produk.
   - Engine Otomatisasi Real-Time: Subtotal per barang, Total Pagu & HPS, konversi angka ke **Terbilang Rupiah**, dan tanggal ke **Ejaan Bahasa Indonesia Resmi**.
3. **Live Preview & Ekspor 9 Dokumen Resmi (A4)**
   - `1. Checklist Kelengkapan Permohonan Pengadaan`
   - `2. Surat Permohonan Pengadaan Langsung`
   - `3. Surat Tugas PPK`
   - `4. Dokumen Persiapan Pengadaan (DPP)`
   - `5. Kerangka Acuan Kerja (KAK)`
   - `6. Rencana Anggaran Biaya (RAB)`
   - `7. Spesifikasi Teknis Paket E-Purchasing`
   - `8. Riwayat Survei Harga`
   - `9. Lampiran Survei Harga (Katalog Foto Produk & Tautan)`
4. **Ekspor Multi-Format**
   - **Cetak / Print PDF A4** (`@media print` dengan margin standar kedinasan & `page-break-after: always`)
   - **Download Word (`.docx`)**
   - **Simpan & Muat Draft (`.json` & Multi-Slot Browser `LocalStorage`)**

## Cara Menjalankan
```bash
npm install
npm run dev
```
