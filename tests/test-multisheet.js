const assert = require('assert');
const fs = require('fs');
const path = require('path');
const XLSX = require(path.join(__dirname, '../js/xlsx.full.min.js'));
const MultiSheetLayout = require(path.join(__dirname, '../js/multi-sheet-layout.js'));
const BarcodeEngine = require(path.join(__dirname, '../js/barcode-engine.js'));

console.log('--- 🧪 Menjalankan Verifikasi Mode Cetak Logam Mulia (Multi-Sheet) ---');

// Test 1: Pemetaan Nama Sheet (Case-insensitive, toleran spasi, underscore, strip, gr/gram)
console.log('1. Menguji Pemetaan Nama Sheet & Fallback Index...');
const testNames = [
  { name: 'antam 1 gram', expected: 'antam_1g' },
  { name: 'Antam 1 Gram', expected: 'antam_1g' },
  { name: 'antam_1gr', expected: 'antam_1g' },
  { name: '1 gr antam', expected: 'antam_1g' },
  { name: 'ANTAM-1G', expected: 'antam_1g' },
  { name: 'antam 5 gram', expected: 'antam_5g' },
  { name: 'antam_5gr', expected: 'antam_5g' },
  { name: 'Antam 5g', expected: 'antam_5g' },
  { name: 'antam 10 gram', expected: 'antam_10g' },
  { name: 'antam_10gr', expected: 'antam_10g' },
  { name: '10 gram Antam', expected: 'antam_10g' },
  { name: 'harta 1 gram', expected: 'harta_1g' },
  { name: 'Hartadinata 1 Gram', expected: 'harta_1g' },
  { name: 'harta_1gr', expected: 'harta_1g' },
  { name: 'harta 5 gram', expected: 'harta_5g' },
  { name: 'harta_5gr', expected: 'harta_5g' },
  { name: 'harta 10 gram', expected: 'harta_10g' },
  { name: 'harta_10gr', expected: 'harta_10g' },
  { name: 'Hartadinata 10g', expected: 'harta_10g' }
];

testNames.forEach(({ name, expected }) => {
  const matched = MultiSheetLayout.matchSheetToGroup(name, 99);
  assert.strictEqual(matched, expected, `Sheet "${name}" harus dipetakan ke "${expected}", tapi dapat "${matched}"`);
});

// Fallback index test jika nama sheet tidak mengandung nama brand/gramasi
const fallback0 = MultiSheetLayout.matchSheetToGroup('Sheet1', 0);
assert.strictEqual(fallback0, 'antam_1g', 'Fallback sheet index 0 harus ke antam_1g');
const fallback5 = MultiSheetLayout.matchSheetToGroup('Lembar Data', 5);
assert.strictEqual(fallback5, 'harta_10g', 'Fallback sheet index 5 harus ke harta_10g');
console.log('✅ Pemetaan Nama Sheet & Fallback Index LULUS.');

// Test 2: Urutan Grup Tetap (Output Cetak Selalu Antam 1g -> 5g -> 10g -> Harta 1g -> 5g -> 10g)
console.log('2. Menguji Konsistensi Urutan Output Grup Cetak...');
const canonicalKeys = MultiSheetLayout.ORDERED_GROUPS.map(g => g.key);
assert.deepStrictEqual(canonicalKeys, [
  'antam_1g',
  'antam_5g',
  'antam_10g',
  'harta_1g',
  'harta_5g',
  'harta_10g'
], 'Urutan 6 grup canonical harus persis antam 1g s/d harta 10g');

// Buat workbook dengan sheet yang urutannya sengaja diacak
const wbShuffled = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbShuffled, XLSX.utils.aoa_to_sheet([['ID'], ['H10-1']]), 'harta 10 gram');
XLSX.utils.book_append_sheet(wbShuffled, XLSX.utils.aoa_to_sheet([['ID'], ['A1-1']]), 'antam 1 gram');
XLSX.utils.book_append_sheet(wbShuffled, XLSX.utils.aoa_to_sheet([['ID'], ['H1-1']]), 'harta 1 gram');

const processedShuffled = MultiSheetLayout.processMultiSheetWorkbook(wbShuffled);
const activeGroupOrder = [];
processedShuffled.cells.forEach(c => {
  if (c.cellType === 'header') {
    activeGroupOrder.push(c.groupKey);
  }
});
assert.deepStrictEqual(activeGroupOrder, ['antam_1g', 'harta_1g', 'harta_10g'], 'Urutan output harus tetap mengikuti urutan baku');
console.log('✅ Urutan Grup Konsisten & Kebal Pengacakan LULUS.');

