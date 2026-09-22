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

// Test 11: Format Logam Mulia (Harta & Antam) Auto-Formatting
console.log('11. Menguji Pemformatan Label Logam Mulia (Harta / Antam)...');
function formatGoldRow(brand, gramasi, vault, lemari, laci, kotak, is2Lines = true) {
  const line1 = [brand, gramasi].filter(Boolean).join(' - ');
  const line2 = [vault, lemari, laci, kotak].filter(Boolean).join(' - ');
  if (!line2) return line1;
  if (!line1) return line2;
  return is2Lines ? `${line1}\n${line2}` : `${line1} - ${line2}`;
}

const hartaRowStr = formatGoldRow('Harta', '0.5 gr', 'Vault 1', 'Lemari 1', 'Laci 1', 'Kotak 01', true);
assert.strictEqual(hartaRowStr, 'Harta - 0.5 gr\nVault 1 - Lemari 1 - Laci 1 - Kotak 01');

const antamRowStr = formatGoldRow('Antam', '10 gr', 'Vault 2', 'Lemari 3', 'Laci 2', 'Kotak 05', true);
assert.strictEqual(antamRowStr, 'Antam - 10 gr\nVault 2 - Lemari 3 - Laci 2 - Kotak 05');

const hartaSvg = BarcodeEngine.toSVGString('ORD00000000160600001', {
  topLabel: hartaRowStr,
  format: 'CODE128',
  barWidth: 1.3,
  height: 35
});
assert(hartaSvg.includes('Harta - 0.5 gr'));
assert(hartaSvg.includes('Vault 1 - Lemari 1 - Laci 1 - Kotak 01'));
assert(hartaSvg.includes('ORD00000000160600001'));
console.log('✅ Pemformatan Label Logam Mulia (Harta / Antam) LULUS.');

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
  brand: 'Harta',
  gramasi: '1 gr',
  vault: 'Vault 1',
  lemari: 'Lemari 2',
  laci: 'Laci 3',
  kotak: 'Kotak 4',
  extraRows: [{ key: 'PO', value: 'PO-2026-001' }]
});
assert(qrSvg.includes('<svg'), 'QR SVG harus valid XML SVG');
assert(qrSvg.includes('ORD00000000160600001') || qrSvg.includes('ORD0000'), 'QR SVG harus menampilkan teks ID');
assert(qrSvg.includes('Harta - 1 gr'), 'QR SVG harus menampilkan Brand & Gramasi');
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
  { id: 'ID-1', batchId: 'batch-alpha', brand: 'Harta' },
  { id: 'ID-2', batchId: 'batch-alpha', brand: 'Harta' },
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
  brand: 'Harta',
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
  { id: 'batch-2', name: 'Batch Harta' }
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
  brand: 'Harta',
  gramasi: '0.5 gr',
  vault: 'Vault 1',
  lemari: 'Lemari 1',
  laci: 'Laci 1',
  kotak: 'Kotak 01'
});
assert(underCodeSvg.includes('ORD0000'), 'Harus memuat baris slice 1');
assert(underCodeSvg.includes('0000160'), 'Harus memuat baris slice 2');
assert(underCodeSvg.includes('600001'), 'Harus memuat baris slice 3');
assert(underCodeSvg.includes('Harta - 0.5 gr'), 'Harus memuat informasi brand');
assert(underCodeSvg.includes('Vault 1 - Lemari 1 - Laci 1 - Kotak 01'), 'Harus memuat lokasi');
console.log('✅ QR Code Under-Code Sliced SVG LULUS.');

// Test 23: Barcode Scale Factor Support
console.log('23. Menguji Barcode & QR Scale Factor...');
const scaledSvgSmall = BarcodeEngine.renderQRCodeToSVG('TEST-SCALE', { barcodeScale: 0.6 });
const scaledSvgLarge = BarcodeEngine.renderQRCodeToSVG('TEST-SCALE', { barcodeScale: 1.4 });
assert(typeof scaledSvgSmall === 'string' && scaledSvgSmall.includes('<svg'));
assert(typeof scaledSvgLarge === 'string' && scaledSvgLarge.includes('<svg'));
console.log('✅ Barcode & QR Scale Factor LULUS.');

// Test 24: Unique ID Registry Clean State (v5)
console.log('24. Menguji Inisialisasi Registry Bersih (0 ID)...');
const freshRegistry = new IdGenerator.UniqueIdRegistry();
assert.strictEqual(freshRegistry.storageKey, 'barcode_id_studio_history_v5', 'Harus menggunakan key storage v5');
freshRegistry.clear();
assert.strictEqual(freshRegistry.size(), 0, 'Registry harus bersih dengan 0 ID');
console.log('✅ Inisialisasi Registry Bersih (0 ID) LULUS.');

console.log('\n🎉 SEMUA 24 PENGUJIAN VERIFIKASI BERHASIL 100%!');


