# 📦 BarCodeID Studio & Label Generator

**BarCodeID Studio** adalah aplikasi web modern untuk membuat barcode dalam jumlah tunggal maupun massal (*batch*), di mana **setiap barcode memiliki nomor identitas unik yang berbeda-beda** serta dijamin bebas duplikasi.

Aplikasi ini 100% *client-side*, aman, ringan, dan bekerja secara *offline* tanpa memerlukan database eksternal.

---
## ✨ Fitur Utama

1. **🏆 Mode Cetak Logam Mulia (Multi-Sheet) [BARU]**:
   - **Pemrosesan Sekaligus 6 Sheet Excel**: Mengimpor 1 file Excel multi-sheet dan mencetak semua label sekaligus dalam SATU kali proses cetak/ekspor.
   - **6 Grup Kanonikal Tetap**:
     1. Antam 1g (`#DC2626` - Merah)
     2. Antam 5g (`#EA580C` - Jingga)
     3. Antam 10g (`#7C3AED` - Ungu)
     4. Harta 1g (`#2563EB` - Biru)
     5. Harta 5g (`#0891B2` - Sian)
     6. Harta 10g (`#16A34A` - Hijau)
   - **Toleransi Penamaan Sheet**: Mengenali berbagai variasi nama sheet (huruf besar/kecil, spasi, tanda hubung/garis bawah, kata "gr"/"gram", dsb.) dengan *fallback* urutan indeks (sheet 0 s/d 5). Sheet kosong dilewati dengan peringatan, duplikat ID otomatis dieliminasi dengan log peringatan.
   - **Layout Alir Menyambung Antar Lembar (Continuous Flow)**: Format lembar **48 label (3 kolom × 16 baris)**. Antar grup mengalir tanpa paksaan potong halaman. Setiap grup diawali 1 sel header berwarna (misal "1 gram Antam"). Saat grup terpotong di akhir halaman, halaman berikutnya langsung melanjutkan nomor ID tanpa mengulang header. Lembar terakhir membiarkan sisa sel kosong.
   - **Warna Teks Judul Grup & Barcode Scanner Safe**: Warna diterapkan khusus pada teks judul grup (dan brand/gramasi jika diatur). Garis barcode dan angka nomor ID tetap 100% **hitam pekat (#000000)** agar 100% terbaca oleh semua jenis scanner barcode.
   - **File Contoh 449 ID**: Dilengkapi template `Sample_MultiSheet_Logam_Mulia.xlsx` (distribusi: Antam 1g: 217, Antam 5g: 24, Antam 10g: 6, Harta 1g: 177, Harta 5g: 20, Harta 10g: 5 = 449 ID + 6 header = 455 sel -> 10 lembar [kapasitas 480], sisa 25 sel kosong).

2. **Format Identitas Unik Beragam**:
   - **Urut / Auto-Increment**: Prefix kustom (misal: `PRD-`), padding angka (misal: `0001` s/d `9999`), dan akhiran (*suffix*).
   - **Acak Alfanumerik (Serial Number)**: Huruf kapital, huruf kecil, dan angka tanpa karakter ambigu.
   - **Timestamp / Waktu**: Berdasarkan waktu presisi (`YYYYMMDD-HHmmss-XXXX`).
   - **UUID / GUID**: Format ID standar internasional (tersedia opsi 10 karakter heksadesimal pendek).
   - **Mode Tunggal**: Membuat 1 barcode secara cepat dengan nomor acak atau manual.

3. **📊 Import File Excel 1-Sheet & Pemetaan Dinamis**:
   - Dukungan unggah file Excel (`.xlsx`, `.xls`) dan CSV langsung di browser.
   - Pemetaan dinamis hingga 6 baris kolom inventaris Logam Mulia.
   - Disertai contoh file template Excel: `Hartadinata_Abadi_Shop_Sample.xlsx` dan `Butik_Emas_Antam_Sample.xlsx`.

4. **🔒 Preset Layout Lembar Cetak**:
   - **48 Label (3 kolom × 16 baris)**: Ukuran label 50 × 10 mm pada kertas 165 × 210 mm (Logam Mulia / TJ-126).
   - **Tom & Jerry No. 107 (18 mm × 50 mm)**: 30 label stiker per lembar (3 kolom × 10 baris).
   - **Tom & Jerry No. 108, 121, 126, A4 3-kolom, A4 2-kolom, A4 4-kolom, & Thermal Roll**.

5. **⚡ Mesin Barcode Presisi & Scannable (Code 128 Auto & QR Code)**:
   - Bar integer bulat (2px) tanpa anti-aliasing blur menghasilkan garis 100% hitam pekat (#000000).
   - Margin tenang (*quiet zone*) menjamin pembacaan instan oleh barcode scanner engine fisik (Zebra/Honeywell) maupun kamera HP.

6. **Sistem Anti-Duplikasi & Barcode Management**:
   - Menyimpan seluruh nomor ID yang pernah dibuat ke penyimpanan lokal (*LocalStorage*).
   - Tabel manajemen barcode untuk melacak status cetak (*Belum Dicetak* vs *Sudah Dicetak*), filter pencarian, dan aksi massal (*batch actions*).

7. **Ekspor & Cetak Lengkap**:
   - **Download PNG Lembar Penuh (300 DPI)**: Mendukung unduh per lembar maupun semua lembar (`sheetIndex = 'all'`).
   - **Download PDF Lembaran**: Dokumen PDF multi-halaman beresolusi tinggi (A4 atau custom).
   - **Download Word (.docx)**: Dokumen Word dengan tabel berpresisi geometri stiker.
   - **Direct Print (`window.print()`)**: Presisi tinggi dengan `@media print` dan `print-color-adjust: exact`.

---

## 🚀 Cara Menjalankan

### Menggunakan Server Lokal Python (Direkomendasikan)
Buka terminal di direktori proyek dan jalankan:
```bash
python server.py
```
Akses dari peramban:
- Komputer / Laptop: `http://localhost:3000` (atau port yang aktif)
- Smartphone / Tablet (Wi-Fi sama): `http://<IP-LOKAL-ANDA>:3000`

---

## 📂 Struktur Berkas

```
barcode-generator/
├── index.html                           # Antarmuka web utama (didukung Mode Multi-Sheet)
├── css/
│   └── style.css                        # Styling modern, print-color-adjust & layout cetak 48 label
├── js/
│   ├── JsBarcode.all.min.js             # Library rendering barcode offline
│   ├── xlsx.full.min.js                 # Library parsing spreadsheet Excel offline
│   ├── qrcode.min.js                    # Library rendering QR code offline
│   ├── docx.umd.js                      # Library ekspor Microsoft Word (.docx)
│   ├── id-generator.js                  # Generator nomor identitas unik & registry anti-duplikasi
│   ├── barcode-engine.js                # Barcode & QR engine + Header Cell Renderer
│   ├── multi-sheet-layout.js            # [BARU] Modul kanonikal Logam Mulia Multi-Sheet Layout
│   ├── exporter.js                      # Modul ekspor PNG, PDF, DOCX, ZIP, dan Full Sheet
│   └── app.js                           # Controller utama aplikasi & multi-sheet event handling
├── tests/
│   ├── test-verifier.js                 # 40 unit test logika & verifikasi sistem
│   └── test-multisheet.js               # Unit test spesifik multi-sheet layout & 449 ID
├── Sample_MultiSheet_Logam_Mulia.xlsx   # [BARU] Template 6-sheet contoh 449 ID Logam Mulia
├── Hartadinata_Abadi_Shop_Sample.xlsx     # Template data Excel toko Hartadinata (30 baris)
├── Butik_Emas_Antam_Sample.xlsx         # Template data Excel Butik Antam (30 baris)
├── server.py                            # Server HTTP lokal Python
└── README.md                            # Dokumentasi penggunaan
```
