import { TransactionData } from '../types/procurement';

const TAHAP1_DOC_IDS = new Set([
  'doc1_checklist',
  'doc2_permohonan',
  'doc3_surat_tugas',
  'doc4_dpp',
  'doc5_kak',
  'doc6_rab',
  'doc7_spektek',
  'doc8_riwayat_survei',
  'doc9_lampiran_survei',
]);

function matchCaseReplacement(matched: string, replacementLower: string): string {
  if (matched === matched.toUpperCase()) return replacementLower.toUpperCase();
  if (matched[0] === matched[0].toUpperCase()) {
    return replacementLower[0].toUpperCase() + replacementLower.slice(1);
  }
  return replacementLower;
}

const INLINE_OR_BREAK_SEP =
  '(?:\\s|&nbsp;|&#160;|<br\\s*\\/?>|<\\/?(?:div|p|span|b|strong|i|em|u)[^>]*>)+';

function replaceLelangTextInDoc2Html(html: string): string {
  const fullSentenceRe = new RegExp(
    `(kelengkapan${INLINE_OR_BREAK_SEP}proses${INLINE_OR_BREAK_SEP})(lelang)(?=${INLINE_OR_BREAK_SEP}sebagaimana${INLINE_OR_BREAK_SEP}terlampir|\\b)`,
    'gi'
  );
  let updated = html.replace(
    fullSentenceRe,
    (_, prefix, lelangWord) => `${prefix}${matchCaseReplacement(lelangWord, 'pengadaan')}`
  );

  updated = updated.replace(
    /\b(proses\s+)(lelang)\b/gi,
    (_, prefix, lelangWord) => `${prefix}${matchCaseReplacement(lelangWord, 'pengadaan')}`
  );

  return updated;
}

function stripStylesAndClassesFromNode(el: Element): void {
  el.classList.remove('font-bold', 'font-semibold', 'font-extrabold', 'underline');
  if (el instanceof HTMLElement) {
    if (el.style.fontWeight) el.style.removeProperty('font-weight');
    if (el.style.textDecoration) el.style.removeProperty('text-decoration');
    if (el.style.textDecorationLine) el.style.removeProperty('text-decoration-line');
    if (el.getAttribute('style')?.trim() === '') {
      el.removeAttribute('style');
    }
  }
  if (el.getAttribute('class')?.trim() === '') {
    el.removeAttribute('class');
  }
}

function unwrapFormattingNodes(root: Element): void {
  const formattingTags = Array.from(root.querySelectorAll('b, strong, u'));
  for (let i = formattingTags.length - 1; i >= 0; i--) {
    const tagEl = formattingTags[i];
    const parent = tagEl.parentNode;
    if (!parent) continue;
    while (tagEl.firstChild) {
      parent.insertBefore(tagEl.firstChild, tagEl);
    }
    parent.removeChild(tagEl);
  }
}

function cleanSignatureSubtree(el: Element): void {
  stripStylesAndClassesFromNode(el);
  const descendants = el.querySelectorAll('*');
  descendants.forEach((child) => stripStylesAndClassesFromNode(child));
  unwrapFormattingNodes(el);

  const tag = el.tagName.toLowerCase();
  if (tag === 'b' || tag === 'strong' || tag === 'u') {
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
  }
}

