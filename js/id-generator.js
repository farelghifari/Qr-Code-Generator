/**
 * BarCodeID Studio - Unique ID Generator & Registry
 * Mengelola pembuatan berbagai pola nomor identitas unik tanpa duplikasi.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.IdGenerator = factory(root);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';
  root = root || (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));

  // Charsets
  const CHARSET_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Tanpa 'I' dan 'O' untuk meminimalkan kebingungan pembacaan
  const CHARSET_NUMBERS = '0123456789';
  const CHARSET_LOWER = 'abcdefghijkmnpqrstuvwxyz';
  const CHARSET_FULL_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  class UniqueIdRegistry {
    constructor() {
      this.historySet = new Set();
      this.storageKey = 'barcode_id_studio_history_v5';
      // Bersihkan riwayat lama jika ada agar bersih 0 ID
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('barcode_id_studio_history_v1');
          localStorage.removeItem('barcode_id_studio_history_v2');
          localStorage.removeItem('barcode_id_studio_history_v3');
          localStorage.removeItem('barcode_id_studio_history_v4');
          localStorage.removeItem('barcode_studio_items_v1');
          localStorage.removeItem('barcode_studio_items_v2');
          localStorage.removeItem('barcode_studio_items_v3');
          localStorage.removeItem('barcode_studio_items_v4');
        }
      } catch (e) {}
      this.loadFromStorage();
    }

    loadFromStorage() {
      try {
        if (typeof localStorage !== 'undefined') {
          const saved = localStorage.getItem(this.storageKey);
          if (saved) {
            const arr = JSON.parse(saved);
            this.historySet = new Set(arr);
          }
        }
      } catch (e) {
        console.warn('Gagal memuat riwayat ID dari localStorage', e);
      }
    }

    saveToStorage() {
      try {
        if (typeof localStorage !== 'undefined') {
          // Simpan maksimal 5000 ID terakhir untuk efisiensi
          const arr = Array.from(this.historySet).slice(-5000);
          localStorage.setItem(this.storageKey, JSON.stringify(arr));
        }
      } catch (e) {
        console.warn('Gagal menyimpan riwayat ID ke localStorage', e);
      }
    }

    has(id) {
      return this.historySet.has(id);
    }

    add(id) {
      const isNew = !this.historySet.has(id);
      this.historySet.add(id);
      return isNew;
    }

    addBatch(ids) {
      let newCount = 0;
      for (const id of ids) {
        if (!this.historySet.has(id)) {
          this.historySet.add(id);
          newCount++;
        }
      }
      this.saveToStorage();
      return newCount;
    }

    clear() {
      this.historySet.clear();
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('barcode_id_studio_history_v1');
          localStorage.removeItem('barcode_id_studio_history_v2');
          localStorage.removeItem(this.storageKey);
        }
      } catch (e) {}
    }

    size() {
      return this.historySet.size;
    }
  }

  const globalRegistry = new UniqueIdRegistry();

  /**
   * Helper: pad number dengan angka 0 di depan
   */
  function padZero(num, length) {
    let s = String(num);
    while (s.length < length) {
      s = '0' + s;
    }
    return s;
  }

  /**
   * 1. Mode Berurutan (Auto-Increment / Sequential)
   */
  function generateSequential(options = {}) {
    const {
      prefix = 'ITEM-',
      startNum = 1,
      count = 10,
      padLength = 4,
      suffix = '',
      step = 1,
      checkGlobalHistory = false
    } = options;

    const results = [];
    let current = parseInt(startNum, 10) || 1;
    const safeCount = Math.max(1, Math.min(parseInt(count, 10) || 10, 10000));
    const safeStep = Math.max(1, parseInt(step, 10) || 1);

    let attempts = 0;
    while (results.length < safeCount && attempts < 100000) {
      attempts++;
      const id = `${prefix}${padZero(current, padLength)}${suffix}`;
      current += safeStep;

      if (checkGlobalHistory && globalRegistry.has(id)) {
        continue; // Lewati jika sudah pernah di-generate sebelumnya
      }

      results.push(id);
    }

    return results;
  }

  /**
   * 2. Mode Alfanumerik Acak (Random Alphanumeric)
   */
  function generateAlphanumeric(options = {}) {
    const {
      prefix = 'SN-',
      length = 6,
      count = 10,
      suffix = '',
      useUpper = true,
      useLower = false,
      useNumbers = true,
      avoidAmbiguous = true, // Menghindari 0 vs O, 1 vs I
      checkGlobalHistory = false
    } = options;

    let chars = '';
    if (useUpper) {
      chars += avoidAmbiguous ? CHARSET_UPPER : CHARSET_FULL_ALPHA;
    }
    if (useLower) {
      chars += CHARSET_LOWER;
    }
    if (useNumbers) {
      chars += CHARSET_NUMBERS;
    }
    if (!chars) {
      chars = CHARSET_UPPER + CHARSET_NUMBERS;
    }

    const safeCount = Math.max(1, Math.min(parseInt(count, 10) || 10, 10000));
    const safeLength = Math.max(3, Math.min(parseInt(length, 10) || 6, 32));
    const results = new Set();
    const maxAttempts = Math.max(safeCount * 50, 50000);
    let attempts = 0;

    const getRandomChar = () => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return chars[buf[0] % chars.length];
      }
      return chars[Math.floor(Math.random() * chars.length)];
    };

    while (results.size < safeCount && attempts < maxAttempts) {
      attempts++;
      let randPart = '';
      for (let i = 0; i < safeLength; i++) {
        randPart += getRandomChar();
      }
      const id = `${prefix}${randPart}${suffix}`;

      if (checkGlobalHistory && globalRegistry.has(id)) {
        continue;
      }

      results.add(id);
    }

    return Array.from(results);
  }

  /**
   * 3. Mode Berbasis Waktu / Timestamp
   * Format: YYYYMMDD-HHmmss-XXX (dijamin urut & unik)
   */
  function generateTimestamp(options = {}) {
    const {
      prefix = 'TS-',
      count = 10,
      suffix = ''
    } = options;

    const safeCount = Math.max(1, Math.min(parseInt(count, 10) || 10, 10000));
    const results = [];
    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = padZero(now.getMonth() + 1, 2);
    const dd = padZero(now.getDate(), 2);
    const hh = padZero(now.getHours(), 2);
    const min = padZero(now.getMinutes(), 2);
    const ss = padZero(now.getSeconds(), 2);

    const baseDate = `${yyyy}${mm}${dd}-${hh}${min}${ss}`;

    for (let i = 1; i <= safeCount; i++) {
      const seq = padZero(i, 4);
      results.push(`${prefix}${baseDate}-${seq}${suffix}`);
    }

    return results;
  }

  /**
   * 4. Mode UUID / GUID (v4 atau Short)
   */
  function generateUUID(options = {}) {
    const {
      prefix = '',
      count = 10,
      suffix = '',
      shortFormat = true
    } = options;

    const safeCount = Math.max(1, Math.min(parseInt(count, 10) || 10, 10000));
    const results = new Set();
    let attempts = 0;

    const createUUID4 = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    while (results.size < safeCount && attempts < safeCount * 20) {
      attempts++;
      let raw = createUUID4();
      let idBody = raw;
      if (shortFormat) {
        idBody = raw.replace(/-/g, '').substring(0, 10).toUpperCase();
      }
      results.add(`${prefix}${idBody}${suffix}`);
    }

    return Array.from(results);
  }

  /**
   * 5. Mode Parsing Custom List (dari Textarea / CSV)
   * Mendeteksi duplikasi internal maupun terhadap registry
   */
  function parseCustomList(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return {
        items: [],
        duplicates: [],
        totalLines: 0,
        validCount: 0
      };
    }

    const lines = rawText.split(/\r?\n/);
    const seen = new Set();
    const duplicates = [];
    const items = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (seen.has(trimmed)) {
        duplicates.push(trimmed);
      } else {
        seen.add(trimmed);
        items.push(trimmed);
      }
    }

    return {
      items,
      duplicates,
      totalLines: lines.length,
      validCount: items.length
    };
  }

  return {
    registry: globalRegistry,
    UniqueIdRegistry,
    generateSequential,
    generateAlphanumeric,
    generateTimestamp,
    generateUUID,
    parseCustomList,
    padZero
  };
});
