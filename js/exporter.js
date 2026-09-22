/**
 * BarCodeID Studio - Exporter Module
 * Mengelola ekspor PNG, SVG, CSV, dan ZIP (didukung Native MiniZip & JSZip)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.BarcodeExporter = factory(root);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';
  root = root || (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));

  /**
   * Helper: Trigger download file di browser
   */
  function triggerDownload(blobOrUrl, filename) {
    const a = document.createElement('a');
    let url = blobOrUrl;
    let revoke = false;

    if (blobOrUrl instanceof Blob) {
      url = URL.createObjectURL(blobOrUrl);
      revoke = true;
    }

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (revoke) {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }

  /**
   * 1. Download Single Barcode ke PNG
   */
  function downloadPNG(canvas, filename = 'barcode.png') {
    if (!canvas) return;
    const safeName = filename.endsWith('.png') ? filename : `${filename}.png`;
    canvas.toBlob((blob) => {
      if (blob) {
        triggerDownload(blob, safeName);
      } else {
        triggerDownload(canvas.toDataURL('image/png'), safeName);
      }
    }, 'image/png');
  }

  /**
   * 1b. Download Single Barcode Sticker PNG - Khusus Ukuran 18 mm x 50 mm (Tom & Jerry 107) pada 300 DPI
   * Dimensi: 591 px x 213 px (50 mm x 18 mm)
   */
  async function downloadSingleStickerPNG(itemOrId, barcodeRenderOptions = {}, filename = null) {
    const DPI = 300;
    const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);
    
    const labelWidthMm = barcodeRenderOptions.labelWidthMm || 50;
    const labelHeightMm = barcodeRenderOptions.labelHeightMm || 18;
    const labelW = mmToPx(labelWidthMm);
    const labelH = mmToPx(labelHeightMm);

    const id = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId.id : itemOrId;
    const itemObj = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId : {};

    const stickerCanvas = document.createElement('canvas');
    stickerCanvas.width = labelW;
    stickerCanvas.height = labelH;
    const ctx = stickerCanvas.getContext('2d');

    // Latar belakang putih bersih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, labelW, labelH);

    // Garis batas stiker tipis
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(0, 0, labelW, labelH);
    ctx.setLineDash([]);

    const engine = (typeof window !== 'undefined' && window.BarcodeEngine) || (typeof root !== 'undefined' && root && root.BarcodeEngine);
    if (engine) {
      const tempCanvas = document.createElement('canvas');
      const itemFormat = itemObj.format || barcodeRenderOptions.format || 'CODE128';
      const isQR = itemFormat === 'QR' || itemFormat === 'QRCODE';

      engine.renderToCanvas(tempCanvas, id, {
        ...barcodeRenderOptions,
        format: itemFormat,
        topLabel: itemObj.label || barcodeRenderOptions.topLabel || '',
        labelLines: itemObj.labelLines || barcodeRenderOptions.labelLines || null,
        brand: itemObj.brand || barcodeRenderOptions.brand || '',
        gramasi: itemObj.gramasi || barcodeRenderOptions.gramasi || '',
        vault: itemObj.vault || barcodeRenderOptions.vault || '',
        lemari: itemObj.lemari || barcodeRenderOptions.lemari || '',
        laci: itemObj.laci || barcodeRenderOptions.laci || '',
        kotak: itemObj.kotak || barcodeRenderOptions.kotak || '',
        extraRows: itemObj.extraRows || barcodeRenderOptions.extraRows || [],
        targetWidth: isQR ? labelW : 0,
        targetHeight: isQR ? labelH : 0,
        barWidth: barcodeRenderOptions.barWidth || 2,
        height: barcodeRenderOptions.height || 60,
        margin: barcodeRenderOptions.margin || 8,
        fontSize: barcodeRenderOptions.fontSize || 14,
        fontSizeTitle: barcodeRenderOptions.fontSizeTitle || 12,
        fontSizeDetails: barcodeRenderOptions.fontSizeDetails || 10,
        fontSizeId: barcodeRenderOptions.fontSizeId || 11,
        lineColor: '#000000',
        backgroundColor: '#ffffff'
      });

      if (isQR && tempCanvas.width === labelW && tempCanvas.height === labelH) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, 0, 0);
      } else {
        const padX = mmToPx(1.5);
        const padY = mmToPx(1.0);
        const maxW = labelW - (padX * 2);
        const maxH = labelH - (padY * 2);

        const scale = Math.min(1.0, maxW / tempCanvas.width, maxH / tempCanvas.height);
        const drawW = Math.round(tempCanvas.width * scale);
        const drawH = Math.round(tempCanvas.height * scale);
        const drawX = Math.round((labelW - drawW) / 2);
        const drawY = Math.round((labelH - drawH) / 2);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
      }
    }

    const defaultFilename = filename || `stiker_${labelWidthMm}x${labelHeightMm}mm_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

    return new Promise((resolve) => {
      stickerCanvas.toBlob((blob) => {
        if (blob) {
          triggerDownload(blob, defaultFilename);
        } else {
          triggerDownload(stickerCanvas.toDataURL('image/png'), defaultFilename);
        }
        resolve();
      }, 'image/png');
    });
  }

  /**
   * 2. Download Single Barcode ke SVG
   */
  function downloadSVG(svgString, filename = 'barcode.svg') {
    const safeName = filename.endsWith('.svg') ? filename : `${filename}.svg`;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, safeName);
  }

  /**
   * 3. Download Daftar ID ke CSV
   */
  function downloadCSV(items, filename = 'daftar_barcode_id.csv') {
    if (!items || !items.length) {
      alert('Tidak ada data untuk diekspor ke CSV.');
      return;
    }

    const rows = [
      ['No', 'Nomor Identitas', 'Label / Produk', 'Format', 'Dibuat Pada']
    ];

    const timestamp = new Date().toLocaleString('id-ID');
    items.forEach((item, idx) => {
      const id = typeof item === 'string' ? item : item.id;
      const label = typeof item === 'object' && item.label ? item.label : '-';
      const format = typeof item === 'object' && item.format ? item.format : 'CODE128';
      rows.push([idx + 1, `"${id}"`, `"${label}"`, `"${format}"`, `"${timestamp}"`]);
    });

    const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename);
  }

  // --- NATIVE CLIENT-SIDE ZIP GENERATOR (MINIZIP) ---
  // Menjamin batch download ZIP berfungsi 100% offline tanpa dependensi eksternal!

  const CRC_TABLE = (function () {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    return table;
  })();

  function crc32(uint8Array) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < uint8Array.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ uint8Array[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  class MiniZip {
    constructor() {
      this.files = [];
    }

    addFile(filename, uint8Data) {
      this.files.push({
        name: filename,
        data: uint8Data,
        crc: crc32(uint8Data),
        size: uint8Data.length
      });
    }

    generateBlob() {
      const parts = [];
      const centralDirParts = [];
      let currentOffset = 0;

      const enc = new TextEncoder();
      const now = new Date();
      const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
      const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

      for (const file of this.files) {
        const nameBytes = enc.encode(file.name);

        // Local file header (30 bytes)
        const localHeader = new Uint8Array(30 + nameBytes.length);
        const view = new DataView(localHeader.buffer);

        view.setUint32(0, 0x04034b50, true); // Local header signature
        view.setUint16(4, 20, true);         // Version needed
        view.setUint16(6, 0, true);          // General flag
        view.setUint16(8, 0, true);          // Compression: 0 (Stored)
        view.setUint16(10, dosTime, true);
        view.setUint16(12, dosDate, true);
        view.setUint32(14, file.crc, true);
        view.setUint32(18, file.size, true); // Compressed size
        view.setUint32(22, file.size, true); // Uncompressed size
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);         // Extra field length
        localHeader.set(nameBytes, 30);

        parts.push(localHeader);
        parts.push(file.data);

        // Central directory file header (46 bytes + nameBytes)
        const cdHeader = new Uint8Array(46 + nameBytes.length);
        const cdView = new DataView(cdHeader.buffer);

        cdView.setUint32(0, 0x02014b50, true); // Central dir signature
        cdView.setUint16(4, 20, true);          // Version made by
        cdView.setUint16(6, 20, true);          // Version needed
        cdView.setUint16(8, 0, true);           // General flag
        cdView.setUint16(10, 0, true);          // Compression
        cdView.setUint16(12, dosTime, true);
        cdView.setUint16(14, dosDate, true);
        cdView.setUint32(16, file.crc, true);
        cdView.setUint32(20, file.size, true);
        cdView.setUint32(24, file.size, true);
        cdView.setUint16(28, nameBytes.length, true);
        cdView.setUint16(30, 0, true);          // Extra field len
        cdView.setUint16(32, 0, true);          // Comment len
        cdView.setUint16(34, 0, true);          // Disk start
        cdView.setUint16(36, 0, true);          // Internal attr
        cdView.setUint32(38, 0, true);          // External attr
        cdView.setUint32(42, currentOffset, true); // Relative offset of local header
        cdHeader.set(nameBytes, 46);

        centralDirParts.push(cdHeader);

        currentOffset += localHeader.length + file.size;
      }

      const cdOffset = currentOffset;
      let cdSize = 0;
      for (const p of centralDirParts) {
        cdSize += p.length;
      }

      // End of central directory record (22 bytes)
      const eocd = new Uint8Array(22);
      const eocdView = new DataView(eocd.buffer);
      eocdView.setUint32(0, 0x06054b50, true);
      eocdView.setUint16(4, 0, true); // Disk number
      eocdView.setUint16(6, 0, true); // Disk with CD
      eocdView.setUint16(8, this.files.length, true);  // Entries this disk
      eocdView.setUint16(10, this.files.length, true); // Total entries
      eocdView.setUint32(12, cdSize, true);            // Size of CD
      eocdView.setUint32(16, cdOffset, true);          // Offset of CD
      eocdView.setUint16(20, 0, true);                 // Comment length

      return new Blob([...parts, ...centralDirParts, eocd], { type: 'application/zip' });
    }
  }

  /**
   * Helper: Mengonversi Canvas ke Uint8Array PNG
   */
  async function canvasToUint8Array(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          // Fallback via dataURL
          const dataUrl = canvas.toDataURL('image/png');
          const binStr = atob(dataUrl.split(',')[1]);
          const len = binStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binStr.charCodeAt(i);
          }
          resolve(bytes);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          resolve(new Uint8Array(reader.result));
        };
        reader.readAsArrayBuffer(blob);
      }, 'image/png');
    });
  }

  /**
   * 4. Batch Download ZIP: Memaketkan seluruh barcode menjadi 1 file ZIP
   */
  async function downloadBatchZIP(items, barcodeRenderOptions, onProgress, filename = 'kumpulan_barcode.zip') {
    if (!items || !items.length) {
      alert('Tidak ada barcode untuk diunduh.');
      return;
    }

    const zip = new MiniZip();
    const tempCanvas = document.createElement('canvas');
    const total = items.length;
    const DPI = 300;
    const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);

    const labelWidthMm = barcodeRenderOptions.labelWidthMm || 50;
    const labelHeightMm = barcodeRenderOptions.labelHeightMm || 18;
    const labelW = mmToPx(labelWidthMm);
    const labelH = mmToPx(labelHeightMm);

    for (let i = 0; i < total; i++) {
      const item = items[i];
      const id = typeof item === 'object' && item !== null ? item.id : item;
      const itemObj = typeof item === 'object' && item !== null ? item : {};
      const itemFormat = itemObj.format || barcodeRenderOptions.format || 'CODE128';
      const isQR = itemFormat === 'QR' || itemFormat === 'QRCODE';

      const engine = (typeof window !== 'undefined' && window.BarcodeEngine) || (typeof root !== 'undefined' && root && root.BarcodeEngine);
      let bytes;

      const stickerCanvas = document.createElement('canvas');
      stickerCanvas.width = labelW;
      stickerCanvas.height = labelH;
      const ctx = stickerCanvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, labelW, labelH);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(0, 0, labelW, labelH);
      ctx.setLineDash([]);

      if (engine) {
        engine.renderToCanvas(tempCanvas, id, {
          ...barcodeRenderOptions,
          format: itemFormat,
          topLabel: itemObj.label || barcodeRenderOptions.topLabel || '',
          labelLines: itemObj.labelLines || barcodeRenderOptions.labelLines || null,
          brand: itemObj.brand || barcodeRenderOptions.brand || '',
          gramasi: itemObj.gramasi || barcodeRenderOptions.gramasi || '',
          vault: itemObj.vault || barcodeRenderOptions.vault || '',
          lemari: itemObj.lemari || barcodeRenderOptions.lemari || '',
          laci: itemObj.laci || barcodeRenderOptions.laci || '',
          kotak: itemObj.kotak || barcodeRenderOptions.kotak || '',
          extraRows: itemObj.extraRows || barcodeRenderOptions.extraRows || [],
          targetWidth: isQR ? labelW : 0,
          targetHeight: isQR ? labelH : 0,
          barWidth: barcodeRenderOptions.barWidth || 2,
          height: barcodeRenderOptions.height || 60,
          margin: barcodeRenderOptions.margin || 8,
          fontSize: barcodeRenderOptions.fontSize || 14,
          fontSizeTitle: barcodeRenderOptions.fontSizeTitle || 12,
          fontSizeDetails: barcodeRenderOptions.fontSizeDetails || 10,
          fontSizeId: barcodeRenderOptions.fontSizeId || 11,
          lineColor: '#000000',
          backgroundColor: '#ffffff'
        });

        if (isQR && tempCanvas.width === labelW && tempCanvas.height === labelH) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, 0, 0);
        } else {
          const padX = mmToPx(1.5);
          const padY = mmToPx(1.0);
          const maxW = labelW - (padX * 2);
          const maxH = labelH - (padY * 2);

          const scale = Math.min(1.0, maxW / tempCanvas.width, maxH / tempCanvas.height);
          const drawW = Math.round(tempCanvas.width * scale);
          const drawH = Math.round(tempCanvas.height * scale);
          const drawX = Math.round((labelW - drawW) / 2);
          const drawY = Math.round((labelH - drawH) / 2);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
        }
      }

      bytes = await canvasToUint8Array(stickerCanvas);
      const safeFilename = `stiker_${labelWidthMm}x${labelHeightMm}mm_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      zip.addFile(safeFilename, bytes);

      if (typeof onProgress === 'function') {
        onProgress(i + 1, total);
      }
    }

    const blob = zip.generateBlob();
    triggerDownload(blob, filename);
  }

  /**
   * Helper: Merender satu lembar (sheet) stiker ke objek Canvas (300 DPI)
   */
  function renderSheetToCanvas(items, barcodeRenderOptions, sheetIndex = 0, showBorders = true) {
    const paperWidthMm = barcodeRenderOptions.paperWidthMm || 165;
    const paperHeightMm = barcodeRenderOptions.paperHeightMm || 210;
    const labelWidthMm = barcodeRenderOptions.labelWidthMm || 50;
    const labelHeightMm = barcodeRenderOptions.labelHeightMm || 18;
    const cols = barcodeRenderOptions.cols || 3;
    const rows = barcodeRenderOptions.rows || 10;
    const topMarginMm = barcodeRenderOptions.topMarginMm !== undefined ? barcodeRenderOptions.topMarginMm : 7;
    const leftMarginMm = barcodeRenderOptions.leftMarginMm !== undefined ? barcodeRenderOptions.leftMarginMm : 3;
    const colGapMm = barcodeRenderOptions.colGapMm !== undefined ? barcodeRenderOptions.colGapMm : 5;
    const rowGapMm = barcodeRenderOptions.rowGapMm !== undefined ? barcodeRenderOptions.rowGapMm : 2;

    const itemsPerPage = Math.max(1, cols * rows);
    const startIndex = sheetIndex * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    // Resolusi 300 DPI untuk cetak tajam
    const DPI = 300;
    const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);

    const sheetW = mmToPx(paperWidthMm);
    const sheetH = mmToPx(paperHeightMm);
    const topMargin = mmToPx(topMarginMm);
    const leftMargin = mmToPx(leftMarginMm);
    const labelW = mmToPx(labelWidthMm);
    const labelH = mmToPx(labelHeightMm);
    const colGap = mmToPx(colGapMm);
    const rowGap = mmToPx(rowGapMm);
    const horizPitch = labelW + colGap;
    const vertPitch = labelH + rowGap;

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;
    const ctx = sheetCanvas.getContext('2d');

    // Latar belakang putih bersih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    const engine = (typeof window !== 'undefined' && window.BarcodeEngine) || (typeof root !== 'undefined' && root && root.BarcodeEngine);

    // Render setiap posisi label
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const id = typeof item === 'object' && item !== null ? item.id : item;
      const itemObj = typeof item === 'object' && item !== null ? item : {};
      const itemFormat = itemObj.format || barcodeRenderOptions.format || 'CODE128';
      const isQR = itemFormat === 'QR' || itemFormat === 'QRCODE';

      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = leftMargin + (col * horizPitch);
      const y = topMargin + (row * vertPitch);

      // Gambar batas stiker (jika showBorders diaktifkan)
      if (showBorders) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(x, y, labelW, labelH);
        ctx.setLineDash([]);
      }

      // Render barcode ke canvas sementara
      const tempCanvas = document.createElement('canvas');
      if (engine) {
        engine.renderToCanvas(tempCanvas, id, {
          ...barcodeRenderOptions,
          format: itemFormat,
          topLabel: itemObj.label || barcodeRenderOptions.topLabel || '',
          labelLines: itemObj.labelLines || barcodeRenderOptions.labelLines || null,
          brand: itemObj.brand || barcodeRenderOptions.brand || '',
          gramasi: itemObj.gramasi || barcodeRenderOptions.gramasi || '',
          vault: itemObj.vault || barcodeRenderOptions.vault || '',
          lemari: itemObj.lemari || barcodeRenderOptions.lemari || '',
          laci: itemObj.laci || barcodeRenderOptions.laci || '',
          kotak: itemObj.kotak || barcodeRenderOptions.kotak || '',
          extraRows: itemObj.extraRows || barcodeRenderOptions.extraRows || [],
          targetWidth: isQR ? labelW : 0,
          targetHeight: isQR ? labelH : 0,
          barWidth: barcodeRenderOptions.barWidth || 2,
          height: barcodeRenderOptions.height || 60,
          margin: barcodeRenderOptions.margin || 8,
          fontSize: barcodeRenderOptions.fontSize || 14,
          fontSizeTitle: barcodeRenderOptions.fontSizeTitle || 12,
          fontSizeDetails: barcodeRenderOptions.fontSizeDetails || 10,
          fontSizeId: barcodeRenderOptions.fontSizeId || 11,
          lineColor: '#000000',
          backgroundColor: '#ffffff'
        });

        if (isQR && tempCanvas.width === labelW && tempCanvas.height === labelH) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, x, y);
        } else {
          const padX = mmToPx(1.5);
          const padY = mmToPx(1.0);
          const maxW = labelW - (padX * 2);
          const maxH = labelH - (padY * 2);

          const scale = Math.min(1.0, maxW / tempCanvas.width, maxH / tempCanvas.height);
          const drawW = Math.round(tempCanvas.width * scale);
          const drawH = Math.round(tempCanvas.height * scale);
          const drawX = Math.round(x + (labelW - drawW) / 2);
          const drawY = Math.round(y + (labelH - drawH) / 2);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
        }
      }
    }

    return sheetCanvas;
  }

  /**
   * 5. Download Full Sheet Image (PNG) - Mendukung Template Tom & Jerry & Kustom Sendiri
   */
  async function downloadFullSheetPNG(items, barcodeRenderOptions, sheetIndex = 0, showBorders = true, filename = null) {
    if (!items || !items.length) {
      alert('Tidak ada barcode untuk diunduh lembarannya.');
      return;
    }

    const sheetCanvas = renderSheetToCanvas(items, barcodeRenderOptions, sheetIndex, showBorders);
    const defaultFilename = filename || `Lembar_Label_Halaman_${sheetIndex + 1}.png`;

    return new Promise((resolve) => {
      sheetCanvas.toBlob((blob) => {
        if (blob) {
          triggerDownload(blob, defaultFilename);
        } else {
          triggerDownload(sheetCanvas.toDataURL('image/png'), defaultFilename);
        }
        resolve();
      }, 'image/png');
    });
  }

  /**
   * 6. Download Full Sheet PDF - Mendukung Satu Lembar atau SEMUA Halaman Sekaligus
   */
  async function downloadFullSheetPDF(items, barcodeRenderOptions, sheetIndex = 'all', showBorders = true, filename = null) {
    if (!items || !items.length) {
      alert('Tidak ada barcode untuk diekspor ke PDF.');
      return;
    }

    const jsPDFLib = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) ||
                     (typeof root !== 'undefined' && root && root.jspdf && root.jspdf.jsPDF) ||
                     (typeof require === 'function' ? (function(){ try { return require('./jspdf.umd.min.js').jsPDF; } catch(e){ return null; } })() : null);

    if (!jsPDFLib) {
      alert('Modul jsPDF tidak ditemukan. Silakan gunakan tombol Cetak / PDF untuk mencetak melalui browser.');
      return;
    }

    const paperWidthMm = barcodeRenderOptions.paperWidthMm || 165;
    const paperHeightMm = barcodeRenderOptions.paperHeightMm || 210;
    const cols = barcodeRenderOptions.cols || 3;
    const rows = barcodeRenderOptions.rows || 10;
    const itemsPerPage = Math.max(1, cols * rows);
    const totalSheets = Math.ceil(items.length / itemsPerPage);

    const doc = new jsPDFLib({
      orientation: paperWidthMm > paperHeightMm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [paperWidthMm, paperHeightMm],
      compress: true
    });

    const isAll = sheetIndex === 'all';
    const sheetsToExport = isAll
      ? Array.from({ length: totalSheets }, (_, i) => i)
      : [parseInt(sheetIndex, 10) || 0];

    for (let idx = 0; idx < sheetsToExport.length; idx++) {
      const sIdx = sheetsToExport[idx];
      if (idx > 0) {
        doc.addPage([paperWidthMm, paperHeightMm], paperWidthMm > paperHeightMm ? 'landscape' : 'portrait');
      }

      const canvas = renderSheetToCanvas(items, barcodeRenderOptions, sIdx, showBorders);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, paperWidthMm, paperHeightMm, undefined, 'FAST');
    }

    const defaultFilename = filename || (isAll ? 'Label_Tom_Jerry_107_Semua_Halaman.pdf' : `Label_Tom_Jerry_107_Halaman_${(parseInt(sheetIndex, 10) || 0) + 1}.pdf`);
    doc.save(defaultFilename);
  }

  return {
    downloadPNG,
    downloadSingleStickerPNG,
    downloadSVG,
    downloadCSV,
    downloadBatchZIP,
    renderSheetToCanvas,
    downloadFullSheetPNG,
    downloadFullSheetPDF,
    MiniZip
  };
});
