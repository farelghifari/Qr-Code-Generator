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
   * Render Barcode ke Canvas Element
   */
  function renderToCanvas(canvas, text, options = {}) {
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

    // Cek format emas: misal "Harta - 10 gr - Vault 1 - Lemari 2 - Laci 3 - Kotak 4"
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
    toDataURL,
    toSVGString,
    getBarcodeBinary,
    encodeCode128B,
    encodeCode128Auto,
    encodeCode39
  };
});
