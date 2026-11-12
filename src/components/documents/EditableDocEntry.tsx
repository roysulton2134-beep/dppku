import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface EditableDocEntryProps {
  docId: string;
  packageKey: string;
  customHtml?: string;
  customBaseHtml?: string;
  onUpdateCustomHtml: (docId: string, html: string, baseHtml: string) => void;
  children: React.ReactNode;
}

function tagSourceImages(sourceEl: HTMLElement): Map<string, string> {
  const map = new Map<string, string>();
  const imgs = sourceEl.querySelectorAll('img');
  imgs.forEach((img, idx) => {
    const id = String(idx);
    img.setAttribute('data-doc-img-id', id);
    const src = img.getAttribute('src') || '';
    map.set(`__DOC_IMG_${id}__`, src);
  });
  return map;
}

function serializeEditorHtml(
  editorEl: HTMLElement,
  sourceEl?: HTMLElement | null
): string {
  if (sourceEl) {
    tagSourceImages(sourceEl);
  }
  const clone = editorEl.cloneNode(true) as HTMLElement;
  const imgs = clone.querySelectorAll('img');
  imgs.forEach((img, idx) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith('data:image')) {
      const id = img.getAttribute('data-doc-img-id') ?? String(idx);
      img.setAttribute('src', `__DOC_IMG_${id}__`);
    }
  });
  return clone.innerHTML;
}

function hydrateEditorHtml(
  serializedHtml: string,
  sourceEl: HTMLElement | null
): string {
  if (!sourceEl) return serializedHtml;
  const imgMap = tagSourceImages(sourceEl);
  const allImgs = Array.from(sourceEl.querySelectorAll('img'));
  return serializedHtml.replace(/__DOC_IMG_(\d+)__/g, (_, idxStr) => {
    const key = `__DOC_IMG_${idxStr}__`;
    if (imgMap.has(key)) return imgMap.get(key)!;
    const fallbackIdx = Number(idxStr);
    return allImgs[fallbackIdx]?.getAttribute('src') || '';
  });
}

function collectTextNodes(root: Node): Text[] {
  const list: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    list.push(current as Text);
    current = walker.nextNode();
  }
  return list;
}

function syncSourceChangesIntoEditedDom(
  prevSourceSerialized: string,
  nextSourceEl: HTMLElement,
  editorEl: HTMLElement
): void {
  const prevEl = document.createElement('div');
  prevEl.innerHTML = hydrateEditorHtml(prevSourceSerialized, nextSourceEl);

  // 1. Sinkronkan blok Paraf Hierarki jika berubah
  const prevParafs = prevEl.querySelectorAll('[data-paraf-hierarki="true"]');
  const nextParafs = nextSourceEl.querySelectorAll('[data-paraf-hierarki="true"]');
  const editorParafs = editorEl.querySelectorAll('[data-paraf-hierarki="true"]');
  if (
    prevParafs.length === nextParafs.length &&
    editorParafs.length === nextParafs.length
  ) {
    nextParafs.forEach((nextP, i) => {
      if (prevParafs[i].innerHTML !== nextP.innerHTML) {
        editorParafs[i].innerHTML = nextP.innerHTML;
        prevParafs[i].innerHTML = nextP.innerHTML;
      }
    });
  }

  // 2. Sinkronkan tabel jika jumlah baris berubah (misal tambah/hapus barang)
  const prevTables = prevEl.querySelectorAll('table');
  const nextTables = nextSourceEl.querySelectorAll('table');
  const editorTables = editorEl.querySelectorAll('table');
  if (
    prevTables.length === nextTables.length &&
    editorTables.length === nextTables.length
  ) {
    nextTables.forEach((nextT, i) => {
      const prevT = prevTables[i];
      const editT = editorTables[i];
      if (prevT.rows.length !== nextT.rows.length) {
        editT.innerHTML = nextT.innerHTML;
        prevT.innerHTML = nextT.innerHTML;
      }
    });
  }

  // 3. Sinkronkan atribut src pada gambar
  const nextImgs = nextSourceEl.querySelectorAll('img');
  const editorImgs = editorEl.querySelectorAll('img');
  nextImgs.forEach((nextImg, idx) => {
    const nextSrc = nextImg.getAttribute('src') || '';
    const byId = editorEl.querySelector(`img[data-doc-img-id="${idx}"]`);
    const targetImg = byId || editorImgs[idx];
    if (targetImg && targetImg.getAttribute('src') !== nextSrc) {
      targetImg.setAttribute('src', nextSrc);
    }
  });

  // 4. Sinkronkan perubahan teks dari Form Input tanpa menghapus Enter / spasi / editan manual
  const prevTexts = collectTextNodes(prevEl);
  const nextTexts = collectTextNodes(nextSourceEl);
  const editorTexts = collectTextNodes(editorEl);

  if (prevTexts.length === nextTexts.length) {
    for (let i = 0; i < prevTexts.length; i++) {
      const oldVal = prevTexts[i].nodeValue ?? '';
      const newVal = nextTexts[i].nodeValue ?? '';
      if (oldVal === newVal) continue;

      if (editorTexts[i] && editorTexts[i].nodeValue === oldVal) {
        editorTexts[i].nodeValue = newVal;
        continue;
      }

      const exactMatch = editorTexts.find((t) => t.nodeValue === oldVal);
      if (exactMatch) {
        exactMatch.nodeValue = newVal;
        continue;
      }

      if (oldVal.trim().length >= 2) {
        const partialMatch = editorTexts.find(
          (t) => t.nodeValue && t.nodeValue.includes(oldVal)
        );
        if (partialMatch && partialMatch.nodeValue) {
          partialMatch.nodeValue = partialMatch.nodeValue.replace(oldVal, newVal);
        }
      }
    }
  }
}

