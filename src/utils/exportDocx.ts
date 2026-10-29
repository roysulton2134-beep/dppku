import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  ChecklistValue,
  DocumentTabId,
  MasterData,
  TransactionData,
} from '../types/procurement';
import {
  ComputedProcurementSummary,
  formatItemVolumeSatuan,
  formatItemVolume,
  formatItemSatuan,
} from './calculations';
import {
  angkaKeTerbilang,
  formatBulanTahunIndo,
  formatRupiahDec2,
  formatRupiahDoc,
  formatTanggalIndo,
  formatTanggalSlash,
  tanggalKeEjaanResmi,
  toTitleCaseIndo,
} from './terbilang';

const FONT_SANS = 'Arial';
const FONT_SERIF = 'Arial';

// Page dimensions in twips (1 mm ≈ 56.6929 twips)
const PAGE_W_PORTRAIT = 11906; // 210mm
const PAGE_H_PORTRAIT = 16838; // 297mm

const MARGIN_PORTRAIT = {
  top: 1134, // 20mm
  right: 1134, // 20mm
  bottom: 1134, // 20mm
  left: 1417, // 25mm
};
// Printable width in Portrait: 11906 - 1417 - 1134 = 9355 twips (165mm)
const CONTENT_W = 9355;

const MARGIN_LANDSCAPE = {
  top: 850, // 15mm
  right: 1020, // 18mm
  bottom: 850, // 15mm
  left: 1134, // 20mm
};
// Printable width in Landscape: 16838 - 1134 - 1020 = 14684 twips (259mm)
const CONTENT_W_LANDSCAPE = 14684;

const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const SINGLE_BORDER = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const THICK_BORDER = { style: BorderStyle.SINGLE, size: 12, color: '000000' };
const DOUBLE_BOTTOM_BORDER = { style: BorderStyle.DOUBLE, size: 12, color: '000000' };

const TABLE_NO_BORDERS = {
  top: NONE_BORDER,
  bottom: NONE_BORDER,
  left: NONE_BORDER,
  right: NONE_BORDER,
  insideHorizontal: NONE_BORDER,
  insideVertical: NONE_BORDER,
};

const TABLE_FULL_BORDERS = {
  top: SINGLE_BORDER,
  bottom: SINGLE_BORDER,
  left: SINGLE_BORDER,
  right: SINGLE_BORDER,
  insideHorizontal: SINGLE_BORDER,
  insideVertical: SINGLE_BORDER,
};

const CELL_NO_BORDERS = {
  top: NONE_BORDER,
  bottom: NONE_BORDER,
  left: NONE_BORDER,
  right: NONE_BORDER,
};

const CELL_FULL_BORDERS = {
  top: SINGLE_BORDER,
  bottom: SINGLE_BORDER,
  left: SINGLE_BORDER,
  right: SINGLE_BORDER,
};

const PAD_TIGHT = { top: 25, bottom: 25, left: 40, right: 40 };
const PAD_STD = { top: 55, bottom: 55, left: 90, right: 90 };

async function fetchImageBytes(
  url: string
): Promise<{ data: Uint8Array; type: 'png' | 'jpg' } | null> {
  if (!url) return null;
  try {
    const isPng =
      url.toLowerCase().endsWith('.png') || url.startsWith('data:image/png');
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return {
      data: new Uint8Array(ab),
      type: isPng ? 'png' : 'jpg',
    };
  } catch {
    return null;
  }
}

interface POpts {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  size?: number; // half-points (20 = 10pt, 19 = 9.5pt, 18 = 9pt)
  font?: string;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  spacingAfter?: number;
  spacingBefore?: number;
  lineSpacing?: number;
  indentFirstLine?: number;
  indentLeft?: number;
  indentHanging?: number;
  borderBottom?: boolean;
}

function tr(
  text: string,
  opts?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: number;
    font?: string;
  }
): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    italics: opts?.italic,
    size: opts?.size ?? 19,
    font: opts?.font ?? FONT_SANS,
    underline: opts?.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function p(text: string | TextRun[], opts?: POpts): Paragraph {
  const size = opts?.size ?? 19;
  const font = opts?.font ?? FONT_SANS;
  const children = Array.isArray(text)
    ? text
    : [
        new TextRun({
          text,
          bold: opts?.bold,
          italics: opts?.italic,
          size,
          font,
          underline: opts?.underline ? { type: UnderlineType.SINGLE } : undefined,
        }),
      ];

  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.LEFT,
    spacing: {
      after: opts?.spacingAfter ?? 30,
      before: opts?.spacingBefore ?? 0,
      line: opts?.lineSpacing ?? 255,
    },
    indent:
      opts?.indentFirstLine || opts?.indentLeft || opts?.indentHanging
        ? {
            firstLine: opts?.indentFirstLine,
            left: opts?.indentLeft,
            hanging: opts?.indentHanging,
          }
        : undefined,
    border: opts?.borderBottom
      ? {
          bottom: SINGLE_BORDER,
        }
      : undefined,
    children,
  });
}

interface CellOpts {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  size?: number;
  font?: string;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  colSpan?: number;
  rowSpan?: number;
  widthDxa?: number;
  noBorder?: boolean;
  borders?: {
    top?: typeof SINGLE_BORDER;
    bottom?: typeof SINGLE_BORDER;
    left?: typeof SINGLE_BORDER;
    right?: typeof SINGLE_BORDER;
  };
  vAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
  margins?: { top: number; bottom: number; left: number; right: number };
  shadingFill?: string;
}

function cell(
  children: Paragraph | Paragraph[] | string,
  opts?: CellOpts
): TableCell {
  const font = opts?.font ?? FONT_SANS;
  const paragraphs =
    typeof children === 'string'
      ? [
          p(children, {
            bold: opts?.bold,
            italic: opts?.italic,
            underline: opts?.underline,
            size: opts?.size ?? 19,
            font,
            align: opts?.align ?? AlignmentType.LEFT,
            spacingAfter: 15,
          }),
        ]
      : Array.isArray(children)
      ? children
      : [children];

  const isBorderless = opts?.noBorder === true;
  const defaultBorders = isBorderless ? CELL_NO_BORDERS : CELL_FULL_BORDERS;

  return new TableCell({
    children: paragraphs,
    columnSpan: opts?.colSpan,
    rowSpan: opts?.rowSpan,
    verticalAlign: opts?.vAlign ?? VerticalAlign.TOP,
    margins: opts?.margins ?? (isBorderless ? PAD_TIGHT : PAD_STD),
    width: opts?.widthDxa
      ? { size: opts.widthDxa, type: WidthType.DXA }
      : undefined,
    borders: opts?.borders
      ? { ...defaultBorders, ...opts.borders }
      : defaultBorders,
    shading: opts?.shadingFill
      ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.shadingFill }
      : undefined,
  });
}

function makeTable(opts: {
  columnWidths: number[];
  rows: TableRow[];
  noBorder?: boolean;
  borders?: typeof TABLE_FULL_BORDERS;
}): Table {
  const totalWidth = opts.columnWidths.reduce((acc, w) => acc + w, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: opts.columnWidths,
    borders: opts.borders ?? (opts.noBorder ? TABLE_NO_BORDERS : TABLE_FULL_BORDERS),
    rows: opts.rows,
  });
}

function kvRow(
  label: string | Paragraph[],
  value: string | Paragraph | Paragraph[],
  widths: [number, number, number] = [2400, 220, 6735],
  opts?: {
    size?: number;
    font?: string;
    boldLabel?: boolean;
    boldValue?: boolean;
    italicValue?: boolean;
    alignValue?: (typeof AlignmentType)[keyof typeof AlignmentType];
  }
): TableRow {
  const size = opts?.size ?? 19;
  const font = opts?.font ?? FONT_SANS;
  const labelCell =
    typeof label === 'string'
      ? cell(label, {
          widthDxa: widths[0],
          noBorder: true,
          size,
          font,
          bold: opts?.boldLabel,
        })
      : cell(label, { widthDxa: widths[0], noBorder: true, size, font });

  const valCell =
    typeof value === 'string'
      ? cell(value, {
          widthDxa: widths[2],
          noBorder: true,
          size,
          font,
          bold: opts?.boldValue,
          italic: opts?.italicValue,
          align: opts?.alignValue,
        })
      : cell(value, {
          widthDxa: widths[2],
          noBorder: true,
          size,
          font,
        });

  return new TableRow({
    children: [
      labelCell,
      cell(':', { widthDxa: widths[1], noBorder: true, size, font }),
      valCell,
    ],
  });
}

function createKopElements(
  master: MasterData,
  logoImg: { data: Uint8Array; type: 'png' | 'jpg' } | null,
  bannerImg: { data: Uint8Array; type: 'png' | 'jpg' } | null
): (Paragraph | Table)[] {
  if (master.kopMode === 'banner' && bannerImg) {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new ImageRun({
            data: bannerImg.data,
            type: bannerImg.type,
            transformation: { width: 620, height: 122 },
          }),
        ],
      }),
    ];
  }

  return [
    makeTable({
      columnWidths: [1450, 7905],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              logoImg
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 20 },
                      children: [
                        new ImageRun({
                          data: logoImg.data,
                          type: logoImg.type,
                          transformation: { width: 78, height: 92 },
                        }),
                      ],
                    }),
                  ]
                : [p('', { align: AlignmentType.CENTER })],
              {
                widthDxa: 1450,
                noBorder: true,
                vAlign: VerticalAlign.CENTER,
              }
            ),
            cell(
              [
                p(master.pemkabName.toUpperCase(), {
                  size: 27,
                  align: AlignmentType.CENTER,
                  spacingAfter: 10,
                }),
                p(master.dinasName.toUpperCase(), {
                  bold: true,
                  size: 31,
                  align: AlignmentType.CENTER,
                  spacingAfter: 15,
                }),
                p(master.alamat, {
                  size: 20,
                  align: AlignmentType.CENTER,
                  spacingAfter: 10,
                }),
                p(
                  [
                    tr(`${master.telepon} Laman: `, { size: 20 }),
                    tr(master.website, { size: 20, italic: true }),
                  ],
                  { align: AlignmentType.CENTER, spacingAfter: 10 }
                ),
                p(`Pos-el: ${master.email}, Kode Pos: ${master.kodePos}`, {
                  size: 20,
                  align: AlignmentType.CENTER,
                  spacingAfter: 20,
                }),
              ],
              {
                widthDxa: 7905,
                noBorder: true,
                vAlign: VerticalAlign.CENTER,
              }
            ),
          ],
        }),
      ],
    }),
    p('', { spacingAfter: 80 }),
  ];
}

function createBeritaAcaraBoxHeader(opts: {
  kegiatan: string;
  subKegiatan: string;
  pekerjaan: string;
  lokasi: string;
  judulDokumen: string;
  nomor: string;
  tanggal: string;
  lampiran: string;
  font?: string;
}): Table {
  const font = opts.font ?? FONT_SANS;
  const leftW = 4865;
  const rightW = 4490;

  const bottomLeftTable = makeTable({
    columnWidths: [1050, 160, 3455],
    noBorder: true,
    rows: [
      kvRow('Pekerjaan', opts.pekerjaan, [1050, 160, 3455], {
        size: 17,
        font,
      }),
      kvRow('Lokasi', opts.lokasi, [1050, 160, 3455], {
        size: 17,
        font,
      }),
    ],
  });

  const bottomRightTable = makeTable({
    columnWidths: [1050, 160, 3080],
    noBorder: true,
    rows: [
      kvRow('Nomor', opts.nomor, [1050, 160, 3080], { size: 17, font }),
      kvRow('Tanggal', formatTanggalIndo(opts.tanggal), [1050, 160, 3080], {
        size: 17,
        font,
      }),
      kvRow('Lampiran', opts.lampiran, [1050, 160, 3080], { size: 17, font }),
    ],
  });

  return makeTable({
    columnWidths: [leftW, rightW],
    borders: {
      top: THICK_BORDER,
      bottom: THICK_BORDER,
      left: THICK_BORDER,
      right: THICK_BORDER,
      insideHorizontal: SINGLE_BORDER,
      insideVertical: SINGLE_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          cell(
            [
              p('KEGIATAN', {
                bold: true,
                size: 19,
                font,
                align: AlignmentType.CENTER,
                spacingAfter: 10,
              }),
              p(opts.kegiatan, {
                size: 17,
                font,
                align: AlignmentType.CENTER,
                spacingAfter: 40,
              }),
              p('SUB KEGIATAN', {
                bold: true,
                size: 19,
                font,
                align: AlignmentType.CENTER,
                spacingAfter: 10,
              }),
              p(opts.subKegiatan, {
                size: 17,
                font,
                align: AlignmentType.CENTER,
                spacingAfter: 10,
              }),
            ],
            {
              widthDxa: leftW,
              vAlign: VerticalAlign.TOP,
            }
          ),
          cell(
            [
              p(opts.judulDokumen, {
                bold: true,
                size: 22,
                font,
                align: AlignmentType.CENTER,
              }),
            ],
            {
              widthDxa: rightW,
              vAlign: VerticalAlign.CENTER,
            }
          ),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: leftW, type: WidthType.DXA },
            borders: CELL_FULL_BORDERS,
            margins: PAD_STD,
            children: [bottomLeftTable],
          }),
          new TableCell({
            width: { size: rightW, type: WidthType.DXA },
            borders: CELL_FULL_BORDERS,
            margins: PAD_STD,
            children: [bottomRightTable],
          }),
        ],
      }),
    ],
  });
}

function createPPKSignatureTable(
  master: MasterData,
  withSelakuPPK: boolean,
  tembusanLines?: string[],
  totalWidth = CONTENT_W
): Table {
  const leftW = Math.round(totalWidth * 0.54);
  const rightW = totalWidth - leftW;

  const leftParagraphs = tembusanLines
    ? tembusanLines.map((line, i) =>
        p(line, {
          size: 19,
          underline: i === 0,
          spacingAfter: 10,
        })
      )
    : [p('')];

  const jabatanKadis = [master.ppk.jabatanPrefix, master.ppk.jabatan]
    .filter(Boolean)
    .join(' ');

  const rightParagraphs: Paragraph[] = [
    p(jabatanKadis, { size: 19, spacingAfter: 10 }),
  ];

  if (withSelakuPPK) {
    rightParagraphs.push(p('selaku', { size: 19, spacingAfter: 10 }));
    rightParagraphs.push(
      p('Pejabat Pembuat Komitmen', { size: 19, spacingAfter: 10 })
    );
  }

  rightParagraphs.push(p('', { spacingAfter: 520 }));
  rightParagraphs.push(
    p(master.ppk.nama, {
      bold: true,
      underline: true,
      size: 19,
      spacingAfter: 10,
    })
  );
  rightParagraphs.push(p(master.ppk.pangkat, { size: 19, spacingAfter: 10 }));
  rightParagraphs.push(p(`NIP ${master.ppk.nip}`, { size: 19, spacingAfter: 10 }));

  return makeTable({
    columnWidths: [leftW, rightW],
    noBorder: true,
    rows: [
      new TableRow({
        children: [
          cell(leftParagraphs, {
            widthDxa: leftW,
            noBorder: true,
            vAlign: VerticalAlign.BOTTOM,
          }),
          cell(rightParagraphs, {
            widthDxa: rightW,
            noBorder: true,
            vAlign: VerticalAlign.TOP,
          }),
        ],
      }),
    ],
  });
}

function checklistBoxChar(val?: ChecklistValue): string {
  if (val === 'ada') return '☑';
  if (val === 'tidak_ada') return '☒';
  return '☐';
}

function formatAngkaStripDocx(val: number): string {
  return `${Math.round(val || 0).toLocaleString('id-ID')},-`;
}