// Test 3: Perhitungan 449 ID -> Total Sel (449 + 6 judul = 455) -> 10 Lembar (480 sel, 25 kosong)
console.log('3. Menguji Perhitungan Kapasitas 449 ID -> 455 Sel -> 10 Lembar (25 Kosong)...');
const sampleFilePath = path.join(__dirname, '../Sample_MultiSheet_Logam_Mulia.xlsx');
assert(fs.existsSync(sampleFilePath), 'File Sample_MultiSheet_Logam_Mulia.xlsx harus ada');

const sampleBuf = fs.readFileSync(sampleFilePath);
const sampleWb = XLSX.read(sampleBuf, { type: 'buffer' });
const result = MultiSheetLayout.processMultiSheetWorkbook(sampleWb);

assert.strictEqual(result.success, true, 'Parsing file sample harus sukses');
assert.strictEqual(result.totalIds, 449, 'Total ID harus tepat 449 ID (217 + 24 + 6 + 177 + 20 + 5)');
assert.strictEqual(result.totalCells, 455, 'Total sel harus tepat 455 sel (449 ID + 6 judul grup)');
assert.strictEqual(result.totalSheets, 10, 'Total lembar harus tepat 10 lembar');
assert.strictEqual(result.perSheet, 48, 'Kapasitas per lembar harus 48 label (3x16)');
assert.strictEqual(result.emptyCellsLastSheet, 25, 'Sisa sel kosong di lembar ke-10 harus tepat 25 sel kosong (480 - 455)');
assert.strictEqual(result.pages.length, 10, 'Harus menghasilkan tepat 10 halaman chunk');
assert.strictEqual(result.pages[9].length, 23, 'Lembar ke-10 harus terisi 23 sel (48 - 25 kosong)');
console.log('✅ Perhitungan 449 ID -> 455 Sel -> 10 Lembar (25 Kosong) LULUS.');

// Test 4: Alur Menyambung Antar Lembar (Continuous Flow)
console.log('4. Menguji Alur Menyambung Antar Lembar & Tidak Mengulang Judul Grup Saat Terpotong...');
// Lembar 1: Sel 0 adalah Header Antam 1g, Sel 1 s/d 47 adalah ID Antam 1g
assert.strictEqual(result.pages[0][0].cellType, 'header', 'Sel pertama di Lembar 1 harus Header');
assert.strictEqual(result.pages[0][0].title, '1 gram Antam');
assert.strictEqual(result.pages[0][1].cellType, 'id', 'Sel kedua di Lembar 1 harus ID');
assert.strictEqual(result.pages[0][1].id, 'ANT1G-0001');

// Cek posisi pergantian grup Antam 1g -> Antam 5g:
// Antam 1g = 1 header + 217 ID = 218 sel (indeks 0..217)
// Sel ke-218 (indeks global 218) harus Header "5 gram Antam"
assert.strictEqual(result.cells[218].cellType, 'header');
assert.strictEqual(result.cells[218].title, '5 gram Antam');
assert.strictEqual(result.cells[219].cellType, 'id');
assert.strictEqual(result.cells[219].id, 'ANT5G-0001');

// Indeks global 218 berada pada halaman ke-5 (indeks page 4: 192 s/d 239, posisi ke 218 - 192 = 26)
assert.strictEqual(result.pages[4][26].cellType, 'header');
assert.strictEqual(result.pages[4][26].title, '5 gram Antam');

// Antam 5g memiliki 24 ID. 21 ID di Lembar 5 (posisi 27..47).
// Sisa 3 ID Antam 5g muncul di Lembar 6 posisi awal (sel 0, 1, 2) TANPA mengulang judul grup!
assert.strictEqual(result.pages[5][0].cellType, 'id', 'Awal Lembar 6 harus melanjutkan ID Antam 5g tanpa mengulang judul');
assert.strictEqual(result.pages[5][0].id, 'ANT5G-0022');
assert.strictEqual(result.pages[5][1].id, 'ANT5G-0023');
assert.strictEqual(result.pages[5][2].id, 'ANT5G-0024');

// Setelah ID Antam 5g selesai di sel ke-2 Lembar 6, grup berikutnya (10 gram Antam) langsung lanjut di sel ke-3!
assert.strictEqual(result.pages[5][3].cellType, 'header');
assert.strictEqual(result.pages[5][3].title, '10 gram Antam');
assert.strictEqual(result.pages[5][4].cellType, 'id');
assert.strictEqual(result.pages[5][4].id, 'ANT10G-0001');
console.log('✅ Alur Menyambung Antar Lembar (Continuous Flow) LULUS.');

