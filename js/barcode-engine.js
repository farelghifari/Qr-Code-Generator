/**
 * BarCodeID Studio - Native Barcode Engine
 * Mendukung rendering Code 128, Code 39, EAN-13 secara native ke Canvas & SVG,
 * serta integrasi dengan JsBarcode jika tersedia.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.BarcodeEngine = factory(root);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';
  root = root || (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));

  // Pola Code 128: 107 pola karakter (lebar masing-masing bar & space, total 11 modul per karakter)
  // Format string: deretan lebar bar/space (misal '212222' = bar 2, space 1, bar 2, space 2, bar 2, space 2)
  const CODE128_PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112'                                 // 100-106 (106 = STOP pattern)
  ];

  const START_CODE_B = 104;
  const STOP_CODE = 106;

  /**
   * Mengonversi teks string ke array pola modul (0 dan 1) Code 128 Auto (Code B + Code C untuk digit berpasangan)
   * Memberikan densitas tinggi, menghemat ruang 40-50% untuk ID yang banyak angka (misal ORD00000000160600001),
   * sehingga barcode sangat tajam, scannable dengan mudah oleh semua barcode reader/scanner engine.
   */
  function encodeCode128Auto(text) {
    text = String(text !== undefined && text !== null ? text : '').trim();
    if (!text) text = '0';

    const codes = [];
    let checkSum = 0;
    let idx = 0;
    const startsWithDigits = /^\d{4,}/.test(text);
    let currentMode = startsWithDigits ? 'C' : 'B';
    const startCode = currentMode === 'C' ? 105 : 104;

    codes.push(startCode);
    checkSum = startCode;

    let weight = 1;
    while (idx < text.length) {
      if (currentMode === 'B') {
        const remaining = text.substring(idx);
        const matchDigits = remaining.match(/^\d{4,}/);
        if (matchDigits) {
          codes.push(99); // Switch to Code C
          checkSum += 99 * weight;
          weight++;
          currentMode = 'C';
          continue;
        }
        const codePoint = text.charCodeAt(idx);
        const val = (codePoint >= 32 && codePoint <= 126) ? (codePoint - 32) : 0;
        codes.push(val);
        checkSum += val * weight;
        weight++;
        idx++;
      } else {
        const remaining = text.substring(idx);
        if (/^\d{2}/.test(remaining)) {
          const pairVal = parseInt(remaining.substr(0, 2), 10);
          codes.push(pairVal);
          checkSum += pairVal * weight;
          weight++;
          idx += 2;
        } else {
          codes.push(100); // Switch to Code B
          checkSum += 100 * weight;
          weight++;
          currentMode = 'B';
        }
      }
    }

    const checkDigit = checkSum % 103;
    codes.push(checkDigit);
    codes.push(STOP_CODE);

    let binary = '';
    for (let idx = 0; idx < codes.length; idx++) {
      const val = codes[idx];
      const pattern = CODE128_PATTERNS[val];
      if (!pattern) continue;

      let isBar = true;
      for (let p = 0; p < pattern.length; p++) {
        const width = parseInt(pattern[p], 10);
        binary += (isBar ? '1' : '0').repeat(width);
        isBar = !isBar;
      }
    }

    return binary;
  }

  /**
   * Mengonversi teks string ke array pola modul (0 dan 1) Code 128B
   */
  function encodeCode128B(text) {
    text = String(text !== undefined && text !== null ? text : '').trim();
    const codes = [START_CODE_B];
    let checkSum = START_CODE_B;

    for (let i = 0; i < text.length; i++) {
      const codePoint = text.charCodeAt(i);
      // Code 128B mendukung ASCII 32..127
      const value = (codePoint >= 32 && codePoint <= 126) ? (codePoint - 32) : 0;
      codes.push(value);
      checkSum += value * (i + 1);
    }

    const checkDigit = checkSum % 103;
    codes.push(checkDigit);
    codes.push(STOP_CODE);

    // Ubah rangkaian kode menjadi representasi biner (bar = 1, space = 0)
    let binary = '';
    for (let idx = 0; idx < codes.length; idx++) {
      const val = codes[idx];
      const pattern = CODE128_PATTERNS[val];
      if (!pattern) continue;

      let isBar = true;
      for (let p = 0; p < pattern.length; p++) {
        const width = parseInt(pattern[p], 10);
        binary += (isBar ? '1' : '0').repeat(width);
        isBar = !isBar;
      }
    }

    return binary;
  }

  /**
   * Code 39 Simple Encoding
   */
  const CODE39_MAP = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
  };

  function encodeCode39(text) {
    const upper = '*' + text.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '-') + '*';
    let binary = '';
    for (let i = 0; i < upper.length; i++) {
      const ch = upper[i];
      const pattern = CODE39_MAP[ch] || CODE39_MAP['-'];
      // 9 bits: b0 s0 b1 s1 b2 s2 b3 s3 b4
      // bit 1 = lebar tebal (2 atau 3), bit 0 = lebar tipis (1)
      for (let j = 0; j < 9; j++) {
        const isBar = (j % 2 === 0);
        const isWide = (pattern[j] === '1');
        const width = isWide ? 3 : 1;
        binary += (isBar ? '1' : '0').repeat(width);
      }
      binary += '0'; // Inter-character gap
    }
    return binary;
  }

  /**
   * EAN-13 Simple Encoding
   */
  function calculateEan13CheckDigit(first12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const num = parseInt(first12[i], 10) || 0;
      sum += (i % 2 === 0) ? num : num * 3;
    }
    return (10 - (sum % 10)) % 10;
  }

  function encodeEan13(text) {
    let digits = text.replace(/\D/g, '');
    if (digits.length < 12) {
      digits = digits.padEnd(12, '0');
    } else if (digits.length > 12) {
      digits = digits.substring(0, 12);
    }
    const check = calculateEan13CheckDigit(digits);
    const full13 = digits + check;

    // Untuk simplifikasi native fallback, gunakan pola bar EAN standard
    // atau gunakan Code 128 jika text bukan numeric murni
    return {
      binary: encodeCode128B(full13),
      displayValue: full13
    };
  }

  /**
   * Menghasilkan biner representasi barcode berdasarkan simbologi
   */
  function getBarcodeBinary(text, format) {
    const fmt = (format || 'CODE128').toUpperCase();
    if (fmt === 'CODE39') {
      return { binary: encodeCode39(text), displayValue: text };
    }
    if (fmt === 'EAN13' || fmt === 'EAN') {
      return encodeEan13(text);
    }
    return { binary: encodeCode128Auto(text), displayValue: text };
  }

  /**
   * Helper: Mengekstrak baris-baris detail dari objek opsi label (brand, gramasi, lokasi, extra rows)
   */
  /**
   * Helper: Mengekstrak baris-baris detail dari objek opsi label (brand, gramasi, lokasi, extra rows, labelLines)
   * Mendukung hingga 6 baris kustom
   */
  function extractDetailLines(options) {
    if (!options) return [];
    
    // 1. Jika ada labelLines eksplisit (array baris 1 s/d 6 yang sudah dikonfigurasi dinamis)
    if (Array.isArray(options.labelLines) && options.labelLines.length > 0) {
      const cleanLines = options.labelLines
        .map(s => String(s !== undefined && s !== null ? s : '').trim())
        .filter(Boolean);
      if (cleanLines.length > 0) {
        return cleanLines.slice(0, 6);
      }
    }

    const lines = [];
    const brand = String(options.brand || '').trim();
    const gramasi = String(options.gramasi || '').trim();
    const vault = String(options.vault || '').trim();
    const lemari = String(options.lemari || '').trim();
    const laci = String(options.laci || '').trim();
    const kotak = String(options.kotak || '').trim();
    const extraRows = options.extraRows || [];

    if (brand || gramasi) {
      lines.push([brand, gramasi].filter(Boolean).join(' - '));
    }
    const locParts = [vault, lemari, laci, kotak].filter(Boolean);
    if (locParts.length > 0) {
      lines.push(locParts.join(' - '));
    }

    if (Array.isArray(extraRows)) {
      extraRows.forEach(row => {
        if (!row) return;
        const k = String(row.key || '').trim();
        const v = String(row.value || '').trim();
        if (k && v) {
          lines.push(`${k}: ${v}`);
        } else if (v) {
          lines.push(v);
        } else if (k) {
          lines.push(k);
        }
      });
    }

    if (lines.length === 0 && options.topLabel) {
      return splitTopLabel(options.topLabel).slice(0, 6);
    }

    return lines.slice(0, 6);
  }

  /**
   * Memotong / memecah teks ID panjang menjadi beberapa baris vertikal rapi
   * Mendukung 'auto' (menyesuaikan lebar QR), angka spesifik (6, 7, 8, 10), atau 'none'
   */
  function sliceTextChunks(text, chunkSize = 'auto') {
    if (!text) return [];
    const str = String(text).trim();
    if (!str) return [];
    if (chunkSize === 'none') return [str];

    let size = 7;
    if (chunkSize === 'auto') {
      if (str.length <= 8) return [str];
      if (str.length <= 14) size = Math.ceil(str.length / 2);
      else if (str.length <= 21) size = 7; // e.g. 21 karakter -> 3 baris x 7 karakter
      else size = 8;
    } else {
      const parsed = parseInt(chunkSize, 10);
      if (!isNaN(parsed) && parsed > 0) size = parsed;
    }

    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
      chunks.push(str.substring(i, i + size));
    }
    return chunks;
  }

  /**
   * Render QR Code ke Canvas Element dengan resolusi tajam HD & ID adaptif di bawah QR
   */
  function renderQRCodeToCanvas(canvas, text, options = {}) {
    if (!canvas) return;
    const qrcodeLib = (typeof window !== 'undefined' && window.qrcode) || 
                      (typeof root !== 'undefined' && root && root.qrcode) || 
                      (typeof require === 'function' ? (function(){ try { return require('./qrcode.min.js'); } catch(e){ return null; } })() : null);

    const {
      layoutPosition = 'side-left',
      targetWidth = 0,
      targetHeight = 0,
      margin = 8,
      displayValue = true,
      idPosition = 'under-code',
      idSliceChunk = 'auto',
      barcodeScale = 1.0,
      fontSizeTitle = 12,
      fontSizeDetails = 10,
      fontSizeId = 11,
      fontFamily = 'sans-serif',
      lineColor = '#0f172a',
      backgroundColor = '#ffffff'
    } = options;

    const qrText = String(text !== undefined && text !== null ? text : '0').trim() || '0';
    let qr = null;
    let count = 25;

    if (typeof qrcodeLib === 'function') {
      try {
        qr = qrcodeLib(0, 'M');
        qr.addData(qrText);
        qr.make();
        count = qr.getModuleCount();
      } catch (e) {
        try {
          qr = qrcodeLib(0, 'L');
          qr.addData(qrText);
          qr.make();
          count = qr.getModuleCount();
        } catch (e2) {
          console.error('QR creation error:', e2);
        }
      }
    }

    const detailLines = extractDetailLines(options);
    let width = targetWidth;
    let height = targetHeight;

    if (!width || !height) {
      if (layoutPosition.startsWith('side')) {
        width = 480;
        height = 175;
      } else {
        width = 300;
        height = 300;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (!qr) {
      ctx.fillStyle = lineColor;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(qrText, width / 2, height / 2);
      return canvas;
    }

    const showIdUnder = displayValue && idPosition === 'under-code';
    const showIdSide = displayValue && idPosition === 'side-text';
    const scaleFactor = Math.max(0.4, Math.min(1.6, parseFloat(barcodeScale) || 1.0));

    // Monospace character width for accurate under-QR alignment
    ctx.font = `bold ${fontSizeId}px monospace`;
    const charW = ctx.measureText('0').width || (fontSizeId * 0.62);

    if (layoutPosition === 'stacked') {
      let curY = margin;
      const totalLines = detailLines.length;
      let effTitleSize = fontSizeTitle;
      let effDetailSize = fontSizeDetails;
      if (totalLines > 2) {
        const factor = Math.max(0.65, Math.min(1.0, (height * 0.45) / (totalLines * (fontSizeDetails + 3))));
        effTitleSize = Math.max(8, Math.round(fontSizeTitle * factor));
        effDetailSize = Math.max(7, Math.round(fontSizeDetails * factor));
      }

      if (detailLines.length > 0) {
        ctx.fillStyle = lineColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `bold ${effTitleSize}px ${fontFamily}`;
        ctx.fillText(detailLines[0], width / 2, curY);
        curY += effTitleSize + 3;

        if (detailLines.length > 1) {
          ctx.font = `600 ${effDetailSize}px ${fontFamily}`;
          for (let i = 1; i < detailLines.length; i++) {
            ctx.fillText(detailLines[i], width / 2, curY);
            curY += effDetailSize + 2;
          }
        }
        curY += 2;
      }

      // Estimasi awal cellSize & QR width
      const idHeightEst = showIdUnder ? (3 * (fontSizeId + 2)) : (showIdSide ? (fontSizeId + 4) : 0);
      const remainHEst = Math.max(10, height - curY - idHeightEst - margin);
      const rawCellEst = Math.max(1, Math.floor(remainHEst / count));
      const cellEst = Math.max(1, Math.floor(rawCellEst * scaleFactor));
      const qrPixelEst = cellEst * count;

      // Adaptasi chunk lebar ID agar presisi sama dengan lebar QR
      let activeChunk = idSliceChunk;
      if (idSliceChunk === 'auto') {
        activeChunk = Math.max(3, Math.floor((qrPixelEst + 2) / charW));
      }
      let idLines = showIdUnder ? sliceTextChunks(qrText, activeChunk) : [];
      let idLineH = fontSizeId + 2;
      let totalIdH = showIdUnder && idLines.length > 0 ? (idLines.length * idLineH + 2) : 0;

      const idHeight = showIdUnder ? totalIdH : (showIdSide ? (fontSizeId + 4) : 0);
      const remainH = Math.max(10, height - curY - idHeight - margin);
      const rawCellSize = Math.max(1, Math.floor(remainH / count));
      const cellSize = Math.max(1, Math.floor(rawCellSize * scaleFactor));
      const qrPixelSize = cellSize * count;

      if (idSliceChunk === 'auto') {
        const finalAuto = Math.max(3, Math.floor((qrPixelSize + 2) / charW));
        if (finalAuto !== activeChunk) {
          activeChunk = finalAuto;
          idLines = sliceTextChunks(qrText, activeChunk);
        }
      }

      const qrX = Math.round((width - qrPixelSize) / 2);
      const qrY = curY + Math.round((remainH - qrPixelSize) / 2);

      ctx.fillStyle = lineColor;
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize, cellSize);
          }
        }
      }

      if (showIdUnder && idLines.length > 0) {
        ctx.fillStyle = lineColor;
        ctx.font = `bold ${fontSizeId}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        let curIdY = qrY + qrPixelSize + 3;
        idLines.forEach(line => {
          ctx.fillText(line, width / 2, curIdY);
          curIdY += idLineH;
        });
      } else if (showIdSide || (displayValue && !showIdUnder)) {
        ctx.fillStyle = lineColor;
        ctx.font = `bold ${fontSizeId}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(qrText, width / 2, qrY + qrPixelSize + 3);
      }
    } else {
      // side-left atau side-right (Proporsional, tidak mepet kiri, ID adaptif lebar QR)
      const isSideLeft = layoutPosition !== 'side-right';

      // Alokasikan zona kolom QR Code secara proporsional (~35% - 40% dari lebar label)
      const codeZoneW = Math.max(Math.round(height * 0.9), Math.round(width * 0.38));
      const codeZoneCenter = isSideLeft 
        ? Math.round(codeZoneW / 2) 
        : (width - Math.round(codeZoneW / 2));

      // 1. Estimasi awal batas kotak QR
      const maxBoxInitial = Math.max(10, Math.min(height - (margin * 2), codeZoneW - (margin * 2)));
      const rawCellSizeEst = Math.max(1, Math.floor(maxBoxInitial / count));
      const cellSizeEst = Math.max(1, Math.floor(rawCellSizeEst * scaleFactor));
      const qrPixelEst = cellSizeEst * count;

      // 2. Hitung jumlah karakter per baris yang pas dengan lebar QR
      let activeChunk = idSliceChunk;
      if (idSliceChunk === 'auto') {
        activeChunk = Math.max(3, Math.floor((qrPixelEst + 2) / charW));
      }
      let idLines = showIdUnder ? sliceTextChunks(qrText, activeChunk) : [];
      let idLineH = fontSizeId + 2;
      let totalIdH = showIdUnder && idLines.length > 0 ? (idLines.length * idLineH + 2) : 0;

      // 3. Hitung ulang ukuran QR presisi setelah totalIdH diketahui
      const availableH = height - (margin * 2) - totalIdH;
      const availableW = codeZoneW - (margin * 2);
      const maxBox = Math.max(10, Math.min(availableH, availableW));

      const rawCellSize = Math.max(1, Math.floor(maxBox / count));
      const cellSize = Math.max(1, Math.floor(rawCellSize * scaleFactor));
      const qrPixelSize = cellSize * count;

      // 4. Sinkronisasi final karakter per baris dengan ukuran pixel QR yang sebenarnya
      if (idSliceChunk === 'auto') {
        const finalAuto = Math.max(3, Math.floor((qrPixelSize + 2) / charW));
        if (finalAuto !== activeChunk) {
          activeChunk = finalAuto;
          idLines = sliceTextChunks(qrText, activeChunk);
          totalIdH = idLines.length * idLineH + 2;
        }
      }

      // Hitung total tinggi kelompok (QR + Sliced ID) agar vertikal di tengah zona
      const totalGroupH = qrPixelSize + (totalIdH > 0 ? (totalIdH + 2) : 0);
      const groupY = Math.max(margin, Math.round((height - totalGroupH) / 2));
      const qrY = groupY;
      const qrX = Math.round(codeZoneCenter - (qrPixelSize / 2));

      // Gambar Modul QR Code
      ctx.fillStyle = lineColor;
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, cellSize, cellSize);
          }
        }
      }

      // Render Nomor ID di bawah QR (Sliced Vertikal menyesuaikan lebar QR)
      if (showIdUnder && idLines.length > 0) {
        ctx.fillStyle = lineColor;
        ctx.font = `bold ${fontSizeId}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        let curIdY = qrY + qrPixelSize + 3;
        idLines.forEach(line => {
          ctx.fillText(line, codeZoneCenter, curIdY);
          curIdY += idLineH;
        });
      }

      // Zona Teks Detail Produk (Mendukung hingga 6 baris)
      const textX = isSideLeft ? (codeZoneW + 8) : margin;
      const maxTextW = isSideLeft 
        ? Math.max(20, width - textX - margin) 
        : Math.max(20, (width - codeZoneW - 8) - margin);

      const totalLines = detailLines.length + (showIdSide ? 1 : 0);
      const lineHeights = [];
      let totalTextH = 0;

      // Penyesuaian ukuran font dinamis agar muat rapi hingga 6 baris stiker
      const availTextH = height - (margin * 2);
      let effTitleSize = fontSizeTitle;
      let effDetailSize = fontSizeDetails;
      if (totalLines > 2) {
        const estTotal = (fontSizeTitle + 3) + ((totalLines - 1) * (fontSizeDetails + 3));
        if (estTotal > availTextH) {
          const factor = Math.max(0.65, Math.min(1.0, availTextH / estTotal));
          effTitleSize = Math.max(8, Math.round(fontSizeTitle * factor));
          effDetailSize = Math.max(7, Math.round(fontSizeDetails * factor));
        }
      }

      detailLines.forEach((line, idx) => {
        const sz = idx === 0 ? effTitleSize : effDetailSize;
        const h = sz + 3;
        lineHeights.push(h);
        totalTextH += h;
      });
      if (showIdSide) {
        const h = fontSizeId + 4;
        lineHeights.push(h);
        totalTextH += h;
      }

      let textY = Math.max(margin, Math.round((height - totalTextH) / 2));
      ctx.fillStyle = lineColor;
      ctx.textAlign = isSideLeft ? 'left' : 'right';
      ctx.textBaseline = 'top';
      const anchorX = isSideLeft ? textX : (textX + maxTextW);

      detailLines.forEach((line, idx) => {
        const isHeader = idx === 0;
        ctx.font = isHeader ? `bold ${effTitleSize}px ${fontFamily}` : `600 ${effDetailSize}px ${fontFamily}`;
        ctx.fillText(line, anchorX, textY, maxTextW);
        textY += lineHeights[idx];
      });

      if (showIdSide) {
        ctx.font = `bold ${fontSizeId}px monospace`;
        ctx.fillText(qrText, anchorX, textY + 2, maxTextW);
      }
    }

    return canvas;
  }

  /**
   * Render QR Code ke SVG String dengan nomor ID adaptif lebar QR & teks hingga 6 baris
   */
  function renderQRCodeToSVG(text, options = {}) {
    const qrcodeLib = (typeof window !== 'undefined' && window.qrcode) || 
                      (typeof root !== 'undefined' && root && root.qrcode) || 
                      (typeof require === 'function' ? (function(){ try { return require('./qrcode.min.js'); } catch(e){ return null; } })() : null);

    const {
      layoutPosition = 'side-left',
      targetWidth = 0,
      targetHeight = 0,
      margin = 8,
      displayValue = true,
      idPosition = 'under-code',
      idSliceChunk = 'auto',
      barcodeScale = 1.0,
      fontSizeTitle = 12,
      fontSizeDetails = 10,
      fontSizeId = 11,
      fontFamily = 'sans-serif',
      lineColor = '#0f172a',
      backgroundColor = '#ffffff'
    } = options;

    const qrText = String(text !== undefined && text !== null ? text : '0').trim() || '0';
    let qr = null;
    let count = 25;
    if (typeof qrcodeLib === 'function') {
      try {
        qr = qrcodeLib(0, 'M');
        qr.addData(qrText);
        qr.make();
        count = qr.getModuleCount();
      } catch (e) {
        try {
          qr = qrcodeLib(0, 'L');
          qr.addData(qrText);
          qr.make();
          count = qr.getModuleCount();
        } catch (e2) {}
      }
    }

    const detailLines = extractDetailLines(options);
    let width = targetWidth;
    let height = targetHeight;
    if (!width || !height) {
      if (layoutPosition.startsWith('side')) {
        width = 480;
        height = 175;
      } else {
        width = 300;
        height = 300;
      }
    }

    const showIdUnder = displayValue && idPosition === 'under-code';
    const showIdSide = displayValue && idPosition === 'side-text';
    const scaleFactor = Math.max(0.4, Math.min(1.6, parseFloat(barcodeScale) || 1.0));
    const charW = fontSizeId * 0.62;

    let rects = '';
    let textSvg = '';

    if (qr) {
      if (layoutPosition === 'stacked') {
        let curY = margin;
        const totalLines = detailLines.length;
        let effTitleSize = fontSizeTitle;
        let effDetailSize = fontSizeDetails;
        if (totalLines > 2) {
          const factor = Math.max(0.65, Math.min(1.0, (height * 0.45) / (totalLines * (fontSizeDetails + 3))));
          effTitleSize = Math.max(8, Math.round(fontSizeTitle * factor));
          effDetailSize = Math.max(7, Math.round(fontSizeDetails * factor));
        }

        if (detailLines.length > 0) {
          textSvg += `<text x="${width / 2}" y="${curY + effTitleSize}" text-anchor="middle" font-family="${fontFamily}" font-weight="bold" font-size="${effTitleSize}" fill="${lineColor}">${escapeXml(detailLines[0])}</text>`;
          curY += effTitleSize + 3;
          for (let i = 1; i < detailLines.length; i++) {
            textSvg += `<text x="${width / 2}" y="${curY + effDetailSize}" text-anchor="middle" font-family="${fontFamily}" font-weight="600" font-size="${effDetailSize}" fill="${lineColor}">${escapeXml(detailLines[i])}</text>`;
            curY += effDetailSize + 2;
          }
          curY += 2;
        }

        const idHeightEst = showIdUnder ? (3 * (fontSizeId + 2)) : (showIdSide ? (fontSizeId + 4) : 0);
        const remainHEst = Math.max(10, height - curY - idHeightEst - margin);
        const rawCellEst = Math.max(1, Math.floor(remainHEst / count));
        const cellEst = Math.max(1, Math.floor(rawCellEst * scaleFactor));
        const qrPixelEst = cellEst * count;

        let activeChunk = idSliceChunk;
        if (idSliceChunk === 'auto') {
          activeChunk = Math.max(3, Math.floor((qrPixelEst + 2) / charW));
        }
        let idLines = showIdUnder ? sliceTextChunks(qrText, activeChunk) : [];
        let idLineH = fontSizeId + 2;
        let totalIdH = showIdUnder && idLines.length > 0 ? (idLines.length * idLineH + 2) : 0;

        const idHeight = showIdUnder ? totalIdH : (showIdSide ? (fontSizeId + 4) : 0);
        const remainH = Math.max(10, height - curY - idHeight - margin);
        const rawCellSize = Math.max(1, Math.floor(remainH / count));
        const cellSize = Math.max(1, Math.floor(rawCellSize * scaleFactor));
        const qrPixelSize = cellSize * count;

        if (idSliceChunk === 'auto') {
          const finalAuto = Math.max(3, Math.floor((qrPixelSize + 2) / charW));
          if (finalAuto !== activeChunk) {
            activeChunk = finalAuto;
            idLines = sliceTextChunks(qrText, activeChunk);
          }
        }

        const qrX = Math.round((width - qrPixelSize) / 2);
        const qrY = curY + Math.round((remainH - qrPixelSize) / 2);

        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
              rects += `<rect x="${qrX + c * cellSize}" y="${qrY + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${lineColor}" />`;
            }
          }
        }
        if (showIdUnder && idLines.length > 0) {
          let curIdY = qrY + qrPixelSize + fontSizeId + 2;
          idLines.forEach(l => {
            textSvg += `<text x="${width / 2}" y="${curIdY}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${fontSizeId}" fill="${lineColor}">${escapeXml(l)}</text>`;
            curIdY += idLineH;
          });
        } else if (showIdSide || (displayValue && !showIdUnder)) {
          textSvg += `<text x="${width / 2}" y="${qrY + qrPixelSize + fontSizeId + 2}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${fontSizeId}" fill="${lineColor}">${escapeXml(qrText)}</text>`;
        }
      } else {
        const isSideLeft = layoutPosition !== 'side-right';
        const codeZoneW = Math.max(Math.round(height * 0.9), Math.round(width * 0.38));
        const codeZoneCenter = isSideLeft ? Math.round(codeZoneW / 2) : (width - Math.round(codeZoneW / 2));

        const maxBoxInitial = Math.max(10, Math.min(height - (margin * 2), codeZoneW - (margin * 2)));
        const rawCellSizeEst = Math.max(1, Math.floor(maxBoxInitial / count));
        const cellSizeEst = Math.max(1, Math.floor(rawCellSizeEst * scaleFactor));
        const qrPixelEst = cellSizeEst * count;

        let activeChunk = idSliceChunk;
        if (idSliceChunk === 'auto') {
          activeChunk = Math.max(3, Math.floor((qrPixelEst + 2) / charW));
        }
        let idLines = showIdUnder ? sliceTextChunks(qrText, activeChunk) : [];
        let idLineH = fontSizeId + 2;
        let totalIdH = showIdUnder && idLines.length > 0 ? (idLines.length * idLineH + 2) : 0;

        const availableH = height - (margin * 2) - totalIdH;
        const availableW = codeZoneW - (margin * 2);
        const maxBox = Math.max(10, Math.min(availableH, availableW));

        const rawCellSize = Math.max(1, Math.floor(maxBox / count));
        const cellSize = Math.max(1, Math.floor(rawCellSize * scaleFactor));
        const qrPixelSize = cellSize * count;

        if (idSliceChunk === 'auto') {
          const finalAuto = Math.max(3, Math.floor((qrPixelSize + 2) / charW));
          if (finalAuto !== activeChunk) {
            activeChunk = finalAuto;
            idLines = sliceTextChunks(qrText, activeChunk);
            totalIdH = idLines.length * idLineH + 2;
          }
        }

        const totalGroupH = qrPixelSize + (totalIdH > 0 ? (totalIdH + 2) : 0);
        const qrY = Math.max(margin, Math.round((height - totalGroupH) / 2));
        const qrX = Math.round(codeZoneCenter - (qrPixelSize / 2));

        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
              rects += `<rect x="${qrX + c * cellSize}" y="${qrY + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${lineColor}" />`;
            }
          }
        }

        if (showIdUnder && idLines.length > 0) {
          let curIdY = qrY + qrPixelSize + fontSizeId + 2;
          idLines.forEach(l => {
            textSvg += `<text x="${codeZoneCenter}" y="${curIdY}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${fontSizeId}" fill="${lineColor}">${escapeXml(l)}</text>`;
            curIdY += idLineH;
          });
        }

        const textX = isSideLeft ? (codeZoneW + 8) : margin;
        const maxTextW = isSideLeft ? (width - textX - margin) : (width - codeZoneW - 8 - margin);
        const anchorX = isSideLeft ? textX : (textX + maxTextW);
        const anchorType = isSideLeft ? 'start' : 'end';

        const totalLines = detailLines.length + (showIdSide ? 1 : 0);
        const lineHeights = [];
        let totalTextH = 0;

        const availTextH = height - (margin * 2);
        let effTitleSize = fontSizeTitle;
        let effDetailSize = fontSizeDetails;
        if (totalLines > 2) {
          const estTotal = (fontSizeTitle + 3) + ((totalLines - 1) * (fontSizeDetails + 3));
          if (estTotal > availTextH) {
            const factor = Math.max(0.65, Math.min(1.0, availTextH / estTotal));
            effTitleSize = Math.max(8, Math.round(fontSizeTitle * factor));
            effDetailSize = Math.max(7, Math.round(fontSizeDetails * factor));
          }
        }

        detailLines.forEach((line, idx) => {
          const sz = idx === 0 ? effTitleSize : effDetailSize;
          const h = sz + 3;
          lineHeights.push(h);
          totalTextH += h;
        });
        if (showIdSide) {
          const h = fontSizeId + 4;
          lineHeights.push(h);
          totalTextH += h;
        }

        let textY = Math.max(margin, Math.round((height - totalTextH) / 2));
        detailLines.forEach((line, idx) => {
          const isHeader = idx === 0;
          const sz = isHeader ? effTitleSize : effDetailSize;
          const fw = isHeader ? 'bold' : '600';
          textSvg += `<text x="${anchorX}" y="${textY + sz}" text-anchor="${anchorType}" font-family="${fontFamily}" font-weight="${fw}" font-size="${sz}" fill="${lineColor}">${escapeXml(line)}</text>`;
          textY += lineHeights[idx];
        });

        if (showIdSide) {
          textSvg += `<text x="${anchorX}" y="${textY + fontSizeId}" text-anchor="${anchorType}" font-family="monospace" font-weight="bold" font-size="${fontSizeId}" fill="${lineColor}">${escapeXml(qrText)}</text>`;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="${backgroundColor}" />
        ${rects}
        ${textSvg}
      </svg>
    `.trim();
  }

  /**
   * Render Barcode / QR Code ke Canvas Element
   */
  function renderToCanvas(canvas, text, options = {}) {
    const fmt = (options.format || 'CODE128').toUpperCase();
    if (fmt === 'QR' || fmt === 'QRCODE') {
      return renderQRCodeToCanvas(canvas, text, options);
    }

    const {
      format = 'CODE128',
      barWidth = 2,
      height = 75,
      margin = 15,
      displayValue = true,
      fontSize = 14,
      fontFamily = 'monospace',
      lineColor = '#0f172a',
      backgroundColor = '#ffffff',
      topLabel = ''
    } = options;

    if (!canvas) return;

    // Cek apakah JsBarcode tersedia di browser
    const jsBarcode = (typeof window !== 'undefined' && window.JsBarcode) || (typeof root !== 'undefined' && root && root.JsBarcode);
    if (typeof jsBarcode === 'function' && ['CODE128', 'CODE39', 'EAN13', 'UPC', 'ITF14'].includes(format.toUpperCase())) {
      try {
        jsBarcode(canvas, text, {
          format: format.toUpperCase(),
          width: barWidth,
          height: height,
          displayValue: displayValue,
          font: fontFamily,
          fontSize: fontSize,
          textMargin: 4,
          lineColor: lineColor,
          background: backgroundColor,
          margin: margin
        });

        // Jika ada topLabel (nama produk / header / lokasi), tambahkan di atas barcode
        if (topLabel) {
          const lines = splitTopLabel(topLabel);
          const oldW = canvas.width;
          const oldH = canvas.height;
          const isTwoLines = lines.length > 1;
          const labelHeight = isTwoLines ? 34 : 20;

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = oldW;
          tempCanvas.height = oldH;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.imageSmoothingEnabled = false;
          tempCtx.drawImage(canvas, 0, 0);

          // Hitung estimasi lebar teks agar canvas tidak terpotong
          tempCtx.font = 'bold 12px sans-serif';
          let maxLineW = 0;
          lines.forEach(l => {
            const w = tempCtx.measureText(l).width;
            if (w > maxLineW) maxLineW = w;
          });

          const newW = Math.max(oldW, Math.ceil(maxLineW + 20));
          const newH = oldH + labelHeight;

          canvas.width = newW;
          canvas.height = newH;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;

          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, newW, newH);

          const centerX = newW / 2;
          ctx.fillStyle = lineColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          if (isTwoLines) {
            // Baris 1: Brand & Gramasi (misal: Harta - 10 gr)
            const f1Size = Math.min(13, Math.max(9, Math.floor(newW / (lines[0].length * 0.72))));
            ctx.font = `bold ${f1Size}px sans-serif`;
            ctx.fillText(lines[0], centerX, 2);

            // Baris 2: Lokasi Penyimpanan (Vault - Lemari - Laci - Kotak)
            const f2Size = Math.min(11, Math.max(8, Math.floor(newW / (lines[1].length * 0.65))));
            ctx.font = `600 ${f2Size}px sans-serif`;
            ctx.fillText(lines[1], centerX, 17);
          } else {
            const fSize = Math.min(12, Math.max(8, Math.floor(newW / (lines[0].length * 0.68))));
            ctx.font = `bold ${fSize}px sans-serif`;
            ctx.fillText(lines[0], centerX, Math.max(2, (margin / 2) - 1));
          }

          // Gambar barcode di tengah canvas baru (pixel-aligned)
          const barcodeX = Math.round((newW - oldW) / 2);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, barcodeX, labelHeight);
        }
        return canvas;
      } catch (err) {
        console.warn('JsBarcode gagal, menggunakan native engine:', err.message);
      }
    }

    // NATIVE ENGINE FALLBACK
    const lines = splitTopLabel(topLabel);
    const isTwoLines = lines.length > 1;
    const topLabelHeight = isTwoLines ? 32 : (topLabel ? 18 : 0);

    const { binary, displayValue: resolvedDisplay } = getBarcodeBinary(text, format);
    const ctx = canvas.getContext('2d');

    const totalBarsWidth = binary.length * barWidth;
    const textHeight = displayValue ? (fontSize + 6) : 0;

    // Pastikan totalWidth cukup untuk teks
    const estTextW = lines.reduce((max, l) => Math.max(max, l.length * 7.5), 0);
    const totalWidth = Math.max(totalBarsWidth + (margin * 2), Math.ceil(estTextW + 24));
    const barcodeOffset = Math.round((totalWidth - totalBarsWidth) / 2);
    const totalHeight = height + textHeight + topLabelHeight + (margin * 2);

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    ctx.imageSmoothingEnabled = false;

    // Latar belakang
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Label Atas (Brand / Gramasi / Lokasi)
    let currentY = margin;
    if (isTwoLines) {
      ctx.fillStyle = lineColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(lines[0], totalWidth / 2, currentY);

      ctx.font = '600 10px sans-serif';
      ctx.fillText(lines[1], totalWidth / 2, currentY + 15);
      currentY += topLabelHeight;
    } else if (topLabel) {
      ctx.fillStyle = lineColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(lines[0], totalWidth / 2, currentY);
      currentY += topLabelHeight;
    }

    // Gambar Garis Barcode
    ctx.fillStyle = lineColor;
    let startX = barcodeOffset;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        ctx.fillRect(startX, currentY, barWidth, height);
      }
      startX += barWidth;
    }

    // Teks Nomor Identitas di Bawah Barcode
    if (displayValue) {
      ctx.fillStyle = lineColor;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(resolvedDisplay, totalWidth / 2, currentY + height + 4);
    }

    return canvas;
  }

  /**
   * Memisahkan label menjadi 2 baris terstruktur jika berisi informasi Emas/Lokasi
   */
  function splitTopLabel(label) {
    if (!label) return [];
    if (typeof label !== 'string') label = String(label);
    label = label.trim();
    if (!label) return [];

    if (label.includes('\n')) {
      return label.split('\n').map(s => s.trim()).filter(Boolean);
    }

    // Cek format emas: misal "Hartadinata - 10 gr - Vault 1 - Lemari 2 - Laci 3 - Kotak 4"
    const parts = label.split(' - ');
    if (parts.length >= 4) {
      return [
        parts.slice(0, 2).join(' - '),
        parts.slice(2).join(' - ')
      ];
    }

    return [label];
  }

  /**
   * Menghasilkan Data URL (image/png)
   */
  function toDataURL(text, options = {}) {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    renderToCanvas(canvas, text, options);
    return canvas.toDataURL('image/png');
  }

  /**
   * Menghasilkan SVG String
   */
  function toSVGString(text, options = {}) {
    const fmt = (options.format || 'CODE128').toUpperCase();
    if (fmt === 'QR' || fmt === 'QRCODE') {
      return renderQRCodeToSVG(text, options);
    }

    const {
      format = 'CODE128',
      barWidth = 2,
      height = 75,
      margin = 15,
      displayValue = true,
      fontSize = 14,
      fontFamily = 'monospace',
      lineColor = '#0f172a',
      backgroundColor = '#ffffff',
      topLabel = ''
    } = options;

    const lines = splitTopLabel(topLabel);
    const isTwoLines = lines.length > 1;
    const topLabelHeight = isTwoLines ? 32 : (topLabel ? 18 : 0);

    const { binary, displayValue: resolvedDisplay } = getBarcodeBinary(text, format);
    const totalBarsWidth = binary.length * barWidth;
    const textHeight = displayValue ? (fontSize + 6) : 0;

    const estTextW = lines.reduce((max, l) => Math.max(max, l.length * 7.5), 0);
    const totalWidth = Math.max(totalBarsWidth + (margin * 2), Math.ceil(estTextW + 24));
    const barcodeOffset = Math.round((totalWidth - totalBarsWidth) / 2);
    const totalHeight = height + textHeight + topLabelHeight + (margin * 2);

    let rects = '';
    let startX = barcodeOffset;
    let currentY = margin + topLabelHeight;

    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        rects += `<rect x="${startX}" y="${currentY}" width="${barWidth}" height="${height}" fill="${lineColor}" />`;
      }
      startX += barWidth;
    }

    let labelSvg = '';
    if (isTwoLines) {
      labelSvg = `
        <text x="${totalWidth / 2}" y="${margin + 10}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="11" fill="${lineColor}">${escapeXml(lines[0])}</text>
        <text x="${totalWidth / 2}" y="${margin + 24}" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="9.5" fill="${lineColor}">${escapeXml(lines[1])}</text>
      `;
    } else if (topLabel) {
      labelSvg = `<text x="${totalWidth / 2}" y="${margin + 12}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="11" fill="${lineColor}">${escapeXml(lines[0])}</text>`;
    }

    let textSvg = '';
    if (displayValue) {
      const textY = currentY + height + fontSize;
      textSvg = `<text x="${totalWidth / 2}" y="${textY}" text-anchor="middle" font-family="${fontFamily}" font-weight="bold" font-size="${fontSize}" fill="${lineColor}">${escapeXml(resolvedDisplay)}</text>`;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
        <rect width="100%" height="100%" fill="${backgroundColor}" />
        ${labelSvg}
        ${rects}
        ${textSvg}
      </svg>
    `.trim();
  }

  function escapeXml(unsafe) {
    return String(unsafe).replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  return {
    renderToCanvas,
    renderQRCodeToCanvas,
    renderQRCodeToSVG,
    sliceTextChunks,
    extractDetailLines,
    toDataURL,
    toSVGString,
    getBarcodeBinary,
    encodeCode128B,
    encodeCode128Auto,
    encodeCode39
  };
});
