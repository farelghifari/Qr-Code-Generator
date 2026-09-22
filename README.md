# 📦 BarCodeID Studio & Label Generator

**BarCodeID Studio** adalah aplikasi web modern untuk membuat barcode dalam jumlah tunggal maupun massal (*batch*), di mana **setiap barcode memiliki nomor identitas unik yang berbeda-beda** serta dijamin bebas duplikasi.

Aplikasi ini 100% *client-side*, aman, ringan, dan bekerja secara *offline* tanpa memerlukan database eksternal.

---

## ✨ Fitur Utama

1. **Format Identitas Unik Beragam**:
   - **Urut / Auto-Increment**: Prefix kustom (misal: `PRD-`), padding angka (misal: `0001` s/d `9999`), dan akhiran (*suffix*).
   - **Acak Alfanumerik (Serial Number)**: Huruf kapital, huruf kecil, dan angka tanpa karakter ambigu.
   - **Timestamp / Waktu**: Berdasarkan waktu presisi (`YYYYMMDD-HHmmss-XXXX`).
   - **UUID / GUID**: Format ID standar internasional (tersedia opsi 10 karakter heksadesimal pendek).
   - **Mode Tunggal**: Membuat 1 barcode secara cepat dengan nomor acak atau manual.

2. **📊 Import File Excel & Format Khusus Logam Mulia (Harta / Antam)**:
   - Dukungan unggah file Excel (`.xlsx`, `.xls`) dan CSV langsung di browser.
   - Pemetaan otomatis 6 kolom inventaris Logam Mulia:
     - `Brand` (Hartadinata Abadi / Butik Emas Antam)
     - `Gramasi` (misal: 0.5 gr, 10 gr)
     - `Vault / Brankas`
     - `Lemari Penyimpanan`
     - `Laci Penyimpanan`
     - `Kotak Penyimpanan`
   - Opsi tampilan label 2 baris (rapi & jelas) atau 1 baris penuh.
   - Disertai contoh file template Excel siap pakai: `Hartadinata_Abadi_Shop_Sample.xlsx` dan `Butik_Emas_Antam_Sample.xlsx`.

3. **🔒 Ukuran Terkunci Stiker Tom & Jerry No. 107 (18 mm × 50 mm)**:
   - Format stiker terkunci presisi pada dimensi **18 mm × 50 mm** (591 × 213 px pada 300 DPI).
   - 1 lembar memuat **30 label stiker** (3 kolom × 10 baris).
   - Dilengkapi garis bantu batas stiker untuk mempermudah pemotongan atau pencetakan.

4. **⚡ Mesin Barcode Presisi & Scannable (Code 128 Auto)**:
   - Menggunakan **Code 128 Auto (Code B + Code C)** yang otomatis mengompresi deretan angka panjang (seperti `ORD00000000160600001`) menjadi densitas tinggi yang hemat ruang.
   - Ketebalan bar integer bulat (2px) dan nonaktif *anti-aliasing blur* menghasilkan garis 100% hitam pekat (#000000) dan putih bersih (#FFFFFF).
   - Menyediakan margin tenang (*quiet zone*) 106.5 px pada setiap sisi label, menjamin pembacaan instan oleh *barcode scanner engine* fisik (Zebra/Honeywell) maupun aplikasi kamera HP.
   - Mendukung pula **Code 39** dan **EAN-13**.

5. **Sistem Anti-Duplikasi & Barcode Management**:
   - Menyimpan seluruh nomor ID yang pernah dibuat ke penyimpanan lokal (*LocalStorage*).
   - Tabel manajemen barcode untuk melacak status cetak (*Belum Dicetak* vs *Sudah Dicetak*), filter pencarian, dan aksi massal (*batch actions*).

6. **Ekspor & Cetak Lengkap**:
   - **Download Gambar 1 Lembar Penuh (PNG 300 DPI)**: 30 label stiker Tom & Jerry 107 dalam 1 file gambar siap cetak.
   - **Download PNG Satuan**: Gambar stiker ukuran presisi 18×50 mm.
   - **Download Batch ZIP**: Seluruh barcode dipaketkan ke dalam file `.zip` (didukung *MiniZip* native client-side).
   - **Export CSV**: Data tabel barcode dapat diekspor kembali ke spreadsheet.
   - **Cetak Langsung**: Pratinjau cetak PDF/printer dengan tata letak Tom & Jerry 107, kertas A4, maupun printer thermal roll.

7. **📱 Akses Perangkat Lain (Multi-Device Wi-Fi)**:
   - Server lokal Python siap diakses bersamaan oleh smartphone, tablet, atau PC lain dalam jaringan Wi-Fi yang sama melalui QR Code atau URL jaringan lokal.

---

## 🚀 Cara Menjalankan

### Menggunakan Server Lokal Python (Direkomendasikan)
Buka terminal di direktori proyek dan jalankan:
```bash
python3 server.py
```
Akses dari peramban:
- Komputer / Laptop: `http://localhost:3001`
- Smartphone / Tablet (Wi-Fi sama): `http://<IP-LOKAL-ANDA>:3001` (dapat dilihat langsung pada modal "Akses HP").

### Alternatif: Buka File Langsung
Aplikasi juga dapat dijalankan secara langsung dengan membuka file `index.html` di peramban web modern tanpa instalasi server.

---

## 📂 Struktur Berkas

```
barcode-generator/
├── index.html                       # Antarmuka web utama
├── css/
│   └── style.css                    # Styling modern & stylesheet cetak (@media print)
├── js/
│   ├── JsBarcode.all.min.js         # Library rendering barcode offline
│   ├── xlsx.full.min.js             # Library parsing spreadsheet Excel offline
│   ├── id-generator.js              # Generator nomor identitas unik & registry anti-duplikasi
│   ├── barcode-engine.js            # Barcode engine (Code 128 Auto, Code 39, EAN-13)
│   ├── exporter.js                  # Modul ekspor PNG, SVG, CSV, ZIP, dan Lembaran 30 Label
│   └── app.js                       # Controller utama antarmuka & event listener
├── tests/
│   └── test-verifier.js             # 14 unit test logika & verifikasi barcode
├── Hartadinata_Abadi_Shop_Sample.xlsx # Template data Excel toko Hartadinata (30 baris)
├── Butik_Emas_Antam_Sample.xlsx     # Template data Excel Butik Antam (30 baris)
├── server.py                        # Server HTTP lokal Python dengan endpoint parse Excel
└── README.md                        # Dokumentasi penggunaan
```
