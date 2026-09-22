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
  async function downloadSingleStickerPNG(id, barcodeRenderOptions = {}, filename = null) {
    const DPI = 300;
    const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);
    const labelW = mmToPx(50); // 591 px
    const labelH = mmToPx(18); // 213 px

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
      engine.renderToCanvas(tempCanvas, id, {
        ...barcodeRenderOptions,
        barWidth: 2,
        height: 60,
        margin: 8,
        fontSize: 14,
        lineColor: '#000000',
        backgroundColor: '#ffffff'
      });

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

    const defaultFilename = filename || `stiker_TJ107_18x50mm_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

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
    const isLocked = barcodeRenderOptions.isLockedTJ107 !== false;
    const DPI = 300;
    const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);
    const labelW = mmToPx(50);
    const labelH = mmToPx(18);

    for (let i = 0; i < total; i++) {
      const item = items[i];
      const id = typeof item === 'string' ? item : item.id;
      const label = typeof item === 'object' && item.label ? item.label : (barcodeRenderOptions.topLabel || '');

      const engine = (typeof window !== 'undefined' && window.BarcodeEngine) || (typeof root !== 'undefined' && root && root.BarcodeEngine);
      let bytes;

      if (isLocked) {
        // Render sebagai stiker 18x50 mm presisi pada 300 DPI
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
            topLabel: label,
            barWidth: 2,
            height: 60,
            margin: 8,
            fontSize: 14,
            lineColor: '#000000',
            backgroundColor: '#ffffff'
          });

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
        bytes = await canvasToUint8Array(stickerCanvas);
        const safeFilename = `stiker_TJ107_18x50mm_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        zip.addFile(safeFilename, bytes);
      } else {
        if (engine) {
          engine.renderToCanvas(tempCanvas, id, {
            ...barcodeRenderOptions,
            topLabel: label
          });
        }
        bytes = await canvasToUint8Array(tempCanvas);
        const safeFilename = `barcode_${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        zip.addFile(safeFilename, bytes);
      }

      if (typeof onProgress === 'function') {
        onProgress(i + 1, total);
      }
    }

    const blob = zip.generateBlob();
    triggerDownload(blob, filename);
  }

  /**
   * 5. Download Full Sheet Image (PNG) - Tom & Jerry No. 107
   * Format: 165mm x 210mm, 3 kolom x 10 baris = 30 label
   * Top margin: 7mm, Side margin: 3mm
   * Horizontal pitch: 55mm (label width 50mm, col gap 5mm)
   * Vertical pitch: 20mm (label height 18mm, row gap 2mm)
   */
  async function downloadFullSheetPNG(items, barcodeRenderOptions, sheetIndex = 0, showBorders = true, filename = null) {
    if (!items || !items.length) {
      alert('Tidak ada barcode untuk diunduh lembarannya.');
      return;
    }

    const itemsPerPage = 30;
    const startIndex = sheetIndex * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

    // Resolusi 300 DPI untuk cetak tajam
    const DPI = 300;
    const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);

    const sheetW = mmToPx(165); // ~1949 px
    const sheetH = mmToPx(210); // ~2480 px
    const topMargin = mmToPx(7);
    const leftMargin = mmToPx(3);
    const labelW = mmToPx(50);
    const labelH = mmToPx(18);
    const colGap = mmToPx(5);
    const rowGap = mmToPx(2);
    const horizPitch = labelW + colGap; // 55mm
    const vertPitch = labelH + rowGap;  // 20mm

    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;
    const ctx = sheetCanvas.getContext('2d');

    // Latar belakang putih bersih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetW, sheetH);

    const engine = (typeof window !== 'undefined' && window.BarcodeEngine) || (typeof root !== 'undefined' && root && root.BarcodeEngine);

    // Render 30 posisi label (3 kolom x 10 baris)
    for (let i = 0; i < pageItems.length; i++) {
      const item = pageItems[i];
      const id = typeof item === 'string' ? item : item.id;
      const label = typeof item === 'object' && item.label ? item.label : (barcodeRenderOptions.topLabel || '');

      const col = i % 3;
      const row = Math.floor(i / 3);

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
          topLabel: label,
          barWidth: 2,
          height: 60,
          margin: 8,
          fontSize: 14,
          lineColor: '#000000',
          backgroundColor: '#ffffff'
        });

        // Gambar barcode di tengah area label dengan menjaga rasio aspek
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

    const defaultFilename = filename || `Lembar_TomJerry_107_Halaman_${sheetIndex + 1}.png`;

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

  return {
    downloadPNG,
    downloadSingleStickerPNG,
    downloadSVG,
    downloadCSV,
    downloadBatchZIP,
    downloadFullSheetPNG,
    MiniZip
  };
});
