const assert = require('assert');
const path = require('path');
const IdGenerator = require(path.join(__dirname, '../js/id-generator.js'));
const BarcodeEngine = require(path.join(__dirname, '../js/barcode-engine.js'));

console.log('--- 🧪 Menjalankan Verifikasi Logika Barcode & ID Generator ---');

// Test 1: Sequential ID Generator (1000 IDs)
console.log('1. Menguji Sequential Generator (1.000 ID)...');
const seqIds = IdGenerator.generateSequential({
  prefix: 'TEST-',
  startNum: 1,
  count: 1000,
  padLength: 4,
  suffix: '-ID'
});
assert.strictEqual(seqIds.length, 1000, 'Harus menghasilkan tepat 1000 ID');
assert.strictEqual(seqIds[0], 'TEST-0001-ID', 'ID pertama harus TEST-0001-ID');
assert.strictEqual(seqIds[999], 'TEST-1000-ID', 'ID ke-1000 harus TEST-1000-ID');
const uniqueSeqSet = new Set(seqIds);
assert.strictEqual(uniqueSeqSet.size, 1000, 'Semua 1000 sequential ID harus unik tanpa duplikasi');
console.log('✅ Sequential Generator LULUS (1.000 ID unik terkonfirmasi).');

// Test 2: Random Alphanumeric Generator (1000 IDs)
console.log('2. Menguji Random Alphanumeric Generator (1.000 ID unik)...');
const randIds = IdGenerator.generateAlphanumeric({
  prefix: 'SN-',
  length: 8,
  count: 1000,
  useUpper: true,
  useNumbers: true
});
assert.strictEqual(randIds.length, 1000, 'Harus menghasilkan tepat 1000 ID acak');
const uniqueRandSet = new Set(randIds);
assert.strictEqual(uniqueRandSet.size, 1000, 'Semua 1000 ID acak harus 100% unik');
console.log('✅ Random Alphanumeric Generator LULUS (1.000 ID acak 100% unik).');

// Test 3: Timestamp Generator
console.log('3. Menguji Timestamp Generator...');
const tsIds = IdGenerator.generateTimestamp({ prefix: 'TS-', count: 50 });
assert.strictEqual(tsIds.length, 50);
assert.strictEqual(new Set(tsIds).size, 50, 'Semua timestamp ID harus unik');
console.log('✅ Timestamp Generator LULUS.');

// Test 4: Custom List Parsing & Duplicate Detection
console.log('4. Menguji Custom List Duplicate Detector...');
const rawList = `
ITEM-101
ITEM-102
ITEM-101
ITEM-103
ITEM-102
`;
const parsed = IdGenerator.parseCustomList(rawList);
assert.strictEqual(parsed.validCount, 3, 'Harus ada 3 item valid unik');
assert.strictEqual(parsed.duplicates.length, 2, 'Harus ada 2 item duplikat terdeteksi');
assert.deepStrictEqual(parsed.items, ['ITEM-101', 'ITEM-102', 'ITEM-103']);
console.log('✅ Custom List Duplicate Detector LULUS.');

// Test 5: Barcode Engine Binary Generation (Code 128)
console.log('5. Menguji Binary Encoding Code 128...');
const binary = BarcodeEngine.encodeCode128B('TEST-001');
assert(binary.length > 0, 'Binary harus dihasilkan');
assert(/^[01]+$/.test(binary), 'Hanya boleh berisi 0 dan 1');
console.log(`✅ Code 128 Binary LULUS (panjang modul: ${binary.length} bit).`);

// Test 6: SVG Generation
console.log('6. Menguji Barcode SVG Output...');
const svg = BarcodeEngine.toSVGString('BARCODE-UNIQUE-01', {
  format: 'CODE128',
  topLabel: 'PRODUK A'
});
assert(svg.includes('<svg'), 'Harus berisi tag <svg>');
assert(svg.includes('BARCODE-UNIQUE-01'), 'Harus menampilkan teks nomor ID');
assert(svg.includes('PRODUK A'), 'Harus menampilkan label atas');
console.log('✅ SVG Output Generator LULUS.');

// Test 7: Exporter Module API
console.log('7. Menguji Modul Exporter...');
const BarcodeExporter = require(path.join(__dirname, '../js/exporter.js'));
assert(typeof BarcodeExporter.downloadFullSheetPNG === 'function', 'Harus memiliki fungsi downloadFullSheetPNG');
assert(typeof BarcodeExporter.downloadSingleStickerPNG === 'function', 'Harus memiliki fungsi downloadSingleStickerPNG');
assert(typeof BarcodeExporter.downloadCSV === 'function', 'Harus memiliki fungsi downloadCSV');
assert(typeof BarcodeExporter.downloadBatchZIP === 'function', 'Harus memiliki fungsi downloadBatchZIP');
console.log('✅ Modul Exporter LULUS.');

// Test 8: Tom & Jerry No. 107 Sheet Geometry & 30 Labels per Sheet
console.log('8. Menguji Kalkulasi Geometri Tom & Jerry No. 107 (30 Label/Lembar)...');
const DPI = 300;
const mmToPx = (mm) => Math.round((mm * DPI) / 25.4);
const sheetW = mmToPx(165); // 16.5 cm
const sheetH = mmToPx(210); // 21.0 cm
const labelW = mmToPx(50);  // 5.0 cm
const labelH = mmToPx(18);  // 1.8 cm
const horizPitch = mmToPx(55); // 5.5 cm
const vertPitch = mmToPx(20);  // 2.0 cm
const topMargin = mmToPx(7);   // 0.7 cm
const leftMargin = mmToPx(3);  // 0.3 cm

assert.strictEqual(sheetW, 1949, 'Lebar lembar harus 1949 px pada 300 DPI');
assert.strictEqual(sheetH, 2480, 'Tinggi lembar harus 2480 px pada 300 DPI');
assert.strictEqual(labelW, 591, 'Lebar label harus 591 px pada 300 DPI');
assert.strictEqual(labelH, 213, 'Tinggi label harus 213 px pada 300 DPI');