// Test 5: Opsi Toggle "Hitung Label Judul Grup Sebagai 1 Sel"
console.log('5. Menguji Toggle "Hitung Label Judul Grup Sebagai 1 Sel"...');
const resultNoHeader = MultiSheetLayout.processMultiSheetWorkbook(sampleWb, { includeHeaderCell: false });
assert.strictEqual(resultNoHeader.totalIds, 449);
assert.strictEqual(resultNoHeader.totalCells, 449, 'Saat toggle OFF, total sel harus sama dengan total ID (tanpa sel header)');
assert.strictEqual(resultNoHeader.totalSheets, 10);
assert.strictEqual(resultNoHeader.emptyCellsLastSheet, 31, 'Saat toggle OFF, sisa kosong di lembar ke-10 adalah 480 - 449 = 31');
assert(resultNoHeader.cells.every(c => c.cellType === 'id'), 'Semua sel harus bertipe id saat header dimatikan');
console.log('✅ Toggle Label Judul Grup LULUS.');

// Test 6: Warna Per Grup
console.log('6. Menguji Pengaturan Warna Per Grup & Barcode Selalu Hitam (#000000)...');
assert.strictEqual(MultiSheetLayout.DEFAULT_GROUP_COLORS['antam_1g'], '#DC2626', '1 gram Antam harus Merah (#DC2626)');
assert.strictEqual(MultiSheetLayout.DEFAULT_GROUP_COLORS['harta_1g'], '#2563EB', '1 gram Harta harus Biru (#2563EB)');
assert.strictEqual(MultiSheetLayout.DEFAULT_GROUP_COLORS['antam_5g'], '#EA580C', '5 gram Antam harus Oranye (#EA580C)');
assert.strictEqual(MultiSheetLayout.DEFAULT_GROUP_COLORS['harta_5g'], '#0891B2', '5 gram Harta harus Cyan (#0891B2)');
assert.strictEqual(MultiSheetLayout.DEFAULT_GROUP_COLORS['antam_10g'], '#7C3AED', '10 gram Antam harus Ungu (#7C3AED)');
assert.strictEqual(MultiSheetLayout.DEFAULT_GROUP_COLORS['harta_10g'], '#16A34A', '10 gram Harta harus Hijau (#16A34A)');

// Pastikan sel header mendapatkan warna grup
const headerAntam1 = result.cells.find(c => c.cellType === 'header' && c.groupKey === 'antam_1g');
assert.strictEqual(headerAntam1.color, '#DC2626');
const headerHarta1 = result.cells.find(c => c.cellType === 'header' && c.groupKey === 'harta_1g');
assert.strictEqual(headerHarta1.color, '#2563EB');

// Pastikan sel ID selalu hitam untuk barcode & ID
const idCell = result.cells.find(c => c.cellType === 'id');
assert.strictEqual(idCell.color, '#000000', 'Warna ID dan Barcode selalu hitam (#000000)');
console.log('✅ Warna Per Grup & Hitam Pekat Scanner LULUS.');

// Test 7: Toleransi Sheet Kosong & Duplikasi
console.log('7. Menguji Toleransi Sheet Kosong & Deteksi Duplikat...');
const wbWithDupAndEmpty = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbWithDupAndEmpty, XLSX.utils.aoa_to_sheet([['ID'], ['DUP-1'], ['DUP-2'], ['DUP-1']]), 'antam 1 gram');
XLSX.utils.book_append_sheet(wbWithDupAndEmpty, XLSX.utils.aoa_to_sheet([]), 'antam 5 gram'); // kosong

const resDup = MultiSheetLayout.processMultiSheetWorkbook(wbWithDupAndEmpty);
assert.strictEqual(resDup.success, true, 'Sheet kosong tidak boleh melempar error');
assert.strictEqual(resDup.totalIds, 2, 'ID duplikat harus dieliminasi');
assert(resDup.warnings.some(w => w.includes('duplikat')), 'Harus ada peringatan duplikat');
assert(resDup.warnings.some(w => w.includes('kosong')), 'Harus ada peringatan sheet kosong');
console.log('✅ Toleransi Sheet Kosong & Eliminasi Duplikat LULUS.');

// Test 8: Verifikasi Render Canvas Header & ID
console.log('8. Menguji Engine Render Header & ID Canvas...');
assert(typeof BarcodeEngine.renderHeaderToCanvas === 'function', 'BarcodeEngine harus memiliki fungsi renderHeaderToCanvas');
const dummyCanvas = {
  getContext: () => ({
    fillRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 100 }),
    strokeRect: () => {}
  }),
  width: 0,
  height: 0
};
BarcodeEngine.renderHeaderToCanvas(dummyCanvas, '1 gram Antam', { color: '#DC2626' });
assert.strictEqual(dummyCanvas.width, 480);
assert.strictEqual(dummyCanvas.height, 175);
console.log('✅ Engine Render Header & ID Canvas LULUS.');

console.log('🎉 SEMUA 8 PENGUJIAN MULTI-SHEET LAYOUT BERHASIL 100%!');