export const EditableDocEntry: React.FC<EditableDocEntryProps> = ({
  docId,
  packageKey,
  customHtml,
  customBaseHtml,
  onUpdateCustomHtml,
  children,
}) => {
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastSourceHtmlRef = useRef<string>('');
  const lastAppliedCustomHtmlRef = useRef<string | undefined>(undefined);
  const lastPackageKeyRef = useRef<string>(packageKey);
  const debounceTimerRef = useRef<number | null>(null);
  const isDirtyRef = useRef<boolean>(false);

  const onUpdateCustomHtmlRef = useRef(onUpdateCustomHtml);
  onUpdateCustomHtmlRef.current = onUpdateCustomHtml;

  const flushPendingChanges = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (!isDirtyRef.current) return;
    const editorEl = editorRef.current;
    const sourceEl = sourceRef.current;
    if (!editorEl || !sourceEl) return;

    const serialized = serializeEditorHtml(editorEl, sourceEl);
    const baseSerialized = serializeEditorHtml(sourceEl, sourceEl);
    lastAppliedCustomHtmlRef.current = serialized;
    lastSourceHtmlRef.current = baseSerialized;
    isDirtyRef.current = false;
    onUpdateCustomHtmlRef.current(docId, serialized, baseSerialized);
  }, [docId]);

  useEffect(() => {
    const handleBeforePrint = () => {
      flushPendingChanges();
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      flushPendingChanges();
    };
  }, [flushPendingChanges]);

  useLayoutEffect(() => {
    const sourceEl = sourceRef.current;
    const editorEl = editorRef.current;
    if (!sourceEl || !editorEl) return;

    tagSourceImages(sourceEl);
    const currentSourceSerialized = serializeEditorHtml(sourceEl, sourceEl);

    const isPackageSwitch = lastPackageKeyRef.current !== packageKey;
    const isInitialMount = lastSourceHtmlRef.current === '';

    if (isInitialMount || isPackageSwitch) {
      lastPackageKeyRef.current = packageKey;
      isDirtyRef.current = false;
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (customHtml) {
        editorEl.innerHTML = hydrateEditorHtml(customHtml, sourceEl);
        if (customBaseHtml && customBaseHtml !== currentSourceSerialized) {
          syncSourceChangesIntoEditedDom(customBaseHtml, sourceEl, editorEl);
          const updatedCustom = serializeEditorHtml(editorEl, sourceEl);
          lastAppliedCustomHtmlRef.current = updatedCustom;
          lastSourceHtmlRef.current = currentSourceSerialized;
          onUpdateCustomHtmlRef.current(docId, updatedCustom, currentSourceSerialized);
          return;
        }
      } else {
        editorEl.innerHTML = sourceEl.innerHTML;
      }

      lastSourceHtmlRef.current = currentSourceSerialized;
      lastAppliedCustomHtmlRef.current = customHtml;
      return;
    }

    if (customHtml !== lastAppliedCustomHtmlRef.current && !isDirtyRef.current) {
      if (customHtml) {
        editorEl.innerHTML = hydrateEditorHtml(customHtml, sourceEl);
      } else {
        editorEl.innerHTML = sourceEl.innerHTML;
      }
      lastAppliedCustomHtmlRef.current = customHtml;
      lastSourceHtmlRef.current = currentSourceSerialized;
      return;
    }

    if (currentSourceSerialized !== lastSourceHtmlRef.current) {
      const prevSourceSerialized = lastSourceHtmlRef.current;
      lastSourceHtmlRef.current = currentSourceSerialized;

      if (!customHtml && !isDirtyRef.current) {
        editorEl.innerHTML = sourceEl.innerHTML;
      } else {
        syncSourceChangesIntoEditedDom(prevSourceSerialized, sourceEl, editorEl);
        const updatedCustom = serializeEditorHtml(editorEl, sourceEl);
        lastAppliedCustomHtmlRef.current = updatedCustom;
        onUpdateCustomHtmlRef.current(docId, updatedCustom, currentSourceSerialized);
      }
    }
  });

  const handleInput = useCallback(() => {
    isDirtyRef.current = true;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      flushPendingChanges();
    }, 200);
  }, [flushPendingChanges]);

  const handleBlur = useCallback(() => {
    flushPendingChanges();
  }, [flushPendingChanges]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const ok = document.execCommand('insertLineBreak');
        if (!ok) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const br = document.createElement('br');
            range.insertNode(br);
            range.setStartAfter(br);
            range.setEndAfter(br);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        handleInput();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '\u00A0\u00A0\u00A0\u00A0');
        handleInput();
        return;
      }

      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const node = range.startContainer;
          const offset = range.startOffset;
          let shouldUseNbsp = false;

          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const charBefore = offset > 0 ? text[offset - 1] : '';
            const charAfter = offset < text.length ? text[offset] : '';
            if (
              offset === 0 ||
              charBefore === ' ' ||
              charBefore === '\u00A0' ||
              charAfter === ' '
            ) {
              shouldUseNbsp = true;
            }
          } else {
            shouldUseNbsp = true;
          }

          if (shouldUseNbsp) {
            e.preventDefault();
            document.execCommand('insertText', false, '\u00A0');
            handleInput();
            return;
          }
        }
      }
    },
    [handleInput]
  );

  return (
    <>
      <div ref={sourceRef} className="hidden no-print" aria-hidden="true">
        {children}
      </div>
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        spellCheck={false}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="editable-doc-entry outline-none"
      />
    </>
  );
};