function getSuratPermohonanTableRowsDocx(
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

export async function exportProcurementToDocx(
  master: MasterData,
  transaction: TransactionData,
  summary: ComputedProcurementSummary,
  targetDoc: DocumentTabId = 'all'
): Promise<void> {
  const logoImg = await fetchImageBytes(master.logoUrl);
  const bannerImg = await fetchImageBytes(master.bannerKopUrl);

  const itemImagesMap = new Map<
    string,
    {
      img1: { data: Uint8Array; type: 'png' | 'jpg' } | null;
      img2: { data: Uint8Array; type: 'png' | 'jpg' } | null;
    }
  >();

  if (
    targetDoc === 'all' ||
    targetDoc === 'all_tahap1' ||
    targetDoc === 'doc9_lampiran_survei'
  ) {
    for (const { item } of summary.flatItems) {
      const [img1, img2] = await Promise.all([
        fetchImageBytes(item.toko1.gambarUrl),
        fetchImageBytes(item.toko2.gambarUrl),
      ]);
      itemImagesMap.set(item.id, { img1, img2 });
    }
  }

  const cs = transaction.checklistStatus || {};
  const ppk = master.ppk;
  const jabatanKadis = [ppk.jabatanPrefix, ppk.jabatan].filter(Boolean).join(' ');

  // ============================================================================
  // DOC 1: CHECKLIST KELENGKAPAN PENGAJUAN DPP (E-PURCHASING)
  // ============================================================================
  const jenisPengadaan = transaction.checklistJenisPengadaan || '';
  const metodeEpurchasing = transaction.checklistMetodeEpurchasing || '';
  const satuanKerjaChecklist =
    master.kabid?.dinas || 'Dinas Pemuda dan Olahraga';

  const doc1MetaCols = [2800, 6555]; // sum = 9355
  const doc1CheckCols = [650, 7355, 1350]; // sum = 9355

  const doc1Elements: (Paragraph | Table)[] = [
    p('CHECKLIST KELENGKAPAN PENGAJUAN DOKUMEN PERSIAPAN PENGADAAN (DPP)', {
      bold: true,
      size: 22,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p('UNTUK E-PURCHASING MELALUI KATALOG ELEKTRONIK', {
      bold: true,
      size: 22,
      align: AlignmentType.CENTER,
      spacingAfter: 160,
    }),
    makeTable({
      columnWidths: doc1MetaCols,
      rows: [
        new TableRow({
          children: [
            cell('Nama Paket', { widthDxa: doc1MetaCols[0], size: 20 }),
            cell(transaction.namaPaket, { widthDxa: doc1MetaCols[1], size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            cell('Satuan Kerja', { widthDxa: doc1MetaCols[0], size: 20 }),
            cell(satuanKerjaChecklist, { widthDxa: doc1MetaCols[1], size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            cell('Tahun Anggaran', { widthDxa: doc1MetaCols[0], size: 20 }),
            cell(transaction.tahunAnggaran, {
              widthDxa: doc1MetaCols[1],
              size: 20,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('Jenis Pengadaan', { widthDxa: doc1MetaCols[0], size: 20 }),
            cell(
              [
                p(
                  `${jenisPengadaan === 'Barang' ? '☑' : '☐'}  Barang`,
                  { size: 20, spacingAfter: 20 }
                ),
                p(
                  `${jenisPengadaan === 'Jasa Lainnya' ? '☑' : '☐'}  Jasa Lainnya`,
                  { size: 20, spacingAfter: 20 }
                ),
                p(
                  `${jenisPengadaan === 'Pekerjaan Konstruksi' ? '☑' : '☐'}  Pekerjaan Konstruksi`,
                  { size: 20 }
                ),
              ],
              { widthDxa: doc1MetaCols[1] }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell('Metode E-purchasing', { widthDxa: doc1MetaCols[0], size: 20 }),
            cell(
              [
                p(
                  `${metodeEpurchasing === 'Negosiasi' ? '☑' : '☐'}  Negosiasi`,
                  { size: 20, spacingAfter: 20 }
                ),
                p(
                  `${metodeEpurchasing === 'Mini Kompetisi' ? '☑' : '☐'}  Mini Kompetisi`,
                  { size: 20 }
                ),
              ],
              { widthDxa: doc1MetaCols[1] }
            ),
          ],
        }),
      ],
    }),
    p('', { spacingAfter: 140 }),
    makeTable({
      columnWidths: doc1CheckCols,
      rows: [
        new TableRow({
          children: [
            cell('No.', {
              bold: true,
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              shading: 'D9E2F3',
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell('Item Pengecekan', {
              bold: true,
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              shading: 'D9E2F3',
              widthDxa: doc1CheckCols[1],
              size: 20,
            }),
            cell('Checklist', {
              bold: true,
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              shading: 'D9E2F3',
              widthDxa: doc1CheckCols[2],
              size: 20,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('1', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell(
              'Surat pengantar/permohonan pelaksanaan E-purchasing kepada Kepala UKPBJ.',
              { vAlign: VerticalAlign.CENTER, widthDxa: doc1CheckCols[1], size: 20 }
            ),
            cell(checklistBoxChar(cs['1']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('2', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell(
              [
                p('Dokumen Perencanaan Pengadaan:', { size: 20, spacingAfter: 15 }),
                p('a. Dokumen identifikasi kebutuhan', {
                  size: 20,
                  indentLeft: 360,
                  spacingAfter: 15,
                }),
                p('b. Formulir perencanaan pengadaan', {
                  size: 20,
                  indentLeft: 360,
                }),
              ],
              { vAlign: VerticalAlign.CENTER, widthDxa: doc1CheckCols[1] }
            ),
            cell(checklistBoxChar(cs['2']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('3', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell('RUP/ID RUP sesuai dengan paket yang diajukan', {
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[1],
              size: 20,
            }),
            cell(checklistBoxChar(cs['3']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('4', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell(
              'DPA/dokumen anggaran yang memuat ketersediaan anggaran untuk paket pekerjaan',
              { vAlign: VerticalAlign.CENTER, widthDxa: doc1CheckCols[1], size: 20 }
            ),
            cell(checklistBoxChar(cs['4']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('5', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell('Spesifikasi Teknis dan gambar (apabila ada)', {
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[1],
              size: 20,
            }),
            cell(checklistBoxChar(cs['5']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('6', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell('HPS', {
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[1],
              size: 20,
            }),
            cell(checklistBoxChar(cs['6']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('7', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell('Daftar Kuantitas dan Harga/Bill of Quantity (BQ)', {
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[1],
              size: 20,
            }),
            cell(checklistBoxChar(cs['7']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('8', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell(
              'Rancangan kontrak: Surat Pesanan, Surat Perjanjian beserta ketentuan yang dipersyaratkan (termasuk SSUK/SSKK apabila digunakan)',
              { vAlign: VerticalAlign.CENTER, widthDxa: doc1CheckCols[1], size: 20 }
            ),
            cell(checklistBoxChar(cs['8']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('9', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell(
              'Bukti/hasil penelusuran ketersediaan produk dan kesesuaian kategori produk dengan kebutuhan (untuk pengadaan barang dan jasa lainnya)',
              { vAlign: VerticalAlign.CENTER, widthDxa: doc1CheckCols[1], size: 20 }
            ),
            cell(checklistBoxChar(cs['9']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('10', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell(
              [
                p('Khusus Pekerjaan Konstruksi:', { size: 20, spacingAfter: 15 }),
                p('a. Analisa Harga Satuan Pekerjaan (AHSP)', {
                  size: 20,
                  indentLeft: 360,
                  spacingAfter: 15,
                }),
                p('b. Dokumen penetapan Rencana Keselamatan Konstruksi (RKK)', {
                  size: 20,
                  indentLeft: 360,
                  spacingAfter: 15,
                }),
                p(
                  'c. Laporan Hasil Reviu (LHR) atas HPS dari Inspektorat (apabila dipersyaratkan)',
                  { size: 20, indentLeft: 360, spacingAfter: 15 }
                ),
                p(
                  'd. Kertas Kerja Pengecekan Produk pada Katalog Elektronik sesuai Master Produk Pekerjaan Konstruksi.',
                  { size: 20, indentLeft: 360 }
                ),
              ],
              { vAlign: VerticalAlign.CENTER, widthDxa: doc1CheckCols[1] }
            ),
            cell(checklistBoxChar(cs['10']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('11', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[0],
              size: 20,
            }),
            cell(
              'Dokumen pendukung lainnya sesuai jenis pengadaan, karakteristik paket, dan persyaratan pada Katalog Elektronik (apabila ada)',
              { vAlign: VerticalAlign.CENTER, widthDxa: doc1CheckCols[1], size: 20 }
            ),
            cell(checklistBoxChar(cs['11']), {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: doc1CheckCols[2],
              size: 24,
            }),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 2: SURAT PERMOHONAN PELAKSANAAN PENGADAAN BARANG/JASA
  // ============================================================================
  const tglPermohonanStr =
    transaction.formatTanggalPermohonan === 'lengkap'
      ? formatTanggalIndo(transaction.tanggalSuratPermohonan)
      : `        ${formatBulanTahunIndo(transaction.tanggalSuratPermohonan)}`;

  const jenisDokAnggaran = transaction.jenisDokumenAnggaranPermohonan || 'DPPA';
  const nomorDPAPermohonan =
    transaction.nomorDPAPermohonan ||
    transaction.kontrak?.nomorDPA ||
    'DPPA/A.3/2.19.0.00.0.00.19.0000/001/2026';
  const tanggalDPAPermohonan =
    transaction.tanggalDPAPermohonan ||
    transaction.kontrak?.tanggalDPA ||
    '19 Oktober Tahun 2026';

  const doc2TableRows = getSuratPermohonanTableRowsDocx(transaction, summary);

  const doc2HeaderCols = [1050, 180, 3925, 4200]; // sum = 9355
  const doc2PaketCols = [650, 2705, 2800, 1600, 1600]; // sum = 9355

  const doc2Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    makeTable({
      columnWidths: [5155, 4200],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('', { widthDxa: 5155, noBorder: true }),
            cell(
              [
                p(`${master.kotaPenetapan}, ${tglPermohonanStr}`, {
                  size: 21,
                  spacingAfter: 80,
                }),
                p('Kepada', {
                  size: 21,
                  indentLeft: 420,
                  spacingAfter: 20,
                }),
              ],
              { widthDxa: 4200, noBorder: true }
            ),
          ],
        }),
      ],
    }),
    makeTable({
      columnWidths: doc2HeaderCols,
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('Nomor', { widthDxa: doc2HeaderCols[0], noBorder: true, size: 21 }),
            cell(':', { widthDxa: doc2HeaderCols[1], noBorder: true, size: 21 }),
            cell(transaction.nomorSuratPermohonan, {
              widthDxa: doc2HeaderCols[2],
              noBorder: true,
              size: 21,
            }),
            cell(
              [
                p(
                  'Yth.  Sdr.  Kepala Bagian Pengadaan Barang dan Jasa Kabupaten Malang',
                  {
                    size: 21,
                    align: AlignmentType.BOTH,
                    indentLeft: 960,
                    indentHanging: 960,
                    spacingAfter: 40,
                  }
                ),
                p('di', {
                  size: 21,
                  indentLeft: 960,
                  spacingAfter: 20,
                }),
                p(master.pejabatPengadaan.kotaTujuan || 'K E P A N J E N', {
                  bold: true,
                  size: 21,
                  indentLeft: 1320,
                }),
              ],
              { rowSpan: 4, widthDxa: doc2HeaderCols[3], noBorder: true }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell('Sifat', { widthDxa: doc2HeaderCols[0], noBorder: true, size: 21 }),
            cell(':', { widthDxa: doc2HeaderCols[1], noBorder: true, size: 21 }),
            cell(transaction.sifatSuratPermohonan, {
              widthDxa: doc2HeaderCols[2],
              noBorder: true,
              size: 21,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('Lampiran', {
              widthDxa: doc2HeaderCols[0],
              noBorder: true,
              size: 21,
            }),
            cell(':', { widthDxa: doc2HeaderCols[1], noBorder: true, size: 21 }),
            cell(transaction.lampiranSuratPermohonan, {
              widthDxa: doc2HeaderCols[2],
              noBorder: true,
              size: 21,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('Perihal', { widthDxa: doc2HeaderCols[0], noBorder: true, size: 21 }),
            cell(':', { widthDxa: doc2HeaderCols[1], noBorder: true, size: 21 }),
            cell(transaction.perihalSuratPermohonan, {
              bold: true,
              widthDxa: doc2HeaderCols[2],
              noBorder: true,
              size: 21,
            }),
          ],
        }),
      ],
    }),
    p(
      `Dalam rangka Pelaksanaan Program dan Kegiatan pada ${jenisDokAnggaran} ${master.organisasiSKPD || 'Dinas Pemuda dan Olahraga Kabupaten Malang'} Nomor : ${nomorDPAPermohonan} Tanggal ${tanggalDPAPermohonan}, dengan ini mengajukan permohonan pelaksanaan pengadaan barang/jasa untuk dapat diproses melalui Bagian Pengadaan Barang dan Jasa sebagaimana ketentuan peraturan perundang-undangan yang berlaku. Adapun data paket pekerjaan sebagai berikut:`,
      {
        size: 21,
        align: AlignmentType.BOTH,
        indentLeft: 240,
        indentFirstLine: 640,
        spacingBefore: 160,
        spacingAfter: 120,
      }
    ),
    makeTable({
      columnWidths: doc2PaketCols,
      rows: [
        new TableRow({
          children: [
            cell('No.', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              shading: 'F2F2F2',
              widthDxa: doc2PaketCols[0],
              size: 21,
            }),
            cell('Nama Paket Pekerjaan', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              shading: 'F2F2F2',
              widthDxa: doc2PaketCols[1],
              size: 21,
            }),
            cell(
              [
                p('Sumber Dana', {
                  size: 21,
                  align: AlignmentType.CENTER,
                  spacingAfter: 10,
                }),
                p('(DAU/DAK/DBHCHT/', {
                  size: 21,
                  align: AlignmentType.CENTER,
                  spacingAfter: 10,
                }),
                p('DBH/PAD/LAIN-LAIN)', {
                  size: 21,
                  align: AlignmentType.CENTER,
                }),
              ],
              {
                vAlign: VerticalAlign.CENTER,
                shading: 'F2F2F2',
                widthDxa: doc2PaketCols[2],
              }
            ),
            cell('Pagu (Rp)', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              shading: 'F2F2F2',
              widthDxa: doc2PaketCols[3],
              size: 21,
            }),
            cell('HPS (Rp)', {
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              shading: 'F2F2F2',
              widthDxa: doc2PaketCols[4],
              size: 21,
            }),
          ],
        }),
        ...doc2TableRows.map(
          (row) =>
            new TableRow({
              children: [
                cell(`${row.no}.`, {
                  align: AlignmentType.CENTER,
                  vAlign: VerticalAlign.CENTER,
                  widthDxa: doc2PaketCols[0],
                  size: 21,
                }),
                cell(row.namaPaket, {
                  align: AlignmentType.LEFT,
                  vAlign: VerticalAlign.CENTER,
                  widthDxa: doc2PaketCols[1],
                  size: 21,
                }),
                cell(row.sumberDana, {
                  align: AlignmentType.CENTER,
                  vAlign: VerticalAlign.CENTER,
                  widthDxa: doc2PaketCols[2],
                  size: 21,
                }),
                cell(formatAngkaStripDocx(row.pagu), {
                  align: AlignmentType.RIGHT,
                  vAlign: VerticalAlign.CENTER,
                  widthDxa: doc2PaketCols[3],
                  size: 21,
                }),
                cell(formatAngkaStripDocx(row.hps), {
                  align: AlignmentType.RIGHT,
                  vAlign: VerticalAlign.CENTER,
                  widthDxa: doc2PaketCols[4],
                  size: 21,
                }),
              ],
            })
        ),
      ],
    }),
    p(
      'Bersama ini dilampirkan dokumen-dokumen dan data-data kelengkapan proses lelang sebagaimana terlampir.',
      {
        size: 21,
        align: AlignmentType.BOTH,
        indentLeft: 240,
        indentFirstLine: 640,
        spacingBefore: 140,
        spacingAfter: 100,
      }
    ),
    p('Demikian atas perhatian dan perkenannya disampaikan terima kasih.', {
      size: 21,
      align: AlignmentType.BOTH,
      indentLeft: 240,
      indentFirstLine: 640,
      spacingAfter: 200,
    }),
    makeTable({
      columnWidths: [5155, 4200],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('', { widthDxa: 5155, noBorder: true }),
            cell(
              [
                p(jabatanKadis, { size: 21, spacingAfter: 15 }),
                p('Selaku', { size: 21, spacingAfter: 15 }),
                p('Pejabat Pembuat Komitmen', { size: 21, spacingAfter: 560 }),
                p(master.ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 21,
                  spacingAfter: 15,
                }),
                p(master.ppk.pangkat || 'Pembina Utama Muda', {
                  size: 21,
                  spacingAfter: 15,
                }),
                p(`NIP. ${master.ppk.nip}`, { size: 21 }),
              ],
              { widthDxa: 4200, noBorder: true }
            ),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 3: SURAT TUGAS PPK
  // ============================================================================
  const tglSTStr =
    transaction.formatTanggalSuratTugas === 'lengkap'
      ? formatTanggalIndo(transaction.tanggalSuratTugas)
      : `      ${formatBulanTahunIndo(transaction.tanggalSuratTugas)}`;

  const doc3DasarCols = [1050, 220, 420, 7665]; // sum = 9355
  const doc3KepadaCols = [1050, 220, 1400, 220, 6465]; // sum = 9355
  const doc3UntukCols = [1050, 220, 8085]; // sum = 9355

  const sigPlaceTable = makeTable({
    columnWidths: [1400, 180, 2800],
    noBorder: true,
    rows: [
      kvRow('Dikeluarkan di', master.kotaPenetapan, [1400, 180, 2800], { size: 20 }),
      kvRow('Pada tanggal', tglSTStr, [1400, 180, 2800], { size: 20 }),
    ],
  });

  const doc3Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('SURAT TUGAS', {
      bold: true,
      underline: true,
      size: 24,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p(`Nomor : ${transaction.nomorSuratTugas}`, {
      size: 20,
      align: AlignmentType.CENTER,
      spacingAfter: 120,
    }),
    makeTable({
      columnWidths: doc3DasarCols,
      noBorder: true,
      rows: master.dasarHukum.map(
        (d, idx) =>
          new TableRow({
            children: [
              cell(idx === 0 ? 'Dasar' : '', {
                widthDxa: doc3DasarCols[0],
                noBorder: true,
                size: 20,
              }),
              cell(idx === 0 ? ':' : '', {
                widthDxa: doc3DasarCols[1],
                noBorder: true,
                size: 20,
              }),
              cell(`${idx + 1}.`, {
                widthDxa: doc3DasarCols[2],
                noBorder: true,
                size: 20,
              }),
              cell(d, {
                widthDxa: doc3DasarCols[3],
                align: AlignmentType.BOTH,
                noBorder: true,
                size: 20,
              }),
            ],
          })
      ),
    }),
    p('MENUGASKAN :', {
      bold: true,
      size: 20,
      align: AlignmentType.CENTER,
      spacingBefore: 120,
      spacingAfter: 80,
    }),
    makeTable({
      columnWidths: doc3KepadaCols,
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('Kepada', { widthDxa: doc3KepadaCols[0], noBorder: true, size: 20 }),
            cell(':', { widthDxa: doc3KepadaCols[1], noBorder: true, size: 20 }),
            cell('Nama / NIP', { widthDxa: doc3KepadaCols[2], noBorder: true, size: 20 }),
            cell(':', { widthDxa: doc3KepadaCols[3], noBorder: true, size: 20 }),
            cell(
              `${master.pejabatPengadaan.nama} / ${master.pejabatPengadaan.nip}`,
              {
                bold: true,
                widthDxa: doc3KepadaCols[4],
                noBorder: true,
                size: 20,
              }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell('', { widthDxa: doc3KepadaCols[0], noBorder: true, size: 20 }),
            cell('', { widthDxa: doc3KepadaCols[1], noBorder: true, size: 20 }),
            cell('Jabatan', { widthDxa: doc3KepadaCols[2], noBorder: true, size: 20 }),
            cell(':', { widthDxa: doc3KepadaCols[3], noBorder: true, size: 20 }),
            cell(master.pejabatPengadaan.jabatanLengkap, {
              widthDxa: doc3KepadaCols[4],
              align: AlignmentType.BOTH,
              noBorder: true,
              size: 20,
            }),
          ],
        }),
      ],
    }),
    p('', { spacingAfter: 40 }),
    makeTable({
      columnWidths: doc3UntukCols,
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('Untuk', { widthDxa: doc3UntukCols[0], noBorder: true, size: 20 }),
            cell(':', { widthDxa: doc3UntukCols[1], noBorder: true, size: 20 }),
            cell(
              `Melaksanakan pemilihan penyedia barang/jasa terhadap paket pekerjaan ${transaction.namaPaket} dengan metode ${transaction.metodePengadaan}.`,
              {
                widthDxa: doc3UntukCols[2],
                align: AlignmentType.BOTH,
                noBorder: true,
                size: 20,
              }
            ),
          ],
        }),
      ],
    }),
    p(
      'Sesuai prosedur, setelah melaksanakan kegiatan dimaksud agar melaporkan hasilnya sesuai dengan ketentuan yang berlaku.',
      { size: 20, indentFirstLine: 560, spacingBefore: 100, spacingAfter: 50 }
    ),
    p('Demikian untuk dilaksanakan dengan penuh tanggung jawab.', {
      size: 20,
      indentFirstLine: 560,
      spacingAfter: 120,
    }),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('', { widthDxa: 4855, noBorder: true }),
            new TableCell({
              width: { size: 4500, type: WidthType.DXA },
              borders: CELL_NO_BORDERS,
              margins: PAD_TIGHT,
              children: [
                sigPlaceTable,
                p(jabatanKadis, { size: 20, spacingBefore: 60, spacingAfter: 520 }),
                p(ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 20,
                  spacingAfter: 10,
                }),
                p(ppk.pangkat, { size: 20, spacingAfter: 10 }),
                p(`NIP ${ppk.nip}`, { size: 20 }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 4: DOKUMEN PERSIAPAN PENGADAAN (DPP)
  // ============================================================================
  const ejaanDPP = tanggalKeEjaanResmi(transaction.tanggalDPP);
  const dppCols = [450, 1600, 2605, 1200, 1750, 1750]; // sum = 9355
  const dppRows: TableRow[] = [
    new TableRow({
      children: [
        cell('No.', {
          bold: true,
          size: 18,
          align: AlignmentType.CENTER,
          widthDxa: dppCols[0],
        }),
        cell('Kode Rekening', {
          bold: true,
          size: 18,
          align: AlignmentType.CENTER,
          widthDxa: dppCols[1],
        }),
        cell('Spesifikasi Teknis', {
          bold: true,
          size: 18,
          align: AlignmentType.CENTER,
          widthDxa: dppCols[2],
        }),
        cell('Spesifikasi Jumlah', {
          bold: true,
          size: 18,
          align: AlignmentType.CENTER,
          widthDxa: dppCols[3],
        }),
        cell('Harga Satuan termasuk Pajak (Rp.)', {
          bold: true,
          size: 18,
          align: AlignmentType.CENTER,
          widthDxa: dppCols[4],
        }),
        cell('Pagu Anggaran (Rp.)', {
          bold: true,
          size: 18,
          align: AlignmentType.CENTER,
          widthDxa: dppCols[5],
        }),
      ],
    }),
  ];

  for (const grp of summary.groups) {
    for (let i = 0; i < grp.items.length; i++) {
      const { globalIndex, item, subtotalPagu } = grp.items[i];
      const kodeRekParagraphs: Paragraph[] = [
        p(grp.kodeRekening || '-', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          spacingAfter: 4,
        }),
      ];
      if (grp.namaRekening) {
        kodeRekParagraphs.push(
          p(grp.namaRekening, {
            size: 15,
            align: AlignmentType.CENTER,
          })
        );
      }

      const kodeRekCell =
        grp.items.length > 1
          ? cell(kodeRekParagraphs, {
              widthDxa: dppCols[1],
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              verticalMerge:
                i === 0
                  ? TableCellVerticalMergeType.RESTART
                  : TableCellVerticalMergeType.CONTINUE,
            })
          : cell(kodeRekParagraphs, {
              widthDxa: dppCols[1],
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
            });

      dppRows.push(
        new TableRow({
          children: [
            cell(String(globalIndex), {
              size: 18,
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: dppCols[0],
            }),
            kodeRekCell,
            cell(item.namaBarang, {
              size: 18,
              vAlign: VerticalAlign.CENTER,
              widthDxa: dppCols[2],
            }),
            cell(formatItemVolumeSatuan(item), {
              size: 18,
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              widthDxa: dppCols[3],
            }),
            cell(formatRupiahDoc(item.hargaPaguSatuan), {
              size: 18,
              align: AlignmentType.RIGHT,
              vAlign: VerticalAlign.CENTER,
              widthDxa: dppCols[4],
            }),
            cell(formatRupiahDoc(subtotalPagu), {
              size: 18,
              align: AlignmentType.RIGHT,
              vAlign: VerticalAlign.CENTER,
              widthDxa: dppCols[5],
            }),
          ],
        })
      );
    }
  }

  dppRows.push(
    new TableRow({
      children: [
        cell(
          [
            p(
              [
                tr('Spesifikasi Waktu: ', { bold: true, size: 18 }),
                tr(
                  `Pelaksanaan pekerjaan mulai tanggal ${formatTanggalIndo(
                    transaction.tanggalMulaiPelaksanaan
                  )} s.d. ${formatTanggalIndo(
                    transaction.tanggalSelesaiPelaksanaan
                  )}, spesifikasi jumlah yang tertuang bersifat perkiraan, jumlah pesanan sesuai yang tertuang di Surat Pesanan tertulis yang akan disampaikan kepada Penyedia Barang/Jasa. Penyedia Barang/Jasa melakukan pengiriman barang/jasa setelah menerima rekaman Surat Pesanan tertulis.`,
                  { size: 18 }
                ),
              ],
              { align: AlignmentType.BOTH }
            ),
          ],
          { colSpan: 6, widthDxa: CONTENT_W }
        ),
      ],
    }),
    new TableRow({
      children: [
        cell(
          [
            p(
              [
                tr('Spesifikasi Layanan: ', { bold: true, size: 18 }),
                tr(`Termasuk pengiriman sampai ke lokasi ${transaction.lokasiNama}`, {
                  size: 18,
                }),
              ],
              { spacingAfter: 10 }
            ),
            p(transaction.lokasiAlamat, { size: 18 }),
          ],
          { colSpan: 6, widthDxa: CONTENT_W }
        ),
      ],
    }),
    new TableRow({
      children: [
        cell(
          [
            p('Prioritas TKDN, PPK/PP memilih dengan urutan/prioritas:', {
              size: 18,
              spacingAfter: 15,
            }),
            p('a. Produk dalam negeri dengan nilai TKDN paling sedikit 25%;', {
              size: 18,
              indentLeft: 280,
              spacingAfter: 10,
            }),
            p('b. Produk dalam negeri dengan nilai TKDN kurang dari 25%;', {
              size: 18,
              indentLeft: 280,
              spacingAfter: 10,
            }),
            p('c. produk dengan label PDN namun belum mempunyai nilai TKDN;', {
              size: 18,
              indentLeft: 280,
              spacingAfter: 10,
            }),
            p('d. Produk impor;', {
              size: 18,
              indentLeft: 280,
              spacingAfter: 10,
            }),
            p('e. Menggunakan metode lain selain E-purchasing Katalog.', {
              size: 18,
              indentLeft: 280,
              spacingAfter: 15,
            }),
            p(
              `Berdasarkan urutan/prioritas diatas, barang/jasa yang ditetapkan memiliki nilai TKDN ${transaction.nilaiTKDN}, dengan alasan ${transaction.alasanTKDN}.`,
              { size: 18, align: AlignmentType.BOTH }
            ),
          ],
          { colSpan: 6, widthDxa: CONTENT_W }
        ),
      ],
    }),
    new TableRow({
      children: [
        cell(
          [
            p(
              'Referensi harga yang berfungsi sebagai referensi untuk melakukan Negosiasi Harga sebagaimana terlampir.',
              { size: 18, spacingAfter: 15 }
            ),
            p(
              'Rancangan kontrak ditetapkan menggunakan Surat Pesanan sebagaimana terlampir atau jika tidak ada maka menggunakan Surat Pesanan sesuai yang tertuang di aplikasi E-purchasing.',
              { size: 18 }
            ),
          ],
          { colSpan: 6, widthDxa: CONTENT_W }
        ),
      ],
    })
  );

  const doc4Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('DOKUMEN PERSIAPAN PENGADAAN (DPP)', {
      bold: true,
      underline: true,
      size: 22,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p(`Nomor : ${transaction.nomorDPP}`, {
      size: 19,
      align: AlignmentType.CENTER,
      spacingAfter: 60,
    }),
    p('Yang bertandatangan di bawah ini:', { size: 19, spacingAfter: 20 }),
    makeTable({
      columnWidths: [1400, 200, 7755],
      noBorder: true,
      rows: [
        kvRow('Nama', ppk.nama, [1400, 200, 7755], { size: 19, boldValue: true }),
        kvRow(
          'Selaku',
          `${ppk.selaku} Kabupaten Malang Tahun Anggaran ${transaction.tahunAnggaran}`,
          [1400, 200, 7755],
          { size: 19 }
        ),
      ],
    }),
    p(
      [
        tr('Pada hari ini ', { size: 19 }),
        tr(ejaanDPP.hari, { bold: true, size: 19 }),
        tr(' tanggal ', { size: 19 }),
        tr(ejaanDPP.tanggalTerbilang, { bold: true, size: 19 }),
        tr(' bulan ', { size: 19 }),
        tr(ejaanDPP.bulan, { bold: true, size: 19 }),
        tr(' tahun ', { size: 19 }),
        tr(ejaanDPP.tahunTerbilang, { bold: true, size: 19 }),
        tr(' menetapkan Dokumen Persiapan Pengadaan (DPP) sebagai berikut:', {
          size: 19,
        }),
      ],
      { align: AlignmentType.BOTH, spacingBefore: 40, spacingAfter: 40 }
    ),
    makeTable({
      columnWidths: [1400, 200, 7755],
      noBorder: true,
      rows: [
        kvRow('Nama Paket', `${transaction.namaPaket}.`, [1400, 200, 7755], {
          size: 19,
        }),
        kvRow('Kode RUP', transaction.kodeRUP, [1400, 200, 7755], { size: 19 }),
      ],
    }),
    p('Spesifikasi Teknis, Pagu Anggaran, dan Rancangan Kontrak sebagai berikut:', {
      size: 19,
      spacingBefore: 40,
      spacingAfter: 30,
    }),
    makeTable({
      columnWidths: dppCols,
      rows: dppRows,
    }),
    p(
      'Demikian Dokumen Persiapan Pengadaan ini dibuat untuk digunakan sebagai dasar pelaksanaan pengadaan. Pelaksanaan pengadaan berdasarkan prioritas penggunaan produk dalam negeri dan prioritas penggunaan produk dari penyedia dengan kualifikasi usaha kecil serta koperasi.',
      { size: 19, align: AlignmentType.BOTH, spacingBefore: 50, spacingAfter: 60 }
    ),
    createPPKSignatureTable(master, true, [
      'Tembusan :',
      `Yth. Sdr. ${master.tembusan.jabatan}`,
      `       ${master.tembusan.instansi}.`,
    ]),
  ];

  // ============================================================================
  // DOC 5: KERANGKA ACUAN KERJA (KAK)
  // ============================================================================
  const kakCols = [560, 2100, 200, 6495]; // sum = 9355
  const doc5Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('KERANGKA ACUAN KERJA (KAK)', {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(transaction.namaPaket.toUpperCase(), {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`${master.dinasName} KABUPATEN MALANG`, {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`TAHUN ANGGARAN ${transaction.tahunAnggaran}`, {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 80,
    }),
    makeTable({
      columnWidths: kakCols,
      rows: [
        new TableRow({
          children: [
            cell('1.', { align: AlignmentType.CENTER, widthDxa: kakCols[0] }),
            cell('Latar Belakang', { widthDxa: kakCols[1] }),
            cell(':', { align: AlignmentType.CENTER, widthDxa: kakCols[2] }),
            cell(
              [
                p('Gambaran Umum', { bold: true, size: 19, spacingAfter: 15 }),
                p(transaction.kakLatarBelakang, {
                  size: 19,
                  align: AlignmentType.BOTH,
                  spacingAfter: 50,
                }),
                p('Lokasi Pekerjaan', { bold: true, size: 19, spacingAfter: 15 }),
                p(transaction.lokasiNama, { size: 19, spacingAfter: 10 }),
                p(transaction.lokasiAlamat, { size: 19, spacingAfter: 50 }),
                p('Permasalahan', { bold: true, size: 19, spacingAfter: 15 }),
                p(transaction.kakPermasalahan || '-', { size: 19 }),
              ],
              { widthDxa: kakCols[3] }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell('2.', { align: AlignmentType.CENTER, widthDxa: kakCols[0] }),
            cell('Maksud dan Tujuan', { widthDxa: kakCols[1] }),
            cell(':', { align: AlignmentType.CENTER, widthDxa: kakCols[2] }),
            cell(
              [
                p('Maksud', { bold: true, size: 19, spacingAfter: 15 }),
                p(transaction.kakMaksud, {
                  size: 19,
                  align: AlignmentType.BOTH,
                  spacingAfter: 50,
                }),
                p('Tujuan', { bold: true, size: 19, spacingAfter: 15 }),
                p(transaction.kakTujuan, { size: 19, align: AlignmentType.BOTH }),
              ],
              { widthDxa: kakCols[3] }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell('3.', { align: AlignmentType.CENTER, widthDxa: kakCols[0] }),
            cell('Target / Sasaran', { widthDxa: kakCols[1] }),
            cell(':', { align: AlignmentType.CENTER, widthDxa: kakCols[2] }),
            cell(transaction.kakTargetSasaran, {
              widthDxa: kakCols[3],
              align: AlignmentType.BOTH,
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('4.', { align: AlignmentType.CENTER, widthDxa: kakCols[0] }),
            cell('Nama Organisasi', { widthDxa: kakCols[1] }),
            cell(':', { align: AlignmentType.CENTER, widthDxa: kakCols[2] }),
            cell(
              [
                p('a. K/L/D/I', { bold: true, size: 19, spacingAfter: 10 }),
                p(master.organisasiKLDI, {
                  size: 19,
                  indentLeft: 240,
                  spacingAfter: 35,
                }),
                p('b. SKPD', { bold: true, size: 19, spacingAfter: 10 }),
                p(master.organisasiSKPD, { size: 19, indentLeft: 240 }),
              ],
              { widthDxa: kakCols[3] }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell('5.', { align: AlignmentType.CENTER, widthDxa: kakCols[0] }),
            cell(
              [
                p('Sumber Dana dan', { size: 19, spacingAfter: 10 }),
                p('Perkiraan Biaya', { size: 19 }),
              ],
              { widthDxa: kakCols[1] }
            ),
            cell(':', { align: AlignmentType.CENTER, widthDxa: kakCols[2] }),
            cell(
              [
                p('a. Sumber Dana', { bold: true, size: 19, spacingAfter: 10 }),
                p(transaction.sumberDanaKAK, {
                  size: 19,
                  indentLeft: 240,
                  spacingAfter: 35,
                }),
                p('b. Perkiraan Biaya', { bold: true, size: 19, spacingAfter: 10 }),
                p(
                  [
                    tr(`Jumlah Total ${formatRupiahDoc(summary.totalPagu)} (`, {
                      size: 19,
                    }),
                    tr(summary.terbilangPagu, { size: 19, italic: true }),
                    tr(')', { size: 19 }),
                  ],
                  { indentLeft: 240 }
                ),
              ],
              { widthDxa: kakCols[3] }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell('6.', { align: AlignmentType.CENTER, widthDxa: kakCols[0] }),
            cell(
              [
                p('Jangka Waktu', { size: 19, spacingAfter: 10 }),
                p('Pelaksanaan Pekerjaan', { size: 19 }),
              ],
              { widthDxa: kakCols[1] }
            ),
            cell(':', { align: AlignmentType.CENTER, widthDxa: kakCols[2] }),
            cell(`${transaction.jangkaWaktuHari} Hari Kalender`, {
              widthDxa: kakCols[3],
            }),
          ],
        }),
        new TableRow({
          children: [
            cell('7.', { align: AlignmentType.CENTER, widthDxa: kakCols[0] }),
            cell('Keterangan', { widthDxa: kakCols[1] }),
            cell(':', { align: AlignmentType.CENTER, widthDxa: kakCols[2] }),
            cell(
              [
                p('Kode Rekening', { bold: true, size: 19, spacingAfter: 15 }),
                ...transaction.kategoriRekening.flatMap((kr, idx) => [
                  p(kr.namaRekening, { size: 19, spacingAfter: 5 }),
                  p(
                    `${kr.kodeRekening}${
                      idx < transaction.kategoriRekening.length - 1 ? ';' : '.'
                    }`,
                    { size: 19, spacingAfter: 25 }
                  ),
                ]),
              ],
              { widthDxa: kakCols[3] }
            ),
          ],
        }),
      ],
    }),
    p('', { spacingAfter: 60 }),
    createPPKSignatureTable(master, true),
  ];

  // ============================================================================
  // DOC 6: RENCANA ANGGARAN DAN BIAYA (RAB)
  // ============================================================================
  const rabCols = [580, 3875, 1300, 1800, 1800]; // sum = 9355
  const rabRows: TableRow[] = [
    new TableRow({
      children: [
        cell('NO', { bold: true, align: AlignmentType.CENTER, widthDxa: rabCols[0] }),
        cell('URAIAN', { bold: true, align: AlignmentType.CENTER, widthDxa: rabCols[1] }),
        cell('VOLUME', { bold: true, align: AlignmentType.CENTER, widthDxa: rabCols[2] }),
        cell('HARGA SATUAN', {
          bold: true,
          align: AlignmentType.CENTER,
          widthDxa: rabCols[3],
        }),
        cell('JUMLAH', { bold: true, align: AlignmentType.CENTER, widthDxa: rabCols[4] }),
      ],
    }),
  ];

  for (const grp of summary.groups) {
    rabRows.push(
      new TableRow({
        children: [
          cell('', { widthDxa: rabCols[0] }),
          cell(grp.kategori, {
            bold: true,
            colSpan: 4,
            widthDxa: rabCols[1] + rabCols[2] + rabCols[3] + rabCols[4],
          }),
        ],
      })
    );
    for (const { globalIndex, item, subtotalPenetapan } of grp.items) {
      rabRows.push(
        new TableRow({
          children: [
            cell(String(globalIndex), {
              align: AlignmentType.CENTER,
              widthDxa: rabCols[0],
            }),
            cell(item.namaBarang, { widthDxa: rabCols[1] }),
            cell(formatItemVolumeSatuan(item), {
              align: AlignmentType.CENTER,
              widthDxa: rabCols[2],
            }),
            cell(formatRupiahDoc(item.hargaPenetapanSatuan), {
              align: AlignmentType.RIGHT,
              widthDxa: rabCols[3],
            }),
            cell(formatRupiahDoc(subtotalPenetapan), {
              align: AlignmentType.RIGHT,
              widthDxa: rabCols[4],
            }),
          ],
        })
      );
    }
  }

  rabRows.push(
    new TableRow({
      children: [
        cell('JUMLAH (termasuk PPN + Ongkos Kirim)', {
          bold: true,
          align: AlignmentType.CENTER,
          colSpan: 4,
          widthDxa: rabCols[0] + rabCols[1] + rabCols[2] + rabCols[3],
        }),
        cell(formatRupiahDoc(summary.totalPenetapan), {
          bold: true,
          align: AlignmentType.RIGHT,
          widthDxa: rabCols[4],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell(`Terbilang : ${summary.terbilangPenetapan}`, {
          bold: true,
          italic: true,
          colSpan: 5,
          widthDxa: CONTENT_W,
        }),
      ],
    })
  );

  const doc6Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('RENCANA ANGGARAN DAN BIAYA (RAB)', {
      bold: true,
      underline: true,
      size: 23,
      align: AlignmentType.CENTER,
      spacingAfter: 100,
    }),
    makeTable({
      columnWidths: [2300, 220, 6835],
      noBorder: true,
      rows: [
        kvRow(
          'Paket Pekerjaan',
          toTitleCaseIndo(transaction.namaPaket),
          [2300, 220, 6835],
          {
            size: 20,
            boldLabel: true,
            boldValue: true,
          }
        ),
        kvRow(
          'Lokasi',
          toTitleCaseIndo(master.lokasiDefaultSingkat || 'Malang'),
          [2300, 220, 6835],
          {
            size: 20,
            boldLabel: true,
            boldValue: true,
          }
        ),
        kvRow(
          'Sumber Dana',
          toTitleCaseIndo(transaction.sumberDanaAPBD || 'APBD'),
          [2300, 220, 6835],
          {
            size: 20,
            boldLabel: true,
            boldValue: true,
          }
        ),
        kvRow(
          'Tahun Anggaran',
          transaction.tahunAnggaran,
          [2300, 220, 6835],
          {
            size: 20,
            boldLabel: true,
            boldValue: true,
          }
        ),
      ],
    }),
    p('', { spacingAfter: 40 }),
    makeTable({
      columnWidths: rabCols,
      rows: rabRows,
    }),
    p('', { spacingAfter: 100 }),
    createPPKSignatureTable(master, true),
  ];

  // ============================================================================
  // DOC 7: SPESIFIKASI TEKNIS PAKET E-PURCHASING
  // ============================================================================
  const spekCols = [580, 2300, 4675, 1800]; // sum = 9355
  const spekRows: TableRow[] = [
    new TableRow({
      children: [
        cell('No.', { bold: true, align: AlignmentType.CENTER, widthDxa: spekCols[0] }),
        cell('Elemen Spesifikasi', {
          bold: true,
          align: AlignmentType.CENTER,
          widthDxa: spekCols[1],
        }),
        cell('Uraian Spesifikasi', {
          bold: true,
          align: AlignmentType.CENTER,
          widthDxa: spekCols[2],
        }),
        cell('Keterangan', {
          bold: true,
          align: AlignmentType.CENTER,
          widthDxa: spekCols[3],
        }),
      ],
    }),
  ];

  transaction.items.forEach((item, idx) => {
    spekRows.push(
      new TableRow({
        children: [
          cell(idx === 0 ? '1.' : '', {
            align: AlignmentType.CENTER,
            widthDxa: spekCols[0],
          }),
          cell(idx === 0 ? 'Mutu / kualitas' : '', { widthDxa: spekCols[1] }),
          cell(item.namaBarang, { widthDxa: spekCols[2] }),
          cell(item.keteranganSpesifikasi || '', { widthDxa: spekCols[3] }),
        ],
      })
    );
  });

  transaction.items.forEach((item, idx) => {
    spekRows.push(
      new TableRow({
        children: [
          cell(idx === 0 ? '2.' : '', {
            align: AlignmentType.CENTER,
            widthDxa: spekCols[0],
          }),
          cell(idx === 0 ? 'Jumlah / Kuantitas' : '', { widthDxa: spekCols[1] }),
          cell(formatItemVolumeSatuan(item), { widthDxa: spekCols[2] }),
          cell('', { widthDxa: spekCols[3] }),
        ],
      })
    );
  });

  spekRows.push(
    new TableRow({
      children: [
        cell('3.', { align: AlignmentType.CENTER, widthDxa: spekCols[0] }),
        cell('Tempat', { widthDxa: spekCols[1] }),
        cell(
          [
            p(transaction.lokasiNama, { size: 19, spacingAfter: 10 }),
            p(transaction.lokasiAlamat, { size: 19 }),
          ],
          { widthDxa: spekCols[2] }
        ),
        cell('', { widthDxa: spekCols[3] }),
      ],
    }),
    new TableRow({
      children: [
        cell('4.', { align: AlignmentType.CENTER, widthDxa: spekCols[0] }),
        cell('Waktu', { widthDxa: spekCols[1] }),
        cell(`${transaction.jangkaWaktuHari} Hari Kalender`, { widthDxa: spekCols[2] }),
        cell('', { widthDxa: spekCols[3] }),
      ],
    }),
    new TableRow({
      children: [
        cell('5.', { align: AlignmentType.CENTER, widthDxa: spekCols[0] }),
        cell('Tingkat Layanan', { widthDxa: spekCols[1] }),
        cell(
          `Produk diantarkan ke ${transaction.lokasiNama} ${transaction.lokasiAlamat}`,
          { widthDxa: spekCols[2] }
        ),
        cell('', { widthDxa: spekCols[3] }),
      ],
    })
  );

  const doc7Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('SPESIFIKASI TEKNIS PAKET E-PURCHASING', {
      bold: true,
      underline: true,
      size: 22,
      align: AlignmentType.CENTER,
      spacingAfter: 80,
    }),
    makeTable({
      columnWidths: [2150, 200, 7005],
      noBorder: true,
      rows: [
        kvRow('Program', transaction.program, [2150, 200, 7005], { size: 19 }),
        kvRow('Kegiatan', transaction.kegiatan, [2150, 200, 7005], { size: 19 }),
        kvRow('Sub Kegiatan', transaction.subKegiatan, [2150, 200, 7005], {
          size: 19,
          alignValue: AlignmentType.BOTH,
        }),
        kvRow(
          'Lokasi',
          [
            p(transaction.lokasiNama, { size: 19, spacingAfter: 10 }),
            p(`${transaction.lokasiAlamat}.`, { size: 19 }),
          ],
          [2150, 200, 7005],
          { size: 19 }
        ),
        kvRow('Nama paket pengadaan', `${transaction.namaPaket}.`, [2150, 200, 7005], {
          size: 19,
          boldValue: true,
        }),
      ],
    }),
    p('', { spacingAfter: 35 }),
    makeTable({
      columnWidths: spekCols,
      rows: spekRows,
    }),
    p('', { spacingAfter: 60 }),
    createPPKSignatureTable(master, true),
  ];

  // ============================================================================
  // DOC 8: RIWAYAT SURVEI HARGA (LANDSCAPE)
  // ============================================================================
  const riwCols = [450, 2634, 650, 750, 1450, 1600, 1450, 1600, 1450, 1600, 2050]; // sum = 14684
  const riwRows: TableRow[] = [
    new TableRow({
      children: [
        cell('No.', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          rowSpan: 2,
          widthDxa: riwCols[0],
        }),
        cell('JENIS BARANG', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          rowSpan: 2,
          widthDxa: riwCols[1],
        }),
        cell('VOL', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          rowSpan: 2,
          widthDxa: riwCols[2],
        }),
        cell('SAT', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          rowSpan: 2,
          widthDxa: riwCols[3],
        }),
        cell('PAGU ANGGARAN (termasuk pajak)', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          colSpan: 2,
          widthDxa: riwCols[4] + riwCols[5],
        }),
        cell('SURVEI I', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          colSpan: 2,
          widthDxa: riwCols[6] + riwCols[7],
        }),
        cell('SURVEI II', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          colSpan: 2,
          widthDxa: riwCols[8] + riwCols[9],
        }),
        cell('PENETAPAN HARGA PENAWARAN', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          rowSpan: 2,
          widthDxa: riwCols[10],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('HARGA SATUAN', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          widthDxa: riwCols[4],
        }),
        cell('JUMLAH', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          widthDxa: riwCols[5],
        }),
        cell('HARGA SATUAN', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          widthDxa: riwCols[6],
        }),
        cell('JUMLAH', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          widthDxa: riwCols[7],
        }),
        cell('HARGA SATUAN', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          widthDxa: riwCols[8],
        }),
        cell('JUMLAH', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          widthDxa: riwCols[9],
        }),
      ],
    }),
  ];

  for (const {
    globalIndex,
    item,
    subtotalPagu,
    subtotalPenetapan,
    subtotalSurvei1,
    subtotalSurvei2,
  } of summary.flatItems) {
    riwRows.push(
      new TableRow({
        children: [
          cell('', {
            colSpan: 6,
            size: 15,
            widthDxa:
              riwCols[0] + riwCols[1] + riwCols[2] + riwCols[3] + riwCols[4] + riwCols[5],
          }),
          cell(item.toko1.namaToko, {
            bold: true,
            size: 15,
            align: AlignmentType.CENTER,
            colSpan: 2,
            widthDxa: riwCols[6] + riwCols[7],
          }),
          cell(item.toko2.namaToko, {
            bold: true,
            size: 15,
            align: AlignmentType.CENTER,
            colSpan: 2,
            widthDxa: riwCols[8] + riwCols[9],
          }),
          cell('', { size: 15, widthDxa: riwCols[10] }),
        ],
      }),
      new TableRow({
        children: [
          cell(String(globalIndex), {
            size: 16,
            align: AlignmentType.CENTER,
            widthDxa: riwCols[0],
          }),
          cell(item.namaBarang, { size: 16, widthDxa: riwCols[1] }),
          cell(formatItemVolume(item), {
            size: 16,
            align: AlignmentType.CENTER,
            widthDxa: riwCols[2],
          }),
          cell(formatItemSatuan(item), {
            size: 16,
            align: AlignmentType.CENTER,
            widthDxa: riwCols[3],
          }),
          cell(formatRupiahDoc(item.hargaPaguSatuan), {
            size: 16,
            align: AlignmentType.RIGHT,
            widthDxa: riwCols[4],
          }),
          cell(formatRupiahDoc(subtotalPagu), {
            size: 16,
            align: AlignmentType.RIGHT,
            widthDxa: riwCols[5],
          }),
          cell(formatRupiahDoc(item.toko1.hargaSatuan), {
            size: 16,
            align: AlignmentType.RIGHT,
            widthDxa: riwCols[6],
          }),
          cell(formatRupiahDoc(subtotalSurvei1), {
            size: 16,
            align: AlignmentType.RIGHT,
            widthDxa: riwCols[7],
          }),
          cell(formatRupiahDoc(item.toko2.hargaSatuan), {
            size: 16,
            align: AlignmentType.RIGHT,
            widthDxa: riwCols[8],
          }),
          cell(formatRupiahDoc(subtotalSurvei2), {
            size: 16,
            align: AlignmentType.RIGHT,
            widthDxa: riwCols[9],
          }),
          cell(formatRupiahDoc(subtotalPenetapan), {
            bold: true,
            size: 16,
            align: AlignmentType.RIGHT,
            widthDxa: riwCols[10],
          }),
        ],
      })
    );
  }

  riwRows.push(
    new TableRow({
      children: [
        cell('Jumlah', {
          bold: true,
          size: 16,
          align: AlignmentType.CENTER,
          colSpan: 5,
          widthDxa: riwCols[0] + riwCols[1] + riwCols[2] + riwCols[3] + riwCols[4],
        }),
        cell(formatRupiahDoc(summary.totalPagu), {
          bold: true,
          size: 16,
          align: AlignmentType.RIGHT,
          widthDxa: riwCols[5],
        }),
        cell('', { size: 16, widthDxa: riwCols[6] }),
        cell('', { size: 16, widthDxa: riwCols[7] }),
        cell('', { size: 16, widthDxa: riwCols[8] }),
        cell('', { size: 16, widthDxa: riwCols[9] }),
        cell(formatRupiahDoc(summary.totalPenetapan), {
          bold: true,
          size: 16,
          align: AlignmentType.RIGHT,
          widthDxa: riwCols[10],
        }),
      ],
    })
  );

  const doc8Elements: (Paragraph | Table)[] = [
    p('RIWAYAT SURVEI HARGA', {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`${master.dinasName.toUpperCase()} KABUPATEN MALANG`, {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`TAHUN ANGGARAN ${transaction.tahunAnggaran}`, {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 80,
    }),
    makeTable({
      columnWidths: [1950, 200, 12534],
      noBorder: true,
      rows: [
        kvRow('Nama Pekerjaan', transaction.namaPaket, [1950, 200, 12534], {
          size: 18,
          boldLabel: true,
          boldValue: true,
        }),
        kvRow(
          'Pagu Anggaran',
          formatRupiahDoc(summary.totalPagu),
          [1950, 200, 12534],
          { size: 18, boldLabel: true, boldValue: true }
        ),
      ],
    }),
    ...transaction.kategoriRekening.flatMap((kr) => [
      p(kr.namaRekening, { bold: true, size: 17, spacingBefore: 25, spacingAfter: 5 }),
      p(kr.kodeRekening, { bold: true, size: 17, spacingAfter: 30 }),
    ]),
    makeTable({
      columnWidths: riwCols,
      rows: riwRows,
    }),
    p('', { spacingAfter: 50 }),
    createPPKSignatureTable(master, true, undefined, CONTENT_W_LANDSCAPE),
  ];

  // ============================================================================
  // DOC 9: LAMPIRAN SURVEI HARGA (PORTRAIT)
  // ============================================================================
  const lampCols = [650, 1950, 3155, 1350, 2250]; // sum = 9355
  const doc9Tables: (Paragraph | Table)[] = [];

  for (const { globalIndex, item } of summary.flatItems) {
    const imgs = itemImagesMap.get(item.id);
    const docCell1Children: Paragraph[] = [
      p(item.toko1.namaToko, {
        bold: true,
        size: 16,
        align: AlignmentType.CENTER,
        spacingAfter: 35,
      }),
    ];
    if (imgs?.img1) {
      docCell1Children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new ImageRun({
              data: imgs.img1.data,
              type: imgs.img1.type,
              transformation: { width: 155, height: 110 },
            }),
          ],
        })
      );
    }

    const docCell2Children: Paragraph[] = [
      p(item.toko2.namaToko, {
        bold: true,
        size: 16,
        align: AlignmentType.CENTER,
        spacingAfter: 35,
      }),
    ];
    if (imgs?.img2) {
      docCell2Children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new ImageRun({
              data: imgs.img2.data,
              type: imgs.img2.type,
              transformation: { width: 155, height: 110 },
            }),
          ],
        })
      );
    }

    doc9Tables.push(
      makeTable({
        columnWidths: lampCols,
        rows: [
          new TableRow({
            children: [
              cell('No.', {
                bold: true,
                size: 17,
                align: AlignmentType.CENTER,
                widthDxa: lampCols[0],
              }),
              cell('JENIS BARANG', {
                bold: true,
                size: 17,
                align: AlignmentType.CENTER,
                widthDxa: lampCols[1],
              }),
              cell('DOKUMENTASI', {
                bold: true,
                size: 17,
                align: AlignmentType.CENTER,
                widthDxa: lampCols[2],
              }),
              cell('TANGGAL SURVEI', {
                bold: true,
                size: 17,
                align: AlignmentType.CENTER,
                widthDxa: lampCols[3],
              }),
              cell('LINK SURVEI', {
                bold: true,
                size: 17,
                align: AlignmentType.CENTER,
                widthDxa: lampCols[4],
              }),
            ],
          }),
          new TableRow({
            children: [
              cell(`${globalIndex}.a.`, {
                bold: true,
                size: 17,
                align: AlignmentType.CENTER,
                widthDxa: lampCols[0],
              }),
              cell(item.namaBarang, { size: 17, widthDxa: lampCols[1] }),
              cell(docCell1Children, { widthDxa: lampCols[2] }),
              cell(formatTanggalIndo(item.toko1.tanggalSurvei, true), {
                size: 17,
                align: AlignmentType.CENTER,
                vAlign: VerticalAlign.CENTER,
                widthDxa: lampCols[3],
              }),
              cell(item.toko1.link || '-', {
                size: 16,
                underline: Boolean(item.toko1.link),
                vAlign: VerticalAlign.CENTER,
                widthDxa: lampCols[4],
              }),
            ],
          }),
          new TableRow({
            children: [
              cell(`${globalIndex}.b.`, {
                bold: true,
                size: 17,
                align: AlignmentType.CENTER,
                widthDxa: lampCols[0],
              }),
              cell(item.namaBarang, { size: 17, widthDxa: lampCols[1] }),
              cell(docCell2Children, { widthDxa: lampCols[2] }),
              cell(formatTanggalIndo(item.toko2.tanggalSurvei, true), {
                size: 17,
                align: AlignmentType.CENTER,
                vAlign: VerticalAlign.CENTER,
                widthDxa: lampCols[3],
              }),
              cell(item.toko2.link || '-', {
                size: 16,
                underline: Boolean(item.toko2.link),
                vAlign: VerticalAlign.CENTER,
                widthDxa: lampCols[4],
              }),
            ],
          }),
        ],
      }),
      p('', { spacingAfter: 80 })
    );
  }

  const doc9Elements: (Paragraph | Table)[] = [
    p('LAMPIRAN SURVEI HARGA', {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`${master.dinasName.toUpperCase()} KABUPATEN MALANG`, {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`TAHUN ANGGARAN ${transaction.tahunAnggaran}`, {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      spacingAfter: 100,
    }),
    ...doc9Tables,
    p('Keterangan :', { bold: true, size: 17, spacingBefore: 40, spacingAfter: 15 }),
    p('1. Survey bisa dilakukan lebih dari 2 sumber data', {
      size: 17,
      spacingAfter: 15,
    }),
    p(
      '2. Penetapan harga referensi ditetapkan oleh PPK dapat menggunakan harga terendah hasil survey/harga rata2/harga tertinggi dengan dasar pertimbangan yang dapat dipertanggungjawabkan',
      { size: 17 }
    ),
  ];

  // ============================================================================
  // DOC 10: SURAT PESANAN (SP) - KONTRAK E-PURCHASING
  // ============================================================================
  const k = transaction.kontrak;
  const tglKirimIndo = formatTanggalIndo(k.tanggalSelesaiKerja);
  const tglKirimSlash = formatTanggalSlash(k.tanggalSelesaiKerja);

  const spProdCols = [2555, 850, 750, 1350, 1150, 1300, 1400]; // sum = 9355
  const spProdRows: TableRow[] = [
    new TableRow({
      children: [
        cell('Nama Produk', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          widthDxa: spProdCols[0],
        }),
        cell('Kuantitas', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          widthDxa: spProdCols[1],
        }),
        cell('Mata Uang', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          widthDxa: spProdCols[2],
        }),
        cell('Harga Satuan', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          widthDxa: spProdCols[3],
        }),
        cell('Harga Kirim', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          widthDxa: spProdCols[4],
        }),
        cell('Tanggal Pengiriman Produk', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          widthDxa: spProdCols[5],
        }),
        cell('Total Harga', {
          bold: true,
          size: 17,
          align: AlignmentType.CENTER,
          widthDxa: spProdCols[6],
        }),
      ],
    }),
  ];

  for (const grp of summary.groups) {
    spProdRows.push(
      new TableRow({
        children: [
          cell(grp.kategori, {
            bold: true,
            size: 17,
            colSpan: 7,
            widthDxa: CONTENT_W,
          }),
        ],
      })
    );
    for (const { item, hargaKontrakSatuan, subtotalKontrak } of grp.items) {
      spProdRows.push(
        new TableRow({
          children: [
            cell(item.namaBarang, { size: 17, widthDxa: spProdCols[0] }),
            cell(formatItemVolumeSatuan(item), {
              size: 17,
              align: AlignmentType.CENTER,
              widthDxa: spProdCols[1],
            }),
            cell('Rp.', {
              size: 17,
              align: AlignmentType.CENTER,
              widthDxa: spProdCols[2],
            }),
            cell(formatRupiahDec2(hargaKontrakSatuan), {
              size: 17,
              align: AlignmentType.RIGHT,
              widthDxa: spProdCols[3],
            }),
            cell(`Rp. ${item.ongkosKirimKontrak || 0}`, {
              size: 17,
              align: AlignmentType.CENTER,
              widthDxa: spProdCols[4],
            }),
            cell(tglKirimIndo, {
              size: 17,
              align: AlignmentType.CENTER,
              widthDxa: spProdCols[5],
            }),
            cell(formatRupiahDec2(subtotalKontrak), {
              size: 17,
              align: AlignmentType.RIGHT,
              widthDxa: spProdCols[6],
            }),
          ],
        })
      );
    }
  }

  const spFirst6W =
    spProdCols[0] +
    spProdCols[1] +
    spProdCols[2] +
    spProdCols[3] +
    spProdCols[4] +
    spProdCols[5];

  spProdRows.push(
    new TableRow({
      children: [
        cell('Jumlah', {
          size: 17,
          align: AlignmentType.RIGHT,
          colSpan: 6,
          widthDxa: spFirst6W,
        }),
        cell(formatRupiahDoc(summary.jumlahKontrakSebelumPPN), {
          size: 17,
          align: AlignmentType.RIGHT,
          widthDxa: spProdCols[6],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell(`PPn ${summary.ppnPersen}%`, {
          size: 17,
          align: AlignmentType.RIGHT,
          colSpan: 6,
          widthDxa: spFirst6W,
        }),
        cell(formatRupiahDoc(summary.ppnKontrak), {
          size: 17,
          align: AlignmentType.RIGHT,
          widthDxa: spProdCols[6],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('TOTAL', {
          bold: true,
          size: 17,
          align: AlignmentType.RIGHT,
          colSpan: 6,
          widthDxa: spFirst6W,
        }),
        cell(formatRupiahDoc(summary.totalNilaiKontrak), {
          bold: true,
          size: 17,
          align: AlignmentType.RIGHT,
          widthDxa: spProdCols[6],
        }),
      ],
    })
  );

  const spClauseP = (txt: string, indentLeft = 0, bold = false, spacingAfter = 25) =>
    p(txt, {
      size: 18,
      bold,
      indentLeft: indentLeft || undefined,
      align: AlignmentType.BOTH,
      spacingAfter,
    });

  const doc10Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('SURAT PESANAN', {
      bold: true,
      size: 22,
      align: AlignmentType.CENTER,
      spacingAfter: 60,
    }),
    makeTable({
      columnWidths: [4300, 5055],
      rows: [
        new TableRow({
          children: [
            cell('SURAT PESANAN (SP)', {
              bold: true,
              size: 21,
              align: AlignmentType.CENTER,
              vAlign: VerticalAlign.CENTER,
              rowSpan: 2,
              widthDxa: 4300,
            }),
            cell(
              [
                p(
                  'Satuan Kerja Pejabat Penandatangan / Pengesahan Tanda Bukti Perjanjian :',
                  { size: 19, spacingAfter: 15 }
                ),
                p(`${master.dinasName.toUpperCase()} KABUPATEN MALANG`, {
                  bold: true,
                  size: 19,
                }),
              ],
              { widthDxa: 5055 }
            ),
          ],
        }),
        new TableRow({
          children: [
            cell(
              [
                p(`Nomor : ${k.nomorSP}`, { size: 19, spacingAfter: 10 }),
                p(`Tanggal : ${formatTanggalIndo(k.tanggalSP)}`, { size: 19 }),
              ],
              { widthDxa: 5055 }
            ),
          ],
        }),
      ],
    }),
    p('Yang bertanda tangan di bawah ini :', {
      size: 19,
      spacingBefore: 60,
      spacingAfter: 30,
    }),
    p(ppk.nama, { bold: true, size: 19, spacingAfter: 10 }),
    p(jabatanKadis, { size: 19, spacingAfter: 10 }),
    p(master.organisasiSKPD, { size: 19, spacingAfter: 10 }),
    p(master.alamat, { size: 19, spacingAfter: 35 }),
    p('selanjutnya disebut sebagai Pejabat Pembuat Komitmen;', {
      size: 19,
      spacingAfter: 35,
    }),
    p(k.namaDirektur, { bold: true, size: 19, spacingAfter: 10 }),
    p(`${k.jabatanDirektur} ${k.namaPerusahaan}`, { size: 19, spacingAfter: 10 }),
    p(k.alamatPerusahaan, { size: 19, spacingAfter: 35 }),
    p('selanjutnya disebut sebagai Penyedia;', { size: 19, spacingAfter: 35 }),
    p('untuk mengirimkan barang dengan memperhatikan ketentuan-ketentuan sebagai berikut :', {
      size: 19,
      spacingAfter: 35,
    }),
    p('Rincian Barang', { size: 19, spacingAfter: 15 }),
    p('Daftar Produk PAKET', { bold: true, size: 19, spacingAfter: 25 }),
    makeTable({
      columnWidths: spProdCols,
      rows: spProdRows,
    }),
    p(`Terbilang : ${summary.terbilangKontrak}`, {
      size: 19,
      borderBottom: true,
      spacingBefore: 35,
      spacingAfter: 25,
    }),
    p('Keterangan : Sudah termasuk beban pajak yang berlaku dan ongkos kirim', {
      size: 19,
      spacingAfter: 80,
    }),
    spClauseP('SYARAT DAN KETENTUAN :', 0, true, 40),
    spClauseP('1. Hak dan Kewajiban', 0, true, 20),
    spClauseP('a. Penyedia', 240, false, 15),
    spClauseP(
      '1. Penyedia memiliki hak menerima pembayaran atas pembelian barang sesuai dengan total harga dan waktu yang tercantum di dalam SP ini.',
      480
    ),
    spClauseP('2. Penyedia memiliki kewajiban:', 480, false, 15),
    spClauseP(
      'a. tidak membuat dan/atau menyampaikan dokumen dan/atau keterangan lain yang tidak benar untuk memenuhi persyaratan Katalog Elektronik;',
      720
    ),
    spClauseP(
      'b. tidak menjual barang melalui e-Purchasing lebih mahal dari harga barang yang dijual selain melalui e-Purchasing pada periode penjualan, jumlah, dan tempat serta spesifikasi teknis dan persyaratan yang sama;',
      720
    ),
    spClauseP(
      `c. mengirimkan barang sesuai spesifikasi dalam SP ini selambat-lambatnya pada (${tglKirimSlash}) sejak SP ini diterima oleh Penyedia;`,
      720
    ),
    spClauseP(
      'd. bertanggungjawab atas keamanan, kualitas, dan kuantitas barang yang dipesan;',
      720
    ),
    spClauseP(
      'e. mengganti barang setelah Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian melalui Pejabat/Panitia Penerima Hasil Pekerjaan (PPHP) melakukan pemeriksaan barang dan menemukan bahwa:',
      720
    ),
    spClauseP('1. barang rusak akibat cacat produksi;', 960),
    spClauseP(
      '2. barang rusak pada saat pengiriman barang hingga barang diterima oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian; dan/atau',
      960
    ),
    spClauseP(
      '3. barang yang diterima tidak sesuai dengan spesifikasi barang sebagaimana tercantum pada SP ini.',
      960
    ),
    spClauseP(
      'f. memberikan layanan tambahan yang diperjanjikan seperti instalasi, testing, dan pelatihan (apabila ada);',
      720
    ),
    spClauseP(
      'g. memberikan layanan purnajual sesuai dengan ketentuan garansi masing-masing barang.',
      720,
      false,
      35
    ),
    spClauseP('b. PEJABAT PENANDATANGAN/PENGESAHAN TANDA BUKTI PERJANJIAN', 240, false, 15),
    spClauseP(
      '1. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian memiliki hak:',
      480,
      false,
      15
    ),
    spClauseP(
      'a. menerima barang dari Penyedia sesuai dengan spesifikasi yang tercantum di dalam SP ini.',
      720
    ),
    spClauseP(
      'b. mendapatkan jaminan keamanan, kualitas, dan kuantitas barang yang dipesan;',
      720
    ),
    spClauseP('c. mendapatkan penggantian barang, dalam hal:', 720),
    spClauseP('1. barang rusak akibat cacat produksi;', 960),
    spClauseP(
      '2. barang rusak pada saat pengiriman barang hingga barang diterima oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian; dan/atau',
      960
    ),
    spClauseP(
      '3. barang yang diterima tidak sesuai dengan spesifikasi barang sebagaimana tercantum pada SP ini.',
      960
    ),
    spClauseP(
      'd. Mendapatkan layanan tambahan yang diperjanjikan seperti instalasi, testing, dan pelatihan (apabila ada);',
      720
    ),
    spClauseP(
      'e. Mendapatkan layanan purnajual sesuai dengan ketentuan garansi masing-masing barang.',
      720
    ),
    spClauseP(
      '2. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian memiliki kewajiban:',
      480,
      false,
      15
    ),
    spClauseP(
      'a. melakukan pembayaran sesuai dengan total harga yang tercantum di dalam SP ini; dan',
      720
    ),
    spClauseP('b. memeriksa kualitas dan kuantitas barang;', 720),
    spClauseP(
      'c. memastikan layanan tambahan telah dilaksanakan oleh penyedia seperti instalasi, testing, dan pelatihan (apabila ada).',
      720,
      false,
      40
    ),
    spClauseP('2. Waktu Pengiriman Barang', 0, false, 15),
    spClauseP(
      `Penyedia mengirimkan barang dan melaksanakan layanan sesuai spesifikasi dalam SP ini selambat-lambatnya pada (${tglKirimSlash}) sejak SP ini diterima oleh Penyedia.`,
      240,
      false,
      35
    ),
    spClauseP('3. Alamat Pengiriman Barang', 0, false, 15),
    spClauseP('Penyedia mengirimkan barang ke alamat sebagai berikut:', 240, false, 10),
    spClauseP(transaction.lokasiNama, 240, false, 10),
    spClauseP(transaction.lokasiAlamat, 240, false, 35),
    spClauseP('4. Tanggal Barang Diterima', 0, false, 15),
    spClauseP(`Barang diterima pada (${tglKirimSlash})`, 240, false, 35),
    spClauseP('5. Penerimaan, Pemeriksaan, dan Retur Barang', 0, false, 15),
    spClauseP(
      'a. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian melalui PPHP menerima barang dan melakukan pemeriksaan barang berdasarkan ketentuan di dalam SP ini.',
      360
    ),
    spClauseP(
      'b. Dalam hal pada saat pemeriksaan barang, Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian menemukan bahwa:',
      360
    ),
    spClauseP('1. barang rusak akibat cacat produksi;', 600),
    spClauseP(
      '2. barang rusak pada saat pengiriman barang hingga barang diterima oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian; dan/atau',
      600
    ),
    spClauseP(
      '3. barang yang diterima tidak sesuai dengan spesifikasi barang sebagaimana tercantum pada SP ini.',
      600
    ),
    spClauseP(
      'Maka Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat menolak penerimaan barang dan menyampaikan pemberitahuan tertulis kepada Penyedia atas cacat mutu atau kerusakan barang tersebut.',
      360
    ),
    spClauseP(
      'c. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat meminta Tim Teknis untuk melakukan pemeriksaan atau uji mutu terhadap barang yang diterima.',
      360
    ),
    spClauseP(
      'd. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat memerintahkan Penyedia untuk menemukan dan mengungkapkan cacat mutu serta melakukan pengujian terhadap barang yang dianggap Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian mengandung cacat mutu atau kerusakan.',
      360
    ),
    spClauseP(
      'e. Penyedia bertanggungjawab atas cacat mutu atau kerusakan barang dengan memberikan penggantian barang.',
      360,
      false,
      35
    ),
    spClauseP('6. Harga', 0, false, 15),
    spClauseP(
      '1. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian membayar kepada Penyedia atas pelaksanaan pekerjaan sebesar harga yang tercantum pada SP ini.',
      360
    ),
    spClauseP(
      '2. Harga SP telah memperhitungkan keuntungan, pajak, biaya overhead, biaya pengiriman, biaya asuransi, biaya layanan tambahan (apabila ada) dan biaya layanan purna jual.',
      360
    ),
    spClauseP(
      '3. Rincian harga SP sesuai dengan rincian yang tercantum dalam daftar kuantitas dan harga.',
      360,
      false,
      35
    ),
    spClauseP('7. Perpajakan', 0, false, 15),
    spClauseP(
      'Penyedia berkewajiban untuk membayar semua pajak, bea, retribusi, dan pungutan lain yang sah yang dibebankan oleh hukum yang berlaku atas pelaksanaan SP. Semua pengeluaran perpajakan ini dianggap telah termasuk dalam harga SP.',
      240,
      false,
      35
    ),
    spClauseP('8. Pengalihan dan/atau subkontrak', 0, false, 15),
    spClauseP(
      'a. Pengalihan seluruh Kontrak hanya diperbolehkan dalam hal terdapat pergantian nama Penyedia, baik sebagai akibat peleburan (merger), konsolidasi, atau pemisahan.',
      360
    ),
    spClauseP(
      'b. Pengalihan sebagian pelaksanaan Kontrak dilakukan dengan ketentuan sebagai berikut:',
      360
    ),
    spClauseP(
      '1. Pengalihan sebagian pelaksanaan Kontrak untuk barang/jasa yang bersifat standar dilakukan untuk pekerjaan seperti pengiriman barang (distribusi barang) dari Penyedia kepada Kementerian/Lembaga/Satuan Kerja Perangkat Daerah/Institusi; dan',
      600
    ),
    spClauseP(
      '2. Pengalihan sebagian pelaksanaan Kontrak dapat dilakukan untuk barang/jasa yang bersifat tidak standar misalnya untuk pekerjaan konstruksi (minor), pengadaan ambulans, ready mix, hot mix dan lain sebagainya.',
      600,
      false,
      35
    ),
    spClauseP('9. Perubahan SP', 0, false, 15),
    spClauseP('a. SP hanya dapat diubah melalui adendum SP.', 360),
    spClauseP(
      'b. Perubahan SP dapat dilakukan apabila disetujui oleh para pihak dalam hal terjadi perubahan jadwal pengiriman barang atas permintaan Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian atau permohonan Penyedia yang disepakati oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian.',
      360,
      false,
      35
    ),
    spClauseP('10. Peristiwa Kompensasi', 0, false, 15),
    spClauseP(
      'a. Peristiwa Kompensasi dapat diberikan kepada penyedia dalam hal Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian terlambat melakukan pembayaran prestasi pekerjaan kepada Penyedia.',
      360
    ),
    spClauseP(
      'b. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dikenakan ganti rugi atas keterlambatan pembayaran sebesar.',
      360,
      false,
      35
    ),
    spClauseP('11. Hak Atas Kekayaan Intelektual', 0, false, 15),
    spClauseP(
      'a. Penyedia berkewajiban untuk memastikan bahwa barang yang dikirimkan/dipasok tidak melanggar Hak Atas Kekayaan Intelektual (HAKI) pihak manapun dan dalam bentuk apapun.',
      360
    ),
    spClauseP(
      'b. Penyedia berkewajiban untuk menanggung Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dari atau atas semua tuntutan, tanggung jawab, kewajiban, kehilangan, kerugian, denda, gugatan atau tuntutan hukum, proses pemeriksaan hukum, dan biaya yang dikenakan terhadap Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian sehubungan dengan klaim atas pelanggaran HAKI, termasuk pelanggaran hak cipta, merek dagang, hak paten, dan bentuk HAKI lainnya yang dilakukan atau diduga dilakukan oleh Penyedia.',
      360,
      false,
      35
    ),
    spClauseP('12. Jaminan Bebas Cacat Mutu/Garansi', 0, false, 15),
    spClauseP(
      'a. Penyedia dengan jaminan pabrikan dari produsen pabrikan (jika ada) berkewajiban untuk menjamin bahwa selama penggunaan secara wajar oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian, Barang tidak mengandung cacat mutu yang disebabkan oleh tindakan atau kelalaian Penyedia, atau cacat mutu akibat desain, bahan, dan cara kerja.',
      360
    ),
    spClauseP(
      'b. Jaminan bebas cacat mutu ini berlaku sampai dengan 90 (Sembilan Puluh) hari setelah serah terima Barang atau jangka waktu lain yang ditetapkan dalam SP ini.',
      360
    ),
    spClauseP(
      'c. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian akan menyampaikan pemberitahuan cacat mutu kepada Penyedia segera setelah ditemukan cacat mutu tersebut selama Masa Layanan Purnajual.',
      360
    ),
    spClauseP(
      'd. Terhadap pemberitahuan cacat mutu oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian, Penyedia berkewajiban untuk memperbaiki atau mengganti Barang dalam jangka waktu yang ditetapkan dalam pemberitahuan tersebut.',
      360
    ),
    spClauseP(
      'e. Jika Penyedia tidak memperbaiki atau mengganti Barang akibat cacat mutu dalam jangka waktu yang ditentukan, maka Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian akan menghitung biaya perbaikan yang diperlukan dan Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian secara langsung atau melalui pihak ketiga yang ditunjuk oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian akan melakukan perbaikan tersebut. Penyedia berkewajiban untuk membayar biaya perbaikan atau penggantian tersebut sesuai dengan klaim yang diajukan secara tertulis oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian. Biaya tersebut dapat dipotong oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dari nilai tagihan Penyedia.',
      360,
      false,
      35
    ),
    spClauseP('13. Pembayaran', 0, false, 15),
    spClauseP(
      'a. pembayaran prestasi hasil pekerjaan yang disepakati dilakukan oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian, dengan ketentuan:',
      360
    ),
    spClauseP('1. penyedia telah mengajukan tagihan;', 600),
    spClauseP('2. pembayaran dilakukan dengan menggunakan slip transfer; dan', 600),
    spClauseP('3. pembayaran harus dipotong denda (apabila ada) dan pajak.', 600),
    spClauseP(
      'b. pembayaran terakhir hanya dilakukan setelah pekerjaan selesai 100% (seratus perseratus) dan bukti penyerahan pekerjaan diterbitkan.',
      360
    ),
    spClauseP(
      'c. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian melakukan proses pembayaran atas pembelian barang selambat-lambatnya 7 (Tujuh) hari kerja setelah PPK menilai bahwa dokumen pembayaran lengkap dan sah.',
      360,
      false,
      35
    ),
    spClauseP('14. Sanksi', 0, false, 15),
    spClauseP('a. Penyedia dikenakan sanksi apabila:', 360),
    spClauseP(
      '1. Tidak menanggapi pesanan barang selambat-lambatnya 3 (Tiga) hari kerja;',
      600
    ),
    spClauseP(
      '2. Tidak dapat memenuhi pesanan sesuai dengan kesepakatan dalam transaksi melalui e-Purchasing dan SP ini tanpa disertai alasan yang dapat diterima; dan/atau',
      600
    ),
    spClauseP(
      '3. menjual barang melalui proses e-Purchasing dengan harga yang lebih mahal dari harga Barang/Jasa yang dijual selain melalui e-Purchasing pada periode penjualan, jumlah, dan tempat serta spesifikasi teknis dan persyaratan yang sama.',
      600
    ),
    spClauseP(
      'b. Penyedia yang melakukan perbuatan sebagaimana dimaksud dalam huruf a dikenakan sanksi administratif berupa:',
      360
    ),
    spClauseP('1. peringatan tertulis;', 600),
    spClauseP('2. denda; dan', 600),
    spClauseP('3. pelaporan kepada LKPP untuk dilakukan:', 600),
    spClauseP('a. penghentian sementara dalam sistem transaksi e-Purchasing; atau', 840),
    spClauseP('b. penurunan pencantuman dari Katalog Elektronik (e-Catalogue).', 840),
    spClauseP('c. Tata Cara Pengenaan Sanksi', 360),
    spClauseP(
      'Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian mengenakan sanksi sebagaimana dimaksud dalam huruf a dan huruf b berdasarkan ketentuan mengenai sanksi sebagaimana diatur dalam Peraturan Kepala LKPP tentang e-Purchasing.',
      360,
      false,
      35
    ),
    spClauseP('15. Penghentian dan Pemutusan SP', 0, false, 15),
    spClauseP(
      'a. Penghentian SP dapat dilakukan karena pekerjaan sudah selesai atau terjadi Keadaan Kahar.',
      360
    ),
    spClauseP(
      'b. Pemutusan SP oleh Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian',
      360
    ),
    spClauseP(
      '1. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dapat melakukan pemutusan SP apabila:',
      600
    ),
    spClauseP('a. kebutuhan barang/jasa tidak dapat ditunda melebihi batas berakhirnya SP;', 840),
    spClauseP(
      'b. berdasarkan penelitian Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian, Penyedia tidak akan mampu menyelesaikan keseluruhan pekerjaan walaupun diberikan kesempatan sampai dengan 7 (Tujuh) hari kalender sejak masa berakhirnya pelaksanaan pekerjaan untuk menyelesaikan pekerjaan;',
      840
    ),
    spClauseP(
      'c. setelah diberikan kesempatan menyelesaikan pekerjaan sampai dengan 7 (Tujuh) hari kalender sejak masa berakhirnya pelaksanaan pekerjaan, Penyedia Barang/Jasa tidak dapat menyelesaikan pekerjaan;',
      840
    ),
    spClauseP(
      'd. Penyedia lalai/cidera janji dalam melaksanakan kewajibannya dan tidak memperbaiki kelalaiannya dalam jangka waktu yang telah ditetapkan;',
      840
    ),
    spClauseP(
      'e. Penyedia terbukti melakukan KKN, kecurangan dan/atau pemalsuan dalam proses Pengadaan yang diputuskan oleh instansi yang berwenang; dan/atau',
      840
    ),
    spClauseP(
      'f. pengaduan tentang penyimpangan prosedur, dugaan KKN dan/atau pelanggaran persaingan sehat dalam pelaksanaan pengadaan dinyatakan benar oleh instansi yang berwenang.',
      840
    ),
    spClauseP(
      '2. Pemutusan SP sebagaimana dimaksud pada angka 1) dilakukan selambat-lambatnya 7 (Tujuh) hari kerja setelah Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian menyampaikan pemberitahuan rencana pemutusan SP secara tertulis kepada Penyedia.',
      600
    ),
    spClauseP('c. Pemutusan SP oleh Penyedia', 360),
    spClauseP(
      '1. Penyedia dapat melakukan pemutusan Kontrak jika terjadi hal-hal sebagai berikut:',
      600
    ),
    spClauseP(
      'a. akibat keadaan kahar sehingga Penyedia tidak dapat melaksanakan pekerjaan sesuai ketentuan SP atau adendum SP;',
      840
    ),
    spClauseP(
      'b. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian gagal mematuhi keputusan akhir penyelesaian perselisihan; atau',
      840
    ),
    spClauseP(
      'c. Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian tidak memenuhi kewajiban sebagaimana dimaksud dalam SP atau Adendum SP.',
      840
    ),
    spClauseP(
      '2. Pemutusan SP sebagaimana dimaksud pada angka 1) dilakukan selambat-lambatnya 7 (Tujuh) kerja setelah Penyedia menyampaikan pemberitahuan rencana pemutusan SP secara tertulis kepada Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian.',
      600,
      false,
      35
    ),
    spClauseP('16. Denda Keterlambatan Pelaksanaan Pekerjaan', 0, false, 15),
    spClauseP(
      'Penyedia yang terlambat menyelesaikan pekerjaan dalam jangka waktu sebagaimana ditetapkan dalam SP ini karena kesalahan Penyedia, dikenakan denda keterlambatan sebesar 1/1000 (satu perseribu) dari total harga atau dari sebagian total harga sebagaimana tercantum dalam SP ini untuk setiap hari keterlambatan.',
      240,
      false,
      35
    ),
    spClauseP('17. Keadaan Kahar', 0, false, 15),
    spClauseP(
      'a. Keadaan Kahar adalah suatu keadaan yang terjadi diluar kehendak para pihak dan tidak dapat diperkirakan sebelumnya, sehingga kewajiban yang ditentukan dalam SP menjadi tidak dapat dipenuhi.',
      360
    ),
    spClauseP(
      'b. Dalam hal terjadi Keadaan Kahar, Penyedia memberitahukan tentang terjadinya Keadaan Kahar kepada Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian secara tertulis dalam waktu selambat-lambatnya 14 (empat belas) hari kalender sejak terjadinya Keadaan Kahar yang dikeluarkan oleh pihak/instansi yang berwenang sesuai ketentuan peraturan perundang-undangan.',
      360
    ),
    spClauseP(
      'c. Tidak termasuk Keadaan Kahar adalah hal-hal merugikan yang disebabkan oleh perbuatan atau kelalaian para pihak.',
      360
    ),
    spClauseP(
      'd. Keterlambatan pelaksanaan pekerjaan yang diakibatkan oleh terjadinya Keadaan Kahar tidak dikenakan sanksi.',
      360
    ),
    spClauseP(
      'e. Setelah terjadinya Keadaan Kahar, para pihak dapat melakukan kesepakatan, yang dituangkan dalam perubahan SP.',
      360,
      false,
      35
    ),
    spClauseP('18. Penyelesaian Perselisihan', 0, false, 15),
    spClauseP(
      'Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian dan penyedia berkewajiban untuk berupaya sungguh-sungguh menyelesaikan secara damai semua perselisihan yang timbul dari atau berhubungan dengan SP ini atau interpretasinya selama atau setelah pelaksanaan pekerjaan. Jika perselisihan tidak dapat diselesaikan secara musyawarah maka perselisihan akan diselesaikan melalui arbitrase, mediasi, konsiliasi atau pengadilan negeri dalam wilayah hukum Republik Indonesia.',
      240,
      false,
      35
    ),
    spClauseP('19. Larangan Pemberian Komisi', 0, false, 15),
    spClauseP(
      'Penyedia menjamin bahwa tidak satu pun personil satuan kerja Pejabat Penandatangan/Pengesahan Tanda Bukti Perjanjian telah atau akan menerima komisi dalam bentuk apapun (gratifikasi) atau keuntungan tidak sah lainnya baik langsung maupun tidak langsung dari SP ini. Penyedia menyetujui bahwa pelanggaran syarat ini merupakan pelanggaran yang mendasar terhadap SP ini.',
      240,
      false,
      35
    ),
    spClauseP('20. Masa Berlaku SP', 0, false, 15),
    spClauseP(
      'SP ini berlaku sejak tanggal SP ini ditandatangani oleh para pihak sampai dengan selesainya pelaksanaan pekerjaan.',
      240,
      false,
      60
    ),
    p(
      'Demikian SP ini dibuat dan ditandatangani dalam 2 (dua) rangkap bermaterai dan masing-masing memiliki kekuatan hukum yang sama.',
      { size: 19, align: AlignmentType.BOTH, spacingBefore: 40, spacingAfter: 80 }
    ),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p(jabatanKadis, { size: 19, spacingAfter: 10 }),
                p('Kabupaten Malang', { size: 19, spacingAfter: 10 }),
                p('selaku', { size: 19, spacingAfter: 10 }),
                p('Pejabat Pembuat Komitmen', { size: 19, spacingAfter: 560 }),
                p(ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(ppk.pangkat, { size: 19, spacingAfter: 10 }),
                p(`NIP. ${ppk.nip}`, { size: 19 }),
              ],
              { widthDxa: 4855, noBorder: true }
            ),
            cell(
              [
                p('Penyedia', { size: 19, spacingAfter: 300 }),
                p(k.namaPerusahaan, { size: 19, spacingAfter: 560 }),
                p(k.namaDirektur, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(k.jabatanDirektur, { size: 19 }),
              ],
              { widthDxa: 4500, noBorder: true }
            ),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 11: SURAT PERINTAH MULAI KERJA (SPMK)
  // ============================================================================
  const hariTerbilang = angkaKeTerbilang(k.waktuPenyelesaianHari || 5);
  const spmkPartyCols: [number, number, number] = [2100, 220, 7035];
  const spmkKetentuanCols: [number, number, number] = [2450, 220, 6685];

  const doc11Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('SURAT PERINTAH MULAI KERJA (SPMK)', {
      bold: true,
      underline: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`Nomor : ${k.nomorSPMK}`, {
      bold: true,
      size: 20,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 25,
    }),
    p('Paket Pekerjaan :', {
      size: 20,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(transaction.namaPaket, {
      bold: true,
      size: 20,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 10,
    }),
    p(`Tahun Anggaran ${transaction.tahunAnggaran}`, {
      bold: true,
      size: 20,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 80,
    }),
    p('Yang bertanda tangan dibawah ini :', {
      size: 20,
      font: FONT_SERIF,
      spacingAfter: 25,
    }),
    makeTable({
      columnWidths: spmkPartyCols,
      noBorder: true,
      rows: [
        kvRow('Nama', ppk.nama, spmkPartyCols, {
          size: 20,
          font: FONT_SERIF,
          boldValue: true,
        }),
        kvRow(
          'Jabatan',
          `${jabatanKadis} Kabupaten Malang selaku Pejabat Pembuat Komitmen`,
          spmkPartyCols,
          { size: 20, font: FONT_SERIF }
        ),
        kvRow(
          'Alamat',
          [
            p(master.alamat, { size: 20, font: FONT_SERIF, spacingAfter: 15 }),
            p(
              [
                tr('Selanjutnya disebut sebagai ', { size: 20, font: FONT_SERIF }),
                tr('Pengguna Jasa', {
                  size: 20,
                  font: FONT_SERIF,
                  bold: true,
                  italic: true,
                }),
              ],
              { spacingAfter: 10 }
            ),
          ],
          spmkPartyCols,
          { size: 20, font: FONT_SERIF }
        ),
      ],
    }),
    p(
      `Berdasarkan Surat Perintah Kerja (SPK) Nomor : ${k.nomorSP} tanggal ${formatTanggalIndo(
        k.tanggalSP
      )}, bersama ini memerintahkan :`,
      {
        size: 20,
        font: FONT_SERIF,
        align: AlignmentType.BOTH,
        spacingBefore: 50,
        spacingAfter: 35,
      }
    ),
    makeTable({
      columnWidths: spmkPartyCols,
      noBorder: true,
      rows: [
        kvRow('Nama', k.namaDirektur, spmkPartyCols, {
          size: 20,
          font: FONT_SERIF,
          boldValue: true,
        }),
        kvRow('Jabatan', `${k.jabatanDirektur} ${k.namaPerusahaan}`, spmkPartyCols, {
          size: 20,
          font: FONT_SERIF,
        }),
        kvRow('Alamat', k.alamatPerusahaan, spmkPartyCols, {
          size: 20,
          font: FONT_SERIF,
        }),
        kvRow(
          'Nilai Kontrak',
          [
            p(
              [
                tr(`${formatRupiahDoc(summary.totalNilaiKontrak)} (`, {
                  bold: true,
                  size: 20,
                  font: FONT_SERIF,
                }),
                tr(summary.terbilangKontrak, {
                  italic: true,
                  size: 20,
                  font: FONT_SERIF,
                }),
                tr(') termasuk PPN.', { size: 20, font: FONT_SERIF }),
              ],
              { align: AlignmentType.BOTH, spacingAfter: 15 }
            ),
            p(
              [
                tr('selanjutnya disebut sebagai ', { size: 20, font: FONT_SERIF }),
                tr('Penyedia Jasa', {
                  bold: true,
                  italic: true,
                  size: 20,
                  font: FONT_SERIF,
                }),
              ],
              { spacingAfter: 10 }
            ),
          ],
          spmkPartyCols,
          { size: 20, font: FONT_SERIF }
        ),
      ],
    }),
    p(
      'Untuk segera memulai pelaksanaan pekerjaan dengan memperhatikan ketentuan - ketentuan sebagai berikut :',
      { size: 20, font: FONT_SERIF, spacingBefore: 50, spacingAfter: 30 }
    ),
    makeTable({
      columnWidths: spmkKetentuanCols,
      noBorder: true,
      rows: [
        kvRow('Paket Pengadaan', transaction.namaPaket, spmkKetentuanCols, {
          size: 20,
          font: FONT_SERIF,
          boldValue: true,
        }),
        kvRow(
          'Tanggal Mulai Kerja',
          `${formatTanggalIndo(k.tanggalMulaiKerja)} s/d ${formatTanggalIndo(
            k.tanggalSelesaiKerja
          )}.`,
          spmkKetentuanCols,
          { size: 20, font: FONT_SERIF }
        ),
        kvRow(
          'Syarat - syarat pekerjaan',
          'sesuai dengan Surat Perintah Kerja (SPK)',
          spmkKetentuanCols,
          { size: 20, font: FONT_SERIF }
        ),
        kvRow(
          'Waktu penyelesaian',
          `selama ${k.waktuPenyelesaianHari} (${hariTerbilang}) Hari Kalender dan pekerjaan harus sudah selesai pada tanggal ${formatTanggalIndo(
            k.tanggalSelesaiKerja
          )}.`,
          spmkKetentuanCols,
          { size: 20, font: FONT_SERIF, alignValue: AlignmentType.BOTH }
        ),
        kvRow(
          'Denda',
          'Terhadap setiap hari keterlambatan pelaksanaan / penyelesaian pekerjaan, Penyedia akan dikenakan Denda Keterlambatan sebesar 1/1000 (satu per seribu) dari Nilai Kontrak sebelum PPN sesuai dengan ketentuan dalam Syarat Umum SPK.',
          spmkKetentuanCols,
          { size: 20, font: FONT_SERIF, alignValue: AlignmentType.BOTH }
        ),
      ],
    }),
    p('', { spacingAfter: 80 }),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p('', { size: 20, font: FONT_SERIF, spacingAfter: 15 }),
                p('PENGGUNA JASA', {
                  bold: true,
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(jabatanKadis, { size: 20, font: FONT_SERIF, spacingAfter: 10 }),
                p('Kabupaten Malang', { size: 20, font: FONT_SERIF, spacingAfter: 10 }),
                p('selaku', { size: 20, font: FONT_SERIF, spacingAfter: 10 }),
                p('Pejabat Pembuat Komitmen', {
                  bold: true,
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 540,
                }),
                p(ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(ppk.pangkat, { size: 20, font: FONT_SERIF, spacingAfter: 10 }),
                p(`NIP. ${ppk.nip}`, { size: 20, font: FONT_SERIF }),
              ],
              { widthDxa: 4855, noBorder: true }
            ),
            cell(
              [
                p(`${master.kotaPenetapan}, ${formatTanggalIndo(k.tanggalSPMK)}`, {
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p('Setuju dan sanggup melaksanakan', {
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p('PENYEDIA JASA', {
                  bold: true,
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(k.namaPerusahaan, {
                  bold: true,
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 660,
                }),
                p(k.namaDirektur, {
                  bold: true,
                  underline: true,
                  size: 20,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(k.jabatanDirektur, { size: 20, font: FONT_SERIF }),
              ],
              { widthDxa: 4500, noBorder: true }
            ),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 12: COVER SERTIFIKAT PEMBAYARAN
  // ============================================================================
  const coverChildren: Paragraph[] = [
    p('', { spacingAfter: 60 }),
  ];

  if (logoImg) {
    coverChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
        children: [
          new ImageRun({
            data: logoImg.data,
            type: logoImg.type,
            transformation: { width: 110, height: 128 },
          }),
        ],
      })
    );
  }

  coverChildren.push(
    p(master.dinasName.toUpperCase(), {
      size: 26,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p('KABUPATEN MALANG', {
      size: 26,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 240,
    }),
    p('SERTIFIKAT PEMBAYARAN', {
      bold: true,
      size: 42,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 200,
    }),
    p('SURAT PESANAN (SP)', {
      bold: true,
      size: 24,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 20,
    }),
    p(`Nomor : ${k.nomorSP}`, {
      bold: true,
      size: 24,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 20,
    }),
    p(`Tanggal : ${formatTanggalIndo(k.tanggalSP)}`, {
      bold: true,
      size: 24,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 200,
    }),
    p('KEGIATAN :', {
      bold: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p(transaction.kegiatan, {
      bold: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 120,
    }),
    p('SUB KEGIATAN :', {
      bold: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p(transaction.subKegiatan, {
      bold: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 120,
    }),
    p('PEKERJAAN :', {
      bold: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p(transaction.namaPaket, {
      bold: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 140,
    }),
    p(`TAHUN ANGGARAN ${transaction.tahunAnggaran}`, {
      bold: true,
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 650,
    }),
    p('', { borderBottom: true, spacingAfter: 120 }),
    p('Pelaksana :', {
      bold: true,
      size: 24,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 25,
    }),
    p(k.namaPerusahaan, {
      bold: true,
      size: 25,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 25,
    }),
    p(k.alamatPerusahaan, {
      size: 23,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 100,
    })
  );

  const doc12Elements: (Paragraph | Table)[] = [
    makeTable({
      columnWidths: [CONTENT_W],
      borders: {
        top: THICK_BORDER,
        bottom: THICK_BORDER,
        left: THICK_BORDER,
        right: THICK_BORDER,
        insideHorizontal: SINGLE_BORDER,
        insideVertical: SINGLE_BORDER,
      },
      rows: [
        new TableRow({
          children: [
            cell(coverChildren, {
              widthDxa: CONTENT_W,
              margins: { top: 280, bottom: 280, left: 320, right: 320 },
              borders: {
                top: THICK_BORDER,
                bottom: THICK_BORDER,
                left: THICK_BORDER,
                right: THICK_BORDER,
              },
            }),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 13: LAPORAN KEMAJUAN PEKERJAAN (KPP)
  // ============================================================================
  const kppSubCols: [number, number, number] = [2350, 200, 6805];
  const kppTableCols = [550, 3305, 1000, 1100, 1700, 1700]; // sum = 9355
  const kppFirst5W =
    kppTableCols[0] + kppTableCols[1] + kppTableCols[2] + kppTableCols[3] + kppTableCols[4];

  const kppTableRows: TableRow[] = [
    new TableRow({
      children: [
        cell('Rincian Barang', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.CENTER,
          colSpan: 6,
          widthDxa: CONTENT_W,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('No.', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.CENTER,
          widthDxa: kppTableCols[0],
        }),
        cell('Jenis Barang', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.CENTER,
          widthDxa: kppTableCols[1],
        }),
        cell('Kuantitas', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.CENTER,
          widthDxa: kppTableCols[2],
        }),
        cell('Satuan Ukuran', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.CENTER,
          widthDxa: kppTableCols[3],
        }),
        cell('Harga satuan', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.CENTER,
          widthDxa: kppTableCols[4],
        }),
        cell('Jumlah', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.CENTER,
          widthDxa: kppTableCols[5],
        }),
      ],
    }),
  ];

  for (const grp of summary.groups) {
    kppTableRows.push(
      new TableRow({
        children: [
          cell(grp.kategori, {
            bold: true,
            size: 18,
            font: FONT_SERIF,
            colSpan: 6,
            widthDxa: CONTENT_W,
          }),
        ],
      })
    );
    for (const { globalIndex, item, hargaKontrakSatuan, subtotalKontrak } of grp.items) {
      kppTableRows.push(
        new TableRow({
          children: [
            cell(`${globalIndex}.`, {
              size: 18,
              font: FONT_SERIF,
              align: AlignmentType.CENTER,
              widthDxa: kppTableCols[0],
            }),
            cell(item.namaBarang, {
              size: 18,
              font: FONT_SERIF,
              widthDxa: kppTableCols[1],
            }),
            cell(formatItemVolume(item), {
              size: 18,
              font: FONT_SERIF,
              align: AlignmentType.CENTER,
              widthDxa: kppTableCols[2],
            }),
            cell(formatItemSatuan(item), {
              size: 18,
              font: FONT_SERIF,
              align: AlignmentType.CENTER,
              widthDxa: kppTableCols[3],
            }),
            cell(formatRupiahDec2(hargaKontrakSatuan), {
              size: 18,
              font: FONT_SERIF,
              align: AlignmentType.RIGHT,
              widthDxa: kppTableCols[4],
            }),
            cell(formatRupiahDec2(subtotalKontrak), {
              size: 18,
              font: FONT_SERIF,
              align: AlignmentType.RIGHT,
              widthDxa: kppTableCols[5],
            }),
          ],
        })
      );
    }
  }

  kppTableRows.push(
    new TableRow({
      children: [
        cell('Jumlah', {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.RIGHT,
          colSpan: 5,
          widthDxa: kppFirst5W,
        }),
        cell(formatRupiahDoc(summary.jumlahKontrakSebelumPPN), {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.RIGHT,
          widthDxa: kppTableCols[5],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell(`PPn ${summary.ppnPersen}%`, {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.RIGHT,
          colSpan: 5,
          widthDxa: kppFirst5W,
        }),
        cell(formatRupiahDoc(summary.ppnKontrak), {
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.RIGHT,
          widthDxa: kppTableCols[5],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('TOTAL', {
          bold: true,
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.RIGHT,
          colSpan: 5,
          widthDxa: kppFirst5W,
        }),
        cell(formatRupiahDoc(summary.totalNilaiKontrak), {
          bold: true,
          size: 18,
          font: FONT_SERIF,
          align: AlignmentType.RIGHT,
          widthDxa: kppTableCols[5],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell(`Terbilang : ${summary.terbilangKontrak}`, {
          size: 18,
          font: FONT_SERIF,
          colSpan: 6,
          widthDxa: CONTENT_W,
        }),
      ],
    }),
    new TableRow({
      children: [
        cell('Keterangan : Sudah termasuk beban pajak yang berlaku dan ongkos kirim.', {
          size: 18,
          font: FONT_SERIF,
          colSpan: 6,
          widthDxa: CONTENT_W,
        }),
      ],
    })
  );

  const doc13Elements: (Paragraph | Table)[] = [
    createBeritaAcaraBoxHeader({
      kegiatan: transaction.kegiatan,
      subKegiatan: transaction.subKegiatan,
      pekerjaan: transaction.namaPaket,
      lokasi: transaction.lokasiAlamat,
      judulDokumen: 'LAPORAN KEMAJUAN PEKERJAAN',
      nomor: k.nomorKPP,
      tanggal: k.tanggalKPP,
      lampiran: '-',
      font: FONT_SERIF,
    }),
    p('1. Telah melaksanakan pekerjaan untuk :', {
      size: 19,
      font: FONT_SERIF,
      spacingBefore: 60,
      spacingAfter: 20,
    }),
    makeTable({
      columnWidths: kppSubCols,
      noBorder: true,
      rows: [
        kvRow('   a. Pekerjaan', transaction.namaPaket, kppSubCols, {
          size: 19,
          font: FONT_SERIF,
        }),
        kvRow('   b. Lokasi', transaction.lokasiAlamat, kppSubCols, {
          size: 19,
          font: FONT_SERIF,
        }),
        kvRow('   c. Departemen/Instansi', master.organisasiSKPD, kppSubCols, {
          size: 19,
          font: FONT_SERIF,
        }),
        kvRow(
          '   d. SKPD',
          [
            p(`Nomor : ${k.nomorDPA}`, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p(`Tanggal : ${k.tanggalDPA}`, { size: 19, font: FONT_SERIF }),
          ],
          kppSubCols,
          { size: 19, font: FONT_SERIF }
        ),
        kvRow('   e. Pelaksana', k.namaPerusahaan, kppSubCols, {
          size: 19,
          font: FONT_SERIF,
          boldValue: true,
        }),
        kvRow(
          '   f. Surat Pesanan (SP)',
          [
            p(`Nomor : ${k.nomorSP}`, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p(`Tanggal : ${formatTanggalIndo(k.tanggalSP)}`, {
              size: 19,
              font: FONT_SERIF,
              spacingAfter: 10,
            }),
            p(
              [
                tr('Biaya Pelaksanaan : ', { size: 19, font: FONT_SERIF }),
                tr(formatRupiahDoc(summary.totalNilaiKontrak), {
                  bold: true,
                  size: 19,
                  font: FONT_SERIF,
                }),
              ],
              { spacingAfter: 10 }
            ),
            p(`(${summary.terbilangKontrak})`, {
              italic: true,
              size: 19,
              font: FONT_SERIF,
            }),
          ],
          kppSubCols,
          { size: 19, font: FONT_SERIF }
        ),
        kvRow(
          '   h. Waktu Pelaksanaan',
          [
            p(`Tanggal selesai : ${formatTanggalIndo(k.tanggalSelesaiKerja)}`, {
              size: 19,
              font: FONT_SERIF,
              spacingAfter: 10,
            }),
            p(`Jumlah hari : ${k.waktuPenyelesaianHari} Hari Kalender`, {
              size: 19,
              font: FONT_SERIF,
              spacingAfter: 10,
            }),
            p('Realisasi : Cepat ( ± )', { size: 19, font: FONT_SERIF }),
          ],
          kppSubCols,
          { size: 19, font: FONT_SERIF }
        ),
      ],
    }),
    p('2. Pelaksanaan Pekerjaan tersebut dengan prestasi sebagai berikut :', {
      size: 19,
      font: FONT_SERIF,
      spacingBefore: 50,
      spacingAfter: 25,
    }),
    makeTable({
      columnWidths: kppTableCols,
      rows: kppTableRows,
    }),
    p('Kemajuan Pekerjaan telah mencapai prestasi sebesar 100% ( Seratus ) Prosen.', {
      size: 19,
      font: FONT_SERIF,
      spacingBefore: 50,
      spacingAfter: 35,
    }),
    p(
      'Demikian Laporan Kemajuan Pekerjaan ini dibuat dan ditanda tangani untuk dipergunakan sebagaimana mestinya.',
      {
        size: 19,
        font: FONT_SERIF,
        indentFirstLine: 560,
        spacingAfter: 80,
      }
    ),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p('Diperiksa Oleh :', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
                p(master.kabid.jabatan, {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p('selaku', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
                p('Pejabat Pelaksana Teknis Kegiatan', {
                  bold: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 520,
                }),
                p(master.kabid.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(master.kabid.pangkat, {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(`NIP. ${master.kabid.nip}`, { size: 19, font: FONT_SERIF }),
              ],
              { widthDxa: 4855, noBorder: true }
            ),
            cell(
              [
                p('', { size: 19, font: FONT_SERIF, spacingAfter: 35 }),
                p('Penyedia Jasa', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
                p(k.namaPerusahaan, {
                  bold: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 540,
                }),
                p(k.namaDirektur, {
                  bold: true,
                  underline: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(k.jabatanDirektur, { size: 19, font: FONT_SERIF }),
              ],
              { widthDxa: 4500, noBorder: true }
            ),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 14: BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAHP)
  // ============================================================================
  const ejaanBAHP = tanggalKeEjaanResmi(k.tanggalBAHP);
  const partyCols4 = [420, 1500, 180, 7255]; // sum = 9355

  const partyRowsBlock = (
    roman: string,
    nama: string,
    jabatanRuns: TextRun[],
    alamat: string,
    extraBottomText?: TextRun[]
  ): TableRow[] => {
    const rows: TableRow[] = [
      new TableRow({
        children: [
          cell(roman, { widthDxa: partyCols4[0], noBorder: true, size: 19 }),
          cell('Nama', { widthDxa: partyCols4[1], noBorder: true, size: 19 }),
          cell(':', { widthDxa: partyCols4[2], noBorder: true, size: 19 }),
          cell(nama, {
            bold: true,
            widthDxa: partyCols4[3],
            noBorder: true,
            size: 19,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell('', { widthDxa: partyCols4[0], noBorder: true, size: 19 }),
          cell('Jabatan', { widthDxa: partyCols4[1], noBorder: true, size: 19 }),
          cell(':', { widthDxa: partyCols4[2], noBorder: true, size: 19 }),
          cell([p(jabatanRuns, { spacingAfter: 10 })], {
            widthDxa: partyCols4[3],
            noBorder: true,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell('', { widthDxa: partyCols4[0], noBorder: true, size: 19 }),
          cell('Alamat Kantor', { widthDxa: partyCols4[1], noBorder: true, size: 19 }),
          cell(':', { widthDxa: partyCols4[2], noBorder: true, size: 19 }),
          cell([p(alamat, { size: 19, spacingAfter: extraBottomText ? 10 : 35 })], {
            widthDxa: partyCols4[3],
            noBorder: true,
          }),
        ],
      }),
    ];

    if (extraBottomText) {
      rows.push(
        new TableRow({
          children: [
            cell('', { widthDxa: partyCols4[0], noBorder: true, size: 19 }),
            cell([p(extraBottomText, { spacingAfter: 35 })], {
              colSpan: 3,
              widthDxa: partyCols4[1] + partyCols4[2] + partyCols4[3],
              noBorder: true,
            }),
          ],
        })
      );
    }

    return rows;
  };

  const doc14Elements: (Paragraph | Table)[] = [
    createBeritaAcaraBoxHeader({
      kegiatan: transaction.kegiatan,
      subKegiatan: transaction.subKegiatan,
      pekerjaan: transaction.namaPaket,
      lokasi: transaction.lokasiAlamat,
      judulDokumen: 'BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN',
      nomor: k.nomorBAHP,
      tanggal: k.tanggalBAHP,
      lampiran: 'Laporan Kemajuan Pekerjaan',
    }),
    p(
      [
        tr('Pada hari ini ', { size: 19 }),
        tr(ejaanBAHP.hari, { bold: true, size: 19 }),
        tr(', Tanggal ', { size: 19 }),
        tr(ejaanBAHP.tanggalTerbilang, { bold: true, size: 19 }),
        tr(' Bulan ', { size: 19 }),
        tr(ejaanBAHP.bulan, { bold: true, size: 19 }),
        tr(' Tahun ', { size: 19 }),
        tr(ejaanBAHP.tahunTerbilang, { bold: true, size: 19 }),
        tr(' bertempat di ', { size: 19 }),
        tr(master.organisasiSKPD, { bold: true, size: 19 }),
        tr(', kami yang bertanda - tangan dibawah ini :', { size: 19 }),
      ],
      { align: AlignmentType.BOTH, spacingBefore: 60, spacingAfter: 40 }
    ),
    makeTable({
      columnWidths: partyCols4,
      noBorder: true,
      rows: [
        ...partyRowsBlock(
          'I.',
          ppk.nama,
          [
            tr(`${jabatanKadis} Kabupaten Malang selaku `, { size: 19 }),
            tr('Pejabat Pembuat Komitmen', { bold: true, size: 19 }),
          ],
          master.alamat
        ),
        ...partyRowsBlock(
          'II.',
          master.kabid.nama,
          [
            tr(`${master.kabid.jabatan} ${master.organisasiSKPD} selaku `, {
              size: 19,
            }),
            tr('Pejabat Pelaksana Teknis Kegiatan', { bold: true, size: 19 }),
          ],
          master.alamat
        ),
        ...partyRowsBlock(
          'III.',
          k.namaDirektur,
          [tr(`${k.jabatanDirektur} ${k.namaPerusahaan}`, { size: 19 })],
          k.alamatPerusahaan
        ),
      ],
    }),
    p(
      'A. Telah mengadakan pemeriksaan dan penelitian atas kemajuan pelaksanaan :',
      { size: 19, spacingBefore: 35, spacingAfter: 20 }
    ),
    makeTable({
      columnWidths: [2250, 200, 6905],
      noBorder: true,
      rows: [
        kvRow('   a. Pekerjaan', transaction.namaPaket, [2250, 200, 6905], { size: 19 }),
        kvRow('   b. Lokasi', transaction.lokasiAlamat, [2250, 200, 6905], { size: 19 }),
        kvRow('   c. Pelaksana', k.namaPerusahaan, [2250, 200, 6905], {
          size: 19,
          boldValue: true,
        }),
        kvRow(
          '   d. Surat Pesanan (SP)',
          [
            p(`Nomor : ${k.nomorSP}`, { size: 19, spacingAfter: 10 }),
            p(`Tanggal : ${formatTanggalIndo(k.tanggalSP)}`, { size: 19 }),
          ],
          [2250, 200, 6905],
          { size: 19 }
        ),
        kvRow(
          '   e. Biaya Pelaksanaan',
          [
            p(formatRupiahDoc(summary.totalNilaiKontrak), {
              bold: true,
              size: 19,
              spacingAfter: 10,
            }),
            p(`(${summary.terbilangKontrak})`, { italic: true, size: 19 }),
          ],
          [2250, 200, 6905],
          { size: 19 }
        ),
      ],
    }),
    p('B. Berdasarkan Pemeriksaan dan Penelitian tersebut terbukti bahwa :', {
      size: 19,
      spacingBefore: 40,
      spacingAfter: 20,
    }),
    p(
      `1. Penyedia Jasa telah melaksanakan pekerjaan hingga mencapai 100% (seratus prosen) sebagaimana tersebut pada Surat Pesanan (SP), atas pekerjaan ${transaction.namaPaket}.`,
      {
        size: 19,
        align: AlignmentType.BOTH,
        indentLeft: 420,
        indentHanging: 240,
        spacingAfter: 20,
      }
    ),
    p(
      '2. Penyedia telah memenuhi seluruh kewajibannya sesuai dengan Syarat Umum Kontrak (SU) yang tercantum dalam Surat Pesanan (SP).',
      {
        size: 19,
        align: AlignmentType.BOTH,
        indentLeft: 420,
        indentHanging: 240,
        spacingAfter: 40,
      }
    ),
    p(
      'Demikian Berita Acara Pemeriksaan Hasil Pekerjaan ini dibuat dan ditanda-tangani untuk dipergunakan sebagaimana mestinya.',
      {
        size: 19,
        align: AlignmentType.BOTH,
        indentFirstLine: 560,
        spacingAfter: 60,
      }
    ),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p('Menyetujui :', { size: 19, spacingAfter: 10 }),
                p(master.kabid.jabatan, { size: 19, spacingAfter: 10 }),
                p('selaku', { size: 19, spacingAfter: 10 }),
                p('Pejabat Pelaksana Teknis Kegiatan', {
                  bold: true,
                  size: 19,
                  spacingAfter: 480,
                }),
                p(master.kabid.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(master.kabid.pangkat, { size: 19, spacingAfter: 10 }),
                p(`NIP. ${master.kabid.nip}`, { size: 19 }),
              ],
              { widthDxa: 4855, noBorder: true }
            ),
            cell(
              [
                p('Dibuat Oleh :', { size: 19, spacingAfter: 15 }),
                p(k.namaPerusahaan, { bold: true, size: 19, spacingAfter: 540 }),
                p(k.namaDirektur, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(k.jabatanDirektur, { size: 19 }),
              ],
              { widthDxa: 4500, noBorder: true }
            ),
          ],
        }),
      ],
    }),
    p('', { spacingAfter: 40 }),
    makeTable({
      columnWidths: [2800, 4200, 2355],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('', { widthDxa: 2800, noBorder: true }),
            cell(
              [
                p('Mengetahui;', { size: 19, spacingAfter: 10 }),
                p(jabatanKadis, { size: 19, spacingAfter: 10 }),
                p('Kabupaten Malang', { size: 19, spacingAfter: 10 }),
                p('selaku', { size: 19, spacingAfter: 10 }),
                p('Pejabat Pembuat Komitmen', {
                  bold: true,
                  size: 19,
                  spacingAfter: 480,
                }),
                p(ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(ppk.pangkat, { size: 19, spacingAfter: 10 }),
                p(`NIP. ${ppk.nip}`, { size: 19 }),
              ],
              { widthDxa: 4200, noBorder: true }
            ),
            cell('', { widthDxa: 2355, noBorder: true }),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 15: BERITA ACARA SERAH TERIMA (BAST)
  // ============================================================================
  const ejaanBAST = tanggalKeEjaanResmi(k.tanggalBAST);
  const bastPasalCols = [380, 1950, 180, 6845]; // sum = 9355
  const bastPasalRow = (
    no: string,
    label: string,
    val: string | Paragraph[],
    boldVal = false
  ) =>
    new TableRow({
      children: [
        cell(no, { widthDxa: bastPasalCols[0], noBorder: true, size: 18 }),
        cell(label, { widthDxa: bastPasalCols[1], noBorder: true, size: 18 }),
        cell(':', { widthDxa: bastPasalCols[2], noBorder: true, size: 18 }),
        typeof val === 'string'
          ? cell(val, {
              bold: boldVal,
              widthDxa: bastPasalCols[3],
              noBorder: true,
              size: 18,
            })
          : cell(val, { widthDxa: bastPasalCols[3], noBorder: true, size: 18 }),
      ],
    });

  const doc15Elements: (Paragraph | Table)[] = [
    createBeritaAcaraBoxHeader({
      kegiatan: transaction.kegiatan,
      subKegiatan: transaction.subKegiatan,
      pekerjaan: transaction.namaPaket,
      lokasi: transaction.lokasiAlamat,
      judulDokumen: 'BERITA ACARA SERAH TERIMA',
      nomor: k.nomorBAST,
      tanggal: k.tanggalBAST,
      lampiran: 'Berita Acara Pemeriksaan Hasil Pekerjaan',
    }),
    p(
      [
        tr('Pada hari ini ', { size: 19 }),
        tr(ejaanBAST.hari, { bold: true, size: 19 }),
        tr(', Tanggal ', { size: 19 }),
        tr(ejaanBAST.tanggalTerbilang, { bold: true, size: 19 }),
        tr(' Bulan ', { size: 19 }),
        tr(ejaanBAST.bulan, { bold: true, size: 19 }),
        tr(' Tahun ', { size: 19 }),
        tr(ejaanBAST.tahunTerbilang, { bold: true, size: 19 }),
        tr(' bertempat di ', { size: 19 }),
        tr(master.organisasiSKPD, { bold: true, size: 19 }),
        tr(', kami yang bertanda - tangan dibawah ini :', { size: 19 }),
      ],
      { align: AlignmentType.BOTH, spacingBefore: 50, spacingAfter: 35 }
    ),
    makeTable({
      columnWidths: partyCols4,
      noBorder: true,
      rows: [
        ...partyRowsBlock(
          'I.',
          ppk.nama,
          [
            tr(`${jabatanKadis} Kabupaten Malang selaku `, { size: 19 }),
            tr('Pejabat Pembuat Komitmen', { bold: true, size: 19 }),
          ],
          master.alamat
        ),
        ...partyRowsBlock(
          'II.',
          k.namaDirektur,
          [tr(`${k.jabatanDirektur} ${k.namaPerusahaan}`, { size: 19 })],
          k.alamatPerusahaan
        ),
      ],
    }),
    p('berdasarkan :', { size: 19, spacingBefore: 20, spacingAfter: 15 }),
    p([tr('1. ', { size: 19 }), tr('Surat Pesanan (SP)', { bold: true, size: 19 })], {
      indentLeft: 280,
      spacingAfter: 5,
    }),
    p(`Nomor : ${k.nomorSP} , tanggal ${formatTanggalIndo(k.tanggalSP)}`, {
      size: 19,
      indentLeft: 520,
      spacingAfter: 15,
    }),
    p(
      [
        tr('2. ', { size: 19 }),
        tr('Berita Acara Pemeriksaan Hasil Pekerjaan', {
          bold: true,
          size: 19,
        }),
      ],
      { indentLeft: 280, spacingAfter: 5 }
    ),
    p(`Nomor : ${k.nomorBAHP}, tanggal ${formatTanggalIndo(k.tanggalBAHP)}`, {
      size: 19,
      indentLeft: 520,
      spacingAfter: 30,
    }),
    p(
      [
        tr('Dengan ini telah menyetujui dan bersepakat untuk melakukan ', { size: 19 }),
        tr('Serah Terima Pekerjaan', { bold: true, size: 19 }),
        tr(' dengan ketentuan-ketentuan sebagai berikut :', { size: 19 }),
      ],
      { align: AlignmentType.BOTH, spacingAfter: 30 }
    ),
    p('Pasal 1', {
      bold: true,
      size: 19,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p(
      [
        tr(
          `Setelah mempelajari Berita Acara Pemeriksaan Hasil Pekerjaan, No. ${
            k.nomorBAHP
          }, tanggal ${formatTanggalIndo(
            k.tanggalBAHP
          )}, yang merupakan satu kesatuan dengan Berita Acara ini, maka `,
          { size: 19 }
        ),
        tr('PENGGUNA JASA', { bold: true, size: 19 }),
        tr(' menyatakan bahwa semua pekerjaan telah dilaksanakan dengan baik oleh ', {
          size: 19,
        }),
        tr('PENYEDIA JASA', { bold: true, size: 19 }),
        tr(' yaitu :', { size: 19 }),
      ],
      { align: AlignmentType.BOTH, spacingAfter: 20 }
    ),
    makeTable({
      columnWidths: bastPasalCols,
      noBorder: true,
      rows: [
        bastPasalRow('1.', 'Kegiatan', transaction.kegiatan),
        bastPasalRow('2.', 'Sub Kegiatan', transaction.subKegiatan),
        bastPasalRow('3.', 'Pekerjaan', transaction.namaPaket),
        bastPasalRow('4.', 'Lokasi', transaction.lokasiAlamat),
        bastPasalRow('5.', 'Departemen/Instansi', master.organisasiSKPD),
        bastPasalRow(
          '6.',
          'SKPD',
          `Nomor : ${k.nomorDPA} / Tanggal : ${k.tanggalDPA}`
        ),
        bastPasalRow('7.', 'Pelaksana', k.namaPerusahaan, true),
        bastPasalRow('', 'Biaya Pelaksanaan', [
          p(formatRupiahDoc(summary.totalNilaiKontrak), {
            bold: true,
            size: 18,
            spacingAfter: 5,
          }),
          p(`(${summary.terbilangKontrak})`, { italic: true, size: 18 }),
        ]),
      ],
    }),
    p('Pasal 2', {
      bold: true,
      size: 19,
      align: AlignmentType.CENTER,
      spacingBefore: 25,
      spacingAfter: 15,
    }),
    p(
      [
        tr('PENYEDIA JASA', { bold: true, size: 19 }),
        tr(' menyerahkan hasil Pekerjaan kepada ', { size: 19 }),
        tr('PENGGUNA JASA', { bold: true, size: 19 }),
        tr(', dan ', { size: 19 }),
        tr('PENGGUNA JASA', { bold: true, size: 19 }),
        tr(' menerima penyerahan pekerjaan dimaksud dari ', { size: 19 }),
        tr('PENYEDIA JASA', { bold: true, size: 19 }),
        tr('.', { size: 19 }),
      ],
      { align: AlignmentType.BOTH, spacingAfter: 25 }
    ),
    p('Pasal 3', {
      bold: true,
      size: 19,
      align: AlignmentType.CENTER,
      spacingAfter: 15,
    }),
    p(
      'Sebagaimana dimaksud untuk kelengkapan Berita Acara Serah Terima ini, dilampirkan Berita Acara Pemeriksaan Hasil Pekerjaan.',
      { size: 19, align: AlignmentType.BOTH, spacingAfter: 20 }
    ),
    p(
      'Demikian Berita Acara Serah Terima Pekerjaan ini dibuat dan ditanda-tangani pada tanggal tersebut diatas oleh kedua belah pihak dalam rangkap seperlunya.',
      { size: 19, align: AlignmentType.BOTH, spacingAfter: 60 }
    ),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p('PENGGUNA JASA', { bold: true, size: 19, spacingAfter: 10 }),
                p(jabatanKadis, { size: 19, spacingAfter: 10 }),
                p('Kabupaten Malang', { size: 19, spacingAfter: 10 }),
                p(
                  [
                    tr('selaku ', { size: 19 }),
                    tr('Pejabat Pembuat Komitmen', { bold: true, size: 19 }),
                  ],
                  { spacingAfter: 480 }
                ),
                p(ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(ppk.pangkat, { size: 19, spacingAfter: 10 }),
                p(`NIP. ${ppk.nip}`, { size: 19 }),
              ],
              { widthDxa: 4855, noBorder: true }
            ),
            cell(
              [
                p('PENYEDIA JASA', { bold: true, size: 19, spacingAfter: 15 }),
                p(k.namaPerusahaan, { bold: true, size: 19, spacingAfter: 540 }),
                p(k.namaDirektur, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(k.jabatanDirektur, { size: 19 }),
              ],
              { widthDxa: 4500, noBorder: true }
            ),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 16: BERITA ACARA PERSETUJUAN PEMBAYARAN (BAPP)
  // ============================================================================
  const ejaanBAPP = tanggalKeEjaanResmi(k.tanggalBAPP);
  const doc16Elements: (Paragraph | Table)[] = [
    createBeritaAcaraBoxHeader({
      kegiatan: transaction.kegiatan,
      subKegiatan: transaction.subKegiatan,
      pekerjaan: transaction.namaPaket,
      lokasi: transaction.lokasiAlamat,
      judulDokumen: 'BERITA ACARA PERSETUJUAN PEMBAYARAN',
      nomor: k.nomorBAPP,
      tanggal: k.tanggalBAPP,
      lampiran: 'Berita Acara Serah Terima',
    }),
    p(
      [
        tr('Pada hari ini ', { size: 19 }),
        tr(ejaanBAPP.hari, { bold: true, size: 19 }),
        tr(', Tanggal ', { size: 19 }),
        tr(ejaanBAPP.tanggalTerbilang, { bold: true, size: 19 }),
        tr(' Bulan ', { size: 19 }),
        tr(ejaanBAPP.bulan, { bold: true, size: 19 }),
        tr(' Tahun ', { size: 19 }),
        tr(ejaanBAPP.tahunTerbilang, { bold: true, size: 19 }),
        tr(', kami yang bertanda – tangan dibawah ini :', { size: 19 }),
      ],
      { align: AlignmentType.BOTH, spacingBefore: 55, spacingAfter: 35 }
    ),
    makeTable({
      columnWidths: partyCols4,
      noBorder: true,
      rows: [
        ...partyRowsBlock(
          'I.',
          ppk.nama,
          [
            tr(`${jabatanKadis} Kabupaten Malang selaku `, { size: 19 }),
            tr('Pengguna Anggaran', { bold: true, size: 19 }),
          ],
          master.alamat
        ),
        ...partyRowsBlock(
          'II.',
          master.kabid.nama,
          [
            tr(`${master.kabid.jabatan} ${master.organisasiSKPD} selaku `, {
              size: 19,
            }),
            tr('Pejabat Pelaksana Teknis Kegiatan', { bold: true, size: 19 }),
          ],
          master.alamat
        ),
        ...partyRowsBlock(
          'III.',
          k.namaDirektur,
          [tr(`${k.jabatanDirektur} ${k.namaPerusahaan}`, { size: 19 })],
          k.alamatPerusahaan,
          [
            tr('Selanjutnya disebut sebagai ', { size: 19 }),
            tr('PENYEDIA JASA', { bold: true, size: 19 }),
          ]
        ),
      ],
    }),
    p('berdasarkan :', { bold: true, size: 19, spacingBefore: 25, spacingAfter: 15 }),
    p(
      [tr('1. ', { size: 19 }), tr('Surat Pesanan (SP) Kontrak', { bold: true, size: 19 })],
      { indentLeft: 280, spacingAfter: 5 }
    ),
    p(`Nomor : ${k.nomorSP} , tanggal ${formatTanggalIndo(k.tanggalSP)}`, {
      size: 19,
      indentLeft: 520,
      spacingAfter: 20,
    }),
    p(
      [
        tr('2. ', { size: 19 }),
        tr('Berita Acara Serah Terima Pekerjaan', {
          bold: true,
          size: 19,
        }),
      ],
      { indentLeft: 280, spacingAfter: 5 }
    ),
    p(`Nomor : ${k.nomorBAST} , tanggal ${formatTanggalIndo(k.tanggalBAST)}`, {
      size: 19,
      indentLeft: 520,
      spacingAfter: 35,
    }),
    p(
      [
        tr(
          'Berdasarkan Surat Pesanan (SP) pada Klausul Sistem Pembayaran dan Syarat Umum (SU) Nomor 13 perihal Pembayaran Prestasi Pekerjaan untuk mengajukan tagihan pembayaran, maka ',
          { size: 19 }
        ),
        tr('PENYEDIA JASA', { bold: true, size: 19 }),
        tr(' berhak atas pembayaran sebesar ', { size: 19 }),
        tr('100 %', { bold: true, size: 19 }),
        tr(' dari harga kontrak.', { size: 19 }),
      ],
      { align: AlignmentType.BOTH, spacingAfter: 35 }
    ),
    p(
      [
        tr(
          `Termyn = ${formatRupiahDoc(summary.totalNilaiKontrak)} X (100%) = `,
          { bold: true, size: 19 }
        ),
        tr(formatRupiahDoc(summary.totalNilaiKontrak), { bold: true, size: 19 }),
      ],
      { spacingAfter: 35 }
    ),
    p(
      [
        tr('Terbilang : ', { bold: true, size: 19 }),
        tr(`(${summary.terbilangKontrak})`, { italic: true, size: 19 }),
      ],
      { spacingAfter: 45 }
    ),
    p(
      [
        tr('Demikian ', { size: 19 }),
        tr('Berita Acara Persetujuan Pembayaran (100%)', { bold: true, size: 19 }),
        tr(
          ' ini dibuat dan ditandatangani pada tanggal tersebut diatas, dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.',
          { size: 19 }
        ),
      ],
      { align: AlignmentType.BOTH, indentFirstLine: 560, spacingAfter: 80 }
    ),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p('Mengetahui dan Menyetujui;', {
                  bold: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(jabatanKadis, { size: 19, spacingAfter: 10 }),
                p('Kabupaten Malang', { size: 19, spacingAfter: 10 }),
                p('selaku', { size: 19, spacingAfter: 10 }),
                p('Pengguna Anggaran', {
                  bold: true,
                  size: 19,
                  spacingAfter: 520,
                }),
                p(ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(ppk.pangkat, { size: 19, spacingAfter: 10 }),
                p(`NIP. ${ppk.nip}`, { size: 19 }),
              ],
              { widthDxa: 4855, noBorder: true }
            ),
            cell(
              [
                p('PENYEDIA JASA', { bold: true, size: 19, spacingAfter: 15 }),
                p(k.namaPerusahaan, { bold: true, size: 19, spacingAfter: 600 }),
                p(k.namaDirektur, {
                  bold: true,
                  underline: true,
                  size: 19,
                  spacingAfter: 10,
                }),
                p(k.jabatanDirektur, { size: 19 }),
              ],
              { widthDxa: 4500, noBorder: true }
            ),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 17: RINGKASAN KONTRAK
  // ============================================================================
  const uraianRingkas =
    k.uraianVolumeRingkasan ||
    transaction.items
      .map((it) => `${it.namaBarang} (${formatItemVolumeSatuan(it)})`)
      .join(', ');
  const ppnRingkasanDocx =
    k.autoCalcTax !== false
      ? formatRupiahDoc(summary.ppnKontrak)
      : k.potonganPPNText || formatRupiahDoc(summary.ppnKontrak);
  const pphRingkasanDocx =
    k.autoCalcTax !== false
      ? formatRupiahDoc(summary.pphKontrak)
      : k.potonganPPHText || formatRupiahDoc(summary.pphKontrak);
  const sumberDanaLengkapDocx = (
    transaction.sumberDanaRAB ||
    transaction.sumberDanaKAK ||
    'Pendapatan Asli Daerah'
  )
    .replace(/\s*Tahun\s+Anggaran\s+\d{4}\s*$/i, '')
    .trim();

  const rkCols = [450, 2750, 220, 5935]; // sum = 9355
  const rkRow = (
    no: string,
    label: string | Paragraph[],
    val: string | Paragraph[],
    opts?: { boldVal?: boolean; italicVal?: boolean; customColon?: Paragraph[] }
  ) =>
    new TableRow({
      children: [
        cell(no, {
          widthDxa: rkCols[0],
          noBorder: true,
          size: 19,
          font: FONT_SERIF,
        }),
        typeof label === 'string'
          ? cell(label, {
              widthDxa: rkCols[1],
              noBorder: true,
              size: 19,
              font: FONT_SERIF,
            })
          : cell(label, {
              widthDxa: rkCols[1],
              noBorder: true,
              size: 19,
              font: FONT_SERIF,
            }),
        opts?.customColon
          ? cell(opts.customColon, {
              widthDxa: rkCols[2],
              noBorder: true,
              size: 19,
              font: FONT_SERIF,
            })
          : cell(':', {
              widthDxa: rkCols[2],
              noBorder: true,
              size: 19,
              font: FONT_SERIF,
            }),
        typeof val === 'string'
          ? cell(val, {
              bold: opts?.boldVal,
              italic: opts?.italicVal,
              widthDxa: rkCols[3],
              noBorder: true,
              size: 19,
              font: FONT_SERIF,
            })
          : cell(val, {
              widthDxa: rkCols[3],
              noBorder: true,
              size: 19,
              font: FONT_SERIF,
            }),
      ],
    });

  const doc17Elements: (Paragraph | Table)[] = [
    ...createKopElements(master, logoImg, bannerImg),
    p('RINGKASAN KONTRAK', {
      bold: true,
      underline: true,
      size: 24,
      font: FONT_SERIF,
      align: AlignmentType.CENTER,
      spacingAfter: 50,
    }),
    p(
      `Untuk kegiatan yang dananya berasal dari ${sumberDanaLengkapDocx} Tahun Anggaran ${transaction.tahunAnggaran} :`,
      { size: 19, font: FONT_SERIF, spacingAfter: 35 }
    ),
    makeTable({
      columnWidths: rkCols,
      noBorder: true,
      rows: [
        rkRow('1.', 'Dokumen Pelaksanaan Anggaran SKPD', [
          p(`Nomor : ${k.nomorDPA}`, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
          p(`Tanggal : ${k.tanggalDPA}`, { size: 19, font: FONT_SERIF }),
        ]),
        rkRow('2.', 'Kode dan Uraian Program', [
          p(k.kodeProgram, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
          p(transaction.program, { size: 19, font: FONT_SERIF }),
        ]),
        rkRow('3.', 'Kode dan Uraian Kegiatan', [
          p(k.kodeKegiatan, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
          p(transaction.kegiatan, { size: 19, font: FONT_SERIF }),
        ]),
        rkRow('4.', 'Kode dan Uraian Sub Kegiatan', [
          p(k.kodeSubKegiatan, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
          p(transaction.subKegiatan, {
            size: 19,
            font: FONT_SERIF,
            align: AlignmentType.BOTH,
          }),
        ]),
        rkRow(
          '5.',
          'Nama Rekanan',
          `${k.namaPerusahaan} (${k.namaDirektur})`,
          { boldVal: true }
        ),
        rkRow('6.', 'Alamat Rekanan', k.alamatPerusahaan),
        rkRow('7.', 'Surat Pesanan', [
          p(`Nomor : ${k.nomorSP}`, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
          p(`Tanggal : ${formatTanggalIndo(k.tanggalSP)}`, {
            size: 19,
            font: FONT_SERIF,
          }),
        ]),
        rkRow('8.', 'Nilai Kontrak', formatRupiahDoc(summary.totalNilaiKontrak), {
          boldVal: true,
          italicVal: true,
        }),
        rkRow(
          '9.',
          'Beban Rekening',
          transaction.kategoriRekening.map((kr, idx) =>
            p(
              `${kr.kodeRekening} ${kr.namaRekening}${
                idx < transaction.kategoriRekening.length - 1 ? ';' : ''
              }`,
              { size: 19, font: FONT_SERIF, spacingAfter: 10 }
            )
          )
        ),
        rkRow('10.', 'Uraian dan Volume', uraianRingkas),
        rkRow(
          '11.',
          [
            p('Tata Cara Pembayaran', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p('Bank', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p('No. Rek', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p('NPWP', { size: 19, font: FONT_SERIF }),
          ],
          [
            p(k.tataCaraPembayaran, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p(k.namaBank, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p(k.nomorRekeningBank, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
            p(k.npwpPenyedia, { size: 19, font: FONT_SERIF }),
          ],
          {
            customColon: [
              p(':', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
              p(':', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
              p(':', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
              p(':', { size: 19, font: FONT_SERIF }),
            ],
          }
        ),
        rkRow(
          '12.',
          'Periode Pelaksanaan',
          `${formatTanggalIndo(k.tanggalMulaiKerja)} s.d. ${formatTanggalIndo(
            k.tanggalSelesaiKerja
          )} (${k.waktuPenyelesaianHari} Hari Kalender)`
        ),
        rkRow(
          '13.',
          'Berita Acara',
          'Berita Acara Pemeriksaan dan Serah Terima Hasil Pekerjaan'
        ),
        rkRow('14.', 'Potongan Pajak', [
          p(`PPN : ${ppnRingkasanDocx}`, {
            bold: true,
            size: 19,
            font: FONT_SERIF,
            spacingAfter: 10,
          }),
          p(`PPH : ${pphRingkasanDocx}`, {
            bold: true,
            size: 19,
            font: FONT_SERIF,
          }),
        ]),
        rkRow('15.', 'Ketentuan Sanksi', [
          p(
            'a. Denda keterlambatan 1/1000 (satu perseribu) dari biaya kontrak, apabila bagian pekerjaan belum diterima oleh PPKom.',
            { size: 19, font: FONT_SERIF, spacingAfter: 10 }
          ),
          p(
            'b. Pemutusan hubungan kontrak bila pihak Rekanan tidak dapat melaksanakan kewajiban.',
            { size: 19, font: FONT_SERIF }
          ),
        ]),
      ],
    }),
    p('', { spacingAfter: 40 }),
    makeTable({
      columnWidths: [4855, 4500],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p('', { size: 19, font: FONT_SERIF, spacingAfter: 15 }),
                p('Pejabat Penatausahaan Keuangan', {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 480,
                }),
                p(master.ppkKeuangan.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(master.ppkKeuangan.pangkat, {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(`NIP. ${master.ppkKeuangan.nip}`, {
                  size: 19,
                  font: FONT_SERIF,
                }),
              ],
              { widthDxa: 4855, noBorder: true }
            ),
            cell(
              [
                p(`Malang, ${formatTanggalIndo(k.tanggalBAPP || k.tanggalBAST)}`, {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p('Pejabat Pelaksana Teknis Kegiatan', {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 480,
                }),
                p(master.kabid.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(master.kabid.pangkat, {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(`NIP. ${master.kabid.nip}`, { size: 19, font: FONT_SERIF }),
              ],
              { widthDxa: 4500, noBorder: true }
            ),
          ],
        }),
      ],
    }),
    p('', { spacingAfter: 35 }),
    makeTable({
      columnWidths: [2800, 4200, 2355],
      noBorder: true,
      rows: [
        new TableRow({
          children: [
            cell('', { widthDxa: 2800, noBorder: true }),
            cell(
              [
                p('Mengetahui :', { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
                p('Pengguna Anggaran', {
                  bold: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(jabatanKadis, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
                p('Kabupaten Malang', {
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 480,
                }),
                p(ppk.nama, {
                  bold: true,
                  underline: true,
                  size: 19,
                  font: FONT_SERIF,
                  spacingAfter: 10,
                }),
                p(ppk.pangkat, { size: 19, font: FONT_SERIF, spacingAfter: 10 }),
                p(`NIP. ${ppk.nip}`, { size: 19, font: FONT_SERIF }),
              ],
              { widthDxa: 4200, noBorder: true }
            ),
            cell('', { widthDxa: 2355, noBorder: true }),
          ],
        }),
      ],
    }),
  ];

  // ============================================================================
  // DOC 18: KUITANSI PEMBAYARAN (3 RANGKAP)
  // ============================================================================
  const buildKuitansiSheetElements = (sheetIdx: number): (Paragraph | Table)[] => {
    const kuitansiBodyCols: [number, number, number] = [2350, 220, 6785];
    const kuitansiSigCols = [3118, 3118, 3119]; // sum = 9355

    const els: (Paragraph | Table)[] = [];
    if (sheetIdx > 1) {
      els.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // Header Nomor Kuitansi & Kode Rekening (tanpa garis bawah / kotak)
    els.push(
      makeTable({
        columnWidths: [4855, 4500],
        noBorder: true,
        rows: [
          new TableRow({
            children: [
              cell(
                [
                  p(
                    [
                      tr('No. Kuitansi : ', { size: 18, font: FONT_SERIF }),
                      tr(k.nomorKuitansi, { bold: true, size: 18, font: FONT_SERIF }),
                    ],
                    { spacingAfter: 10 }
                  ),
                ],
                { widthDxa: 4855, noBorder: true }
              ),
              cell(
                [
                  p('Kode Rekening :', {
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  ...transaction.kategoriRekening.map((kr) =>
                    p(`- ${kr.kodeRekening}`, {
                      size: 18,
                      font: FONT_SERIF,
                      spacingAfter: 10,
                    })
                  ),
                ],
                { widthDxa: 4500, noBorder: true }
              ),
            ],
          }),
        ],
      }),
      p('', { spacingAfter: 60 }),
      // Isi Kuitansi (tanpa kotak pada Terbilang dan Jumlah)
      makeTable({
        columnWidths: kuitansiBodyCols,
        noBorder: true,
        rows: [
          kvRow('Sudah terima dari', master.pemkabName.toUpperCase(), kuitansiBodyCols, {
            size: 20,
            font: FONT_SERIF,
            boldValue: true,
          }),
          kvRow('Terbilang', `#${summary.terbilangKontrak}#`, kuitansiBodyCols, {
            size: 20,
            font: FONT_SERIF,
            boldValue: true,
            italicValue: true,
          }),
          kvRow(
            'Untuk Pembayaran',
            [
              p(
                `${transaction.namaPaket} (${
                  transaction.sumberDanaSingkatKuitansi || 'PAD'
                })`,
                { size: 20, font: FONT_SERIF, spacingAfter: 10 }
              ),
              p(k.tahunKuitansiLabel || transaction.tahunAnggaran, {
                size: 20,
                font: FONT_SERIF,
                spacingAfter: 35,
              }),
              p('Dasar Pembayaran berdasarkan :', {
                size: 20,
                font: FONT_SERIF,
                spacingAfter: 10,
              }),
              p('Surat Tagihan', { size: 20, font: FONT_SERIF, spacingAfter: 10 }),
              p(`Nomor : ${k.nomorSuratTagihan}`, {
                size: 20,
                font: FONT_SERIF,
                spacingAfter: 10,
              }),
              p(`Tanggal : ${formatTanggalIndo(k.tanggalSuratTagihan)}`, {
                size: 20,
                font: FONT_SERIF,
              }),
            ],
            kuitansiBodyCols,
            { size: 20, font: FONT_SERIF }
          ),
          kvRow('Jumlah', formatRupiahDoc(summary.totalNilaiKontrak), kuitansiBodyCols, {
            size: 22,
            font: FONT_SERIF,
            boldLabel: true,
            boldValue: true,
          }),
        ],
      }),
      p('', { spacingAfter: 60 }),
      // Yang Menerima (tanpa kotak materai)
      makeTable({
        columnWidths: [5255, 4100],
        noBorder: true,
        rows: [
          new TableRow({
            children: [
              cell('', { widthDxa: 5255, noBorder: true }),
              cell(
                [
                  p('Yang Menerima', {
                    size: 19,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  p(k.namaPerusahaan, {
                    bold: true,
                    size: 19,
                    font: FONT_SERIF,
                    spacingAfter: 520,
                  }),
                  p(k.namaDirektur, {
                    bold: true,
                    underline: true,
                    size: 19,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  p(k.jabatanDirektur, { size: 19, font: FONT_SERIF }),
                ],
                { widthDxa: 4100, noBorder: true }
              ),
            ],
          }),
        ],
      }),
      p('', { spacingAfter: 60 }),
      // Tabel Pejabat Keuangan, PPTK, Bendahara, dan Pengguna Anggaran
      makeTable({
        columnWidths: kuitansiSigCols,
        rows: [
          new TableRow({
            children: [
              cell(
                [
                  p('Pejabat Penatausahaan', {
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  p('Keuangan (PPK)', {
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 480,
                  }),
                  p(master.ppkKeuangan.nama, {
                    bold: true,
                    underline: true,
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  p(`NIP. ${master.ppkKeuangan.nip}`, {
                    size: 18,
                    font: FONT_SERIF,
                  }),
                ],
                { widthDxa: kuitansiSigCols[0] }
              ),
              cell(
                [
                  p('Pejabat Pelaksana Teknis', {
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  p('Kegiatan (PPTK)', {
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 480,
                  }),
                  p(master.kabid.nama, {
                    bold: true,
                    underline: true,
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  p(`NIP. ${master.kabid.nip}`, {
                    size: 18,
                    font: FONT_SERIF,
                  }),
                ],
                { widthDxa: kuitansiSigCols[1] }
              ),
              cell(
                [
                  p('Bendahara Pengeluaran', {
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 510,
                  }),
                  p(master.bendahara.nama, {
                    bold: true,
                    underline: true,
                    size: 18,
                    font: FONT_SERIF,
                    spacingAfter: 10,
                  }),
                  p(`NIP. ${master.bendahara.nip}`, {
                    size: 18,
                    font: FONT_SERIF,
                  }),
                ],
                { widthDxa: kuitansiSigCols[2] }
              ),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 3,
                width: { size: CONTENT_W, type: WidthType.DXA },
                borders: CELL_FULL_BORDERS,
                margins: PAD_STD,
                children: [
                  makeTable({
                    columnWidths: [2800, 4200, 2155],
                    noBorder: true,
                    rows: [
                      new TableRow({
                        children: [
                          cell('', { widthDxa: 2800, noBorder: true }),
                          cell(
                            [
                              p('Mengetahui/Menyetujui', {
                                size: 18,
                                font: FONT_SERIF,
                                spacingAfter: 10,
                              }),
                              p('Pengguna Anggaran', {
                                bold: true,
                                size: 18,
                                font: FONT_SERIF,
                                spacingAfter: 10,
                              }),
                              p(jabatanKadis, {
                                size: 18,
                                font: FONT_SERIF,
                                spacingAfter: 480,
                              }),
                              p(ppk.nama, {
                                bold: true,
                                underline: true,
                                size: 18,
                                font: FONT_SERIF,
                                spacingAfter: 10,
                              }),
                              p(ppk.pangkat, {
                                size: 18,
                                font: FONT_SERIF,
                                spacingAfter: 10,
                              }),
                              p(`NIP. ${ppk.nip}`, {
                                size: 18,
                                font: FONT_SERIF,
                              }),
                            ],
                            { widthDxa: 4200, noBorder: true }
                          ),
                          cell('', { widthDxa: 2155, noBorder: true }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    return els;
  };

  const doc18Elements: (Paragraph | Table)[] = [
    ...buildKuitansiSheetElements(1),
    ...buildKuitansiSheetElements(2),
    ...buildKuitansiSheetElements(3),
  ];

  // ============================================================================
  // ASSEMBLE DOCUMENT SECTIONS
  // ============================================================================
  const allSections: {
    id: DocumentTabId;
    stage: 'tahap1' | 'tahap2';
    landscape?: boolean;
    children: (Paragraph | Table)[];
  }[] = [
    { id: 'doc1_checklist', stage: 'tahap1', children: doc1Elements },
    { id: 'doc2_permohonan', stage: 'tahap1', children: doc2Elements },
    { id: 'doc3_surat_tugas', stage: 'tahap1', children: doc3Elements },
    { id: 'doc4_dpp', stage: 'tahap1', children: doc4Elements },
    { id: 'doc5_kak', stage: 'tahap1', children: doc5Elements },
    { id: 'doc6_rab', stage: 'tahap1', children: doc6Elements },
    { id: 'doc7_spektek', stage: 'tahap1', children: doc7Elements },
    {
      id: 'doc8_riwayat_survei',
      stage: 'tahap1',
      landscape: true,
      children: doc8Elements,
    },
    { id: 'doc9_lampiran_survei', stage: 'tahap1', children: doc9Elements },
    { id: 'doc10_sp', stage: 'tahap2', children: doc10Elements },
    { id: 'doc11_spmk', stage: 'tahap2', children: doc11Elements },
    { id: 'doc12_sertifikat_bayar', stage: 'tahap2', children: doc12Elements },
    { id: 'doc13_kpp', stage: 'tahap2', children: doc13Elements },
    { id: 'doc14_bahp', stage: 'tahap2', children: doc14Elements },
    { id: 'doc15_bast', stage: 'tahap2', children: doc15Elements },
    { id: 'doc16_bapp', stage: 'tahap2', children: doc16Elements },
    { id: 'doc17_ringkasan_kontrak', stage: 'tahap2', children: doc17Elements },
    { id: 'doc18_kuitansi', stage: 'tahap2', children: doc18Elements },
  ];

  const normalizedTarget: DocumentTabId =
    targetDoc === 'doc12_sertifikat' ? 'doc12_sertifikat_bayar' : targetDoc;

  const filteredSections =
    normalizedTarget === 'all'
      ? allSections
      : normalizedTarget === 'all_tahap1'
      ? allSections.filter((s) => s.stage === 'tahap1')
      : normalizedTarget === 'all_tahap2'
      ? allSections.filter((s) => s.stage === 'tahap2')
      : allSections.filter((s) => s.id === normalizedTarget);

  const doc = new Document({
    sections: filteredSections.map((sec) => ({
      properties: {
        page: {
          margin: sec.landscape ? MARGIN_LANDSCAPE : MARGIN_PORTRAIT,
          size: {
            width: PAGE_W_PORTRAIT,
            height: PAGE_H_PORTRAIT,
            orientation: sec.landscape
              ? PageOrientation.LANDSCAPE
              : PageOrientation.PORTRAIT,
          },
        },
      },
      children: sec.children,
    })),
  });

  const blob = await Packer.toBlob(doc);
  const safeName = transaction.namaPaket
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 45);
  const suffix =
    normalizedTarget === 'all'
      ? 'Lengkap_18_Dokumen'
      : normalizedTarget === 'all_tahap1'
      ? 'Tahap1_DPP_9_Dokumen'
      : normalizedTarget === 'all_tahap2'
      ? 'Tahap2_Kontrak_BAST_Kuitansi'
      : normalizedTarget;
  saveAs(blob, `Pengadaan_Dispora_${suffix}_${safeName}.docx`);
}