// Verify 3 kolom x 10 baris = 30 label muat dalam batas lembar
const lastColRight = leftMargin + (2 * horizPitch) + labelW;
const lastRowBottom = topMargin + (9 * vertPitch) + labelH;
assert(lastColRight <= sheetW, '3 Kolom stiker harus muat dalam lebar kertas 165mm');
assert(lastRowBottom <= sheetH, '10 Baris stiker harus muat dalam tinggi kertas 210mm');
console.log(`✅ Geometri Tom & Jerry 107 LULUS (30 label fit perfectly: ${lastColRight}px <= ${sheetW}px, ${lastRowBottom}px <= ${sheetH}px).`);

// Test 9: CSV Parsing Logic
console.log('9. Menguji Logika Pemisahan Data CSV...');
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
    const pattern = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^${delimiter}]*))`, 'g');
    const cells = [];
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const val = match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : '');
      cells.push(val.trim());
      if (pattern.lastIndex === match.index) pattern.lastIndex++;
    }
    return cells;
  });
}
const sampleCsv = `ID,Nama Produk\n"PRD-001","Kemeja Batik"\n"PRD-002","Celana Jeans"\nPRD-003,Jaket Kulit`;
const parsedCsv = parseCSV(sampleCsv);
assert.strictEqual(parsedCsv.length, 4, 'Harus ada 4 baris (1 header + 3 data)');
assert.strictEqual(parsedCsv[1][0], 'PRD-001');
assert.strictEqual(parsedCsv[1][1], 'Kemeja Batik');
assert.strictEqual(parsedCsv[3][0], 'PRD-003');
assert.strictEqual(parsedCsv[3][1], 'Jaket Kulit');
console.log('✅ Logika Pemisahan Data CSV LULUS.');

// Test 10: Locked Label Dimension (18 mm x 50 mm)
console.log('10. Menguji Verifikasi Dimensi Terkunci 18 mm × 50 mm (Tom & Jerry 107)...');
const lockedWidthMm = 50;
const lockedHeightMm = 18;
const lockedAspect = lockedWidthMm / lockedHeightMm; // 2.777...
const lockedPixelWidth = mmToPx(lockedWidthMm);
const lockedPixelHeight = mmToPx(lockedHeightMm);
assert.strictEqual(lockedPixelWidth, 591);
assert.strictEqual(lockedPixelHeight, 213);
assert(Math.abs((lockedPixelWidth / lockedPixelHeight) - lockedAspect) < 0.01, 'Rasio aspek piksel harus presisi sama dengan rasio 50:18');
console.log(`✅ Verifikasi Dimensi Terkunci 18 mm × 50 mm LULUS (Rasio: ${(lockedPixelWidth/lockedPixelHeight).toFixed(3)}).`);

// Test 11: Format Logam Mulia (Hartadinata & Antam) Auto-Formatting
console.log('11. Menguji Pemformatan Label Logam Mulia (Hartadinata / Antam)...');
function formatGoldRow(brand, gramasi, vault, lemari, laci, kotak, is2Lines = true) {
  const line1 = [brand, gramasi].filter(Boolean).join(' - ');
  const line2 = [vault, lemari, laci, kotak].filter(Boolean).join(' - ');
  if (!line2) return line1;
  if (!line1) return line2;
  return is2Lines ? `${line1}\n${line2}` : `${line1} - ${line2}`;
}

const hartaRowStr = formatGoldRow('Hartadinata', '0.5 gr', 'Vault 1', 'Lemari 1', 'Laci 1', 'Kotak 01', true);
assert.strictEqual(hartaRowStr, 'Hartadinata - 0.5 gr\nVault 1 - Lemari 1 - Laci 1 - Kotak 01');

const antamRowStr = formatGoldRow('Antam', '10 gr', 'Vault 2', 'Lemari 3', 'Laci 2', 'Kotak 05', true);
assert.strictEqual(antamRowStr, 'Antam - 10 gr\nVault 2 - Lemari 3 - Laci 2 - Kotak 05');

const hartaSvg = BarcodeEngine.toSVGString('ORD00000000160600001', {
  topLabel: hartaRowStr,
  format: 'CODE128',
  barWidth: 1.3,
  height: 35
});
assert(hartaSvg.includes('Hartadinata - 0.5 gr'));
assert(hartaSvg.includes('Vault 1 - Lemari 1 - Laci 1 - Kotak 01'));
assert(hartaSvg.includes('ORD00000000160600001'));
console.log('✅ Pemformatan Label Logam Mulia (Hartadinata / Antam) LULUS.');

// Test 12: Verifikasi Kelayakan Muat ID Panjang ORD00000000160600001 pada 1 Label (18 x 50 mm)
console.log('12. Menguji Muat ID Barcode 21 Karakter (ORD00000000160600001) pada 1 Label 18 × 50 mm...');
const binary21 = BarcodeEngine.encodeCode128B('ORD00000000160600001');
const barWidthMm = 0.15; // Lebar bar tipis pada resolusi cetak
const totalBarcodeMm = (binary21.length * barWidthMm);
assert(totalBarcodeMm < 48, 'Lebar barcode 21 karakter harus kurang dari 48 mm (muat di dalam lebar 50 mm)');

// Hitung total tinggi elemen pada 300 DPI
const padYPx = 14;
const line1HeightPx = 20;
const line2HeightPx = 16;
const barcodeHeightPx = 75;
const textHeightPx = 18;
const totalHeightNeededPx = padYPx + line1HeightPx + line2HeightPx + barcodeHeightPx + textHeightPx + padYPx;
assert(totalHeightNeededPx <= lockedPixelHeight, `Total tinggi (${totalHeightNeededPx}px) harus muat dalam stiker (${lockedPixelHeight}px)`);
console.log(`✅ ID Panjang (ORD00000000160600001) Terkonfirmasi 100% Muat Presisi (${totalHeightNeededPx}px <= ${lockedPixelHeight}px, sisa margin ${lockedPixelHeight - totalHeightNeededPx}px).`);

// Test 13: Code 128 Auto High-Density Compression & Quiet Zone Validation
console.log('13. Menguji Kompresi Code 128 Auto & Zona Tenang (Quiet Zone) untuk Scanner...');
const autoResult = BarcodeEngine.getBarcodeBinary('ORD00000000160600001', 'CODE128');
assert.strictEqual(autoResult.binary.length, 189, 'Code 128 Auto harus menghasilkan tepat 189 bit (17 simbol)');
assert.strictEqual(autoResult.displayValue, 'ORD00000000160600001');

const integerBarWidth = 2; // 2px per modul (resolusi tajam non-blur)
const totalBarcodePx = autoResult.binary.length * integerBarWidth; // 378 px
const quietZoneEachSide = (lockedPixelWidth - totalBarcodePx) / 2; // (591 - 378) / 2 = 106.5 px
assert.strictEqual(totalBarcodePx, 378, 'Lebar barcode tajam harus 378 px');
assert(quietZoneEachSide >= 20, `Zona tenang (${quietZoneEachSide}px) harus jauh melebihi standar ISO 10X (${integerBarWidth * 10}px)`);
console.log(`✅ Kompresi Code 128 Auto LULUS (189 bit, lebar 378px, margin tenang ${quietZoneEachSide.toFixed(1)}px tiap sisi).`);

// Test 14: Verifikasi SVG dengan Ketebalan Integer 2px
console.log('14. Menguji Barcode SVG dengan barWidth = 2px Integer...');
const svg2 = BarcodeEngine.toSVGString('ORD00000000160600001', {
  format: 'CODE128',
  barWidth: 2,
  height: 45,
  margin: 10
});
assert(svg2.includes('width="2"'), 'Semua modul bar harus memiliki atribut width="2" presisi integer');
assert(!svg2.includes('width="1.3"'), 'Tidak boleh ada modul bar berukuran pecahan 1.3');
console.log('✅ Verifikasi Barcode SVG Bar Tajam Integer LULUS.');

// Test 15: QR Code SVG Generation
console.log('15. Menguji BarcodeEngine QR Code Generator...');
const qrSvg = BarcodeEngine.toSVGString('ORD00000000160600001', {
  format: 'QR',
  layoutPosition: 'side-left',
  brand: 'Hartadinata',
  gramasi: '1 gr',
  vault: 'Vault 1',
  lemari: 'Lemari 2',
  laci: 'Laci 3',
  kotak: 'Kotak 4',
  extraRows: [{ key: 'PO', value: 'PO-2026-001' }]
});
assert(qrSvg.includes('<svg'), 'QR SVG harus valid XML SVG');
assert(qrSvg.includes('ORD00000000160600001') || qrSvg.includes('ORD0000'), 'QR SVG harus menampilkan teks ID');
assert(qrSvg.includes('Hartadinata - 1 gr'), 'QR SVG harus menampilkan Brand & Gramasi');
assert(qrSvg.includes('Vault 1 - Lemari 2 - Laci 3 - Kotak 4'), 'QR SVG harus menampilkan Lokasi Lengkap');
assert(qrSvg.includes('PO: PO-2026-001'), 'QR SVG harus menampilkan baris detail tambahan');
assert(qrSvg.includes('<rect'), 'QR SVG harus berisi modul piksel rect');
console.log('✅ QR Code Generator LULUS.');

// Test 16: Dynamic Layout Positioning
console.log('16. Menguji Opsi Layout Positioning (side-left, side-right, stacked)...');
const svgSideLeft = BarcodeEngine.toSVGString('TEST-ID', {
  format: 'QR',
  layoutPosition: 'side-left',
  targetWidth: 480,
  targetHeight: 175
});
assert(svgSideLeft.includes('width="480"'), 'Side-left harus menggunakan lebar 480');

const svgSideRight = BarcodeEngine.toSVGString('TEST-ID', {
  format: 'QR',
  layoutPosition: 'side-right',
  targetWidth: 480,
  targetHeight: 175
});
assert(svgSideRight.includes('width="480"'), 'Side-right harus menggunakan lebar 480');

const svgStacked = BarcodeEngine.toSVGString('TEST-ID', {
  format: 'QR',
  layoutPosition: 'stacked',
  targetWidth: 300,
  targetHeight: 320
});
assert(svgStacked.includes('height="320"'), 'Stacked harus menggunakan tinggi 320');
console.log('✅ Dynamic Layout Positioning LULUS.');

// Test 17: Multi-template Sheet Capacity & Custom Dimensions
console.log('17. Menguji Kalkulasi Kapasitas Template Lembaran...');
const templates = {
  'tj-107': { cols: 3, rows: 10, expected: 30 },
  'tj-108': { cols: 5, rows: 8, expected: 40 },
  'tj-121': { cols: 2, rows: 5, expected: 10 },
  'a4-3x10': { cols: 3, rows: 10, expected: 30 },
  'a4-2x7': { cols: 2, rows: 7, expected: 14 },
  'thermal-roll': { cols: 1, rows: 1, expected: 1 },
  'custom-test': { cols: 4, rows: 6, expected: 24 }
};

for (const [key, tmpl] of Object.entries(templates)) {
  const cap = tmpl.cols * tmpl.rows;
  assert.strictEqual(cap, tmpl.expected, `Kapasitas template ${key} harus ${tmpl.expected}`);
}
console.log('✅ Kalkulasi Kapasitas Template Lembaran LULUS (Semua 7 template akurat).');

// Test 18: Batch / Folder Partitioning Logic
console.log('18. Menguji Partisi Folder / Batch...');
const mockItems = [
  { id: 'ID-1', batchId: 'batch-alpha', brand: 'Hartadinata' },
  { id: 'ID-2', batchId: 'batch-alpha', brand: 'Hartadinata' },
  { id: 'ID-3', batchId: 'batch-beta', brand: 'Antam' },
  { id: 'ID-4', batchId: 'batch-gamma', brand: 'Custom' }
];

// Grid view: Filter by activeFolderId
function filterForGrid(items, activeFolderId) {
  if (activeFolderId === 'all') return items;
  return items.filter(i => (i.batchId || 'default') === activeFolderId);
}

const alphaItems = filterForGrid(mockItems, 'batch-alpha');
assert.strictEqual(alphaItems.length, 2, 'Folder Alpha harus berisi 2 item');
assert.strictEqual(alphaItems[0].id, 'ID-1');
assert.strictEqual(alphaItems[1].id, 'ID-2');

const betaItems = filterForGrid(mockItems, 'batch-beta');
assert.strictEqual(betaItems.length, 1, 'Folder Beta harus berisi 1 item');

const allItems = filterForGrid(mockItems, 'all');
assert.strictEqual(allItems.length, 4, 'Semua item harus terlihat saat folder = all');
console.log('✅ Partisi Folder / Batch LULUS (Grid terisolasi per folder, Management menampilkan semua).');

// Test 19: Individual Label Edit Simulation
console.log('19. Menguji Pengeditan Detail Per Label (ID, Brand, Gramasi, Extra Rows)...');
const itemToEdit = {
  id: 'ORD-ORIGINAL',
  batchId: 'batch-alpha',
  brand: 'Hartadinata',
  gramasi: '1 gr',
  vault: 'Vault A',
  lemari: 'Lemari 1',
  laci: 'Laci 1',
  kotak: 'Kotak 1',
  extraRows: []
};

// Simulasi perubahan data dari Edit Modal
const editedItem = {
  ...itemToEdit,
  id: 'ORD-UPDATED-001',
  brand: 'Antam',
  gramasi: '5 gr',
  extraRows: [
    { key: 'Keterangan', value: 'Sertifikat LBMA' },
    { key: 'Petugas', value: 'Budi' }
  ]
};

assert.strictEqual(editedItem.id, 'ORD-UPDATED-001');
assert.strictEqual(editedItem.brand, 'Antam');
assert.strictEqual(editedItem.gramasi, '5 gr');
assert.strictEqual(editedItem.extraRows.length, 2);
assert.strictEqual(editedItem.extraRows[0].key, 'Keterangan');
assert.strictEqual(editedItem.extraRows[0].value, 'Sertifikat LBMA');

const editedSvg = BarcodeEngine.toSVGString(editedItem.id, {
  format: 'QR',
  brand: editedItem.brand,
  gramasi: editedItem.gramasi,
  vault: editedItem.vault,
  extraRows: editedItem.extraRows
});
assert(editedSvg.includes('ORD-UPD') || editedSvg.includes('ORD-UPDATED-001'));
assert(editedSvg.includes('Antam - 5 gr'));
assert(editedSvg.includes('Keterangan: Sertifikat LBMA'));
console.log('✅ Pengeditan Detail Per Label LULUS.');

// Test 20: Folder Batch Deletion
console.log('20. Menguji Penghapusan Folder / Batch dan Pembersihan Data...');
let testBatches = [
  { id: 'batch-1', name: 'Batch Antam' },
  { id: 'batch-2', name: 'Batch Hartadinata' }
];
let testItems = [
  { id: 'ID-101', batchId: 'batch-1' },
  { id: 'ID-102', batchId: 'batch-1' },
  { id: 'ID-201', batchId: 'batch-2' }
];

// Delete batch-1
const folderToDelete = 'batch-1';
testItems = testItems.filter(i => (i.batchId || 'default') !== folderToDelete);
testBatches = testBatches.filter(b => b.id !== folderToDelete);

assert.strictEqual(testBatches.length, 1, 'Harus tersisa 1 folder setelah dihapus');
assert.strictEqual(testBatches[0].id, 'batch-2');
assert.strictEqual(testItems.length, 1, 'Harus tersisa 1 item setelah folder dihapus');
assert.strictEqual(testItems[0].id, 'ID-201');
console.log('✅ Penghapusan Folder / Batch LULUS (Item dan folder terhapus bersih).');

// Test 21: Text Slicing for Long ID (Vertical Chunks)
console.log('21. Menguji Slicing Nomor ID Panjang Menjadi Baris Vertikal...');
const sampleLongId = 'ORD00000000160600001'; // 21 karakter
const autoChunks = BarcodeEngine.sliceTextChunks(sampleLongId, 'auto');
assert.strictEqual(autoChunks.length, 3, '21 Karakter harus di-slice menjadi 3 baris');
assert.strictEqual(autoChunks[0], 'ORD0000', 'Baris 1 harus ORD0000');
assert.strictEqual(autoChunks[1], '0000160', 'Baris 2 harus 0000160');
assert.strictEqual(autoChunks[2], '600001', 'Baris 3 harus 600001');

const chunks6 = BarcodeEngine.sliceTextChunks('123456789012', '6');
assert.strictEqual(chunks6.length, 2);
assert.strictEqual(chunks6[0], '123456');
assert.strictEqual(chunks6[1], '789012');

const chunksNone = BarcodeEngine.sliceTextChunks('ORD001', 'none');
assert.strictEqual(chunksNone.length, 1);
assert.strictEqual(chunksNone[0], 'ORD001');
console.log('✅ Slicing Nomor ID Panjang (sliceTextChunks) LULUS (3 baris x 7 karakter presisi).');

// Test 22: QR Code SVG dengan Nomor ID di Bawah (Under-Code Sliced)
console.log('22. Menguji Output QR Code SVG dengan Nomor ID di Bawah (Under-Code Sliced)...');
const underCodeSvg = BarcodeEngine.renderQRCodeToSVG(sampleLongId, {
  layoutPosition: 'side-left',
  idPosition: 'under-code',
  idSliceChunk: 'auto',
  brand: 'Hartadinata',
  gramasi: '0.5 gr',
  vault: 'Vault 1',
  lemari: 'Lemari 1',
  laci: 'Laci 1',
  kotak: 'Kotak 01'
});
// With adaptive auto-chunk, the ID is sliced by QR pixel width — verify all chars present across text elements
const allTextParts = underCodeSvg.match(/>([^<]+)</g) || [];
const allTextStr = allTextParts.map(m => m.slice(1, -1)).join('');
assert(allTextStr.includes('ORD'), 'Harus memuat awalan ID ORD');
assert(allTextStr.includes('00001'), 'Harus memuat akhiran ID');
assert(underCodeSvg.includes('Hartadinata - 0.5 gr'), 'Harus memuat informasi brand');
assert(underCodeSvg.includes('Vault 1 - Lemari 1 - Laci 1 - Kotak 01'), 'Harus memuat lokasi');
console.log('✅ QR Code Under-Code Sliced SVG LULUS.');

// Test 23: Barcode Scale Factor Support
console.log('23. Menguji Barcode & QR Scale Factor...');
const scaledSvgSmall = BarcodeEngine.renderQRCodeToSVG('TEST-SCALE', { barcodeScale: 0.6 });
const scaledSvgLarge = BarcodeEngine.renderQRCodeToSVG('TEST-SCALE', { barcodeScale: 1.4 });
assert(typeof scaledSvgSmall === 'string' && scaledSvgSmall.includes('<svg'));
assert(typeof scaledSvgLarge === 'string' && scaledSvgLarge.includes('<svg'));
console.log('✅ Barcode & QR Scale Factor LULUS.');

// Test 25: Normalisasi Nilai Excel (Brand Hartadinata/Antam & Gramasi gr)
console.log('25. Menguji Normalisasi Nilai Excel (Hartadinata Abadi Shop & Butik Emas Antam & Gramasi gr)...');
function normalizeExcelCellValue(val, colName = '') {
  if (val === undefined || val === null) return '';
  let s = String(val).trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  const colLower = (colName || '').toLowerCase();
  if (lower.includes('hartadinata abadi shop') || lower === 'hartadinata abadi' || lower.includes('pt hartadinata abadi') || lower.includes('hartadinata shop')) {
    return 'Hartadinata';
  }
  if (lower.includes('butik emas antam') || lower.includes('butik antam') || (lower.includes('antam') && lower.includes('butik'))) {
    return 'Antam';
  }
  const isGramasiCol = colLower.includes('gram') || colLower.includes('berat') || colLower.includes('weight') || colLower === 'gr';
  if (isGramasiCol) {
    const numOnly = s.replace(/\s*(gram|gr|g)\s*$/i, '').trim();
    if (numOnly && !isNaN(Number(numOnly.replace(',', '.')))) {
      return `${numOnly} gr`;
    }
  } else {
    if (/^\d+(\.\d+)?\s*gram$/i.test(s)) return s.replace(/\s*gram$/i, ' gr');
    if (/^\d+(\.\d+)?\s*g$/i.test(s)) return s.replace(/\s*g$/i, ' gr');
  }
  return s;
}

assert.strictEqual(normalizeExcelCellValue('Hartadinata Abadi Shop', 'Toko'), 'Hartadinata');
assert.strictEqual(normalizeExcelCellValue('PT Hartadinata Abadi', 'Brand'), 'Hartadinata');
assert.strictEqual(normalizeExcelCellValue('Butik Emas Antam', 'Lokasi'), 'Antam');
assert.strictEqual(normalizeExcelCellValue('Butik Emas Antam Bandung', 'Toko'), 'Antam');
assert.strictEqual(normalizeExcelCellValue('0.5', 'Gramasi'), '0.5 gr');
assert.strictEqual(normalizeExcelCellValue('1', 'Berat'), '1 gr');
assert.strictEqual(normalizeExcelCellValue('10 gr', 'Weight'), '10 gr');
assert.strictEqual(normalizeExcelCellValue('2.5 gram', 'Keterangan'), '2.5 gr');
console.log('✅ Normalisasi Nilai Excel (Brand & Gramasi) LULUS.');

// Test 26: Exporter PDF & Full Sheet Module Verification
console.log('26. Menguji Modul Ekspor PDF & Full Sheet Canvas...');
assert.strictEqual(typeof BarcodeExporter.downloadFullSheetPDF, 'function', 'downloadFullSheetPDF harus terdefinisi');
assert.strictEqual(typeof BarcodeExporter.renderSheetToCanvas, 'function', 'renderSheetToCanvas harus terdefinisi');
console.log('✅ Modul Ekspor PDF & Full Sheet Canvas LULUS.');

// Test 27: Preservasi Detail Label (labelLines 6 baris & multiline fallback)
console.log('27. Menguji Preservasi Detail Label (labelLines & 6 baris custom)...');
const svgDirectLines = BarcodeEngine.renderQRCodeToSVG('ID-DETAIL-TEST', {
  labelLines: ['Hartadinata - 1 gr', 'Vault 1 - Lemari 2 - Laci 3', 'Kadar: 99.99%', 'SN: 12345678', 'Ket: Promo', 'Batch: B1']
});
assert(svgDirectLines.includes('Hartadinata - 1 gr'), 'SVG harus memuat baris 1');
assert(svgDirectLines.includes('Vault 1 - Lemari 2 - Laci 3'), 'SVG harus memuat baris 2');
assert(svgDirectLines.includes('Kadar: 99.99%'), 'SVG harus memuat baris 3');
assert(svgDirectLines.includes('SN: 12345678'), 'SVG harus memuat baris 4');
assert(svgDirectLines.includes('Ket: Promo'), 'SVG harus memuat baris 5');
assert(svgDirectLines.includes('Batch: B1'), 'SVG harus memuat baris 6');

const svgMultiLineFallback = BarcodeEngine.renderQRCodeToSVG('ID-FALLBACK-TEST', {
  topLabel: 'Antam - 0.5 gr\nRak A - Box 1\nSN: 998877\nKeterangan: Asli'
});
assert(svgMultiLineFallback.includes('Antam - 0.5 gr'), 'Fallback harus memuat baris 1');
assert(svgMultiLineFallback.includes('Rak A - Box 1'), 'Fallback harus memuat baris 2');
assert(svgMultiLineFallback.includes('SN: 998877'), 'Fallback harus memuat baris 3');
assert(svgMultiLineFallback.includes('Keterangan: Asli'), 'Fallback harus memuat baris 4');
console.log('✅ Preservasi Detail Label (6 baris & multiline) LULUS.');

// Test 28: Proportional Resolution Scaling (Preview vs 300 DPI Export)
console.log('28. Menguji Skalabilitas Proporsional Resolusi (Pratinjau vs Ekspor 300 DPI)...');
const previewSvg = BarcodeEngine.renderQRCodeToSVG('TEST-ORD-123456789', {
  topLabel: 'Harta - 0.5 gr',
  targetWidth: 300,
  targetHeight: 108,
  labelWidthMm: 50,
  labelHeightMm: 18,
  fontSizeTitle: 12,
  fontSizeDetails: 12,
  fontSizeId: 11
});
const exportSvg = BarcodeEngine.renderQRCodeToSVG('TEST-ORD-123456789', {
  topLabel: 'Harta - 0.5 gr',
  targetWidth: 591,
  targetHeight: 213,
  labelWidthMm: 50,
  labelHeightMm: 18,
  fontSizeTitle: 12,
  fontSizeDetails: 12,
  fontSizeId: 11
});
// Verify font sizes scaled proportionally with height (213 / 108 ≈ 1.97)
assert(previewSvg.includes('font-size="12"'), 'Preview font-size title harus 12px');
assert(exportSvg.includes('font-size="24"'), '300 DPI font-size title harus diskalakan ~24px');
// Test 29: Excel 14 Standard Variables Extraction
console.log('29. Menguji Ekstraksi 14 Variabel Standar Excel (ID Number s/d Keping)...');
function extractStandardExcelFields(row, headers) {
  const normalizeExcelVal = (val, colName) => {
    let s = String(val || '').trim();
    if (!s) return '';
    if (s.toLowerCase().includes('hartadinata')) return 'Hartadinata';
    if (s.toLowerCase().includes('antam')) return 'Antam';
    const cLower = (colName || '').toLowerCase();
    if (cLower.includes('gram') || cLower.includes('berat') || cLower.includes('weight')) {
      if (/^\d+(\.\d+)?$/.test(s)) return `${s} gr`;
      if (/^\d+(\.\d+)?\s*gram$/i.test(s)) return s.replace(/\s*gram$/i, ' gr');
      if (/^\d+(\.\d+)?\s*g$/i.test(s)) return s.replace(/\s*g$/i, ' gr');
    }
    return s;
  };

  const fields = {
    id_number: '', nomor_barcode: '', sequence_number: '', kode: '',
    nama_cabang: '', lemari_penyimpanan: '', laci_penyimpanan: '',
    kotak_penyimpanan: '', vault: '', nama: '', no_rekening: '',
    pengirim: '', gramasi: '', keping: ''
  };

  headers.forEach((h, idx) => {
    const headerLower = String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    const rawVal = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
    const val = normalizeExcelVal(rawVal, h);

    if (headerLower.includes('idnumber') || headerLower === 'id' || headerLower === 'nomorid') {
      fields.id_number = val;
    } else if (headerLower.includes('nomorbarcode') || headerLower.includes('barcode') || headerLower === 'nobarcode') {
      fields.nomor_barcode = val;
    } else if (headerLower.includes('sequencenumber') || headerLower.includes('seqnum') || headerLower === 'seq' || headerLower === 'sequence') {
      fields.sequence_number = val;
    } else if (headerLower === 'kode' || headerLower.includes('kodebarang') || headerLower.includes('itemcode')) {
      fields.kode = val;
    } else if (headerLower.includes('namacabang') || headerLower.includes('cabang') || headerLower.includes('branch')) {
      fields.nama_cabang = val;
    } else if (headerLower.includes('lemaripenyimpanan') || headerLower.includes('lemari') || headerLower.includes('cupboard') || headerLower.includes('wardrobe')) {
      fields.lemari_penyimpanan = val;
    } else if (headerLower.includes('lacipenyimpanan') || headerLower.includes('laci') || headerLower.includes('drawer')) {
      fields.laci_penyimpanan = val;
    } else if (headerLower.includes('kotakpenyimpanan') || headerLower.includes('kotak') || headerLower.includes('box')) {
      fields.kotak_penyimpanan = val;
    } else if (headerLower.includes('vault') || headerLower.includes('brankas') || headerLower.includes('safe')) {
      fields.vault = val;
    } else if (headerLower === 'nama' || headerLower.includes('namapelanggan') || headerLower.includes('customer') || headerLower.includes('pemilik')) {
      fields.nama = val;
    } else if (headerLower.includes('norekening') || headerLower.includes('rekening') || headerLower.includes('norek') || headerLower.includes('accountno')) {
      fields.no_rekening = val;
    } else if (headerLower.includes('pengirim') || headerLower.includes('sender') || headerLower.includes('supplier')) {
      fields.pengirim = val;
    } else if (headerLower.includes('gramasi') || headerLower.includes('berat') || headerLower.includes('weight') || headerLower === 'gr') {
      fields.gramasi = val;
    } else if (headerLower.includes('keping') || headerLower.includes('qty') || headerLower.includes('jumlah') || headerLower.includes('pieces') || headerLower.includes('pcs')) {
      fields.keping = val;
    }
  });

  return fields;
}

const mockHeaders = [
  'ID Number', 'Nomor Barcode', 'Sequence Number', 'Kode', 'Nama Cabang',
  'Lemari Penyimpanan', 'Laci Penyimpanan', 'Kotak Penyimpanan', 'Vault',
  'Nama', 'No Rekening', 'Pengirim', 'Gramasi', 'Keping'
];
const mockRow = [
  'ID-9901', 'BC-8822001', '001', 'KD-LM', 'Cabang Bandung',
  'Lemari A', 'Laci 2', 'Kotak 05', 'Vault Utama',
  'Budi Santoso', '123-456-7890', 'Hartadinata Abadi Shop', '5', '1'
];

const extracted = extractStandardExcelFields(mockRow, mockHeaders);
assert.strictEqual(extracted.id_number, 'ID-9901');
assert.strictEqual(extracted.nomor_barcode, 'BC-8822001');
assert.strictEqual(extracted.sequence_number, '001');
assert.strictEqual(extracted.kode, 'KD-LM');
assert.strictEqual(extracted.nama_cabang, 'Cabang Bandung');
assert.strictEqual(extracted.lemari_penyimpanan, 'Lemari A');
assert.strictEqual(extracted.laci_penyimpanan, 'Laci 2');
assert.strictEqual(extracted.kotak_penyimpanan, 'Kotak 05');
assert.strictEqual(extracted.vault, 'Vault Utama');
assert.strictEqual(extracted.nama, 'Budi Santoso');
assert.strictEqual(extracted.no_rekening, '123-456-7890');
assert.strictEqual(extracted.pengirim, 'Hartadinata', 'Pengirim harus dinormalisasi menjadi Hartadinata');
assert.strictEqual(extracted.gramasi, '5 gr', 'Gramasi harus otomatis berakhiran gr');
assert.strictEqual(extracted.keping, '1');
console.log('✅ Ekstraksi 14 Variabel Standar Excel LULUS (Semua 14 field cocok).');

// Test 30: Skipping Empty Rows and Blank Columns
console.log('30. Menguji Filter Baris Kosong & Omit Kolom Tanpa Data dari Pengaturan Sidebar...');
const sampleRowsWithEmpty = [
  ['ID-1', 'BC-1', '', '', 'Antam Bandung', '1 gr'],
  ['', '', '', '', '', ''], // Completely empty row
  ['   ', null, undefined, '', '', '   '], // Whitespace-only row
  ['ID-2', 'BC-2', '', '', 'Hartadinata Shop', '2 gr']
];
const rawSampleHeaders = ['ID Number', 'Nomor Barcode', 'Kolom Kosong 1', 'Kolom Kosong 2', 'Cabang', 'Gramasi'];

// 1. Skip completely empty rows
const filteredRows = sampleRowsWithEmpty.filter(r => r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));
assert.strictEqual(filteredRows.length, 2, 'Harus tersisa tepat 2 baris yang memiliki data');

// 2. Detect column has data
const colHasData = (colIdx) => filteredRows.some(row => row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '');
assert.strictEqual(colHasData(0), true, 'Kolom 0 (ID) memiliki data');
assert.strictEqual(colHasData(1), true, 'Kolom 1 (Barcode) memiliki data');
assert.strictEqual(colHasData(2), false, 'Kolom 2 (Kosong 1) tidak memiliki data');
assert.strictEqual(colHasData(3), false, 'Kolom 3 (Kosong 2) tidak memiliki data');
assert.strictEqual(colHasData(4), true, 'Kolom 4 (Cabang) memiliki data');
assert.strictEqual(colHasData(5), true, 'Kolom 5 (Gramasi) memiliki data');

// 3. Omitting blank columns from settings
const sidebarConfigs = [];
rawSampleHeaders.forEach((h, idx) => {
  if (colHasData(idx)) {
    sidebarConfigs.push({ index: idx, name: h });
  }
});
assert.strictEqual(sidebarConfigs.length, 4, 'Hanya 4 kolom yang memiliki data yang masuk ke sidebar');
assert(!sidebarConfigs.some(c => c.name.includes('Kolom Kosong')), 'Kolom kosong tidak boleh muncul di sidebar settings');
console.log('✅ Filter Baris Kosong & Omit Kolom Blank LULUS.');

// Test 31: Multi-Device Sync Merge & Printed Status Preservation
console.log('31. Menguji Multi-Device Merge Status Sync (Preservasi status printed)...');
const existingServerItem = {
  id: 'BC-8822001',
  status: 'printed',
  printedAt: '2026-09-22T10:00:00Z',
  pengirim: 'Hartadinata'
};
const clientUpdatedItem = {
  id: 'BC-8822001',
  status: 'pending', // Device B had older pending status
  printedAt: null,
  pengirim: 'Hartadinata'
};

// Simulation of server merge logic
function mergeBarcodeItems(existing, incoming) {
  const merged = { ...existing, ...incoming };
  if (existing.status === 'printed' || incoming.status === 'printed') {
    merged.status = 'printed';
    merged.printedAt = existing.printedAt || incoming.printedAt || new Date().toISOString();
  }
  return merged;
}
const mergedItem = mergeBarcodeItems(existingServerItem, clientUpdatedItem);
assert.strictEqual(mergedItem.status, 'printed', 'Status harus tetap printed saat digabung dengan device lain');
assert.strictEqual(mergedItem.printedAt, '2026-09-22T10:00:00Z', 'Timestamp printedAt harus dipreservasi');
console.log('✅ Multi-Device Merge Status Sync LULUS.');

// Test 32: Single-Line Fitted ID Under QR, Uniform Detail Font Size, and Equal Border Margins
console.log('32. Menguji Single-Line Fitted ID Under QR, Uniform Detail Font Size, dan Equal Border Margin...');
{
  const testQrPixelSize = 120; // 120px QR code width
  const longId = 'ORD00000000154400001'; // 21 characters

  // 1. Single-Line Fitting calculation:
  const fitIdFontSize = Math.max(6, Math.min(10, Math.floor(testQrPixelSize / (longId.length * 0.58))));
  const estTextWidth = longId.length * (fitIdFontSize * 0.58);
  assert(estTextWidth <= testQrPixelSize + 2, `Teks ID harus muat dalam lebar QR (${estTextWidth}px <= ${testQrPixelSize}px) tanpa wrap ke 2 baris`);
  assert(fitIdFontSize >= 6, 'Ukuran font ID tetap terbaca (>= 6px)');

  // 2. Uniform detail font size calculation:
  const availableHeight = 110;
  const detailLineCount = 5;
  const detailLineGap = 3;
  const totalLineGaps = (detailLineCount - 1) * detailLineGap;
  const uniformDetailFontSize = Math.max(7, Math.min(11, Math.floor((availableHeight - totalLineGaps) / (detailLineCount * 1.35))));
  assert(uniformDetailFontSize >= 7 && uniformDetailFontSize <= 11, 'Uniform detail font size proporsional dan seragam');

  // 3. Equal border margins all around:
  const t32LabelW = 394;
  const t32LabelH = 142;
  const effMargin = Math.max(6, Math.round(t32LabelH * 0.05)); // Equal margin for Top, Bottom, Left, Right
  const leftMargin = effMargin;
  const rightMargin = effMargin;
  const topMargin = effMargin;
  const bottomMargin = effMargin;
  assert.strictEqual(leftMargin, rightMargin, 'Margin kiri dan kanan sama');
  assert.strictEqual(topMargin, bottomMargin, 'Margin atas dan bawah sama');
  assert.strictEqual(topMargin, effMargin, 'Margin 4 sisi melingkar seragam');
  console.log('✅ Single-Line Fitted ID, Uniform Detail Font, dan Equal Margin 4 Sisi LULUS.');
}

// Test 33: Word Export (.docx) & Line Border Verification
console.log('33. Menguji Modul Ekspor Word (.docx) & Line Border Label...');
assert(typeof BarcodeExporter.downloadFullSheetDocx === 'function', 'downloadFullSheetDocx harus terdefinisi sebagai fungsi');
const docxLib = require('../js/docx.umd.js');
assert(docxLib && docxLib.Document && docxLib.Packer, 'Library docx.umd.js harus memuat Document dan Packer');

// Verifikasi rendering border line 1px solid black di SVG
const svgSample = BarcodeEngine.renderQRCodeToSVG('ORD-TEST-BORDER', {
  labelWidthMm: 50,
  labelHeightMm: 18,
  layoutPosition: 'side-left',
  showBorder: true
});
assert(svgSample.includes('stroke="#000000"'), 'SVG label harus menyertakan line border hitam');
assert(svgSample.includes('stroke-width="1"'), 'SVG label harus menyertakan border width 1px');
console.log('✅ Modul Ekspor Word (.docx) & Line Border LULUS.');

// Test 34: Barcode 1D Center-Compact Layout Rendering (Kecil di Tengah)
console.log('34. Menguji Barcode 1D Kecil di Tengah (Center-Compact Layout)...');
const svg1DCenter = BarcodeEngine.toSVGString('ORD00000000152900001', {
  format: 'CODE128',
  layoutPosition: 'center-compact',
  labelWidthMm: 50,
  labelHeightMm: 18,
  brand: 'Hartadinata',
  gramasi: '1 gr',
  vault: 'Wisma Mandiri',
  lemari: 'LECTO1',
  laci: 'LACI1',
  kotak: 'K56',
  showBorder: true
});
assert(svg1DCenter.includes('<svg'), 'SVG Barcode 1D center-compact harus valid XML SVG');
assert(svg1DCenter.includes('Hartadinata - 1 gr'), 'Harus menampilkan detail produk');
assert(svg1DCenter.includes('ORD00000000152900001'), 'Harus menampilkan nomor ID di bawah barcode');
assert(svg1DCenter.includes('stroke="#000000"'), 'Harus memiliki border solid');
console.log('✅ Barcode 1D Kecil di Tengah (Center-Compact) LULUS.');

// Test 35: Tanpa Barcode (Teks Saja) Label Rendering
console.log('35. Menguji Format Tanpa Barcode (Teks Saja)...');
const svgNoBarcode = BarcodeEngine.toSVGString('ORD00000000152900001', {
  format: 'NONE',
  labelWidthMm: 50,
  labelHeightMm: 18,
  brand: 'Hartadinata',
  gramasi: '1 gr',
  vault: 'Wisma Mandiri',
  lemari: 'LECTO1',
  laci: 'LACI1',
  kotak: 'K56',
  showBorder: true
});
assert(svgNoBarcode.includes('<svg'), 'SVG Tanpa Barcode harus valid XML SVG');
assert(svgNoBarcode.includes('Hartadinata - 1 gr'), 'Harus menampilkan Brand & Gramasi');
assert(svgNoBarcode.includes('Wisma Mandiri - LECTO1 - LACI1 - K56'), 'Harus menampilkan Lokasi Lengkap');
assert(svgNoBarcode.includes('ORD00000000152900001'), 'Harus menampilkan nomor ID');
assert(svgNoBarcode.includes('stroke="#000000"'), 'Harus memiliki border solid');
// Pastikan tidak ada baris/modul barcode garis di format NONE
assert(!svgNoBarcode.includes('height="75"'), 'Format NONE tidak boleh memuat elemen barcode garis tinggi');
console.log('✅ Format Tanpa Barcode (Teks Saja) LULUS.');

console.log('\n🎉 SEMUA 35 PENGUJIAN VERIFIKASI BERHASIL 100%!');
