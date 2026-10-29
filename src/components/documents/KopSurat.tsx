import React from 'react';
import { MasterData } from '../../types/procurement';

interface KopSuratProps {
  master: MasterData;
}

export const KopSurat: React.FC<KopSuratProps> = ({ master }) => {
  if (master.kopMode === 'banner' && master.bannerKopUrl) {
    return (
      <div className="mb-3">
        <img
          src={master.bannerKopUrl}
          alt="KOP Surat Instansi"
          className="w-full max-h-[115px] object-contain mx-auto"
        />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-3">
        {master.logoUrl && (
          <div className="w-[88px] shrink-0 flex items-center justify-center">
            <img
              src={master.logoUrl}
              alt="Logo Daerah"
              className="w-[78px] h-[92px] object-contain"
            />
          </div>
        )}
        <div
          className="flex-1 text-center leading-snug pr-4"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          <div className="text-[13.5pt] font-normal tracking-wide uppercase text-black">
            {master.pemkabName}
          </div>
          <div className="text-[15.5pt] font-bold tracking-wide uppercase text-black -mt-0.5">
            {master.dinasName}
          </div>
          <div className="text-[10pt] text-black mt-0.5">{master.alamat}</div>
          <div className="text-[10pt] text-black">
            {master.telepon} Laman: <span className="italic">{master.website}</span>
          </div>
          <div className="text-[10pt] text-black">
            Pos-el: {master.email}, Kode Pos: {master.kodePos}
          </div>
        </div>
      </div>
    </div>
  );
};
