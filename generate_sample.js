const fs = require('fs');
const path = require('path');
const XLSX = require('./js/xlsx.full.min.js');

const wb = XLSX.utils.book_new();

function makeSheetData(prefix, count, brand, gramasi) {
  const rows = [['Nomor ID', 'Brand', 'Gramasi']];
  for (let i = 1; i <= count; i++) {
    const pad = String(i).padStart(4, '0');
    rows.push([prefix + pad, brand, gramasi]);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

const s1 = makeSheetData('ANT1G-', 217, 'Antam', '1 gr');
XLSX.utils.book_append_sheet(wb, s1, 'antam 1 gram');

const s2 = makeSheetData('ANT5G-', 24, 'Antam', '5 gr');
XLSX.utils.book_append_sheet(wb, s2, 'antam 5 gram');

const s3 = makeSheetData('ANT10G-', 6, 'Antam', '10 gr');
XLSX.utils.book_append_sheet(wb, s3, 'antam 10 gram');

const s4 = makeSheetData('HRT1G-', 177, 'Hartadinata', '1 gr');
XLSX.utils.book_append_sheet(wb, s4, 'harta 1 gram');

const s5 = makeSheetData('HRT5G-', 20, 'Hartadinata', '5 gr');
XLSX.utils.book_append_sheet(wb, s5, 'harta 5 gram');

const s6 = makeSheetData('HRT10G-', 5, 'Hartadinata', '10 gr');
XLSX.utils.book_append_sheet(wb, s6, 'harta 10 gram');

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const targetPath = path.join(__dirname, 'Sample_MultiSheet_Logam_Mulia.xlsx');
fs.writeFileSync(targetPath, buf);
console.log('Sample_MultiSheet_Logam_Mulia.xlsx successfully created at', targetPath);
