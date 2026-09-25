/**
 * BarCodeID Studio - Main Application Controller
 * Mengintegrasikan UI, Generator ID Unik, Barcode Engine, Exporter, dan Barcode Management System.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const ITEMS_STORAGE_KEY = 'barcode_studio_items_v5';
  const BATCHES_STORAGE_KEY = 'barcode_studio_batches_v3';

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
  const btnFolderDelete = document.getElementById('btn-folder-delete');

  // DOM Elements - Code Type Switcher
  const btnTypeBarcode = document.getElementById('btn-type-barcode');
  const btnTypeQr = document.getElementById('btn-type-qr');
  const btnTypeNone = document.getElementById('btn-type-none');
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
  const liveDesignPreviewCanvas = document.getElementById('live-design-preview-canvas');
  const livePreviewDimTag = document.getElementById('live-preview-dim-tag');

  const barcodeSizeSlider = document.getElementById('barcode-size-slider');
  const barcodeSizeVal = document.getElementById('barcode-size-val');
  const idPositionSelect = document.getElementById('id-position-select');
  const idSliceSelect = document.getElementById('id-slice-select');
  const idSliceWrap = document.getElementById('id-slice-wrap');
  const btnTotalRegistered = document.getElementById('btn-total-registered');
  const historySearchInput = document.getElementById('history-search-input');
  const historyTableBody = document.getElementById('history-table-body');
  const historyModalCountBadge = document.getElementById('history-modal-count-badge');
  const btnSwitchToManagementFromHistory = document.getElementById('btn-switch-to-management-from-history');

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

  // Mode Format Emas (Hartadinata / Antam) & Dynamic Excel Elements
  const btnFmtGold = document.getElementById('btn-fmt-gold');
  const btnFmtStandard = document.getElementById('btn-fmt-standard');
  const panelGoldMapping = document.getElementById('panel-gold-mapping');
  const panelStandardMapping = document.getElementById('panel-standard-mapping');
  const goldBrandAutotag = document.getElementById('gold-brand-autotag');
  const goldBrandHarta = document.getElementById('gold-brand-harta');
  const goldBrandAntam = document.getElementById('gold-brand-antam');
  const goldBrandNone = document.getElementById('gold-brand-none');
  const goldBrandCustomRadio = document.getElementById('gold-brand-custom-radio');
  const goldBrandCustomInput = document.getElementById('gold-brand-custom-input');
  const excelColIdSelector = document.getElementById('excel-col-id-selector');
  const excelColumnsMappingContainer = document.getElementById('excel-columns-mapping-container');
  const btnExcelPresetGold = document.getElementById('btn-excel-preset-gold');
  const btnExcelPresetLinear = document.getElementById('btn-excel-preset-linear');

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
  let excelColumnConfigs = []; // Array: [ { colIdx, name, sampleVal, enabled, targetRow } ]
  let excelBarcodeColIdx = 0;

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
  const onlyIdCheckbox = document.getElementById('only-id-checkbox');
  const checkHistoryCheckbox = document.getElementById('check-history-checkbox');

  // Action Buttons
  const btnGenerate = document.getElementById('btn-generate');
  const btnDownloadZip = document.getElementById('btn-download-zip');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportWord = document.getElementById('btn-export-word');
  const btnQuickDownloadSheet = document.getElementById('btn-quick-download-sheet');
  const btnOpenPrintModal = document.getElementById('btn-open-print-modal');
  const btnTestRenderPreview = document.getElementById('btn-test-render-preview');
  const btnApplySettingsToFolder = document.getElementById('btn-apply-settings-to-folder');
  const btnFolderRefreshDesign = document.getElementById('btn-folder-refresh-design');

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
  const btnDownloadPdfAll = document.getElementById('btn-download-pdf-all');
  const btnDownloadPdfSheet = document.getElementById('btn-download-pdf-sheet');
  const btnDownloadWordAll = document.getElementById('btn-download-word-all');
  const btnDownloadWordSheet = document.getElementById('btn-download-word-sheet');
  const printSheetPreviewCanvas = document.getElementById('print-sheet-preview-canvas');
  const printPreviewSheetTag = document.getElementById('print-preview-sheet-tag');
  const printShowBordersChk = document.getElementById('print-show-borders-chk');
  const printScopeAll = document.getElementById('print-scope-all');
  const printScopeSheet = document.getElementById('print-scope-sheet');
  const printTotalLabelsBadge = document.getElementById('print-total-labels-badge');
  const printSheetSelectorGroup = document.getElementById('print-sheet-selector-group');

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

  // Server / Docker Sync Elements
  const btnSyncServer = document.getElementById('btn-sync-server');
  const serverSyncBadge = document.getElementById('server-sync-badge');
  const syncIndicatorDot = document.getElementById('sync-indicator-dot');
  const syncStatusText = document.getElementById('sync-status-text');

  // Docker / Database Status Modal Elements
  const dockerDbModal = document.getElementById('docker-db-modal');
  const btnCloseDockerModal = document.getElementById('btn-close-docker-modal');
  const btnDismissDockerModal = document.getElementById('btn-dismiss-docker-modal');
  const btnRefreshDockerModal = document.getElementById('btn-refresh-docker-modal');
  const dockerModalStatusBadge = document.getElementById('docker-modal-status-badge');
  const dockerModalTotalItems = document.getElementById('docker-modal-total-items');
  const dockerModalTotalFolders = document.getElementById('docker-modal-total-folders');
  const dockerModalFileSize = document.getElementById('docker-modal-file-size');
  const dockerModalHostPath = document.getElementById('docker-modal-host-path');
  const remoteConnStatusTag = document.getElementById('remote-conn-status-tag');
  const cfgRemoteUrl = document.getElementById('cfg-remote-url');
  const cfgRemoteUser = document.getElementById('cfg-remote-user');
  const cfgRemotePass = document.getElementById('cfg-remote-pass');
  const cfgRemoteFolder = document.getElementById('cfg-remote-folder');
  const btnSaveRemoteConfig = document.getElementById('btn-save-remote-config');
  const btnUploadDirectFilebrowser = document.getElementById('btn-upload-direct-filebrowser');
  const btnResetToLocalDb = document.getElementById('btn-reset-to-local-db');
  const btnModalClearAllData = document.getElementById('btn-modal-clear-all-data');

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
    if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
    pushDebounceTimer = setTimeout(() => {
      pushItemsToServer(generatedItems, false);
    }, 600);
  }

  // --- SERVER / DOCKER SYNC & PERSISTENCE ---
  let isSyncing = false;
  let pushDebounceTimer = null;

  function updateSyncStatusUI(status, label) {
    if (!serverSyncBadge) return;
    serverSyncBadge.classList.remove('hidden');
    if (syncStatusText) syncStatusText.textContent = label || (status === 'synced' ? 'Server: Aktif' : 'Mode Offline');
    if (syncIndicatorDot) {
      syncIndicatorDot.className = 'w-2 h-2 rounded-full ' + (
        status === 'synced' ? 'bg-emerald-500' :
        status === 'syncing' ? 'bg-amber-500 animate-pulse' :
        'bg-slate-400'
      );
    }
  }

  async function syncWithServer(showNotice = false) {
    if (isSyncing) return;
    isSyncing = true;
    updateSyncStatusUI('syncing', 'Menyinkronkan...');
    try {
      const resp = await fetch('/api/barcodes');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data && data.success && Array.isArray(data.items)) {
        const serverItems = data.items;
        const serverFolders = Array.isArray(data.folders) ? data.folders : [];

        // Gabungkan folders
        let hasNewFolder = false;
        serverFolders.forEach(sf => {
          if (sf && !batches.some(b => b.name === sf || b.id === sf)) {
            batches.push({
              id: 'batch_' + Math.random().toString(36).substring(2, 8),
              name: sf,
              createdAt: 'Server Sync'
            });
            hasNewFolder = true;
          }
        });

        // Gabungkan items: server items merged with local items
        const itemMap = new Map();
        // Muat item lokal terlebih dahulu
        generatedItems.forEach(it => {
          if (it.id) itemMap.set(it.id, it);
        });

        // Gabungkan data dari server
        serverItems.forEach(sItem => {
          if (!sItem.id) return;
          if (itemMap.has(sItem.id)) {
            const locItem = itemMap.get(sItem.id);
            // Pertahankan status printed jika server atau lokal sudah dicetak
            const isPrinted = locItem.status === 'printed' || sItem.status === 'printed';
            Object.assign(locItem, {
              ...sItem,
              status: isPrinted ? 'printed' : locItem.status,
              printedAt: isPrinted ? (locItem.printedAt || sItem.printedAt || new Date().toISOString()) : null
            });
          } else {
            itemMap.set(sItem.id, sItem);
          }
        });

        generatedItems = Array.from(itemMap.values());
        try {
          localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(generatedItems));
          if (hasNewFolder) localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(batches));
        } catch (e) {}

        // Bila ada item lokal yang belum ada di server, push ke server
        const localOnly = generatedItems.filter(it => !serverItems.some(si => si.id === it.id));
        if (localOnly.length > 0) {
          await pushItemsToServer(generatedItems, false);
        }

        updateSyncStatusUI('synced', `Server: ${generatedItems.length} Data`);
        renderFolderPills();
        renderAllViews();
        updateStats();
        if (showNotice) {
          showToast(`Sinkronisasi berhasil! ${generatedItems.length} barcode terhubung dengan Docker/Server.`, 'success');
        }
      }
    } catch (e) {
      console.warn('Server sync offline:', e);
      updateSyncStatusUI('offline', 'Mode Offline (Lokal)');
      if (showNotice) {
        showToast('Tidak dapat terhubung ke server/Docker (Mode Offline). Data tersimpan lokal di browser.', 'info');
      }
    } finally {
      isSyncing = false;
    }
  }

  async function pushItemsToServer(itemsToPush, triggerSyncUi = true) {
    if (triggerSyncUi) updateSyncStatusUI('syncing', 'Menyimpan ke Server...');
    try {
      const folderNames = batches.map(b => b.name).filter(Boolean);
      const resp = await fetch('/api/barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToPush || generatedItems,
          folders: folderNames,
          mode: 'sync'
        })
      });
      if (resp.ok) {
        const resData = await resp.json();
        updateSyncStatusUI('synced', `Server: ${resData.count || (itemsToPush || generatedItems).length} Data`);
      } else {
        updateSyncStatusUI('offline', 'Mode Offline (Lokal)');
      }
    } catch (e) {
      console.warn('Gagal push ke server:', e);
      updateSyncStatusUI('offline', 'Mode Offline (Lokal)');
    }
  }

  async function pushStatusToServer(ids, status) {
    if (!ids || !ids.length) return;
    try {
      await fetch('/api/barcodes/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status })
      });
    } catch (e) {
      console.warn('Gagal update status di server:', e);
    }
  }

  async function pushDeleteToServer(payload) {
    try {
      await fetch('/api/barcodes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Gagal push delete ke server:', e);
    }
  }

  function toggleItemStatus(id) {
    const item = generatedItems.find(it => it.id === id);
    if (!item) return;
    const newStatus = item.status === 'printed' ? 'pending' : 'printed';
    item.status = newStatus;
    item.printedAt = newStatus === 'printed' ? new Date().toISOString() : null;

    saveItemsToStorage();
    pushStatusToServer([id], newStatus);
    renderAllViews();
    updateStats();
    showToast(`Status ID "${id}" diubah menjadi: ${newStatus === 'printed' ? 'Sudah Dicetak' : 'Belum Dicetak'}`);
  }

  function deleteSingleItem(id) {
    const item = generatedItems.find(it => it.id === id);
    if (!item) return;
    if (confirm(`Apakah Anda yakin ingin menghapus barcode "${id}"?`)) {
      generatedItems = generatedItems.filter(it => it.id !== id);
      selectedIds.delete(id);
      IdGenerator.registry.historySet.delete(id);
      IdGenerator.registry.saveToStorage();
      saveItemsToStorage();
      pushDeleteToServer({ ids: [id] });
      renderAllViews();
      updateStats();
      showToast(`Barcode "${id}" berhasil dihapus.`);
    }
  }

  function loadItemsFromStorage() {
    try {
      ['barcode_studio_items_v1', 'barcode_studio_items_v2', 'barcode_studio_items_v3', 'barcode_studio_items_v4', 'barcode_studio_batches_v1', 'barcode_studio_batches_v2'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {}
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
      let needsItemSave = false;
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
          needsItemSave = true;
        }
        if (!item.status) {
          item.status = 'pending';
          needsItemSave = true;
        }
        if (!Array.isArray(item.extraRows)) {
          item.extraRows = [];
        }
        if ((!item.labelLines || !item.labelLines.length) && item.label && item.label.includes('\n')) {
          item.labelLines = item.label.split('\n').filter(Boolean);
          needsItemSave = true;
        }
      });
      if (needsBatchSave) {
        saveBatchesToStorage();
      }
      if (needsItemSave) {
        saveItemsToStorage();
      }
    }

    // Auto-sync dengan server/Docker saat startup
    syncWithServer(false);
  }

  // --- UPDATE BADGES & STATS ---
  function updateStats() {
    // Pastikan setiap item memiliki status valid
    generatedItems.forEach(item => {
      if (!item.status) item.status = 'pending';
    });

    const folderFilter = (tableFolderFilter && tableFolderFilter.value) || 'all';
    const itemsForStats = folderFilter === 'all'
      ? generatedItems
      : generatedItems.filter(item => item.batchId === folderFilter);

    const total = itemsForStats.length;
    const printed = itemsForStats.filter(item => item.status === 'printed').length;
    const pending = total - printed;

    // Registry badge
    const regCount = IdGenerator.registry.size();
    registryCountBadge.textContent = `${regCount} ID`;

    // Pill badge & management stats
    if (managementCountPill) managementCountPill.textContent = generatedItems.length;
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
      updateFilteredItems();
      renderManagementTable();
      updateStats();
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
    updateLiveDesignPreview();
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
    updateLiveDesignPreview();
  });

  barHeightSlider.addEventListener('input', (e) => {
    barHeightVal.textContent = e.target.value;
    updateLiveDesignPreview();
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

  [seqPrefix, seqSuffix, seqStart, seqPad].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        updateModePreviews();
        updateLiveDesignPreview();
      });
    }
  });
  [randPrefix, randLength, randOptUpper, randOptNum, randOptLower].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        updateModePreviews();
        updateLiveDesignPreview();
      });
    }
  });

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
    updateLiveDesignPreview();
  });

  if (singleIdInput) {
    singleIdInput.addEventListener('input', () => {
      updateLiveDesignPreview();
    });
  }

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
    updateLiveDesignPreview();
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
    if (lower.includes('harta') || lower.includes('hartadinata')) return 'Hartadinata';
    if (lower.includes('antam') || lower.includes('butik')) return 'Antam';
    return null;
  }

  function getGoldBrand() {
    if (goldBrandNone && goldBrandNone.checked) return '';
    if (goldBrandAntam && goldBrandAntam.checked) return 'Antam';
    if (goldBrandCustomRadio && goldBrandCustomRadio.checked) {
      return (goldBrandCustomInput && goldBrandCustomInput.value.trim()) || 'Hartadinata';
    }
    return 'Hartadinata';
  }

  // Normalisasi isi sel Excel sesuai standar:
  // 1. "Hartadinata Abadi Shop" -> "Hartadinata"
  // 2. "Butik Emas Antam" -> "Antam"
  // 3. Angka gramasi ditambahkan satuan "gr" di belakangnya (misal "0.5" -> "0.5 gr")
  function normalizeExcelCellValue(val, colName = '') {
    if (val === undefined || val === null) return '';
    let s = String(val).trim();
    if (!s) return '';

    const lower = s.toLowerCase();
    const colLower = (colName || '').toLowerCase();

    // 1. Rename "Hartadinata Abadi Shop" / variannya menjadi "Hartadinata"
    if (lower.includes('hartadinata abadi shop') || lower === 'hartadinata abadi' || lower.includes('pt hartadinata abadi') || lower.includes('hartadinata shop')) {
      return 'Hartadinata';
    }

    // 2. Rename "Butik Emas Antam" / variannya menjadi "Antam"
    if (lower.includes('butik emas antam') || lower.includes('butik antam') || (lower.includes('antam') && lower.includes('butik'))) {
      return 'Antam';
    }

    // 3. Format angka gramasi: tambahkan "gr" di belakang angka
    const isGramasiCol = colLower.includes('gram') || colLower.includes('berat') || colLower.includes('weight') || colLower === 'gr';
    if (isGramasiCol) {
      const numOnly = s.replace(/\s*(gram|gr|g)\s*$/i, '').trim();
      if (numOnly && !isNaN(Number(numOnly.replace(',', '.')))) {
        return `${numOnly} gr`;
      }
    } else {
      if (/^\d+(\.\d+)?\s*gram$/i.test(s)) {
        return s.replace(/\s*gram$/i, ' gr');
      }
      if (/^\d+(\.\d+)?\s*g$/i.test(s)) {
        return s.replace(/\s*g$/i, ' gr');
      }
    }

    return s;
  }

  function setExcelFormatMode(mode) {
    excelFormatMode = mode;
    updateExcelSample();
  }

  // Ekstraksi 14 Variabel Standar Sesuai Format Tabel Database/Docker
  function extractStandardExcelFields(row, headers) {
    if (!row || !headers) return {};

    const findVal = (keywords) => {
      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i] || '').toLowerCase().trim();
        for (const kw of keywords) {
          if (h === kw || h.includes(kw)) {
            const v = row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '';
            if (v) return v;
          }
        }
      }
      return '';
    };

    const idNumber = findVal(['id number', 'id_number', 'idno', 'nomor id']);
    const nomorBarcode = findVal(['nomor barcode', 'no barcode', 'barcode number', 'barcode']);
    const sequenceNumber = findVal(['sequence number', 'seq number', 'sequence', 'no urut', 'seq']);
    const kode = findVal(['kode', 'code', 'item code', 'kode barang']);
    const namaCabang = findVal(['nama cabang', 'cabang', 'branch']);
    const lemariPenyimpanan = findVal(['lemari pe', 'lemari penyimpanan', 'lemari', 'cabinet']);
    const laciPenyimpanan = findVal(['laci penyimpanan', 'laci', 'drawer']);
    const kotakPenyimpanan = findVal(['kotak penyimpanan', 'kotak', 'box']);
    const vault = findVal(['vault', 'brankas']);
    const nama = findVal(['nama', 'name', 'customer', 'nama nasabah']);
    const noRekening = findVal(['no rekening', 'nomor rekening', 'no rek', 'rekening', 'account']);
    const pengirim = findVal(['pengirim', 'sender']);
    const rawGramasi = findVal(['gramasi', 'berat', 'weight', 'gram']);
    const gramasi = normalizeExcelCellValue(rawGramasi, 'Gramasi');
    const keping = findVal(['keping', 'qty', 'jumlah', 'pcs']);

    return {
      id_number: idNumber,
      idNumber: idNumber,
      nomor_barcode: nomorBarcode,
      nomorBarcode: nomorBarcode,
      sequence_number: sequenceNumber,
      sequenceNumber: sequenceNumber,
      kode: kode,
      nama_cabang: namaCabang,
      namaCabang: namaCabang,
      lemari_penyimpanan: lemariPenyimpanan,
      lemariPenyimpanan: lemariPenyimpanan,
      laci_penyimpanan: laciPenyimpanan,
      laciPenyimpanan: laciPenyimpanan,
      kotak_penyimpanan: kotakPenyimpanan,
      kotakPenyimpanan: kotakPenyimpanan,
      vault: vault,
      nama: nama,
      no_rekening: noRekening,
      noRekening: noRekening,
      pengirim: pengirim,
      gramasi: gramasi,
      keping: keping
    };
  }

  // Menghasilkan susunan teks baris stiker (maksimal 6 baris) berdasarkan konfigurasi dinamis
  function formatRowFromConfigs(row) {
    if (!row) return { labelLines: [], fullLabel: '' };
    const brand = getGoldBrand();
    const rowBuckets = [[], [], [], [], [], []]; // Baris 1 s/d 6

    let brandAlreadyInColumns = false;

    if (Array.isArray(excelColumnConfigs) && excelColumnConfigs.length > 0) {
      excelColumnConfigs.forEach(cfg => {
        if (cfg.colIdx === excelBarcodeColIdx) return;
        if (cfg.enabled && cfg.targetRow >= 1 && cfg.targetRow <= 6) {
          const raw = row[cfg.colIdx] !== undefined ? row[cfg.colIdx] : '';
          const colName = cfg.name || cfg.colName || '';
          const val = normalizeExcelCellValue(raw, colName);
          if (val) {
            if (brand && (val.toLowerCase() === brand.toLowerCase() || val === 'Hartadinata' || val === 'Antam')) {
              brandAlreadyInColumns = true;
            }
            rowBuckets[cfg.targetRow - 1].push(val);
          }
        }
      });
    }

    // Jika brand aktif dari radio selector dan BELUM ada di kolom Excel, sisipkan di Baris 1
    if (brand && !brandAlreadyInColumns) {
      rowBuckets[0].unshift(brand);
    }

    const labelLines = rowBuckets
      .map(parts => parts.join(' - '))
      .filter(Boolean)
      .slice(0, 6);

    return {
      labelLines: labelLines,
      fullLabel: labelLines.join('\n')
    };
  }

  function formatGoldRowLabel(row, is2Lines = true) {
    if (!row) return '';
    if (excelColumnConfigs && excelColumnConfigs.length > 0) {
      const { labelLines, fullLabel } = formatRowFromConfigs(row);
      if (is2Lines) return fullLabel;
      return labelLines.join(' - ');
    }
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

    // Auto deteksi brand Hartadinata atau Antam dari nama file
    const detected = detectGoldBrandFromFilename(fileName);
    if (detected === 'Hartadinata') {
      if (goldBrandHarta) goldBrandHarta.checked = true;
      if (goldBrandAutotag) goldBrandAutotag.textContent = 'Auto: Hartadinata';
    } else if (detected === 'Antam') {
      if (goldBrandAntam) goldBrandAntam.checked = true;
      if (goldBrandAutotag) goldBrandAutotag.textContent = 'Auto: Antam';
    } else {
      if (goldBrandAutotag) goldBrandAutotag.textContent = 'Auto: Logam Mulia';
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

    // 1. Lewati baris yang kosong seluruhnya (skip completely blank rows)
    dataRows = dataRows.filter(r => Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));

    excelHeaders = headers;
    excelRawRows = dataRows;

    if (excelFileName) excelFileName.textContent = excelCurrentFileName;
    if (excelRowCountBadge) excelRowCountBadge.textContent = `${dataRows.length} Baris`;
    if (btnExcelCountTag) btnExcelCountTag.textContent = `${dataRows.length} ID`;
    if (excelSheetNameBadge) excelSheetNameBadge.textContent = excelCurrentSheetName;
    if (excelPreviewBox) excelPreviewBox.classList.remove('hidden');

    const sampleRow = dataRows[0] || [];

    // Cari kolom Barcode ID terbaik (prioritaskan 'Nomor Barcode', 'Barcode', 'ID Number', 'ID')
    let bestIdIdx = -1;
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase().trim();
      if (lower === 'nomor barcode' || lower === 'no barcode' || lower === 'barcode number') {
        bestIdIdx = idx;
      } else if (bestIdIdx === -1 && (lower.includes('barcode') || lower === 'id number' || lower === 'id_number' || lower === 'id')) {
        bestIdIdx = idx;
      }
    });
    if (bestIdIdx === -1) {
      headers.forEach((h, idx) => {
        const lower = h.toLowerCase();
        if (lower.includes('kode') || lower.includes('pesanan') || lower.includes('order') || lower.includes('sku')) {
          if (bestIdIdx === -1) bestIdIdx = idx;
        }
      });
    }
    if (bestIdIdx === -1) bestIdIdx = 0;
    excelBarcodeColIdx = bestIdIdx;

    // Helper: Periksa apakah sebuah kolom memiliki isi data pada setidaknya 1 baris
    const colHasData = (idx) => {
      return dataRows.some(row => row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '');
    };

    // Populasi Dropdown Kolom Barcode ID (Hanya kolom yang memiliki data atau kolom ID)
    if (excelColIdSelector) {
      excelColIdSelector.innerHTML = '';
      headers.forEach((h, idx) => {
        if (!colHasData(idx) && idx !== bestIdIdx) return; // Lewati kolom kosong
        const opt = document.createElement('option');
        opt.value = idx;
        const sample = sampleRow[idx] !== undefined ? String(sampleRow[idx]).trim() : '';
        opt.textContent = `${idx + 1}. ${h}${sample ? ` (cth: ${sample})` : ''}`;
        excelColIdSelector.appendChild(opt);
      });
      excelColIdSelector.value = bestIdIdx;
    }

    // Inisialisasi Konfigurasi Kolom Dinamis (Maksimal 6 Baris Kebawah)
    // Lewati kolom yang kosong di data ("gausah di munculin di pengaturan yg di samping. lgsg lewat aja biar hemat step gaperlu nge disable 1 1")
    excelColumnConfigs = [];
    headers.forEach((h, idx) => {
      const isIdCol = (idx === bestIdIdx);
      const hasContent = colHasData(idx);

      // Jika kolom benar-benar kosong di seluruh baris data dan bukan kolom ID, LEWATI - jangan muncul di sidebar!
      if (!hasContent && !isIdCol) {
        return;
      }

      const lower = h.toLowerCase().trim();
      const sample = sampleRow[idx] !== undefined ? String(sampleRow[idx]).trim() : '';

      let targetRow = 0;
      let enabled = false;

      if (!isIdCol && hasContent) {
        if (lower.includes('gram') || lower.includes('berat') || lower.includes('weight')) {
          targetRow = 1;
          enabled = true;
        } else if (lower.includes('vault') || lower.includes('lemari') || lower.includes('laci') || lower.includes('kotak') || lower.includes('brankas') || lower.includes('rak') || lower.includes('box')) {
          targetRow = 2;
          enabled = true;
        } else if (lower.includes('cabang') || lower.includes('pengirim') || lower.includes('nama') || lower.includes('customer')) {
          targetRow = 3;
          enabled = true;
        } else if (lower.includes('rekening') || lower.includes('rek') || lower.includes('kode') || lower.includes('keping') || lower.includes('seq')) {
          targetRow = 4;
          enabled = true;
        } else {
          targetRow = Math.min(6, Math.max(1, (excelColumnConfigs.length % 6) + 1));
          enabled = true;
        }
      }

      excelColumnConfigs.push({
        colIdx: idx,
        name: h,
        colName: h,
        sampleVal: sample,
        enabled: enabled,
        targetRow: targetRow
      });
    });

    renderExcelColumnMapping();
    updateExcelSample();
  }

  function renderExcelColumnMapping() {
    if (!excelColumnsMappingContainer) return;
    excelColumnsMappingContainer.innerHTML = '';

    excelColumnConfigs.forEach((cfg) => {
      const isIdCol = (cfg.colIdx === excelBarcodeColIdx);
      const rowDiv = document.createElement('div');
      rowDiv.className = `flex items-center justify-between gap-2 p-1.5 rounded-lg border text-xs transition ${
        isIdCol 
          ? 'bg-slate-100 border-slate-200 opacity-60' 
          : (cfg.enabled ? 'bg-white border-slate-300 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-400')
      }`;

      // Left: Checkbox + Column Name + Sample Preview
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flex items-center gap-2 truncate flex-1';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = cfg.enabled && !isIdCol;
      chk.disabled = isIdCol;
      chk.className = 'rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0';
      chk.title = isIdCol ? 'Kolom ini digunakan sebagai Barcode ID' : 'Aktifkan/Nonaktifkan kolom ini pada stiker';

      const labelWrap = document.createElement('div');
      labelWrap.className = 'truncate leading-tight flex items-center gap-1.5 flex-wrap';

      const colTitle = document.createElement('span');
      colTitle.className = `font-bold text-[11px] ${cfg.enabled && !isIdCol ? 'text-slate-800' : 'text-slate-500'}`;
      colTitle.textContent = `${cfg.colIdx + 1}. ${cfg.name}`;
      labelWrap.appendChild(colTitle);

      if (isIdCol) {
        const idBadge = document.createElement('span');
        idBadge.className = 'px-1.5 py-0.2 bg-indigo-100 text-indigo-700 font-bold text-[9px] rounded shrink-0';
        idBadge.textContent = '🔑 Barcode ID';
        labelWrap.appendChild(idBadge);
      } else if (cfg.sampleVal) {
        const sampleSpan = document.createElement('span');
        sampleSpan.className = 'text-[10px] text-slate-400 font-mono truncate max-w-[140px]';
        sampleSpan.textContent = `("${cfg.sampleVal}")`;
        labelWrap.appendChild(sampleSpan);
      }

      leftDiv.appendChild(chk);
      leftDiv.appendChild(labelWrap);
      rowDiv.appendChild(leftDiv);

      // Right: Target Row Selector (Baris 1 s/d Baris 6, atau Nonaktif)
      const selectWrap = document.createElement('div');
      selectWrap.className = 'shrink-0';

      const sel = document.createElement('select');
      sel.className = 'px-1.5 py-1 border border-slate-300 rounded font-semibold text-[11px] bg-slate-50 text-slate-700 outline-none cursor-pointer';
      sel.disabled = isIdCol;

      const rowOptions = [
        { val: 1, text: 'Baris 1' },
        { val: 2, text: 'Baris 2' },
        { val: 3, text: 'Baris 3' },
        { val: 4, text: 'Baris 4' },
        { val: 5, text: 'Baris 5' },
        { val: 6, text: 'Baris 6' },
        { val: 0, text: '❌ Nonaktif' }
      ];

      rowOptions.forEach(opt => {
        const optEl = document.createElement('option');
        optEl.value = opt.val;
        optEl.textContent = opt.text;
        sel.appendChild(optEl);
      });

      sel.value = (!cfg.enabled || isIdCol) ? 0 : (cfg.targetRow || 1);

      // Listener Checkbox toggle
      chk.addEventListener('change', () => {
        cfg.enabled = chk.checked;
        if (cfg.enabled && cfg.targetRow === 0) {
          cfg.targetRow = 1;
        }
        sel.value = cfg.enabled ? cfg.targetRow : 0;
        renderExcelColumnMapping();
        updateExcelSample();
      });

      // Listener Row dropdown
      sel.addEventListener('change', () => {
        const val = parseInt(sel.value, 10);
        if (val === 0) {
          cfg.enabled = false;
          cfg.targetRow = 0;
          chk.checked = false;
        } else {
          cfg.enabled = true;
          cfg.targetRow = val;
          chk.checked = true;
        }
        renderExcelColumnMapping();
        updateExcelSample();
      });

      selectWrap.appendChild(sel);
      rowDiv.appendChild(selectWrap);

      excelColumnsMappingContainer.appendChild(rowDiv);
    });
  }

  function updateExcelSample() {
    if (!excelRawRows || !excelRawRows.length) return;
    const firstRow = excelRawRows[0] || [];

    const { labelLines } = formatRowFromConfigs(firstRow);
    const sampleId = String(firstRow[excelBarcodeColIdx] !== undefined ? firstRow[excelBarcodeColIdx] : '').trim() || '(ID Otomatis)';

    if (excelSampleGoldPreview) {
      if (labelLines.length === 0) {
        excelSampleGoldPreview.innerHTML = `<span class="text-slate-400 italic text-[11px]">Tidak ada kolom aktif yang ditampilkan pada label.</span>`;
      } else {
        const rowColors = [
          'bg-amber-100 text-amber-900 border-amber-300 font-bold',
          'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold',
          'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
          'bg-sky-50 text-sky-800 border-sky-200 font-semibold',
          'bg-purple-50 text-purple-800 border-purple-200 font-semibold',
          'bg-rose-50 text-rose-800 border-rose-200 font-semibold'
        ];

        excelSampleGoldPreview.innerHTML = labelLines.map((line, idx) => `
          <div class="flex items-center gap-1.5 truncate">
            <span class="px-1.5 py-0.2 rounded text-[9px] border shrink-0 ${rowColors[idx % rowColors.length]}">Baris ${idx + 1}</span>
            <span class="truncate ${idx === 0 ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}">${escapeHtml(line)}</span>
          </div>
        `).join('');
      }
    }

    if (excelSampleIdPreview) {
      excelSampleIdPreview.textContent = `Barcode ID: ${sampleId}`;
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
  [goldBrandHarta, goldBrandAntam, goldBrandCustomRadio, goldBrandNone].forEach(radio => {
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

  // Excel Column ID Selector
  if (excelColIdSelector) {
    excelColIdSelector.addEventListener('change', () => {
      excelBarcodeColIdx = parseInt(excelColIdSelector.value, 10) || 0;
      renderExcelColumnMapping();
      updateExcelSample();
    });
  }

  // Excel Preset Buttons
  if (btnExcelPresetGold) {
    btnExcelPresetGold.addEventListener('click', () => {
      if (!Array.isArray(excelColumnConfigs)) return;
      // Gold preset: Gramasi→Row1, rest→Row2
      excelColumnConfigs.forEach(cfg => {
        if (cfg.colIdx === excelBarcodeColIdx) { cfg.enabled = false; return; }
        const name = (cfg.name || cfg.colName || '').toLowerCase();
        if (name.includes('gramasi') || name.includes('gram') || name.includes('weight')) {
          cfg.enabled = true; cfg.targetRow = 1;
        } else if (name.includes('vault') || name.includes('lemari') || name.includes('laci') || name.includes('kotak') ||
                   name.includes('brankas') || name.includes('cabinet') || name.includes('drawer') || name.includes('box')) {
          cfg.enabled = true; cfg.targetRow = 2;
        } else {
          cfg.enabled = true; cfg.targetRow = 3;
        }
      });
      renderExcelColumnMapping();
      updateExcelSample();
    });
  }

  if (btnExcelPresetLinear) {
    btnExcelPresetLinear.addEventListener('click', () => {
      if (!Array.isArray(excelColumnConfigs)) return;
      // Linear preset: 1 column per row sequentially
      let rowNum = 1;
      excelColumnConfigs.forEach(cfg => {
        if (cfg.colIdx === excelBarcodeColIdx) { cfg.enabled = false; return; }
        cfg.enabled = true;
        cfg.targetRow = Math.min(rowNum, 6);
        rowNum++;
      });
      renderExcelColumnMapping();
      updateExcelSample();
    });
  }

  // Print Scope Toggle (All vs Per Sheet)
  if (printScopeAll) {
    printScopeAll.addEventListener('change', () => {
      if (printSheetSelectorGroup) printSheetSelectorGroup.style.display = printScopeAll.checked ? 'none' : '';
    });
  }
  if (printScopeSheet) {
    printScopeSheet.addEventListener('change', () => {
      if (printSheetSelectorGroup) printSheetSelectorGroup.style.display = printScopeSheet.checked ? '' : 'none';
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
    updateLiveDesignPreview();
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
        updateLiveDesignPreview();
      });
    }
  });

  // --- CODE TYPE SWITCHER (1D BARCODE vs QR CODE vs TANPA BARCODE) ---
  function setCodeType(type) {
    currentCodeType = type;
    if (type === 'QR') {
      if (btnTypeQr) btnTypeQr.classList.add('active');
      if (btnTypeBarcode) btnTypeBarcode.classList.remove('active');
      if (btnTypeNone) btnTypeNone.classList.remove('active');
      if (activeTypeBadge) {
        activeTypeBadge.textContent = 'QR Code Aktif';
        activeTypeBadge.className = 'text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-semibold';
      }
      if (barcode1dSymbologyGroup) barcode1dSymbologyGroup.classList.add('hidden');
      const dimGroup = document.getElementById('dimensions-control-group');
      if (dimGroup) dimGroup.classList.add('hidden');
    } else if (type === 'NONE') {
      if (btnTypeNone) btnTypeNone.classList.add('active');
      if (btnTypeQr) btnTypeQr.classList.remove('active');
      if (btnTypeBarcode) btnTypeBarcode.classList.remove('active');
      if (activeTypeBadge) {
        activeTypeBadge.textContent = 'Tanpa Barcode Aktif (Teks Saja)';
        activeTypeBadge.className = 'text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold';
      }
      if (barcode1dSymbologyGroup) barcode1dSymbologyGroup.classList.add('hidden');
      const dimGroup = document.getElementById('dimensions-control-group');
      if (dimGroup) dimGroup.classList.add('hidden');
    } else {
      if (btnTypeBarcode) btnTypeBarcode.classList.add('active');
      if (btnTypeQr) btnTypeQr.classList.remove('active');
      if (btnTypeNone) btnTypeNone.classList.remove('active');
      if (activeTypeBadge) {
        activeTypeBadge.textContent = 'Barcode 1D Aktif';
        activeTypeBadge.className = 'text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold';
      }
      if (barcode1dSymbologyGroup) barcode1dSymbologyGroup.classList.remove('hidden');
      const dimGroup = document.getElementById('dimensions-control-group');
      if (dimGroup) dimGroup.classList.remove('hidden');
    }
    updateLiveDesignPreview();
  }

  if (btnTypeBarcode) btnTypeBarcode.addEventListener('click', () => setCodeType('CODE128'));
  if (btnTypeQr) btnTypeQr.addEventListener('click', () => setCodeType('QR'));
  if (btnTypeNone) btnTypeNone.addEventListener('click', () => setCodeType('NONE'));

  // --- LAYOUT & TYPOGRAPHY LISTENERS ---
  if (layoutPositionSelect) {
    layoutPositionSelect.addEventListener('change', () => {
      updateLiveDesignPreview();
    });
  }

  if (fontSizeTitleSlider) {
    fontSizeTitleSlider.addEventListener('input', (e) => {
      if (fontSizeTitleVal) fontSizeTitleVal.textContent = `${e.target.value} pt`;
      updateLiveDesignPreview();
    });
  }

  if (fontSizeDetailsSlider) {
    fontSizeDetailsSlider.addEventListener('input', (e) => {
      if (fontSizeDetailsVal) fontSizeDetailsVal.textContent = `${e.target.value} pt`;
      updateLiveDesignPreview();
    });
  }

  if (fontSizeIdSlider) {
    fontSizeIdSlider.addEventListener('input', (e) => {
      if (fontSizeIdVal) fontSizeIdVal.textContent = `${e.target.value} pt`;
      updateLiveDesignPreview();
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

    const isNone = currentCodeType === 'NONE';
    const chosenFormat = isNone ? 'NONE' : (isQR ? 'QR' : (barcodeFormat ? barcodeFormat.value : 'CODE128'));

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
      onlyId: (onlyIdCheckbox ? onlyIdCheckbox.checked : false) || layoutPos === 'center-id-only',
      displayValue: showTextCheckbox ? showTextCheckbox.checked : true,
      barcodeScale: (parseFloat(barcodeSizeSlider ? barcodeSizeSlider.value : '100') || 100) / 100,
      idPosition: idPositionSelect ? idPositionSelect.value : 'under-code',
      idSliceChunk: idSliceSelect ? idSliceSelect.value : 'auto',
      barWidth: parseFloat(barWidthSlider ? barWidthSlider.value : '2') || 2,
      height: parseInt(barHeightSlider ? barHeightSlider.value : '45', 10) || 45,
      margin: 6,
      lineColor: '#0f172a',
      backgroundColor: '#ffffff'
    };
  }

  // --- AMBIL CONTOH ID SESUAI POLA FORMAT DI SECTION 1 ---
  function getSampleIdFromActiveConfig() {
    try {
      if (currentMode === 'sequential') {
        const p = seqPrefix ? seqPrefix.value : 'ORD';
        const s = seqSuffix ? seqSuffix.value : '';
        const pad = parseInt(seqPad ? seqPad.value : '16', 10) || 0;
        const start = parseInt(seqStart ? seqStart.value : '1', 10) || 1;
        let numStr = String(start);
        if (pad > 0) {
          numStr = numStr.padStart(pad, '0');
        }
        return `${p}${numStr}${s}` || 'ORD00000000160600001';
      } else if (currentMode === 'alphanumeric') {
        const p = randPrefix ? randPrefix.value : '';
        const len = parseInt(randLength ? randLength.value : '12', 10) || 12;
        let sample = 'A1B2C3D4E5F6'.slice(0, len);
        if (sample.length < len) sample = sample.padEnd(len, 'X');
        return `${p}${sample}`;
      } else if (currentMode === 'timestamp') {
        const p = tsPrefix ? tsPrefix.value : 'ID-';
        return `${p}${Date.now()}`;
      } else if (currentMode === 'uuid') {
        const p = uuidPrefix ? uuidPrefix.value : '';
        return `${p}9b1deb4d-3b7d`;
      } else if (currentMode === 'custom') {
        if (excelRawRows && excelRawRows.length > 0) {
          const colIdIdx = excelBarcodeColIdx || 0;
          const firstVal = String(excelRawRows[0][colIdIdx] !== undefined ? excelRawRows[0][colIdIdx] : '').trim();
          if (firstVal) return firstVal;
        }
        if (customTextarea && customTextarea.value.trim()) {
          const lines = customTextarea.value.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length > 0) return lines[0];
        }
        return 'CUSTOM-001';
      } else if (currentMode === 'single') {
        if (singleIdInput && singleIdInput.value.trim()) {
          return singleIdInput.value.trim();
        }
      }
    } catch (e) {}
    return 'ORD00000000160600001';
  }

  // --- REAL-TIME LIVE DESIGN PREVIEW ---
  function updateLiveDesignPreview() {
    if (!liveDesignPreviewCanvas) return;
    const renderOpts = getRenderOptions();
    const sampleId = getSampleIdFromActiveConfig();
    const idLen = sampleId.length;

    let sliceInfo = '';
    if (renderOpts.idPosition === 'under-code') {
      const chunks = BarcodeEngine.sliceTextChunks ? BarcodeEngine.sliceTextChunks(sampleId, renderOpts.idSliceChunk) : [sampleId];
      sliceInfo = ` • Sliced (${chunks.length} baris)`;
    } else if (renderOpts.idPosition === 'side-text') {
      sliceInfo = ' • Di Teks';
    } else {
      sliceInfo = ' • Tanpa ID';
    }

    if (livePreviewDimTag) {
      livePreviewDimTag.textContent = `${renderOpts.labelWidthMm}×${renderOpts.labelHeightMm}mm (${idLen} kar${sliceInfo})`;
    }

    const scale = 6; // 1mm = 6px untuk ketajaman HD konsisten dengan kartu folder
    const previewW = Math.round(renderOpts.labelWidthMm * scale);
    const previewH = Math.round(renderOpts.labelHeightMm * scale);
    liveDesignPreviewCanvas.width = previewW;
    liveDesignPreviewCanvas.height = previewH;
    liveDesignPreviewCanvas.style.width = '100%';
    liveDesignPreviewCanvas.style.maxWidth = '280px';
    liveDesignPreviewCanvas.style.height = 'auto';

    let previewLabelLines = null;
    let previewTopLabel = (topLabelInput && topLabelInput.value.trim()) || '';
    let previewBrand = getGoldBrand() || 'Hartadinata';
    let previewGramasi = '0.5 gr';
    let previewVault = 'Vault 1';
    let previewLemari = 'Lemari 1';
    let previewLaci = 'Laci 1';
    let previewKotak = 'Kotak 01';

    // Jika ada data Excel yang dimuat, gunakan data baris nyata pertama untuk pratinjau yang 100% akurat
    if (excelRawRows && excelRawRows.length > 0) {
      const formatted = formatRowFromConfigs(excelRawRows[0]);
      if (formatted.labelLines && formatted.labelLines.length > 0) {
        previewLabelLines = formatted.labelLines;
        previewTopLabel = formatted.fullLabel;
      }
    } else if (generatedItems && generatedItems.length > 0) {
      const first = generatedItems[0];
      if (first.labelLines && first.labelLines.length > 0) {
        previewLabelLines = first.labelLines;
      }
      previewTopLabel = first.label || previewTopLabel;
      previewBrand = first.brand || previewBrand;
      previewGramasi = first.gramasi || previewGramasi;
      previewVault = first.vault || previewVault;
      previewLemari = first.lemari || previewLemari;
      previewLaci = first.laci || previewLaci;
      previewKotak = first.kotak || previewKotak;
    }

    if (!previewTopLabel && !previewLabelLines) {
      previewTopLabel = 'Hartadinata - 0.5 gr';
    }

    const sampleOptions = {
      ...renderOpts,
      labelWidthMm: renderOpts.labelWidthMm,
      labelHeightMm: renderOpts.labelHeightMm,
      targetWidth: previewW,
      targetHeight: previewH,
      labelLines: previewLabelLines,
      brand: previewBrand,
      gramasi: previewGramasi,
      vault: previewVault,
      lemari: previewLemari,
      laci: previewLaci,
      kotak: previewKotak,
      topLabel: previewTopLabel,
      margin: renderOpts.margin || 8
    };

    if (renderOpts.onlyId) {
      sampleOptions.onlyId = true;
      sampleOptions.labelLines = null;
      sampleOptions.topLabel = '';
    }

    try {
      BarcodeEngine.renderToCanvas(liveDesignPreviewCanvas, sampleId, sampleOptions);
    } catch (err) {
      console.warn('Gagal merender live design preview:', err);
    }
  }

  if (topLabelInput) {
    topLabelInput.addEventListener('input', () => {
      updateLiveDesignPreview();
    });
  }

  if (barcodeSizeSlider) {
    barcodeSizeSlider.addEventListener('input', (e) => {
      if (barcodeSizeVal) barcodeSizeVal.textContent = `${e.target.value}%`;
      updateLiveDesignPreview();
    });
  }

  if (onlyIdCheckbox) {
    onlyIdCheckbox.addEventListener('change', () => {
      updateLiveDesignPreview();
    });
  }

  if (showTextCheckbox) {
    showTextCheckbox.addEventListener('change', () => {
      updateLiveDesignPreview();
    });
  }

  if (idPositionSelect) {
    idPositionSelect.addEventListener('change', (e) => {
      if (idSliceWrap) {
        idSliceWrap.classList.toggle('hidden', e.target.value !== 'under-code');
      }
      updateLiveDesignPreview();
    });
  }

  if (idSliceSelect) {
    idSliceSelect.addEventListener('change', () => {
      updateLiveDesignPreview();
    });
  }

  // --- BUTTONS: TEST RENDER & TERAPKAN KE FOLDER ---
  if (btnTestRenderPreview) {
    btnTestRenderPreview.addEventListener('click', () => {
      updateLiveDesignPreview();
      showToast('Pratinjau desain diperbarui.');
    });
  }

  const applyDesignSettingsToFolder = () => {
    renderAllViews();
    showToast('Pengaturan desain berhasil diterapkan ke semua label di folder!');
  };

  if (btnApplySettingsToFolder) {
    btnApplySettingsToFolder.addEventListener('click', applyDesignSettingsToFolder);
  }

  if (btnFolderRefreshDesign) {
    btnFolderRefreshDesign.addEventListener('click', applyDesignSettingsToFolder);
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
            const colIdIdx = excelBarcodeColIdx || 0;

            const itemsFromExcel = [];
            const seenInBatch = new Set();
            let duplicateCount = 0;

            excelRawRows.forEach(row => {
              const val = String(row[colIdIdx] !== undefined ? row[colIdIdx] : '').trim();
              if (!val) return;

              // Ekstraksi 14 variabel standar sesuai skema database Docker
              const standardFields = extractStandardExcelFields(row, excelHeaders);
              const barcodeId = standardFields.nomorBarcode || standardFields.idNumber || val;

              if (seenInBatch.has(barcodeId)) {
                duplicateCount++;
                return;
              }
              seenInBatch.add(barcodeId);

              // Build labelLines from dynamic column configs
              const { labelLines, fullLabel } = formatRowFromConfigs(row);

              let brandVal = getGoldBrand() || '';
              let gramasiVal = standardFields.gramasi || '';
              let vaultVal = standardFields.vault || '';
              let lemariVal = standardFields.lemariPenyimpanan || '';
              let laciVal = standardFields.laciPenyimpanan || '';
              let kotakVal = standardFields.kotakPenyimpanan || '';

              if (Array.isArray(excelColumnConfigs)) {
                excelColumnConfigs.forEach(cfg => {
                  if (!cfg.enabled || cfg.colIdx === colIdIdx) return;
                  const rawV = row[cfg.colIdx] !== undefined ? row[cfg.colIdx] : '';
                  const v = normalizeExcelCellValue(rawV, cfg.colName);
                  const name = (cfg.colName || '').toLowerCase();
                  if (name.includes('gramasi') || name.includes('gram') || name.includes('weight')) gramasiVal = v;
                  else if (name.includes('brand') || name.includes('toko') || name.includes('vendor')) brandVal = v;
                  else if (name.includes('vault') || name.includes('brankas')) vaultVal = v;
                  else if (name.includes('lemari') || name.includes('cabinet')) lemariVal = v;
                  else if (name.includes('laci') || name.includes('drawer')) laciVal = v;
                  else if (name.includes('kotak') || name.includes('box')) kotakVal = v;
                });
              }

              itemsFromExcel.push({
                ...standardFields,
                id: barcodeId,
                label: fullLabel,
                labelLines: labelLines,
                brand: brandVal || standardFields.nama || 'Hartadinata',
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
      const chosenFormat = currentCodeType === 'NONE' ? 'NONE' : (currentCodeType === 'QR' ? 'QR' : (barcodeFormat ? barcodeFormat.value : 'CODE128'));
      const nowFormatted = new Date().toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // Pastikan batch aktif valid
      let targetBatch = batches.find(b => b.id === activeFolderId);
      const rawBatchName = batchNameInput ? batchNameInput.value.trim() : '';

      if (rawBatchName) {
        const finalBatchName = rawBatchName;
        targetBatch = {
          id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: finalBatchName,
          createdAt: nowFormatted,
          format: chosenFormat
        };
        batches.push(targetBatch);
        saveBatchesToStorage();
      } else if (!targetBatch || targetBatch.id === 'all') {
        const finalBatchName = excelCurrentFileName ? `Excel - ${excelCurrentFileName.replace(/\.[^/.]+$/, '')}` : `Batch ${nowFormatted}`;
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
          ...it,
          id: it.id,
          label: it.label || defaultLabel,
          labelLines: Array.isArray(it.labelLines) ? [...it.labelLines] : (it.label ? it.label.split('\n').filter(Boolean) : []),
          brand: it.brand || it.nama || '',
          gramasi: it.gramasi || '',
          vault: it.vault || '',
          lemari: it.lemari || it.lemariPenyimpanan || '',
          laci: it.laci || it.laciPenyimpanan || '',
          kotak: it.kotak || it.kotakPenyimpanan || '',
          extraRows: [...pregenClean],
          batchId: targetBatch.id,
          batchName: targetBatch.name,
          format: chosenFormat,
          status: 'pending',
          printedAt: null,
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

      const delBtn = document.createElement('span');
      delBtn.className = 'hover:text-rose-600 font-bold ml-1 text-xs px-1 text-slate-400 hover:bg-rose-50 rounded transition shrink-0';
      delBtn.title = `Hapus folder ${batch.name}`;
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFolder(batch.id);
      });
      btn.appendChild(delBtn);

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
    updateLiveDesignPreview();
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
    canvas.className = 'crisp-hd';
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvasWrap.appendChild(canvas);
    card.appendChild(canvasWrap);

    // Render Barcode / QR Code ke Canvas dengan resolusi tajam HD
    try {
      const scale = 6; // 1mm = 6px untuk ketajaman HD pada layar retina/smartphone
      const targetW = Math.round(renderOpts.labelWidthMm * scale);
      const targetH = Math.round(renderOpts.labelHeightMm * scale);
      const mergedOpts = {
        ...renderOpts,
        ...item,
        targetWidth: targetW,
        targetHeight: targetH,
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

  // --- MANAGEMENT TABLE SELECTION & BATCH ACTIONS ---
  function syncSelectAllState() {
    if (!tableSelectAll) return;
    const currentTableItems = getActiveManagementItems();
    if (!currentTableItems.length) {
      tableSelectAll.checked = false;
      tableSelectAll.indeterminate = false;
      return;
    }
    const selectedInTable = currentTableItems.filter(it => selectedIds.has(it.id)).length;
    if (selectedInTable === 0) {
      tableSelectAll.checked = false;
      tableSelectAll.indeterminate = false;
    } else if (selectedInTable === currentTableItems.length) {
      tableSelectAll.checked = true;
      tableSelectAll.indeterminate = false;
    } else {
      tableSelectAll.checked = false;
      tableSelectAll.indeterminate = true;
    }
  }

  if (tableSelectAll) {
    tableSelectAll.addEventListener('change', (e) => {
      const currentTableItems = getActiveManagementItems();
      if (e.target.checked) {
        currentTableItems.forEach(it => selectedIds.add(it.id));
      } else {
        currentTableItems.forEach(it => selectedIds.delete(it.id));
      }
      renderManagementTable();
      updateStats();
    });
  }

  if (btnBatchMarkPrinted) {
    btnBatchMarkPrinted.addEventListener('click', () => {
      if (selectedIds.size === 0) {
        showToast('Pilih minimal satu barcode di tabel untuk menandai sudah dicetak.', 'info');
        return;
      }
      const ids = Array.from(selectedIds);
      const nowStr = new Date().toISOString();
      generatedItems.forEach(item => {
        if (selectedIds.has(item.id)) {
          item.status = 'printed';
          item.printedAt = nowStr;
        }
      });
      saveItemsToStorage();
      pushStatusToServer(ids, 'printed');
      renderAllViews();
      updateStats();
      showToast(`${ids.length} barcode berhasil ditandai sebagai Sudah Dicetak.`);
    });
  }

  if (btnBatchMarkPending) {
    btnBatchMarkPending.addEventListener('click', () => {
      if (selectedIds.size === 0) {
        showToast('Pilih minimal satu barcode di tabel untuk menandai belum dicetak.', 'info');
        return;
      }
      const ids = Array.from(selectedIds);
      generatedItems.forEach(item => {
        if (selectedIds.has(item.id)) {
          item.status = 'pending';
          item.printedAt = null;
        }
      });
      saveItemsToStorage();
      pushStatusToServer(ids, 'pending');
      renderAllViews();
      updateStats();
      showToast(`${ids.length} barcode berhasil ditandai sebagai Belum Dicetak.`);
    });
  }

  if (btnBatchDelete) {
    btnBatchDelete.addEventListener('click', () => {
      if (selectedIds.size === 0) {
        showToast('Pilih minimal satu barcode di tabel untuk dihapus.', 'info');
        return;
      }
      const count = selectedIds.size;
      if (confirm(`Apakah Anda yakin ingin menghapus ${count} barcode yang dipilih?`)) {
        const ids = Array.from(selectedIds);
        ids.forEach(id => IdGenerator.registry.historySet.delete(id));
        IdGenerator.registry.saveToStorage();

        generatedItems = generatedItems.filter(item => !selectedIds.has(item.id));
        selectedIds.clear();
        saveItemsToStorage();
        pushDeleteToServer({ ids });
        renderAllViews();
        updateStats();
        showToast(`${count} barcode berhasil dihapus.`);
      }
    });
  }

  // Docker / Database Status Modal Logic
  async function updateDockerModalStatus() {
    if (!dockerDbModal) return;
    if (dockerModalStatusBadge) {
      dockerModalStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800';
      dockerModalStatusBadge.textContent = '⏳ Memeriksa server...';
    }
    try {
      const resp = await fetch('/api/database/status');
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success) {
          if (dockerModalStatusBadge) {
            dockerModalStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800';
            dockerModalStatusBadge.textContent = '🟢 Terhubung (Docker / Server Aktif)';
          }
          if (dockerModalTotalItems) dockerModalTotalItems.textContent = `${data.totalItems || 0} Barcode`;
          if (dockerModalTotalFolders) dockerModalTotalFolders.textContent = `${data.folders || 0} Folder`;
          if (dockerModalFileSize) {
            const kb = ((data.sizeBytes || 0) / 1024).toFixed(1);
            dockerModalFileSize.textContent = `${kb} KB`;
          }
          if (dockerModalHostPath && data.file) {
            dockerModalHostPath.textContent = data.file;
          }
          return;
        }
      }
      throw new Error('Gagal mengambil status');
    } catch (e) {
      if (dockerModalStatusBadge) {
        dockerModalStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700';
        dockerModalStatusBadge.textContent = '⚪ Mode Standalone / Offline';
      }
      if (dockerModalTotalItems) dockerModalTotalItems.textContent = `${generatedItems.length} Barcode (Lokal)`;
      if (dockerModalTotalFolders) dockerModalTotalFolders.textContent = `${batches.length} Folder (Lokal)`;
      if (dockerModalFileSize) dockerModalFileSize.textContent = 'Tersimpan di Browser LocalStorage';
    }
  }

  function openDockerModal() {
    if (!dockerDbModal) return;
    dockerDbModal.classList.remove('hidden');
    dockerDbModal.classList.add('flex');
    updateDockerModalStatus();
  }

  function closeDockerModal() {
    if (!dockerDbModal) return;
    dockerDbModal.classList.add('hidden');
    dockerDbModal.classList.remove('flex');
  }

  if (serverSyncBadge) {
    serverSyncBadge.addEventListener('click', () => {
      openDockerModal();
    });
  }

  if (btnSyncServer) {
    btnSyncServer.addEventListener('click', () => {
      syncWithServer(true);
      updateDockerModalStatus();
    });
  }

  if (btnCloseDockerModal) btnCloseDockerModal.addEventListener('click', closeDockerModal);
  if (btnDismissDockerModal) btnDismissDockerModal.addEventListener('click', closeDockerModal);
  if (btnRefreshDockerModal) {
    btnRefreshDockerModal.addEventListener('click', () => {
      syncWithServer(false);
      updateDockerModalStatus();
    });
  }

  // Load Remote Config dari Server / LocalStorage
  async function loadRemoteConfig() {
    try {
      const resp = await fetch('/api/remote/config');
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.config) {
          if (cfgRemoteUrl && data.config.remoteUrl) cfgRemoteUrl.value = data.config.remoteUrl;
          if (cfgRemoteUser && data.config.remoteUser) cfgRemoteUser.value = data.config.remoteUser;
          if (cfgRemotePass && data.config.remotePass) cfgRemotePass.value = data.config.remotePass;
          if (remoteConnStatusTag) {
            remoteConnStatusTag.textContent = data.config.syncMode === 'remote' ? 'Remote Aktif' : 'Lokal';
            remoteConnStatusTag.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ' + 
              (data.config.syncMode === 'remote' ? 'bg-emerald-200 text-emerald-900' : 'bg-indigo-200 text-indigo-900');
          }
        }
      }
    } catch (e) {
      console.warn('Gagal memuat remote config:', e);
    }
  }
  loadRemoteConfig();

  // Simpan Konfigurasi Direktori Remote
  if (btnSaveRemoteConfig) {
    btnSaveRemoteConfig.addEventListener('click', async () => {
      const remoteUrl = cfgRemoteUrl ? cfgRemoteUrl.value.trim() : 'http://10.227.241.211:8080';
      const remoteUser = cfgRemoteUser ? cfgRemoteUser.value.trim() : 'admin';
      const remotePass = cfgRemotePass ? cfgRemotePass.value.trim() : '';

      try {
        const resp = await fetch('/api/remote/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            remoteUrl,
            remoteUser,
            remotePass,
            syncMode: 'remote'
          })
        });

        if (remoteConnStatusTag) {
          remoteConnStatusTag.textContent = 'Remote Aktif';
          remoteConnStatusTag.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-200 text-emerald-900';
        }

        showToast(`Direktori diubah ke ${remoteUrl}! Sedang sinkronisasi...`, 'success');
        await syncWithServer(true);
        updateDockerModalStatus();
      } catch (err) {
        showToast('Gagal menyimpan konfigurasi remote: ' + err.message, 'error');
      }
    });
  }

  // Buat Folder Baru & Simpan Langsung ke Docker File Browser (http://10.227.241.211:8080)
  if (btnUploadDirectFilebrowser) {
    btnUploadDirectFilebrowser.addEventListener('click', async () => {
      const remoteUrl = (cfgRemoteUrl ? cfgRemoteUrl.value.trim() : 'http://10.227.241.211:8080').replace(/\/+$/, '');
      const user = cfgRemoteUser ? cfgRemoteUser.value.trim() : 'admin';
      const pass = cfgRemotePass ? cfgRemotePass.value.trim() : '';
      const folderRaw = (cfgRemoteFolder ? cfgRemoteFolder.value.trim() : 'barcode-data') || 'barcode-data';
      const folder = folderRaw.replace(/^\/+/, '').replace(/\/+$/, '');

      if (!remoteUrl || !user || !pass) {
        showToast('Mohon lengkapi URL, Username, dan Password File Browser.', 'error');
        return;
      }

      const origBtnHtml = btnUploadDirectFilebrowser.innerHTML;
      btnUploadDirectFilebrowser.disabled = true;
      btnUploadDirectFilebrowser.innerHTML = '⏳ Menghubungkan ke File Browser...';

      try {
        // 1. Login ke File Browser via POST /api/login
        const loginResp = await fetch(`${remoteUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass })
        });

        if (!loginResp.ok) {
          throw new Error(`Login File Browser gagal (${loginResp.status} ${loginResp.statusText}). Periksa username & password.`);
        }

        const token = (await loginResp.text()).trim();
        if (!token) throw new Error('Gagal mendapatkan token autentikasi dari File Browser.');

        btnUploadDirectFilebrowser.innerHTML = `📁 Membuat folder /${folder}...`;

        // 2. Buat folder baru di File Browser via POST /api/resources/{folder}/
        try {
          await fetch(`${remoteUrl}/api/resources/${folder}/?override=false`, {
            method: 'POST',
            headers: { 'X-Auth': token }
          });
        } catch (e) {
          // Abaikan jika folder sudah ada (409)
        }

        btnUploadDirectFilebrowser.innerHTML = `⬆️ Menyimpan data ke /${folder}/barcodes.json...`;

        // 3. Siapkan konten database JSON
        const dbPayload = {
          items: generatedItems,
          folders: batches.map(b => b.name).filter(Boolean),
          totalItems: generatedItems.length,
          uploadedAt: new Date().toISOString()
        };
        const dbBlob = new Blob([JSON.stringify(dbPayload, null, 2)], { type: 'application/json' });

        // 4. Upload file barcodes.json ke folder baru
        const uploadResp = await fetch(`${remoteUrl}/api/resources/${folder}/barcodes.json?override=true`, {
          method: 'POST',
          headers: { 'X-Auth': token },
          body: dbBlob
        });

        if (!uploadResp.ok) {
          throw new Error(`Gagal mengunggah file ke /${folder}/barcodes.json (${uploadResp.status})`);
        }

        // 5. Berhasil! Beri feedback
        if (remoteConnStatusTag) {
          remoteConnStatusTag.textContent = `Tersimpan di /${folder}`;
          remoteConnStatusTag.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-200 text-emerald-900';
        }

        showToast(`✅ Berhasil! Folder /${folder} telah dibuat & ${generatedItems.length} barcode tersimpan di File Browser!`, 'success');
      } catch (err) {
        console.error('FileBrowser Direct Upload Error:', err);
        showToast('Gagal simpan ke File Browser: ' + err.message, 'error');
      } finally {
        btnUploadDirectFilebrowser.disabled = false;
        btnUploadDirectFilebrowser.innerHTML = origBtnHtml;
      }
    });
  }

  // Reset ke Server Lokal
  if (btnResetToLocalDb) {
    btnResetToLocalDb.addEventListener('click', async () => {
      try {
        await fetch('/api/remote/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syncMode: 'local' })
        });

        if (remoteConnStatusTag) {
          remoteConnStatusTag.textContent = 'Lokal';
          remoteConnStatusTag.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-200 text-indigo-900';
        }
        showToast('Direktori dikembalikan ke Server Lokal.');
        updateDockerModalStatus();
      } catch (err) {
        showToast('Gagal mereset: ' + err.message, 'error');
      }
    });
  }

  // Hapus Semua Data Lokal & Database (Reset Total)
  if (btnModalClearAllData) {
    btnModalClearAllData.addEventListener('click', async () => {
      if (!confirm('PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA barcode, riwayat, dan folder yang tersimpan baik di lokal maupun server database? Tindakan ini TIDAK DAPAT DIBATALKAN.')) {
        return;
      }

      try {
        // 1. Bersihkan memory
        generatedItems = [];
        batches = [];
        selectedIds.clear();

        // 2. Bersihkan IdGenerator registry
        if (IdGenerator && IdGenerator.registry) {
          IdGenerator.registry.clear();
          try {
            localStorage.removeItem('barcode_id_studio_history_v5');
          } catch (e) {}
        }

        // 3. Bersihkan LocalStorage
        try {
          localStorage.removeItem(ITEMS_STORAGE_KEY);
          localStorage.removeItem(BATCHES_STORAGE_KEY);
          ['barcode_studio_items_v1', 'barcode_studio_items_v2', 'barcode_studio_items_v3', 'barcode_studio_items_v4', 'barcode_studio_items_v5',
           'barcode_studio_batches_v1', 'barcode_studio_batches_v2', 'barcode_studio_batches_v3',
           'barcode_id_studio_history_v1', 'barcode_id_studio_history_v2', 'barcode_id_studio_history_v3', 'barcode_id_studio_history_v4', 'barcode_id_studio_history_v5'
          ].forEach(k => {
            try { localStorage.removeItem(k); } catch (err) {}
          });
        } catch (e) {}

        // 4. Request hapus semua data di server database
        await pushDeleteToServer({ all: true });

        // 5. Update UI
        renderFolderPills();
        renderAllViews();
        updateStats();
        updateDockerModalStatus();

        showToast('Semua data lokal & database telah berhasil dihapus bersih!', 'success');
      } catch (err) {
        showToast('Gagal menghapus beberapa data: ' + err.message, 'error');
      }
    });
  }

  // Listener untuk filter folder dan status di tabel management
  if (tableFolderFilter) {
    tableFolderFilter.addEventListener('change', () => {
      renderManagementTable();
      updateStats();
    });
  }
  if (tableStatusFilter) {
    tableStatusFilter.addEventListener('change', () => {
      updateFilteredItems();
      renderManagementTable();
      updateStats();
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

      // Rekonstruksi labelLines dan label teks agar perubahan detail tersinkronisasi
      const updatedLines = [];
      const editBrand = currentEditingItem.brand;
      const editGram = currentEditingItem.gramasi;
      if (editBrand || editGram) {
        updatedLines.push([editBrand, editGram].filter(Boolean).join(' - '));
      }
      const editLoc = [currentEditingItem.vault, currentEditingItem.lemari, currentEditingItem.laci, currentEditingItem.kotak].filter(Boolean);
      if (editLoc.length > 0) {
        updatedLines.push(editLoc.join(' - '));
      }
      currentEditingItem.extraRows.forEach(r => {
        const k = (r.key || '').trim();
        const v = (r.value || '').trim();
        if (k && v) updatedLines.push(`${k}: ${v}`);
        else if (v) updatedLines.push(v);
        else if (k) updatedLines.push(k);
      });
      currentEditingItem.labelLines = updatedLines.slice(0, 6);
      currentEditingItem.label = updatedLines.join('\n');

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

  // --- DELETE FOLDER / BATCH ---
  function deleteFolder(folderId) {
    if (!folderId || folderId === 'all') {
      showToast('Pilih salah satu folder tertentu terlebih dahulu untuk menghapusnya.', 'info');
      return;
    }
    const targetBatch = batches.find(b => b.id === folderId);
    if (!targetBatch) return;

    const itemsInBatch = generatedItems.filter(item => (item.batchId || 'default') === folderId);
    const confirmMsg = itemsInBatch.length > 0
      ? `Apakah Anda yakin ingin menghapus folder "${targetBatch.name}" beserta seluruh ${itemsInBatch.length} barcode di dalamnya?\n\nSemua data barcode di folder ini akan dihapus.`
      : `Apakah Anda yakin ingin menghapus folder kosong "${targetBatch.name}"?`;

    if (confirm(confirmMsg)) {
      const folderToDelete = targetBatch.name;
      generatedItems = generatedItems.filter(item => (item.batchId || 'default') !== folderId);
      batches = batches.filter(b => b.id !== folderId);
      selectedIds.clear();
      saveItemsToStorage();
      saveBatchesToStorage();
      pushDeleteToServer({ folder: folderToDelete });
      if (activeFolderId === folderId) {
        activeFolderId = 'all';
      }
      renderFolderPills();
      renderAllViews();
      showToast(`Folder "${targetBatch.name}" berhasil dihapus!`, 'success');
    }
  }

  if (btnFolderDelete) {
    btnFolderDelete.addEventListener('click', () => {
      if (activeFolderId === 'all') {
        showToast('Pilih salah satu folder terlebih dahulu pada tab pill di atas untuk menghapusnya.', 'info');
        return;
      }
      deleteFolder(activeFolderId);
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

    // Update total labels badge
    if (printTotalLabelsBadge) {
      printTotalLabelsBadge.textContent = `${items.length} label · ${totalSheets} lembar`;
    }

    // Perbarui pratinjau lembaran presisi
    renderSheetPreviewInPrintModal();
  }

  // --- RENDER LIVE EXACT SHEET THUMBNAIL PREVIEW IN PRINT MODAL ---
  function renderSheetPreviewInPrintModal() {
    if (!printSheetPreviewCanvas) return;
    const items = lastFilteredItems.length ? lastFilteredItems : generatedItems;
    if (!items || !items.length) {
      printSheetPreviewCanvas.width = 240;
      printSheetPreviewCanvas.height = 140;
      const ctx = printSheetPreviewCanvas.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 240, 140);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Belum ada label untuk dipratinjau', 120, 70);
      return;
    }

    const renderOpts = getRenderOptions();
    const sheetIdx = parseInt(printSheetSelect ? printSheetSelect.value : '0', 10) || 0;
    const showBorders = printShowBordersChk ? printShowBordersChk.checked : true;

    if (printPreviewSheetTag) {
      const templateName = (presetTemplateSelect ? presetTemplateSelect.value : 'tj-107').toUpperCase();
      const cap = renderOpts.cols * renderOpts.rows;
      printPreviewSheetTag.textContent = `${templateName} · ${renderOpts.paperWidthMm}×${renderOpts.paperHeightMm}mm (Lembar ${sheetIdx + 1} / ${cap} Label)`;
    }

    try {
      if (BarcodeExporter && BarcodeExporter.renderSheetToCanvas) {
        const fullSheetCanvas = BarcodeExporter.renderSheetToCanvas(items, renderOpts, sheetIdx, showBorders);
        const maxThumbW = 260;
        const aspect = fullSheetCanvas.width / fullSheetCanvas.height;
        const thumbW = maxThumbW;
        const thumbH = Math.round(maxThumbW / aspect);

        printSheetPreviewCanvas.width = thumbW;
        printSheetPreviewCanvas.height = thumbH;
        const ctx = printSheetPreviewCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(fullSheetCanvas, 0, 0, thumbW, thumbH);
      }
    } catch (err) {
      console.warn('Gagal merender pratinjau lembaran:', err);
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

      // Tandai barcode pada sheet ini sebagai sudah dicetak
      const start = sheetIndex * sheetCap;
      const end = Math.min(start + sheetCap, items.length);
      const sheetItems = items.slice(start, end);
      const nowStr = new Date().toISOString();
      sheetItems.forEach(it => {
        it.status = 'printed';
        it.printedAt = nowStr;
      });
      saveItemsToStorage();
      pushStatusToServer(sheetItems.map(it => it.id).filter(Boolean), 'printed');
      renderAllViews();
      updateStats();

      showToast(`Gambar Lembar ${sheetIndex + 1} (${sheetCap} Label) berhasil diunduh!`, 'success');
    } catch (err) {
      console.error('Gagal unduh sheet PNG:', err);
      showToast('Gagal mengunduh lembar: ' + err.message, 'error');
    } finally {
      loadingOverlay.classList.remove('active');
    }
  }

  // --- DOWNLOAD PDF SHEET (ALL PAGES OR SINGLE SHEET) ---
  async function triggerPDFDownload(scope = 'all') {
    const items = lastFilteredItems.length ? lastFilteredItems : generatedItems;
    if (!items.length) {
      showToast('Tidak ada barcode untuk diekspor ke PDF.', 'error');
      return;
    }

    const showBorders = printShowBordersChk ? printShowBordersChk.checked : true;
    const renderOpts = getRenderOptions();
    const sheetIdx = scope === 'all' ? 'all' : (parseInt(printSheetSelect ? printSheetSelect.value : '0', 10) || 0);

    loadingOverlay.classList.add('active');
    loadingText.textContent = scope === 'all' 
      ? 'Menyusun dokumen PDF untuk semua halaman stiker...'
      : `Menyusun dokumen PDF untuk Lembar ${sheetIdx + 1}...`;

    try {
      await BarcodeExporter.downloadFullSheetPDF(
        items,
        renderOpts,
        sheetIdx,
        showBorders
      );

      // Tandai barcode yang diekspor sebagai sudah dicetak
      const nowStr = new Date().toISOString();
      const sheetCap = renderOpts.cols * renderOpts.rows;
      const printedItems = sheetIdx === 'all'
        ? items
        : items.slice(sheetIdx * sheetCap, Math.min((sheetIdx + 1) * sheetCap, items.length));
      printedItems.forEach(it => {
        it.status = 'printed';
        it.printedAt = nowStr;
      });
      saveItemsToStorage();
      pushStatusToServer(printedItems.map(it => it.id).filter(Boolean), 'printed');
      renderAllViews();
      updateStats();

      showToast(scope === 'all' ? 'Dokumen PDF (Semua Halaman) berhasil diunduh!' : `Dokumen PDF Lembar ${sheetIdx + 1} berhasil diunduh!`, 'success');
    } catch (err) {
      console.error('Gagal unduh PDF:', err);
      showToast('Gagal mengunduh PDF: ' + err.message, 'error');
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

  if (btnDownloadPdfAll) {
    btnDownloadPdfAll.addEventListener('click', () => {
      triggerPDFDownload('all');
    });
  }

  if (btnDownloadPdfSheet) {
    btnDownloadPdfSheet.addEventListener('click', () => {
      triggerPDFDownload('sheet');
    });
  }

  // --- DOWNLOAD WORD (.DOCX) SHEET (ALL PAGES OR SINGLE SHEET) ---
  async function triggerWordDownload(scope = 'all') {
    const items = lastFilteredItems.length ? lastFilteredItems : generatedItems;
    if (!items.length) {
      showToast('Tidak ada barcode untuk diekspor ke Word (.docx).', 'error');
      return;
    }

    const showBorders = printShowBordersChk ? printShowBordersChk.checked : true;
    const renderOpts = getRenderOptions();
    const sheetIdx = scope === 'all' ? 'all' : (parseInt(printSheetSelect ? printSheetSelect.value : '0', 10) || 0);

    loadingOverlay.classList.add('active');
    loadingText.textContent = scope === 'all' 
      ? 'Menyusun dokumen Word (.docx) untuk semua halaman stiker...'
      : `Menyusun dokumen Word (.docx) untuk Lembar ${sheetIdx + 1}...`;

    try {
      await BarcodeExporter.downloadFullSheetDocx(
        items,
        renderOpts,
        sheetIdx,
        showBorders
      );

      // Tandai barcode yang diekspor sebagai sudah dicetak
      const nowStr = new Date().toISOString();
      const sheetCap = renderOpts.cols * renderOpts.rows;
      const printedItems = sheetIdx === 'all'
        ? items
        : items.slice(sheetIdx * sheetCap, Math.min((sheetIdx + 1) * sheetCap, items.length));
      printedItems.forEach(it => {
        it.status = 'printed';
        it.printedAt = nowStr;
      });
      saveItemsToStorage();
      pushStatusToServer(printedItems.map(it => it.id).filter(Boolean), 'printed');
      renderAllViews();
      updateStats();

      showToast(scope === 'all' ? 'Dokumen Word (.docx) Semua Halaman berhasil diunduh!' : `Dokumen Word (.docx) Lembar ${sheetIdx + 1} berhasil diunduh!`, 'success');
    } catch (err) {
      console.error('Gagal unduh Word (.docx):', err);
      showToast('Gagal mengunduh Word: ' + err.message, 'error');
    } finally {
      loadingOverlay.classList.remove('active');
    }
  }

  if (btnExportWord) {
    btnExportWord.addEventListener('click', () => {
      triggerWordDownload('all');
    });
  }

  if (btnDownloadWordAll) {
    btnDownloadWordAll.addEventListener('click', () => {
      triggerWordDownload('all');
    });
  }

  if (btnDownloadWordSheet) {
    btnDownloadWordSheet.addEventListener('click', () => {
      triggerWordDownload('sheet');
    });
  }

  if (printSheetSelect) {
    printSheetSelect.addEventListener('change', () => {
      renderSheetPreviewInPrintModal();
    });
  }

  if (printShowBordersChk) {
    printShowBordersChk.addEventListener('change', () => {
      renderSheetPreviewInPrintModal();
    });
  }

  document.querySelectorAll('input[name="print-layout"]').forEach(radio => {
    radio.addEventListener('change', () => {
      renderSheetPreviewInPrintModal();
    });
  });

  // --- PRINT MODAL ACTIONS ---
  btnOpenPrintModal.addEventListener('click', () => {
    if (!lastFilteredItems.length && !generatedItems.length) {
      showToast('Buat barcode terlebih dahulu sebelum mencetak.', 'error');
      return;
    }
    updatePrintSheetSelector();
    printModal.classList.remove('hidden');
    printModal.classList.add('flex');
    renderSheetPreviewInPrintModal();
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
    const printScope = document.querySelector('input[name="print-scope"]:checked');
    const isPrintAll = printScope && printScope.value === 'all';

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

    if (isPrintAll) {
      // Print All: render ALL items into grid temporarily
      const items = lastFilteredItems.length ? lastFilteredItems : generatedItems;
      if (items.length === 0) {
        showToast('Tidak ada barcode untuk dicetak.', 'error');
        return;
      }

      const renderOpts = getRenderOptions();
      const sheetCap = renderOpts.cols * renderOpts.rows;
      const totalSheets = Math.ceil(items.length / sheetCap);
      const gridEl = document.getElementById('barcode-grid');
      const prevHTML = gridEl.innerHTML;

      // Build multi-page grid
      gridEl.innerHTML = '';
      for (let s = 0; s < totalSheets; s++) {
        const sheetDiv = document.createElement('div');
        sheetDiv.className = 'print-page-sheet';
        const start = s * sheetCap;
        const end = Math.min(start + sheetCap, items.length);
        for (let i = start; i < end; i++) {
          const card = createBarcodeCard(items[i], i, renderOpts);
          sheetDiv.appendChild(card);
        }
        gridEl.appendChild(sheetDiv);
      }

      // Tandai semua item yang dicetak sebagai status 'printed'
      const itemsToMark = items;
      const nowStr = new Date().toISOString();
      itemsToMark.forEach(it => {
        it.status = 'printed';
        it.printedAt = nowStr;
      });
      saveItemsToStorage();
      pushStatusToServer(itemsToMark.map(it => it.id).filter(Boolean), 'printed');
      updateStats();

      setTimeout(() => {
        window.print();
        // Restore original grid after print
        setTimeout(() => {
          gridEl.innerHTML = prevHTML;
        }, 500);
      }, 300);
    } else {
      // Tandai item di grid aktif saat ini sebagai 'printed'
      const itemsToMark = getActiveGridItems();
      if (itemsToMark.length) {
        const nowStr = new Date().toISOString();
        itemsToMark.forEach(it => {
          it.status = 'printed';
          it.printedAt = nowStr;
        });
        saveItemsToStorage();
        pushStatusToServer(itemsToMark.map(it => it.id).filter(Boolean), 'printed');
        updateStats();
      }

      setTimeout(() => {
        window.print();
      }, 200);
    }
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
        pushDeleteToServer({ all: true });
        seqStart.value = 1;
        updateModePreviews();
        renderFolderPills();
        renderAllViews();
        updateStats();
        showToast('Semua barcode dan riwayat telah dihapus! Halaman kembali bersih.', 'success');
      }
    });
  }

  // --- DEVICE ACCESS MODAL (HP / TABLET) ---
  function renderDeviceModalQR(url) {
    if (!deviceQrContainer) return;
    if (typeof qrcode !== 'undefined') {
      try {
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = Math.max(2, Math.floor(150 / count));
        const canvas = document.createElement('canvas');
        canvas.width = count * cellSize + 16;
        canvas.height = count * cellSize + 16;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
              ctx.fillRect(8 + c * cellSize, 8 + r * cellSize, cellSize, cellSize);
            }
          }
        }
        canvas.className = 'w-36 h-36 object-contain rounded-lg shadow-2xs';
        deviceQrContainer.innerHTML = '';
        deviceQrContainer.appendChild(canvas);
        return;
      } catch (e) {
        console.warn('Gagal render canvas QR lokal:', e);
      }
    }
    if (deviceQrImg) {
      deviceQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
    }
  }

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
          renderDeviceModalQR(info.networkUrl);
        }
      })
      .catch(err => {
        const fallbackUrl = window.location.origin && !window.location.origin.includes('localhost') 
          ? window.location.origin 
          : 'http://10.227.197.221:3001';
        if (networkUrlInput) {
          networkUrlInput.value = fallbackUrl;
          renderDeviceModalQR(fallbackUrl);
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
      const currentUrl = networkUrlInput ? networkUrlInput.value : window.location.origin;
      deviceQrContainer.innerHTML = `
        <div class="p-3 text-center">
          <div class="text-3xl mb-1">📱</div>
          <div class="font-mono font-bold text-xs text-indigo-700 select-all">${escapeHtml(currentUrl)}</div>
          <div class="text-[10px] text-slate-400 mt-1">Ketik alamat di atas pada browser HP</div>
        </div>
      `;
    });
  }

  // --- CLICK TOTAL TERDAFTAR -> BUKA RINCIAN TABEL RIWAYAT ---
  if (btnTotalRegistered) {
    btnTotalRegistered.addEventListener('click', () => {
      renderHistoryModal();
      historyModal.classList.remove('hidden');
      historyModal.classList.add('flex');
    });
  }

  if (btnSwitchToManagementFromHistory) {
    btnSwitchToManagementFromHistory.addEventListener('click', () => {
      historyModal.classList.add('hidden');
      historyModal.classList.remove('flex');
      if (currentView !== 'management') {
        switchView('management');
      }
      const tableCard = document.getElementById('management-table-container');
      if (tableCard) {
        tableCard.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (historySearchInput) {
    historySearchInput.addEventListener('input', () => {
      renderHistoryModal();
    });
  }

  function renderHistoryModal() {
    const allIds = Array.from(IdGenerator.registry.historySet);
    const filterQuery = (historySearchInput ? historySearchInput.value.trim() : '').toLowerCase();

    if (historyModalCountBadge) {
      historyModalCountBadge.textContent = `${allIds.length} ID Terdaftar`;
    }

    if (historyTableBody) {
      historyTableBody.innerHTML = '';
      const filtered = filterQuery 
        ? allIds.filter(id => id.toLowerCase().includes(filterQuery))
        : allIds;

      if (!filtered.length) {
        historyTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="py-6 text-center text-slate-400 italic">
              ${allIds.length === 0 ? 'Belum ada nomor identitas yang tersimpan dalam riwayat (0 ID).' : 'Tidak ada ID yang cocok dengan pencarian.'}
            </td>
          </tr>
        `;
      } else {
        const itemMap = new Map();
        generatedItems.forEach(it => {
          if (it && it.id) itemMap.set(it.id, it);
        });

        const displayList = [...filtered].reverse().slice(0, 300);
        displayList.forEach((id, idx) => {
          const it = itemMap.get(id);
          const labelText = it ? (it.label || (it.brand ? `${it.brand} ${it.gramasi || ''}` : '-')) : '-';
          const batchText = it && it.batchName ? it.batchName : 'Riwayat';

          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
          tr.innerHTML = `
            <td class="py-2 px-3 text-center text-slate-400 text-[11px]">${idx + 1}</td>
            <td class="py-2 px-3 font-mono font-bold text-indigo-700 text-xs">${escapeHtml(id)}</td>
            <td class="py-2 px-3 text-center text-slate-500 text-[11px]">${id.length} kar</td>
            <td class="py-2 px-3 text-slate-600 text-[11px]">
              <span class="font-medium text-slate-800">${escapeHtml(labelText)}</span>
              <span class="ml-1 text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">${escapeHtml(batchText)}</span>
            </td>
            <td class="py-2 px-3 text-right">
              <button type="button" class="btn-copy-history-id px-2 py-0.5 text-[11px] text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded font-semibold transition" data-id="${escapeHtml(id)}">
                📋 Salin
              </button>
            </td>
          `;

          tr.querySelector('.btn-copy-history-id').addEventListener('click', async (e) => {
            const idToCopy = e.currentTarget.dataset.id;
            try {
              await navigator.clipboard.writeText(idToCopy);
              showToast(`ID "${idToCopy}" disalin!`);
            } catch (err) {
              showToast(`ID: ${idToCopy}`);
            }
          });

          historyTableBody.appendChild(tr);
        });
      }
    }

    if (historyListContainer) {
      historyListContainer.innerHTML = '';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- INITIAL RUN (CLEAN SLATE & DEFAULT TOM & JERRY 107) ---
  loadItemsFromStorage();
  applyPresetTemplate('tj-107');
  updateModePreviews();
  renderAllViews();
});
