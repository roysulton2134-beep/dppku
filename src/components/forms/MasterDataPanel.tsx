import React from 'react';
import {
  Building2,
  FileText,
  Image as ImageIcon,
  MapPin,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import { MasterData } from '../../types/procurement';
import { DEFAULT_MASTER_DATA } from '../../data/defaultData';

interface MasterDataPanelProps {
  master: MasterData;
  onChange: (next: MasterData) => void;
  onApplyDefaultsToTransaction: () => void;
}

export const MasterDataPanel: React.FC<MasterDataPanelProps> = ({
  master,
  onChange,
  onApplyDefaultsToTransaction,
}) => {
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'bannerKopUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange({ ...master, [field]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const updateDasarHukum = (idx: number, val: string) => {
    const next = [...master.dasarHukum];
    next[idx] = val;
    onChange({ ...master, dasarHukum: next });
  };

  const addDasarHukum = () => {
    onChange({ ...master, dasarHukum: [...master.dasarHukum, ''] });
  };

  const removeDasarHukum = (idx: number) => {
    onChange({
      ...master,
      dasarHukum: master.dasarHukum.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Banner Info */}
      <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
        <div className="text-xs text-indigo-900">
          <span className="font-semibold block text-indigo-950">
            Master Data Instansi &amp; Pejabat (Tersimpan Otomatis di Browser)
          </span>
          Digunakan bersama untuk seluruh 18 dokumen (Tahap 1 DPP maupun Tahap 2 Kontrak,
          BAST &amp; Kuitansi).
        </div>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Kembalikan Pengaturan Master Data ke default Dispora Kabupaten Malang?'
              )
            ) {
              onChange(DEFAULT_MASTER_DATA);
            }
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Default
        </button>
      </div>

      {/* 1. KOP SURAT */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
            <Building2 className="w-4 h-4 text-indigo-600" />
            1. KOP Surat &amp; Identitas Instansi
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => onChange({ ...master, kopMode: 'dynamic' })}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                master.kopMode === 'dynamic'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Teks + Logo
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...master, kopMode: 'banner' })}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                master.kopMode === 'banner'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gambar Banner Penuh
            </button>
          </div>
        </div>

        {master.kopMode === 'banner' ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Banner Gambar KOP Surat Lengkap
            </label>
            {master.bannerKopUrl && (
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                <img
                  src={master.bannerKopUrl}
                  alt="Preview Banner KOP"
                  className="max-h-24 mx-auto object-contain"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                Upload Gambar Banner KOP
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'bannerKopUrl')}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...master, bannerKopUrl: '/sample-media/image1.png' })
                }
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Gunakan Banner Asli Dispora
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-3 flex flex-col items-center gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50">
              <img
                src={master.logoUrl}
                alt="Logo Daerah"
                className="w-16 h-20 object-contain"
              />
              <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer">
                <ImageIcon className="w-3 h-3" />
                Ganti Logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'logoUrl')}
                />
              </label>
            </div>
            <div className="sm:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Pemerintah Daerah (Baris 1)
                </label>
                <input
                  type="text"
                  value={master.pemkabName}
                  onChange={(e) => onChange({ ...master, pemkabName: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Nama OPD / Dinas (Baris 2)
                </label>
                <input
                  type="text"
                  value={master.dinasName}
                  onChange={(e) => onChange({ ...master, dinasName: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Alamat Lengkap KOP
                </label>
                <input
                  type="text"
                  value={master.alamat}
                  onChange={(e) => onChange({ ...master, alamat: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Telepon / Faksimile
                </label>
                <input
                  type="text"
                  value={master.telepon}
                  onChange={(e) => onChange({ ...master, telepon: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Laman Website
                </label>
                <input
                  type="text"
                  value={master.website}
                  onChange={(e) => onChange({ ...master, website: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Pos-el (Email)
                </label>
                <input
                  type="text"
                  value={master.email}
                  onChange={(e) => onChange({ ...master, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    value={master.kodePos}
                    onChange={(e) => onChange({ ...master, kodePos: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Kota Penetapan
                  </label>
                  <input
                    type="text"
                    value={master.kotaPenetapan}
                    onChange={(e) =>
                      onChange({ ...master, kotaPenetapan: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. PEJABAT PENANDATANGAN */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-semibold text-sm text-slate-800 border-b border-slate-100 pb-2.5">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          2. Pejabat Penandatangan (Tahap 1 DPP &amp; Tahap 2 Kontrak/BAST/Kuitansi)
        </div>

        {/* A. PPK / Kepala Dinas (Digunakan di Seluruh 18 Dokumen) */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
            A. PPK / Kepala Dinas (DPP, KAK, RAB, Kontrak SP, SPMK, BAHP, BAST, BAPP &amp; Kuitansi)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Awalan (Plt./Kosong)
              </label>
              <input
                type="text"
                placeholder="Plt."
                value={master.ppk.jabatanPrefix}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...master,
                    ppk: { ...master.ppk, jabatanPrefix: val },
                    penggunaAnggaran: {
                      ...master.penggunaAnggaran,
                      jabatanPrefix: val,
                    },
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-9">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Jabatan Kepala Dinas
              </label>
              <input
                type="text"
                value={master.ppk.jabatan}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...master,
                    ppk: { ...master.ppk, jabatan: val },
                    penggunaAnggaran: {
                      ...master.penggunaAnggaran,
                      jabatan: val,
                    },
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Nama Lengkap &amp; Gelar
              </label>
              <input
                type="text"
                value={master.ppk.nama}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...master,
                    ppk: { ...master.ppk, nama: val },
                    penggunaAnggaran: {
                      ...master.penggunaAnggaran,
                      nama: val,
                    },
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Pangkat / Golongan
              </label>
              <input
                type="text"
                value={master.ppk.pangkat}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...master,
                    ppk: { ...master.ppk, pangkat: val },
                    penggunaAnggaran: {
                      ...master.penggunaAnggaran,
                      pangkat: val,
                    },
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                NIP
              </label>
              <input
                type="text"
                value={master.ppk.nip}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...master,
                    ppk: { ...master.ppk, nip: val },
                    penggunaAnggaran: {
                      ...master.penggunaAnggaran,
                      nip: val,
                    },
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* B. Kabid Sarpras / PPTK */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
            B. Kepala Bidang / PPTK (Checklist, KPP, BAHP, BAPP, Ringkasan Kontrak &amp;
            Kuitansi)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Nama &amp; Gelar PPTK / Kabid
              </label>
              <input
                type="text"
                value={master.kabid.nama}
                onChange={(e) =>
                  onChange({
                    ...master,
                    kabid: { ...master.kabid, nama: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Pangkat / Golongan
              </label>
              <input
                type="text"
                value={master.kabid.pangkat}
                onChange={(e) =>
                  onChange({
                    ...master,
                    kabid: { ...master.kabid, pangkat: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                NIP PPTK / Kabid
              </label>
              <input
                type="text"
                value={master.kabid.nip}
                onChange={(e) =>
                  onChange({
                    ...master,
                    kabid: { ...master.kabid, nip: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Jabatan Bidang
              </label>
              <input
                type="text"
                value={master.kabid.jabatan}
                onChange={(e) =>
                  onChange({
                    ...master,
                    kabid: { ...master.kabid, jabatan: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* C & D. PPK Keuangan & Bendahara Pengeluaran (Untuk Ringkasan Kontrak & Kuitansi) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              C. Pejabat Penatausahaan Keuangan (PPK SKPD)
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-600">
                Nama &amp; Gelar PPK Keuangan
              </label>
              <input
                type="text"
                value={master.ppkKeuangan.nama}
                onChange={(e) =>
                  onChange({
                    ...master,
                    ppkKeuangan: { ...master.ppkKeuangan, nama: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-600">
                  Pangkat
                </label>
                <input
                  type="text"
                  value={master.ppkKeuangan.pangkat}
                  onChange={(e) =>
                    onChange({
                      ...master,
                      ppkKeuangan: { ...master.ppkKeuangan, pangkat: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600">
                  NIP
                </label>
                <input
                  type="text"
                  value={master.ppkKeuangan.nip}
                  onChange={(e) =>
                    onChange({
                      ...master,
                      ppkKeuangan: { ...master.ppkKeuangan, nip: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              D. Bendahara Pengeluaran &amp; Pejabat Pengadaan
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-600">
                  Nama Bendahara Pengeluaran
                </label>
                <input
                  type="text"
                  value={master.bendahara.nama}
                  onChange={(e) =>
                    onChange({
                      ...master,
                      bendahara: { ...master.bendahara, nama: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600">
                  NIP Bendahara
                </label>
                <input
                  type="text"
                  value={master.bendahara.nip}
                  onChange={(e) =>
                    onChange({
                      ...master,
                      bendahara: { ...master.bendahara, nip: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600">
                  Nama Pejabat Pengadaan
                </label>
                <input
                  type="text"
                  value={master.pejabatPengadaan.nama}
                  onChange={(e) =>
                    onChange({
                      ...master,
                      pejabatPengadaan: {
                        ...master.pejabatPengadaan,
                        nama: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-600">
                  NIP Pejabat Pengadaan
                </label>
                <input
                  type="text"
                  value={master.pejabatPengadaan.nip}
                  onChange={(e) =>
                    onChange({
                      ...master,
                      pejabatPengadaan: {
                        ...master.pejabatPengadaan,
                        nip: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DASAR HUKUM STANDAR */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
            <FileText className="w-4 h-4 text-indigo-600" />
            3. Dasar Hukum Standar &amp; Surat Persetujuan PP
          </div>
          <button
            type="button"
            onClick={addDasarHukum}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Konsideran
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
              Nomor Surat Persetujuan PP (Kabag PBJ)
            </label>
            <input
              type="text"
              value={master.suratPersetujuanPP.nomor}
              onChange={(e) =>
                onChange({
                  ...master,
                  suratPersetujuanPP: {
                    ...master.suratPersetujuanPP,
                    nomor: e.target.value,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
              Tanggal Surat Persetujuan PP
            </label>
            <input
              type="text"
              value={master.suratPersetujuanPP.tanggalTeks}
              onChange={(e) =>
                onChange({
                  ...master,
                  suratPersetujuanPP: {
                    ...master.suratPersetujuanPP,
                    tanggalTeks: e.target.value,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-2">
          {master.dasarHukum.map((dh, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs font-semibold text-slate-500 pt-2 w-5">
                {idx + 1}.
              </span>
              <textarea
                rows={2}
                value={dh}
                onChange={(e) => updateDasarHukum(idx, e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {master.dasarHukum.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDasarHukum(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  title="Hapus Dasar Hukum"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. PROGRAM, KEGIATAN & LOKASI DEFAULT */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
            <MapPin className="w-4 h-4 text-indigo-600" />
            4. Program, Kegiatan, Sub Kegiatan &amp; Lokasi Default
          </div>
          <button
            type="button"
            onClick={onApplyDefaultsToTransaction}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            Terapkan ke Paket Aktif
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Kode Program
              </label>
              <input
                type="text"
                value={master.kodeProgramDefault}
                onChange={(e) =>
                  onChange({ ...master, kodeProgramDefault: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Program Default
              </label>
              <input
                type="text"
                value={master.programDefault}
                onChange={(e) => onChange({ ...master, programDefault: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Kode Kegiatan
              </label>
              <input
                type="text"
                value={master.kodeKegiatanDefault}
                onChange={(e) =>
                  onChange({ ...master, kodeKegiatanDefault: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Kegiatan Default
              </label>
              <input
                type="text"
                value={master.kegiatanDefault}
                onChange={(e) =>
                  onChange({ ...master, kegiatanDefault: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Kode Sub Kegiatan
              </label>
              <input
                type="text"
                value={master.kodeSubKegiatanDefault}
                onChange={(e) =>
                  onChange({ ...master, kodeSubKegiatanDefault: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Sub Kegiatan Default
              </label>
              <textarea
                rows={2}
                value={master.subKegiatanDefault}
                onChange={(e) =>
                  onChange({ ...master, subKegiatanDefault: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Nama Lokasi Default
              </label>
              <input
                type="text"
                value={master.lokasiPekerjaanNama}
                onChange={(e) =>
                  onChange({ ...master, lokasiPekerjaanNama: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                Alamat Lokasi Default
              </label>
              <input
                type="text"
                value={master.lokasiPekerjaanAlamat}
                onChange={(e) =>
                  onChange({ ...master, lokasiPekerjaanAlamat: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
