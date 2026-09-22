/**
 * BarCodeID Studio - Main Application Controller
 * Mengintegrasikan UI, Generator ID Unik, Barcode Engine, Exporter, dan Barcode Management System.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const ITEMS_STORAGE_KEY = 'barcode_studio_items_v3';
  const BATCHES_STORAGE_KEY = 'barcode_studio_batches_v1';

  // Template Presets Dictionary
  const TEMPLATE_PRESETS = {
    'tj-107': {
      name: 'Tom & Jerry No. 107',
      paperWidthMm: 165,
      paperHeightMm: 210,
      labelWidthMm: 50,
      labelHeightMm: 18,
      cols: 3,
      rows: 10,
      topMarginMm: 7,
      leftMarginMm: 3,
      colGapMm: 5,
      rowGapMm: 2,
      description: 'Kertas 16,5 × 21 cm • 3 Kolom × 10 Baris (30 Label)'
    },
    'tj-108': {
      name: 'Tom & Jerry No. 108',
      paperWidthMm: 165,
      paperHeightMm: 210,
      labelWidthMm: 38,
      labelHeightMm: 18,
      cols: 4,
      rows: 10,
      topMarginMm: 7,
      leftMarginMm: 3.5,
      colGapMm: 3,
      rowGapMm: 2,
      description: 'Kertas 16,5 × 21 cm • 4 Kolom × 10 Baris (40 Label)'
    },
    'tj-121': {
      name: 'Tom & Jerry No. 121',
      paperWidthMm: 165,
      paperHeightMm: 210,
      labelWidthMm: 75,
      labelHeightMm: 38,
      cols: 2,
      rows: 5,
      topMarginMm: 10,
      leftMarginMm: 5,
      colGapMm: 5,
      rowGapMm: 2,
      description: 'Kertas 16,5 × 21 cm • 2 Kolom × 5 Baris (10 Label)'
    },
    'a4-3x10': {
      name: 'Kertas Stiker A4 (3×10)',
      paperWidthMm: 210,
      paperHeightMm: 297,
      labelWidthMm: 70,
      labelHeightMm: 29.7,
      cols: 3,
      rows: 10,
      topMarginMm: 0,
      leftMarginMm: 0,
      colGapMm: 0,
      rowGapMm: 0,
      description: 'Kertas A4 21 × 29,7 cm • 3 Kolom × 10 Baris (30 Label)'
    },
    'a4-2x7': {
      name: 'Kertas Stiker A4 (2×7)',
      paperWidthMm: 210,
      paperHeightMm: 297,
      labelWidthMm: 105,
      labelHeightMm: 42.4,
      cols: 2,
      rows: 7,
      topMarginMm: 0,
      leftMarginMm: 0,
      colGapMm: 0,
      rowGapMm: 0,
      description: 'Kertas A4 21 × 29,7 cm • 2 Kolom × 7 Baris (14 Label)'
    },
    'thermal': {
      name: 'Printer Thermal Roll',
      paperWidthMm: 50,
      paperHeightMm: 30,
      labelWidthMm: 50,
      labelHeightMm: 30,
      cols: 1,
      rows: 1,
      topMarginMm: 0,
      leftMarginMm: 0,
      colGapMm: 0,
      rowGapMm: 0,
      description: 'Thermal Roll 50 × 30 mm • 1 Label per cetak'
    },
    'custom': {
      name: 'Kustom',
      paperWidthMm: 165,
      paperHeightMm: 210,
      labelWidthMm: 50,
      labelHeightMm: 18,
      cols: 3,
      rows: 10,
      topMarginMm: 7,
      leftMarginMm: 3,
      colGapMm: 5,
      rowGapMm: 2,
      description: 'Ukuran Disesuaikan Manual'
    }
  };

  // State
  let currentMode = 'sequential';
  let currentView = 'grid'; // 'grid' | 'management'
  let currentCodeType = 'QR'; // 'QR' (default) | 'CODE128'
  let generatedItems = [];  // Array of { id, label, brand, gramasi, vault, lemari, laci, kotak, extraRows, batchId, batchName, format, status, createdAt, timestamp }
  let batches = []; // Array of { id, name, createdAt, format }
  let activeFolderId = 'all'; // For Grid View filtering
  let lastFilteredItems = [];
  let selectedIds = new Set();
  let currentEditingItem = null;
  let pregenExtraRows = []; // array of { key, value }
  let modalExtraRows = []; // array of { key, value }

  // DOM Elements - View Switcher
  const tabViewGrid = document.getElementById('tab-view-grid');
  const tabViewManagement = document.getElementById('tab-view-management');
  const barcodeGridView = document.getElementById('barcode-grid-view');
  const barcodeManagementView = document.getElementById('barcode-management-view');
  const managementCountPill = document.getElementById('management-count-pill');

  // DOM Elements - Batch & Folder
  const batchNameInput = document.getElementById('batch-name-input');
  const folderFilterBar = document.getElementById('folder-filter-bar');
  const folderPillsContainer = document.getElementById('folder-pills-container');
  const activeFolderTitle = document.getElementById('active-folder-title');
  const activeFolderCountBadge = document.getElementById('active-folder-count-badge');
  const btnFolderSheetDownload = document.getElementById('btn-folder-sheet-download');
  const btnFolderZipDownload = document.getElementById('btn-folder-zip-download');

  // DOM Elements - Code Type Switcher
  const btnTypeBarcode = document.getElementById('btn-type-barcode');
  const btnTypeQr = document.getElementById('btn-type-qr');
  const activeTypeBadge = document.getElementById('active-type-badge');
  const barcode1dSymbologyGroup = document.getElementById('barcode-1d-symbology-group');

  // DOM Elements - Template Preset & Custom Dimensions
  const presetTemplateSelect = document.getElementById('preset-template-select');
  const btnToggleCustomDim = document.getElementById('btn-toggle-custom-dim');
  const btnCustomDimText = document.getElementById('btn-custom-dim-text');
  const panelCustomDimensions = document.getElementById('panel-custom-dimensions');
  const templateSummaryText = document.getElementById('template-summary-text');
  const templateLabelDimTag = document.getElementById('template-label-dim-tag');
  const dimTotalCapacityTag = document.getElementById('dim-total-capacity-tag');

  const dimPaperW = document.getElementById('dim-paper-w');
  const dimPaperH = document.getElementById('dim-paper-h');
  const dimLabelW = document.getElementById('dim-label-w');
  const dimLabelH = document.getElementById('dim-label-h');
  const dimCols = document.getElementById('dim-cols');
  const dimRows = document.getElementById('dim-rows');
  const dimMarginTop = document.getElementById('dim-margin-top');
  const dimMarginLeft = document.getElementById('dim-margin-left');
  const dimGapCol = document.getElementById('dim-gap-col');
  const dimGapRow = document.getElementById('dim-gap-row');

  // DOM Elements - Layout & Typography Controls
  const layoutPositionSelect = document.getElementById('layout-position-select');
  const fontSizeTitleSlider = document.getElementById('font-size-title-slider');
  const fontSizeTitleVal = document.getElementById('font-size-title-val');
  const fontSizeDetailsSlider = document.getElementById('font-size-details-slider');
  const fontSizeDetailsVal = document.getElementById('font-size-details-val');
  const fontSizeIdSlider = document.getElementById('font-size-id-slider');
  const fontSizeIdVal = document.getElementById('font-size-id-val');

  // DOM Elements - Pre-generation Extra Rows
  const pregenExtraRowsList = document.getElementById('pregen-extra-rows-list');
  const btnAddPregenRow = document.getElementById('btn-add-pregen-row');

  // DOM Elements - Mode Tabs & Panels
  const tabButtons = document.querySelectorAll('.tab-btn');
  const modePanels = {
    sequential: document.getElementById('panel-mode-sequential'),
    alphanumeric: document.getElementById('panel-mode-alphanumeric'),
    timestamp: document.getElementById('panel-mode-timestamp'),
    uuid: document.getElementById('panel-mode-uuid'),
    custom: document.getElementById('panel-mode-custom'),
    single: document.getElementById('panel-mode-single')
  };

  const quantityGroup = document.getElementById('quantity-control-group');
  const inputCount = document.getElementById('input-count');
  const sliderCount = document.getElementById('slider-count');

  // Preview & Settings Elements
  const seqPrefix = document.getElementById('seq-prefix');
  const seqSuffix = document.getElementById('seq-suffix');
  const seqStart = document.getElementById('seq-start');
  const seqPad = document.getElementById('seq-pad');
  const seqPreviewText = document.getElementById('seq-preview-text');

  const randPrefix = document.getElementById('rand-prefix');
  const randLength = document.getElementById('rand-length');
  const randOptUpper = document.getElementById('rand-opt-upper');
  const randOptNum = document.getElementById('rand-opt-num');
  const randOptLower = document.getElementById('rand-opt-lower');
  const randPreviewText = document.getElementById('rand-preview-text');

  const tsPrefix = document.getElementById('ts-prefix');
  const uuidPrefix = document.getElementById('uuid-prefix');
  const uuidShort = document.getElementById('uuid-short');

  const customTextarea = document.getElementById('custom-textarea');
  const customLinesCount = document.getElementById('custom-lines-count');
  const customDupWarning = document.getElementById('custom-duplicates-warning');
  const customDupCount = document.getElementById('custom-dup-count');

  // Excel / CSV Import Elements
  const excelDropzone = document.getElementById('excel-dropzone');
  const excelFileInput = document.getElementById('excel-file-input');
  const excelPreviewBox = document.getElementById('excel-preview-box');
  const excelFileName = document.getElementById('excel-file-name');
  const excelRowCountBadge = document.getElementById('excel-row-count-badge');
  const btnClearExcel = document.getElementById('btn-clear-excel');
  const excelColId = document.getElementById('excel-col-id');
  const excelColLabel = document.getElementById('excel-col-label');
  const excelHasHeader = document.getElementById('excel-has-header');
  const excelSheetNameBadge = document.getElementById('excel-sheet-name-badge');
  const btnGenerateFromExcel = document.getElementById('btn-generate-from-excel');
  const btnExcelCountTag = document.getElementById('btn-excel-count-tag');

  // Mode Format Emas (Hartadinata / Antam) Elements
  const btnFmtGold = document.getElementById('btn-fmt-gold');
  const btnFmtStandard = document.getElementById('btn-fmt-standard');
  const panelGoldMapping = document.getElementById('panel-gold-mapping');
  const panelStandardMapping = document.getElementById('panel-standard-mapping');
  const goldBrandAutotag = document.getElementById('gold-brand-autotag');
  const goldBrandHarta = document.getElementById('gold-brand-harta');
  const goldBrandAntam = document.getElementById('gold-brand-antam');
  const goldBrandCustomRadio = document.getElementById('gold-brand-custom-radio');
  const goldBrandCustomInput = document.getElementById('gold-brand-custom-input');
  const goldColId = document.getElementById('gold-col-id');
  const goldColGramasi = document.getElementById('gold-col-gramasi');
  const goldColVault = document.getElementById('gold-col-vault');
  const goldColLemari = document.getElementById('gold-col-lemari');
  const goldColLaci = document.getElementById('gold-col-laci');
  const goldColKotak = document.getElementById('gold-col-kotak');
  const goldLayout2lines = document.getElementById('gold-layout-2lines');
  const goldLayout1line = document.getElementById('gold-layout-1line');
  const excelSampleGoldPreview = document.getElementById('excel-sample-gold-preview');
  const excelSampleIdPreview = document.getElementById('excel-sample-id-preview');

  // State for Excel / CSV
  let excelRawMatrix = null;
  let excelRawRows = null;
  let excelHeaders = [];
  let excelCurrentFileName = '';
  let excelCurrentSheetName = '';
  let excelFormatMode = 'gold'; // 'gold' (default) or 'standard'
  let customExcelItemsToGenerate = null;

  const singleIdInput = document.getElementById('single-id-input');
  const btnSingleRandomize = document.getElementById('btn-single-randomize');

  // Barcode Appearance Inputs
  const barcodeFormat = document.getElementById('barcode-format');
  const topLabelInput = document.getElementById('top-label-input');
  const barWidthSlider = document.getElementById('bar-width-slider');
  const barWidthVal = document.getElementById('bar-width-val');
  const barHeightSlider = document.getElementById('bar-height-slider');
  const barHeightVal = document.getElementById('bar-height-val');
  const showTextCheckbox = document.getElementById('show-text-checkbox');
  const checkHistoryCheckbox = document.getElementById('check-history-checkbox');

  // Action Buttons
  const btnGenerate = document.getElementById('btn-generate');
  const btnDownloadZip = document.getElementById('btn-download-zip');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnQuickDownloadSheet = document.getElementById('btn-quick-download-sheet');
  const btnOpenPrintModal = document.getElementById('btn-open-print-modal');

  // Results & Grid Elements
  const barcodeGrid = document.getElementById('barcode-grid');
  const emptyState = document.getElementById('empty-state');
  const registryCountBadge = document.getElementById('registry-count-badge');
  const searchFilterInput = document.getElementById('search-filter-input');

  // Management Table Elements
  const statTotalCount = document.getElementById('stat-total-count');
  const statPendingCount = document.getElementById('stat-pending-count');
  const statPrintedCount = document.getElementById('stat-printed-count');
  const tableSelectAll = document.getElementById('table-select-all');
  const tableSelectedCountBadge = document.getElementById('table-selected-count-badge');
  const tableFolderFilter = document.getElementById('table-folder-filter');
  const tableStatusFilter = document.getElementById('table-status-filter');
  const btnBatchMarkPrinted = document.getElementById('btn-batch-mark-printed');
  const btnBatchMarkPending = document.getElementById('btn-batch-mark-pending');
  const btnBatchDelete = document.getElementById('btn-batch-delete');
  const barcodeTableBody = document.getElementById('barcode-table-body');
  const tableEmptyMessage = document.getElementById('table-empty-message');

  // Edit Modal Elements
  const editBarcodeModal = document.getElementById('edit-barcode-modal');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnSaveEdit = document.getElementById('btn-save-edit');
  const modalEditId = document.getElementById('modal-edit-id');
  const modalEditFormat = document.getElementById('modal-edit-format');
  const modalEditBrand = document.getElementById('modal-edit-brand');
  const modalEditGramasi = document.getElementById('modal-edit-gramasi');
  const modalEditVault = document.getElementById('modal-edit-vault');
  const modalEditLemari = document.getElementById('modal-edit-lemari');
  const modalEditLaci = document.getElementById('modal-edit-laci');
  const modalEditKotak = document.getElementById('modal-edit-kotak');
  const modalEditBatch = document.getElementById('modal-edit-batch');
  const modalEditStatus = document.getElementById('modal-edit-status');
  const modalExtraRowsContainer = document.getElementById('modal-extra-rows-container');
  const btnAddModalRow = document.getElementById('btn-add-modal-row');
  const modalPreviewCanvas = document.getElementById('modal-preview-canvas');
  const modalPreviewDimTag = document.getElementById('modal-preview-dim-tag');

  // Print & History Modals & Overlays
  const printModal = document.getElementById('print-modal');
  const btnClosePrintModal = document.getElementById('btn-close-print-modal');
  const btnCancelPrint = document.getElementById('btn-cancel-print');
  const btnExecutePrint = document.getElementById('btn-execute-print');
  const printSheetSelect = document.getElementById('print-sheet-select');
  const btnDownloadSheetPng = document.getElementById('btn-download-sheet-png');
  const printShowBordersChk = document.getElementById('print-show-borders-chk');

  const historyModal = document.getElementById('history-modal');
  const btnOpenHistory = document.getElementById('btn-open-history');
  const btnCloseHistoryModal = document.getElementById('btn-close-history-modal');
  const btnDismissHistory = document.getElementById('btn-dismiss-history');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const historyListContainer = document.getElementById('history-list-container');
  const btnResetAll = document.getElementById('btn-reset-all');

  // Device Access Modal Elements (HP / Tablet)
  const deviceAccessModal = document.getElementById('device-access-modal');
  const btnOpenDeviceAccess = document.getElementById('btn-open-device-access');
  const btnCloseDeviceModal = document.getElementById('btn-close-device-modal');
  const btnDismissDeviceModal = document.getElementById('btn-dismiss-device-modal');
  const btnCopyNetworkUrl = document.getElementById('btn-copy-network-url');
  const networkUrlInput = document.getElementById('network-url-input');
  const deviceQrImg = document.getElementById('device-qr-img');
  const deviceQrContainer = document.getElementById('device-qr-container');

  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const toastContainer = document.getElementById('toast-container');

  // --- HELPER: TOAST NOTIFICATION ---
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        ${type === 'error'
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
          : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'}
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- STORAGE MANAGEMENT ---
  function saveBatchesToStorage() {
    try {
      localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(batches));
    } catch (e) {
      console.warn('Gagal menyimpan batches ke localStorage', e);
    }
  }

  function loadBatchesFromStorage() {
    try {
      const saved = localStorage.getItem(BATCHES_STORAGE_KEY);
      if (saved) {
        batches = JSON.parse(saved);
      } else {
        batches = [];
      }
    } catch (e) {
      batches = [];
    }
  }

  function saveItemsToStorage() {
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(generatedItems));
    } catch (e) {
      console.warn('Gagal menyimpan items ke localStorage', e);
    }
    saveBatchesToStorage();
  }

  function loadItemsFromStorage() {
    loadBatchesFromStorage();
    try {
      const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
      if (saved) {
        generatedItems = JSON.parse(saved);
      } else {
        generatedItems = [];
      }
    } catch (e) {
      generatedItems = [];
    }

    // Ensure backwards compatibility for batches and item attributes
    if (generatedItems.length > 0) {
      let needsBatchSave = false;
      generatedItems.forEach(item => {
        if (!item.batchId) {
          const defaultBatchName = 'Batch Awal';
          let defB = batches.find(b => b.name === defaultBatchName);
          if (!defB) {
            defB = { id: 'batch_default', name: defaultBatchName, createdAt: item.createdAt || 'Awal' };
            batches.push(defB);
            needsBatchSave = true;
          }
          item.batchId = defB.id;
          item.batchName = defB.name;
        }
        if (!Array.isArray(item.extraRows)) {
          item.extraRows = [];
        }
      });
      if (needsBatchSave) {
        saveBatchesToStorage();
      }
    }
  }

  // --- UPDATE BADGES & STATS ---
  function updateStats() {
    const total = generatedItems.length;
    const printed = generatedItems.filter(item => item.status === 'printed').length;
    const pending = total - printed;

    // Registry badge
    const regCount = IdGenerator.registry.size();
    registryCountBadge.textContent = `${regCount} ID`;

    // Pill badge & management stats
    if (managementCountPill) managementCountPill.textContent = total;
    if (statTotalCount) statTotalCount.textContent = total;
    if (statPendingCount) statPendingCount.textContent = pending;
    if (statPrintedCount) statPrintedCount.textContent = printed;

    // Selected count badge
    if (tableSelectedCountBadge) {
      tableSelectedCountBadge.textContent = `${selectedIds.size} terpilih`;
    }
  }

  // --- VIEW SWITCHING ---
  function switchView(viewName) {
    currentView = viewName;
    if (viewName === 'grid') {
      tabViewGrid.classList.add('bg-white', 'text-indigo-700', 'shadow-sm');
      tabViewGrid.classList.remove('text-slate-600');
      tabViewManagement.classList.remove('bg-white', 'text-indigo-700', 'shadow-sm');
      tabViewManagement.classList.add('text-slate-600');

      barcodeGridView.classList.remove('hidden');
      barcodeGridView.classList.add('block');
      barcodeManagementView.classList.add('hidden');
      barcodeManagementView.classList.remove('flex');
    } else {
      tabViewManagement.classList.add('bg-white', 'text-indigo-700', 'shadow-sm');
      tabViewManagement.classList.remove('text-slate-600');
      tabViewGrid.classList.remove('bg-white', 'text-indigo-700', 'shadow-sm');
      tabViewGrid.classList.add('text-slate-600');

      barcodeGridView.classList.add('hidden');
      barcodeGridView.classList.remove('block');
      barcodeManagementView.classList.remove('hidden');
      barcodeManagementView.classList.add('flex');
      renderManagementTable();
    }
  }

  if (tabViewGrid) tabViewGrid.addEventListener('click', () => switchView('grid'));
  if (tabViewManagement) tabViewManagement.addEventListener('click', () => switchView('management'));

  // --- TAB SWITCHING (GENERATOR MODES) ---
  function activateMode(mode) {
    tabButtons.forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    currentMode = mode;

    Object.keys(modePanels).forEach(key => {
      if (modePanels[key]) {
        modePanels[key].classList.toggle('hidden', key !== mode);
      }
    });

    if (mode === 'custom' || mode === 'single') {
      quantityGroup.classList.add('hidden');
    } else {
      quantityGroup.classList.remove('hidden');
    }

    updateModePreviews();
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateMode(btn.dataset.mode);
    });
  });

  // --- QUANTITY SLIDER & INPUT SYNC ---
  sliderCount.addEventListener('input', (e) => {
    inputCount.value = e.target.value;
  });

  inputCount.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 1000) {
      sliderCount.value = Math.min(val, 100);
    }
  });

  // --- SLIDERS BARCODE SYNC ---
  barWidthSlider.addEventListener('input', (e) => {
    barWidthVal.textContent = e.target.value;
    updateLiveBarcodeStyles();
  });

  barHeightSlider.addEventListener('input', (e) => {
    barHeightVal.textContent = e.target.value;
    updateLiveBarcodeStyles();
  });

  // --- MODE PREVIEW TEXT UPDATES ---
  function updateModePreviews() {
    const pfx = seqPrefix.value || '';
    const sfx = seqSuffix.value || '';
    const st = parseInt(seqStart.value, 10) || 1;
    const pad = parseInt(seqPad.value, 10) || 4;
    seqPreviewText.textContent = `${pfx}${IdGenerator.padZero(st, pad)}${sfx}, ${pfx}${IdGenerator.padZero(st + 1, pad)}${sfx}...`;

    const rPfx = randPrefix.value || '';
    const rLen = parseInt(randLength.value, 10) || 6;
    randPreviewText.textContent = `${rPfx}${'X'.repeat(rLen)}, ${rPfx}${'Y'.repeat(rLen)}...`;
  }

  [seqPrefix, seqSuffix, seqStart, seqPad].forEach(el => el.addEventListener('input', updateModePreviews));
  [randPrefix, randLength, randOptUpper, randOptNum, randOptLower].forEach(el => el.addEventListener('input', updateModePreviews));

  // --- SINGLE MODE RANDOMIZE BUTTON ---
  btnSingleRandomize.addEventListener('click', () => {
    const rand = IdGenerator.generateAlphanumeric({
      prefix: 'ID-',
      length: 7,
      count: 1,
      useUpper: true,
      useNumbers: true
    });
    singleIdInput.value = rand[0];
  });

  // --- CUSTOM TEXTAREA DUPLICATE CHECKER ---
  customTextarea.addEventListener('input', () => {
    const text = customTextarea.value;
    const parsed = IdGenerator.parseCustomList(text);
    customLinesCount.textContent = `${parsed.validCount} nomor valid`;

    if (parsed.duplicates.length > 0) {
      customDupWarning.classList.remove('hidden');
      customDupCount.textContent = `${parsed.duplicates.length}`;
    } else {
      customDupWarning.classList.add('hidden');
    }
  });

  // --- EXCEL & CSV FILE IMPORT LOGIC ---
  function parseCSVText(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    return lines.map(line => {
      const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
      const pattern = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^${delimiter}]*))`, 'g');
      const cells = [];
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const val = match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : '');
        cells.push(val.trim());
        if (pattern.lastIndex === match.index) {
          pattern.lastIndex++;
        }
      }
      return cells.length > 0 ? cells : line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    });
  }

  // Fallback membaca file lewat server Python jika browser XLSX bermasalah
  function fallbackParseServer(file) {
    fetch('/api/parse-excel', {
      method: 'POST',
      headers: {
        'X-Filename': encodeURIComponent(file.name)
      },
      body: file
    })
    .then(res => res.json())
    .then(data => {
      loadingOverlay.classList.remove('active');
      if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
        setupParsedExcelData(file.name, data.data, data.sheetName || 'Sheet1');
      } else {
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          const r = new FileReader();
          r.onload = (e) => {
            const raw = parseCSVText(e.target.result);
            setupParsedExcelData(file.name, raw, 'CSV');
          };
          r.readAsText(file);
        } else {
          showToast('Gagal memproses file Excel: ' + (data.error || 'Format tidak didukung'), 'error');
        }
      }
    })
    .catch(err => {
      loadingOverlay.classList.remove('active');
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const r = new FileReader();
        r.onload = (e) => {
          const raw = parseCSVText(e.target.result);
          setupParsedExcelData(file.name, raw, 'CSV');
        };
        r.readAsText(file);
      } else {
        showToast('Gagal membaca file Excel. Pastikan format .xlsx atau .csv valid.', 'error');
      }
    });
  }

  function handleExcelFile(file) {
    if (!file) return;

    // Otomatis pindah ke tab Excel / List
    activateMode('custom');

    loadingOverlay.classList.add('active');
    loadingText.textContent = `Membaca file ${file.name}...`;

    // Coba parsing langsung di browser jika library XLSX tersedia
    if (typeof XLSX !== 'undefined') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            showToast('Sheet di file Excel kosong.', 'error');
            loadingOverlay.classList.remove('active');
            return;
          }
          const worksheet = workbook.Sheets[firstSheetName];
          const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!rawMatrix || !rawMatrix.length) {
            showToast('Tidak ada data yang terbaca di sheet ini.', 'error');
            loadingOverlay.classList.remove('active');
            return;
          }
          loadingOverlay.classList.remove('active');
          setupParsedExcelData(file.name, rawMatrix, firstSheetName);
        } catch (err) {
          console.warn('Browser XLSX parsing error, mencoba fallback server...', err);
          fallbackParseServer(file);
        }
      };
      reader.onerror = () => {
        fallbackParseServer(file);
      };
      reader.readAsArrayBuffer(file);
    } else {
      fallbackParseServer(file);
    }
  }

  function detectGoldBrandFromFilename(fn) {
    const lower = (fn || '').toLowerCase();
    if (lower.includes('harta') || lower.includes('hartadinata')) return 'Harta';
    if (lower.includes('antam') || lower.includes('butik')) return 'Antam';
    return null;
  }

  function getGoldBrand() {
    if (goldBrandAntam && goldBrandAntam.checked) return 'Antam';
    if (goldBrandCustomRadio && goldBrandCustomRadio.checked) {
      return (goldBrandCustomInput && goldBrandCustomInput.value.trim()) || 'Harta';
    }
    return 'Harta';
  }

  function setExcelFormatMode(mode) {
    excelFormatMode = mode;
    if (mode === 'gold') {
      if (btnFmtGold) btnFmtGold.className = 'flex-1 py-1.5 px-2 rounded-md bg-white text-indigo-700 shadow-2xs text-center transition flex items-center justify-center gap-1 font-bold';
      if (btnFmtStandard) btnFmtStandard.className = 'flex-1 py-1.5 px-2 rounded-md text-slate-600 hover:text-slate-900 text-center transition font-semibold';
      if (panelGoldMapping) panelGoldMapping.classList.remove('hidden');
      if (panelStandardMapping) panelStandardMapping.classList.add('hidden');
    } else {
      if (btnFmtStandard) btnFmtStandard.className = 'flex-1 py-1.5 px-2 rounded-md bg-white text-indigo-700 shadow-2xs text-center transition flex items-center justify-center gap-1 font-bold';
      if (btnFmtGold) btnFmtGold.className = 'flex-1 py-1.5 px-2 rounded-md text-slate-600 hover:text-slate-900 text-center transition font-semibold';
      if (panelStandardMapping) panelStandardMapping.classList.remove('hidden');
      if (panelGoldMapping) panelGoldMapping.classList.add('hidden');
    }
    updateExcelSample();
  }

  function formatGoldRowLabel(row, is2Lines = true) {
    if (!row) return '';
    const brand = getGoldBrand();
    const gIdx = parseInt(goldColGramasi ? goldColGramasi.value : '-1', 10);
    const vIdx = parseInt(goldColVault ? goldColVault.value : '-1', 10);
    const lemIdx = parseInt(goldColLemari ? goldColLemari.value : '-1', 10);
    const lacIdx = parseInt(goldColLaci ? goldColLaci.value : '-1', 10);
    const kIdx = parseInt(goldColKotak ? goldColKotak.value : '-1', 10);

    const gramasi = (gIdx >= 0 && row[gIdx] !== undefined) ? String(row[gIdx]).trim() : '';
    const vault = (vIdx >= 0 && row[vIdx] !== undefined) ? String(row[vIdx]).trim() : '';
    const lemari = (lemIdx >= 0 && row[lemIdx] !== undefined) ? String(row[lemIdx]).trim() : '';
    const laci = (lacIdx >= 0 && row[lacIdx] !== undefined) ? String(row[lacIdx]).trim() : '';
    const kotak = (kIdx >= 0 && row[kIdx] !== undefined) ? String(row[kIdx]).trim() : '';

    const line1 = [brand, gramasi].filter(Boolean).join(' - ');
    const line2 = [vault, lemari, laci, kotak].filter(Boolean).join(' - ');

    if (!line2) return line1;
    if (!line1) return line2;

    if (is2Lines) {
      return `${line1}\n${line2}`;
    }
    return `${line1} - ${line2}`;
  }

  function setupParsedExcelData(fileName, rawMatrix, sheetName) {
    const nonEmptyRows = rawMatrix.filter(row => row && row.some(cell => String(cell).trim() !== ''));
    if (!nonEmptyRows.length) {
      showToast('File tidak memiliki data baris yang valid.', 'error');
      return;
    }

    excelRawMatrix = nonEmptyRows;
    excelCurrentFileName = fileName;
    excelCurrentSheetName = sheetName || 'Sheet1';

    // Auto deteksi brand Harta atau Antam dari nama file
    const detected = detectGoldBrandFromFilename(fileName);
    if (detected === 'Harta') {
      if (goldBrandHarta) goldBrandHarta.checked = true;
      if (goldBrandAutotag) goldBrandAutotag.textContent = 'Auto: Harta';
      setExcelFormatMode('gold');
    } else if (detected === 'Antam') {
      if (goldBrandAntam) goldBrandAntam.checked = true;
      if (goldBrandAutotag) goldBrandAutotag.textContent = 'Auto: Antam';
      setExcelFormatMode('gold');
    } else {
      const firstRowStr = (nonEmptyRows[0] || []).join(' ').toLowerCase();
      if (firstRowStr.includes('gram') || firstRowStr.includes('vault') || firstRowStr.includes('lemari')) {
        setExcelFormatMode('gold');
        if (goldBrandAutotag) goldBrandAutotag.textContent = 'Logam Mulia';
      }
    }

    applyExcelHeaderAndColumns();
    showToast(`Berhasil membaca ${excelRawRows.length} baris dari ${fileName}!`, 'success');
  }

  function applyExcelHeaderAndColumns() {
    if (!excelRawMatrix || !excelRawMatrix.length) return;

    const hasHeader = excelHasHeader ? excelHasHeader.checked : true;
    let headers = [];
    let dataRows = [];

    if (hasHeader && excelRawMatrix.length > 1) {
      const firstRow = excelRawMatrix[0];
      headers = firstRow.map((c, i) => String(c !== undefined && c !== null ? c : `Kolom ${i + 1}`).trim() || `Kolom ${i + 1}`);
      dataRows = excelRawMatrix.slice(1);
    } else {
      const colCount = Math.max(...excelRawMatrix.map(r => r.length));
      headers = Array.from({ length: colCount }, (_, i) => `Kolom ${i + 1} (${String.fromCharCode(65 + i)})`);
      dataRows = excelRawMatrix;
    }

    excelHeaders = headers;
    excelRawRows = dataRows;

    if (excelFileName) excelFileName.textContent = excelCurrentFileName;
    if (excelRowCountBadge) excelRowCountBadge.textContent = `${dataRows.length} Baris`;
    if (btnExcelCountTag) btnExcelCountTag.textContent = `${dataRows.length} ID`;
    if (excelSheetNameBadge) excelSheetNameBadge.textContent = excelCurrentSheetName;
    if (excelPreviewBox) excelPreviewBox.classList.remove('hidden');

    // 1. Populasi Dropdown Mode Standar
    if (excelColId && excelColLabel) {
      excelColId.innerHTML = '';
      excelColLabel.innerHTML = '<option value="-1">-- Tanpa Label --</option>';

      let bestIdCol = 0;
      let bestLabelCol = -1;

      headers.forEach((h, idx) => {
        const optId = document.createElement('option');
        optId.value = idx;
        optId.textContent = `${idx + 1}. ${h}`;
        excelColId.appendChild(optId);

        const optLabel = document.createElement('option');
        optLabel.value = idx;
        optLabel.textContent = `${idx + 1}. ${h}`;
        excelColLabel.appendChild(optLabel);

        const lower = h.toLowerCase();
        if (bestIdCol === 0 && (lower.includes('id') || lower.includes('kode') || lower.includes('sku') || lower.includes('code') || lower.includes('no') || lower.includes('barcode') || lower.includes('pesanan'))) {
          bestIdCol = idx;
        }
        if (bestLabelCol === -1 && (lower.includes('nama') || lower.includes('name') || lower.includes('label') || lower.includes('produk') || lower.includes('barang') || lower.includes('item') || lower.includes('desc') || lower.includes('deskripsi'))) {
          bestLabelCol = idx;
        }
      });

      excelColId.value = bestIdCol;
      excelColLabel.value = bestLabelCol;
    }

    // 2. Populasi 6 Dropdown Mode Emas (Harta / Antam)
    const goldSelects = [
      { el: goldColId, keywords: ['id', 'kode', 'barcode', 'order', 'pesanan', 'no'], defaultIdx: 0 },
      { el: goldColGramasi, keywords: ['gramasi', 'gram', 'berat', 'weight', 'gr'], defaultIdx: -1 },
      { el: goldColVault, keywords: ['vault', 'brankas', 'vlt'], defaultIdx: -1 },
      { el: goldColLemari, keywords: ['lemari', 'rak', 'cabinet', 'lmr'], defaultIdx: -1 },
      { el: goldColLaci, keywords: ['laci', 'drawer', 'lc'], defaultIdx: -1 },
      { el: goldColKotak, keywords: ['kotak', 'box', 'ktk'], defaultIdx: -1 }
    ];

    goldSelects.forEach(item => {
      if (!item.el) return;
      item.el.innerHTML = item.defaultIdx === -1 ? '<option value="-1">-- Kosong --</option>' : '';

      let bestMatch = item.defaultIdx;
      headers.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${idx + 1}. ${h}`;
        item.el.appendChild(opt);

        const lower = h.toLowerCase();
        if (bestMatch === -1 && item.keywords.some(k => lower.includes(k))) {
          bestMatch = idx;
        } else if (item.defaultIdx === 0 && bestMatch === 0 && item.keywords.some(k => lower.includes(k))) {
          bestMatch = idx;
        }
      });

      item.el.value = bestMatch >= 0 ? bestMatch : (item.defaultIdx >= 0 ? item.defaultIdx : -1);
    });

    updateExcelSample();
  }

  function updateExcelSample() {
    if (!excelRawRows || !excelRawRows.length) return;
    const firstRow = excelRawRows[0] || [];

    if (excelFormatMode === 'gold') {
      const is2Lines = goldLayout2lines ? goldLayout2lines.checked : true;
      const formatted = formatGoldRowLabel(firstRow, is2Lines);
      const idIdx = parseInt(goldColId ? goldColId.value : '0', 10) || 0;
      const sampleId = String(firstRow[idIdx] !== undefined ? firstRow[idIdx] : '').trim() || '(ID Otomatis)';

      if (excelSampleGoldPreview) {
        if (is2Lines && formatted.includes('\n')) {
          const [l1, l2] = formatted.split('\n');
          excelSampleGoldPreview.innerHTML = `
            <div class="font-bold text-amber-950 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              <span>${escapeHtml(l1)}</span>
            </div>
            <div class="text-[11px] text-slate-600 pl-3 font-medium">${escapeHtml(l2)}</div>
          `;
        } else {
          excelSampleGoldPreview.innerHTML = `<span class="font-bold text-amber-950">${escapeHtml(formatted)}</span>`;
        }
      }

      if (excelSampleIdPreview) {
        excelSampleIdPreview.textContent = `Barcode ID: ${sampleId}`;
      }
    } else {
      const colIdIdx = parseInt(excelColId ? excelColId.value : '0', 10) || 0;
      const colLabelIdx = parseInt(excelColLabel ? excelColLabel.value : '-1', 10);
      const sampleId = String(firstRow[colIdIdx] !== undefined ? firstRow[colIdIdx] : '').trim() || '(kosong)';
      const sampleLabel = (colLabelIdx >= 0 && firstRow[colLabelIdx] !== undefined) ? String(firstRow[colLabelIdx]).trim() : '';

      if (excelSampleGoldPreview) {
        excelSampleGoldPreview.innerHTML = sampleLabel 
          ? `<span class="font-bold text-slate-800">${escapeHtml(sampleLabel)}</span>`
          : `<span class="text-slate-400 italic">Tanpa Label Produk</span>`;
      }
      if (excelSampleIdPreview) {
        excelSampleIdPreview.textContent = `Barcode ID: ${sampleId}`;
      }
    }
  }

  if (excelFileInput) {
    excelFileInput.addEventListener('click', () => {
      excelFileInput.value = '';
    });

    excelFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleExcelFile(e.target.files[0]);
      }
    });
  }

  if (excelDropzone) {
    excelDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      excelDropzone.classList.add('border-emerald-500', 'bg-emerald-100/70');
    });

    excelDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      excelDropzone.classList.remove('border-emerald-500', 'bg-emerald-100/70');
    });

    excelDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      excelDropzone.classList.remove('border-emerald-500', 'bg-emerald-100/70');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleExcelFile(e.dataTransfer.files[0]);
      }
    });
  }

  // Drag & drop file Excel di seluruh window browser
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fn = file.name.toLowerCase();
      if (fn.endsWith('.xlsx') || fn.endsWith('.xls') || fn.endsWith('.csv') || fn.endsWith('.txt')) {
        handleExcelFile(file);
      }
    }
  });

  if (btnClearExcel) {
    btnClearExcel.addEventListener('click', (e) => {
      e.stopPropagation();
      excelRawMatrix = null;
      excelRawRows = null;
      excelHeaders = [];
      excelCurrentFileName = '';
      excelCurrentSheetName = '';
      customExcelItemsToGenerate = null;
      if (excelFileInput) excelFileInput.value = '';
      if (excelPreviewBox) excelPreviewBox.classList.add('hidden');
      showToast('File Excel dibatalkan. Anda dapat mengunggah file baru atau mengetik manual.');
    });
  }

  if (excelHasHeader) {
    excelHasHeader.addEventListener('change', () => {
      applyExcelHeaderAndColumns();
    });
  }

  if (excelColId) {
    excelColId.addEventListener('change', updateExcelSample);
  }
  if (excelColLabel) {
    excelColLabel.addEventListener('change', updateExcelSample);
  }

  // Format Mode Toggle (Logam Mulia vs Kolom Standar)
  if (btnFmtGold) {
    btnFmtGold.addEventListener('click', () => setExcelFormatMode('gold'));
  }
  if (btnFmtStandard) {
    btnFmtStandard.addEventListener('click', () => setExcelFormatMode('standard'));
  }

  // Brand Selector Listeners
  [goldBrandHarta, goldBrandAntam, goldBrandCustomRadio].forEach(radio => {
    if (radio) {
      radio.addEventListener('change', updateExcelSample);
    }
  });

  if (goldBrandCustomInput) {
    goldBrandCustomInput.addEventListener('input', () => {
      if (goldBrandCustomRadio) goldBrandCustomRadio.checked = true;
      updateExcelSample();
    });
    goldBrandCustomInput.addEventListener('focus', () => {
      if (goldBrandCustomRadio) goldBrandCustomRadio.checked = true;
      updateExcelSample();
    });
  }

  // 6 Gold Column Selects
  [goldColId, goldColGramasi, goldColVault, goldColLemari, goldColLaci, goldColKotak].forEach(sel => {
    if (sel) {
      sel.addEventListener('change', updateExcelSample);
    }
  });

  // Gold Layout Radios (2 Baris vs 1 Baris)
  [goldLayout2lines, goldLayout1line].forEach(radio => {
    if (radio) {
      radio.addEventListener('change', updateExcelSample);
    }
  });

  if (btnGenerateFromExcel) {
    btnGenerateFromExcel.addEventListener('click', (e) => {
      e.preventDefault();
      activateMode('custom');
      generateBarcodes();
      const previewPanel = document.getElementById('preview-panel');
      if (previewPanel) {
        previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // --- TEMPLATE PRESET & CUSTOM DIMENSION LOGIC ---
  function applyPresetTemplate(presetKey) {
    const preset = TEMPLATE_PRESETS[presetKey];
    if (!preset) return;

    if (dimPaperW) dimPaperW.value = preset.paperWidthMm;
    if (dimPaperH) dimPaperH.value = preset.paperHeightMm;
    if (dimLabelW) dimLabelW.value = preset.labelWidthMm;
    if (dimLabelH) dimLabelH.value = preset.labelHeightMm;
    if (dimCols) dimCols.value = preset.cols;
    if (dimRows) dimRows.value = preset.rows;
    if (dimMarginTop) dimMarginTop.value = preset.topMarginMm;
    if (dimMarginLeft) dimMarginLeft.value = preset.leftMarginMm;
    if (dimGapCol) dimGapCol.value = preset.colGapMm;
    if (dimGapRow) dimGapRow.value = preset.rowGapMm;

    if (templateSummaryText) templateSummaryText.textContent = preset.description;
    if (templateLabelDimTag) templateLabelDimTag.textContent = `${preset.labelWidthMm} × ${preset.labelHeightMm} mm`;
    if (dimTotalCapacityTag) dimTotalCapacityTag.textContent = `${preset.cols * preset.rows} label / lembar`;

    if (presetKey === 'custom') {
      if (panelCustomDimensions) panelCustomDimensions.classList.remove('hidden');
    }

    updatePrintSheetSelector();
    renderAllViews();
  }

  if (presetTemplateSelect) {
    presetTemplateSelect.addEventListener('change', (e) => {
      applyPresetTemplate(e.target.value);
    });
  }

  if (btnToggleCustomDim) {
    btnToggleCustomDim.addEventListener('click', () => {
      if (!panelCustomDimensions) return;
      const isHidden = panelCustomDimensions.classList.contains('hidden');
      panelCustomDimensions.classList.toggle('hidden', !isHidden);
      if (btnCustomDimText) {
        btnCustomDimText.textContent = isHidden ? 'Tutup Dimensi' : 'Kustom Dimensi';
      }
      if (isHidden && presetTemplateSelect) {
        presetTemplateSelect.value = 'custom';
      }
    });
  }

  // Recalculate capacity tag when custom inputs change
  const dimInputs = [dimPaperW, dimPaperH, dimLabelW, dimLabelH, dimCols, dimRows, dimMarginTop, dimMarginLeft, dimGapCol, dimGapRow];
  dimInputs.forEach(inp => {
    if (inp) {
      inp.addEventListener('input', () => {
        if (presetTemplateSelect && presetTemplateSelect.value !== 'custom') {
          presetTemplateSelect.value = 'custom';
        }
        const c = parseInt(dimCols ? dimCols.value : '3', 10) || 1;
        const r = parseInt(dimRows ? dimRows.value : '10', 10) || 1;
        const lw = parseFloat(dimLabelW ? dimLabelW.value : '50') || 50;
        const lh = parseFloat(dimLabelH ? dimLabelH.value : '18') || 18;
        if (dimTotalCapacityTag) dimTotalCapacityTag.textContent = `${c * r} label / lembar`;
        if (templateLabelDimTag) templateLabelDimTag.textContent = `${lw} × ${lh} mm`;
        if (templateSummaryText) templateSummaryText.textContent = `Kustom • ${c} Kolom × ${r} Baris (${c * r} Label)`;
        updatePrintSheetSelector();
        renderAllViews();
      });
    }
  });

  // --- CODE TYPE SWITCHER (1D BARCODE vs QR CODE) ---
  function setCodeType(type) {
    currentCodeType = type;
    if (type === 'QR') {
      if (btnTypeQr) btnTypeQr.classList.add('active');
      if (btnTypeBarcode) btnTypeBarcode.classList.remove('active');
      if (activeTypeBadge) {
        activeTypeBadge.textContent = 'QR Code Aktif';
        activeTypeBadge.className = 'text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-semibold';
      }
      if (barcode1dSymbologyGroup) barcode1dSymbologyGroup.classList.add('hidden');
      const dimGroup = document.getElementById('dimensions-control-group');
      if (dimGroup) dimGroup.classList.add('hidden');
    } else {
      if (btnTypeBarcode) btnTypeBarcode.classList.add('active');
      if (btnTypeQr) btnTypeQr.classList.remove('active');
      if (activeTypeBadge) {
        activeTypeBadge.textContent = 'Barcode 1D Aktif';
        activeTypeBadge.className = 'text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold';
      }
      if (barcode1dSymbologyGroup) barcode1dSymbologyGroup.classList.remove('hidden');
      const dimGroup = document.getElementById('dimensions-control-group');
      if (dimGroup) dimGroup.classList.remove('hidden');
    }
    renderAllViews();
  }

  if (btnTypeBarcode) btnTypeBarcode.addEventListener('click', () => setCodeType('CODE128'));
  if (btnTypeQr) btnTypeQr.addEventListener('click', () => setCodeType('QR'));

  // --- LAYOUT & TYPOGRAPHY LISTENERS ---
  if (layoutPositionSelect) {
    layoutPositionSelect.addEventListener('change', () => {
      renderAllViews();
    });
  }

  if (fontSizeTitleSlider) {
    fontSizeTitleSlider.addEventListener('input', (e) => {
      if (fontSizeTitleVal) fontSizeTitleVal.textContent = `${e.target.value} pt`;
      renderAllViews();
    });
  }

  if (fontSizeDetailsSlider) {
    fontSizeDetailsSlider.addEventListener('input', (e) => {
      if (fontSizeDetailsVal) fontSizeDetailsVal.textContent = `${e.target.value} pt`;
      renderAllViews();
    });
  }

  if (fontSizeIdSlider) {
    fontSizeIdSlider.addEventListener('input', (e) => {
      if (fontSizeIdVal) fontSizeIdVal.textContent = `${e.target.value} pt`;
      renderAllViews();
    });
  }

  // --- PRE-GENERATION EXTRA DETAIL ROWS ---
  function renderPregenRows() {
    if (!pregenExtraRowsList) return;
    pregenExtraRowsList.innerHTML = '';
    pregenExtraRows.forEach((row, idx) => {
      const div = document.createElement('div');
      div.className = 'flex items-center gap-1.5';
      div.innerHTML = `
        <input type="text" placeholder="Nama Info (cth: Kadar)" value="${escapeHtml(row.key)}" class="pregen-row-key flex-1 px-2 py-1 border border-slate-200 rounded text-xs outline-none">
        <input type="text" placeholder="Nilai (cth: 99.99%)" value="${escapeHtml(row.value)}" class="pregen-row-val flex-1 px-2 py-1 border border-slate-200 rounded text-xs outline-none">
        <button type="button" class="btn-remove-pregen-row text-slate-400 hover:text-rose-600 p-1 text-xs font-bold" title="Hapus baris">✕</button>
      `;

      div.querySelector('.pregen-row-key').addEventListener('input', (e) => {
        pregenExtraRows[idx].key = e.target.value;
      });
      div.querySelector('.pregen-row-val').addEventListener('input', (e) => {
        pregenExtraRows[idx].value = e.target.value;
      });
      div.querySelector('.btn-remove-pregen-row').addEventListener('click', () => {
        pregenExtraRows.splice(idx, 1);
        renderPregenRows();
      });

      pregenExtraRowsList.appendChild(div);
    });
  }

  if (btnAddPregenRow) {
    btnAddPregenRow.addEventListener('click', () => {
      pregenExtraRows.push({ key: '', value: '' });
      renderPregenRows();
    });
  }

  // --- GET BARCODE RENDER OPTIONS ---
  function getRenderOptions() {
    const isQR = currentCodeType === 'QR';
    const labelW = parseFloat(dimLabelW ? dimLabelW.value : '50') || 50;
    const labelH = parseFloat(dimLabelH ? dimLabelH.value : '18') || 18;
    const paperW = parseFloat(dimPaperW ? dimPaperW.value : '165') || 165;
    const paperH = parseFloat(dimPaperH ? dimPaperH.value : '210') || 210;
    const cols = parseInt(dimCols ? dimCols.value : '3', 10) || 3;
    const rows = parseInt(dimRows ? dimRows.value : '10', 10) || 10;
    const marginTop = parseFloat(dimMarginTop ? dimMarginTop.value : '7') || 7;
    const marginLeft = parseFloat(dimMarginLeft ? dimMarginLeft.value : '3') || 3;
    const gapCol = parseFloat(dimGapCol ? dimGapCol.value : '5') || 5;
    const gapRow = parseFloat(dimGapRow ? dimGapRow.value : '2') || 2;

    const layoutPos = layoutPositionSelect ? layoutPositionSelect.value : 'side-left';
    const fsTitle = parseInt(fontSizeTitleSlider ? fontSizeTitleSlider.value : '10', 10) || 10;
    const fsDetails = parseInt(fontSizeDetailsSlider ? fontSizeDetailsSlider.value : '8', 10) || 8;
    const fsId = parseInt(fontSizeIdSlider ? fontSizeIdSlider.value : '8', 10) || 8;

    const chosenFormat = isQR ? 'QR' : (barcodeFormat ? barcodeFormat.value : 'CODE128');

    return {
      format: chosenFormat,
      codeType: currentCodeType,
      topLabel: topLabelInput ? topLabelInput.value.trim() : '',
      labelWidthMm: labelW,
      labelHeightMm: labelH,
      paperWidthMm: paperW,
      paperHeightMm: paperH,
      cols: cols,
      rows: rows,
      topMarginMm: marginTop,
      leftMarginMm: marginLeft,
      colGapMm: gapCol,
      rowGapMm: gapRow,
      layoutPosition: layoutPos,
      fontSizeTitle: fsTitle,
      fontSizeDetails: fsDetails,
      fontSizeId: fsId,
      displayValue: showTextCheckbox ? showTextCheckbox.checked : true,
      barWidth: parseFloat(barWidthSlider ? barWidthSlider.value : '2') || 2,
      height: parseInt(barHeightSlider ? barHeightSlider.value : '45', 10) || 45,
      margin: 6,
      lineColor: '#0f172a',
      backgroundColor: '#ffffff'
    };
  }

  // --- GENERATE ACTION ---
  btnGenerate.addEventListener('click', () => {
    generateBarcodes();
  });

  function generateBarcodes() {
    const count = parseInt(inputCount.value, 10) || 12;
    const checkHistory = checkHistoryCheckbox.checked;
    let ids = [];
    customExcelItemsToGenerate = null;

    try {
      switch (currentMode) {
        case 'sequential':
          const startNum = parseInt(seqStart.value, 10) || 1;
          ids = IdGenerator.generateSequential({
            prefix: seqPrefix.value,
            suffix: seqSuffix.value,
            startNum: startNum,
            padLength: parseInt(seqPad.value, 10) || 4,
            count: count,
            checkGlobalHistory: checkHistory
          });
          if (ids && ids.length > 0) {
            seqStart.value = startNum + ids.length;
            updateModePreviews();
          }
          break;

        case 'alphanumeric':
          ids = IdGenerator.generateAlphanumeric({
            prefix: randPrefix.value,
            length: parseInt(randLength.value, 10) || 6,
            count: count,
            useUpper: randOptUpper.checked,
            useNumbers: randOptNum.checked,
            useLower: randOptLower.checked,
            checkGlobalHistory: checkHistory
          });
          break;

        case 'timestamp':
          ids = IdGenerator.generateTimestamp({
            prefix: tsPrefix.value,
            count: count
          });
          break;

        case 'uuid':
          ids = IdGenerator.generateUUID({
            prefix: uuidPrefix.value,
            count: count,
            shortFormat: uuidShort.checked
          });
          break;

        case 'custom':
          if (excelRawRows && excelRawRows.length > 0) {
            const isGold = excelFormatMode === 'gold';
            const colIdIdx = isGold
              ? (parseInt(goldColId ? goldColId.value : '0', 10) || 0)
              : (parseInt(excelColId ? excelColId.value : '0', 10) || 0);
            const colLabelIdx = parseInt(excelColLabel ? excelColLabel.value : '-1', 10);
            const is2Lines = goldLayout2lines ? goldLayout2lines.checked : true;

            const itemsFromExcel = [];
            const seenInBatch = new Set();
            let duplicateCount = 0;

            excelRawRows.forEach(row => {
              const val = String(row[colIdIdx] !== undefined ? row[colIdIdx] : '').trim();
              if (!val) return;

              if (seenInBatch.has(val)) {
                duplicateCount++;
                return;
              }
              seenInBatch.add(val);

              let rowLabel = '';
              let brandVal = '';
              let gramasiVal = '';
              let vaultVal = '';
              let lemariVal = '';
              let laciVal = '';
              let kotakVal = '';

              if (isGold) {
                rowLabel = formatGoldRowLabel(row, is2Lines);
                if (goldBrandHarta && goldBrandHarta.checked) brandVal = 'Harta';
                else if (goldBrandAntam && goldBrandAntam.checked) brandVal = 'Antam';
                else if (goldBrandCustomInput && goldBrandCustomInput.value.trim()) brandVal = goldBrandCustomInput.value.trim();

                const cGramasi = parseInt(goldColGramasi ? goldColGramasi.value : '-1', 10);
                const cVault = parseInt(goldColVault ? goldColVault.value : '-1', 10);
                const cLemari = parseInt(goldColLemari ? goldColLemari.value : '-1', 10);
                const cLaci = parseInt(goldColLaci ? goldColLaci.value : '-1', 10);
                const cKotak = parseInt(goldColKotak ? goldColKotak.value : '-1', 10);

                gramasiVal = cGramasi >= 0 && row[cGramasi] !== undefined ? String(row[cGramasi]).trim() : '';
                vaultVal = cVault >= 0 && row[cVault] !== undefined ? String(row[cVault]).trim() : '';
                lemariVal = cLemari >= 0 && row[cLemari] !== undefined ? String(row[cLemari]).trim() : '';
                laciVal = cLaci >= 0 && row[cLaci] !== undefined ? String(row[cLaci]).trim() : '';
                kotakVal = cKotak >= 0 && row[cKotak] !== undefined ? String(row[cKotak]).trim() : '';
              } else {
                rowLabel = (colLabelIdx >= 0 && row[colLabelIdx] !== undefined) ? String(row[colLabelIdx]).trim() : '';
              }

              itemsFromExcel.push({
                id: val,
                label: rowLabel,
                brand: brandVal,
                gramasi: gramasiVal,
                vault: vaultVal,
                lemari: lemariVal,
                laci: laciVal,
                kotak: kotakVal
              });
            });

            if (!itemsFromExcel.length) {
              showToast('Kolom ID yang dipilih tidak memiliki nomor ID yang valid.', 'error');
              return;
            }

            let filtered = itemsFromExcel;
            if (checkHistory) {
              filtered = itemsFromExcel.filter(it => !IdGenerator.registry.has(it.id));
              const historyDups = itemsFromExcel.length - filtered.length;
              if (historyDups > 0) {
                showToast(`${historyDups} ID dilewati karena sudah ada dalam riwayat sebelumnya.`);
              }
              if (!filtered.length) {
                showToast('Semua ID dari file Excel sudah ada di riwayat. Hapus centang "Cegah Duplikasi Riwayat" jika ingin men-generate ulang file ini.', 'warning');
                return;
              }
            }

            customExcelItemsToGenerate = filtered;
            ids = filtered.map(it => it.id);
          } else {
            const parsed = IdGenerator.parseCustomList(customTextarea.value);
            if (!parsed.items.length) {
              showToast('Masukkan nomor ID lewat file Excel atau tempel di kolom teks.', 'error');
              return;
            }
            ids = parsed.items;
          }
          break;

        case 'single':
          const singleVal = singleIdInput.value.trim();
          if (!singleVal) {
            showToast('Nomor identitas tidak boleh kosong.', 'error');
            return;
          }
          ids = [singleVal];
          break;
      }

      if (!ids || ids.length === 0) {
        showToast('Tidak ada ID unik baru yang berhasil dibuat. Coba ubah awalan atau nonaktifkan cegah riwayat.', 'error');
        return;
      }

      // Daftarkan ke Registry Anti-Duplikasi
      IdGenerator.registry.addBatch(ids);

      const defaultLabel = topLabelInput.value.trim();
      const chosenFormat = currentCodeType === 'QR' ? 'QR' : (barcodeFormat ? barcodeFormat.value : 'CODE128');
      const nowFormatted = new Date().toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // Grouping ke dalam Folder / Batch
      const customBatchName = batchNameInput ? batchNameInput.value.trim() : '';
      const finalBatchName = customBatchName || `Batch ${nowFormatted}`;
      let targetBatch = batches.find(b => b.name.toLowerCase() === finalBatchName.toLowerCase());
      if (!targetBatch) {
        targetBatch = {
          id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: finalBatchName,
          createdAt: nowFormatted,
          format: chosenFormat
        };
        batches.push(targetBatch);
        saveBatchesToStorage();
      }

      const pregenClean = pregenExtraRows.filter(r => r.key.trim() || r.value.trim()).map(r => ({ ...r }));

      // Tambahkan item baru ke generatedItems
      let newItems = [];
      if (currentMode === 'custom' && customExcelItemsToGenerate && customExcelItemsToGenerate.length > 0) {
        newItems = customExcelItemsToGenerate.map(it => ({
          id: it.id,
          label: it.label || defaultLabel,
          brand: it.brand || '',
          gramasi: it.gramasi || '',
          vault: it.vault || '',
          lemari: it.lemari || '',
          laci: it.laci || '',
          kotak: it.kotak || '',
          extraRows: [...pregenClean],
          batchId: targetBatch.id,
          batchName: targetBatch.name,
          format: chosenFormat,
          status: 'pending',
          createdAt: nowFormatted,
          timestamp: Date.now()
        }));
      } else {
        newItems = ids.map(id => ({
          id,
          label: defaultLabel,
          brand: '',
          gramasi: '',
          vault: '',
          lemari: '',
          laci: '',
          kotak: '',
          extraRows: [...pregenClean],
          batchId: targetBatch.id,
          batchName: targetBatch.name,
          format: chosenFormat,
          status: 'pending',
          createdAt: nowFormatted,
          timestamp: Date.now()
        }));
      }

      generatedItems.push(...newItems);
      activeFolderId = targetBatch.id; // Otomatis fokus ke folder yang baru dibuat di Grid view
      saveItemsToStorage();

      if (batchNameInput) batchNameInput.value = '';

      updateFilteredItems();
      renderAllViews();
      showToast(`Berhasil menambahkan ${ids.length} label ke folder "${targetBatch.name}"!`);
    } catch (err) {
      console.error('Terjadi kesalahan saat generate barcode:', err);
      showToast('Gagal memproses barcode: ' + err.message, 'error');
    }
  }

  // --- FILTER ITEMS (BY SEARCH, FOLDER & STATUS) ---
  function updateFilteredItems() {
    const q = (searchFilterInput.value || '').toLowerCase().trim();
    const statusFilter = tableStatusFilter ? tableStatusFilter.value : 'all';

    lastFilteredItems = generatedItems.filter(item => {
      const matchesSearch = !q ||
        item.id.toLowerCase().includes(q) ||
        (item.label && item.label.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.gramasi && item.gramasi.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  // Items for Grid view (separated by active folder)
  function getActiveGridItems() {
    if (activeFolderId === 'all') {
      return lastFilteredItems;
    }
    return lastFilteredItems.filter(item => item.batchId === activeFolderId);
  }

  // Items for Management view (master list of all folders, or filtered by tableFolderFilter)
  function getActiveManagementItems() {
    const folderFilter = tableFolderFilter ? tableFolderFilter.value : 'all';
    if (folderFilter === 'all') {
      return lastFilteredItems;
    }
    return lastFilteredItems.filter(item => item.batchId === folderFilter);
  }

  // --- RENDER FOLDER PILLS BAR ---
  function renderFolderPills() {
    if (!folderPillsContainer) return;
    folderPillsContainer.innerHTML = '';

    const countMap = {};
    generatedItems.forEach(item => {
      const bId = item.batchId || 'default';
      countMap[bId] = (countMap[bId] || 0) + 1;
    });

    // Pill: Semua Folder
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `folder-pill ${activeFolderId === 'all' ? 'active' : ''}`;
    allBtn.dataset.folderId = 'all';
    allBtn.innerHTML = `
      <span>📁</span>
      <span>Semua Folder</span>
      <span class="pill-count">${generatedItems.length}</span>
    `;
    allBtn.addEventListener('click', () => {
      activeFolderId = 'all';
      renderAllViews();
    });
    folderPillsContainer.appendChild(allBtn);

    // Pill per Folder / Batch
    batches.forEach(batch => {
      const bCount = countMap[batch.id] || 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `folder-pill ${activeFolderId === batch.id ? 'active' : ''}`;
      btn.dataset.folderId = batch.id;
      btn.title = `Folder: ${batch.name} (${bCount} label)`;
      btn.innerHTML = `
        <span>📂</span>
        <span class="truncate max-w-[130px]">${escapeHtml(batch.name)}</span>
        <span class="pill-count">${bCount}</span>
      `;
      btn.addEventListener('click', () => {
        activeFolderId = batch.id;
        renderAllViews();
      });
      folderPillsContainer.appendChild(btn);
    });

    // Update active folder title & badge in Grid view
    if (activeFolderTitle && activeFolderCountBadge) {
      if (activeFolderId === 'all') {
        activeFolderTitle.textContent = 'Semua Label';
        activeFolderCountBadge.textContent = `${generatedItems.length} label`;
      } else {
        const b = batches.find(x => x.id === activeFolderId);
        activeFolderTitle.textContent = b ? b.name : 'Folder Terpilih';
        const c = countMap[activeFolderId] || 0;
        activeFolderCountBadge.textContent = `${c} label`;
      }
    }

    // Update tableFolderFilter dropdown in Management View
    if (tableFolderFilter) {
      const curSelected = tableFolderFilter.value || 'all';
      tableFolderFilter.innerHTML = '<option value="all">Semua Folder (Master)</option>';
      batches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.name} (${countMap[b.id] || 0} item)`;
        tableFolderFilter.appendChild(opt);
      });
      tableFolderFilter.value = curSelected;
    }
  }

  // --- RENDER ALL VIEWS (GRID & MANAGEMENT) ---
  function renderAllViews() {
    updateFilteredItems();
    renderFolderPills();
    renderResultsGrid(getActiveGridItems());
    renderManagementTable();
    updateStats();
    updatePrintSheetSelector();
  }

  // --- RENDER GRID RESULTS ---
  function renderResultsGrid(items) {
    barcodeGrid.innerHTML = '';

    if (!items || items.length === 0) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');

    const renderOpts = getRenderOptions();

    items.forEach((item, index) => {
      const card = createBarcodeCard(item, index, renderOpts);
      barcodeGrid.appendChild(card);
    });
  }

  // --- CREATE INDIVIDUAL BARCODE CARD ---
  function createBarcodeCard(item, index, renderOpts) {
    const card = document.createElement('div');
    card.className = 'barcode-item-card group';

    const isPrinted = item.status === 'printed';
    const statusBadgeHtml = isPrinted
      ? `<button type="button" class="btn-toggle-status-card text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition" title="Klik untuk ubah status">✓ Dicetak</button>`
      : `<button type="button" class="btn-toggle-status-card text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition" title="Klik untuk ubah status">⏳ Belum Dicetak</button>`;

    // Header Card
    const headerDiv = document.createElement('div');
    headerDiv.className = 'w-full flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 text-xs text-slate-500 no-print';
    headerDiv.innerHTML = `
      <div class="flex items-center gap-1.5 truncate">
        <span class="font-semibold text-slate-400">#${index + 1}</span>
        <span class="bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded text-[11px] font-medium tracking-wide truncate max-w-[130px]">${escapeHtml(item.id)}</span>
        <span class="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">${renderOpts.labelWidthMm}×${renderOpts.labelHeightMm}mm</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        ${statusBadgeHtml}
      </div>
    `;
    card.appendChild(headerDiv);

    // Sticker Cutout Container (Simulasi Ukuran Asli Label)
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'label-sticker-cutout my-2';
    canvasWrap.style.aspectRatio = `${renderOpts.labelWidthMm} / ${renderOpts.labelHeightMm}`;
    canvasWrap.title = `Ukuran Label: ${renderOpts.labelWidthMm} mm × ${renderOpts.labelHeightMm} mm`;

    const cutoutTag = document.createElement('span');
    cutoutTag.className = 'cutout-tag';
    cutoutTag.textContent = `${renderOpts.labelWidthMm}×${renderOpts.labelHeightMm}mm`;
    canvasWrap.appendChild(cutoutTag);

    const canvas = document.createElement('canvas');
    canvas.dataset.id = item.id;
    canvasWrap.appendChild(canvas);
    card.appendChild(canvasWrap);

    // Render Barcode / QR Code ke Canvas
    try {
      const mergedOpts = {
        ...renderOpts,
        ...item,
        format: item.format || renderOpts.format,
        topLabel: item.label || renderOpts.topLabel
      };
      BarcodeEngine.renderToCanvas(canvas, item.id, mergedOpts);
    } catch (err) {
      console.error('Gagal merender canvas untuk ID:', item.id, err);
    }

    // Card Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions w-full flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 no-print';
    actionsDiv.innerHTML = `
      <div class="flex items-center gap-2">
        <button type="button" class="btn-copy-id text-xs text-slate-600 hover:text-indigo-600 flex items-center gap-1 font-medium transition" title="Salin ID">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Salin
        </button>
        <button type="button" class="btn-edit-item text-xs text-slate-500 hover:text-indigo-600 transition" title="Edit Detail Barcode">
          ✏️
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" class="btn-download-png px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[11px] font-bold transition flex items-center gap-0.5" title="Unduh gambar stiker label (300 DPI)">
          <span>🏷️</span> PNG
        </button>
        <button type="button" class="btn-download-svg px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold transition" title="Unduh format SVG">
          SVG
        </button>
        <button type="button" class="btn-delete-item p-1 text-slate-400 hover:text-rose-600 rounded transition" title="Hapus Barcode Ini">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `;

    // Event: Toggle Status Card
    headerDiv.querySelector('.btn-toggle-status-card').addEventListener('click', () => {
      toggleItemStatus(item.id);
    });

    // Event: Salin ID
    actionsDiv.querySelector('.btn-copy-id').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item.id);
        showToast(`ID "${item.id}" berhasil disalin!`);
      } catch (e) {
        showToast(`ID: ${item.id}`);
      }
    });

    // Event: Edit Detail
    actionsDiv.querySelector('.btn-edit-item').addEventListener('click', () => {
      openEditModal(item);
    });

    // Event: Download PNG (Stiker 300 DPI)
    actionsDiv.querySelector('.btn-download-png').addEventListener('click', async () => {
      const curOpts = getRenderOptions();
      const mergedOpts = {
        ...curOpts,
        ...item,
        format: item.format || curOpts.format,
        topLabel: item.label || curOpts.topLabel
      };
      await BarcodeExporter.downloadSingleStickerPNG(item.id, mergedOpts, `stiker_${curOpts.labelWidthMm}x${curOpts.labelHeightMm}mm_${item.id}.png`);
      showToast(`Stiker PNG (${curOpts.labelWidthMm}×${curOpts.labelHeightMm} mm) untuk ${item.id} berhasil diunduh!`);
    });

    // Event: Download SVG
    actionsDiv.querySelector('.btn-download-svg').addEventListener('click', () => {
      const curOpts = getRenderOptions();
      const mergedOpts = {
        ...curOpts,
        ...item,
        format: item.format || curOpts.format,
        topLabel: item.label || curOpts.topLabel
      };
      const svgStr = BarcodeEngine.toSVGString(item.id, mergedOpts);
      BarcodeExporter.downloadSVG(svgStr, `stiker_${item.id}.svg`);
      showToast(`Mengunduh SVG untuk ${item.id}`);
    });

    // Event: Delete Item
    actionsDiv.querySelector('.btn-delete-item').addEventListener('click', () => {
      deleteSingleItem(item.id);
    });

    card.appendChild(actionsDiv);
    return card;
  }

  // --- RENDER MANAGEMENT TABLE ---
  function renderManagementTable() {
    if (!barcodeTableBody) return;
    barcodeTableBody.innerHTML = '';

    const items = getActiveManagementItems();

    if (!items || items.length === 0) {
      if (tableEmptyMessage) tableEmptyMessage.classList.remove('hidden');
      return;
    }

    if (tableEmptyMessage) tableEmptyMessage.classList.add('hidden');

    const renderOpts = getRenderOptions();

    items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/80 transition text-xs';

      const isChecked = selectedIds.has(item.id);
      const isPrinted = item.status === 'printed';

      // Brand & Gramasi
      const brandText = item.brand || '';
      const gramasiText = item.gramasi || '';
      const brandGramasiHtml = (brandText || gramasiText)
        ? `<div><span class="font-bold text-slate-900">${escapeHtml(brandText)}</span> ${gramasiText ? `<span class="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-semibold text-[10px]">${escapeHtml(gramasiText)}</span>` : ''}</div>`
        : `<span class="text-slate-400 italic">${escapeHtml(item.label || '-')}</span>`;

      // Lokasi
      const locationParts = [item.vault, item.lemari, item.laci, item.kotak].filter(Boolean);
      const locationHtml = locationParts.length > 0
        ? `<span class="text-slate-700 font-medium text-[11px]">${locationParts.map(escapeHtml).join(' &bull; ')}</span>`
        : `<span class="text-slate-400">-</span>`;

      // Extra rows chips
      let extraChipsHtml = '';
      if (item.extraRows && item.extraRows.length > 0) {
        extraChipsHtml = item.extraRows.map(r => `
          <span class="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-0.5 border border-slate-200">
            <span class="font-semibold">${escapeHtml(r.key)}:</span>
            <span>${escapeHtml(r.value)}</span>
          </span>
        `).join('');
      } else {
        extraChipsHtml = `<span class="text-slate-400 text-[11px]">-</span>`;
      }

      tr.innerHTML = `
        <td class="p-3 text-center">
          <input type="checkbox" class="table-row-checkbox rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" data-id="${escapeHtml(item.id)}" ${isChecked ? 'checked' : ''}>
        </td>
        <td class="p-3 text-center">
          <canvas class="table-thumb-canvas inline-block border border-slate-200 rounded p-1 bg-white" data-id="${escapeHtml(item.id)}" style="max-height: 38px; max-width: 70px;"></canvas>
        </td>
        <td class="p-3">
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-bold text-slate-800">${escapeHtml(item.id)}</span>
            <button type="button" class="btn-table-copy text-slate-400 hover:text-indigo-600 transition" title="Salin ID">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </td>
        <td class="p-3">
          ${brandGramasiHtml}
        </td>
        <td class="p-3">
          ${locationHtml}
        </td>
        <td class="p-3 max-w-[160px]">
          ${extraChipsHtml}
        </td>
        <td class="p-3 text-center">
          <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">${escapeHtml(item.format || 'QR')}</span>
        </td>
        <td class="p-3">
          <span class="bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[100px] inline-block">${escapeHtml(item.batchName || 'Default')}</span>
        </td>
        <td class="p-3 text-center">
          <button type="button" class="btn-toggle-status-table inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer transition ${
            isPrinted
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          }">
            ${isPrinted ? '✓ Dicetak' : '⏳ Belum'}
          </button>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" class="btn-table-edit p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition" title="Edit Detail">
              ✏️
            </button>
            <button type="button" class="btn-table-download px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded text-[11px] transition border border-amber-300" title="Unduh PNG Stiker">
              PNG
            </button>
            <button type="button" class="btn-table-delete p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Hapus Barcode">
              🗑️
            </button>
          </div>
        </td>
      `;

      // Render thumbnail
      const thumbCanvas = tr.querySelector('.table-thumb-canvas');
      if (thumbCanvas) {
        try {
          const itemFmt = item.format || renderOpts.format;
          BarcodeEngine.renderToCanvas(thumbCanvas, item.id, {
            format: itemFmt,
            barWidth: 1,
            height: 24,
            margin: 2,
            displayValue: false,
            layoutPosition: 'side-left'
          });
        } catch (thumbErr) {
          console.warn('Gagal merender thumbnail tabel:', thumbErr);
        }
      }

      // Checkbox event
      const chk = tr.querySelector('.table-row-checkbox');
      chk.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedIds.add(item.id);
        } else {
          selectedIds.delete(item.id);
        }
        updateStats();
        syncSelectAllState();
      });

      // Copy ID
      tr.querySelector('.btn-table-copy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(item.id);
          showToast(`ID "${item.id}" berhasil disalin!`);
        } catch (e) {
          showToast(`ID: ${item.id}`);
        }
      });

      // Toggle status
      tr.querySelector('.btn-toggle-status-table').addEventListener('click', () => {
        toggleItemStatus(item.id);
      });

      // Edit item
      tr.querySelector('.btn-table-edit').addEventListener('click', () => {
        openEditModal(item);
      });

      // Download PNG
      tr.querySelector('.btn-table-download').addEventListener('click', async () => {
        const curOpts = getRenderOptions();
        const mergedOpts = {
          ...curOpts,
          ...item,
          format: item.format || curOpts.format,
          topLabel: item.label || curOpts.topLabel
        };
        await BarcodeExporter.downloadSingleStickerPNG(item.id, mergedOpts, `stiker_${item.id}.png`);
        showToast(`Mengunduh PNG untuk ${item.id}`);
      });

      // Delete item
      tr.querySelector('.btn-table-delete').addEventListener('click', () => {
        deleteSingleItem(item.id);
      });

      barcodeTableBody.appendChild(tr);
    });

    syncSelectAllState();
  }

  // Listener untuk filter folder di tabel management
  if (tableFolderFilter) {
    tableFolderFilter.addEventListener('change', () => {
      renderManagementTable();
    });
  }

  // --- QUICK EDIT MODAL WITH LIVE PREVIEW & DYNAMIC ROWS ---
  function openEditModal(item) {
    currentEditingItem = item;
    modalEditId.value = item.id;
    modalEditFormat.value = item.format || (currentCodeType === 'QR' ? 'QR' : 'CODE128');
    modalEditBrand.value = item.brand || '';
    modalEditGramasi.value = item.gramasi || '';
    modalEditVault.value = item.vault || '';
    modalEditLemari.value = item.lemari || '';
    modalEditLaci.value = item.laci || '';
    modalEditKotak.value = item.kotak || '';
    modalEditBatch.value = item.batchName || '';
    modalEditStatus.value = item.status || 'pending';

    modalExtraRows = (item.extraRows || []).map(r => ({ ...r }));
    renderModalExtraRows();

    const curOpts = getRenderOptions();
    if (modalPreviewDimTag) {
      modalPreviewDimTag.textContent = `${curOpts.labelWidthMm} × ${curOpts.labelHeightMm} mm`;
    }

    editBarcodeModal.classList.remove('hidden');
    editBarcodeModal.classList.add('flex');

    renderModalLivePreview();
  }

  function renderModalExtraRows() {
    if (!modalExtraRowsContainer) return;
    modalExtraRowsContainer.innerHTML = '';

    modalExtraRows.forEach((row, idx) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'flex items-center gap-2 extra-detail-row';
      rowDiv.innerHTML = `
        <input type="text" placeholder="Nama Kolom (cth: Kadar / SN)" value="${escapeHtml(row.key)}" class="modal-row-key flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs outline-none">
        <input type="text" placeholder="Nilai (cth: 99.99%)" value="${escapeHtml(row.value)}" class="modal-row-val flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs outline-none">
        <button type="button" class="btn-remove-modal-row text-slate-400 hover:text-rose-600 p-1 font-bold text-sm" title="Hapus baris ini">✕</button>
      `;

      rowDiv.querySelector('.modal-row-key').addEventListener('input', (e) => {
        modalExtraRows[idx].key = e.target.value;
        renderModalLivePreview();
      });
      rowDiv.querySelector('.modal-row-val').addEventListener('input', (e) => {
        modalExtraRows[idx].value = e.target.value;
        renderModalLivePreview();
      });
      rowDiv.querySelector('.btn-remove-modal-row').addEventListener('click', () => {
        modalExtraRows.splice(idx, 1);
        renderModalExtraRows();
        renderModalLivePreview();
      });

      modalExtraRowsContainer.appendChild(rowDiv);
    });
  }

  if (btnAddModalRow) {
    btnAddModalRow.addEventListener('click', () => {
      modalExtraRows.push({ key: '', value: '' });
      renderModalExtraRows();
      renderModalLivePreview();
    });
  }

  function renderModalLivePreview() {
    if (!modalPreviewCanvas) return;
    const curOpts = getRenderOptions();
    const id = modalEditId ? modalEditId.value.trim() : (currentEditingItem ? currentEditingItem.id : 'TEST');
    const format = modalEditFormat ? modalEditFormat.value : 'QR';
    const brand = modalEditBrand ? modalEditBrand.value.trim() : '';
    const gramasi = modalEditGramasi ? modalEditGramasi.value.trim() : '';
    const vault = modalEditVault ? modalEditVault.value.trim() : '';
    const lemari = modalEditLemari ? modalEditLemari.value.trim() : '';
    const laci = modalEditLaci ? modalEditLaci.value.trim() : '';
    const kotak = modalEditKotak ? modalEditKotak.value.trim() : '';

    try {
      BarcodeEngine.renderToCanvas(modalPreviewCanvas, id || 'KODE-PREVIEW', {
        ...curOpts,
        format: format,
        brand: brand,
        gramasi: gramasi,
        vault: vault,
        lemari: lemari,
        laci: laci,
        kotak: kotak,
        extraRows: modalExtraRows.filter(r => r.key.trim() || r.value.trim())
      });
    } catch (err) {
      console.warn('Gagal render live preview modal:', err);
    }
  }

  // Modal live inputs triggers
  [modalEditId, modalEditFormat, modalEditBrand, modalEditGramasi, modalEditVault, modalEditLemari, modalEditLaci, modalEditKotak].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', renderModalLivePreview);
      inp.addEventListener('change', renderModalLivePreview);
    }
  });

  const closeEditModal = () => {
    editBarcodeModal.classList.add('hidden');
    editBarcodeModal.classList.remove('flex');
    currentEditingItem = null;
  };

  if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', closeEditModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

  if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', () => {
      if (!currentEditingItem) return;

      const newId = modalEditId.value.trim();
      if (!newId) {
        showToast('Nomor ID tidak boleh kosong.', 'error');
        return;
      }

      // Check ID uniqueness if modified
      if (newId !== currentEditingItem.id) {
        if (IdGenerator.registry.has(newId)) {
          showToast(`Nomor ID "${newId}" sudah terdaftar dalam riwayat. Gunakan ID yang berbeda.`, 'error');
          return;
        }
        IdGenerator.registry.historySet.delete(currentEditingItem.id);
        IdGenerator.registry.historySet.add(newId);
        IdGenerator.registry.saveToStorage();
        currentEditingItem.id = newId;
      }

      currentEditingItem.format = modalEditFormat.value;
      currentEditingItem.brand = modalEditBrand.value.trim();
      currentEditingItem.gramasi = modalEditGramasi.value.trim();
      currentEditingItem.vault = modalEditVault.value.trim();
      currentEditingItem.lemari = modalEditLemari.value.trim();
      currentEditingItem.laci = modalEditLaci.value.trim();
      currentEditingItem.kotak = modalEditKotak.value.trim();
      currentEditingItem.status = modalEditStatus.value;
      currentEditingItem.extraRows = modalExtraRows.filter(r => r.key.trim() || r.value.trim());

      const newBatchName = modalEditBatch.value.trim();
      if (newBatchName && newBatchName !== currentEditingItem.batchName) {
        let b = batches.find(x => x.name.toLowerCase() === newBatchName.toLowerCase());
        if (!b) {
          b = {
            id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: newBatchName,
            createdAt: new Date().toLocaleDateString('id-ID')
          };
          batches.push(b);
          saveBatchesToStorage();
        }
        currentEditingItem.batchId = b.id;
        currentEditingItem.batchName = b.name;
      }

      saveItemsToStorage();
      closeEditModal();
      renderAllViews();
      showToast(`Perubahan barcode "${currentEditingItem.id}" berhasil disimpan!`);
    });
  }

  // --- FOLDER QUICK ACTION BUTTONS ---
  if (btnFolderSheetDownload) {
    btnFolderSheetDownload.addEventListener('click', () => {
      const itemsInFolder = getActiveGridItems();
      if (!itemsInFolder.length) {
        showToast('Tidak ada label di folder ini untuk diunduh.', 'error');
        return;
      }
      triggerSheetDownload(0, itemsInFolder);
    });
  }

  if (btnFolderZipDownload) {
    btnFolderZipDownload.addEventListener('click', async () => {
      const itemsInFolder = getActiveGridItems();
      if (!itemsInFolder.length) {
        showToast('Tidak ada label di folder ini untuk diunduh.', 'error');
        return;
      }

      loadingOverlay.classList.add('active');
      loadingText.textContent = `Menyiapkan ${itemsInFolder.length} file barcode folder ke dalam ZIP...`;

      try {
        const renderOpts = getRenderOptions();
        const fName = activeFolderId === 'all' ? 'semua_label' : (batches.find(b => b.id === activeFolderId)?.name || 'folder');
        await BarcodeExporter.downloadBatchZIP(itemsInFolder, renderOpts, (done, total) => {
          loadingText.textContent = `Memproses (${done}/${total})...`;
        }, `folder_${fName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.zip`);

        showToast(`ZIP folder berhasil diunduh (${itemsInFolder.length} file)!`);
      } catch (err) {
        console.error(err);
        showToast('Gagal membuat file ZIP folder.', 'error');
      } finally {
        loadingOverlay.classList.remove('active');
      }
    });
  }

  // --- LIVE STYLE UPDATER ---
  function updateLiveBarcodeStyles() {
    const renderOpts = getRenderOptions();
    const canvases = barcodeGrid.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const id = canvas.dataset.id;
      if (id) {
        const item = generatedItems.find(x => x.id === id);
        try {
          BarcodeEngine.renderToCanvas(canvas, id, {
            ...renderOpts,
            topLabel: (item && item.label) ? item.label : renderOpts.topLabel
          });
        } catch (err) {
          console.warn('Gagal update style barcode:', err);
        }
      }
    });
  }

  // --- SEARCH / FILTER BAR ---
  searchFilterInput.addEventListener('input', () => {
    renderAllViews();
  });

  // --- BULK ACTION: DOWNLOAD ZIP ---
  btnDownloadZip.addEventListener('click', async () => {
    const itemsToExport = selectedIds.size > 0
      ? generatedItems.filter(item => selectedIds.has(item.id))
      : lastFilteredItems;

    if (!itemsToExport.length) {
      showToast('Tidak ada barcode untuk diunduh.', 'error');
      return;
    }

    loadingOverlay.classList.add('active');
    loadingText.textContent = `Menyiapkan ${itemsToExport.length} file barcode ke dalam ZIP...`;

    try {
      const renderOpts = getRenderOptions();
      await BarcodeExporter.downloadBatchZIP(itemsToExport, renderOpts, (done, total) => {
        loadingText.textContent = `Memproses barcode (${done}/${total})...`;
      }, `kumpulan_barcode_${Date.now()}.zip`);

      showToast(`Berhasil mengunduh ZIP berisi ${itemsToExport.length} barcode!`);
    } catch (err) {
      console.error(err);
      showToast('Gagal membuat file ZIP.', 'error');
    } finally {
      loadingOverlay.classList.remove('active');
    }
  });

  // --- BULK ACTION: EXPORT CSV ---
  btnExportCsv.addEventListener('click', () => {
    const itemsToExport = selectedIds.size > 0
      ? generatedItems.filter(item => selectedIds.has(item.id))
      : lastFilteredItems;

    if (!itemsToExport.length) {
      showToast('Tidak ada data barcode untuk diekspor ke CSV.', 'error');
      return;
    }
    BarcodeExporter.downloadCSV(itemsToExport, `barcode_id_list_${Date.now()}.csv`);
    showToast(`File CSV (${itemsToExport.length} data) berhasil diunduh!`);
  });

  // --- PRINT SHEET SELECTOR ---
  function updatePrintSheetSelector() {
    if (!printSheetSelect) return;
    const items = lastFilteredItems.length ? lastFilteredItems : generatedItems;
    const cols = parseInt(dimCols ? dimCols.value : '3', 10) || 3;
    const rows = parseInt(dimRows ? dimRows.value : '10', 10) || 10;
    const capacity = Math.max(1, cols * rows);
    const totalSheets = Math.max(1, Math.ceil(items.length / capacity));
    const prevVal = parseInt(printSheetSelect.value, 10) || 0;

    printSheetSelect.innerHTML = '';
    for (let i = 0; i < totalSheets; i++) {
      const start = i * capacity + 1;
      const end = Math.min((i + 1) * capacity, items.length);
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = items.length === 0 
        ? `Lembar 1 (0 / ${capacity} Label)`
        : `Lembar ${i + 1} (Label ${start} - ${end} / ${capacity})`;
      printSheetSelect.appendChild(opt);
    }

    if (prevVal < totalSheets) {
      printSheetSelect.value = prevVal;
    }
  }

  // --- DOWNLOAD FULL SHEET (CUSTOM / TOM & JERRY 107) ---
  async function triggerSheetDownload(sheetIndex = 0, itemsOverride = null) {
    const items = (itemsOverride && itemsOverride.length)
      ? itemsOverride
      : (lastFilteredItems.length ? lastFilteredItems : generatedItems);
    if (!items.length) {
      showToast('Tidak ada barcode untuk diunduh lembarannya.', 'error');
      return;
    }

    const showBorders = printShowBordersChk ? printShowBordersChk.checked : true;
    const renderOpts = getRenderOptions();
    const sheetCap = renderOpts.cols * renderOpts.rows;
    const templateName = (presetTemplateSelect ? presetTemplateSelect.value : 'sheet').replace(/[^a-zA-Z0-9_-]/g, '_');

    loadingOverlay.classList.add('active');
    loadingText.textContent = `Merender Lembar ${sheetIndex + 1} (${renderOpts.cols}x${renderOpts.rows} - ${renderOpts.labelWidthMm}x${renderOpts.labelHeightMm}mm)...`;

    try {
      await BarcodeExporter.downloadFullSheetPNG(
        items,
        renderOpts,
        sheetIndex,
        showBorders,
        `Lembar_${templateName}_Halaman_${sheetIndex + 1}.png`
      );
      showToast(`Gambar Lembar ${sheetIndex + 1} (${sheetCap} Label) berhasil diunduh!`, 'success');
    } catch (err) {
      console.error('Gagal unduh sheet PNG:', err);
      showToast('Gagal mengunduh lembar: ' + err.message, 'error');
    } finally {
      loadingOverlay.classList.remove('active');
    }
  }

  if (btnQuickDownloadSheet) {
    btnQuickDownloadSheet.addEventListener('click', () => {
      const items = lastFilteredItems.length ? lastFilteredItems : generatedItems;
      if (!items.length) {
        showToast('Buat barcode terlebih dahulu sebelum mengunduh lembaran.', 'error');
        return;
      }
      updatePrintSheetSelector();
      const currentSheet = parseInt(printSheetSelect ? printSheetSelect.value : '0', 10) || 0;
      triggerSheetDownload(currentSheet);
    });
  }

  if (btnDownloadSheetPng) {
    btnDownloadSheetPng.addEventListener('click', () => {
      const currentSheet = parseInt(printSheetSelect ? printSheetSelect.value : '0', 10) || 0;
      triggerSheetDownload(currentSheet);
    });
  }

  // --- PRINT MODAL ACTIONS ---
  btnOpenPrintModal.addEventListener('click', () => {
    if (!lastFilteredItems.length) {
      showToast('Buat barcode terlebih dahulu sebelum mencetak.', 'error');
      return;
    }
    updatePrintSheetSelector();
    printModal.classList.remove('hidden');
    printModal.classList.add('flex');
  });

  const closePrintModal = () => {
    printModal.classList.add('hidden');
    printModal.classList.remove('flex');
  };

  btnClosePrintModal.addEventListener('click', closePrintModal);
  btnCancelPrint.addEventListener('click', closePrintModal);

  btnExecutePrint.addEventListener('click', () => {
    const selectedLayout = document.querySelector('input[name="print-layout"]:checked').value;
    const showBorders = document.getElementById('print-show-borders-chk')?.checked;

    document.body.classList.remove(
      'print-mode-tj-107',
      'print-mode-a4-3col',
      'print-mode-a4-2col',
      'print-mode-a4-4col',
      'print-mode-thermal',
      'print-show-borders'
    );
    document.body.classList.add(`print-mode-${selectedLayout}`);
    if (showBorders) {
      document.body.classList.add('print-show-borders');
    }

    closePrintModal();

    // Otomatis pindah ke grid view jika sedang di management view agar bisa dicetak
    if (currentView !== 'grid') {
      switchView('grid');
    }

    setTimeout(() => {
      window.print();
    }, 200);
  });

  // --- HISTORY MODAL ACTIONS ---
  btnOpenHistory.addEventListener('click', () => {
    renderHistoryModal();
    historyModal.classList.remove('hidden');
    historyModal.classList.add('flex');
  });

  const closeHistoryModal = () => {
    historyModal.classList.add('hidden');
    historyModal.classList.remove('flex');
  };

  btnCloseHistoryModal.addEventListener('click', closeHistoryModal);
  btnDismissHistory.addEventListener('click', closeHistoryModal);

  btnClearHistory.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat nomor ID yang tersimpan?')) {
      IdGenerator.registry.clear();
      seqStart.value = 1;
      updateModePreviews();
      updateStats();
      renderHistoryModal();
      showToast('Riwayat ID berhasil dibersihkan.');
    }
  });

  // --- RESET ALL & RESTART ---
  if (btnResetAll) {
    btnResetAll.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin menghapus semua barcode dan riwayat ID untuk memulai ulang dari kosong?')) {
        IdGenerator.registry.clear();
        generatedItems = [];
        selectedIds.clear();
        saveItemsToStorage();
        seqStart.value = 1;
        updateModePreviews();
        renderAllViews();
        showToast('Semua barcode dan riwayat telah dihapus! Halaman kembali bersih.', 'success');
      }
    });
  }

  // --- DEVICE ACCESS MODAL (HP / TABLET) ---
  function openDeviceAccessModal() {
    if (!deviceAccessModal) return;
    deviceAccessModal.classList.remove('hidden');
    deviceAccessModal.classList.add('flex');

    // Coba deteksi IP lokal secara dinamis dari server
    fetch('/api/network-info')
      .then(res => res.json())
      .then(info => {
        if (info && info.networkUrl && networkUrlInput) {
          networkUrlInput.value = info.networkUrl;
          if (deviceQrImg) {
            deviceQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(info.networkUrl)}`;
          }
        }
      })
      .catch(err => {
        if (networkUrlInput && !networkUrlInput.value) {
          networkUrlInput.value = 'http://10.227.207.226:3001';
        }
      });
  }

  const closeDeviceAccessModal = () => {
    if (!deviceAccessModal) return;
    deviceAccessModal.classList.add('hidden');
    deviceAccessModal.classList.remove('flex');
  };

  if (btnOpenDeviceAccess) btnOpenDeviceAccess.addEventListener('click', openDeviceAccessModal);
  if (btnCloseDeviceModal) btnCloseDeviceModal.addEventListener('click', closeDeviceAccessModal);
  if (btnDismissDeviceModal) btnDismissDeviceModal.addEventListener('click', closeDeviceAccessModal);

  if (btnCopyNetworkUrl && networkUrlInput) {
    btnCopyNetworkUrl.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(networkUrlInput.value);
        showToast('Alamat URL berhasil disalin! Silakan buka di HP.');
      } catch (err) {
        networkUrlInput.select();
        document.execCommand('copy');
        showToast('Alamat URL berhasil disalin!');
      }
    });
  }

  if (deviceQrImg && deviceQrContainer) {
    deviceQrImg.addEventListener('error', () => {
      const currentUrl = networkUrlInput ? networkUrlInput.value : 'http://10.227.207.226:3001';
      deviceQrContainer.innerHTML = `
        <div class="p-3 text-center">
          <div class="text-3xl mb-1">📱</div>
          <div class="font-mono font-bold text-xs text-indigo-700 select-all">${escapeHtml(currentUrl)}</div>
          <div class="text-[10px] text-slate-400 mt-1">Ketik alamat di atas pada browser HP</div>
        </div>
      `;
    });
  }

  function renderHistoryModal() {
    historyListContainer.innerHTML = '';
    const arr = Array.from(IdGenerator.registry.historySet);
    if (!arr.length) {
      historyListContainer.innerHTML = '<li class="text-slate-400 italic p-3 text-center">Belum ada nomor identitas yang tersimpan dalam riwayat.</li>';
      return;
    }

    arr.reverse().slice(0, 500).forEach(id => {
      const li = document.createElement('li');
      li.className = 'py-1 px-2 hover:bg-white rounded flex items-center justify-between border-b border-slate-100';
      li.innerHTML = `
        <span class="text-slate-800 font-semibold">${escapeHtml(id)}</span>
        <span class="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Unik</span>
      `;
      historyListContainer.appendChild(li);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- INITIAL RUN (CLEAN SLATE & LOCKED TO TOM & JERRY 107) ---
  loadItemsFromStorage();
  setLockedTJ107(true);
  updateModePreviews();
  renderAllViews();
});