function cleanTahap1SignatureFormattingInDom(root: HTMLElement): void {
  // 1. Cari blok tanda tangan yang memiliki jarak tanda tangan (h-12 / h-14 / h-16)
  const spacers = Array.from(
    root.querySelectorAll('div.h-12, div.h-14, div.h-16')
  );
  spacers.forEach((spacer) => {
    const container = spacer.parentElement;
    if (!container) return;
    const text = container.textContent || '';
    const looksLikeSignature =
      /\bNIP\b/i.test(text) ||
      /Pejabat Pembuat Komitmen/i.test(text) ||
      /Kepala Dinas/i.test(text) ||
      container.classList.contains('text-left');
    if (!looksLikeSignature) return;

    let cur = spacer.nextElementSibling;
    while (cur) {
      const next = cur.nextElementSibling;
      cleanSignatureSubtree(cur);
      cur = next;
    }
  });

  // 2. Cadangan: jika elemen nama masih memiliki kombinasi bold + underline dan bukan judul dokumen atau link
  const boldUnderlineNodes = Array.from(
    root.querySelectorAll('.font-bold.underline, .font-semibold.underline, .font-extrabold.underline')
  );
  boldUnderlineNodes.forEach((node) => {
    if (node.tagName.toLowerCase() === 'a') return;
    if (node.closest('.text-center') || node.classList.contains('text-center')) return;
    cleanSignatureSubtree(node);
  });

  // 3. Cadangan jika spacer sempat terhapus: periksa 1-2 elemen tepat sebelum baris NIP
  const allBlocks = Array.from(root.querySelectorAll('div, p'));
  allBlocks.forEach((block) => {
    const blockText = (block.textContent || '').trim();
    if (!/^NIP\b[\s.:]*/i.test(blockText)) return;
    if (block.closest('table.doc-table')) return;

    let prev = block.previousElementSibling;
    let steps = 0;
    while (prev && steps < 3) {
      const prevText = (prev.textContent || '').trim();
      if (
        prev.classList.contains('h-12') ||
        prev.classList.contains('h-14') ||
        prev.classList.contains('h-16') ||
        /Pejabat Pembuat Komitmen|Kepala Dinas|^Selaku$/i.test(prevText)
      ) {
        break;
      }
      if (prevText !== '') {
        cleanSignatureSubtree(prev);
        steps++;
      }
      prev = prev.previousElementSibling;
    }
  });
}

export function migratePreviewDocumentHtml(docId: string, html: string): string {
  if (!html || !TAHAP1_DOC_IDS.has(docId)) return html;

  let nextHtml = html;

  if (docId === 'doc2_permohonan') {
    nextHtml = replaceLelangTextInDoc2Html(nextHtml);
  }

  if (typeof document === 'undefined') {
    return nextHtml.replace(
      / class="([^"]*\b(?:font-bold|font-semibold)\b[^"]*\bunderline\b[^"]*)"/g,
      (full, cls) => {
        if (cls.includes('text-center') || cls.includes('text-[')) return full;
        const cleaned = cls
          .replace(/\b(?:font-bold|font-semibold|font-extrabold|underline)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned ? ` class="${cleaned}"` : '';
      }
    );
  }

  const root = document.createElement('div');
  root.innerHTML = nextHtml;

  if (docId === 'doc2_permohonan') {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const val = node.nodeValue || '';
      if (/\bproses\s+lelang\b/i.test(val)) {
        node.nodeValue = val.replace(
          /\b(proses\s+)(lelang)\b/gi,
          (_, prefix, lelangWord) => `${prefix}${matchCaseReplacement(lelangWord, 'pengadaan')}`
        );
      } else if (/^\s*lelang\b/i.test(val) && i > 0) {
        const prevVal = textNodes[i - 1].nodeValue || '';
        if (/\bproses\s*$/i.test(prevVal)) {
          node.nodeValue = val.replace(
            /^(\s*)(lelang)\b/i,
            (_, ws, lelangWord) => `${ws}${matchCaseReplacement(lelangWord, 'pengadaan')}`
          );
        }
      }
    }
  }

  cleanTahap1SignatureFormattingInDom(root);

  return root.innerHTML;
}

export function migrateCustomPreviewMap(
  map?: Partial<Record<string, string>> | null
): Partial<Record<string, string>> {
  if (!map || typeof map !== 'object') return {};
  const result: Partial<Record<string, string>> = {};
  for (const [docId, html] of Object.entries(map)) {
    if (typeof html === 'string') {
      result[docId] = migratePreviewDocumentHtml(docId, html);
    }
  }
  return result;
}

export function migrateTransactionPreviewHtml(tx: TransactionData): {
  transaction: TransactionData;
  changed: boolean;
} {
  const prevHtml = tx.customPreviewHtml || {};
  const prevBase = tx.customPreviewBaseHtml || {};
  const nextHtml = migrateCustomPreviewMap(prevHtml);
  const nextBase = migrateCustomPreviewMap(prevBase);

  let changed = false;
  for (const key of Object.keys(nextHtml)) {
    if (nextHtml[key] !== prevHtml[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) {
    for (const key of Object.keys(nextBase)) {
      if (nextBase[key] !== prevBase[key]) {
        changed = true;
        break;
      }
    }
  }

  if (!changed) {
    return { transaction: tx, changed: false };
  }

  return {
    changed: true,
    transaction: {
      ...tx,
      customPreviewHtml: nextHtml,
      customPreviewBaseHtml: nextBase,
    },
  };
}
