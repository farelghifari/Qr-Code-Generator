/**
 * BarCodeID Studio - Multi-Sheet Logam Mulia Layout Module
 * Mengelola parsing Excel 6-sheet, pemetaan grup Antam & Hartadinata,
 * alur sekuensial sel antar lembar, perhitungan kapasitas 48 label (3x16),
 * dan pengaturan warna per grup.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MultiSheetLayout = factory();
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  // 1. Konfigurasi Grid & Lembar Cetak
  const MULTI_SHEET_CONFIG = {
    COLS: 3,
    ROWS: 16,
    PER_SHEET: 48,
    paperWidthMm: 165,
    paperHeightMm: 210,
    topMarginMm: 2,
    bottomMarginMm: 2,
    leftMarginMm: 4,
    rightMarginMm: 4,
    colGapMm: 3,
    rowGapMm: 2,
    includeHeaderCell: true
  };

  // 2. Daftar 6 Grup Terurut Baku (Urutan Tetap Output Cetak)
  const ORDERED_GROUPS = [
    { key: 'antam_1g', brand: 'Antam', gramasi: '1 gr', title: '1 gram Antam', defaultColor: '#DC2626' },
    { key: 'antam_5g', brand: 'Antam', gramasi: '5 gr', title: '5 gram Antam', defaultColor: '#EA580C' },
    { key: 'antam_10g', brand: 'Antam', gramasi: '10 gr', title: '10 gram Antam', defaultColor: '#7C3AED' },
    { key: 'harta_1g', brand: 'Hartadinata', gramasi: '1 gr', title: '1 gram Harta', defaultColor: '#2563EB' },
    { key: 'harta_5g', brand: 'Hartadinata', gramasi: '5 gr', title: '5 gram Harta', defaultColor: '#0891B2' },
    { key: 'harta_10g', brand: 'Hartadinata', gramasi: '10 gr', title: '10 gram Harta', defaultColor: '#16A34A' }
  ];

  // 3. Objek Warna Default Per Grup
  const DEFAULT_GROUP_COLORS = {
    'antam_1g': '#DC2626', // merah
    'harta_1g': '#2563EB', // biru
    'antam_5g': '#EA580C', // oranye
    'harta_5g': '#0891B2', // cyan / biru muda
    'antam_10g': '#7C3AED', // ungu
    'harta_10g': '#16A34A'  // hijau
  };

  /**
   * Helper: Menghitung ukuran sel (lebar x tinggi label) dari area kertas
   */
  function calculateCellDimensions(config = MULTI_SHEET_CONFIG) {
    const cols = config.COLS || 3;
    const rows = config.ROWS || 16;
    const paperW = config.paperWidthMm || 165;
    const paperH = config.paperHeightMm || 210;
    const topM = config.topMarginMm !== undefined ? config.topMarginMm : 2;
    const bottomM = config.bottomMarginMm !== undefined ? config.bottomMarginMm : 2;
    const leftM = config.leftMarginMm !== undefined ? config.leftMarginMm : 4;
    const rightM = config.rightMarginMm !== undefined ? config.rightMarginMm : 4;
    const colGap = config.colGapMm !== undefined ? config.colGapMm : 3;
    const rowGap = config.rowGapMm !== undefined ? config.rowGapMm : 2;

    const availW = paperW - (leftM + rightM) - ((cols - 1) * colGap);
    const availH = paperH - (topM + bottomM) - ((rows - 1) * rowGap);

    const labelWidthMm = Math.max(10, Math.round((availW / cols) * 10) / 10);
    const labelHeightMm = Math.max(5, Math.round((availH / rows) * 10) / 10);

    return { labelWidthMm, labelHeightMm };
  }

  /**
   * Helper: Memetakan nama sheet Excel ke salah satu grup canonical.
   * Toleran terhadap variasi huruf besar/kecil, spasi, underscore, tanda hubung, "gr", "gram", "g".
   * Jika tidak ada yang cocok, fallback ke indeks sheet (0..5).
   */
  function matchSheetToGroup(sheetName, sheetIndex = null) {
    if (typeof sheetName === 'string' && sheetName.trim()) {
      const raw = sheetName.toLowerCase().trim();
      // Ganti underscore, dash, titik dengan spasi tunggal
      const clean = raw.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

      let brand = null;
      if (clean.includes('antam') || clean.includes('butik')) {
        brand = 'Antam';
      } else if (clean.includes('harta') || clean.includes('hartadinata')) {
        brand = 'Hartadinata';
      }

      let gramasi = null;
      // Periksa 10 terlebih dahulu agar tidak keliru dengan 1
      if (/\b10\s*(?:gram|gr|g)?\b/.test(clean) || clean.includes('10g') || clean.includes('10 gr') || clean.includes('10gram') || clean.includes('10')) {
        gramasi = '10 gr';
      } else if (/\b5\s*(?:gram|gr|g)?\b/.test(clean) || clean.includes('5g') || clean.includes('5 gr') || clean.includes('5gram') || clean.includes('5')) {
        gramasi = '5 gr';
      } else if (/\b1\s*(?:gram|gr|g)?\b/.test(clean) || clean.includes('1g') || clean.includes('1 gr') || clean.includes('1gram') || clean.includes('1')) {
        gramasi = '1 gr';
      }

      if (brand && gramasi) {
        if (brand === 'Antam' && gramasi === '1 gr') return 'antam_1g';
        if (brand === 'Antam' && gramasi === '5 gr') return 'antam_5g';
        if (brand === 'Antam' && gramasi === '10 gr') return 'antam_10g';
        if (brand === 'Hartadinata' && gramasi === '1 gr') return 'harta_1g';
        if (brand === 'Hartadinata' && gramasi === '5 gr') return 'harta_5g';
        if (brand === 'Hartadinata' && gramasi === '10 gr') return 'harta_10g';
      }
    }

    // Fallback ke urutan indeks sheet (0..5)
    if (typeof sheetIndex === 'number' && sheetIndex >= 0 && sheetIndex < ORDERED_GROUPS.length) {
      return ORDERED_GROUPS[sheetIndex].key;
    }

    return null;
  }

  /**
   * Helper: Mengekstraksi daftar ID dari worksheet (raw matrix 2D)
   * Mencari kolom ID ("Nomor ID", "ID", "Nomor Barcode", "Barcode", "ID Number"),
   * atau default ke kolom pertama jika tidak ada header.
   */
  function extractIdsFromMatrix(rawMatrix) {
    if (!Array.isArray(rawMatrix) || rawMatrix.length === 0) {
      return { ids: [], warnings: [] };
    }

    // Filter baris kosong sama sekali
    const nonEmptyRows = rawMatrix.filter(row => 
      Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
    );

    if (nonEmptyRows.length === 0) {
      return { ids: [], warnings: [] };
    }

    const firstRow = nonEmptyRows[0];
    let idColIdx = 0;
    let hasHeader = false;

    // Cek apakah baris pertama adalah header
    for (let c = 0; c < firstRow.length; c++) {
      const cellVal = String(firstRow[c] || '').toLowerCase().trim();
      if (
        cellVal === 'nomor id' || cellVal === 'no id' || cellVal === 'id' ||
        cellVal === 'id number' || cellVal === 'id_number' || cellVal === 'nomor barcode' ||
        cellVal === 'no barcode' || cellVal === 'barcode' || cellVal === 'barcode number' ||
        cellVal.includes('nomor id') || cellVal.includes('id number')
      ) {
        idColIdx = c;
        hasHeader = true;
        break;
      }
    }

    // Jika belum ketemu tapi baris pertama berisi kata umum header
    if (!hasHeader) {
      const firstCell = String(firstRow[0] || '').toLowerCase().trim();
      if (firstCell.includes('id') || firstCell.includes('kode') || firstCell.includes('nomor') || firstCell.includes('barcode')) {
        hasHeader = true;
        idColIdx = 0;
      }
    }

    const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;
    const rawIds = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const val = row[idColIdx] !== undefined && row[idColIdx] !== null ? String(row[idColIdx]).trim() : '';
      if (val) {
        rawIds.push(val);
      }
    }

    return { ids: rawIds, warnings: [] };
  }

  /**
   * Memproses seluruh Workbook Excel Multi-Sheet
   * @param {Object} workbook - Objek workbook XLSX (dari XLSX.read)
   * @param {Object} options - Opsi konfigurasi (colors, includeHeaderCell, perSheet)
   */
  function processMultiSheetWorkbook(workbook, options = {}) {
    const config = { ...MULTI_SHEET_CONFIG, ...options };
    const customColors = options.colors || {};
    const includeHeaderCell = options.includeHeaderCell !== undefined ? Boolean(options.includeHeaderCell) : true;
    const perSheet = config.PER_SHEET || 48;

    const groupColors = { ...DEFAULT_GROUP_COLORS, ...customColors };

    const warnings = [];
    const duplicates = [];
    const seenIdsGlobal = new Set();

    // Siapkan tempat penampung per grup terurut
    const groupsMap = {};
    ORDERED_GROUPS.forEach(g => {
      groupsMap[g.key] = {
        key: g.key,
        brand: g.brand,
        gramasi: g.gramasi,
        title: g.title,
        color: groupColors[g.key] || g.defaultColor,
        sheetName: null,
        ids: [],
        rawCount: 0
      };
    });

    if (!workbook || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      return {
        success: false,
        error: 'File Excel tidak memiliki sheet yang valid.',
        warnings: ['File Excel kosong atau rusak.']
      };
    }

    const assignedSheetNames = new Set();

    // 1. Petakan sheet berdasarkan nama atau index
    workbook.SheetNames.forEach((sheetName, idx) => {
      const matchedKey = matchSheetToGroup(sheetName, idx);
      if (!matchedKey || !groupsMap[matchedKey]) {
        warnings.push(`Sheet "${sheetName}" (indeks ${idx}) tidak dapat dipetakan ke grup logam mulia dan dilewati.`);
        return;
      }

      const targetGroup = groupsMap[matchedKey];
      if (targetGroup.sheetName && targetGroup.sheetName !== sheetName) {
        warnings.push(`Sheet "${sheetName}" menggantikan "${targetGroup.sheetName}" untuk grup ${targetGroup.title}.`);
      }
      targetGroup.sheetName = sheetName;
      assignedSheetNames.add(sheetName);

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        warnings.push(`Sheet "${sheetName}" kosong atau tidak dapat dibaca.`);
        return;
      }

      // Ambil matrix 2D data
      const XLSXLib = (typeof XLSX !== 'undefined') ? XLSX : (typeof require === 'function' ? (function(){ try { return require('./xlsx.full.min.js'); } catch(e){ return null; } })() : null);
      if (!XLSXLib) {
        throw new Error('Library XLSX tidak ditemukan.');
      }

      const rawMatrix = XLSXLib.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      const { ids: sheetIds } = extractIdsFromMatrix(rawMatrix);
      targetGroup.rawCount += sheetIds.length;

      // Filter duplikat global dan dalam sheet
      sheetIds.forEach(id => {
        if (seenIdsGlobal.has(id)) {
          duplicates.push({ id, sheet: sheetName, group: targetGroup.title });
        } else {
          seenIdsGlobal.add(id);
          targetGroup.ids.push(id);
        }
      });
    });

    // Peringatan jika ada sheet yang belum terisi
    ORDERED_GROUPS.forEach(g => {
      const groupData = groupsMap[g.key];
      if (!groupData.sheetName || groupData.ids.length === 0) {
        warnings.push(`Grup "${g.title}" kosong atau tidak ditemukan sheet-nya di file Excel (dilewati).`);
      }
    });

    if (duplicates.length > 0) {
      warnings.push(`Ditemukan ${duplicates.length} nomor ID duplikat yang telah dihilangkan secara otomatis.`);
    }

    // 2. Susun sel berurutan mengalir menyambung (header cell + ID cells)
    const sequentialCells = [];
    const groupSummaries = [];

    ORDERED_GROUPS.forEach(g => {
      const groupData = groupsMap[g.key];
      const count = groupData.ids.length;

      groupSummaries.push({
        key: g.key,
        brand: g.brand,
        gramasi: g.gramasi,
        title: g.title,
        color: groupData.color,
        sheetName: groupData.sheetName || '-',
        idCount: count,
        hasHeaderCell: includeHeaderCell && count > 0
      });

      // Jika grup ini memiliki data ID
      if (count > 0) {
        // Tambahkan 1 sel Label Judul Grup (jika toggle includeHeaderCell aktif)
        if (includeHeaderCell) {
          sequentialCells.push({
            cellType: 'header',
            isHeader: true,
            id: '',
            title: g.title,
            label: g.title,
            group: `${g.brand} ${g.gramasi}`,
            groupKey: g.key,
            color: groupData.color,
            brand: g.brand,
            gramasi: g.gramasi,
            status: 'pending'
          });
        }

        // Tambahkan semua sel ID milik grup ini
        groupData.ids.forEach(id => {
          sequentialCells.push({
            cellType: 'id',
            isHeader: false,
            id: id,
            label: g.title,
            group: `${g.brand} ${g.gramasi}`,
            groupKey: g.key,
            groupColor: groupData.color,
            color: '#000000',
            brand: g.brand,
            gramasi: g.gramasi,
            status: 'pending'
          });
        });
      }
    });

    const totalIds = seenIdsGlobal.size;
    const totalCells = sequentialCells.length;
    const totalSheets = Math.max(1, Math.ceil(totalCells / perSheet));
    const totalCapacity = totalSheets * perSheet;
    const emptyCellsLastSheet = totalCells === 0 ? perSheet : (totalCapacity - totalCells);

    // 3. Chunk per lembar (48 sel)
    const pages = [];
    for (let s = 0; s < totalSheets; s++) {
      const start = s * perSheet;
      const end = Math.min(start + perSheet, totalCells);
      pages.push(sequentialCells.slice(start, end));
    }

    return {
      success: true,
      config,
      groupColors,
      groupSummaries,
      totalIds,
      totalCells,
      totalSheets,
      perSheet,
      emptyCellsLastSheet,
      warnings,
      duplicates,
      cells: sequentialCells,
      pages
    };
  }

  return {
    CONFIG: MULTI_SHEET_CONFIG,
    ORDERED_GROUPS,
    DEFAULT_GROUP_COLORS,
    calculateCellDimensions,
    matchSheetToGroup,
    extractIdsFromMatrix,
    processMultiSheetWorkbook
  };
});
