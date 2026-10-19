/**
 * App Controller (v2.0 Pro Studio)
 * Orchestrates UI interactions, canvas drag & drop, interactive widget resizing,
 * custom text stickers, multi-language label editing, and exports.
 */
import { OverlayRenderer, ASPECT_RATIOS } from './renderer.js';
import { getDemoActivities } from './demoData.js';
import { parseActivityFile, normalizeActivity, recalculateActivitySplits } from './parsers/dataNormalizer.js';
import { VideoAnimator, getProgressiveActivity } from './videoAnimator.js';
import { formatTime } from './splitCalculator.js';

// Application State
const state = {
  isImperial: false,
  currentActivity: null,
  demoActivities: null,
  selectedWidget: null, // Currently selected widget key for drag/resize gizmo
  isInteractiveLayout: true, // Interactive drag/resize mode on canvas
  config: {
    aspectRatio: '9:16',
    customWidth: 1080,
    customHeight: 1080,
    template: 'story-pro',
    bgType: 'solid', // solid, photo, gradient, transparent
    solidBgColor: '#0a0a0d',
    gradientPreset: 'sunset',
    photoFit: 'fit', // fit (no-crop), cover, stretch
    photoBackdrop: 'blur', // blur, solid, black, transparent
    photoZoom: 1,
    photoPanX: 0,
    photoPanY: 0,
    photoBlur: 0,
    photoBrightness: 100,
    photoContrast: 100,
    photoProtectionGradient: true,
    theme: 'volt',
    customAccentColor: null,
    cardStyle: 'glass',
    cardRadius: 16,
    fontFamily: 'athletic',
    showWidgetHeader: true,
    showWidgetMap: true,
    showWidgetHero: true,
    showWidgetMetrics: true,
    showWidgetSplits: true,
    showWidgetSplitHighlight: true,
    splitsShowFastest: true,
    showWidgetElevation: false,
    showWidgetHrZones: false,
    showWidgetBrand: true,
    showWidgetPaceGraph: false,
    showWidgetHrGraph: false,
    showWidgetAvgHrBadge: false,
    headerTemplate: 'modern',
    headerDesign: 'modern',
    mapDesign: 'glow',
    heroDesign: 'mega',
    metricsDesign: 'grid',
    splitsDesign: 'vertical-bars',
    splitHighlightDesign: 'spotlight',
    elevationDesign: 'area',
    paceGraphDesign: 'area',
    hrGraphDesign: 'filled-area',
    hrBadgeDesign: 'pill',
    splitDistanceMeters: 1000,
    heroMetric: 'distance', // distance, time, pace
    mapColorMode: 'accent', // accent, pace, hr
    mapGlow: true,
    mapMarkerStyle: 'corsair', // corsair, dot, chevron, pulse-ring, target, diamond, pin, minimal-dot
    mapMarkerSize: 14, // marker radius size
    mapMarkerColor: '', // custom color, or empty to inherit accent
    mapMarkerPulse: true, // radar pulse ripple effect
    mapShowMarkerInStatic: true, // show marker on static map preview
    splitDataSource: 'km', // km or laps
    splitWidgetMode: 'bars', // bars or highlight
    highlightSplitTarget: 'fastest', // fastest, slowest, last, index-X
    brandStyle: 'runcut',
    customTitle: '',
    customSubtitle: '',
    runnerName: '@runner',
    locationName: '',
    headerShowLocation: true,
    weatherText: '',
    customWatermark: '',
    metricShowTime: true,
    metricShowPace: true,
    metricShowHr: true,
    metricShowElevation: true,
    metricShowCadence: true,
    metricShowCalories: true,
    metricShowDistance: false,
    metricShowBestPace: false,
    // Custom Metric Labels (Multi-Language Overrides)
    labelDistance: '',
    labelTime: '',
    labelPace: '',
    labelBestPace: '',
    labelHr: '',
    labelElevation: '',
    labelCadence: '',
    labelCalories: '',
    // Split Customizations (New User Requirement)
    splitColumns: {
      split: true,
      time: true,
      pace: true,
      delta: true,
      avgHr: true,
      maxHr: false,
      minHr: false,
      cadence: false,
      elevation: true,
    },
    splitHighlightFastest: true,
    splitCustomTitle: '',
    splitCustomLabels: {},
    // Universal Widget Text Overrides
    widgetTextOverrides: {
      hero: { label: '', value: '', unit: '', secondary: '' },
      header: { title: '', subtitle: '', runner: '', location: '', weather: '' },
      splits: { title: '', headerSplit: '', headerTime: '', headerPace: '', headerDelta: '', headerHr: '', headerMaxHr: '', headerMinHr: '', headerCad: '', headerElev: '', badge: '' },
      splitHighlight: { title: '', label: '', pace: '', note: '', badge: '' },
      metrics: { distance: '', time: '', pace: '', hr: '', elevation: '', cadence: '', calories: '', bestPace: '' },
      elevation: { title: '', min: '', max: '', gain: '' },
      paceGraph: { title: '', min: '', avg: '', max: '' },
      hrGraph: { title: '', min: '', avg: '', max: '' },
      hrBadge: { label: '', unit: '', zone: '' },
      hrZones: { title: '', z1: '', z2: '', z3: '', z4: '', z5: '' },
      brand: { text: '', subtext: '' },
      map: { title: '', caption: '' },
    },
    // Custom Text Stickers
    customTexts: [],
    extraWidgetInstances: [],
    // Custom Widget Positions & Sizes
    widgetPositions: {},
    // Individual Element Styles Overrides (font, sizeScale, color, accentColor, textAlign, cardStyle, opacity)
    elementStyles: {},
    // Background Border Customization per widget (resize only border, offsets, radius, stroke, colors)
    widgetBgStyles: {},
    // Sub-Element Offsets & Z-depth per widget (move individual text, icons, graphs X, Y, Z)
    widgetElementOffsets: {},
    // Snap to Grid Configuration (New User Requirement)
    snapToGrid: false,
    gridSize: 20,
    showGridOverlay: false,
    isDraggingGrid: false,
  },
  export: {
    scale: 2, // 2X Ultra crisp default
    format: 'png',
  },
};

// DOM Elements
const canvas = document.getElementById('overlayCanvas');
const canvasWrapper = document.getElementById('canvasWrapper');
const renderer = new OverlayRenderer(canvas);

// Gizmo Elements
const gizmoOverlay = document.getElementById('gizmoOverlay');
const gizmoBox = document.getElementById('gizmoBox');
const gizmoTitle = document.getElementById('gizmoTitle');
const gizmoDeleteBtn = document.getElementById('gizmoDeleteBtn');

// Gizmo Drag & Resize State
let activeDragMode = null; // 'move', 'resize', 'photo', 'rotate'
let activeHandle = null;
let dragStartX = 0;
let dragStartY = 0;
let dragCenterX = 0;
let dragCenterY = 0;
let dragInitialRot = 0;
let dragInitialPos = null;
let dragInitialPanX = 0;
let dragInitialPanY = 0;
let dragInitialZoom = 1;
let isInteracting = false;

window.addEventListener('keydown', (e) => { if (e.key === 'Shift') window._shiftKeyPressed = true; });
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') window._shiftKeyPressed = false; });

// ==========================================
// UNIVERSAL UNDO / REDO & RESTORE ENGINE
// ==========================================
const MAX_UNDO_STACK = 50;
let undoStack = [];
let redoStack = [];
let isPerformingUndoRedo = false;

function pushUndoSnapshot() {
  if (isPerformingUndoRedo) return;
  const snapshot = JSON.parse(JSON.stringify(state.config));
  undoStack.push(snapshot);
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  redoStack = [];
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const uNav = document.getElementById('universalUndoBtn');
  const rNav = document.getElementById('universalRedoBtn');
  const uStage = document.getElementById('stageUndoBtn');
  const rStage = document.getElementById('stageRedoBtn');

  if (uNav) uNav.disabled = !canUndo;
  if (rNav) rNav.disabled = !canRedo;
  if (uStage) uStage.disabled = !canUndo;
  if (rStage) rStage.disabled = !canRedo;
}

function undo() {
  if (undoStack.length === 0) {
    showToast('Nothing to undo');
    return;
  }
  isPerformingUndoRedo = true;
  const currentSnapshot = JSON.parse(JSON.stringify(state.config));
  redoStack.push(currentSnapshot);
  if (redoStack.length > MAX_UNDO_STACK) redoStack.shift();

  const prevConfig = undoStack.pop();
  state.config = prevConfig;

  syncAllControlsWithConfig();
  triggerRender();
  updateGizmoBox();
  updateUndoRedoButtons();
  isPerformingUndoRedo = false;
  showToast('Undo successful ↶');
}

function redo() {
  if (redoStack.length === 0) {
    showToast('Nothing to redo');
    return;
  }
  isPerformingUndoRedo = true;
  const currentSnapshot = JSON.parse(JSON.stringify(state.config));
  undoStack.push(currentSnapshot);
  if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();

  const nextConfig = redoStack.pop();
  state.config = nextConfig;

  syncAllControlsWithConfig();
  triggerRender();
  updateGizmoBox();
  updateUndoRedoButtons();
  isPerformingUndoRedo = false;
  showToast('Redo successful ↷');
}

function syncAllControlsWithConfig() {
  const cfg = state.config;
  if (!cfg) return;

  // 1. Aspect Ratio
  const aspectPill = document.getElementById('aspectRatioPill');
  const customBox = document.getElementById('customAspectRatioBox');
  const customW = document.getElementById('customWidthInput');
  const customH = document.getElementById('customHeightInput');
  const customRatioLabel = document.getElementById('customRatioCalculatedLabel');

  if (cfg.aspectRatio === 'custom') {
    if (customBox) customBox.style.display = 'block';
    if (customW) customW.value = cfg.customWidth || 1080;
    if (customH) customH.value = cfg.customHeight || 1080;
    const w = cfg.customWidth || 1080;
    const h = cfg.customHeight || 1080;
    if (customRatioLabel) customRatioLabel.textContent = `${w} × ${h}`;
    if (aspectPill) aspectPill.textContent = `Custom (${w}×${h})`;
  } else {
    if (customBox) customBox.style.display = 'none';
    if (aspectPill) {
      aspectPill.textContent = ASPECT_RATIOS[cfg.aspectRatio]?.label.split(' ')[0] || cfg.aspectRatio;
    }
  }
  updateActiveCard('#aspectRatioGrid', 'data-ratio', cfg.aspectRatio);

  // 2. Template
  const templateNames = {
    'story-pro': 'Story Pro',
    'split-focus': 'Split Focus',
    'minimal-hud': 'Minimal HUD',
    'stat-beast': 'Stat Beast',
    'route-focus': 'Route Focus',
    'lap-workout': 'Lap Workout',
    'kinetic-centered': 'Kinetic Centered',
    'marathon-finisher': 'Marathon Finisher',
    'tokyo-night': 'Tokyo Night HUD',
    'ultra-trail': 'Ultra Trail Ridge',
    'swiss-editorial': 'Swiss Athletic',
    'smartwatch-ultra': 'Watch Face Modular',
  };
  const templatePill = document.getElementById('templatePill');
  if (templatePill) {
    templatePill.textContent = templateNames[cfg.template] || cfg.template;
  }
  updateActiveCard('#templateGrid', 'data-template', cfg.template);

  // 3. Theme & Colors
  updateActiveCard('#themeGrid', 'data-theme', cfg.theme);
  const customColorInput = document.getElementById('customColorInput');
  if (customColorInput && cfg.customAccentColor) {
    customColorInput.value = cfg.customAccentColor;
  }

  // 4. Card Style & Font
  updateActiveCard('#cardStyleGrid', 'data-cardstyle', cfg.cardStyle);
  updateActiveCard('#fontGrid', 'data-font', cfg.fontFamily);

  // 4b. Background Type & Photo
  updateActiveCard('#bgTypeGrid', 'data-bg', cfg.bgType || 'solid');
  const photoSection = document.getElementById('photoControlsSection');
  if (photoSection) {
    photoSection.style.display = cfg.bgType === 'photo' ? 'block' : 'none';
  }
  syncPhotoSliders();

  // 5. Widget Visibility Checkboxes
  const widgetToggles = [
    { id: 'toggleHeader', key: 'showWidgetHeader' },
    { id: 'toggleMap', key: 'showWidgetMap' },
    { id: 'toggleHero', key: 'showWidgetHero' },
    { id: 'toggleMetrics', key: 'showWidgetMetrics' },
    { id: 'toggleSplits', key: 'showWidgetSplits' },
    { id: 'toggleSplitHighlight', key: 'showWidgetSplitHighlight' },
    { id: 'toggleElevation', key: 'showWidgetElevation' },
    { id: 'toggleHrZones', key: 'showWidgetHrZones' },
    { id: 'toggleBrand', key: 'showWidgetBrand' },
    { id: 'togglePaceGraph', key: 'showWidgetPaceGraph' },
    { id: 'toggleHrGraph', key: 'showWidgetHrGraph' },
    { id: 'toggleAvgHrBadge', key: 'showWidgetAvgHrBadge' },
  ];
  widgetToggles.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) el.checked = cfg[key] !== false;
  });

  // 6. Metrics Checkboxes (Sync across Format Tab, Widgets Tab, and Inspector)
  const metricBinds = [
    { key: 'metricShowTime', ids: ['metricToggleTime', 'wToggleMetricTime', 'insToggleMetricTime'], def: true },
    { key: 'metricShowPace', ids: ['metricTogglePace', 'wToggleMetricPace', 'insToggleMetricPace'], def: true },
    { key: 'metricShowHr', ids: ['metricToggleHr', 'wToggleMetricHr', 'insToggleMetricHr'], def: true },
    { key: 'metricShowElevation', ids: ['metricToggleElevation', 'wToggleMetricElevation', 'insToggleMetricElevation'], def: true },
    { key: 'metricShowCadence', ids: ['metricToggleCadence', 'wToggleMetricCadence', 'insToggleMetricCadence'], def: true },
    { key: 'metricShowCalories', ids: ['metricToggleCalories', 'wToggleMetricCalories', 'insToggleMetricCalories'], def: true },
    { key: 'metricShowDistance', ids: ['metricToggleDistance', 'wToggleMetricDistance', 'insToggleMetricDistance'], def: false },
    { key: 'metricShowBestPace', ids: ['metricToggleBestPace', 'wToggleMetricBestPace', 'insToggleMetricBestPace'], def: false },
  ];
  metricBinds.forEach(({ key, ids, def }) => {
    const isVal = cfg[key] !== undefined ? Boolean(cfg[key]) : def;
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = isVal;
    });
  });

  // 7. Splits Tab Checkboxes
  const splitHighlightFastest = document.getElementById('toggleFastestSplitHighlight');
  if (splitHighlightFastest) splitHighlightFastest.checked = (cfg.splitHighlightFastest !== false) && (cfg.splitsShowFastest !== false);

  const splitWidgetTitleInput = document.getElementById('inputSplitWidgetTitle');
  if (splitWidgetTitleInput) splitWidgetTitleInput.value = cfg.splitCustomTitle || '';

  if (cfg.splitColumns) {
    const colIdMap = {
      time: 'colSplitTime',
      pace: 'colSplitPace',
      delta: 'colSplitDelta',
      avgHr: 'colSplitAvgHr',
      maxHr: 'colSplitMaxHr',
      minHr: 'colSplitMinHr',
      cadence: 'colSplitCadence',
      elevation: 'colSplitElev',
    };
    Object.entries(colIdMap).forEach(([colKey, elId]) => {
      const el = document.getElementById(elId);
      if (el) el.checked = cfg.splitColumns[colKey] !== false;
    });
  }

  // Snap to Grid sync
  const snapToGridVal = !!cfg.snapToGrid;
  const gridSizeVal = cfg.gridSize || 20;
  const showGridOverlayVal = !!cfg.showGridOverlay;

  const snapBtn = document.getElementById('toggleSnapToGridBtn');
  if (snapBtn) {
    snapBtn.textContent = snapToGridVal ? `🧲 Snap: ON (${gridSizeVal}px)` : '🧲 Snap: OFF';
    snapBtn.classList.toggle('btn-toggle-active', snapToGridVal);
  }
  const snapBadge = document.getElementById('snapGridStatusBadge');
  if (snapBadge) {
    snapBadge.textContent = snapToGridVal ? `ON (${gridSizeVal}px)` : 'OFF';
    snapBadge.style.color = snapToGridVal ? 'var(--accent-volt)' : 'var(--text-muted)';
  }
  const snapCb = document.getElementById('snapToGridCheckbox');
  if (snapCb) snapCb.checked = snapToGridVal;
  const snapTbSize = document.getElementById('snapGridToolbarSize');
  if (snapTbSize) snapTbSize.value = gridSizeVal;
  const snapNum = document.getElementById('snapGridSizeNumber');
  if (snapNum) snapNum.value = gridSizeVal;
  const snapSlider = document.getElementById('snapGridSizeSlider');
  if (snapSlider) snapSlider.value = gridSizeVal;
  const showGridCb = document.getElementById('showGridOverlayCheckbox');
  if (showGridCb) showGridCb.checked = showGridOverlayVal;

  // 8. Text Tab and Activity Inputs
  syncInputsWithActivity(state.currentActivity);
  renderCustomTextsList();

  // 8b. Header Location Toggle Sync
  const showLocVal = cfg.headerShowLocation !== false && cfg.showLocation !== false;
  ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = showLocVal;
  });

  // 9. Element Inspector Sync
  if (window.syncInspectorWithSelectedElement) {
    window.syncInspectorWithSelectedElement(state.selectedWidget || 'header');
  }

  // 10. Dropdowns & Grids Sync
  const setSelectVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };
  setSelectVal('headerDesignSelect', cfg.headerTemplate || cfg.headerDesign);
  setSelectVal('mapDesignSelect', cfg.mapDesign);
  setSelectVal('mapMarkerStyleSelect', cfg.mapMarkerStyle || 'corsair');
  setSelectVal('modalMapMarkerStyleSelect', cfg.mapMarkerStyle || 'corsair');
  const markerBadge = document.getElementById('mapMarkerStyleBadge');
  if (markerBadge) markerBadge.textContent = cfg.mapMarkerStyle || 'corsair';

  const mSizeSlider = document.getElementById('mapMarkerSizeSlider');
  const mSizeVal = document.getElementById('mapMarkerSizeVal');
  if (mSizeSlider) {
    mSizeSlider.value = cfg.mapMarkerSize || 14;
    if (mSizeVal) mSizeVal.textContent = `${cfg.mapMarkerSize || 14}px`;
  }

  const mColorInput = document.getElementById('mapMarkerColorInput');
  if (mColorInput && cfg.mapMarkerColor) {
    mColorInput.value = cfg.mapMarkerColor;
  }

  const mPulseToggle = document.getElementById('mapMarkerPulseToggle');
  if (mPulseToggle) mPulseToggle.checked = cfg.mapMarkerPulse !== false;

  const mStaticToggle = document.getElementById('mapMarkerStaticToggle');
  if (mStaticToggle) mStaticToggle.checked = cfg.mapShowMarkerInStatic !== false;

  setSelectVal('heroMetricSelect', cfg.heroMetric);
  setSelectVal('heroDesignSelect', cfg.heroDesign);
  setSelectVal('metricsDesignSelect', cfg.metricsDesign);
  setSelectVal('splitWidgetModeSelect', cfg.splitWidgetMode);
  setSelectVal('splitsDesignSelect', cfg.splitsDesign);
  setSelectVal('splitHighlightDesignSelect', cfg.splitHighlightDesign);
  setSelectVal('elevationDesignSelect', cfg.elevationDesign);
  setSelectVal('paceGraphDesignSelect', cfg.paceGraphDesign);
  setSelectVal('hrGraphDesignSelect', cfg.hrGraphDesign);
  setSelectVal('hrBadgeDesignSelect', cfg.hrBadgeDesign);
  setSelectVal('brandStyleSelect', cfg.brandStyle);
  setSelectVal('splitIntervalSelect', cfg.splitInterval);

  updateActiveCard('#splitSourceGrid', 'data-source', cfg.splitDataSource || 'auto');
  updateActiveCard('#splitWidgetModeGrid', 'data-mode', cfg.splitWidgetMode || 'bars');
  updateActiveCard('#headerTemplateGrid', 'data-template', cfg.headerTemplate || cfg.headerDesign || 'modern');
  if (window.renderActiveHeaderTemplateTextControls) {
    window.renderActiveHeaderTemplateTextControls();
  }
}

function deleteSelectedTarget(targetKey = null) {
  const key = targetKey || state.selectedWidget;
  if (!key) {
    showToast('No element selected to delete');
    return;
  }
  pushUndoSnapshot();

  // 1. Check if it's a custom text sticker
  const cIdx = state.config.customTexts.findIndex((t) => t.id === key);
  if (cIdx !== -1) {
    state.config.customTexts.splice(cIdx, 1);
    selectWidget(null);
    renderCustomTextsList();
    triggerRender();
    showToast('Deleted text sticker');
    return;
  }

  // 2. Check if it's a background border (_bg)
  if (key.endsWith('_bg')) {
    const baseKey = key.replace(/_bg$/, '');
    if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
    if (!state.config.widgetBgStyles[baseKey]) state.config.widgetBgStyles[baseKey] = {};
    state.config.widgetBgStyles[baseKey].visible = false;
    state.config.widgetBgStyles[baseKey].hidden = true;
    state.config.widgetBgStyles[baseKey].showBg = false;
    state.config.widgetBgStyles[baseKey].showBorder = false;
    selectWidget(baseKey);
    if (window.syncInspectorWithSelectedElement) {
      window.syncInspectorWithSelectedElement(baseKey, 'bg');
    }
    triggerRender();
    showToast(`Deleted background border for ${baseKey}`);
    return;
  }

  // 3. Check if inspector has a sub-part selected for this widget
  const subPartSelect = document.getElementById('inspectorSubPartSelect');
  const currentPart = subPartSelect ? subPartSelect.value : 'widget';
  if (currentPart !== 'widget' && currentPart !== 'bg' && subPartSelect) {
    if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
    if (!state.config.widgetElementOffsets[key]) state.config.widgetElementOffsets[key] = {};
    if (!state.config.widgetElementOffsets[key][currentPart]) {
      state.config.widgetElementOffsets[key][currentPart] = { x: 0, y: 0, z: 1 };
    }
    state.config.widgetElementOffsets[key][currentPart].hidden = true;
    state.config.widgetElementOffsets[key][currentPart].visible = false;
    if (key === 'header' && currentPart === 'location') {
      state.config.headerShowLocation = false;
      state.config.showLocation = false;
      ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
      });
    }
    triggerRender();
    showToast(`Deleted / hid ${currentPart} in ${key}`);
    return;
  }

  // 4. Check if it's an extra widget instance
  const extraInst = state.config.extraWidgetInstances?.find((inst) => inst.id === key);
  if (extraInst) {
    extraInst.enabled = false;
    if (typeof renderExtraWidgetsUI === 'function') renderExtraWidgetsUI();
    triggerRender();
    if (window.syncInspectorWithSelectedElement) {
      window.syncInspectorWithSelectedElement(key, 'widget');
    }
    showToast(`Deleted / hid ${extraInst.name || key}`);
    return;
  }

  // 5. Default: Delete (hide) the entire widget
  const showKey = 'showWidget' + key.charAt(0).toUpperCase() + key.slice(1);
  state.config[showKey] = false;
  const widgetCheckbox = document.getElementById(showKey) || document.getElementById('toggle' + key.charAt(0).toUpperCase() + key.slice(1));
  if (widgetCheckbox) widgetCheckbox.checked = false;
  selectWidget(null);
  triggerRender();
  showToast(`Deleted ${key} widget`);
}
window.deleteSelectedTarget = deleteSelectedTarget;

function restoreWidgetToTemplate(targetKey = null) {
  const key = targetKey || state.selectedWidget;
  if (!key) {
    showToast('Select a widget to restore');
    return;
  }
  pushUndoSnapshot();

  const baseKey = key.replace(/_bg$/, '');

  // Reset custom position & size
  if (state.config.widgetPositions && state.config.widgetPositions[baseKey]) {
    delete state.config.widgetPositions[baseKey];
  }

  // Reset custom border styles (offset, size, radius, stroke, visibility, textOnly)
  if (state.config.widgetBgStyles && state.config.widgetBgStyles[baseKey]) {
    delete state.config.widgetBgStyles[baseKey];
  }

  // Reset custom sub-element offsets & hidden states
  if (state.config.widgetElementOffsets && state.config.widgetElementOffsets[baseKey]) {
    delete state.config.widgetElementOffsets[baseKey];
  }

  // Reset custom styling (font, sizeScale, color, accentColor, cardStyle, textAlign)
  if (state.config.elementStyles && state.config.elementStyles[baseKey]) {
    delete state.config.elementStyles[baseKey];
  }

  // Reset custom text overrides
  if (state.config.widgetTextOverrides && state.config.widgetTextOverrides[baseKey]) {
    delete state.config.widgetTextOverrides[baseKey];
  }

  // Widget specific reset
  if (baseKey === 'header') {
    state.config.customTitle = '';
    state.config.customSubtitle = '';
    state.config.runnerName = '@runner';
    state.config.locationName = '';
    state.config.weatherText = '';
    state.config.headerShowLocation = true;
    state.config.showLocation = true;
    ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    });
    syncInputsWithActivity(state.currentActivity);
  } else if (baseKey === 'splits') {
    state.config.splitCustomTitle = '';
    state.config.splitHighlightFastest = true;
    state.config.splitColumns = {
      split: true,
      time: true,
      pace: true,
      delta: true,
      avgHr: true,
      maxHr: false,
      minHr: false,
      cadence: false,
      elevation: true,
    };
  }

  // Ensure widget is enabled / visible
  const showKey = 'showWidget' + baseKey.charAt(0).toUpperCase() + baseKey.slice(1);
  if (showKey in state.config) {
    state.config[showKey] = true;
    const widgetCheckbox = document.getElementById(showKey) || document.getElementById('toggle' + baseKey.charAt(0).toUpperCase() + baseKey.slice(1));
    if (widgetCheckbox) widgetCheckbox.checked = true;
  }

  // Re-sync UI controls and inspector
  syncAllControlsWithConfig();
  if (window.syncInspectorWithSelectedElement) {
    window.syncInspectorWithSelectedElement(baseKey, 'widget');
  }
  selectWidget(baseKey);
  triggerRender();
  showToast(`Restored ${baseKey} to original template design`);
}

function setupUndoRedoControls() {
  const uNav = document.getElementById('universalUndoBtn');
  const rNav = document.getElementById('universalRedoBtn');
  const uStage = document.getElementById('stageUndoBtn');
  const rStage = document.getElementById('stageRedoBtn');

  if (uNav) uNav.addEventListener('click', undo);
  if (rNav) rNav.addEventListener('click', redo);
  if (uStage) uStage.addEventListener('click', undo);
  if (rStage) rStage.addEventListener('click', redo);

  updateUndoRedoButtons();
}

let arrowKeyUndoTimer = null;
let arrowKeyGridTimer = null;

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;

    // Ctrl+Z / Cmd+Z for Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        redo();
      } else {
        e.preventDefault();
        undo();
      }
      return;
    }

    // Ctrl+Y / Cmd+Y for Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Delete / Backspace key when a widget is selected (and not editing text)
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive) {
      if (state.selectedWidget) {
        e.preventDefault();
        deleteSelectedTarget(state.selectedWidget);
      }
      return;
    }

    // Spacebar to toggle Play/Pause Run Animation (when not typing in an input/textarea)
    if (e.code === 'Space' && !isInputActive) {
      if (videoAnimator) {
        e.preventDefault();
        videoAnimator.togglePlay();
      }
      return;
    }

    // Keyboard Arrow Keys: Move / Nudge selected widget by a grid
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isInputActive) {
      if (state.selectedWidget) {
        e.preventDefault();

        // Push undo snapshot (debounced so rapid arrow key presses create a single undo step)
        if (!arrowKeyUndoTimer) {
          pushUndoSnapshot();
        }
        clearTimeout(arrowKeyUndoTimer);
        arrowKeyUndoTimer = setTimeout(() => {
          arrowKeyUndoTimer = null;
        }, 400);

        const dx = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
        const dy = e.key === 'ArrowDown' ? 1 : (e.key === 'ArrowUp' ? -1 : 0);

        const g = state.config.gridSize || 20;
        let step = g;
        if (e.shiftKey) step = g * 5;
        if (e.altKey) step = 1;

        const subPartSelect = document.getElementById('inspectorSubPartSelect');
        const currentPart = subPartSelect ? subPartSelect.value : 'widget';

        if (currentPart && currentPart !== 'widget' && currentPart !== 'bg') {
          // Move selected sub-element
          if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
          if (!state.config.widgetElementOffsets[state.selectedWidget]) state.config.widgetElementOffsets[state.selectedWidget] = {};
          if (!state.config.widgetElementOffsets[state.selectedWidget][currentPart]) {
            state.config.widgetElementOffsets[state.selectedWidget][currentPart] = { x: 0, y: 0, z: 1 };
          }
          const off = state.config.widgetElementOffsets[state.selectedWidget][currentPart];
          const moveStep = e.altKey ? 1 : (e.shiftKey ? 10 : 5);
          off.x = (off.x || 0) + dx * moveStep;
          off.y = (off.y || 0) + dy * moveStep;
          triggerRender();
          if (window.syncInspectorWithSelectedElement) {
            window.syncInspectorWithSelectedElement(state.selectedWidget, currentPart);
          }
        } else if (state.selectedWidget === '__bg_photo__') {
          state.config.photoPanX = (state.config.photoPanX || 0) + dx * step;
          state.config.photoPanY = (state.config.photoPanY || 0) + dy * step;
          triggerRender();
          if (window.syncInspectorWithSelectedElement) {
            window.syncInspectorWithSelectedElement('__bg_photo__');
          }
        } else if (state.selectedWidget.endsWith('_bg')) {
          const baseKey = state.selectedWidget.replace(/_bg$/, '');
          if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
          if (!state.config.widgetBgStyles[baseKey]) state.config.widgetBgStyles[baseKey] = {};
          const bg = state.config.widgetBgStyles[baseKey];
          let curX = bg.offsetX || 0;
          let curY = bg.offsetY || 0;
          if (state.config.snapToGrid && !e.altKey) {
            curX = (Math.round(curX / g) + dx * Math.max(1, Math.round(step / g))) * g;
            curY = (Math.round(curY / g) + dy * Math.max(1, Math.round(step / g))) * g;
          } else {
            curX += dx * step;
            curY += dy * step;
          }
          bg.offsetX = curX;
          bg.offsetY = curY;
          triggerRender();
          if (window.syncInspectorWithSelectedElement) {
            window.syncInspectorWithSelectedElement(baseKey, 'bg');
          }
        } else {
          const b = renderer.widgetBounds ? renderer.widgetBounds[state.selectedWidget] : null;
          if (!state.config.widgetPositions) state.config.widgetPositions = {};
          const cur = state.config.widgetPositions[state.selectedWidget] || (b ? { x: b.x, y: b.y, width: b.width, height: b.height } : { x: 0, y: 0, width: 200, height: 100 });
          let curX = cur.x !== undefined ? cur.x : (b ? b.x : 0);
          let curY = cur.y !== undefined ? cur.y : (b ? b.y : 0);
          if (state.config.snapToGrid && !e.altKey) {
            curX = (Math.round(curX / g) + dx * Math.max(1, Math.round(step / g))) * g;
            curY = (Math.round(curY / g) + dy * Math.max(1, Math.round(step / g))) * g;
          } else {
            curX += dx * step;
            curY += dy * step;
          }
          state.config.widgetPositions[state.selectedWidget] = {
            ...cur,
            x: curX,
            y: curY
          };
          if (state.config.snapToGrid) {
            state.config.isDraggingGrid = true;
            clearTimeout(arrowKeyGridTimer);
            arrowKeyGridTimer = setTimeout(() => {
              state.config.isDraggingGrid = false;
              triggerRender();
            }, 350);
          }
          triggerRender();
          if (window.syncInspectorWithSelectedElement) {
            window.syncInspectorWithSelectedElement(state.selectedWidget, 'widget');
          }
        }

        updateGizmoBox();
        if (typeof updateFloatingToolbarPosition === 'function') {
          updateFloatingToolbarPosition();
        }
      }
    }
  });
}

// ==========================================
// WORKSPACE PREVIEW ZOOM CONTROLLER
// ==========================================
function setupZoomControls() {
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLevelText = document.getElementById('zoomLevelText');
  const stageViewport = document.getElementById('stageViewport');

  const zoomLevels = [0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  state.previewZoom = 'fit';

  // Keep track of the natural fitted height
  let lastFitHeight = 600;

  const updateFitHeight = () => {
    if (state.previewZoom === 'fit' && canvas) {
      const h = canvas.offsetHeight || canvas.getBoundingClientRect().height;
      if (h > 100) lastFitHeight = h;
    }
  };

  const applyZoom = (zoom) => {
    state.previewZoom = zoom;
    if (zoom === 'fit') {
      if (stageViewport) {
        stageViewport.classList.remove('mode-zoomed');
        stageViewport.classList.add('mode-fit');
      }
      canvasWrapper.style.width = '';
      canvasWrapper.style.height = '';
      canvasWrapper.style.maxWidth = '';
      canvasWrapper.style.maxHeight = '';
      canvas.style.width = '';
      canvas.style.height = '';
      canvas.style.maxWidth = '';
      canvas.style.maxHeight = '';
      if (zoomLevelText) zoomLevelText.textContent = 'Fit';
      setTimeout(updateFitHeight, 50);
    } else {
      updateFitHeight();
      if (stageViewport) {
        stageViewport.classList.remove('mode-fit');
        stageViewport.classList.add('mode-zoomed');
      }
      const z = typeof zoom === 'number' ? zoom : 1.0;
      const baseHeight = lastFitHeight > 100 ? lastFitHeight : Math.max(360, (stageViewport ? stageViewport.clientHeight : window.innerHeight * 0.72) - 48);
      const targetH = Math.round(baseHeight * z);
      const aspect = canvas.width > 0 && canvas.height > 0 ? (canvas.width / canvas.height) : (9 / 16);
      const targetW = Math.round(targetH * aspect);

      canvasWrapper.style.maxWidth = 'none';
      canvasWrapper.style.maxHeight = 'none';
      canvas.style.maxWidth = 'none';
      canvas.style.maxHeight = 'none';

      canvasWrapper.style.width = `${targetW}px`;
      canvasWrapper.style.height = `${targetH}px`;
      canvas.style.width = `${targetW}px`;
      canvas.style.height = `${targetH}px`;
      if (zoomLevelText) zoomLevelText.textContent = `${Math.round(z * 100)}%`;
    }
    updateGizmoBox();
  };

  const getNextZoom = (direction) => {
    let cur = state.previewZoom === 'fit' ? 1.0 : state.previewZoom;
    if (direction > 0) {
      return zoomLevels.find((l) => l > cur + 0.05) || zoomLevels[zoomLevels.length - 1];
    } else {
      const reversed = [...zoomLevels].reverse();
      return reversed.find((l) => l < cur - 0.05) || zoomLevels[0];
    }
  };

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      applyZoom(getNextZoom(1));
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      applyZoom(getNextZoom(-1));
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      if (state.previewZoom === 'fit') {
        applyZoom(1.0);
      } else {
        applyZoom('fit');
      }
    });
  }

  // Ctrl + Mouse Wheel Zoom on stageViewport
  if (stageViewport) {
    stageViewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        applyZoom(getNextZoom(dir));
      }
    }, { passive: false });
  }

  // Window resize keeps fit and gizmo in sync
  window.addEventListener('resize', () => {
    if (state.previewZoom === 'fit') {
      applyZoom('fit');
    } else {
      applyZoom(state.previewZoom);
    }
  });

  window.applyWorkspaceZoom = applyZoom;
}

let videoAnimator = null;
let lastExportedVideoResult = null;

function init() {
  // 1. Load initial demo activities
  state.demoActivities = getDemoActivities(state.isImperial);
  state.currentActivity = state.demoActivities['5k'];

  // Sync inputs with activity
  syncInputsWithActivity(state.currentActivity);

  // Initialize Video Animator Engine
  videoAnimator = new VideoAnimator(renderer, state, (progActivity) => {
    renderer.render(progActivity, state.config, 1);
    updateGizmoBox();
  });
  window.videoAnimator = videoAnimator;
  window.getProgressiveActivity = getProgressiveActivity;

  // 2. Setup Event Listeners
  setupNavigationTabs();
  setupActivityControls();
  setupFormatControls();
  setupSavedTemplatesControls();
  setupZoomControls();
  setupSplitsControls();
  setupWidgetsControls();
  setupTextAndStickersControls();
  setupHeaderTemplateControls();
  setupElementInspectorControls();
  setupStyleControls();
  setupExportControls();
  setupVideoAnimationControls();
  setupGizmoController();
  setupUndoRedoControls();
  setupKeyboardShortcuts();

  // 3. Populate Splits UI
  updateSplitsDropdownAndTable();

  // 4. Initial Render
  window.state = state;
  window.renderer = renderer;
  window.selectWidget = selectWidget;
  window.centerWidget = centerWidget;
  window.triggerRender = triggerRender;
  window.syncAllControlsWithConfig = syncAllControlsWithConfig;
  triggerRender();
}

// Trigger canvas re-render and reposition gizmo
function triggerRender(progActivity = null) {
  const act = progActivity || (videoAnimator && videoAnimator.progress < 0.999
    ? getProgressiveActivity(state.currentActivity, videoAnimator.progress, state.isImperial)
    : state.currentActivity);
  renderer.render(act, state.config, 1);
  updateGizmoBox();
}

function updateAnimTimelineMarkers(progressFraction = 1.0) {
  if (!state.currentActivity) return;
  const p = Math.max(0, Math.min(1, progressFraction));
  const totalDist = state.currentActivity.distance || 1;
  const totalDuration = state.currentActivity.duration || 1;
  const curDist = totalDist * p;
  const curDuration = Math.round(totalDuration * p);

  const isImperial = state.isImperial;
  const curDistStr = isImperial ? (curDist / 1609.34).toFixed(2) : (curDist / 1000).toFixed(2);
  const totalDistStr = isImperial ? (totalDist / 1609.34).toFixed(2) : (totalDist / 1000).toFixed(2);
  const unit = isImperial ? 'mi' : 'km';

  const distProgress = document.getElementById('animDistProgress');
  const timeProgress = document.getElementById('animTimeProgress');
  const percentProgress = document.getElementById('animPercentProgress');

  if (distProgress) distProgress.textContent = `${curDistStr} / ${totalDistStr} ${unit}`;
  if (timeProgress) timeProgress.textContent = `${formatTime(curDuration)} / ${formatTime(totalDuration)}`;
  if (percentProgress) percentProgress.textContent = `${Math.round(p * 100)}%`;
}

function setupVideoAnimationControls() {
  const playPauseBtn = document.getElementById('animPlayPauseBtn');
  const playIcon = document.getElementById('animPlayIcon');
  const resetBtn = document.getElementById('animResetBtn');
  const scrubber = document.getElementById('animScrubber');
  const durationSelect = document.getElementById('animDurationSelect');
  const holdSelect = document.getElementById('animHoldSelect');
  const loopToggle = document.getElementById('animLoopToggle');
  const openExportModalBtn = document.getElementById('animOpenExportModalBtn');
  const startVideoExportBtn = document.getElementById('startVideoExportBtn');

  // Video Export Modal elements
  const modal = document.getElementById('videoExportModal');
  const closeBtn = document.getElementById('closeVideoModalBtn');
  const settingsView = document.getElementById('videoSettingsView');
  const progressView = document.getElementById('videoProgressView');
  const completedView = document.getElementById('videoCompletedView');
  const modalDurationSelect = document.getElementById('modalVideoDurationSelect');
  const modalHoldSelect = document.getElementById('modalVideoHoldSelect');
  const tabHoldSelect = document.getElementById('videoExportHoldSelect');
  const modalScaleSelect = document.getElementById('modalVideoScaleSelect');
  const modalFpsSelect = document.getElementById('modalVideoFpsSelect');
  const modalCodecSelect = document.getElementById('modalVideoCodecSelect');
  const modalRenderBtn = document.getElementById('modalRenderVideoBtn');
  const modalDownloadBtn = document.getElementById('modalDownloadVideoBtn');
  const modalRenderAgainBtn = document.getElementById('modalRenderAgainBtn');
  const videoPreviewPlayer = document.getElementById('videoPreviewPlayer');
  const videoMetaText = document.getElementById('videoMetaText');
  const progressBar = document.getElementById('videoProgressBar');
  const progressDetail = document.getElementById('videoProgressDetail');
  const progressStatusText = document.getElementById('videoProgressStatusText');

  // Hook callbacks to VideoAnimator
  videoAnimator.onProgressUpdate = (p) => {
    if (scrubber) scrubber.value = Math.round(p * 1000);
    updateAnimTimelineMarkers(p);
  };

  videoAnimator.onPlayStateChange = (isPlaying) => {
    if (playIcon) playIcon.textContent = isPlaying ? '⏸' : '▶';
    if (playPauseBtn) {
      playPauseBtn.title = isPlaying ? 'Pause Run Animation (Space)' : 'Play Run Animation (Space)';
      playPauseBtn.classList.toggle('playing', isPlaying);
    }
  };

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      videoAnimator.togglePlay();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      videoAnimator.reset();
    });
  }

  if (scrubber) {
    scrubber.addEventListener('input', (e) => {
      const p = Number(e.target.value) / 1000;
      videoAnimator.seek(p);
    });
  }

  function syncRunDuration(durSec) {
    const dur = Number(durSec);
    videoAnimator.setDuration(dur);
    if (durationSelect) durationSelect.value = dur;
    if (modalDurationSelect) modalDurationSelect.value = dur;
    const tabDur = document.getElementById('videoExportDurationSelect');
    if (tabDur) tabDur.value = dur;
  }

  if (durationSelect) {
    durationSelect.addEventListener('change', (e) => {
      syncRunDuration(e.target.value);
    });
  }

  if (modalDurationSelect) {
    modalDurationSelect.addEventListener('change', (e) => {
      syncRunDuration(e.target.value);
    });
  }

  const tabDurSelect = document.getElementById('videoExportDurationSelect');
  if (tabDurSelect) {
    tabDurSelect.addEventListener('change', (e) => {
      syncRunDuration(e.target.value);
    });
  }

  function syncHoldDuration(holdSec) {
    const hold = Number(holdSec);
    videoAnimator.setHoldDuration(hold);
    if (holdSelect) holdSelect.value = hold;
    if (modalHoldSelect) modalHoldSelect.value = hold;
    if (tabHoldSelect) tabHoldSelect.value = hold;
  }

  if (holdSelect) {
    holdSelect.addEventListener('change', (e) => {
      syncHoldDuration(e.target.value);
    });
  }

  if (modalHoldSelect) {
    modalHoldSelect.addEventListener('change', (e) => {
      syncHoldDuration(e.target.value);
    });
  }

  if (tabHoldSelect) {
    tabHoldSelect.addEventListener('change', (e) => {
      syncHoldDuration(e.target.value);
    });
  }

  if (loopToggle) {
    loopToggle.addEventListener('click', () => {
      videoAnimator.setLoop(!videoAnimator.isLooping);
      loopToggle.classList.toggle('active', videoAnimator.isLooping);
    });
  }

  const modalMarkerSelect = document.getElementById('modalMapMarkerStyleSelect');
  if (modalMarkerSelect) {
    modalMarkerSelect.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.mapMarkerStyle = e.target.value;
      const wSelect = document.getElementById('mapMarkerStyleSelect');
      if (wSelect) wSelect.value = e.target.value;
      const badge = document.getElementById('mapMarkerStyleBadge');
      if (badge) badge.textContent = e.target.value;
      triggerRender();
    });
  }

  // Modal open helper
  function openExportModal() {
    videoAnimator.pause();
    if (modal) modal.style.display = 'flex';
    if (settingsView) settingsView.style.display = 'block';
    if (progressView) progressView.style.display = 'none';
    if (completedView) completedView.style.display = 'none';
  }

  if (openExportModalBtn) openExportModalBtn.addEventListener('click', openExportModal);
  if (startVideoExportBtn) {
    startVideoExportBtn.addEventListener('click', () => {
      const tabDur = document.getElementById('videoExportDurationSelect')?.value;
      const tabHold = document.getElementById('videoExportHoldSelect')?.value;
      const tabFps = document.getElementById('videoExportFpsSelect')?.value;
      if (tabDur && modalDurationSelect) modalDurationSelect.value = tabDur;
      if (tabHold && modalHoldSelect) modalHoldSelect.value = tabHold;
      if (tabFps && modalFpsSelect) modalFpsSelect.value = tabFps;
      openExportModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  if (modalRenderAgainBtn) {
    modalRenderAgainBtn.addEventListener('click', () => {
      if (settingsView) settingsView.style.display = 'block';
      if (progressView) progressView.style.display = 'none';
      if (completedView) completedView.style.display = 'none';
    });
  }

  // Render Execution
  if (modalRenderBtn) {
    modalRenderBtn.addEventListener('click', async () => {
      if (!state.currentActivity) {
        showToast('Please load an activity first.');
        return;
      }

      const duration = Number(modalDurationSelect?.value || 10);
      const holdDuration = Number(modalHoldSelect?.value ?? 5);
      const fps = Number(modalFpsSelect?.value || 30);
      const scale = Number(modalScaleSelect?.value || 1);
      const codecChoice = modalCodecSelect?.value || 'auto';
      const mimeType = codecChoice === 'auto' ? undefined : codecChoice;

      const totalExpectedFrames = Math.max(10, Math.round(duration * fps)) + Math.max(0, Math.round(holdDuration * fps));

      // Switch to progress view
      if (settingsView) settingsView.style.display = 'none';
      if (progressView) progressView.style.display = 'block';
      if (completedView) completedView.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      if (progressStatusText) progressStatusText.textContent = 'Rendering animated video frames...';
      if (progressDetail) progressDetail.textContent = `Rendering 0 / ${totalExpectedFrames} frames`;

      try {
        const result = await videoAnimator.exportVideo({
          duration,
          holdDuration,
          fps,
          scale,
          mimeType
        }, (frame, total, pct) => {
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressDetail) progressDetail.textContent = `Frame ${frame} / ${total} (${pct}%)`;
        });

        lastExportedVideoResult = result;

        // Switch to completed view
        if (progressView) progressView.style.display = 'none';
        if (completedView) completedView.style.display = 'block';

        if (videoPreviewPlayer) {
          videoPreviewPlayer.src = result.url;
          videoPreviewPlayer.play().catch(() => {});
        }

        const sizeMb = (result.size / (1024 * 1024)).toFixed(2);
        const formatName = result.filename.endsWith('.mp4') ? 'MP4' : 'WebM';
        if (videoMetaText) {
          videoMetaText.textContent = `${result.duration}s • ${formatName} • ${sizeMb} MB • ${result.filename}`;
        }

        showToast('Video rendered successfully! 🎬');

        // Check if desktop standalone mode is active to auto-save to output/
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Data = reader.result;
            try {
              const res = await fetch('/api/save-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: result.filename, videoData: base64Data })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.success) {
                  showToast(`Saved to output/${result.filename}! 💾`);
                }
              }
            } catch (ignore) {}
          };
          reader.readAsDataURL(result.blob);
        } catch (ignore) {}

      } catch (err) {
        console.error('Video export error:', err);
        showToast('Video export failed: ' + err.message);
        if (settingsView) settingsView.style.display = 'block';
        if (progressView) progressView.style.display = 'none';
      }
    });
  }

  if (modalDownloadBtn) {
    modalDownloadBtn.addEventListener('click', () => {
      if (!lastExportedVideoResult) return;
      downloadBlob(lastExportedVideoResult.blob, lastExportedVideoResult.filename);
      showToast(`Downloading ${lastExportedVideoResult.filename}...`);
    });
  }

  // Initial timeline sync
  updateAnimTimelineMarkers(1.0);
}

// ==========================================
// 1. NAVIGATION TABS
// ==========================================
function setupNavigationTabs() {
  const tabsNav = document.getElementById('tabsNav');
  const tabBtns = tabsNav.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

// ==========================================
// 2. ACTIVITY & FILE UPLOAD
// ==========================================
function setupActivityControls() {
  const dropzone = document.getElementById('fileDropzone');
  const fileInput = document.getElementById('activityFileInput');
  const quickDemoSelect = document.getElementById('quickDemoSelect');
  const unitToggleBtn = document.getElementById('unitToggleBtn');
  const unitToggleLabel = document.getElementById('unitToggleLabel');

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      await handleActivityFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await handleActivityFileUpload(e.target.files[0]);
    }
  });

  quickDemoSelect.addEventListener('change', (e) => {
    const demoKey = e.target.value;
    state.currentActivity = state.demoActivities[demoKey];
    syncInputsWithActivity(state.currentActivity);
    updateSplitsDropdownAndTable();
    if (videoAnimator) videoAnimator.seek(1.0);
    updateAnimTimelineMarkers(1.0);
    triggerRender();
    showToast(`Loaded ${state.currentActivity.title}`);
  });

  unitToggleBtn.addEventListener('click', () => {
    state.isImperial = !state.isImperial;
    unitToggleLabel.textContent = state.isImperial ? 'MI' : 'KM';
    state.demoActivities = getDemoActivities(state.isImperial);

    if (state.currentActivity) {
      recalculateActivitySplits(state.currentActivity, state.config.splitDistanceMeters, state.isImperial);
      state.currentActivity.distanceUnit = state.isImperial ? 'mi' : 'km';
    }

    updateSplitsDropdownAndTable();
    updateAnimTimelineMarkers(videoAnimator ? videoAnimator.progress : 1.0);
    triggerRender();
    showToast(`Switched units to ${state.isImperial ? 'Miles' : 'Kilometers'}`);
  });
}

async function handleActivityFileUpload(file) {
  showToast(`Parsing ${file.name}...`);
  try {
    const normalized = await parseActivityFile(file, state.isImperial, state.config.splitDistanceMeters);
    state.currentActivity = normalized;
    syncInputsWithActivity(normalized);
    updateSplitsDropdownAndTable();
    if (videoAnimator) videoAnimator.seek(1.0);
    updateAnimTimelineMarkers(1.0);
    triggerRender();
    showToast(`Loaded ${normalized.title} (${normalized.distanceMain} ${normalized.distanceUnit})`);
  } catch (err) {
    console.error('File parsing error:', err);
    showToast(`Failed to parse file: ${err.message}`);
  }
}

function syncInputsWithActivity(act) {
  if (!act) return;
  const title = document.getElementById('inputActivityTitle');
  const runner = document.getElementById('inputRunnerName');
  const loc = document.getElementById('inputLocationName');
  const weather = document.getElementById('inputWeatherText');

  if (title) title.value = state.config.customTitle || act.title || '';
  if (runner) runner.value = state.config.runnerName || '@runner';
  if (loc) loc.value = state.config.locationName || '';
  if (weather) weather.value = state.config.weatherText || '';

  // Also sync Text Tab inputs
  const ttTitle = document.getElementById('textTabActivityTitle');
  const ttSubtitle = document.getElementById('textTabSubtitle');
  const ttRunner = document.getElementById('textTabRunnerName');
  const ttLoc = document.getElementById('textTabLocationName');
  const ttWeather = document.getElementById('textTabWeatherText');
  const ttWatermark = document.getElementById('textTabWatermark');

  if (ttTitle) ttTitle.value = state.config.customTitle || act.title || '';
  if (ttSubtitle) ttSubtitle.value = state.config.customSubtitle || `${act.dateFormatted} • ${act.timeFormatted}`;
  if (ttRunner) ttRunner.value = state.config.runnerName || '@runner';
  if (ttLoc) ttLoc.value = state.config.locationName || '';
  if (ttWeather) ttWeather.value = state.config.weatherText || '';
  if (ttWatermark) ttWatermark.value = state.config.customWatermark || '';
}

// ==========================================
// 3. FORMAT & TEMPLATES CONTROLS
// ==========================================
function setupFormatControls() {
  const customBox = document.getElementById('customAspectRatioBox');
  const customWInput = document.getElementById('customWidthInput');
  const customHInput = document.getElementById('customHeightInput');
  const swapBtn = document.getElementById('swapDimensionsBtn');
  const customRatioLabel = document.getElementById('customRatioCalculatedLabel');

  const updateCustomLabel = (w, h) => {
    if (customRatioLabel) {
      customRatioLabel.textContent = `${w} × ${h} px`;
    }
  };

  // Aspect Ratios
  setupCardGrid('#aspectRatioGrid', 'data-ratio', (ratio) => {
    pushUndoSnapshot();
    state.config.aspectRatio = ratio;
    if (ratio === 'custom') {
      if (customBox) customBox.style.display = 'block';
      const w = parseInt(customWInput ? customWInput.value : 1080, 10) || 1080;
      const h = parseInt(customHInput ? customHInput.value : 1080, 10) || 1080;
      state.config.customWidth = w;
      state.config.customHeight = h;
      updateCustomLabel(w, h);
      document.getElementById('aspectRatioPill').textContent = `Custom (${w}×${h})`;
    } else {
      if (customBox) customBox.style.display = 'none';
      document.getElementById('aspectRatioPill').textContent = ASPECT_RATIOS[ratio]?.label.split(' ')[0] || ratio;
    }

    if (renderer.bgImage && state.config.bgType === 'photo') {
      const img = renderer.bgImage;
      const imgAspect = img.width / img.height;
      let canvasAspect = 9 / 16;
      if (ratio === 'custom') {
        canvasAspect = (state.config.customWidth || 1080) / (state.config.customHeight || 1080);
      } else {
        const [rw, rh] = ratio.split(':').map(Number);
        if (rw && rh) canvasAspect = rw / rh;
      }
      const isRatioSimilar = Math.abs(imgAspect - canvasAspect) / Math.max(imgAspect, canvasAspect) < 0.05;
      if (!isRatioSimilar && state.config.photoFit !== 'cover') {
        state.config.photoFit = 'fit';
      }
      syncPhotoSliders();
    }
    triggerRender();
  });

  // Custom Aspect Ratio Inputs
  if (customWInput) {
    customWInput.addEventListener('input', (e) => {
      const val = Math.max(300, Math.min(4000, parseInt(e.target.value, 10) || 1080));
      state.config.customWidth = val;
      updateCustomLabel(val, state.config.customHeight || 1080);
      if (state.config.aspectRatio === 'custom') {
        document.getElementById('aspectRatioPill').textContent = `Custom (${val}×${state.config.customHeight || 1080})`;
      }
      triggerRender();
    });
  }

  if (customHInput) {
    customHInput.addEventListener('input', (e) => {
      const val = Math.max(300, Math.min(4000, parseInt(e.target.value, 10) || 1080));
      state.config.customHeight = val;
      updateCustomLabel(state.config.customWidth || 1080, val);
      if (state.config.aspectRatio === 'custom') {
        document.getElementById('aspectRatioPill').textContent = `Custom (${state.config.customWidth || 1080}×${val})`;
      }
      triggerRender();
    });
  }

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      const oldW = state.config.customWidth || 1080;
      const oldH = state.config.customHeight || 1080;
      state.config.customWidth = oldH;
      state.config.customHeight = oldW;
      if (customWInput) customWInput.value = oldH;
      if (customHInput) customHInput.value = oldW;
      updateCustomLabel(oldH, oldW);
      if (state.config.aspectRatio === 'custom') {
        document.getElementById('aspectRatioPill').textContent = `Custom (${oldH}×${oldW})`;
      }
      triggerRender();
    });
  }

  document.querySelectorAll('.quick-ratio-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      pushUndoSnapshot();
      const w = parseInt(btn.dataset.w, 10);
      const h = parseInt(btn.dataset.h, 10);
      state.config.customWidth = w;
      state.config.customHeight = h;
      if (customWInput) customWInput.value = w;
      if (customHInput) customHInput.value = h;
      updateCustomLabel(w, h);
      state.config.aspectRatio = 'custom';
      updateActiveCard('#aspectRatioGrid', 'data-ratio', 'custom');
      if (customBox) customBox.style.display = 'block';
      document.getElementById('aspectRatioPill').textContent = `Custom (${w}×${h})`;
      triggerRender();
    });
  });

  // Templates
  setupCardGrid('#templateGrid', 'data-template', (template) => {
    state.config.template = template;
    const templateNames = {
      'story-pro': 'Story Pro',
      'split-focus': 'Split Focus',
      'minimal-hud': 'Minimal HUD',
      'stat-beast': 'Stat Beast',
      'route-focus': 'Route Focus',
      'lap-workout': 'Lap Workout',
      'kinetic-centered': 'Kinetic Centered',
      'marathon-finisher': 'Marathon Finisher',
      'tokyo-night': 'Tokyo Night HUD',
      'ultra-trail': 'Ultra Trail Ridge',
      'swiss-editorial': 'Swiss Athletic',
      'smartwatch-ultra': 'Watch Face Modular',
    };
    document.getElementById('templatePill').textContent = templateNames[template] || template;
    triggerRender();
  });
}

// ==========================================
// 3b. SAVED CUSTOM TEMPLATES CONTROLS
// ==========================================
const TEMPLATES_STORAGE_KEY = 'runoverlay_custom_templates';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#039;');
}

function getSavedTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Failed to parse saved templates:', e);
    return [];
  }
}

function saveTemplatesToStorage(templates) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to storage:', e);
    showToast('Failed to save to local storage');
  }
}

function extractTemplateConfig(cfg) {
  return {
    aspectRatio: cfg.aspectRatio || '9:16',
    customWidth: cfg.customWidth || 1080,
    customHeight: cfg.customHeight || 1080,
    template: cfg.template || 'story-pro',
    theme: cfg.theme || 'cyber',
    customAccentColor: cfg.customAccentColor || null,

    // Background & styling
    bgType: cfg.bgType || 'solid',
    bgColor1: cfg.bgColor1 || '#0a0a0d',
    bgColor2: cfg.bgColor2 || '#13131a',
    bgGradientAngle: cfg.bgGradientAngle || 180,
    photoFit: cfg.photoFit || 'fit',
    photoZoom: typeof cfg.photoZoom === 'number' ? cfg.photoZoom : 1,
    photoPanX: typeof cfg.photoPanX === 'number' ? cfg.photoPanX : 0,
    photoPanY: typeof cfg.photoPanY === 'number' ? cfg.photoPanY : 0,
    photoBlur: typeof cfg.photoBlur === 'number' ? cfg.photoBlur : 0,
    cardStyle: cfg.cardStyle || 'glass',
    cardRadius: typeof cfg.cardRadius === 'number' ? cfg.cardRadius : 16,
    fontFamily: cfg.fontFamily || 'Inter',
    mapGlow: cfg.mapGlow !== false,

    // Enabled widgets
    showWidgetHeader: cfg.showWidgetHeader !== false,
    showWidgetMap: cfg.showWidgetMap !== false,
    showWidgetHero: cfg.showWidgetHero !== false,
    showWidgetMetrics: cfg.showWidgetMetrics !== false,
    showWidgetSplits: cfg.showWidgetSplits !== false,
    showWidgetElevation: cfg.showWidgetElevation !== false,
    showWidgetHrZones: cfg.showWidgetHrZones !== false,
    showWidgetBrand: cfg.showWidgetBrand !== false,
    showWidgetPaceGraph: cfg.showWidgetPaceGraph !== false,
    showWidgetHrGraph: cfg.showWidgetHrGraph !== false,
    showWidgetAvgHrBadge: cfg.showWidgetAvgHrBadge !== false,

    // Metric items
    metricShowTime: cfg.metricShowTime !== false,
    metricShowPace: cfg.metricShowPace !== false,
    metricShowHr: cfg.metricShowHr !== false,
    metricShowElevation: cfg.metricShowElevation !== false,
    metricShowCadence: cfg.metricShowCadence !== false,
    metricShowCalories: cfg.metricShowCalories !== false,
    metricShowDistance: Boolean(cfg.metricShowDistance),
    metricShowBestPace: Boolean(cfg.metricShowBestPace),

    // Widget designs
    headerTemplate: cfg.headerTemplate || cfg.headerDesign || 'modern',
    headerDesign: cfg.headerDesign || cfg.headerTemplate || 'modern',
    heroMetric: cfg.heroMetric || 'distance',
    heroDesign: cfg.heroDesign || 'mega',
    metricsDesign: cfg.metricsDesign || 'grid',
    splitWidgetMode: cfg.splitWidgetMode || 'bars',
    splitsDesign: cfg.splitsDesign || 'vertical-bars',
    splitHighlightDesign: cfg.splitHighlightDesign || 'spotlight',
    elevationDesign: cfg.elevationDesign || 'area',
    paceGraphDesign: cfg.paceGraphDesign || 'area',
    hrGraphDesign: cfg.hrGraphDesign || 'filled-area',
    hrBadgeDesign: cfg.hrBadgeDesign || 'pill',
    brandStyle: cfg.brandStyle || 'strava',
    mapDesign: cfg.mapDesign || 'glow',

    // Splits configuration
    splitInterval: cfg.splitInterval || 1000,
    splitDataSource: cfg.splitDataSource || 'auto',
    splitHighlightFastest: cfg.splitHighlightFastest !== false,
    splitCustomTitle: cfg.splitCustomTitle || '',
    splitColumns: cfg.splitColumns ? JSON.parse(JSON.stringify(cfg.splitColumns)) : {},

    // Text overrides & label customizations
    headerShowLocation: cfg.headerShowLocation !== false,
    showLocation: cfg.showLocation !== false,
    customTitle: cfg.customTitle || '',
    customSubtitle: cfg.customSubtitle || '',
    runnerName: cfg.runnerName || '',
    locationName: cfg.locationName || '',
    weatherText: cfg.weatherText || '',
    customWatermark: cfg.customWatermark || '',
    labelDistance: cfg.labelDistance || '',
    labelTime: cfg.labelTime || '',
    labelPace: cfg.labelPace || '',
    labelHr: cfg.labelHr || '',
    labelElevation: cfg.labelElevation || '',
    labelCadence: cfg.labelCadence || '',
    widgetTextOverrides: cfg.widgetTextOverrides ? JSON.parse(JSON.stringify(cfg.widgetTextOverrides)) : {},
    customTexts: cfg.customTexts ? JSON.parse(JSON.stringify(cfg.customTexts)) : [],

    // Individual Positioning, Backgrounds, and Sub-Parts
    widgetPositions: cfg.widgetPositions ? JSON.parse(JSON.stringify(cfg.widgetPositions)) : {},
    widgetBgStyles: cfg.widgetBgStyles ? JSON.parse(JSON.stringify(cfg.widgetBgStyles)) : {},
    widgetElementOffsets: cfg.widgetElementOffsets ? JSON.parse(JSON.stringify(cfg.widgetElementOffsets)) : {},
    elementStyles: cfg.elementStyles ? JSON.parse(JSON.stringify(cfg.elementStyles)) : {},

    // Snap to Grid
    snapToGrid: !!cfg.snapToGrid,
    gridSize: cfg.gridSize || 20,
    showGridOverlay: !!cfg.showGridOverlay,
  };
}

function saveCurrentTemplate(customName = null) {
  const nameInput = document.getElementById('saveTemplateNameInput');
  let name = (customName || (nameInput ? nameInput.value : '')).trim();

  if (!name) {
    const themeName = state.config.theme ? (state.config.theme.charAt(0).toUpperCase() + state.config.theme.slice(1)) : 'Custom';
    const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    name = `${themeName} ${state.config.aspectRatio || '9:16'} (${dateStr})`;
  }

  const templates = getSavedTemplates();
  const newTemplate = {
    id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: name,
    createdAt: new Date().toISOString(),
    aspectRatio: state.config.aspectRatio || '9:16',
    theme: state.config.theme || 'cyber',
    config: extractTemplateConfig(state.config),
  };

  templates.unshift(newTemplate);
  saveTemplatesToStorage(templates);
  if (nameInput) nameInput.value = '';

  renderSavedTemplatesList();
  showToast(`Template "${name}" saved! 💾`);
  return newTemplate;
}

function applyCustomTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl || !tpl.config) {
    showToast('Template not found');
    return;
  }

  pushUndoSnapshot();

  const c = tpl.config;
  Object.keys(c).forEach((key) => {
    if (typeof c[key] === 'object' && c[key] !== null) {
      state.config[key] = JSON.parse(JSON.stringify(c[key]));
    } else {
      state.config[key] = c[key];
    }
  });

  syncAllControlsWithConfig();
  triggerRender();
  updateGizmoBox();
  renderSavedTemplatesList();

  showToast(`Applied template "${tpl.name}"! ⚡`);
}

function deleteCustomTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  const name = tpl ? tpl.name : 'template';
  if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;

  const filtered = templates.filter((t) => t.id !== templateId);
  saveTemplatesToStorage(filtered);
  renderSavedTemplatesList();
  showToast(`Deleted template "${name}"`);
}

function renameCustomTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return;
  const newName = prompt('Enter new template name:', tpl.name);
  if (newName && newName.trim()) {
    tpl.name = newName.trim();
    saveTemplatesToStorage(templates);
    renderSavedTemplatesList();
    showToast('Template renamed');
  }
}

function exportSingleTemplate(templateId) {
  const templates = getSavedTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) return;

  const jsonStr = JSON.stringify(tpl, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `${tpl.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_template.json`;
  downloadBlob(blob, filename);
  showToast(`Exported "${tpl.name}" to JSON`);
}

function exportAllTemplates() {
  const templates = getSavedTemplates();
  if (templates.length === 0) {
    showToast('No saved templates to export');
    return;
  }

  const jsonStr = JSON.stringify(templates, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, 'runoverlay_saved_templates_backup.json');
  showToast(`Exported ${templates.length} template(s) to backup file`);
}

function importTemplatesFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const incoming = Array.isArray(data) ? data : [data];
      const valid = incoming.filter((item) => item && (item.config || item.aspectRatio || item.name));
      if (valid.length === 0) {
        showToast('Invalid template file format');
        return;
      }

      const templates = getSavedTemplates();
      valid.forEach((t) => {
        templates.unshift({
          id: 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: t.name || 'Imported Template',
          createdAt: t.createdAt || new Date().toISOString(),
          aspectRatio: t.aspectRatio || (t.config && t.config.aspectRatio) || '9:16',
          theme: t.theme || (t.config && t.config.theme) || 'cyber',
          config: t.config || extractTemplateConfig(t),
        });
      });

      saveTemplatesToStorage(templates);
      renderSavedTemplatesList();
      showToast(`Imported ${valid.length} template(s) successfully! 📥`);

      if (valid.length > 0) {
        applyCustomTemplate(templates[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Error reading template file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function renderSavedTemplatesList() {
  const container = document.getElementById('savedTemplatesList');
  const countBadge = document.getElementById('savedTemplatesCount');
  if (!container) return;

  const templates = getSavedTemplates();
  if (countBadge) countBadge.textContent = `${templates.length} Saved`;

  if (templates.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 18px 12px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-subtle); border-radius: 8px; color: var(--text-muted); font-size: 0.78rem;">
        <div style="font-size: 1.5rem; margin-bottom: 6px;">📐</div>
        <div style="font-weight: 600; color: #fff; margin-bottom: 2px;">No Saved Templates Yet</div>
        <div>Customize your widgets, colors, and layout, then enter a name above to save your first reusable template!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  templates.forEach((tpl) => {
    const card = document.createElement('div');
    card.className = 'saved-template-card';
    card.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;';

    const dateStr = tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; font-size: 0.88rem; color: #fff; display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span>⚡</span>
            <span class="template-name-text">${escapeHtml(tpl.name)}</span>
            <button type="button" class="btn-rename-template" data-id="${tpl.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.72rem; padding:0 2px;" title="Rename template">✏️</button>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
            <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(204,255,0,0.12); color: var(--accent-volt); font-weight: 700;">${tpl.aspectRatio || '9:16'}</span>
            <span style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; background: rgba(56,189,248,0.12); color: #38bdf8; font-weight: 700;">${(tpl.theme || 'CYBER').toUpperCase()}</span>
            <span style="font-size: 0.68rem; color: var(--text-muted);">${dateStr}</span>
          </div>
        </div>
        <div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
          <button type="button" class="btn btn-primary btn-apply-template" data-id="${tpl.id}" style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700;" title="Load and apply this template">
            Apply ⚡
          </button>
          <button type="button" class="btn btn-secondary btn-export-template" data-id="${tpl.id}" style="padding: 4px 8px; font-size: 0.72rem;" title="Download template JSON file">
            💾
          </button>
          <button type="button" class="btn btn-secondary btn-delete-template" data-id="${tpl.id}" style="padding: 4px 8px; font-size: 0.72rem; color: #f87171;" title="Delete this template">
            🗑️
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-apply-template').addEventListener('click', () => applyCustomTemplate(tpl.id));
    card.querySelector('.btn-export-template').addEventListener('click', () => exportSingleTemplate(tpl.id));
    card.querySelector('.btn-delete-template').addEventListener('click', () => deleteCustomTemplate(tpl.id));
    card.querySelector('.btn-rename-template').addEventListener('click', () => renameCustomTemplate(tpl.id));

    container.appendChild(card);
  });
}

function setupSavedTemplatesControls() {
  const saveBtn = document.getElementById('saveCurrentTemplateBtn');
  const nameInput = document.getElementById('saveTemplateNameInput');
  const stageSaveBtn = document.getElementById('stageSaveTemplateBtn');
  const importBtn = document.getElementById('importTemplateBtn');
  const fileInput = document.getElementById('importTemplateFileInput');
  const exportAllBtn = document.getElementById('exportAllTemplatesBtn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveCurrentTemplate());
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveCurrentTemplate();
      }
    });
  }

  if (stageSaveBtn) {
    stageSaveBtn.addEventListener('click', () => {
      const formatTabBtn = document.querySelector('.tab-btn[data-tab="formatTab"]');
      if (formatTabBtn) formatTabBtn.click();

      const input = document.getElementById('saveTemplateNameInput');
      const box = document.getElementById('saveTemplateFormBox');
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      }
      if (box) {
        box.style.borderColor = 'var(--accent-volt)';
        box.style.boxShadow = '0 0 16px rgba(204, 255, 0, 0.3)';
        setTimeout(() => {
          box.style.borderColor = 'var(--border-subtle)';
          box.style.boxShadow = 'none';
        }, 1500);
      }
      showToast('Enter template name and click Save 💾');
    });
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importTemplatesFromFile(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', exportAllTemplates);
  }

  // Initial render from localStorage
  renderSavedTemplatesList();

  // Expose on window for tests and console
  window.saveCurrentTemplate = saveCurrentTemplate;
  window.applyCustomTemplate = applyCustomTemplate;
  window.getSavedTemplates = getSavedTemplates;
  window.renderSavedTemplatesList = renderSavedTemplatesList;
  window.importTemplatesFromFile = importTemplatesFromFile;
  window.exportSingleTemplate = exportSingleTemplate;
  window.exportAllTemplates = exportAllTemplates;
}

// ==========================================
// 4. SPLITS & LAPS CONTROLS
// ==========================================
function setupSplitsControls() {
  setupCardGrid('#splitSourceGrid', 'data-source', (source) => {
    state.config.splitDataSource = source;
    updateSplitsDropdownAndTable();
    triggerRender();
  });

  // Split Distance Interval Selector
  const splitIntervalSelect = document.getElementById('splitIntervalSelect');
  const customSplitGroup = document.getElementById('customSplitGroup');
  const customSplitInput = document.getElementById('customSplitInput');

  if (splitIntervalSelect) {
    const handleIntervalChange = () => {
      let meters = parseFloat(splitIntervalSelect.value);
      if (splitIntervalSelect.value === 'custom') {
        if (customSplitGroup) customSplitGroup.style.display = 'block';
        meters = parseFloat(customSplitInput.value) || 800;
      } else {
        if (customSplitGroup) customSplitGroup.style.display = 'none';
      }

      state.config.splitDistanceMeters = meters;
      if (state.currentActivity) {
        recalculateActivitySplits(state.currentActivity, meters, state.isImperial);
        updateSplitsDropdownAndTable();
        triggerRender();
        const label = meters >= 1000 ? (meters / 1000) + ' km' : meters + ' m';
        showToast(`Splits recalculated every ${label}`);
      }
    };

    splitIntervalSelect.addEventListener('change', handleIntervalChange);
    if (customSplitInput) customSplitInput.addEventListener('input', handleIntervalChange);
  }

  setupCardGrid('#splitWidgetModeGrid', 'data-mode', (mode) => {
    state.config.splitWidgetMode = mode;
    triggerRender();
  });

  const splitTargetSelect = document.getElementById('splitTargetSelect');
  if (splitTargetSelect) {
    splitTargetSelect.addEventListener('change', (e) => {
      state.config.highlightSplitTarget = e.target.value;
      triggerRender();
    });
  }

  // Split Data Columns Checkboxes (New User Requirement)
  const colBinds = [
    { id: 'colSplitTime', key: 'time' },
    { id: 'colSplitPace', key: 'pace' },
    { id: 'colSplitDelta', key: 'delta' },
    { id: 'colSplitAvgHr', key: 'avgHr' },
    { id: 'colSplitMaxHr', key: 'maxHr' },
    { id: 'colSplitMinHr', key: 'minHr' },
    { id: 'colSplitCadence', key: 'cadence' },
    { id: 'colSplitElev', key: 'elevation' },
  ];
  colBinds.forEach(({ id, key }) => {
    const cb = document.getElementById(id);
    if (cb) {
      cb.checked = state.config.splitColumns[key] !== false;
      cb.addEventListener('change', (e) => {
        state.config.splitColumns[key] = e.target.checked;
        if (state.selectedWidget && state.selectedWidget.startsWith('splits_')) {
          const inst = state.config.extraWidgetInstances?.find((i) => i.id === state.selectedWidget);
          if (inst) {
            if (!inst.options) inst.options = {};
            if (!inst.options.splitColumns) inst.options.splitColumns = { ...state.config.splitColumns };
            inst.options.splitColumns[key] = e.target.checked;
          }
        }
        triggerRender();
      });
    }
  });

  // Snap to Grid Controls & Listeners (New User Requirement)
  const updateSnapToGridUI = (enabled, size, showGrid) => {
    state.config.snapToGrid = !!enabled;
    if (size !== undefined && size !== null) {
      state.config.gridSize = Math.max(2, Math.min(200, parseInt(size, 10) || 20));
    }
    if (showGrid !== undefined) state.config.showGridOverlay = !!showGrid;

    const gSize = state.config.gridSize || 20;
    const snapBtn = document.getElementById('toggleSnapToGridBtn');
    if (snapBtn) {
      snapBtn.textContent = state.config.snapToGrid ? `🧲 Snap: ON (${gSize}px)` : '🧲 Snap: OFF';
      snapBtn.classList.toggle('btn-toggle-active', state.config.snapToGrid);
    }
    const snapBadge = document.getElementById('snapGridStatusBadge');
    if (snapBadge) {
      snapBadge.textContent = state.config.snapToGrid ? `ON (${gSize}px)` : 'OFF';
      snapBadge.style.color = state.config.snapToGrid ? 'var(--accent-volt)' : 'var(--text-muted)';
    }
    const snapCb = document.getElementById('snapToGridCheckbox');
    if (snapCb) snapCb.checked = state.config.snapToGrid;
    const snapTbSize = document.getElementById('snapGridToolbarSize');
    if (snapTbSize) snapTbSize.value = gSize;
    const snapNum = document.getElementById('snapGridSizeNumber');
    if (snapNum) snapNum.value = gSize;
    const snapSlider = document.getElementById('snapGridSizeSlider');
    if (snapSlider) snapSlider.value = gSize;
    const showGridCb = document.getElementById('showGridOverlayCheckbox');
    if (showGridCb) showGridCb.checked = !!state.config.showGridOverlay;

    triggerRender();
  };

  const toggleSnapBtn = document.getElementById('toggleSnapToGridBtn');
  if (toggleSnapBtn) {
    toggleSnapBtn.addEventListener('click', () => {
      const next = !state.config.snapToGrid;
      updateSnapToGridUI(next, state.config.gridSize, state.config.showGridOverlay);
      showToast(next ? `Snap to Grid: ON (${state.config.gridSize}px)` : 'Snap to Grid: OFF');
    });
  }

  const snapCb = document.getElementById('snapToGridCheckbox');
  if (snapCb) {
    snapCb.addEventListener('change', (e) => {
      updateSnapToGridUI(e.target.checked, state.config.gridSize, state.config.showGridOverlay);
      showToast(e.target.checked ? `Snap to Grid: ON (${state.config.gridSize}px)` : 'Snap to Grid: OFF');
    });
  }

  const handleGridSizeInput = (val) => {
    const s = Math.max(2, Math.min(200, parseInt(val, 10) || 20));
    updateSnapToGridUI(state.config.snapToGrid, s, state.config.showGridOverlay);
  };

  const snapTbSize = document.getElementById('snapGridToolbarSize');
  if (snapTbSize) snapTbSize.addEventListener('input', (e) => handleGridSizeInput(e.target.value));

  const snapNum = document.getElementById('snapGridSizeNumber');
  if (snapNum) snapNum.addEventListener('input', (e) => handleGridSizeInput(e.target.value));

  const snapSlider = document.getElementById('snapGridSizeSlider');
  if (snapSlider) snapSlider.addEventListener('input', (e) => handleGridSizeInput(e.target.value));

  document.querySelectorAll('.grid-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = parseInt(btn.dataset.grid, 10);
      updateSnapToGridUI(true, s, state.config.showGridOverlay);
      showToast(`Grid size set to ${s}px (Snap enabled)`);
    });
  });

  const showGridCb = document.getElementById('showGridOverlayCheckbox');
  if (showGridCb) {
    showGridCb.addEventListener('change', (e) => {
      state.config.showGridOverlay = e.target.checked;
      triggerRender();
    });
  }

  // Fastest Split Highlight Toggle (New User Requirement)
  const toggleFastest = document.getElementById('toggleFastestSplitHighlight');
  if (toggleFastest) {
    toggleFastest.checked = state.config.splitHighlightFastest !== false && state.config.splitsShowFastest !== false;
    toggleFastest.addEventListener('change', (e) => {
      state.config.splitHighlightFastest = e.target.checked;
      state.config.splitsShowFastest = e.target.checked;
      triggerRender();
    });
  }

  // Split Widget Title Input (New User Requirement)
  const splitTitleInput = document.getElementById('inputSplitWidgetTitle');
  if (splitTitleInput) {
    splitTitleInput.value = state.config.splitCustomTitle || '';
    splitTitleInput.addEventListener('input', (e) => {
      state.config.splitCustomTitle = e.target.value;
      if (state.config.widgetTextOverrides?.splits) {
        state.config.widgetTextOverrides.splits.title = e.target.value;
      }
      triggerRender();
    });
  }

  // Reset Split Row Labels Button
  const resetSplitLabelsBtn = document.getElementById('resetSplitLabelsBtn');
  if (resetSplitLabelsBtn) {
    resetSplitLabelsBtn.addEventListener('click', () => {
      state.config.splitCustomLabels = {};
      renderSplitRowRenamerList();
      triggerRender();
      showToast('Split row names reset to default');
    });
  }
}

function renderSplitRowRenamerList() {
  const container = document.getElementById('splitRowRenamerList');
  if (!container) return;

  const isLapSource = state.config.splitDataSource === 'laps' && state.currentActivity?.hasLaps;
  const items = isLapSource ? state.currentActivity?.laps : state.currentActivity?.splits;

  if (!items || items.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:4px;">No splits loaded yet.</div>';
    return;
  }

  container.innerHTML = '';
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'split-renamer-row';
    const currentCustom = (state.config.splitCustomLabels && state.config.splitCustomLabels[item.index]) || '';

    row.innerHTML = `
      <span class="split-renamer-badge">${item.shortName || ('#' + (idx + 1))}</span>
      <input type="text" class="split-renamer-input" placeholder="${item.name}" value="${currentCustom}">
    `;

    const input = row.querySelector('.split-renamer-input');
    input.addEventListener('input', (e) => {
      if (!state.config.splitCustomLabels) state.config.splitCustomLabels = {};
      state.config.splitCustomLabels[item.index] = e.target.value;
      triggerRender();
    });

    container.appendChild(row);
  });
}

function updateSplitsDropdownAndTable() {
  const isLapSource = state.config.splitDataSource === 'laps' && state.currentActivity?.hasLaps;
  const items = isLapSource ? state.currentActivity?.laps : state.currentActivity?.splits;
  const select = document.getElementById('splitTargetSelect');
  const tbody = document.getElementById('splitsTableBody');
  const summaryBadge = document.getElementById('splitsTableSummaryBadge');

  renderSplitRowRenamerList();

  if (!items || items.length === 0) {
    if (select) select.innerHTML = '<option value="fastest">⚡ Fastest Split</option>';
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No split data available</td></tr>';
    if (summaryBadge) summaryBadge.textContent = '';
    return;
  }

  const totalDistMeters = items.reduce((sum, item) => sum + (item.distance || 0), 0);
  const distFormatted = state.isImperial
    ? `${(totalDistMeters / 1609.34).toFixed(2)} mi`
    : `${(totalDistMeters / 1000).toFixed(2)} km`;

  if (summaryBadge) {
    summaryBadge.textContent = `${items.length} Splits Total • ${distFormatted}`;
  }

  const prevVal = select.value;
  select.innerHTML = `
    <option value="fastest">⚡ Fastest Split (${items.find((i) => i.isFastest)?.shortName || 'PB'})</option>
    <option value="slowest">🐢 Slowest Split</option>
    <option value="last">🏁 Final Split (${items[items.length - 1].shortName})</option>
  `;

  const optGroup = document.createElement('optgroup');
  optGroup.label = isLapSource ? 'Select Specific Lap' : 'Select Specific Distance Split';

  items.forEach((item, idx) => {
    const opt = document.createElement('option');
    opt.value = `index-${idx}`;
    opt.textContent = `${item.name} • ${item.paceFormatted} (${item.timeFormatted})`;
    optGroup.appendChild(opt);
  });
  select.appendChild(optGroup);

  if (Array.from(select.options).some((o) => o.value === prevVal)) {
    select.value = prevVal;
  }

  tbody.innerHTML = '';
  items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    if (item.isFastest) tr.classList.add('fastest');

    tr.innerHTML = `
      <td><strong>${item.name}</strong> ${item.isFastest ? '⚡' : ''}</td>
      <td>${item.timeFormatted}</td>
      <td><strong>${item.paceFormatted}</strong></td>
      <td>${item.avgHr ? item.avgHr + ' bpm' : '-'}</td>
      <td>${item.elevationGain ? '+' + item.elevationGain + 'm' : '-'}</td>
    `;

    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      select.value = `index-${idx}`;
      state.config.highlightSplitTarget = `index-${idx}`;
      state.config.splitWidgetMode = 'highlight';
      updateActiveCard('#splitWidgetModeGrid', 'data-mode', 'highlight');
      triggerRender();
      showToast(`Spotlighted ${item.name}`);
    });

    tbody.appendChild(tr);
  });

  // Add overall summary row at bottom of table
  if (items.length > 1) {
    const totalDurationSec = items.reduce((sum, item) => sum + (item.duration || 0), 0);
    const avgSecPerKm = totalDistMeters > 0 ? totalDurationSec / (totalDistMeters / 1000) : 0;
    const avgPaceMin = Math.floor(avgSecPerKm / 60);
    const avgPaceRemSec = Math.floor(avgSecPerKm % 60);
    const avgPaceFormatted = `${avgPaceMin}:${String(avgPaceRemSec).padStart(2, '0')} /km`;

    const totalHours = Math.floor(totalDurationSec / 3600);
    const totalMinutes = Math.floor((totalDurationSec % 3600) / 60);
    const totalSeconds = Math.round(totalDurationSec % 60);
    const totalTimeFormatted = totalHours > 0
      ? `${totalHours}:${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`
      : `${totalMinutes}:${String(totalSeconds).padStart(2, '0')}`;

    const totalTr = document.createElement('tr');
    totalTr.style.background = 'rgba(255, 255, 255, 0.08)';
    totalTr.style.borderTop = '2px solid rgba(255, 255, 255, 0.2)';
    totalTr.style.fontWeight = 'bold';
    totalTr.innerHTML = `
      <td><strong>TOTAL (${items.length})</strong></td>
      <td><strong>${totalTimeFormatted}</strong></td>
      <td><strong style="color:var(--accent-volt);">${avgPaceFormatted}</strong></td>
      <td>-</td>
      <td>-</td>
    `;
    tbody.appendChild(totalTr);
  }
}

// ==========================================
// 5. WIDGETS CONTROLS
// ==========================================
function setupWidgetsControls() {
  const binds = [
    { id: 'toggleHeader', key: 'showWidgetHeader' },
    { id: 'toggleMap', key: 'showWidgetMap' },
    { id: 'toggleHero', key: 'showWidgetHero' },
    { id: 'toggleMetrics', key: 'showWidgetMetrics' },
    { id: 'toggleSplits', key: 'showWidgetSplits' },
    { id: 'toggleSplitHighlight', key: 'showWidgetSplitHighlight' },
    { id: 'toggleElevation', key: 'showWidgetElevation' },
    { id: 'toggleHrZones', key: 'showWidgetHrZones' },
    { id: 'toggleBrand', key: 'showWidgetBrand' },
    { id: 'togglePaceGraph', key: 'showWidgetPaceGraph' },
    { id: 'toggleHrGraph', key: 'showWidgetHrGraph' },
    { id: 'toggleAvgHrBadge', key: 'showWidgetAvgHrBadge' },
  ];

  binds.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        state.config[key] = e.target.checked;
        triggerRender();
      });
    }
  });

  // Multi-Instance Widgets Add Button Handler
  const addNewWidgetBtn = document.getElementById('addNewWidgetBtn');
  if (addNewWidgetBtn) {
    addNewWidgetBtn.addEventListener('click', () => {
      const catSelect = document.getElementById('newWidgetCategorySelect');
      const cat = catSelect ? catSelect.value : 'hero';
      window.addNewWidgetInstance(cat);
    });
  }

  window.renderExtraWidgetsUI();
  window.refreshInspectorElementDropdown();

  // Widget Design Variants Dropdowns
  const designBinds = [
    { id: 'headerDesignSelect', key: 'headerDesign' },
    { id: 'mapDesignSelect', key: 'mapDesign' },
    { id: 'heroDesignSelect', key: 'heroDesign' },
    { id: 'metricsDesignSelect', key: 'metricsDesign' },
    { id: 'splitsDesignSelect', key: 'splitsDesign' },
    { id: 'splitHighlightDesignSelect', key: 'splitHighlightDesign' },
    { id: 'elevationDesignSelect', key: 'elevationDesign' },
    { id: 'paceGraphDesignSelect', key: 'paceGraphDesign' },
    { id: 'hrGraphDesignSelect', key: 'hrGraphDesign' },
    { id: 'hrBadgeDesignSelect', key: 'hrBadgeDesign' },
  ];

  designBinds.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        pushUndoSnapshot();
        state.config[key] = e.target.value;
        triggerRender();
      });
    }
  });

  // Secondary Metrics Individual Item Toggles and Presets
  const metricBinds = [
    { key: 'metricShowTime', ids: ['metricToggleTime', 'wToggleMetricTime', 'insToggleMetricTime'], def: true },
    { key: 'metricShowPace', ids: ['metricTogglePace', 'wToggleMetricPace', 'insToggleMetricPace'], def: true },
    { key: 'metricShowHr', ids: ['metricToggleHr', 'wToggleMetricHr', 'insToggleMetricHr'], def: true },
    { key: 'metricShowElevation', ids: ['metricToggleElevation', 'wToggleMetricElevation', 'insToggleMetricElevation'], def: true },
    { key: 'metricShowCadence', ids: ['metricToggleCadence', 'wToggleMetricCadence', 'insToggleMetricCadence'], def: true },
    { key: 'metricShowCalories', ids: ['metricToggleCalories', 'wToggleMetricCalories', 'insToggleMetricCalories'], def: true },
    { key: 'metricShowDistance', ids: ['metricToggleDistance', 'wToggleMetricDistance', 'insToggleMetricDistance'], def: false },
    { key: 'metricShowBestPace', ids: ['metricToggleBestPace', 'wToggleMetricBestPace', 'insToggleMetricBestPace'], def: false },
  ];

  const setMetricItemVisibility = (metricKey, isVisible) => {
    pushUndoSnapshot();
    state.config[metricKey] = isVisible;
    const bind = metricBinds.find((b) => b.key === metricKey);
    if (bind) {
      bind.ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = isVisible;
      });
    }
    triggerRender();
  };

  metricBinds.forEach(({ key, ids }) => {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          setMetricItemVisibility(key, e.target.checked);
        });
      }
    });
  });

  const applyMetricPreset = (preset) => {
    pushUndoSnapshot();
    if (preset === 'all') {
      metricBinds.forEach(({ key, ids }) => {
        state.config[key] = true;
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = true;
        });
      });
    } else if (preset === 'core') {
      const coreKeys = ['metricShowTime', 'metricShowPace', 'metricShowHr'];
      metricBinds.forEach(({ key, ids }) => {
        const val = coreKeys.includes(key);
        state.config[key] = val;
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = val;
        });
      });
    } else if (preset === 'telemetry') {
      const telemetryKeys = ['metricShowHr', 'metricShowElevation', 'metricShowCadence', 'metricShowCalories'];
      metricBinds.forEach(({ key, ids }) => {
        const val = telemetryKeys.includes(key);
        state.config[key] = val;
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = val;
        });
      });
    }
    triggerRender();
  };

  ['metricsSelectAllBtn', 'inspectorMetricsSelectAllBtn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => applyMetricPreset('all'));
  });

  ['metricsSelectCoreBtn', 'inspectorMetricsSelectCoreBtn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => applyMetricPreset('core'));
  });

  const telemetryBtn = document.getElementById('metricsSelectTelemetryBtn');
  if (telemetryBtn) telemetryBtn.addEventListener('click', () => applyMetricPreset('telemetry'));

  // Hero metric choice
  setupCardGrid('#heroMetricGrid', 'data-hero', (hero) => {
    pushUndoSnapshot();
    state.config.heroMetric = hero;
    triggerRender();
  });

  // Manual Position Sliders in Widgets Tab
  const posX = document.getElementById('widgetPosXSlider');
  const posY = document.getElementById('widgetPosYSlider');
  const posW = document.getElementById('widgetWidthSlider');
  const posH = document.getElementById('widgetHeightSlider');

  const onSliderChange = () => {
    if (!state.selectedWidget) return;
    const cur = state.config.widgetPositions[state.selectedWidget] || renderer.widgetBounds[state.selectedWidget] || {};
    state.config.widgetPositions[state.selectedWidget] = {
      ...cur,
      x: parseInt(posX.value, 10),
      y: parseInt(posY.value, 10),
      width: parseInt(posW.value, 10),
      height: parseInt(posH.value, 10),
    };
    triggerRender();
  };

  if (posX) posX.addEventListener('input', onSliderChange);
  if (posY) posY.addEventListener('input', onSliderChange);
  if (posW) posW.addEventListener('input', onSliderChange);
  if (posH) posH.addEventListener('input', onSliderChange);

  const resetPosBtn = document.getElementById('resetSelectedWidgetPosBtn');
  if (resetPosBtn) {
    resetPosBtn.addEventListener('click', () => {
      if (state.selectedWidget) {
        pushUndoSnapshot();
        delete state.config.widgetPositions[state.selectedWidget];
        triggerRender();
        showToast('Reset widget to template default');
      }
    });
  }

  // Manual Rotation Sliders in Widgets Tab
  const rotSlider = document.getElementById('widgetRotationSlider');
  const rotInput = document.getElementById('widgetRotationInput');
  const rotVal = document.getElementById('widgetRotationVal');
  const resetRotBtn = document.getElementById('resetWidgetRotationBtn');

  const onRotationChange = (deg, pushHistory = false) => {
    if (!state.selectedWidget) return;
    if (pushHistory) pushUndoSnapshot();
    const cur = state.config.widgetPositions[state.selectedWidget] || renderer.widgetBounds[state.selectedWidget] || {};
    const clampedDeg = Math.max(-180, Math.min(180, Math.round(deg)));
    state.config.widgetPositions[state.selectedWidget] = {
      ...cur,
      rotation: clampedDeg,
    };
    if (!state.config.elementStyles) state.config.elementStyles = {};
    if (!state.config.elementStyles[state.selectedWidget]) state.config.elementStyles[state.selectedWidget] = {};
    state.config.elementStyles[state.selectedWidget].rotation = clampedDeg;

    if (rotSlider) rotSlider.value = clampedDeg;
    if (rotInput) rotInput.value = clampedDeg;
    if (rotVal) rotVal.textContent = `${clampedDeg}°`;

    const inspSlider = document.getElementById('inspectorWidgetRotationSlider');
    const inspInput = document.getElementById('inspectorWidgetRotationInput');
    const inspVal = document.getElementById('inspectorWidgetRotationVal');
    if (inspSlider) inspSlider.value = clampedDeg;
    if (inspInput) inspInput.value = clampedDeg;
    if (inspVal) inspVal.textContent = `${clampedDeg}°`;

    triggerRender();
    updateGizmoBox();
  };

  if (rotSlider) {
    rotSlider.addEventListener('input', (e) => onRotationChange(parseFloat(e.target.value) || 0));
    rotSlider.addEventListener('change', () => pushUndoSnapshot());
  }
  if (rotInput) {
    rotInput.addEventListener('input', (e) => onRotationChange(parseFloat(e.target.value) || 0));
    rotInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (resetRotBtn) {
    resetRotBtn.addEventListener('click', () => {
      onRotationChange(0, true);
      showToast('Reset widget rotation to 0°');
    });
  }

  const rotPresets = document.querySelectorAll('.widget-rot-preset');
  rotPresets.forEach((btn) => {
    btn.addEventListener('click', () => {
      const deg = parseFloat(btn.dataset.rot) || 0;
      onRotationChange(deg, true);
      showToast(`Set rotation to ${deg}°`);
    });
  });

  const centerBtn = document.getElementById('centerSelectedWidgetBtn');
  if (centerBtn) {
    centerBtn.addEventListener('click', () => {
      if (state.selectedWidget) {
        pushUndoSnapshot();
        centerWidget(state.selectedWidget);
      }
    });
  }

  // Map Animation Marker Controls
  const markerSelect = document.getElementById('mapMarkerStyleSelect');
  if (markerSelect) {
    markerSelect.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.mapMarkerStyle = e.target.value;
      const badge = document.getElementById('mapMarkerStyleBadge');
      if (badge) badge.textContent = e.target.value;
      const modalSelect = document.getElementById('modalMapMarkerStyleSelect');
      if (modalSelect) modalSelect.value = e.target.value;
      triggerRender();
      showToast(`Map marker: ${e.target.value}`);
    });
  }

  const markerSizeSlider = document.getElementById('mapMarkerSizeSlider');
  const markerSizeVal = document.getElementById('mapMarkerSizeVal');
  if (markerSizeSlider) {
    markerSizeSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      state.config.mapMarkerSize = val;
      if (markerSizeVal) markerSizeVal.textContent = `${val}px`;
      triggerRender();
    });
    markerSizeSlider.addEventListener('change', () => pushUndoSnapshot());
  }

  const markerPulseToggle = document.getElementById('mapMarkerPulseToggle');
  if (markerPulseToggle) {
    markerPulseToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.mapMarkerPulse = e.target.checked;
      triggerRender();
    });
  }

  const markerStaticToggle = document.getElementById('mapMarkerStaticToggle');
  if (markerStaticToggle) {
    markerStaticToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.mapShowMarkerInStatic = e.target.checked;
      triggerRender();
    });
  }

  const markerColorInput = document.getElementById('mapMarkerColorInput');
  const markerColorResetBtn = document.getElementById('mapMarkerColorResetBtn');
  if (markerColorInput) {
    markerColorInput.addEventListener('input', (e) => {
      state.config.mapMarkerColor = e.target.value;
      triggerRender();
    });
    markerColorInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (markerColorResetBtn) {
    markerColorResetBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.mapMarkerColor = '';
      if (markerColorInput) markerColorInput.value = '#00f0ff';
      triggerRender();
      showToast('Marker color reset to Accent');
    });
  }
}

// ==========================================
// 6. HEADER TEMPLATES CONTROLS
// ==========================================
function setupHeaderTemplateControls() {
  const grid = document.getElementById('headerTemplateGrid');
  const select = document.getElementById('headerDesignSelect');

  const renderActiveHeaderTemplateTextControls = () => {
    const container = document.getElementById('headerTemplateCustomTextContainer');
    const fieldsContainer = document.getElementById('headerTemplateCustomFields');
    const badge = document.getElementById('textTabActiveTemplateBadge');
    if (!container || !fieldsContainer) return;

    const tmpl = state.config.headerTemplate || state.config.headerDesign || 'modern';
    if (!state.config.widgetTextOverrides) state.config.widgetTextOverrides = {};
    if (!state.config.widgetTextOverrides.header) state.config.widgetTextOverrides.header = {};
    const overrides = state.config.widgetTextOverrides.header;

    const tmplNames = {
      'modern': 'Modern Minimalist',
      'magazine-cover': 'Magazine Headline',
      'retro-cyber': 'Cyberpunk HUD',
      'minimalist-stamp': 'Passport Stamp',
      'hud-flight': 'Flight Telemetry HUD',
      'running-bib-header': 'Marathon Race Bib',
      'broadcast-lowerthird': 'Broadcast Lower Third',
      'badge-shield': 'Trophy Crest Shield',
      'pill': 'Dynamic Glass Pill',
      'athletic': 'Athletic Sport HUD',
      'architect-monolith': 'Architectural Calendar',
      'circular-monogram': 'Circular Monogram Seal',
    };
    if (badge) badge.textContent = tmplNames[tmpl] || tmpl;

    fieldsContainer.innerHTML = '';

    const addTmplField = (partKey, label, defaultVal, currentVal) => {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'form-group';
      fieldDiv.style.marginBottom = '8px';

      const isDel = window.isElementDeleted ? window.isElementDeleted('header', partKey) : false;

      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;';

      const lbl = document.createElement('label');
      lbl.style.cssText = 'font-size: 0.72rem; color: var(--text-muted); font-weight: 600; display:flex; align-items:center; gap:4px;';
      lbl.textContent = label;
      labelRow.appendChild(lbl);

      if (isDel) {
        const delTag = document.createElement('span');
        delTag.style.cssText = 'font-size: 0.65rem; color: #ef4444; font-weight: 700;';
        delTag.textContent = '[Deleted]';
        lbl.appendChild(delTag);

        const reinBtn = document.createElement('button');
        reinBtn.type = 'button';
        reinBtn.className = 'btn btn-secondary';
        reinBtn.style.cssText = 'padding: 1px 6px; font-size: 0.65rem; color: #10b981; border-color: rgba(16,185,129,0.3); font-weight: 700; cursor: pointer;';
        reinBtn.textContent = '➕ Reintroduce';
        reinBtn.addEventListener('click', () => {
          if (window.reintroduceElement) window.reintroduceElement('header', partKey);
          renderActiveHeaderTemplateTextControls();
        });
        labelRow.appendChild(reinBtn);
      }

      fieldDiv.appendChild(labelRow);

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
      input.style.fontSize = '0.8rem';
      input.value = currentVal || '';
      input.placeholder = defaultVal;

      input.addEventListener('input', (e) => {
        overrides[partKey] = e.target.value;
        if (window.isElementDeleted && window.isElementDeleted('header', partKey)) {
          window.reintroduceElement('header', partKey);
        }
        triggerRender();
        if (window.syncInspectorWithSelectedElement) {
          const elSelect = document.getElementById('inspectorElementSelect');
          if (elSelect && elSelect.value === 'header') {
            window.syncInspectorWithSelectedElement('header');
          }
        }
      });

      fieldDiv.appendChild(input);
      fieldsContainer.appendChild(fieldDiv);
    };

    let hasFields = false;

    if (tmpl === 'magazine-cover') {
      hasFields = true;
      addTmplField('tagline', 'Headline Tagline ("// RUNNER\'S LOG — ISSUE 2026 //")', "// RUNNER'S LOG — ISSUE 2026 //", overrides.tagline);
      addTmplField('athletePrefix', 'Athlete Prefix Label ("ATHLETE:")', 'ATHLETE:', overrides.athletePrefix);
    } else if (tmpl === 'retro-cyber') {
      hasFields = true;
      addTmplField('sysPrompt', 'System Prompt ("[ SYS.RUN ]")', '[ SYS.RUN ]', overrides.sysPrompt);
      addTmplField('onlineStatus', 'Online Status ("● ONLINE [OK]")', '● ONLINE [OK]', overrides.onlineStatus);
    } else if (tmpl === 'minimalist-stamp') {
      hasFields = true;
      addTmplField('stampBadge', 'Passport Stamp Badge ("★ OFFICIAL ATHLETIC ENTRY ★")', '★ OFFICIAL ATHLETIC ENTRY ★', overrides.stampBadge);
      addTmplField('sealTop', 'Circular Seal Top Text ("RUN")', 'RUN', overrides.sealTop);
      addTmplField('sealBottom', 'Circular Seal Bottom Text ("STAMP")', 'STAMP', overrides.sealBottom);
    } else if (tmpl === 'hud-flight') {
      hasFields = true;
      addTmplField('flightPrompt', 'Telemetry Tag ("▲ RUN_TELEMETRY")', '▲ RUN_TELEMETRY', overrides.flightPrompt);
      addTmplField('flightStatus', 'GPS Lock Tag ("GPS LOCK: 100%")', 'GPS LOCK: 100%', overrides.flightStatus);
    } else if (tmpl === 'running-bib-header') {
      hasFields = true;
      addTmplField('bibPrefix', 'Race Bib Prefix ("BIB #4219 // ATHLETE:")', 'BIB #4219 // ATHLETE:', overrides.bibPrefix);
    } else if (tmpl === 'broadcast-lowerthird') {
      hasFields = true;
      addTmplField('finishBadge', 'Broadcast Badge ("FINISH")', 'FINISH', overrides.finishBadge);
    } else if (tmpl === 'badge-shield') {
      hasFields = true;
      addTmplField('shieldIcon', 'Trophy Icon / Emoji ("🏆")', '🏆', overrides.shieldIcon);
    } else if (tmpl === 'pill') {
      hasFields = true;
      addTmplField('pillIcon', 'Runner Icon / Emoji ("🏃")', '🏃', overrides.pillIcon);
    } else if (tmpl === 'athletic') {
      hasFields = true;
      addTmplField('hudChip', 'HUD Tag ("⚡ RUN HUD")', '⚡ RUN HUD', overrides.hudChip);
    } else if (tmpl === 'architect-monolith') {
      hasFields = true;
      addTmplField('dayNum', 'Calendar Day ("15")', '15', overrides.dayNum);
      addTmplField('monthStr', 'Calendar Month ("OCT")', 'OCT', overrides.monthStr);
    } else if (tmpl === 'circular-monogram') {
      hasFields = true;
      addTmplField('monogram', 'Monogram Initials ("RN")', 'RN', overrides.monogram);
    }

    container.style.display = hasFields ? 'block' : 'none';
  };

  window.renderActiveHeaderTemplateTextControls = renderActiveHeaderTemplateTextControls;

  const setHeaderTemplate = (template) => {
    pushUndoSnapshot();
    state.config.headerTemplate = template;
    state.config.headerDesign = template;

    if (select && select.value !== template) {
      select.value = template;
    }

    if (grid) {
      const cards = grid.querySelectorAll('.choice-card');
      cards.forEach((c) => {
        c.classList.toggle('active', c.dataset.template === template);
      });
    }

    renderActiveHeaderTemplateTextControls();
    triggerRender();
    if (window.syncInspectorWithSelectedElement) {
      const elSelect = document.getElementById('inspectorElementSelect');
      if (elSelect && elSelect.value === 'header') {
        window.syncInspectorWithSelectedElement('header');
      }
    }
  };

  if (grid) {
    const cards = grid.querySelectorAll('.choice-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const tmpl = card.dataset.template;
        if (tmpl) setHeaderTemplate(tmpl);
      });
    });
  }

  if (select) {
    select.addEventListener('change', (e) => {
      setHeaderTemplate(e.target.value);
    });
  }

  // Initial call
  renderActiveHeaderTemplateTextControls();
}

// ==========================================
// 7. INDIVIDUAL ELEMENT INSPECTOR & STYLER
// ==========================================

  // ==========================================
  // MULTI-INSTANCE WIDGETS MANAGEMENT SYSTEM
  // ==========================================
  const WIDGET_CATEGORIES = {
    hero: { name: 'Hero Stat Card (Big Number)', icon: '🏆' },
    metrics: { name: 'Secondary Metrics Grid', icon: '📊' },
    splits: { name: 'Splits Table / Bar Chart', icon: '📶' },
    splitHighlight: { name: 'Split Spotlight Card', icon: '⚡' },
    map: { name: 'GPS Route Map', icon: '🗺️' },
    elevation: { name: 'Elevation Profile', icon: '⛰️' },
    paceGraph: { name: 'Pace Graph', icon: '📈' },
    hrGraph: { name: 'Heart Rate Graph', icon: '💓' },
    hrBadge: { name: 'Avg Heart Rate Badge', icon: '🩺' },
    hrZones: { name: 'Heart Rate Zones Bar', icon: '❤️' },
    brand: { name: 'Social Brand Badge', icon: '⚡' },
    header: { name: 'Header Widget', icon: '🏷️' },
  };

  const WIDGET_TEMPLATE_OPTIONS = {
    header: {
      designKey: 'headerDesign',
      mainSelectId: 'headerDesignSelect',
      defaultVal: 'modern',
      options: [
        { value: 'modern', label: 'Modern Clean (Left title, date, runner)' },
        { value: 'centered-hero', label: 'Centered Hero (Centered title & date badge)' },
        { value: 'centered-crest', label: 'Centered Athletic Crest (Crest & Symmetrical Wings)' },
        { value: 'centered-minimal-clean', label: 'Centered Minimal Clean (Hairline Typographic Divider)' },
        { value: 'circular-monogram', label: 'Circular Runner Monogram (Centered Seal & Stacked Subtext)' },
        { value: 'stacked-editorial', label: 'Stacked Editorial (Headline with date kicker & divider)' },
        { value: 'split-banner', label: 'Split Calendar Banner (Title + calendar day box)' },
        { value: 'retro-cyber', label: 'Retro Cyber HUD (Bracket tech frame & crosses)' },
        { value: 'badge-shield', label: 'Collegiate Shield (Crest & athletic stars)' },
        { value: 'minimal-topbar', label: 'Minimal Top Bar (Sleek floating pill HUD)' },
        { value: 'magazine-cover', label: 'Magazine Headline (Bold cover layout)' },
        { value: 'athletic', label: 'Sport Athletic HUD (Category chip & runner)' },
        { value: 'pill', label: 'Glass Banner Pill (Rounded with avatar)' },
        { value: 'minimalist-stamp', label: 'Passport Stamp (Border seal & date)' },
        { value: 'hud-flight', label: 'Flight HUD (Instrument crosshairs & telemetry)' },
        { value: 'race-ticker', label: 'Neon Racing Ticker (Tape banner with dots)' },
        { value: 'vertical-sidebar-badge', label: 'Vertical Accent Card (Stacked Headline with Sidebar Stripe)' },
        { value: 'running-bib-header', label: 'Marathon Race Bib Header (Bib Number & Stamped Seal)' },
        { value: 'broadcast-lowerthird', label: 'Esports / TV Broadcast Banner (Lower-Third Live Ribbon)' },
        { value: 'architect-monolith', label: 'Architectural Monolith (Big Calendar Block & Condensed Type)' },
        { value: 'speed-chaser-bracket', label: 'Aerodynamic Speed Bracket (Racing Flags & Split Notch)' },
        { value: 'editorial-vogue-minimal', label: 'Vogue Editorial (High-Fashion Serif & Golden Border Accent)' },
      ],
    },
    map: {
      designKey: 'mapDesign',
      mainSelectId: 'mapDesignSelect',
      defaultVal: 'glow',
      options: [
        { value: 'bare-route', label: 'Pure Route (Transparent / No Backdrop)' },
        { value: 'bare-glow', label: 'Glowing Route (Transparent / No Backdrop)' },
        { value: 'bare-speed', label: 'Speed Heatmap Route (No Backdrop)' },
        { value: 'glow', label: 'Neon Glowing Polyline (Card)' },
        { value: 'card', label: 'Technical Card (with corner crosshairs)' },
        { value: 'milestones', label: 'Milestone Pins (1k, 2k, 3k numbered dots)' },
        { value: 'minimal', label: 'Hairline Minimal (Ultra-clean stroke)' },
        { value: 'neon-pulse', label: 'Electric Neon Pulse & Tech Grid' },
        { value: 'framed-polaroid', label: 'Polaroid Photo Frame & Tape' },
        { value: 'gradient-speed', label: 'Pace Speed Dynamic Gradient' },
        { value: 'cyber-wireframe', label: 'Cyber Grid & Compass HUD (Telemetry Grid & Coordinates)' },
        { value: 'radar-screen', label: 'Tactical Radar Screen (Concentric Radar Rings & Beam)' },
        { value: 'vintage-topo-map', label: 'Topographic Elevation Contours (Organic Terrain Rings)' },
        { value: 'isometric-shadow-track', label: 'Isometric 3D Track (Extruded Ground Shadow & Beacon)' },
        { value: 'neon-wire-matrix', label: 'Neon Wireframe Matrix (Vector Grid & Digital Altitude Crossings)' },
      ],
    },
    hero: {
      designKey: 'heroDesign',
      mainSelectId: 'heroDesignSelect',
      defaultVal: 'mega',
      hasMetricSelect: true,
      options: [
        { value: 'mega', label: 'Mega Athletic Display' },
        { value: 'magazine-headline', label: 'Magazine Headline (Bold cover layout)' },
        { value: 'centered-radial-pod', label: 'Centered Radial Stadium Pod (Glowing Halo & Unit Badge)' },
        { value: 'centered-stadium-capsule', label: 'Centered Stadium Capsule (Pill Frame & Centered Stack)' },
        { value: 'centered-monolith', label: 'Centered Monolith (Ultra Bold Typography & Neon Underline)' },
        { value: 'card', label: 'Structured Stats Card' },
        { value: 'boxed-bracket', label: 'HUD Corner Brackets (Glowing Anchors)' },
        { value: 'stacked-duo', label: 'Stacked Duo-Tone (Split Bar)' },
        { value: 'badge-pill', label: 'Athletic Pill Capsule (Icon Ribbon)' },
        { value: 'cyber-glass', label: 'Frosted Cyber Glass (Neon Rim)' },
        { value: 'racing-bib', label: 'Official Marathon Bib (Perforated)' },
        { value: 'minimal-line', label: 'Ultra-Minimal Hairline Stripe' },
        { value: 'split-pill', label: 'Two-Tone Split Pill (with icon)' },
        { value: 'outline', label: 'Clean Outlined (No background card)' },
        { value: 'tape-sticker', label: 'Athletic Tape Sticker (Racing hazard)' },
        { value: 'digital-lcd', label: 'Retro Stopwatch LCD (Segment glow)' },
        { value: 'speedometer', label: 'Speedometer Arc Gauge (Radial curve)' },
        { value: 'vertical-totem', label: 'Vertical Monolith Totem (Stacked Mega Typography)' },
        { value: 'precision-hud-gauge', label: 'Precision Arc Gauge HUD (Dual Calibrated Dials)' },
        { value: 'tactical-crosshair', label: 'Tactical Crosshair Optic (Reticle & Corner Anchors)' },
        { value: 'angled-speed-slash', label: 'Dynamic Speed Slash (Athletic Slanted Gradient)' },
        { value: 'kinetic-bold-slash', label: 'Kinetic Racing Split (45° High-Contrast Slanted Plate)' },
        { value: 'neon-pulse-ring', label: 'Neon Pulse Halo (Radial Orbit Ring & Center Focal Stat)' },
      ],
    },
    metrics: {
      designKey: 'metricsDesign',
      mainSelectId: 'metricsDesignSelect',
      defaultVal: 'grid',
      options: [
        { value: 'grid', label: 'Glass Cards Grid (Multi-Col)' },
        { value: 'centered-pod-triad', label: 'Centered Pod Triad (3 Symmetrical Rounded Pods)' },
        { value: 'centered-pill-clusters', label: 'Centered Pill Clusters (Symmetrical Horizontal Pills)' },
        { value: 'centered-cross-quad', label: 'Centered Crosshair Quad (Symmetrical 2x2 Grid)' },
        { value: 'cards-2col', label: '2-Column Bold Stat Cards (Indicator Bar)' },
        { value: 'vertical-stacked-hud', label: 'Vertical Telemetry Rows (Icon + Value)' },
        { value: 'vertical-minimal-stack', label: 'Vertical Minimalist Stack (Clean Hairline Rows)' },
        { value: 'vertical-pill-stack', label: 'Vertical Capsule Pills (Floating Complications)' },
        { value: 'vertical-timeline-flow', label: 'Vertical Telemetry Timeline (Glowing Axis & Nodes)' },
        { value: 'vertical-data-ladder', label: 'Vertical Telemetry Ladder (Stepped Brackets & Leader Dots)' },
        { value: 'vertical-athletic-cards', label: 'Vertical Athletic Cards (Rank Badges #01)' },
        { value: 'split-scoreboard', label: 'LED Marathon Scoreboard (Segmented)' },
        { value: 'cyber-brackets', label: 'Cyberpunk Corner Brackets' },
        { value: 'hex-badges', label: 'Chamfered Tech Badges (Athletic Hex)' },
        { value: 'horizontal-ticker', label: 'Horizontal Ribbon Ticker (Dot Dividers)' },
        { value: 'strip', label: 'Unified HUD Strip (Divided bar)' },
        { value: 'badges', label: 'Pill Badges (Outlined pills)' },
        { value: 'compact', label: 'Floating Compact (No boxes)' },
        { value: 'circular-gauges', label: 'Radial Circular Gauge Rings' },
        { value: 'editorial-table', label: 'Official Marathon Results Table' },
        { value: 'pill-row', label: 'Horizontal Capsule Pill Row' },
        { value: 'horizontal-pipeline', label: 'Horizontal Telemetry Pipeline (Inline Stream //)' },
        { value: 'horizontal-chips', label: 'Horizontal Stat Chips (Icon + Label + Value inline)' },
        { value: 'horizontal-slash-minimal', label: 'Horizontal Minimalist Slash (Clean Floating)' },
        { value: 'horizontal-linear-cards', label: 'Horizontal Leaderboard Rows (Left/Right)' },
        { value: 'cyber-hex-matrix', label: 'Cyber Hexagon Honeycomb (Chamfered Tech Cells)' },
        { value: 'minimal-wire-strip', label: 'Single-Line Wireframe Strip (Ultra-Thin Hairline Stream)' },
      ],
    },
    splits: {
      designKey: 'splitsDesign',
      mainSelectId: 'splitsDesignSelect',
      defaultVal: 'vertical-bars',
      options: [
        { value: 'vertical-bars', label: 'Vertical Columns (Fastest glowing)' },
        { value: 'centered-split-ladder', label: 'Centered Split Ladder (Vertical Symmetrical Spine)' },
        { value: 'centered-split-pills', label: 'Centered Split Pills (Symmetrical KM Badges)' },
        { value: 'horizontal-bars', label: 'Horizontal Progress Bars' },
        { value: 'pace-table', label: 'Split Table with Customizable Data' },
        { value: 'pace-delta-bars', label: 'Pace Delta Equalizer (+/- Center Axis)' },
        { value: 'card-grid', label: 'Compact Multi-Card Split Tiles' },
        { value: 'speed-dots', label: 'Connected Pace Dots Graph' },
        { value: 'split-bubbles', label: 'Floating Rounded Split Bubbles' },
        { value: 'vertical-split-cards', label: 'Vertical Split Cards (Stacked Interval Tiles with Delta)' },
        { value: 'split-ladder-timeline', label: 'Vertical Route Timeline (Mile/KM Route Wire)' },
        { value: 'compact-dot-matrix', label: 'Compact Pace Dot Matrix (Pace Intensity Grid)' },
        { value: 'neon-speed-wave', label: 'Neon Speed Wave (Continuous Area Curve & Split Nodes)' },
        { value: 'minimal-dot-timeline', label: 'Horizontal Pulse Track (Stepped Beads & Fastest Pill)' },
      ],
    },
    splitHighlight: {
      designKey: 'splitHighlightDesign',
      mainSelectId: 'splitHighlightDesignSelect',
      defaultVal: 'spotlight',
      hasTargetSelect: true,
      options: [
        { value: 'spotlight', label: 'Spotlight Card (Big pace & stats)' },
        { value: 'centered-trophy-card', label: 'Centered Trophy Card (Golden Halo & Fast Split Badge)' },
        { value: 'bib', label: 'Race Bib Badge (Interval bib style)' },
        { value: 'medal-podium', label: 'Gold Medal Trophy Podium' },
        { value: 'polaroid-clip', label: 'Paper Note with Paperclip' },
        { value: 'trophy-cup', label: 'Trophy Podium Banner (Gold Ribbon & Fast Split)' },
        { value: 'split-terminal', label: 'Digital Split Terminal (Monospace Code Prompt)' },
        { value: 'speed-record-banner', label: 'Golden Laurel Record Plaque (Embossed Wreath & Gold Star)' },
        { value: 'minimal-focus-tag', label: 'Minimalist Floating Focus Tag (Ultra-Clean Monogram Badge)' },
      ],
    },
    elevation: {
      designKey: 'elevationDesign',
      mainSelectId: 'elevationDesignSelect',
      defaultVal: 'area',
      options: [
        { value: 'area', label: 'Smooth Gradient Area' },
        { value: 'centered-mountain-peak', label: 'Centered Mountain Peak (Symmetrical Peak & Gain Banner)' },
        { value: 'topo-contours', label: 'Topographic Contour Fill' },
        { value: 'gradient-altitude', label: 'High-Contrast Altitude Gradient' },
        { value: 'line', label: 'Minimalist Line Graph' },
        { value: 'stepped-gradient', label: 'Stepped Terrain Canyon' },
        { value: 'mountain-peaks', label: 'Mountain Peaks & Summit Flag' },
        { value: 'stepped-bars', label: 'Stepped Altitude Columns (Quantized Terrain Bars)' },
        { value: 'dual-fill', label: 'Dual-Zone Climb & Descent Gradient (Ascent vs Descent)' },
        { value: 'stepped-elevation-terrace', label: 'Stepped Topo Terrace (Stratified Altitude Slabs)' },
        { value: 'cyber-altitude-grid', label: 'Cyber Altitude Grid (Matrix Wireframe & Summit Beacon)' },
      ],
    },
    paceGraph: {
      designKey: 'paceGraphDesign',
      mainSelectId: 'paceGraphDesignSelect',
      defaultVal: 'area',
      options: [
        { value: 'area', label: 'Smooth Translucent Area' },
        { value: 'centered-speed-pulse', label: 'Centered Speed Pulse (Oscilloscope Telemetry Wave)' },
        { value: 'bar-histogram', label: 'Pace Bar Histogram' },
        { value: 'cyber-hud-pace', label: 'Cyberpunk HUD with Target Pace Line' },
        { value: 'line', label: 'Crisp High-Precision Line' },
        { value: 'gradient-zone', label: 'Multi-Zone Color Fill' },
        { value: 'stepped-splits', label: 'Stepped Splits with Avg Pace Dash' },
        { value: 'candlestick-pace-bars', label: 'Pace Range Candlesticks (High/Low Interval Candles)' },
        { value: 'neon-speed-ribbon', label: 'Neon Speed Ribbon (Dual-Stroke Glowing Stream)' },
      ],
    },
    hrGraph: {
      designKey: 'hrGraphDesign',
      mainSelectId: 'hrGraphDesignSelect',
      defaultVal: 'filled-area',
      options: [
        { value: 'filled-area', label: 'Red Gradient Area' },
        { value: 'centered-cardiac-halo', label: 'Centered Cardiac Halo (Glowing ECG Waveform)' },
        { value: 'zone-gradient-strip', label: 'Z1-Z5 Multi-Zone Continuous Gradient' },
        { value: 'cardiac-monitor', label: 'Cardiac Monitor Oscilloscope CRT' },
        { value: 'ecg-wave', label: 'Colored ECG Wave (Zones)' },
        { value: 'zone-bars', label: '5-Zone Vertical Frequency Bars' },
        { value: 'pulse-glow', label: 'Glowing Pulse Wave with Alert' },
        { value: 'ecg-cyber-pulse', label: 'ECG Bio-Telemetry Monitor (High-Frequency Pulse Grid)' },
        { value: 'cardiac-zone-flame', label: 'Cardiac Thermal Heatmap (BPM Combustion Gradient)' },
      ],
    },
    hrBadge: {
      designKey: 'hrBadgeDesign',
      mainSelectId: 'hrBadgeDesignSelect',
      defaultVal: 'pill',
      options: [
        { value: 'pill', label: 'Pulsing Heart Pill' },
        { value: 'centered-heart-crest', label: 'Centered Heart Crest (Glowing Heart & Centered BPM)' },
        { value: 'zone-badge', label: 'Intensity Zone Blocks Badge' },
        { value: 'lcd-pulse', label: 'Cardiac Monitor Oscilloscope LCD' },
        { value: 'card', label: 'Heart Stats Card' },
        { value: 'heart-gauge', label: 'Circular Radial Heart Gauge' },
        { value: 'compact-tag', label: 'Smartwatch Complication Tag' },
        { value: 'vertical-hr-thermometer', label: 'Vertical Zone Thermometer (5-Zone Meter Column)' },
        { value: 'tactical-ecg-card', label: 'ECG Telemetry Strip (Oscilloscope CRT Strip)' },
        { value: 'minimal-cardiac-pill', label: 'Ultra-Minimal Cardiac Pill (Floating Pulse & BPM)' },
        { value: 'cyber-hud-cardiac-gauge', label: 'Cyber Tactical Ring Gauge (Dual Segmented Arcs & Target Zone)' },
      ],
    },
    brand: {
      designKey: 'brandStyle',
      mainSelectId: null,
      defaultVal: 'runcut',
      options: [
        { value: 'runcut', label: '⚡ RUNOVERLAY (Default Brand)' },
        { value: 'strava', label: 'Strava Runner Watermark' },
        { value: 'nike', label: 'Nike Just Do It • Run Club' },
        { value: 'custom', label: 'Custom Watermark Text' },
        { value: 'centered-cinematic-stamp', label: 'Centered Cinematic Stamp (◆ BRAND ◆)' },
      ],
    },
  };
  window.WIDGET_TEMPLATE_OPTIONS = WIDGET_TEMPLATE_OPTIONS;

  window.renderExtraWidgetsUI = () => {
    const container = document.getElementById('extraWidgetsListContainer');
    if (!container) return;
    container.innerHTML = '';

    const list = state.config.extraWidgetInstances || [];
    if (list.length === 0) {
      container.innerHTML = '<div style="font-size: 0.74rem; color: var(--text-muted); font-style: italic; padding: 10px; text-align: center; border: 1px dashed rgba(255,255,255,0.12); border-radius: 6px;">No additional widget instances added yet. Select a category and click "+ Add Widget" above!</div>';
      return;
    }

    list.forEach((inst) => {
      const catInfo = WIDGET_CATEGORIES[inst.category] || { name: inst.category, icon: '📦' };
      const itemEl = document.createElement('div');
      itemEl.className = 'extra-widget-item';
      itemEl.style.cssText = 'display: flex; flex-direction: column; background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; gap: 8px;';

      const isDel = inst.enabled === false;
      const tmplInfo = WIDGET_TEMPLATE_OPTIONS[inst.category];
      const curTmpl = (inst.options && tmplInfo && inst.options[tmplInfo.designKey]) || (tmplInfo && state.config[tmplInfo.designKey]) || (tmplInfo ? tmplInfo.defaultVal : '');

      let templateRowHtml = '';
      if (tmplInfo && tmplInfo.options && tmplInfo.options.length > 0) {
        const optionsListHtml = tmplInfo.options.map((opt) => `<option value="${opt.value}" ${opt.value === curTmpl ? 'selected' : ''}>${opt.label}</option>`).join('');

        let extraFieldHtml = '';
        if (inst.category === 'hero') {
          const curMetric = (inst.options && inst.options.heroMetric) || 'distance';
          extraFieldHtml = `
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 0.68rem; color: var(--accent-volt); font-weight: 700; white-space: nowrap;">📊 Metric:</span>
              <select class="form-select inst-metric-select" style="font-size: 0.72rem; padding: 2px 4px; border-radius: 4px; border-color: rgba(204,255,0,0.3); background: rgba(0,0,0,0.5); color: #fff;">
                <option value="distance" ${curMetric === 'distance' ? 'selected' : ''}>Distance</option>
                <option value="pace" ${curMetric === 'pace' ? 'selected' : ''}>Pace</option>
                <option value="time" ${curMetric === 'time' ? 'selected' : ''}>Time</option>
                <option value="hr" ${curMetric === 'hr' ? 'selected' : ''}>Heart Rate</option>
              </select>
            </div>
          `;
        } else if (inst.category === 'splitHighlight') {
          const curTarget = (inst.options && inst.options.highlightSplitTarget) || 'fastest';
          extraFieldHtml = `
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 0.68rem; color: var(--accent-volt); font-weight: 700; white-space: nowrap;">⚡ Target:</span>
              <select class="form-select inst-target-select" style="font-size: 0.72rem; padding: 2px 4px; border-radius: 4px; border-color: rgba(204,255,0,0.3); background: rgba(0,0,0,0.5); color: #fff;">
                <option value="fastest" ${curTarget === 'fastest' ? 'selected' : ''}>Fastest</option>
                <option value="slowest" ${curTarget === 'slowest' ? 'selected' : ''}>Slowest</option>
                <option value="final" ${curTarget === 'final' ? 'selected' : ''}>Final</option>
              </select>
            </div>
          `;
        }

        templateRowHtml = `
          <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.08); flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 140px;">
              <span style="font-size: 0.68rem; color: #00f0ff; font-weight: 700; white-space: nowrap;">🎨 Style:</span>
              <select class="form-select inst-template-select" style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; flex: 1; min-width: 120px; border-color: rgba(0,240,255,0.3); background: rgba(0,0,0,0.5); color: #fff;">
                ${optionsListHtml}
              </select>
            </div>
            ${extraFieldHtml}
          </div>
        `;
      }

      itemEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
            <label class="switch" style="transform: scale(0.85); margin-bottom: 0;">
              <input type="checkbox" ${inst.enabled !== false ? 'checked' : ''} data-inst-id="${inst.id}">
              <span class="slider"></span>
            </label>
            <div style="min-width: 0; flex: 1;">
              <div class="inst-title-label" style="font-size: 0.8rem; font-weight: 700; color: ${isDel ? '#f87171' : '#fff'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${catInfo.icon} ${inst.name || (catInfo.name + ' (' + inst.id + ')')} ${isDel ? '(Hidden)' : ''}
              </div>
              <div style="font-size: 0.68rem; color: var(--text-muted);">ID: ${inst.id}</div>
            </div>
          </div>
          <div style="display: flex; gap: 4px; flex-shrink: 0;">
            <button type="button" class="btn btn-secondary inspect-btn" style="padding: 2px 8px; font-size: 0.7rem; color: var(--accent-volt);" title="Select and style in Element Inspector">🎯 Inspect</button>
            <button type="button" class="btn btn-secondary dup-btn" style="padding: 2px 6px; font-size: 0.7rem;" title="Duplicate this instance">📋</button>
            <button type="button" class="btn btn-secondary del-btn" style="padding: 2px 6px; font-size: 0.7rem; color: #f87171;" title="Remove this instance">🗑️</button>
          </div>
        </div>
        ${templateRowHtml}
      `;

      itemEl.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        window.toggleWidgetInstance(inst.id, e.target.checked);
      });
      itemEl.querySelector('.inspect-btn').addEventListener('click', () => {
        window.inspectWidgetInstance(inst.id);
      });
      itemEl.querySelector('.dup-btn').addEventListener('click', () => {
        window.duplicateWidgetInstance(inst.id);
      });
      itemEl.querySelector('.del-btn').addEventListener('click', () => {
        window.removeWidgetInstance(inst.id);
      });

      const tmplSel = itemEl.querySelector('.inst-template-select');
      if (tmplSel && tmplInfo) {
        tmplSel.addEventListener('change', (e) => {
          pushUndoSnapshot();
          if (!inst.options) inst.options = {};
          inst.options[tmplInfo.designKey] = e.target.value;
          if (inst.category === 'header') {
            inst.options.headerTemplate = e.target.value;
            inst.options.headerDesign = e.target.value;
          }
          triggerRender();
          if (state.selectedWidget === inst.id && window.syncInspectorWithSelectedElement) {
            window.syncInspectorWithSelectedElement(inst.id);
          }
          showToast(`Changed template of ${inst.name || inst.id} to ${e.target.value}`);
        });
      }

      const metricSel = itemEl.querySelector('.inst-metric-select');
      if (metricSel) {
        metricSel.addEventListener('change', (e) => {
          pushUndoSnapshot();
          if (!inst.options) inst.options = {};
          inst.options.heroMetric = e.target.value;
          const idx = inst.id.split('_')[1] || '2';
          inst.name = `${catInfo.name} #${idx} (${e.target.value.toUpperCase()})`;
          const titleLbl = itemEl.querySelector('.inst-title-label');
          if (titleLbl) titleLbl.textContent = `${catInfo.icon} ${inst.name} ${isDel ? '(Hidden)' : ''}`;
          window.refreshInspectorElementDropdown();
          triggerRender();
          if (state.selectedWidget === inst.id && window.syncInspectorWithSelectedElement) {
            window.syncInspectorWithSelectedElement(inst.id);
          }
          showToast(`Changed metric of ${inst.id} to ${e.target.value.toUpperCase()}`);
        });
      }

      const targetSel = itemEl.querySelector('.inst-target-select');
      if (targetSel) {
        targetSel.addEventListener('change', (e) => {
          pushUndoSnapshot();
          if (!inst.options) inst.options = {};
          inst.options.highlightSplitTarget = e.target.value;
          triggerRender();
          if (state.selectedWidget === inst.id && window.syncInspectorWithSelectedElement) {
            window.syncInspectorWithSelectedElement(inst.id);
          }
          showToast(`Changed target of ${inst.id} to ${e.target.value}`);
        });
      }

      container.appendChild(itemEl);
    });
  };

  window.refreshInspectorElementDropdown = () => {
    const elSelect = document.getElementById('inspectorElementSelect');
    if (!elSelect) return;

    let optgroup = elSelect.querySelector('#inspectorExtraWidgetsOptgroup');
    if (!optgroup) {
      optgroup = document.createElement('optgroup');
      optgroup.id = 'inspectorExtraWidgetsOptgroup';
      optgroup.label = 'Custom Added Widgets';
      elSelect.appendChild(optgroup);
    }
    optgroup.innerHTML = '';

    const list = state.config.extraWidgetInstances || [];
    list.forEach((inst) => {
      const catInfo = WIDGET_CATEGORIES[inst.category] || { name: inst.category, icon: '📦' };
      const opt = document.createElement('option');
      opt.value = inst.id;
      const isDel = inst.enabled === false;
      opt.textContent = `${catInfo.icon} ${inst.name || inst.id}${isDel ? ' (Deleted)' : ''}`;
      optgroup.appendChild(opt);
    });
  };

  window.addNewWidgetInstance = (category, customName = null, options = {}) => {
    pushUndoSnapshot();
    if (!state.config.extraWidgetInstances) state.config.extraWidgetInstances = [];

    const existingCount = state.config.extraWidgetInstances.filter((w) => w.category === category).length;
    const newIdx = existingCount + 2;
    const newId = `${category}_${newIdx}`;
    const catInfo = WIDGET_CATEGORIES[category] || { name: category, icon: '📦' };

    let defaultMetric = 'distance';
    if (category === 'hero') {
      defaultMetric = newIdx === 2 ? 'pace' : newIdx === 3 ? 'time' : 'hr';
    }

    const instName = customName || `${catInfo.name} #${newIdx}${category === 'hero' ? ' (' + defaultMetric.toUpperCase() + ')' : ''}`;

    const defOptions = { heroMetric: defaultMetric };
    const tmplInfo = WIDGET_TEMPLATE_OPTIONS[category];
    if (tmplInfo) {
      defOptions[tmplInfo.designKey] = state.config[tmplInfo.designKey] || tmplInfo.defaultVal;
      if (category === 'header') {
        defOptions.headerTemplate = defOptions[tmplInfo.designKey];
        defOptions.headerDesign = defOptions[tmplInfo.designKey];
      }
    }

    const newInstance = {
      id: newId,
      category: category,
      name: instName,
      enabled: true,
      options: {
        ...defOptions,
        ...options,
      },
    };

    // Calculate a good offset position
    const baseBounds = renderer.widgetBounds ? renderer.widgetBounds[category] : null;
    if (!state.config.widgetPositions) state.config.widgetPositions = {};
    if (baseBounds) {
      state.config.widgetPositions[newId] = {
        x: Math.max(20, baseBounds.x + 30),
        y: Math.max(20, baseBounds.y + 40),
        width: baseBounds.width,
        height: baseBounds.height,
        isCustom: true,
      };
    }

    state.config.extraWidgetInstances.push(newInstance);
    window.refreshInspectorElementDropdown();
    window.renderExtraWidgetsUI();
    selectWidget(newId);
    triggerRender();
    showToast(`Added new ${catInfo.name} (${newId})`);
    return newInstance;
  };

  window.duplicateWidgetInstance = (sourceKey) => {
    if (!sourceKey) return;
    pushUndoSnapshot();
    const category = getWidgetCategory(sourceKey);
    const catInfo = WIDGET_CATEGORIES[category] || { name: category, icon: '📦' };

    if (!state.config.extraWidgetInstances) state.config.extraWidgetInstances = [];
    const count = state.config.extraWidgetInstances.filter((w) => w.category === category).length;
    const newId = `${category}_${count + 2}`;

    // Clone offsets, styles, and text overrides from sourceKey
    if (!state.config.widgetPositions) state.config.widgetPositions = {};
    const srcPos = state.config.widgetPositions[sourceKey] || (renderer.widgetBounds ? renderer.widgetBounds[sourceKey] : null);
    if (srcPos) {
      state.config.widgetPositions[newId] = {
        x: srcPos.x + 25,
        y: srcPos.y + 25,
        width: srcPos.width,
        height: srcPos.height,
        isCustom: true,
      };
    }

    if (state.config.elementStyles?.[sourceKey]) {
      if (!state.config.elementStyles) state.config.elementStyles = {};
      state.config.elementStyles[newId] = JSON.parse(JSON.stringify(state.config.elementStyles[sourceKey]));
    }

    if (state.config.widgetBgStyles?.[sourceKey]) {
      if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
      state.config.widgetBgStyles[newId] = JSON.parse(JSON.stringify(state.config.widgetBgStyles[sourceKey]));
    }

    if (state.config.widgetElementOffsets?.[sourceKey]) {
      if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
      state.config.widgetElementOffsets[newId] = JSON.parse(JSON.stringify(state.config.widgetElementOffsets[sourceKey]));
    }

    if (state.config.widgetTextOverrides?.[sourceKey]) {
      if (!state.config.widgetTextOverrides) state.config.widgetTextOverrides = {};
      state.config.widgetTextOverrides[newId] = JSON.parse(JSON.stringify(state.config.widgetTextOverrides[sourceKey]));
    }

    const srcInst = state.config.extraWidgetInstances?.find((w) => w.id === sourceKey);
    let clonedOptions = {};
    if (srcInst && srcInst.options) {
      clonedOptions = JSON.parse(JSON.stringify(srcInst.options));
    } else {
      const tmplInfo = WIDGET_TEMPLATE_OPTIONS[category];
      if (tmplInfo && state.config[tmplInfo.designKey]) {
        clonedOptions[tmplInfo.designKey] = state.config[tmplInfo.designKey];
        if (category === 'header') {
          clonedOptions.headerTemplate = state.config.headerTemplate || state.config.headerDesign;
        }
      }
      if (category === 'hero' && state.config.heroMetric) {
        clonedOptions.heroMetric = state.config.heroMetric;
      }
    }

    const newInst = {
      id: newId,
      category: category,
      name: `${catInfo.name} #${count + 2} (Copy)`,
      enabled: true,
      options: clonedOptions,
    };

    state.config.extraWidgetInstances.push(newInst);
    window.refreshInspectorElementDropdown();
    window.renderExtraWidgetsUI();
    selectWidget(newId);
    triggerRender();
    showToast(`Duplicated widget as ${newId}`);
    return newInst;
  };

  window.removeWidgetInstance = (id) => {
    if (!id || !state.config.extraWidgetInstances) return;
    pushUndoSnapshot();
    const idx = state.config.extraWidgetInstances.findIndex((w) => w.id === id);
    if (idx !== -1) {
      const removed = state.config.extraWidgetInstances.splice(idx, 1)[0];
      if (renderer.widgetBounds) delete renderer.widgetBounds[id];
      if (state.selectedWidget === id) selectWidget(null);
      window.refreshInspectorElementDropdown();
      window.renderExtraWidgetsUI();
      triggerRender();
      showToast(`Removed widget instance ${removed.name || id}`);
    }
  };

  window.toggleWidgetInstance = (id, enabled) => {
    if (!id || !state.config.extraWidgetInstances) return;
    pushUndoSnapshot();
    const inst = state.config.extraWidgetInstances.find((w) => w.id === id);
    if (inst) {
      inst.enabled = enabled;
      window.refreshInspectorElementDropdown();
      window.renderExtraWidgetsUI();
      triggerRender();
      showToast(`${enabled ? 'Enabled' : 'Disabled'} ${inst.name || id}`);
    }
  };

  window.inspectWidgetInstance = (id) => {
    selectWidget(id);
    const styleTabBtn = document.querySelector('button[data-tab="styleTab"]');
    if (styleTabBtn) styleTabBtn.click();
    const elSelect = document.getElementById('inspectorElementSelect');
    if (elSelect) {
      elSelect.value = id;
      if (window.syncInspectorWithSelectedElement) {
        window.syncInspectorWithSelectedElement(id, 'widget');
      }
    }
  };

function setupElementInspectorControls() {
  const elSelect = document.getElementById('inspectorElementSelect');
  const subPartSelect = document.getElementById('inspectorSubPartSelect');
  const subPartBadge = document.getElementById('inspectorSubPartBadge');
  const subPartGroup = document.getElementById('inspectorSubPartGroup');
  const bgControlsContainer = document.getElementById('inspectorBgControlsContainer');
  const subElemControlsContainer = document.getElementById('inspectorSubElementControlsContainer');
  const subElemTitle = document.getElementById('inspectorSubElementTitle');

  // Background border controls
  const bgWidthSlider = document.getElementById('inspectorBgWidthSlider');
  const bgWidthInput = document.getElementById('inspectorBgWidthInput');
  const bgHeightSlider = document.getElementById('inspectorBgHeightSlider');
  const bgHeightInput = document.getElementById('inspectorBgHeightInput');
  const bgOffsetXSlider = document.getElementById('inspectorBgOffsetXSlider');
  const bgOffsetXInput = document.getElementById('inspectorBgOffsetXInput');
  const bgOffsetYSlider = document.getElementById('inspectorBgOffsetYSlider');
  const bgOffsetYInput = document.getElementById('inspectorBgOffsetYInput');
  const bgRadiusSlider = document.getElementById('inspectorBgRadiusSlider');
  const bgRadiusInput = document.getElementById('inspectorBgRadiusInput');
  const bgBorderWidthSlider = document.getElementById('inspectorBgBorderWidthSlider');
  const bgBorderWidthInput = document.getElementById('inspectorBgBorderWidthInput');
  const bgBorderColorInput = document.getElementById('inspectorBgBorderColorInput');
  const bgBorderColorHex = document.getElementById('inspectorBgBorderColorHex');
  const bgFillColorInput = document.getElementById('inspectorBgFillColorInput');
  const bgFillColorHex = document.getElementById('inspectorBgFillColorHex');
  const resetBgBtn = document.getElementById('inspectorResetBgBtn');
  const duplicateWidgetBtn = document.getElementById('inspectorDuplicateWidgetBtn');
  const deleteInstanceBtn = document.getElementById('inspectorDeleteInstanceBtn');

  // Sub-element controls
  const subElemXSlider = document.getElementById('inspectorSubElemXSlider');
  const subElemXInput = document.getElementById('inspectorSubElemXInput');
  const subElemYSlider = document.getElementById('inspectorSubElemYSlider');
  const subElemYInput = document.getElementById('inspectorSubElemYInput');
  const subElemZSlider = document.getElementById('inspectorSubElemZSlider');
  const subElemZInput = document.getElementById('inspectorSubElemZInput');
  const subElemFontFamily = document.getElementById('inspectorSubElemFontFamily');
  const subElemSizeSlider = document.getElementById('inspectorSubElemSizeSlider');
  const subElemSizeInput = document.getElementById('inspectorSubElemSizeInput');
  const subElemSizeVal = document.getElementById('inspectorSubElemSizeVal');
  const subElemTextInput = document.getElementById('inspectorSubElemTextInput');
  const subElemColorInput = document.getElementById('inspectorSubElemColorInput');
  const subElemColorHex = document.getElementById('inspectorSubElemColorHex');
  const subElemColorResetBtn = document.getElementById('inspectorSubElemColorResetBtn');
  const resetSubElemBtn = document.getElementById('inspectorResetSubElemBtn');

  const fontSelect = document.getElementById('inspectorFontFamily');
  const sizeSlider = document.getElementById('inspectorFontSizeSlider');
  const sizeInput = document.getElementById('inspectorFontSizeInput');
  const sizeVal = document.getElementById('inspectorFontSizeVal');
  const colorInput = document.getElementById('inspectorColorInput');
  const colorHex = document.getElementById('inspectorColorHex');
  const accentInput = document.getElementById('inspectorAccentInput');
  const accentHex = document.getElementById('inspectorAccentHex');
  const alignGrid = document.getElementById('inspectorAlignGrid');
  const cardStyleSelect = document.getElementById('inspectorCardStyle');
  const opacitySlider = document.getElementById('inspectorOpacitySlider');
  const opacityVal = document.getElementById('inspectorOpacityVal');
  const resetBtn = document.getElementById('inspectorResetBtn');
  const resetAllBtn = document.getElementById('inspectorResetAllBtn');

  // Reintroduce buttons & notice elements
  const reintroduceBtn = document.getElementById('inspectorReintroduceBtn');
  const reintroduceBgBtn = document.getElementById('inspectorReintroduceBgBtn');
  const reintroduceSubElemBtn = document.getElementById('inspectorReintroduceSubElemBtn');
  const subElemBannerReintroduceBtn = document.getElementById('inspectorSubElemBannerReintroduceBtn');
  const widgetReintroduceBtn = document.getElementById('inspectorWidgetReintroduceBtn');
  const widgetDeletedNotice = document.getElementById('inspectorWidgetDeletedNotice');
  const widgetDeletedNoticeText = document.getElementById('inspectorWidgetDeletedNoticeText');
  const subElemDeletedNotice = document.getElementById('inspectorSubElemDeletedNotice');
  const deleteElementBtn = document.getElementById('inspectorDeleteElementBtn');
  const deleteBgBtn = document.getElementById('inspectorDeleteBgBtn');
  const deleteSubElemBtn = document.getElementById('inspectorDeleteSubElemBtn');

  if (!elSelect) return;

  const SUB_PARTS_MAP = {
    header: [
      { key: 'title', label: 'Main Title' },
      { key: 'subtitle', label: 'Subtitle / Date' },
      { key: 'runner', label: 'Runner Handle' },
      { key: 'location', label: 'Location Name' },
      { key: 'weather', label: 'Weather Information' },
      { key: 'tagline', label: 'Magazine Cover Tagline ("// RUNNER\'S LOG — ISSUE 2026 //")', template: 'magazine-cover' },
      { key: 'athletePrefix', label: 'Athlete Prefix Label ("ATHLETE:")', template: 'magazine-cover' },
      { key: 'sysPrompt', label: 'Cyber HUD System Prompt ("[ SYS.RUN ]")', template: 'retro-cyber' },
      { key: 'onlineStatus', label: 'Cyber Online Status ("● ONLINE [OK]")', template: 'retro-cyber' },
      { key: 'stampBadge', label: 'Passport Stamp Top Badge ("★ OFFICIAL ATHLETIC ENTRY ★")', template: 'minimalist-stamp' },
      { key: 'sealTop', label: 'Circular Seal Top Text ("RUN")', template: 'minimalist-stamp' },
      { key: 'sealBottom', label: 'Circular Seal Bottom Text ("STAMP")', template: 'minimalist-stamp' },
      { key: 'flightPrompt', label: 'Flight HUD Telemetry Tag ("▲ RUN_TELEMETRY")', template: 'hud-flight' },
      { key: 'flightStatus', label: 'Flight Status Tag ("GPS LOCK: 100%")', template: 'hud-flight' },
      { key: 'bibPrefix', label: 'Race Bib Prefix ("BIB #4219 // ATHLETE:")', template: 'running-bib-header' },
      { key: 'finishBadge', label: 'Broadcast Banner Badge ("FINISH")', template: 'broadcast-lowerthird' },
      { key: 'shieldIcon', label: 'Shield Trophy Icon ("🏆")', template: 'badge-shield' },
      { key: 'pillIcon', label: 'Glass Pill Runner Icon ("🏃")', template: 'pill' },
      { key: 'hudChip', label: 'Sport Athletic HUD Chip ("⚡ RUN HUD")', template: 'athletic' },
      { key: 'dayNum', label: 'Calendar Day ("15")', template: 'architect-monolith' },
      { key: 'monthStr', label: 'Calendar Month ("OCT")', template: 'architect-monolith' },
      { key: 'monogram', label: 'Monogram Initials ("RN")', template: 'circular-monogram' },
    ],
    hero: [
      { key: 'label', label: 'Metric Category Label' },
      { key: 'val', label: 'Primary Value Readout' },
      { key: 'unit', label: 'Metric Unit' },
      { key: 'sec', label: 'Secondary / Sub-Metric' },
      { key: 'statusBadge', label: 'Bracket Status Badge ("GPS ACTIVE // METRIC")', template: 'boxed-bracket' },
      { key: 'runnerStatBadge', label: 'Split-Tone Sub-Bar Banner ("⚡ RUN TRACKER OFFICIAL STAT")', template: 'stacked-duo' },
      { key: 'liveDataBadge', label: 'Cyber HUD Live Badge ("● LIVE_DATA")', template: 'cyber-glass' },
      { key: 'bibBanner', label: 'Marathon Bib Banner ("★ OFFICIAL RACE SPLIT ★")', template: 'racing-bib' },
      { key: 'lcdHeader', label: 'Stopwatch LCD Header ("[ DIGITAL TIMER ]")', template: 'digital-lcd' },
      { key: 'tacticalSys', label: 'Tactical Optic System Tag ("+ SYS // OPTIC")', template: 'tactical-crosshair' },
      { key: 'tacticalStatus', label: 'Tactical Target Status ("STATUS: LOCKED")', template: 'tactical-crosshair' },
    ],
    splits: [
      { key: 'title', label: 'Split Header Title' },
      { key: 'badge', label: 'Fastest Split Highlight Pill' },
      { key: 'lapLabels', label: 'All Lap Labels (L1, L2, KM 1...)' },
      { key: 'pace', label: 'All Split Paces (Pace Readouts)' },
      { key: 'avgHr', label: 'All Split Heart Rates (♥ / HR Readouts)' },
      { key: 'time', label: 'All Split Times (Duration Readouts)' },
      { key: 'delta', label: 'All Split Deltas (+/- Pace Readouts)' },
      { key: 'elevation', label: 'All Split Elevations (Gain/Loss Readouts)' },
      { key: 'cadence', label: 'All Split Cadences (SPM Readouts)' },
      { key: 'maxHr', label: 'All Split Max HR Readouts' },
      { key: 'minHr', label: 'All Split Min HR Readouts' },
      { key: 'bars', label: 'All Split Bars / Columns' },
      { key: 'headerSplit', label: 'Column Header: Split' },
      { key: 'headerTime', label: 'Column Header: Time' },
      { key: 'headerPace', label: 'Column Header: Pace' },
      { key: 'headerDelta', label: 'Column Header: Delta' },
      { key: 'headerHr', label: 'Column Header: HR' },
      { key: 'headerElev', label: 'Column Header: Elevation' },
      { key: 'table', label: 'Splits Table / Columns Container' },
    ],
    splitHighlight: [
      { key: 'badge', label: 'Top Badge / Trophy' },
      { key: 'title', label: 'Spotlight Card Title' },
      { key: 'label', label: 'Split KM Label' },
      { key: 'val', label: 'Pace Value' },
      { key: 'time', label: 'Split Duration' },
      { key: 'hr', label: 'Split Heart Rate' },
      { key: 'note', label: 'Subtitle / Comparison Note' },
      { key: 'trophyBanner', label: 'Trophy Card Banner ("CHAMPION INTERVAL")', template: 'trophy-cup' },
      { key: 'termPrompt', label: 'Terminal Query Prompt ("> EXEC: FASTEST_INTERVAL_QUERY")', template: 'split-terminal' },
    ],
    metrics: [
      { key: 'label', label: 'All Metric Category Labels' },
      { key: 'val', label: 'All Metric Stat Values' },
      { key: 'time', label: 'Time Block (Entire Card)' },
      { key: 'timeLabel', label: 'Time Text Label ("TIME")' },
      { key: 'timeVal', label: 'Time Stat Value' },
      { key: 'pace', label: 'Pace Block (Entire Card)' },
      { key: 'paceLabel', label: 'Pace Text Label ("PACE")' },
      { key: 'paceVal', label: 'Pace Stat Value' },
      { key: 'hr', label: 'Heart Rate Block (Entire Card)' },
      { key: 'hrLabel', label: 'Heart Rate Label ("HEART RATE")' },
      { key: 'hrVal', label: 'Heart Rate Stat Value' },
      { key: 'elevation', label: 'Elevation Gain Block (Entire Card)' },
      { key: 'elevationLabel', label: 'Elevation Gain Label ("ELEV GAIN")' },
      { key: 'elevationVal', label: 'Elevation Gain Value' },
      { key: 'cadence', label: 'Cadence Block (Entire Card)' },
      { key: 'cadenceLabel', label: 'Cadence Text Label ("CADENCE")' },
      { key: 'cadenceVal', label: 'Cadence Stat Value' },
      { key: 'calories', label: 'Calories Block (Entire Card)' },
      { key: 'caloriesLabel', label: 'Calories Text Label ("CALORIES")' },
      { key: 'caloriesVal', label: 'Calories Stat Value' },
      { key: 'bestPace', label: 'Best Pace Block (Entire Card)' },
      { key: 'bestPaceLabel', label: 'Best Pace Label ("BEST PACE")' },
      { key: 'bestPaceVal', label: 'Best Pace Stat Value' },
      { key: 'distance', label: 'Distance Block (Entire Card)' },
      { key: 'distanceLabel', label: 'Distance Text Label ("DISTANCE")' },
      { key: 'distanceVal', label: 'Distance Stat Value' },
    ],
    elevation: [
      { key: 'title', label: 'Elevation Profile Title' },
      { key: 'stat', label: 'Elevation Gain & Peak Stats' },
      { key: 'summitBadge', label: 'Mountain Summit Badge ("⛰️ SUMMIT")', template: 'centered-mountain-peak' },
      { key: 'min', label: 'Min Elevation Label' },
      { key: 'max', label: 'Max Elevation Label' },
      { key: 'gain', label: 'Elevation Gain Label' },
      { key: 'chart', label: 'Elevation Graph Curve/Area' },
    ],
    paceGraph: [
      { key: 'title', label: 'Pace Graph Title' },
      { key: 'stat', label: 'Pace Min/Max/Avg Stats' },
      { key: 'speedPulseTag', label: 'Speed Pulse Telemetry Tag ("⚡ SPEED")', template: 'centered-speed-pulse' },
      { key: 'min', label: 'Min Pace Label' },
      { key: 'avg', label: 'Avg Pace Label' },
      { key: 'max', label: 'Max Pace Label' },
      { key: 'chart', label: 'Pace Graph Curve/Area' },
    ],
    hrGraph: [
      { key: 'title', label: 'Heart Rate Graph Title' },
      { key: 'stat', label: 'Heart Rate Summary Stats' },
      { key: 'cardiacHaloTag', label: 'Cardiac Halo Tag ("❤️ CARDIAC")', template: 'centered-cardiac-halo' },
      { key: 'min', label: 'Min HR Label' },
      { key: 'avg', label: 'Avg HR Label' },
      { key: 'max', label: 'Max HR Label' },
      { key: 'chart', label: 'Heart Rate Graph Curve/Area' },
    ],
    hrBadge: [
      { key: 'icon', label: 'Heart Icon' },
      { key: 'label', label: 'Badge Label' },
      { key: 'val', label: 'Heart Rate Number' },
      { key: 'unit', label: 'Unit Text (BPM)' },
      { key: 'peak', label: 'Peak HR Summary / Zone Tag' },
      { key: 'zone', label: 'Zone / Intensity Tag' },
    ],
    hrZones: [
      { key: 'title', label: 'Zones Widget Title' },
      { key: 'z1', label: 'Zone 1 Warmup' },
      { key: 'z2', label: 'Zone 2 Fat Burn' },
      { key: 'z3', label: 'Zone 3 Aerobic' },
      { key: 'z4', label: 'Zone 4 Threshold' },
      { key: 'z5', label: 'Zone 5 Anaerobic' },
    ],
    brand: [
      { key: 'text', label: 'Brand / Watermark Text' },
      { key: 'subtext', label: 'Sub-brand / Motto / Hashtag' },
    ],
    map: [
      { key: 'title', label: 'Map Location Tag / Title' },
      { key: 'caption', label: 'Polaroid Bottom Caption' },
      { key: 'route', label: 'Route GPS Path' },
      { key: 'marker', label: 'Animation Runner Marker (Corsair / Dot / Arrow)' },
    ],
  };

  function getWidgetCategory(key) {
    if (!key) return '';
    if (key.includes('_') && !key.endsWith('_bg')) {
      const cat = key.split('_')[0];
      if (SUB_PARTS_MAP[cat]) return cat;
    }
    return key;
  }

  function getSubPartsForWidget(widgetKey) {
    const category = getWidgetCategory(widgetKey);
    const base = SUB_PARTS_MAP[category] ? [...SUB_PARTS_MAP[category]] : [];
    if (category === 'splits') {
      const splits = (state.activity && state.activity.splits) ? state.activity.splits : [];
      const count = splits.length > 0 ? splits.length : 8;
      for (let idx = 0; idx < count; idx++) {
        const it = splits[idx];
        const sName = it ? (it.shortName || `L${idx + 1}`) : `L${idx + 1}`;
        const pStr = it ? (it.paceFormatted || '').split(' ')[0] : '5:00';
        base.push(
          { key: `split_lap_${idx}`, label: `Split ${idx + 1} Lap Label (${sName})` },
          { key: `split_pace_${idx}`, label: `Split ${idx + 1} Pace Text (${pStr})` },
          { key: `split_avgHr_${idx}`, label: `Split ${idx + 1} Heart Rate (HR)` },
          { key: `split_time_${idx}`, label: `Split ${idx + 1} Time` },
          { key: `split_delta_${idx}`, label: `Split ${idx + 1} Delta` },
          { key: `split_elevation_${idx}`, label: `Split ${idx + 1} Elevation` },
          { key: `split_cadence_${idx}`, label: `Split ${idx + 1} Cadence` },
          { key: `split_bar_${idx}`, label: `Split ${idx + 1} Bar / Column (${sName})` },
          { key: `split_${idx}`, label: `Split ${idx + 1} Entire Item (${sName})` }
        );
      }
    }
    return base;
  }
  window.getWidgetCategory = getWidgetCategory;
  window.getSubPartsForWidget = getSubPartsForWidget;

  const getActiveKey = () => elSelect.value || 'header';
  const getStyleObj = () => {
    const key = getActiveKey();
    if (!state.config.elementStyles) state.config.elementStyles = {};
    if (!state.config.elementStyles[key]) state.config.elementStyles[key] = {};
    return state.config.elementStyles[key];
  };

  const getBgObj = () => {
    const key = getActiveKey();
    if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
    if (!state.config.widgetBgStyles[key]) state.config.widgetBgStyles[key] = {};
    return state.config.widgetBgStyles[key];
  };

  const getSubElemObj = () => {
    const key = getActiveKey();
    const part = subPartSelect ? subPartSelect.value : 'widget';
    if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
    if (!state.config.widgetElementOffsets[key]) state.config.widgetElementOffsets[key] = {};
    if (!state.config.widgetElementOffsets[key][part]) state.config.widgetElementOffsets[key][part] = { x: 0, y: 0, z: 1 };
    return state.config.widgetElementOffsets[key][part];
  };

  // Reintroduce & Hidden State Logic
  window.isElementDeleted = (widgetKey, partKey) => {
    if (!widgetKey) return false;
    if (!partKey || partKey === 'widget') {
      const extraInst = state.config.extraWidgetInstances?.find((inst) => inst.id === widgetKey);
      if (extraInst) return extraInst.enabled === false;
      const showKey = 'showWidget' + widgetKey.charAt(0).toUpperCase() + widgetKey.slice(1);
      if (showKey in state.config && state.config[showKey] === false) return true;
      return false;
    }
    if (partKey === 'bg') {
      const bg = state.config.widgetBgStyles?.[widgetKey];
      if (!bg) return false;
      return bg.hidden === true || bg.visible === false || (bg.showBg === false && bg.showBorder === false);
    }
    if (widgetKey === 'header' && partKey === 'location') {
      if (state.config.headerShowLocation === false || state.config.showLocation === false) return true;
    }
    const off = state.config.widgetElementOffsets?.[widgetKey]?.[partKey];
    if (!off) return false;
    return off.hidden === true || off.visible === false;
  };

  window.reintroduceElement = (widgetKey, partKey) => {
    if (!widgetKey) return;
    pushUndoSnapshot();

    if (!partKey || partKey === 'widget') {
      const extraInst = state.config.extraWidgetInstances?.find((inst) => inst.id === widgetKey);
      if (extraInst) {
        extraInst.enabled = true;
        if (typeof renderExtraWidgetsUI === 'function') renderExtraWidgetsUI();
        triggerRender();
        showToast(`Reintroduced ${extraInst.name || widgetKey}`);
        return;
      }
      const showKey = 'showWidget' + widgetKey.charAt(0).toUpperCase() + widgetKey.slice(1);
      state.config[showKey] = true;
      const widgetCheckbox = document.getElementById(showKey) || document.getElementById('toggle' + widgetKey.charAt(0).toUpperCase() + widgetKey.slice(1));
      if (widgetCheckbox) widgetCheckbox.checked = true;
      showToast(`Reintroduced ${widgetKey} widget`);
    } else if (partKey === 'bg') {
      if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
      if (!state.config.widgetBgStyles[widgetKey]) state.config.widgetBgStyles[widgetKey] = {};
      const bg = state.config.widgetBgStyles[widgetKey];
      bg.hidden = false;
      bg.visible = true;
      bg.showBg = true;
      bg.showBorder = true;
      bg.textOnly = false;
      const bgShowBgToggle = document.getElementById('inspectorBgShowBgToggle');
      const bgShowBorderToggle = document.getElementById('inspectorBgShowBorderToggle');
      if (bgShowBgToggle) bgShowBgToggle.checked = true;
      if (bgShowBorderToggle) bgShowBorderToggle.checked = true;
      showToast(`Reintroduced background border for ${widgetKey}`);
    } else {
      if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
      if (!state.config.widgetElementOffsets[widgetKey]) state.config.widgetElementOffsets[widgetKey] = {};
      if (!state.config.widgetElementOffsets[widgetKey][partKey]) {
        state.config.widgetElementOffsets[widgetKey][partKey] = { x: 0, y: 0, z: 1 };
      }
      const off = state.config.widgetElementOffsets[widgetKey][partKey];
      off.hidden = false;
      off.visible = true;

      if (widgetKey === 'header' && partKey === 'location') {
        state.config.headerShowLocation = true;
        state.config.showLocation = true;
        ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = true;
        });
      }
      const partObj = (SUB_PARTS_MAP[widgetKey] || []).find((p) => p.key === partKey);
      const pLabel = partObj ? partObj.label : partKey;
      showToast(`Reintroduced ${pLabel}`);
    }

    triggerRender();
    if (window.syncInspectorWithSelectedElement) {
      window.syncInspectorWithSelectedElement(widgetKey, partKey);
    }
  };

  window.reintroduceAllElements = (widgetKey) => {
    if (!widgetKey) return;
    pushUndoSnapshot();

    const extraInst = state.config.extraWidgetInstances?.find((inst) => inst.id === widgetKey);
    if (extraInst) {
      extraInst.enabled = true;
      if (typeof renderExtraWidgetsUI === 'function') renderExtraWidgetsUI();
    }

    const showKey = 'showWidget' + widgetKey.charAt(0).toUpperCase() + widgetKey.slice(1);
    if (showKey in state.config) {
      state.config[showKey] = true;
      const widgetCheckbox = document.getElementById(showKey) || document.getElementById('toggle' + widgetKey.charAt(0).toUpperCase() + widgetKey.slice(1));
      if (widgetCheckbox) widgetCheckbox.checked = true;
    }

    if (state.config.widgetBgStyles?.[widgetKey]) {
      const bg = state.config.widgetBgStyles[widgetKey];
      bg.hidden = false;
      bg.visible = true;
      bg.showBg = true;
      bg.showBorder = true;
      bg.textOnly = false;
    }

    if (state.config.widgetElementOffsets?.[widgetKey]) {
      Object.keys(state.config.widgetElementOffsets[widgetKey]).forEach((pk) => {
        state.config.widgetElementOffsets[widgetKey][pk].hidden = false;
        state.config.widgetElementOffsets[widgetKey][pk].visible = true;
      });
    }

    if (widgetKey === 'header') {
      state.config.headerShowLocation = true;
      state.config.showLocation = true;
      ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = true;
      });
    }

    triggerRender();
    if (window.syncInspectorWithSelectedElement) {
      window.syncInspectorWithSelectedElement(widgetKey);
    }
    showToast(`All elements reintroduced for ${widgetKey}`);
  };

  window.getDeletedElements = (widgetKey) => {
    if (!widgetKey) return [];
    const list = [];
    if (window.isElementDeleted(widgetKey, 'widget')) {
      list.push({ key: 'widget', label: 'Entire Widget', type: 'widget' });
    }
    if (window.isElementDeleted(widgetKey, 'bg')) {
      list.push({ key: 'bg', label: 'Background Border', type: 'bg' });
    }
    const parts = SUB_PARTS_MAP[widgetKey] || [];
    parts.forEach((p) => {
      if (window.isElementDeleted(widgetKey, p.key)) {
        list.push({ key: p.key, label: p.label, type: 'part' });
      }
    });
    return list;
  };

  // Sync controls with selected element
  window.syncInspectorWithSelectedElement = (key, forcePart = null) => {
    if (key && elSelect.querySelector(`option[value="${key}"]`)) {
      elSelect.value = key;
    }
    const targetKey = getActiveKey();
    const st = (state.config.elementStyles && state.config.elementStyles[targetKey]) || {};

    // Update (Deleted) markers on main widget dropdown
    if (elSelect) {
      Array.from(elSelect.options).forEach((opt) => {
        const wKey = opt.value;
        if (wKey !== '__bg_photo__') {
          const isWidgetDel = window.isElementDeleted(wKey, 'widget');
          const cleanName = opt.getAttribute('data-original-label') || opt.textContent.replace(' (Deleted)', '');
          if (!opt.getAttribute('data-original-label')) opt.setAttribute('data-original-label', cleanName);
          opt.textContent = isWidgetDel ? `${cleanName} (Deleted)` : cleanName;
        }
      });
    }

    const cat = getWidgetCategory(targetKey);
    const extraInst = state.config.extraWidgetInstances?.find((w) => w.id === targetKey);
    const instOpts = extraInst?.options || {};

    const curHeaderTmpl = instOpts.headerTemplate || instOpts.headerDesign || state.config.headerTemplate || state.config.headerDesign || 'modern';
    const curHeroTmpl = instOpts.heroDesign || state.config.heroDesign || 'mega';
    const curSplitHighlightTmpl = instOpts.splitHighlightDesign || state.config.splitHighlightDesign || 'spotlight';
    const curElevationTmpl = instOpts.elevationDesign || state.config.elevationDesign || 'area';
    const curPaceGraphTmpl = instOpts.paceGraphDesign || state.config.paceGraphDesign || 'area';
    const curHrGraphTmpl = instOpts.hrGraphDesign || state.config.hrGraphDesign || 'filled-area';

    // Populate sub-parts dropdown for this widget
    if (subPartGroup) {
      subPartGroup.innerHTML = '';
      const parts = getSubPartsForWidget(targetKey);

      parts.forEach((p) => {
        let isRelevant = !p.template;
        if (p.template) {
          if (cat === 'header') isRelevant = p.template === curHeaderTmpl;
          else if (cat === 'hero') isRelevant = p.template === curHeroTmpl;
          else if (cat === 'splitHighlight') isRelevant = p.template === curSplitHighlightTmpl;
          else if (cat === 'elevation') isRelevant = p.template === curElevationTmpl;
          else if (cat === 'paceGraph') isRelevant = p.template === curPaceGraphTmpl;
          else if (cat === 'hrGraph') isRelevant = p.template === curHrGraphTmpl;
          if (!isRelevant && state.config.widgetElementOffsets?.[targetKey]?.[p.key]) {
            isRelevant = true;
          }
        }
        if (!isRelevant) return;

        const isDel = window.isElementDeleted(targetKey, p.key);
        const opt = document.createElement('option');
        opt.value = p.key;
        opt.textContent = isDel ? `❌ ${p.label} (Deleted / Hidden)` : `📍 ${p.label}`;
        subPartGroup.appendChild(opt);
      });
    }

    // Update background border option text
    const bgOpt = subPartSelect ? subPartSelect.querySelector('option[value="bg"]') : null;
    if (bgOpt) {
      const isBgDel = window.isElementDeleted(targetKey, 'bg');
      bgOpt.textContent = isBgDel ? '❌ Background Border (Deleted / Hidden)' : '🔲 Background Border Only (Resize & Style)';
    }

    if (forcePart && subPartSelect) {
      subPartSelect.value = forcePart;
    } else if (subPartSelect) {
      const curVal = subPartSelect.value;
      const valid = curVal === 'widget' || curVal === 'bg' || (parts && parts.some((p) => p.key === curVal));
      if (!valid) subPartSelect.value = 'widget';
    }

    // Sync Template / Design Style Selector in Inspector
    const tmplContainer = document.getElementById('inspectorTemplateContainer');
    const tmplSelect = document.getElementById('inspectorTemplateSelect');
    const tmplBadge = document.getElementById('inspectorTemplateBadge');
    const extraFieldContainer = document.getElementById('inspectorExtraFieldContainer');
    const extraFieldLabel = document.getElementById('inspectorExtraFieldLabel');
    const extraFieldSelect = document.getElementById('inspectorExtraFieldSelect');

    const tmplConfig = WIDGET_TEMPLATE_OPTIONS[cat];

    if (tmplContainer && tmplSelect) {
      if (tmplConfig && tmplConfig.options && tmplConfig.options.length > 0 && targetKey !== '__bg_photo__') {
        tmplContainer.style.display = 'block';
        if (tmplBadge) {
          tmplBadge.textContent = extraInst ? `${extraInst.name || targetKey}` : 'BASE WIDGET';
        }
        if (tmplSelect.getAttribute('data-cat') !== cat) {
          tmplSelect.innerHTML = '';
          tmplConfig.options.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            tmplSelect.appendChild(o);
          });
          tmplSelect.setAttribute('data-cat', cat);
        }

        let activeVal = '';
        if (extraInst && extraInst.options) {
          activeVal = extraInst.options[tmplConfig.designKey] || state.config[tmplConfig.designKey] || tmplConfig.defaultVal;
        } else {
          activeVal = state.config[tmplConfig.designKey] || tmplConfig.defaultVal;
        }
        tmplSelect.value = activeVal;

        if (tmplConfig.hasMetricSelect && extraFieldContainer && extraFieldSelect) {
          extraFieldContainer.style.display = 'block';
          if (extraFieldLabel) extraFieldLabel.textContent = 'Hero Metric:';
          if (extraFieldSelect.getAttribute('data-type') !== 'heroMetric') {
            extraFieldSelect.innerHTML = `
              <option value="distance">📏 Distance</option>
              <option value="pace">⚡ Average / Current Pace</option>
              <option value="time">⏱️ Moving Time</option>
              <option value="hr">💓 Heart Rate</option>
            `;
            extraFieldSelect.setAttribute('data-type', 'heroMetric');
          }
          const activeMetric = (extraInst && extraInst.options && extraInst.options.heroMetric) || state.config.heroMetric || 'distance';
          extraFieldSelect.value = activeMetric;
        } else if (tmplConfig.hasTargetSelect && extraFieldContainer && extraFieldSelect) {
          extraFieldContainer.style.display = 'block';
          if (extraFieldLabel) extraFieldLabel.textContent = 'Spotlight Split Target:';
          if (extraFieldSelect.getAttribute('data-type') !== 'splitTarget') {
            extraFieldSelect.innerHTML = `
              <option value="fastest">⚡ Fastest Split</option>
              <option value="slowest">🐢 Slowest Split</option>
              <option value="final">🏁 Final Split</option>
            `;
            extraFieldSelect.setAttribute('data-type', 'splitTarget');
          }
          const activeTarget = (extraInst && extraInst.options && extraInst.options.highlightSplitTarget) || state.config.highlightSplitTarget || 'fastest';
          extraFieldSelect.value = activeTarget;
        } else if (extraFieldContainer) {
          extraFieldContainer.style.display = 'none';
        }
      } else {
        tmplContainer.style.display = 'none';
      }
    }

    // Sync Secondary Metrics Item Toggles Container in Inspector
    const insMetricsItemsContainer = document.getElementById('inspectorMetricsItemsContainer');
    if (insMetricsItemsContainer) {
      if (cat === 'metrics' || targetKey === 'metrics' || targetKey.startsWith('metrics')) {
        insMetricsItemsContainer.style.display = 'block';
        const metricBinds = [
          { key: 'metricShowTime', id: 'insToggleMetricTime', def: true },
          { key: 'metricShowPace', id: 'insToggleMetricPace', def: true },
          { key: 'metricShowHr', id: 'insToggleMetricHr', def: true },
          { key: 'metricShowElevation', id: 'insToggleMetricElevation', def: true },
          { key: 'metricShowCadence', id: 'insToggleMetricCadence', def: true },
          { key: 'metricShowCalories', id: 'insToggleMetricCalories', def: true },
          { key: 'metricShowDistance', id: 'insToggleMetricDistance', def: false },
          { key: 'metricShowBestPace', id: 'insToggleMetricBestPace', def: false },
        ];
        metricBinds.forEach(({ key, id, def }) => {
          const el = document.getElementById(id);
          if (el) el.checked = state.config[key] !== undefined ? Boolean(state.config[key]) : def;
        });
      } else {
        insMetricsItemsContainer.style.display = 'none';
      }
    }

    const currentPart = subPartSelect ? subPartSelect.value : 'widget';

    // Show top Reintroduce button if any elements in this widget are deleted
    const deletedList = window.getDeletedElements(targetKey);
    if (reintroduceBtn) {
      if (deletedList.length > 0) {
        reintroduceBtn.style.display = 'inline-block';
        reintroduceBtn.textContent = `➕ Reintroduce (${deletedList.length})`;
      } else {
        reintroduceBtn.style.display = 'none';
      }
    }

    // Show/hide sub-containers
    if (currentPart === 'bg') {
      if (bgControlsContainer) bgControlsContainer.style.display = 'block';
      if (subElemControlsContainer) subElemControlsContainer.style.display = 'none';
      if (subPartBadge) subPartBadge.textContent = 'Background Border Only';
      if (widgetDeletedNotice) widgetDeletedNotice.style.display = 'none';

      const isBgDel = window.isElementDeleted(targetKey, 'bg');
      if (reintroduceBgBtn) reintroduceBgBtn.style.display = isBgDel ? 'inline-block' : 'none';
      if (deleteBgBtn) {
        deleteBgBtn.textContent = isBgDel ? '➕ Reintroduce Border' : '🗑 Delete Border';
        deleteBgBtn.style.color = isBgDel ? '#10b981' : '#f87171';
      }

      const bgStyle = (state.config.widgetBgStyles && state.config.widgetBgStyles[targetKey]) || {};
      const wDelta = typeof bgStyle.widthDelta === 'number' ? bgStyle.widthDelta : 0;
      const hDelta = typeof bgStyle.heightDelta === 'number' ? bgStyle.heightDelta : 0;
      const offX = typeof bgStyle.offsetX === 'number' ? bgStyle.offsetX : 0;
      const offY = typeof bgStyle.offsetY === 'number' ? bgStyle.offsetY : 0;
      const rad = typeof bgStyle.radius === 'number' ? bgStyle.radius : (state.config.cardRadius || 16);
      const bWidth = typeof bgStyle.borderWidth === 'number' ? bgStyle.borderWidth : 1;
      const bColor = bgStyle.borderColor || '';
      const fColor = bgStyle.fillColor || '';

      if (bgWidthSlider) bgWidthSlider.value = wDelta;
      if (bgWidthInput) bgWidthInput.value = wDelta;
      if (bgHeightSlider) bgHeightSlider.value = hDelta;
      if (bgHeightInput) bgHeightInput.value = hDelta;
      if (bgOffsetXSlider) bgOffsetXSlider.value = offX;
      if (bgOffsetXInput) bgOffsetXInput.value = offX;
      if (bgOffsetYSlider) bgOffsetYSlider.value = offY;
      if (bgOffsetYInput) bgOffsetYInput.value = offY;
      if (bgRadiusSlider) bgRadiusSlider.value = rad;
      if (bgRadiusInput) bgRadiusInput.value = rad;
      if (bgBorderWidthSlider) bgBorderWidthSlider.value = bWidth;
      if (bgBorderWidthInput) bgBorderWidthInput.value = bWidth;
      if (bgBorderColorHex) bgBorderColorHex.value = bColor;
      if (bgBorderColorInput && bColor.startsWith('#')) bgBorderColorInput.value = bColor;
      if (bgFillColorHex) bgFillColorHex.value = fColor;
      if (bgFillColorInput && fColor.startsWith('#')) bgFillColorInput.value = fColor;

      const bgShowBgToggle = document.getElementById('inspectorBgShowBgToggle');
      const bgShowBorderToggle = document.getElementById('inspectorBgShowBorderToggle');
      if (bgShowBgToggle) bgShowBgToggle.checked = bgStyle.showBg !== false && !bgStyle.textOnly;
      if (bgShowBorderToggle) bgShowBorderToggle.checked = bgStyle.showBorder !== false && !bgStyle.textOnly;
    } else if (currentPart !== 'widget') {
      if (bgControlsContainer) bgControlsContainer.style.display = 'none';
      if (subElemControlsContainer) subElemControlsContainer.style.display = 'block';
      if (widgetDeletedNotice) widgetDeletedNotice.style.display = 'none';

      const partObj = getSubPartsForWidget(targetKey).find((p) => p.key === currentPart);
      const pLabel = partObj ? partObj.label : currentPart;
      if (subPartBadge) subPartBadge.textContent = pLabel;
      if (subElemTitle) subElemTitle.textContent = `📍 ${pLabel} (Move X, Y, Z)`;

      const isSubDel = window.isElementDeleted(targetKey, currentPart);
      if (subElemDeletedNotice) subElemDeletedNotice.style.display = isSubDel ? 'flex' : 'none';
      if (reintroduceSubElemBtn) reintroduceSubElemBtn.style.display = isSubDel ? 'inline-block' : 'none';
      if (deleteSubElemBtn) {
        deleteSubElemBtn.textContent = isSubDel ? '➕ Reintroduce' : '🗑 Delete / Hide';
        deleteSubElemBtn.style.color = isSubDel ? '#10b981' : '#f87171';
      }

      const off = (state.config.widgetElementOffsets && state.config.widgetElementOffsets[targetKey] && state.config.widgetElementOffsets[targetKey][currentPart]) || { x: 0, y: 0, z: 1 };
      const ox = typeof off.x === 'number' ? off.x : 0;
      const oy = typeof off.y === 'number' ? off.y : 0;
      const oz = typeof off.z === 'number' ? off.z : 1;

      if (subElemXSlider) subElemXSlider.value = ox;
      if (subElemXInput) subElemXInput.value = ox;
      if (subElemYSlider) subElemYSlider.value = oy;
      if (subElemYInput) subElemYInput.value = oy;
      if (subElemZSlider) subElemZSlider.value = oz;
      if (subElemZInput) subElemZInput.value = oz;

      if (subElemFontFamily) subElemFontFamily.value = off.fontFamily || 'default';
      const sScale = typeof off.scale === 'number' && !isNaN(off.scale) ? off.scale : 100;
      if (subElemSizeSlider) subElemSizeSlider.value = sScale;
      if (subElemSizeInput) subElemSizeInput.value = sScale;
      if (subElemSizeVal) subElemSizeVal.textContent = `${sScale}%`;

      // Populate text input
      if (subElemTextInput) {
        let currentText = '';
        if (state.config.widgetTextOverrides && state.config.widgetTextOverrides[targetKey]) {
          currentText = state.config.widgetTextOverrides[targetKey][currentPart] || '';
        }
        if (!currentText) {
          if (targetKey === 'header' && currentPart === 'title') currentText = state.config.customTitle || '';
          if (targetKey === 'header' && currentPart === 'subtitle') currentText = state.config.customSubtitle || '';
          if (targetKey === 'header' && currentPart === 'runner') currentText = state.config.runnerName || '';
          if (targetKey === 'header' && currentPart === 'location') currentText = state.config.locationName || '';
          if (targetKey === 'header' && currentPart === 'weather') currentText = state.config.weatherText || '';
          if (targetKey === 'splits' && currentPart === 'title') currentText = state.config.splitCustomTitle || '';
        }
        subElemTextInput.value = currentText;
      }

      // Populate text color
      const currentColor = (off.color && off.color !== 'default') ? off.color : '';
      if (subElemColorHex) subElemColorHex.value = currentColor;
      if (subElemColorInput) {
        if (currentColor && currentColor.startsWith('#')) {
          subElemColorInput.value = currentColor;
        } else {
          subElemColorInput.value = '#ffffff';
        }
      }

      // Populate sub-element rotation
      const sRot = typeof off.rotation === 'number' ? off.rotation : 0;
      const subRotSlider = document.getElementById('inspectorSubElemRotationSlider');
      const subRotInput = document.getElementById('inspectorSubElemRotationInput');
      if (subRotSlider) subRotSlider.value = sRot;
      if (subRotInput) subRotInput.value = sRot;

      // Populate sub-element text shadow
      const sShadow = off.textShadow || { enabled: false, color: '#000000', blur: 8, offsetY: 3 };
      const subShadowToggle = document.getElementById('inspectorSubElemShadowToggle');
      const subShadowDetails = document.getElementById('inspectorSubElemShadowDetails');
      const subShadowColorInput = document.getElementById('inspectorSubElemShadowColorInput');
      const subShadowBlurSlider = document.getElementById('inspectorSubElemShadowBlurSlider');
      const subShadowOffsetYSlider = document.getElementById('inspectorSubElemShadowOffsetYSlider');
      if (subShadowToggle) subShadowToggle.checked = !!sShadow.enabled;
      if (subShadowDetails) subShadowDetails.style.display = sShadow.enabled ? 'block' : 'none';
      if (subShadowColorInput) subShadowColorInput.value = sShadow.color || '#000000';
      if (subShadowBlurSlider) subShadowBlurSlider.value = typeof sShadow.blur === 'number' ? sShadow.blur : 8;
      if (subShadowOffsetYSlider) subShadowOffsetYSlider.value = typeof sShadow.offsetY === 'number' ? sShadow.offsetY : 3;

      // Populate sub-element text outline
      const sOutline = off.textOutline || { enabled: false, color: '#000000', width: 2 };
      const subOutlineToggle = document.getElementById('inspectorSubElemOutlineToggle');
      const subOutlineDetails = document.getElementById('inspectorSubElemOutlineDetails');
      const subOutlineColorInput = document.getElementById('inspectorSubElemOutlineColorInput');
      const subOutlineWidthSlider = document.getElementById('inspectorSubElemOutlineWidthSlider');
      const subOutlineWidthVal = document.getElementById('inspectorSubElemOutlineWidthVal');
      if (subOutlineToggle) subOutlineToggle.checked = !!sOutline.enabled;
      if (subOutlineDetails) subOutlineDetails.style.display = sOutline.enabled ? 'block' : 'none';
      if (subOutlineColorInput) subOutlineColorInput.value = sOutline.color || '#000000';
      if (subOutlineWidthSlider) subOutlineWidthSlider.value = typeof sOutline.width === 'number' ? sOutline.width : 2;
      if (subOutlineWidthVal) subOutlineWidthVal.textContent = `${typeof sOutline.width === 'number' ? sOutline.width : 2}px`;
    } else {
      if (bgControlsContainer) bgControlsContainer.style.display = 'none';
      if (subElemControlsContainer) subElemControlsContainer.style.display = 'none';
      if (subPartBadge) subPartBadge.textContent = 'Entire Widget';

      const isWidgetDel = window.isElementDeleted(targetKey, 'widget');
      if (widgetDeletedNotice) {
        widgetDeletedNotice.style.display = isWidgetDel ? 'flex' : 'none';
        if (widgetDeletedNoticeText) widgetDeletedNoticeText.textContent = `⚠️ The ${targetKey} widget is currently deleted and hidden.`;
      }
      if (deleteElementBtn) {
        deleteElementBtn.textContent = isWidgetDel ? '➕ Reintroduce Widget' : '🗑 Delete Widget';
        deleteElementBtn.style.color = isWidgetDel ? '#10b981' : '#f87171';
      }
    }

    if (fontSelect) fontSelect.value = st.fontFamily || 'default';
    const scale = typeof st.fontSizeScale === 'number' ? st.fontSizeScale : 100;
    if (sizeSlider) sizeSlider.value = scale;
    if (sizeInput) sizeInput.value = scale;
    if (sizeVal) sizeVal.textContent = `${scale}%`;

    const color = st.color || '';
    if (colorHex) colorHex.value = color;
    if (colorInput && color && color.startsWith('#')) colorInput.value = color;

    const accent = st.accentColor || '';
    if (accentHex) accentHex.value = accent;
    if (accentInput && accent && accent.startsWith('#')) accentInput.value = accent;

    const align = st.textAlign || 'default';
    if (alignGrid) {
      alignGrid.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.dataset.align === align);
      });
    }

    if (cardStyleSelect) cardStyleSelect.value = st.cardStyle || 'default';
    const op = typeof st.opacity === 'number' ? st.opacity : 100;
    if (opacitySlider) opacitySlider.value = op;
    if (opacityVal) opacityVal.textContent = `${op}%`;

    // Widget rotation
    const wRot = typeof st.rotation === 'number' ? st.rotation : ((state.config.widgetPositions && state.config.widgetPositions[targetKey] && typeof state.config.widgetPositions[targetKey].rotation === 'number') ? state.config.widgetPositions[targetKey].rotation : 0);
    const inspRotSlider = document.getElementById('inspectorWidgetRotationSlider');
    const inspRotInput = document.getElementById('inspectorWidgetRotationInput');
    const inspRotVal = document.getElementById('inspectorWidgetRotationVal');
    if (inspRotSlider) inspRotSlider.value = wRot;
    if (inspRotInput) inspRotInput.value = wRot;
    if (inspRotVal) inspRotVal.textContent = `${wRot}°`;

    // Widget text shadow
    const wShadow = st.textShadow || { enabled: false, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
    const inspShadowToggle = document.getElementById('inspectorTextShadowToggle');
    const inspShadowDetails = document.getElementById('inspectorTextShadowDetails');
    const inspShadowColorInput = document.getElementById('inspectorTextShadowColorInput');
    const inspShadowColorHex = document.getElementById('inspectorTextShadowColorHex');
    const inspShadowBlurSlider = document.getElementById('inspectorTextShadowBlurSlider');
    const inspShadowBlurVal = document.getElementById('inspectorTextShadowBlurVal');
    const inspShadowOffsetYSlider = document.getElementById('inspectorTextShadowOffsetYSlider');
    const inspShadowOffsetYVal = document.getElementById('inspectorTextShadowOffsetYVal');
    if (inspShadowToggle) inspShadowToggle.checked = !!wShadow.enabled;
    if (inspShadowDetails) inspShadowDetails.style.display = wShadow.enabled ? 'block' : 'none';
    if (inspShadowColorInput) inspShadowColorInput.value = (wShadow.color && wShadow.color.startsWith('#')) ? wShadow.color : '#000000';
    if (inspShadowColorHex) inspShadowColorHex.value = wShadow.color || '#000000';
    if (inspShadowBlurSlider) inspShadowBlurSlider.value = typeof wShadow.blur === 'number' ? wShadow.blur : 8;
    if (inspShadowBlurVal) inspShadowBlurVal.textContent = `${typeof wShadow.blur === 'number' ? wShadow.blur : 8}px`;
    if (inspShadowOffsetYSlider) inspShadowOffsetYSlider.value = typeof wShadow.offsetY === 'number' ? wShadow.offsetY : 3;
    if (inspShadowOffsetYVal) inspShadowOffsetYVal.textContent = `${typeof wShadow.offsetY === 'number' ? wShadow.offsetY : 3}px`;

    // Widget text outline
    const wOutline = st.textOutline || { enabled: false, color: '#000000', width: 2 };
    const inspOutlineToggle = document.getElementById('inspectorTextOutlineToggle');
    const inspOutlineDetails = document.getElementById('inspectorTextOutlineDetails');
    const inspOutlineColorInput = document.getElementById('inspectorTextOutlineColorInput');
    const inspOutlineColorHex = document.getElementById('inspectorTextOutlineColorHex');
    const inspOutlineWidthSlider = document.getElementById('inspectorTextOutlineWidthSlider');
    const inspOutlineWidthVal = document.getElementById('inspectorTextOutlineWidthVal');
    if (inspOutlineToggle) inspOutlineToggle.checked = !!wOutline.enabled;
    if (inspOutlineDetails) inspOutlineDetails.style.display = wOutline.enabled ? 'block' : 'none';
    if (inspOutlineColorInput) inspOutlineColorInput.value = (wOutline.color && wOutline.color.startsWith('#')) ? wOutline.color : '#000000';
    if (inspOutlineColorHex) inspOutlineColorHex.value = wOutline.color || '#000000';
    if (inspOutlineWidthSlider) inspOutlineWidthSlider.value = typeof wOutline.width === 'number' ? wOutline.width : 2;
    if (inspOutlineWidthVal) inspOutlineWidthVal.textContent = `${typeof wOutline.width === 'number' ? wOutline.width : 2}px`;

    // Render in-context dynamic text editor for current element
    renderInspectorTextEditor(targetKey);
  };

  const renderInspectorTextEditor = (targetKey) => {
    const container = document.getElementById('inspectorTextEditorContainer');
    const badge = document.getElementById('inspectorTextWidgetBadge');
    if (!container) return;

    const cat = getWidgetCategory(targetKey);
    const extraInst = state.config.extraWidgetInstances?.find((w) => w.id === targetKey);
    const instOpts = extraInst?.options || {};

    const names = {
      header: 'Header Widget',
      hero: 'Hero Metric Card',
      metrics: 'Secondary Metrics Grid',
      splits: 'Splits Table / Chart',
      splitHighlight: 'Split Spotlight Card',
      map: 'Route Map',
      elevation: 'Elevation Profile',
      hrZones: 'Heart Rate Zones',
      paceGraph: 'Pace Graph',
      hrGraph: 'Heart Rate Graph',
      hrBadge: 'Avg Heart Rate Badge',
      brand: 'Watermark / Brand',
    };

    if (badge) badge.textContent = extraInst ? `${extraInst.name || targetKey}` : (names[targetKey] || targetKey);
    container.innerHTML = '';

    const overrides = state.config.widgetTextOverrides;
    if (!overrides[targetKey]) overrides[targetKey] = {};
    const curOverrides = overrides[targetKey];

    // 1. Show Hidden / Deleted elements banner at top if any elements are deleted
    const deletedList = window.getDeletedElements(targetKey);
    if (deletedList.length > 0) {
      const banner = document.createElement('div');
      banner.style.cssText = 'background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px; padding: 8px 10px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.74rem; font-weight: 700; color: #f87171;">⚠️ ${deletedList.length} element(s) hidden / deleted in this widget</span>
          <button type="button" class="btn btn-secondary reintroduce-all-inline-btn" style="padding: 2px 8px; font-size: 0.7rem; color: #10b981; border-color: rgba(16,185,129,0.4); font-weight: 700; cursor: pointer;">➕ Reintroduce All</button>
        </div>
        <div class="deleted-chips-row" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
      `;
      const chipsRow = banner.querySelector('.deleted-chips-row');
      deletedList.forEach((delItem) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'btn btn-secondary';
        chip.style.cssText = 'padding: 2px 6px; font-size: 0.68rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.4); border-color: rgba(239, 68, 68, 0.3); color: #fff; cursor: pointer;';
        chip.innerHTML = `<span>➕ Reintroduce</span> <strong>${delItem.label}</strong>`;
        chip.addEventListener('click', () => {
          window.reintroduceElement(targetKey, delItem.key);
        });
        chipsRow.appendChild(chip);
      });
      banner.querySelector('.reintroduce-all-inline-btn').addEventListener('click', () => {
        window.reintroduceAllElements(targetKey);
      });
      container.appendChild(banner);
    }

    const addField = (partKey, label, value, placeholder, onChange) => {
      const field = document.createElement('div');
      field.className = 'inspector-text-field';
      field.style.marginBottom = '8px';

      const isDel = window.isElementDeleted(targetKey, partKey);

      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;';

      const lbl = document.createElement('label');
      lbl.style.cssText = 'font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;';
      lbl.textContent = label;
      labelRow.appendChild(lbl);

      if (isDel) {
        const delTag = document.createElement('span');
        delTag.style.cssText = 'font-size: 0.65rem; color: #ef4444; font-weight: 700;';
        delTag.textContent = '[Deleted]';
        lbl.appendChild(delTag);

        const reinBtn = document.createElement('button');
        reinBtn.type = 'button';
        reinBtn.className = 'btn btn-secondary';
        reinBtn.style.cssText = 'padding: 1px 6px; font-size: 0.66rem; color: #10b981; border-color: rgba(16,185,129,0.3); font-weight: 700; cursor: pointer;';
        reinBtn.textContent = '➕ Reintroduce';
        reinBtn.addEventListener('click', () => {
          window.reintroduceElement(targetKey, partKey);
        });
        labelRow.appendChild(reinBtn);
      }

      field.appendChild(labelRow);

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
      input.style.cssText = 'width: 100%; font-size: 0.8rem; padding: 5px 8px; border-radius: 6px;';
      input.value = value || '';
      input.placeholder = placeholder || '';

      input.addEventListener('input', (e) => {
        if (window.isElementDeleted(targetKey, partKey)) {
          window.reintroduceElement(targetKey, partKey);
        }
        onChange(e.target.value);
        triggerRender();
      });

      field.appendChild(input);
      container.appendChild(field);
      return input;
    };

    if (cat === 'header') {
      const curHdrTmpl = instOpts.headerTemplate || instOpts.headerDesign || state.config.headerTemplate || state.config.headerDesign || 'modern';

      const defTitle = targetKey === 'header' ? (state.config.customTitle || 'MORNING RUN') : 'MORNING RUN';
      addField('title', 'Main Title', curOverrides.title || defTitle, 'MORNING RUN', (v) => {
        curOverrides.title = v;
        if (targetKey === 'header') {
          state.config.customTitle = v;
          const el1 = document.getElementById('inputActivityTitle');
          const el2 = document.getElementById('textTabActivityTitle');
          if (el1) el1.value = v;
          if (el2) el2.value = v;
        }
      });

      const defSubtitle = targetKey === 'header' ? (state.config.customSubtitle || 'Date & Time') : 'Date & Time';
      addField('subtitle', 'Subtitle / Date', curOverrides.subtitle || defSubtitle, 'Date & Time', (v) => {
        curOverrides.subtitle = v;
        if (targetKey === 'header') {
          state.config.customSubtitle = v;
          const el = document.getElementById('textTabSubtitle');
          if (el) el.value = v;
        }
      });

      const defRunner = targetKey === 'header' ? (state.config.runnerName || '@runner_alex') : '@runner_alex';
      addField('runner', 'Runner Handle', curOverrides.runner || defRunner, '@runner_alex', (v) => {
        curOverrides.runner = v;
        if (targetKey === 'header') {
          state.config.runnerName = v;
          const el1 = document.getElementById('inputRunnerName');
          const el2 = document.getElementById('textTabRunnerName');
          if (el1) el1.value = v;
          if (el2) el2.value = v;
        }
      });

      const defLoc = targetKey === 'header' ? (state.config.locationName || 'Location name') : 'Location name';
      addField('location', 'Location Name', curOverrides.location || defLoc, 'Location name', (v) => {
        curOverrides.location = v;
        if (targetKey === 'header') {
          state.config.locationName = v;
          const el1 = document.getElementById('inputLocationName');
          const el2 = document.getElementById('textTabLocationName');
          if (el1) el1.value = v;
          if (el2) el2.value = v;
        }
      });

      const defWeather = targetKey === 'header' ? (state.config.weatherText || '18°C ☀️ Sunny') : '18°C ☀️ Sunny';
      addField('weather', 'Weather Information', curOverrides.weather || defWeather, '18°C ☀️ Sunny', (v) => {
        curOverrides.weather = v;
        if (targetKey === 'header') {
          state.config.weatherText = v;
          const el1 = document.getElementById('inputWeatherText');
          const el2 = document.getElementById('textTabWeatherText');
          if (el1) el1.value = v;
          if (el2) el2.value = v;
        }
      });

      // Template-specific text elements (Magazine Cover, Cyber, Stamp, HUD Flight, etc.)
      if (curHdrTmpl === 'magazine-cover') {
        addField('tagline', 'Headline Cover Tagline', curOverrides.tagline, "// RUNNER'S LOG — ISSUE 2026 //", (v) => {
          curOverrides.tagline = v;
        });
        addField('athletePrefix', 'Athlete Prefix Label', curOverrides.athletePrefix, 'ATHLETE:', (v) => {
          curOverrides.athletePrefix = v;
        });
      } else if (curHdrTmpl === 'retro-cyber') {
        addField('sysPrompt', 'Cyber System Prompt', curOverrides.sysPrompt, '[ SYS.RUN ]', (v) => {
          curOverrides.sysPrompt = v;
        });
        addField('onlineStatus', 'Cyber Online Status Tag', curOverrides.onlineStatus, '● ONLINE [OK]', (v) => {
          curOverrides.onlineStatus = v;
        });
      } else if (curHdrTmpl === 'minimalist-stamp') {
        addField('stampBadge', 'Passport Stamp Top Badge', curOverrides.stampBadge, '★ OFFICIAL ATHLETIC ENTRY ★', (v) => {
          curOverrides.stampBadge = v;
        });
        addField('sealTop', 'Circular Seal Top Text', curOverrides.sealTop, 'RUN', (v) => {
          curOverrides.sealTop = v;
        });
        addField('sealBottom', 'Circular Seal Bottom Text', curOverrides.sealBottom, 'STAMP', (v) => {
          curOverrides.sealBottom = v;
        });
      } else if (curHdrTmpl === 'hud-flight') {
        addField('flightPrompt', 'Flight Telemetry Tag', curOverrides.flightPrompt, '▲ RUN_TELEMETRY', (v) => {
          curOverrides.flightPrompt = v;
        });
        addField('flightStatus', 'GPS Lock Status Tag', curOverrides.flightStatus, 'GPS LOCK: 100%', (v) => {
          curOverrides.flightStatus = v;
        });
      } else if (curHdrTmpl === 'running-bib-header') {
        addField('bibPrefix', 'Race Bib Prefix Tag', curOverrides.bibPrefix, 'BIB #4219 // ATHLETE:', (v) => {
          curOverrides.bibPrefix = v;
        });
      } else if (curHdrTmpl === 'broadcast-lowerthird') {
        addField('finishBadge', 'Broadcast Badge', curOverrides.finishBadge, 'FINISH', (v) => {
          curOverrides.finishBadge = v;
        });
      } else if (curHdrTmpl === 'badge-shield') {
        addField('shieldIcon', 'Shield Badge Icon', curOverrides.shieldIcon, '🏆', (v) => {
          curOverrides.shieldIcon = v;
        });
      } else if (curHdrTmpl === 'pill') {
        addField('pillIcon', 'Glass Pill Icon', curOverrides.pillIcon, '🏃', (v) => {
          curOverrides.pillIcon = v;
        });
      } else if (curHdrTmpl === 'athletic') {
        addField('hudChip', 'Athletic HUD Chip', curOverrides.hudChip, '⚡ RUN HUD', (v) => {
          curOverrides.hudChip = v;
        });
      } else if (curHdrTmpl === 'architect-monolith') {
        addField('dayNum', 'Calendar Day Number', curOverrides.dayNum, '15', (v) => {
          curOverrides.dayNum = v;
        });
        addField('monthStr', 'Calendar Month String', curOverrides.monthStr, 'OCT', (v) => {
          curOverrides.monthStr = v;
        });
      } else if (curHdrTmpl === 'circular-monogram') {
        addField('monogram', 'Monogram Letters', curOverrides.monogram, 'RN', (v) => {
          curOverrides.monogram = v;
        });
      }
    } else if (cat === 'hero') {
      const curHeroTmpl = instOpts.heroDesign || state.config.heroDesign || 'mega';

      addField('label', 'Metric Category Label', curOverrides.label, 'DISTANCE', (v) => {
        curOverrides.label = v;
        if (targetKey === 'hero') {
          const el = document.getElementById('textTabHeroLabel');
          if (el) el.value = v;
        }
      });
      addField('val', 'Value Override', curOverrides.value, 'Auto-calculated (or custom)', (v) => {
        curOverrides.value = v;
        if (targetKey === 'hero') {
          const el = document.getElementById('textTabHeroValue');
          if (el) el.value = v;
        }
      });
      addField('unit', 'Metric Unit', curOverrides.unit, 'KM', (v) => {
        curOverrides.unit = v;
        if (targetKey === 'hero') {
          const el = document.getElementById('textTabHeroUnit');
          if (el) el.value = v;
        }
      });
      addField('sec', 'Secondary / Sub-Metric', curOverrides.secondary, 'GPS TRACKED', (v) => {
        curOverrides.secondary = v;
      });

      if (curHeroTmpl === 'boxed-bracket') {
        addField('statusBadge', 'Status Badge Tag', curOverrides.statusBadge, 'GPS ACTIVE // METRIC', (v) => {
          curOverrides.statusBadge = v;
        });
      } else if (curHeroTmpl === 'stacked-duo') {
        addField('runnerStatBadge', 'Sub-Bar Banner Tag', curOverrides.runnerStatBadge, '⚡ RUN TRACKER OFFICIAL STAT', (v) => {
          curOverrides.runnerStatBadge = v;
        });
      } else if (curHeroTmpl === 'cyber-glass') {
        addField('liveDataBadge', 'Cyber Live Data Badge', curOverrides.liveDataBadge, '● LIVE_DATA', (v) => {
          curOverrides.liveDataBadge = v;
        });
      } else if (curHeroTmpl === 'racing-bib') {
        addField('bibBanner', 'Race Bib Banner Tag', curOverrides.bibBanner, '★ OFFICIAL RACE SPLIT ★', (v) => {
          curOverrides.bibBanner = v;
        });
      } else if (curHeroTmpl === 'digital-lcd') {
        addField('lcdHeader', 'Stopwatch LCD Header', curOverrides.lcdHeader, '[ DIGITAL TIMER ]', (v) => {
          curOverrides.lcdHeader = v;
        });
      } else if (curHeroTmpl === 'tactical-crosshair') {
        addField('tacticalSys', 'Tactical System Tag', curOverrides.tacticalSys, '+ SYS // OPTIC', (v) => {
          curOverrides.tacticalSys = v;
        });
        addField('tacticalStatus', 'Tactical Status Readout', curOverrides.tacticalStatus, 'STATUS: LOCKED', (v) => {
          curOverrides.tacticalStatus = v;
        });
      }
    } else if (cat === 'splits') {
      const defSplitsTitle = targetKey === 'splits' ? (state.config.splitCustomTitle || 'SPLITS') : 'SPLITS';
      addField('title', 'Split Widget Title', curOverrides.title || defSplitsTitle, 'SPLITS', (v) => {
        curOverrides.title = v;
        if (targetKey === 'splits') {
          state.config.splitCustomTitle = v;
          const el = document.getElementById('inputSplitWidgetTitle');
          if (el) el.value = v;
        }
      });
      addField('badge', 'Fastest Split Pill Badge', curOverrides.badge, 'FASTEST', (v) => {
        curOverrides.badge = v;
      });
      addField('headerSplit', 'Column Header: Split', curOverrides.headerSplit, 'SPLIT', (v) => {
        curOverrides.headerSplit = v;
        if (targetKey === 'splits') {
          const el = document.getElementById('textTabSplitHeaderSplit');
          if (el) el.value = v;
        }
      });
      addField('headerTime', 'Column Header: Time', curOverrides.headerTime, 'TIME', (v) => {
        curOverrides.headerTime = v;
        if (targetKey === 'splits') {
          const el = document.getElementById('textTabSplitHeaderTime');
          if (el) el.value = v;
        }
      });
      addField('headerPace', 'Column Header: Pace', curOverrides.headerPace, 'PACE', (v) => {
        curOverrides.headerPace = v;
        if (targetKey === 'splits') {
          const el = document.getElementById('textTabSplitHeaderPace');
          if (el) el.value = v;
        }
      });
      addField('headerDelta', 'Column Header: +/- Delta', curOverrides.headerDelta, '+/-', (v) => {
        curOverrides.headerDelta = v;
        if (targetKey === 'splits') {
          const el = document.getElementById('textTabSplitHeaderDelta');
          if (el) el.value = v;
        }
      });
      addField('headerHr', 'Column Header: Avg HR', curOverrides.headerHr, 'AVG HR', (v) => {
        curOverrides.headerHr = v;
        if (targetKey === 'splits') {
          const el = document.getElementById('textTabSplitHeaderHr');
          if (el) el.value = v;
        }
      });
      addField('headerElev', 'Column Header: Elevation', curOverrides.headerElev, 'ELEV', (v) => {
        curOverrides.headerElev = v;
        if (targetKey === 'splits') {
          const el = document.getElementById('textTabSplitHeaderElev');
          if (el) el.value = v;
        }
      });
    } else if (cat === 'splitHighlight') {
      const curSHTmpl = instOpts.splitHighlightDesign || state.config.splitHighlightDesign || 'spotlight';

      addField('title', 'Spotlight Card Title', curOverrides.title, 'FASTEST SPLIT', (v) => {
        curOverrides.title = v;
      });
      addField('label', 'Split KM Label', curOverrides.label, 'KM 5', (v) => {
        curOverrides.label = v;
      });
      addField('val', 'Pace / Time Readout', curOverrides.pace || curOverrides.val, '4:12 /km', (v) => {
        curOverrides.pace = v;
        curOverrides.val = v;
      });
      addField('note', 'Subtitle / Comparison Note', curOverrides.note, '+12s faster than average', (v) => {
        curOverrides.note = v;
      });

      if (curSHTmpl === 'leaderboard') {
        addField('trophyBanner', 'Trophy Banner Tag', curOverrides.trophyBanner, '🏆 PERSONAL RECORD', (v) => {
          curOverrides.trophyBanner = v;
        });
      } else if (curSHTmpl === 'cyber') {
        addField('termPrompt', 'Terminal Prompt Tag', curOverrides.termPrompt, '> QUERY: FASTEST_SPLIT', (v) => {
          curOverrides.termPrompt = v;
        });
      }
    } else if (cat === 'metrics') {
      addField('distance', 'Distance Label', curOverrides.distance || (targetKey === 'metrics' ? state.config.labelDistance : '') || 'DISTANCE', 'DISTANCE', (v) => {
        curOverrides.distance = v;
        if (targetKey === 'metrics') {
          state.config.labelDistance = v;
          const el = document.getElementById('customLabelDistance');
          if (el) el.value = v;
        }
      });
      addField('time', 'Moving Time Label', curOverrides.time || (targetKey === 'metrics' ? state.config.labelTime : '') || 'TIME', 'TIME', (v) => {
        curOverrides.time = v;
        if (targetKey === 'metrics') {
          state.config.labelTime = v;
          const el = document.getElementById('customLabelTime');
          if (el) el.value = v;
        }
      });
      addField('pace', 'Avg Pace Label', curOverrides.pace || (targetKey === 'metrics' ? state.config.labelPace : '') || 'AVG PACE', 'AVG PACE', (v) => {
        curOverrides.pace = v;
        if (targetKey === 'metrics') {
          state.config.labelPace = v;
          const el = document.getElementById('customLabelPace');
          if (el) el.value = v;
        }
      });
      addField('hr', 'Avg HR Label', curOverrides.hr || (targetKey === 'metrics' ? state.config.labelHr : '') || 'AVG HR', 'AVG HR', (v) => {
        curOverrides.hr = v;
        if (targetKey === 'metrics') {
          state.config.labelHr = v;
          const el = document.getElementById('customLabelHr');
          if (el) el.value = v;
        }
      });
      addField('elevation', 'Elevation Gain Label', curOverrides.elevation || (targetKey === 'metrics' ? state.config.labelElevation : '') || 'ELEV GAIN', 'ELEV GAIN', (v) => {
        curOverrides.elevation = v;
        if (targetKey === 'metrics') {
          state.config.labelElevation = v;
          const el = document.getElementById('customLabelElevation');
          if (el) el.value = v;
        }
      });
      addField('cadence', 'Cadence Label', curOverrides.cadence || (targetKey === 'metrics' ? state.config.labelCadence : '') || 'CADENCE', 'CADENCE', (v) => {
        curOverrides.cadence = v;
        if (targetKey === 'metrics') {
          state.config.labelCadence = v;
          const el = document.getElementById('customLabelCadence');
          if (el) el.value = v;
        }
      });
      addField('calories', 'Calories Label', curOverrides.calories || (targetKey === 'metrics' ? state.config.labelCalories : '') || 'CALORIES', 'CALORIES', (v) => {
        curOverrides.calories = v;
        if (targetKey === 'metrics') {
          state.config.labelCalories = v;
          const el = document.getElementById('customLabelCalories');
          if (el) el.value = v;
        }
      });
      addField('bestPace', 'Best Pace Label', curOverrides.bestPace || (targetKey === 'metrics' ? state.config.labelBestPace : '') || 'BEST PACE', 'BEST PACE', (v) => {
        curOverrides.bestPace = v;
        if (targetKey === 'metrics') {
          state.config.labelBestPace = v;
        }
      });
    } else if (cat === 'paceGraph') {
      const curPaceTmpl = instOpts.paceGraphDesign || state.config.paceGraphDesign || 'area';
      addField('title', 'Pace Graph Title', curOverrides.title, 'PACE PROFILE', (v) => {
        curOverrides.title = v;
        if (targetKey === 'paceGraph') {
          const el = document.getElementById('textTabPaceGraphTitle');
          if (el) el.value = v;
        }
      });
      addField('stat', 'Pace Stat Pill Readout', curOverrides.stat, 'BEST: 4:02', (v) => {
        curOverrides.stat = v;
      });
      addField('min', 'Min Pace Label', curOverrides.min, 'MIN', (v) => {
        curOverrides.min = v;
      });
      addField('avg', 'Avg Pace Label', curOverrides.avg, 'AVG', (v) => {
        curOverrides.avg = v;
      });
      addField('max', 'Max Pace Label', curOverrides.max, 'MAX', (v) => {
        curOverrides.max = v;
      });
      if (curPaceTmpl === 'cyber-pulse') {
        addField('speedPulseTag', 'Speed Pulse HUD Tag', curOverrides.speedPulseTag, '⚡ SPEED_PULSE', (v) => {
          curOverrides.speedPulseTag = v;
        });
      }
    } else if (cat === 'hrGraph') {
      const curHrTmpl = instOpts.hrGraphDesign || state.config.hrGraphDesign || 'filled-area';
      addField('title', 'HR Graph Title', curOverrides.title, 'HEART RATE ZONES', (v) => {
        curOverrides.title = v;
        if (targetKey === 'hrGraph') {
          const el = document.getElementById('textTabHrGraphTitle');
          if (el) el.value = v;
        }
      });
      addField('stat', 'HR Stat Pill Readout', curOverrides.stat, 'PEAK: 178 BPM', (v) => {
        curOverrides.stat = v;
      });
      addField('min', 'Min HR Label', curOverrides.min, 'MIN', (v) => {
        curOverrides.min = v;
      });
      addField('avg', 'Avg HR Label', curOverrides.avg, 'AVG', (v) => {
        curOverrides.avg = v;
      });
      addField('max', 'Max HR Label', curOverrides.max, 'MAX', (v) => {
        curOverrides.max = v;
      });
      if (curHrTmpl === 'centered-cardiac-halo') {
        addField('cardiacHaloTag', 'Cardiac Halo Tag', curOverrides.cardiacHaloTag, '❤️ CARDIAC', (v) => {
          curOverrides.cardiacHaloTag = v;
        });
      }
    } else if (cat === 'elevation') {
      const curElevTmpl = instOpts.elevationDesign || state.config.elevationDesign || 'area';
      addField('title', 'Elevation Profile Title', curOverrides.title, 'ELEVATION PROFILE', (v) => {
        curOverrides.title = v;
        if (targetKey === 'elevation') {
          const el = document.getElementById('textTabElevationTitle');
          if (el) el.value = v;
        }
      });
      addField('stat', 'Elevation Stat Pill', curOverrides.stat, '+210m GAIN', (v) => {
        curOverrides.stat = v;
      });
      addField('min', 'Min Elevation Label', curOverrides.min, 'MIN 0m', (v) => {
        curOverrides.min = v;
      });
      addField('max', 'Max Elevation Label', curOverrides.max, 'MAX 150m', (v) => {
        curOverrides.max = v;
      });
      addField('gain', 'Total Gain Label', curOverrides.gain, 'GAIN +210m', (v) => {
        curOverrides.gain = v;
      });
      if (curElevTmpl === 'contour') {
        addField('summitBadge', 'Summit Badge Tag', curOverrides.summitBadge, '▲ SUMMIT: 150m', (v) => {
          curOverrides.summitBadge = v;
        });
      }
    } else if (cat === 'hrBadge') {
      addField('label', 'Badge Label', curOverrides.label, 'AVG HEART RATE', (v) => {
        curOverrides.label = v;
        if (targetKey === 'hrBadge') {
          const el = document.getElementById('textTabHrBadgeLabel');
          if (el) el.value = v;
        }
      });
      addField('unit', 'Unit', curOverrides.unit, 'BPM', (v) => {
        curOverrides.unit = v;
        if (targetKey === 'hrBadge') {
          const el = document.getElementById('textTabHrBadgeUnit');
          if (el) el.value = v;
        }
      });
      addField('peak', 'Peak HR Summary', curOverrides.peak, 'MAX 178 BPM', (v) => {
        curOverrides.peak = v;
      });
      addField('zone', 'Zone / Intensity Tag', curOverrides.zone, 'THRESHOLD / ZONE 4', (v) => {
        curOverrides.zone = v;
      });
    } else if (cat === 'hrZones') {
      addField('title', 'Zones Title', curOverrides.title, 'HEART RATE ZONES', (v) => {
        curOverrides.title = v;
      });
      addField('z1', 'Zone 1 Label', curOverrides.z1, 'Z1 Easy', (v) => { curOverrides.z1 = v; });
      addField('z2', 'Zone 2 Label', curOverrides.z2, 'Z2 Aerobic', (v) => { curOverrides.z2 = v; });
      addField('z3', 'Zone 3 Label', curOverrides.z3, 'Z3 Tempo', (v) => { curOverrides.z3 = v; });
      addField('z4', 'Zone 4 Label', curOverrides.z4, 'Z4 Threshold', (v) => { curOverrides.z4 = v; });
      addField('z5', 'Zone 5 Label', curOverrides.z5, 'Z5 Anaerobic', (v) => { curOverrides.z5 = v; });
    } else if (cat === 'brand') {
      const defBrand = targetKey === 'brand' ? (state.config.customWatermark || '⚡ RUNOVERLAY') : '⚡ RUNOVERLAY';
      addField('text', 'Brand / Watermark Text', curOverrides.text || defBrand, '⚡ RUNOVERLAY', (v) => {
        curOverrides.text = v;
        if (targetKey === 'brand') {
          state.config.customWatermark = v;
          const el1 = document.getElementById('textTabWatermark');
          const el2 = document.getElementById('textTabBrandWatermarkText');
          if (el1) el1.value = v;
          if (el2) el2.value = v;
        }
      });
      addField('subtext', 'Sub-brand / Motto', curOverrides.subtext, '#NeverStopRunning', (v) => {
        curOverrides.subtext = v;
      });
    } else if (cat === 'map') {
      addField('title', 'Map Title / Tag', curOverrides.title, 'GPS ROUTE', (v) => {
        curOverrides.title = v;
      });
      addField('caption', 'Polaroid Bottom Caption', curOverrides.caption, 'JAKARTA, INDONESIA', (v) => {
        curOverrides.caption = v;
      });
    } else {
      container.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); padding:6px 0;">This graphic element does not have editable text labels.</div>';
    }
  };

  elSelect.addEventListener('change', () => {
    window.syncInspectorWithSelectedElement(elSelect.value);
  });

  const inspTmplSelect = document.getElementById('inspectorTemplateSelect');
  if (inspTmplSelect) {
    inspTmplSelect.addEventListener('change', (e) => {
      const targetKey = getActiveKey();
      const cat = getWidgetCategory(targetKey);
      const tmplCfg = WIDGET_TEMPLATE_OPTIONS[cat];
      if (!tmplCfg) return;
      pushUndoSnapshot();
      const val = e.target.value;
      const extraInst = state.config.extraWidgetInstances?.find((w) => w.id === targetKey);
      if (extraInst) {
        if (!extraInst.options) extraInst.options = {};
        extraInst.options[tmplCfg.designKey] = val;
        if (cat === 'header') {
          extraInst.options.headerTemplate = val;
          extraInst.options.headerDesign = val;
        }
        window.renderExtraWidgetsUI();
      } else {
        state.config[tmplCfg.designKey] = val;
        if (cat === 'header') {
          state.config.headerTemplate = val;
          state.config.headerDesign = val;
        }
        if (tmplCfg.mainSelectId) {
          const mainSel = document.getElementById(tmplCfg.mainSelectId);
          if (mainSel) mainSel.value = val;
        }
      }
      triggerRender();
      window.syncInspectorWithSelectedElement(targetKey);
      showToast(`Set ${extraInst ? extraInst.name : cat} template to ${val}`);
    });
  }

  const inspExtraFieldSelect = document.getElementById('inspectorExtraFieldSelect');
  if (inspExtraFieldSelect) {
    inspExtraFieldSelect.addEventListener('change', (e) => {
      const targetKey = getActiveKey();
      const cat = getWidgetCategory(targetKey);
      const val = e.target.value;
      const extraInst = state.config.extraWidgetInstances?.find((w) => w.id === targetKey);
      pushUndoSnapshot();
      if (cat === 'hero') {
        if (extraInst) {
          if (!extraInst.options) extraInst.options = {};
          extraInst.options.heroMetric = val;
          const idx = extraInst.id.split('_')[1] || '2';
          extraInst.name = `${WIDGET_CATEGORIES.hero.name} #${idx} (${val.toUpperCase()})`;
          window.renderExtraWidgetsUI();
          window.refreshInspectorElementDropdown();
        } else {
          state.config.heroMetric = val;
          const sel = document.getElementById('heroMetricSelect');
          if (sel) sel.value = val;
        }
      } else if (cat === 'splitHighlight') {
        if (extraInst) {
          if (!extraInst.options) extraInst.options = {};
          extraInst.options.highlightSplitTarget = val;
          window.renderExtraWidgetsUI();
        } else {
          state.config.highlightSplitTarget = val;
        }
      }
      triggerRender();
      window.syncInspectorWithSelectedElement(targetKey);
      showToast(`Updated option to ${val}`);
    });
  }

  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      const st = getStyleObj();
      st.fontFamily = e.target.value;
      triggerRender();
    });
  }

  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (sizeInput) sizeInput.value = val;
      if (sizeVal) sizeVal.textContent = `${val}%`;
      const st = getStyleObj();
      st.fontSizeScale = val;
      triggerRender();
    });
  }

  if (sizeInput) {
    const handleManualSize = (e) => {
      const val = Math.max(10, Math.min(500, parseInt(e.target.value, 10) || 100));
      if (sizeSlider) sizeSlider.value = Math.min(300, Math.max(30, val));
      if (sizeVal) sizeVal.textContent = `${val}%`;
      const st = getStyleObj();
      st.fontSizeScale = val;
      triggerRender();
    };
    sizeInput.addEventListener('input', handleManualSize);
    sizeInput.addEventListener('change', handleManualSize);
  }

  if (colorInput) {
    colorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (colorHex) colorHex.value = val;
      const st = getStyleObj();
      st.color = val;
      triggerRender();
    });
  }

  if (colorHex) {
    colorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const st = getStyleObj();
      st.color = val;
      if (val && val.startsWith('#') && (val.length === 7 || val.length === 4) && colorInput) {
        colorInput.value = val;
      }
      triggerRender();
    });
  }

  if (accentInput) {
    accentInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (accentHex) accentHex.value = val;
      const st = getStyleObj();
      st.accentColor = val;
      triggerRender();
    });
  }

  if (accentHex) {
    accentHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const st = getStyleObj();
      st.accentColor = val;
      if (val && val.startsWith('#') && (val.length === 7 || val.length === 4) && accentInput) {
        accentInput.value = val;
      }
      triggerRender();
    });
  }

  // Quick Color Swatches
  const colorPills = document.querySelectorAll('.inspector-color-pill');
  colorPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const target = pill.dataset.target; // 'color' or 'accent'
      const color = pill.dataset.color;
      const st = getStyleObj();
      if (target === 'color') {
        st.color = color;
        if (colorHex) colorHex.value = color;
        if (colorInput && color.startsWith('#')) colorInput.value = color;
      } else {
        st.accentColor = color;
        if (accentHex) accentHex.value = color;
        if (accentInput && color.startsWith('#')) accentInput.value = color;
      }
      triggerRender();
    });
  });

  if (alignGrid) {
    const alignBtns = alignGrid.querySelectorAll('button');
    alignBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        alignBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const st = getStyleObj();
        st.textAlign = btn.dataset.align;
        triggerRender();
      });
    });
  }

  if (cardStyleSelect) {
    cardStyleSelect.addEventListener('change', (e) => {
      const st = getStyleObj();
      st.cardStyle = e.target.value;
      triggerRender();
    });
  }

    if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (opacityVal) opacityVal.textContent = `${val}%`;
      const st = getStyleObj();
      st.opacity = val;
      triggerRender();
    });
  }

  // Inspector Widget-level Rotation Controls
  const inspRotSlider = document.getElementById('inspectorWidgetRotationSlider');
  const inspRotInput = document.getElementById('inspectorWidgetRotationInput');
  const inspRotVal = document.getElementById('inspectorWidgetRotationVal');
  const inspResetRotBtn = document.getElementById('inspectorWidgetResetRotBtn');

  const onInspWidgetRotChange = (deg, pushHistory = false) => {
    const key = getActiveKey();
    if (!key) return;
    if (pushHistory) pushUndoSnapshot();
    const clamped = Math.max(-180, Math.min(180, Math.round(deg)));
    const st = getStyleObj();
    st.rotation = clamped;
    if (!state.config.widgetPositions) state.config.widgetPositions = {};
    if (!state.config.widgetPositions[key]) {
      const b = renderer.widgetBounds ? renderer.widgetBounds[key] : null;
      if (b) state.config.widgetPositions[key] = { ...b };
    }
    if (state.config.widgetPositions[key]) {
      state.config.widgetPositions[key].rotation = clamped;
    }

    if (inspRotSlider) inspRotSlider.value = clamped;
    if (inspRotInput) inspRotInput.value = clamped;
    if (inspRotVal) inspRotVal.textContent = `${clamped}°`;

    const wTabSlider = document.getElementById('widgetRotationSlider');
    const wTabInput = document.getElementById('widgetRotationInput');
    const wTabVal = document.getElementById('widgetRotationVal');
    if (wTabSlider) wTabSlider.value = clamped;
    if (wTabInput) wTabInput.value = clamped;
    if (wTabVal) wTabVal.textContent = `${clamped}°`;

    triggerRender();
    updateGizmoBox();
  };

  if (inspRotSlider) {
    inspRotSlider.addEventListener('input', (e) => onInspWidgetRotChange(parseFloat(e.target.value) || 0));
    inspRotSlider.addEventListener('change', () => pushUndoSnapshot());
  }
  if (inspRotInput) {
    inspRotInput.addEventListener('input', (e) => onInspWidgetRotChange(parseFloat(e.target.value) || 0));
    inspRotInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (inspResetRotBtn) {
    inspResetRotBtn.addEventListener('click', () => {
      onInspWidgetRotChange(0, true);
      showToast('Reset widget rotation to 0°');
    });
  }

  // Inspector Widget-level Text Shadow Controls
  const inspShadowToggle = document.getElementById('inspectorTextShadowToggle');
  const inspShadowDetails = document.getElementById('inspectorTextShadowDetails');
  const inspShadowColorInput = document.getElementById('inspectorTextShadowColorInput');
  const inspShadowColorHex = document.getElementById('inspectorTextShadowColorHex');
  const inspShadowBlurSlider = document.getElementById('inspectorTextShadowBlurSlider');
  const inspShadowBlurVal = document.getElementById('inspectorTextShadowBlurVal');
  const inspShadowOffsetYSlider = document.getElementById('inspectorTextShadowOffsetYSlider');
  const inspShadowOffsetYVal = document.getElementById('inspectorTextShadowOffsetYVal');

  if (inspShadowToggle) {
    inspShadowToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const st = getStyleObj();
      if (!st.textShadow) st.textShadow = { enabled: false, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      st.textShadow.enabled = e.target.checked;
      if (inspShadowDetails) inspShadowDetails.style.display = e.target.checked ? 'block' : 'none';
      triggerRender();
    });
  }
  if (inspShadowColorInput) {
    inspShadowColorInput.addEventListener('input', (e) => {
      const st = getStyleObj();
      if (!st.textShadow) st.textShadow = { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      st.textShadow.color = e.target.value;
      if (inspShadowColorHex) inspShadowColorHex.value = e.target.value;
      triggerRender();
    });
    inspShadowColorInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (inspShadowColorHex) {
    inspShadowColorHex.addEventListener('input', (e) => {
      const st = getStyleObj();
      if (!st.textShadow) st.textShadow = { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      st.textShadow.color = e.target.value;
      if (e.target.value.startsWith('#') && inspShadowColorInput) inspShadowColorInput.value = e.target.value;
      triggerRender();
    });
    inspShadowColorHex.addEventListener('change', () => pushUndoSnapshot());
  }
  if (inspShadowBlurSlider) {
    inspShadowBlurSlider.addEventListener('input', (e) => {
      const st = getStyleObj();
      if (!st.textShadow) st.textShadow = { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      st.textShadow.blur = parseInt(e.target.value, 10);
      if (inspShadowBlurVal) inspShadowBlurVal.textContent = `${e.target.value}px`;
      triggerRender();
    });
    inspShadowBlurSlider.addEventListener('change', () => pushUndoSnapshot());
  }
  if (inspShadowOffsetYSlider) {
    inspShadowOffsetYSlider.addEventListener('input', (e) => {
      const st = getStyleObj();
      if (!st.textShadow) st.textShadow = { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      st.textShadow.offsetY = parseInt(e.target.value, 10);
      if (inspShadowOffsetYVal) inspShadowOffsetYVal.textContent = `${e.target.value}px`;
      triggerRender();
    });
    inspShadowOffsetYSlider.addEventListener('change', () => pushUndoSnapshot());
  }

  // Inspector Widget-level Text Outline Controls
  const inspOutlineToggle = document.getElementById('inspectorTextOutlineToggle');
  const inspOutlineDetails = document.getElementById('inspectorTextOutlineDetails');
  const inspOutlineColorInput = document.getElementById('inspectorTextOutlineColorInput');
  const inspOutlineColorHex = document.getElementById('inspectorTextOutlineColorHex');
  const inspOutlineWidthSlider = document.getElementById('inspectorTextOutlineWidthSlider');
  const inspOutlineWidthVal = document.getElementById('inspectorTextOutlineWidthVal');

  if (inspOutlineToggle) {
    inspOutlineToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const st = getStyleObj();
      if (!st.textOutline) st.textOutline = { enabled: false, color: '#000000', width: 2 };
      st.textOutline.enabled = e.target.checked;
      if (inspOutlineDetails) inspOutlineDetails.style.display = e.target.checked ? 'block' : 'none';
      triggerRender();
    });
  }
  if (inspOutlineColorInput) {
    inspOutlineColorInput.addEventListener('input', (e) => {
      const st = getStyleObj();
      if (!st.textOutline) st.textOutline = { enabled: true, color: '#000000', width: 2 };
      st.textOutline.color = e.target.value;
      if (inspOutlineColorHex) inspOutlineColorHex.value = e.target.value;
      triggerRender();
    });
    inspOutlineColorInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (inspOutlineColorHex) {
    inspOutlineColorHex.addEventListener('input', (e) => {
      const st = getStyleObj();
      if (!st.textOutline) st.textOutline = { enabled: true, color: '#000000', width: 2 };
      st.textOutline.color = e.target.value;
      if (e.target.value.startsWith('#') && inspOutlineColorInput) inspOutlineColorInput.value = e.target.value;
      triggerRender();
    });
    inspOutlineColorHex.addEventListener('change', () => pushUndoSnapshot());
  }
  if (inspOutlineWidthSlider) {
    inspOutlineWidthSlider.addEventListener('input', (e) => {
      const st = getStyleObj();
      if (!st.textOutline) st.textOutline = { enabled: true, color: '#000000', width: 2 };
      st.textOutline.width = parseFloat(e.target.value);
      if (inspOutlineWidthVal) inspOutlineWidthVal.textContent = `${e.target.value}px`;
      triggerRender();
    });
    inspOutlineWidthSlider.addEventListener('change', () => pushUndoSnapshot());
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const key = getActiveKey();
      if (state.config.elementStyles && state.config.elementStyles[key]) {
        delete state.config.elementStyles[key];
      }
      window.syncInspectorWithSelectedElement(key);
      triggerRender();
      showToast(`Reset style for ${key}`);
    });
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      state.config.elementStyles = {};
      state.config.widgetBgStyles = {};
      state.config.widgetElementOffsets = {};
      window.syncInspectorWithSelectedElement(getActiveKey());
      triggerRender();
      showToast('All element style overrides reset to default');
    });
  }

  // SubPart select change
  if (subPartSelect) {
    subPartSelect.addEventListener('change', (e) => {
      window.syncInspectorWithSelectedElement(getActiveKey(), e.target.value);
    });
  }

  // Background border bindings
  const bindBgSliderInput = (slider, input, key) => {
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (input) input.value = val;
        getBgObj()[key] = val;
        triggerRender();
      });
    }
    if (input) {
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        if (slider) slider.value = val;
        getBgObj()[key] = val;
        triggerRender();
      });
    }
  };

  bindBgSliderInput(bgWidthSlider, bgWidthInput, 'widthDelta');
  bindBgSliderInput(bgHeightSlider, bgHeightInput, 'heightDelta');
  bindBgSliderInput(bgOffsetXSlider, bgOffsetXInput, 'offsetX');
  bindBgSliderInput(bgOffsetYSlider, bgOffsetYInput, 'offsetY');
  bindBgSliderInput(bgRadiusSlider, bgRadiusInput, 'radius');
  bindBgSliderInput(bgBorderWidthSlider, bgBorderWidthInput, 'borderWidth');

  if (bgBorderColorInput) {
    bgBorderColorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (bgBorderColorHex) bgBorderColorHex.value = val;
      getBgObj().borderColor = val;
      triggerRender();
    });
  }
  if (bgBorderColorHex) {
    bgBorderColorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      getBgObj().borderColor = val;
      if (val && val.startsWith('#') && bgBorderColorInput) bgBorderColorInput.value = val;
      triggerRender();
    });
  }
  if (bgFillColorInput) {
    bgFillColorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (bgFillColorHex) bgFillColorHex.value = val;
      getBgObj().fillColor = val;
      triggerRender();
    });
  }
  if (bgFillColorHex) {
    bgFillColorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      getBgObj().fillColor = val;
      if (val && val.startsWith('#') && bgFillColorInput) bgFillColorInput.value = val;
      triggerRender();
    });
  }

  if (duplicateWidgetBtn) {
    duplicateWidgetBtn.addEventListener('click', () => {
      const curKey = elSelect ? elSelect.value : state.selectedWidget;
      if (curKey && curKey !== '__bg_photo__') {
        window.duplicateWidgetInstance(curKey);
      } else {
        showToast('Please select a widget to duplicate');
      }
    });
  }

  if (deleteInstanceBtn) {
    deleteInstanceBtn.addEventListener('click', () => {
      const curKey = elSelect ? elSelect.value : state.selectedWidget;
      if (curKey) {
        window.removeWidgetInstance(curKey);
      }
    });
  }

  if (resetBgBtn) {
    resetBgBtn.addEventListener('click', () => {
      const key = getActiveKey();
      if (state.config.widgetBgStyles && state.config.widgetBgStyles[key]) {
        delete state.config.widgetBgStyles[key];
      }
      window.syncInspectorWithSelectedElement(key, 'bg');
      triggerRender();
      showToast(`Reset background border for ${key}`);
    });
  }

  // Sub-element bindings
  const bindSubElemSliderInput = (slider, input, key) => {
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (input) input.value = val;
        getSubElemObj()[key] = val;
        triggerRender();
      });
    }
    if (input) {
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        if (slider) slider.value = val;
        getSubElemObj()[key] = val;
        triggerRender();
      });
    }
  };

  bindSubElemSliderInput(subElemXSlider, subElemXInput, 'x');
  bindSubElemSliderInput(subElemYSlider, subElemYInput, 'y');
  bindSubElemSliderInput(subElemZSlider, subElemZInput, 'z');

  // Sub-element Rotation Controls
  const subElemRotSlider = document.getElementById('inspectorSubElemRotationSlider');
  const subElemRotInput = document.getElementById('inspectorSubElemRotationInput');
  const subElemResetRotBtn = document.getElementById('inspectorSubElemResetRotBtn');

  if (subElemRotSlider) {
    subElemRotSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      if (subElemRotInput) subElemRotInput.value = val;
      getSubElemObj().rotation = val;
      triggerRender();
    });
    subElemRotSlider.addEventListener('change', () => pushUndoSnapshot());
  }
  if (subElemRotInput) {
    subElemRotInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      if (subElemRotSlider) subElemRotSlider.value = val;
      getSubElemObj().rotation = val;
      triggerRender();
    });
    subElemRotInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (subElemResetRotBtn) {
    subElemResetRotBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      getSubElemObj().rotation = 0;
      if (subElemRotSlider) subElemRotSlider.value = 0;
      if (subElemRotInput) subElemRotInput.value = 0;
      triggerRender();
      showToast('Reset item rotation to 0°');
    });
  }

  // Sub-element Text Shadow Controls
  const subShadowToggle = document.getElementById('inspectorSubElemShadowToggle');
  const subShadowDetails = document.getElementById('inspectorSubElemShadowDetails');
  const subShadowColorInput = document.getElementById('inspectorSubElemShadowColorInput');
  const subShadowBlurSlider = document.getElementById('inspectorSubElemShadowBlurSlider');
  const subShadowOffsetYSlider = document.getElementById('inspectorSubElemShadowOffsetYSlider');

  if (subShadowToggle) {
    subShadowToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const obj = getSubElemObj();
      if (!obj.textShadow) obj.textShadow = { enabled: false, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      obj.textShadow.enabled = e.target.checked;
      if (subShadowDetails) subShadowDetails.style.display = e.target.checked ? 'block' : 'none';
      triggerRender();
    });
  }
  if (subShadowColorInput) {
    subShadowColorInput.addEventListener('input', (e) => {
      const obj = getSubElemObj();
      if (!obj.textShadow) obj.textShadow = { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      obj.textShadow.color = e.target.value;
      triggerRender();
    });
    subShadowColorInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (subShadowBlurSlider) {
    subShadowBlurSlider.addEventListener('input', (e) => {
      const obj = getSubElemObj();
      if (!obj.textShadow) obj.textShadow = { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      obj.textShadow.blur = parseInt(e.target.value, 10);
      triggerRender();
    });
    subShadowBlurSlider.addEventListener('change', () => pushUndoSnapshot());
  }
  if (subShadowOffsetYSlider) {
    subShadowOffsetYSlider.addEventListener('input', (e) => {
      const obj = getSubElemObj();
      if (!obj.textShadow) obj.textShadow = { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      obj.textShadow.offsetY = parseInt(e.target.value, 10);
      triggerRender();
    });
    subShadowOffsetYSlider.addEventListener('change', () => pushUndoSnapshot());
  }

  // Sub-element Text Outline Controls
  const subOutlineToggle = document.getElementById('inspectorSubElemOutlineToggle');
  const subOutlineDetails = document.getElementById('inspectorSubElemOutlineDetails');
  const subOutlineColorInput = document.getElementById('inspectorSubElemOutlineColorInput');
  const subOutlineWidthSlider = document.getElementById('inspectorSubElemOutlineWidthSlider');
  const subOutlineWidthVal = document.getElementById('inspectorSubElemOutlineWidthVal');

  if (subOutlineToggle) {
    subOutlineToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const obj = getSubElemObj();
      if (!obj.textOutline) obj.textOutline = { enabled: false, color: '#000000', width: 2 };
      obj.textOutline.enabled = e.target.checked;
      if (subOutlineDetails) subOutlineDetails.style.display = e.target.checked ? 'block' : 'none';
      triggerRender();
    });
  }
  if (subOutlineColorInput) {
    subOutlineColorInput.addEventListener('input', (e) => {
      const obj = getSubElemObj();
      if (!obj.textOutline) obj.textOutline = { enabled: true, color: '#000000', width: 2 };
      obj.textOutline.color = e.target.value;
      triggerRender();
    });
    subOutlineColorInput.addEventListener('change', () => pushUndoSnapshot());
  }
  if (subOutlineWidthSlider) {
    subOutlineWidthSlider.addEventListener('input', (e) => {
      const obj = getSubElemObj();
      if (!obj.textOutline) obj.textOutline = { enabled: true, color: '#000000', width: 2 };
      obj.textOutline.width = parseFloat(e.target.value);
      if (subOutlineWidthVal) subOutlineWidthVal.textContent = `${e.target.value}px`;
      triggerRender();
    });
    subOutlineWidthSlider.addEventListener('change', () => pushUndoSnapshot());
  }

  if (subElemFontFamily) {
    subElemFontFamily.addEventListener('change', (e) => {
      pushUndoSnapshot();
      getSubElemObj().fontFamily = e.target.value;
      triggerRender();
    });
  }

  if (subElemSizeSlider) {
    subElemSizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 100;
      if (subElemSizeInput) subElemSizeInput.value = val;
      if (subElemSizeVal) subElemSizeVal.textContent = `${val}%`;
      getSubElemObj().scale = val;
      triggerRender();
    });
    subElemSizeSlider.addEventListener('change', () => pushUndoSnapshot());
  }

  if (subElemSizeInput) {
    subElemSizeInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 100;
      if (subElemSizeSlider) subElemSizeSlider.value = val;
      if (subElemSizeVal) subElemSizeVal.textContent = `${val}%`;
      getSubElemObj().scale = val;
      triggerRender();
    });
    subElemSizeInput.addEventListener('change', () => pushUndoSnapshot());
  }

  if (subElemTextInput) {
    subElemTextInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const key = getActiveKey();
      const part = subPartSelect ? subPartSelect.value : '';
      if (!state.config.widgetTextOverrides) state.config.widgetTextOverrides = {};
      if (!state.config.widgetTextOverrides[key]) state.config.widgetTextOverrides[key] = {};
      state.config.widgetTextOverrides[key][part] = val;
      if (key === 'header') {
        if (part === 'title') state.config.customTitle = val;
        if (part === 'subtitle') state.config.customSubtitle = val;
        if (part === 'runner') state.config.runnerName = val;
        if (part === 'location') state.config.locationName = val;
        if (part === 'weather') state.config.weatherText = val;
      } else if (key === 'splits') {
        if (part === 'title') state.config.splitCustomTitle = val;
      }
      triggerRender();
    });
  }

  if (subElemColorInput) {
    subElemColorInput.addEventListener('input', (e) => {
      pushUndoSnapshot();
      const val = e.target.value;
      if (subElemColorHex) subElemColorHex.value = val;
      getSubElemObj().color = val;
      triggerRender();
    });
  }

  if (subElemColorHex) {
    subElemColorHex.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const obj = getSubElemObj();
      if (!val || val.toLowerCase() === 'default' || val.toLowerCase() === 'inherit') {
        obj.color = 'default';
      } else {
        obj.color = val;
        if (val.startsWith('#') && (val.length === 7 || val.length === 4) && subElemColorInput) {
          subElemColorInput.value = val;
        }
      }
      triggerRender();
    });
    subElemColorHex.addEventListener('change', () => pushUndoSnapshot());
  }

  if (subElemColorResetBtn) {
    subElemColorResetBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      const obj = getSubElemObj();
      obj.color = 'default';
      if (subElemColorHex) subElemColorHex.value = '';
      if (subElemColorInput) subElemColorInput.value = '#ffffff';
      triggerRender();
      showToast('Item text color reset to inherit default');
    });
  }

  if (resetSubElemBtn) {
    resetSubElemBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      const key = getActiveKey();
      const part = subPartSelect ? subPartSelect.value : '';
      if (state.config.widgetElementOffsets && state.config.widgetElementOffsets[key] && state.config.widgetElementOffsets[key][part]) {
        delete state.config.widgetElementOffsets[key][part];
      }
      if (key === 'header' && part === 'location') {
        state.config.headerShowLocation = true;
        state.config.showLocation = true;
        ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.checked = true;
        });
      }
      window.syncInspectorWithSelectedElement(key, part);
      triggerRender();
      showToast(`Reset ${part} in ${key} to default`);
    });
  }

  const restoreTemplateBtn = document.getElementById('inspectorRestoreTemplateBtn');
  if (restoreTemplateBtn) {
    restoreTemplateBtn.addEventListener('click', () => {
      restoreWidgetToTemplate(getActiveKey());
    });
  }

  if (deleteElementBtn) {
    deleteElementBtn.addEventListener('click', () => {
      const key = getActiveKey();
      if (window.isElementDeleted(key, 'widget')) {
        window.reintroduceElement(key, 'widget');
      } else {
        deleteSelectedTarget(key);
      }
    });
  }

  if (deleteBgBtn) {
    deleteBgBtn.addEventListener('click', () => {
      const key = getActiveKey();
      if (window.isElementDeleted(key, 'bg')) {
        window.reintroduceElement(key, 'bg');
      } else {
        deleteSelectedTarget(key + '_bg');
      }
    });
  }

  const bgShowBgToggle = document.getElementById('inspectorBgShowBgToggle');
  if (bgShowBgToggle) {
    bgShowBgToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const bg = getBgObj();
      bg.showBg = e.target.checked;
      if (e.target.checked) bg.textOnly = false;
      triggerRender();
    });
  }

  const bgShowBorderToggle = document.getElementById('inspectorBgShowBorderToggle');
  if (bgShowBorderToggle) {
    bgShowBorderToggle.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const bg = getBgObj();
      bg.showBorder = e.target.checked;
      if (e.target.checked) bg.textOnly = false;
      triggerRender();
    });
  }

  const bgTextOnlyBtn = document.getElementById('inspectorBgTextOnlyBtn');
  if (bgTextOnlyBtn) {
    bgTextOnlyBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      const key = getActiveKey();
      const bg = getBgObj();
      bg.textOnly = true;
      bg.showBg = false;
      bg.showBorder = false;
      const st = getStyleObj();
      st.cardStyle = 'text-only';
      if (cardStyleSelect) cardStyleSelect.value = 'text-only';
      if (bgShowBgToggle) bgShowBgToggle.checked = false;
      if (bgShowBorderToggle) bgShowBorderToggle.checked = false;
      triggerRender();
      showToast(`Set ${key} to Text Only`);
    });
  }

  if (deleteSubElemBtn) {
    deleteSubElemBtn.addEventListener('click', () => {
      const key = getActiveKey();
      const part = subPartSelect ? subPartSelect.value : '';
      if (!part || part === 'widget') {
        if (window.isElementDeleted(key, 'widget')) {
          window.reintroduceElement(key, 'widget');
        } else {
          deleteSelectedTarget(key);
        }
      } else if (part === 'bg') {
        if (window.isElementDeleted(key, 'bg')) {
          window.reintroduceElement(key, 'bg');
        } else {
          deleteSelectedTarget(key + '_bg');
        }
      } else {
        if (window.isElementDeleted(key, part)) {
          window.reintroduceElement(key, part);
        } else {
          pushUndoSnapshot();
          const sub = getSubElemObj();
          sub.hidden = true;
          sub.visible = false;
          if (key === 'header' && part === 'location') {
            state.config.headerShowLocation = false;
            state.config.showLocation = false;
            ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((id) => {
              const el = document.getElementById(id);
              if (el) el.checked = false;
            });
          }
          triggerRender();
          window.syncInspectorWithSelectedElement(key, part);
          showToast(`Deleted / hid ${part} in ${key}`);
        }
      }
    });
  }

  // Dedicated Reintroduce Buttons
  if (reintroduceBtn) {
    reintroduceBtn.addEventListener('click', () => {
      window.reintroduceAllElements(getActiveKey());
    });
  }

  if (reintroduceBgBtn) {
    reintroduceBgBtn.addEventListener('click', () => {
      window.reintroduceElement(getActiveKey(), 'bg');
    });
  }

  if (reintroduceSubElemBtn) {
    reintroduceSubElemBtn.addEventListener('click', () => {
      const part = subPartSelect ? subPartSelect.value : '';
      if (part && part !== 'widget' && part !== 'bg') {
        window.reintroduceElement(getActiveKey(), part);
      }
    });
  }

  if (subElemBannerReintroduceBtn) {
    subElemBannerReintroduceBtn.addEventListener('click', () => {
      const part = subPartSelect ? subPartSelect.value : '';
      if (part && part !== 'widget' && part !== 'bg') {
        window.reintroduceElement(getActiveKey(), part);
      }
    });
  }

  if (widgetReintroduceBtn) {
    widgetReintroduceBtn.addEventListener('click', () => {
      window.reintroduceElement(getActiveKey(), 'widget');
    });
  }

  // Initial sync
  window.syncInspectorWithSelectedElement('header');
}

// ==========================================
// 8. TEXT & STICKERS CONTROLS
// ==========================================
function setupTextAndStickersControls() {
  // 1. Overlay Labels Synchronization
  const bindInput = (id, key) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        state.config[key] = e.target.value;
        // Synchronize twin inputs if any
        if (key === 'customTitle') {
          const a = document.getElementById('inputActivityTitle');
          const b = document.getElementById('textTabActivityTitle');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        } else if (key === 'runnerName') {
          const a = document.getElementById('inputRunnerName');
          const b = document.getElementById('textTabRunnerName');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        } else if (key === 'locationName') {
          const a = document.getElementById('inputLocationName');
          const b = document.getElementById('textTabLocationName');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        } else if (key === 'weatherText') {
          const a = document.getElementById('inputWeatherText');
          const b = document.getElementById('textTabWeatherText');
          if (a && a !== el) a.value = e.target.value;
          if (b && b !== el) b.value = e.target.value;
        }
        triggerRender();
      });
    }
  };

  bindInput('inputActivityTitle', 'customTitle');
  bindInput('textTabActivityTitle', 'customTitle');
  bindInput('inputRunnerName', 'runnerName');
  bindInput('textTabRunnerName', 'runnerName');
  bindInput('inputLocationName', 'locationName');
  bindInput('textTabLocationName', 'locationName');
  bindInput('inputWeatherText', 'weatherText');
  bindInput('textTabWeatherText', 'weatherText');
  bindInput('textTabSubtitle', 'customSubtitle');
  bindInput('textTabWatermark', 'customWatermark');

  // Header Location Visibility Toggles
  const bindHeaderLocToggle = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      pushUndoSnapshot();
      const val = e.target.checked;
      state.config.headerShowLocation = val;
      state.config.showLocation = val;
      if (!state.config.widgetElementOffsets) state.config.widgetElementOffsets = {};
      if (!state.config.widgetElementOffsets.header) state.config.widgetElementOffsets.header = {};
      if (!state.config.widgetElementOffsets.header.location) state.config.widgetElementOffsets.header.location = { x: 0, y: 0, z: 1 };
      state.config.widgetElementOffsets.header.location.hidden = !val;
      state.config.widgetElementOffsets.header.location.visible = val;

      ['toggleHeaderLocation', 'textTabToggleHeaderLocation', 'headerShowLocationToggle'].forEach((otherId) => {
        const otherEl = document.getElementById(otherId);
        if (otherEl && otherEl !== el) otherEl.checked = val;
      });
      triggerRender();
      showToast(val ? 'Header location enabled' : 'Header location disabled');
    });
  };
  bindHeaderLocToggle('toggleHeaderLocation');
  bindHeaderLocToggle('textTabToggleHeaderLocation');
  bindHeaderLocToggle('headerShowLocationToggle');

  // Custom Metric Labels
  bindInput('customLabelDistance', 'labelDistance');
  bindInput('customLabelTime', 'labelTime');
  bindInput('customLabelPace', 'labelPace');
  bindInput('customLabelBestPace', 'labelBestPace');
  bindInput('customLabelHr', 'labelHr');
  bindInput('customLabelElevation', 'labelElevation');
  bindInput('customLabelCadence', 'labelCadence');
  bindInput('customLabelCalories', 'labelCalories');

  // Universal Widget Text Customization Overrides (New User Requirement)
  const bindOverride = (id, widgetKey, fieldKey) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = (state.config.widgetTextOverrides[widgetKey] && state.config.widgetTextOverrides[widgetKey][fieldKey]) || '';
      el.addEventListener('input', (e) => {
        if (!state.config.widgetTextOverrides[widgetKey]) state.config.widgetTextOverrides[widgetKey] = {};
        state.config.widgetTextOverrides[widgetKey][fieldKey] = e.target.value;
        triggerRender();
        // If current inspector is showing this widget, re-sync inspector text
        const elSelect = document.getElementById('inspectorElementSelect');
        if (elSelect && elSelect.value === widgetKey && window.syncInspectorWithSelectedElement) {
          window.syncInspectorWithSelectedElement(widgetKey);
        }
      });
    }
  };

  bindOverride('textTabHeroLabel', 'hero', 'label');
  bindOverride('textTabHeroValue', 'hero', 'value');
  bindOverride('textTabHeroUnit', 'hero', 'unit');
  bindOverride('textTabPaceGraphTitle', 'paceGraph', 'title');
  bindOverride('textTabHrGraphTitle', 'hrGraph', 'title');
  bindOverride('textTabElevationTitle', 'elevation', 'title');
  bindOverride('textTabHrBadgeLabel', 'hrBadge', 'label');
  bindOverride('textTabHrBadgeUnit', 'hrBadge', 'unit');
  bindOverride('textTabBrandWatermarkText', 'brand', 'text');
  bindOverride('textTabSplitHeaderSplit', 'splits', 'headerSplit');
  bindOverride('textTabSplitHeaderTime', 'splits', 'headerTime');
  bindOverride('textTabSplitHeaderPace', 'splits', 'headerPace');
  bindOverride('textTabSplitHeaderDelta', 'splits', 'headerDelta');
  bindOverride('textTabSplitHeaderHr', 'splits', 'headerHr');
  bindOverride('textTabSplitHeaderMaxHr', 'splits', 'headerMaxHr');
  bindOverride('textTabSplitHeaderCad', 'splits', 'headerCad');
  bindOverride('textTabSplitHeaderElev', 'splits', 'headerElev');

  // 2. Add Custom Text Button
  const addBtn = document.getElementById('addCustomTextBtn');
  const quickAddBtn = document.getElementById('quickAddTextBtn');

  const addTextAction = (initialText = 'NEW STICKER 🔥', bgStyle = 'pill') => {
    const id = 'text_' + Date.now();
    const newItem = {
      id,
      text: initialText,
      fontSize: 34,
      fontFamily: 'athletic',
      fontWeight: 'bold',
      color: '#ffffff',
      bgStyle: bgStyle,
      bgColor: 'rgba(0, 0, 0, 0.78)',
      borderColor: state.config.customAccentColor || '#ccff00',
      align: 'center',
    };
    state.config.customTexts.push(newItem);
    state.selectedWidget = id;
    renderCustomTextsList();
    triggerRender();
    showToast(`Added sticker: "${initialText}"`);
  };

  if (addBtn) addBtn.addEventListener('click', () => addTextAction('NEW STICKER 🔥', 'pill'));
  if (quickAddBtn) quickAddBtn.addEventListener('click', () => addTextAction('NEW STICKER 🔥', 'pill'));

  // Preset Sticker Chips
  const presets = {
    pb: { text: 'PERSONAL BEST! 🏆', bgStyle: 'pill' },
    longrun: { text: 'SUNDAY LONG RUN ☀️', bgStyle: 'card' },
    tempo: { text: 'TEMPO EFFORT 🔥', bgStyle: 'tape' },
    intervals: { text: '400M REPEATS ⚡', bgStyle: 'neon-box' },
    marathon: { text: 'MARATHON READY 🏅', bgStyle: 'pill' },
    trail: { text: 'TRAIL ADVENTURE ⛰️', bgStyle: 'card' },
    quote: { text: 'BEAT YESTERDAY 🏃', bgStyle: 'pill' },
  };

  const presetBtns = document.querySelectorAll('.sticker-preset-btn');
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pKey = btn.dataset.preset;
      const p = presets[pKey] || { text: 'RUN STRONG 🔥', bgStyle: 'pill' };
      addTextAction(p.text, p.bgStyle);
    });
  });

  renderCustomTextsList();
}

function renderCustomTextsList() {
  const container = document.getElementById('customTextsList');
  if (!container) return;

  if (state.config.customTexts.length === 0) {
    container.innerHTML = '<div style="font-size:0.78rem; color:var(--text-muted); padding:6px 0;">No custom stickers added. Click above to add one!</div>';
    return;
  }

  container.innerHTML = '';
  state.config.customTexts.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = `custom-text-item ${state.selectedWidget === item.id ? 'active' : ''}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <input type="text" class="form-input custom-text-input" value="${item.text}" style="font-weight: 700; font-size: 0.88rem;">
        <button class="btn btn-secondary custom-text-del-btn" style="padding: 6px 10px; color: #ef4444;" title="Delete">🗑</button>
      </div>
      <div class="grid-3" style="gap: 6px;">
        <div>
          <label style="font-size: 0.68rem; color: var(--text-muted);">Size</label>
          <input type="number" class="form-input custom-text-size" value="${item.fontSize || 34}" min="16" max="140" step="2">
        </div>
        <div>
          <label style="font-size: 0.68rem; color: var(--text-muted);">Style</label>
          <select class="form-select custom-text-style" style="padding: 4px 6px; font-size: 0.72rem;">
            <option value="none" ${item.bgStyle === 'none' ? 'selected' : ''}>Transparent</option>
            <option value="pill" ${item.bgStyle === 'pill' ? 'selected' : ''}>Glass Pill</option>
            <option value="card" ${item.bgStyle === 'card' ? 'selected' : ''}>Glass Card</option>
            <option value="tape" ${item.bgStyle === 'tape' ? 'selected' : ''}>Athletic Tape</option>
            <option value="neon-box" ${item.bgStyle === 'neon-box' ? 'selected' : ''}>Neon Box</option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.68rem; color: var(--text-muted);">Color</label>
          <input type="color" class="custom-text-color" value="${item.color || '#ffffff'}" style="width: 100%; height: 28px; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; font-size: 0.72rem; background: rgba(0,0,0,0.25); padding: 4px 6px; border-radius: 4px;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: var(--text-muted); font-size: 0.68rem;">Rot:</span>
          <input type="number" class="form-input custom-text-rot" value="${typeof item.rotation === 'number' ? item.rotation : 0}" min="-180" max="180" step="1" style="width: 48px; padding: 1px 3px; font-size: 0.72rem; text-align: right;">
          <span style="color: var(--text-muted); font-size: 0.68rem;">°</span>
        </div>
        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-normal); margin-bottom: 0;">
          <input type="checkbox" class="custom-text-shadow-toggle" ${(item.textShadow && item.textShadow.enabled) ? 'checked' : ''}>
          <span>Shadow</span>
        </label>
        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-normal); margin-bottom: 0;">
          <input type="checkbox" class="custom-text-outline-toggle" ${(item.textOutline && item.textOutline.enabled) ? 'checked' : ''}>
          <span>Outline</span>
        </label>
      </div>
    `;

    // Row click selects widget
    row.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        selectWidget(item.id);
      }
    });

    // Listeners
    const textInput = row.querySelector('.custom-text-input');
    textInput.addEventListener('input', (e) => {
      item.text = e.target.value;
      triggerRender();
    });

    const sizeInput = row.querySelector('.custom-text-size');
    sizeInput.addEventListener('input', (e) => {
      item.fontSize = parseInt(e.target.value, 10) || 34;
      triggerRender();
    });

    const styleSelect = row.querySelector('.custom-text-style');
    styleSelect.addEventListener('change', (e) => {
      item.bgStyle = e.target.value;
      triggerRender();
    });

    const colorInput = row.querySelector('.custom-text-color');
    colorInput.addEventListener('input', (e) => {
      item.color = e.target.value;
      triggerRender();
    });

    const rotInput = row.querySelector('.custom-text-rot');
    rotInput.addEventListener('input', (e) => {
      item.rotation = parseInt(e.target.value, 10) || 0;
      triggerRender();
      if (state.selectedWidget === item.id) updateGizmoBox();
    });

    const shadowToggle = row.querySelector('.custom-text-shadow-toggle');
    shadowToggle.addEventListener('change', (e) => {
      if (!item.textShadow) item.textShadow = { enabled: false, color: '#000000', blur: 8, offsetX: 0, offsetY: 3 };
      item.textShadow.enabled = e.target.checked;
      triggerRender();
    });

    const outlineToggle = row.querySelector('.custom-text-outline-toggle');
    outlineToggle.addEventListener('change', (e) => {
      if (!item.textOutline) item.textOutline = { enabled: false, color: '#000000', width: 2 };
      item.textOutline.enabled = e.target.checked;
      triggerRender();
    });

    const delBtn = row.querySelector('.custom-text-del-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.config.customTexts.splice(index, 1);
      if (state.selectedWidget === item.id) state.selectedWidget = null;
      renderCustomTextsList();
      triggerRender();
      showToast('Deleted text sticker');
    });

    container.appendChild(row);
  });
}

// ==========================================
// 7. INTERACTIVE GIZMO CONTROLLER (DRAG & RESIZE)
// ==========================================
function setupGizmoController() {
  const toggleLayoutBtn = document.getElementById('toggleInteractiveLayoutBtn');
  const resetAllBtn = document.getElementById('resetAllLayoutBtn');
  const gizmoCenterBtn = document.getElementById('gizmoCenterBtn');
  const gizmoCloseBtn = document.getElementById('gizmoCloseBtn');

  if (toggleLayoutBtn) {
    toggleLayoutBtn.addEventListener('click', () => {
      state.isInteractiveLayout = !state.isInteractiveLayout;
      toggleLayoutBtn.classList.toggle('btn-toggle-active', state.isInteractiveLayout);
      toggleLayoutBtn.textContent = state.isInteractiveLayout ? '✋ Drag & Resize: ON' : '✋ Drag & Resize: OFF';
      if (!state.isInteractiveLayout) selectWidget(null);
      showToast(`Interactive layout ${state.isInteractiveLayout ? 'enabled' : 'disabled'}`);
    });
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.widgetPositions = {};
      state.config.widgetBgStyles = {};
      state.config.widgetElementOffsets = {};
      state.config.elementStyles = {};
      selectWidget(null);
      syncAllControlsWithConfig();
      triggerRender();
      showToast('All widgets reset to template default layout');
    });
  }

  if (gizmoCenterBtn) {
    gizmoCenterBtn.addEventListener('click', () => {
      if (state.selectedWidget === '__bg_photo__') {
        pushUndoSnapshot();
        state.config.photoPanX = 0;
        state.config.photoPanY = 0;
        syncPhotoSliders();
        triggerRender();
        showToast('Photo centered');
      } else if (state.selectedWidget) {
        pushUndoSnapshot();
        centerWidget(state.selectedWidget);
      }
    });
  }

  const gizmoRestoreBtn = document.getElementById('gizmoRestoreBtn');
  if (gizmoRestoreBtn) {
    gizmoRestoreBtn.addEventListener('click', () => {
      if (state.selectedWidget === '__bg_photo__') {
        pushUndoSnapshot();
        state.config.photoZoom = 1;
        state.config.photoPanX = 0;
        state.config.photoPanY = 0;
        state.config.photoFit = 'fit';
        syncPhotoSliders();
        triggerRender();
        showToast('Photo reset to default');
      } else if (state.selectedWidget) {
        restoreWidgetToTemplate(state.selectedWidget);
      }
    });
  }

  if (gizmoDeleteBtn) {
    gizmoDeleteBtn.addEventListener('click', () => {
      if (state.selectedWidget === '__bg_photo__') {
        pushUndoSnapshot();
        state.config.bgType = 'solid';
        selectWidget(null);
        syncAllControlsWithConfig();
        triggerRender();
        showToast('Background photo removed');
      } else if (state.selectedWidget) {
        deleteSelectedTarget(state.selectedWidget);
      }
    });
  }

  if (gizmoCloseBtn) {
    gizmoCloseBtn.addEventListener('click', () => selectWidget(null));
  }

  const gizmoSubPartSelect = document.getElementById('gizmoSubPartSelect');
  if (gizmoSubPartSelect) {
    gizmoSubPartSelect.addEventListener('change', (e) => {
      if (!state.selectedWidget) return;
      const baseKey = state.selectedWidget.replace(/_bg$/, '');
      if (e.target.value === 'border') {
        selectWidget(baseKey + '_bg');
      } else {
        selectWidget(baseKey);
      }
    });
  }

  const isPointInWidget = (px, py, b) => {
    if (!b) return false;
    const rot = (typeof b.rotation === 'number') ? b.rotation : 0;
    if (rot === 0) {
      return px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height;
    }
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const rad = -rot * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    const localX = cx + (dx * cos - dy * sin);
    const localY = cy + (dx * sin + dy * cos);
    return localX >= b.x && localX <= b.x + b.width && localY >= b.y && localY <= b.y + b.height;
  };
  window.isPointInWidget = isPointInWidget;

  // Direct Canvas Hit-Testing for Selection & Dragging
  const handlePointerDown = (clientX, clientY) => {
    if (!state.isInteractiveLayout) return;

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const clickX = (clientX - rect.left) * scale;
    const clickY = (clientY - rect.top) * scale;

    // Check bounds in reverse order (topmost first)
    let foundKey = null;
    const bounds = renderer.widgetBounds || {};
    const entries = Object.entries(bounds).reverse();

    for (const [key, b] of entries) {
      if (key === '__bg_photo__') continue; // Don't let background photo steal clicks from widgets
      if (isPointInWidget(clickX, clickY, b)) {
        foundKey = key;
        break;
      }
    }

    if (foundKey) {
      selectWidget(foundKey);
      startDragMove(clientX, clientY);
    } else {
      if (state.config.bgType === 'photo' && renderer.bgImage) {
        selectWidget('__bg_photo__');
        startPhotoDrag(clientX, clientY);
      } else {
        selectWidget(null);
      }
    }
  };

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) handlePointerDown(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      handlePointerDown(t.clientX, t.clientY);
    } else {
      isInteracting = false;
    }
  }, { passive: true });

  // Helper to test if clicking/tapping a foreground widget when background photo is selected
  const handleGizmoPointerDown = (clientX, clientY) => {
    if (state.selectedWidget === '__bg_photo__') {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const clickX = (clientX - rect.left) * scale;
      const clickY = (clientY - rect.top) * scale;

      let foundKey = null;
      const bounds = renderer.widgetBounds || {};
      const entries = Object.entries(bounds).reverse();

      for (const [key, b] of entries) {
        if (key === '__bg_photo__') continue;
        if (isPointInWidget(clickX, clickY, b)) {
          foundKey = key;
          break;
        }
      }

      if (foundKey) {
        selectWidget(foundKey);
        startDragMove(clientX, clientY);
        return;
      }
      startPhotoDrag(clientX, clientY);
    } else {
      startDragMove(clientX, clientY);
    }
  };

  // Gizmo Body Move Drag
  gizmoBox.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('gizmo-handle') || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    if (e.button === 0) {
      handleGizmoPointerDown(e.clientX, e.clientY);
    }
  });

  gizmoBox.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('gizmo-handle') || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    if (e.touches.length === 1) {
      handleGizmoPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    } else {
      isInteracting = false;
    }
  }, { passive: true });

  // Hover cursor for background photo gizmo
  gizmoBox.addEventListener('mousemove', (e) => {
    if (isInteracting) return;
    if (state.selectedWidget === '__bg_photo__') {
      if (e.target.classList.contains('gizmo-handle') || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const clickX = (e.clientX - rect.left) * scale;
      const clickY = (e.clientY - rect.top) * scale;

      let overForeground = false;
      const bounds = renderer.widgetBounds || {};
      for (const [key, b] of Object.entries(bounds)) {
        if (key === '__bg_photo__') continue;
        if (isPointInWidget(clickX, clickY, b)) {
          overForeground = true;
          break;
        }
      }
      gizmoBox.style.cursor = overForeground ? 'pointer' : 'grab';
    }
  });

  // Handles Resize & Rotate Drag
  const handles = gizmoBox.querySelectorAll('.gizmo-handle');
  handles.forEach((h) => {
    const startResize = (clientX, clientY) => {
      pushUndoSnapshot();
      if (h.dataset.handle === 'rot') {
        activeDragMode = 'rotate';
        const b = renderer.widgetBounds[state.selectedWidget];
        if (!b) return;
        const canvasRect = canvas.getBoundingClientRect();
        const scale = canvasRect.width / canvas.width;
        dragCenterX = canvasRect.left + (b.x + b.width / 2) * scale;
        dragCenterY = canvasRect.top + (b.y + b.height / 2) * scale;
        dragInitialRot = (typeof b.rotation === 'number') ? b.rotation : 0;
        isInteracting = true;
        return;
      }

      if (state.selectedWidget === '__bg_photo__') {
        activeDragMode = 'photo_zoom';
        dragStartX = clientX;
        dragStartY = clientY;
        dragInitialZoom = typeof state.config.photoZoom === 'number' ? state.config.photoZoom : 1;
        isInteracting = true;
        return;
      }

      activeDragMode = 'resize';
      activeHandle = h.dataset.handle;
      dragStartX = clientX;
      dragStartY = clientY;
      const b = renderer.widgetBounds[state.selectedWidget];
      if (!b) return;
      if (state.selectedWidget.endsWith('_bg')) {
        const baseKey = state.selectedWidget.replace(/_bg$/, '');
        const bgCustom = (state.config.widgetBgStyles && state.config.widgetBgStyles[baseKey]) || {};
        dragInitialPos = {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          offsetX: typeof bgCustom.offsetX === 'number' ? bgCustom.offsetX : 0,
          offsetY: typeof bgCustom.offsetY === 'number' ? bgCustom.offsetY : 0,
          widthDelta: typeof bgCustom.widthDelta === 'number' ? bgCustom.widthDelta : 0,
          heightDelta: typeof bgCustom.heightDelta === 'number' ? bgCustom.heightDelta : 0,
        };
      } else {
        dragInitialPos = { ...(state.config.widgetPositions[state.selectedWidget] || b) };
      }
      isInteracting = true;
      if (state.config.snapToGrid) {
        state.config.isDraggingGrid = true;
        triggerRender();
      }
    };

    h.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.button === 0) startResize(e.clientX, e.clientY);
    });

    h.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        e.stopPropagation();
        const t = e.touches[0];
        startResize(t.clientX, t.clientY);
      } else {
        isInteracting = false;
      }
    }, { passive: true });
  });

  // Global Pointer Move & Up
  const handlePointerMove = (clientX, clientY) => {
    if (!isInteracting || !state.selectedWidget) return;

    if (activeDragMode === 'rotate') {
      const dx = clientX - dragCenterX;
      const dy = clientY - dragCenterY;
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      if (window._shiftKeyPressed) {
        deg = Math.round(deg / 15) * 15;
      } else {
        deg = Math.round(deg);
      }
      if (deg > 180) deg = 180;
      if (deg < -180) deg = -180;

      const cur = state.config.widgetPositions[state.selectedWidget] || renderer.widgetBounds[state.selectedWidget] || {};
      state.config.widgetPositions[state.selectedWidget] = {
        ...cur,
        rotation: deg,
      };
      if (!state.config.elementStyles) state.config.elementStyles = {};
      if (!state.config.elementStyles[state.selectedWidget]) state.config.elementStyles[state.selectedWidget] = {};
      state.config.elementStyles[state.selectedWidget].rotation = deg;

      const rotSlider = document.getElementById('widgetRotationSlider');
      const rotInput = document.getElementById('widgetRotationInput');
      const rotVal = document.getElementById('widgetRotationVal');
      if (rotSlider) rotSlider.value = deg;
      if (rotInput) rotInput.value = deg;
      if (rotVal) rotVal.textContent = `${deg}°`;

      const inspSlider = document.getElementById('inspectorWidgetRotationSlider');
      const inspInput = document.getElementById('inspectorWidgetRotationInput');
      const inspVal = document.getElementById('inspectorWidgetRotationVal');
      if (inspSlider) inspSlider.value = deg;
      if (inspInput) inspInput.value = deg;
      if (inspVal) inspVal.textContent = `${deg}°`;

      triggerRender();
      updateGizmoBox();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const deltaX = (clientX - dragStartX) * scale;
    const deltaY = (clientY - dragStartY) * scale;

    if (activeDragMode === 'photo') {
      const deltaPercentX = (deltaX / canvas.width) * 100;
      const deltaPercentY = (deltaY / canvas.height) * 100;
      state.config.photoPanX = Math.round((dragInitialPanX + deltaPercentX) * 10) / 10;
      state.config.photoPanY = Math.round((dragInitialPanY + deltaPercentY) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
      return;
    } else if (activeDragMode === 'photo_zoom') {
      const deltaZoom = (deltaX + deltaY) * 0.003;
      state.config.photoZoom = Math.max(0.1, Math.min(5.0, Math.round((dragInitialZoom + deltaZoom) * 100) / 100));
      syncPhotoSliders();
      triggerRender();
      return;
    }

    const snapVal = (val, size) => {
      if (!state.config.snapToGrid || !size || size <= 1) return Math.round(val);
      return Math.round(val / size) * size;
    };
    const g = state.config.gridSize || 20;

    if (activeDragMode === 'move') {
      if (state.selectedWidget.endsWith('_bg')) {
        const baseKey = state.selectedWidget.replace(/_bg$/, '');
        if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
        if (!state.config.widgetBgStyles[baseKey]) state.config.widgetBgStyles[baseKey] = {};
        const cur = state.config.widgetBgStyles[baseKey];
        cur.offsetX = snapVal(dragInitialPos.offsetX + deltaX, g);
        cur.offsetY = snapVal(dragInitialPos.offsetY + deltaY, g);
        state.config.isDraggingGrid = state.config.snapToGrid;
        triggerRender();
      } else {
        const newX = snapVal(dragInitialPos.x + deltaX, g);
        const newY = snapVal(dragInitialPos.y + deltaY, g);
        state.config.widgetPositions[state.selectedWidget] = {
          ...dragInitialPos,
          x: newX,
          y: newY,
        };
        state.config.isDraggingGrid = state.config.snapToGrid;
        triggerRender();
      }
    } else if (activeDragMode === 'resize') {
      let { x, y, width, height } = dragInitialPos;

      if (activeHandle.includes('e')) width = Math.max(g, snapVal(dragInitialPos.width + deltaX, g));
      if (activeHandle.includes('s')) height = Math.max(g, snapVal(dragInitialPos.height + deltaY, g));
      if (activeHandle.includes('w')) {
        const rawW = dragInitialPos.width - deltaX;
        const nw = Math.max(g, snapVal(rawW, g));
        x = snapVal(dragInitialPos.x + (dragInitialPos.width - nw), g);
        width = nw;
      }
      if (activeHandle.includes('n')) {
        const rawH = dragInitialPos.height - deltaY;
        const nh = Math.max(g, snapVal(rawH, g));
        y = snapVal(dragInitialPos.y + (dragInitialPos.height - nh), g);
        height = nh;
      }

      if (state.selectedWidget.endsWith('_bg')) {
        const baseKey = state.selectedWidget.replace(/_bg$/, '');
        if (!state.config.widgetBgStyles) state.config.widgetBgStyles = {};
        if (!state.config.widgetBgStyles[baseKey]) state.config.widgetBgStyles[baseKey] = {};
        const cur = state.config.widgetBgStyles[baseKey];
        const baseBounds = renderer.widgetBounds[baseKey];
        const baseX = baseBounds ? baseBounds.x : dragInitialPos.x - dragInitialPos.offsetX;
        const baseY = baseBounds ? baseBounds.y : dragInitialPos.y - dragInitialPos.offsetY;
        const baseW = baseBounds ? baseBounds.width : dragInitialPos.width - dragInitialPos.widthDelta;
        const baseH = baseBounds ? baseBounds.height : dragInitialPos.height - dragInitialPos.heightDelta;
        cur.offsetX = Math.round(x - baseX);
        cur.offsetY = Math.round(y - baseY);
        cur.widthDelta = Math.round(width - baseW);
        cur.heightDelta = Math.round(height - baseH);
        state.config.isDraggingGrid = state.config.snapToGrid;
        triggerRender();
      } else {
        state.config.widgetPositions[state.selectedWidget] = { x, y, width, height };
        state.config.isDraggingGrid = state.config.snapToGrid;
        triggerRender();
      }
    }
  };

  const handlePointerUp = () => {
    if (isInteracting) {
      isInteracting = false;
      activeDragMode = null;
      activeHandle = null;
      if (state.config.isDraggingGrid) {
        state.config.isDraggingGrid = false;
        triggerRender();
      }
    }
  };

  // Canvas Hover Cursor for Interactive Layout
  canvas.addEventListener('mousemove', (e) => {
    if (!state.isInteractiveLayout || isInteracting) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const hoverX = (e.clientX - rect.left) * scale;
    const hoverY = (e.clientY - rect.top) * scale;
    let hoveredWidget = null;
    const bounds = renderer.widgetBounds || {};
    for (const [key, b] of Object.entries(bounds).reverse()) {
      if (key === '__bg_photo__') continue;
      if (isPointInWidget(hoverX, hoverY, b)) {
        hoveredWidget = key;
        break;
      }
    }
    if (hoveredWidget) {
      canvas.style.cursor = 'move';
    } else if (state.config.bgType === 'photo' && renderer.bgImage) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }
  });

  // Canvas Mouse Wheel for Photo Zoom
  canvas.addEventListener('wheel', (e) => {
    if (state.config.bgType === 'photo' && renderer.bgImage) {
      if (e.altKey || e.ctrlKey || state.selectedWidget === '__bg_photo__') {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
        const curZoom = typeof state.config.photoZoom === 'number' ? state.config.photoZoom : 1;
        state.config.photoZoom = Math.max(0.1, Math.min(5.0, Math.round((curZoom + zoomDelta) * 100) / 100));
        syncPhotoSliders();
        triggerRender();
      }
    }
  }, { passive: false });

  window.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      if (isInteracting) isInteracting = false;
      return;
    }
    if (isInteracting && e.touches.length === 1) {
      e.preventDefault();
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener('mouseup', handlePointerUp);
  window.addEventListener('touchend', handlePointerUp);
}

function startPhotoDrag(clientX, clientY) {
  pushUndoSnapshot();
  activeDragMode = 'photo';
  dragStartX = clientX;
  dragStartY = clientY;
  dragInitialPanX = typeof state.config.photoPanX === 'number' ? state.config.photoPanX : 0;
  dragInitialPanY = typeof state.config.photoPanY === 'number' ? state.config.photoPanY : 0;
  isInteracting = true;
}

function startDragMove(clientX, clientY) {
  pushUndoSnapshot();
  activeDragMode = 'move';
  dragStartX = clientX;
  dragStartY = clientY;
  const b = renderer.widgetBounds[state.selectedWidget];
  if (!b) return;
  if (state.selectedWidget.endsWith('_bg')) {
    const baseKey = state.selectedWidget.replace(/_bg$/, '');
    const bgCustom = (state.config.widgetBgStyles && state.config.widgetBgStyles[baseKey]) || {};
    dragInitialPos = {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      offsetX: typeof bgCustom.offsetX === 'number' ? bgCustom.offsetX : 0,
      offsetY: typeof bgCustom.offsetY === 'number' ? bgCustom.offsetY : 0,
      widthDelta: typeof bgCustom.widthDelta === 'number' ? bgCustom.widthDelta : 0,
      heightDelta: typeof bgCustom.heightDelta === 'number' ? bgCustom.heightDelta : 0,
    };
  } else {
    dragInitialPos = { ...(state.config.widgetPositions[state.selectedWidget] || b) };
  }
  isInteracting = true;
  if (state.config.snapToGrid) {
    state.config.isDraggingGrid = true;
    triggerRender();
  }
}

function selectWidget(key) {
  state.selectedWidget = key;
  updateGizmoBox();

  // Highlight row in customTextsList if text
  const textRows = document.querySelectorAll('.custom-text-item');
  textRows.forEach((r) => r.classList.remove('active'));

  const nameLabel = document.getElementById('selectedWidgetNameLabel');
  if (!key) {
    if (nameLabel) nameLabel.textContent = 'None (Click canvas)';
    return;
  }

  if (key === '__bg_photo__') {
    if (nameLabel) nameLabel.textContent = 'Background Photo';
    const photoSection = document.getElementById('photoControlsSection');
    if (photoSection) photoSection.style.display = 'block';
    const inspectorSelect = document.getElementById('inspectorElementSelect');
    if (inspectorSelect) inspectorSelect.value = '__bg_photo__';
    updateGizmoBox();
    return;
  }

  const b = renderer.widgetBounds[key];
  if (nameLabel && b) nameLabel.textContent = b.name;

  // Sync with Element Inspector
  if (key && key.endsWith('_bg')) {
    const baseKey = key.replace(/_bg$/, '');
    const inspectorSelect = document.getElementById('inspectorElementSelect');
    if (inspectorSelect && inspectorSelect.querySelector(`option[value="${baseKey}"]`)) {
      inspectorSelect.value = baseKey;
      if (window.syncInspectorWithSelectedElement) {
        window.syncInspectorWithSelectedElement(baseKey, 'bg');
      }
    }
  } else if (key) {
    const inspectorSelect = document.getElementById('inspectorElementSelect');
    if (inspectorSelect && inspectorSelect.querySelector(`option[value="${key}"]`)) {
      inspectorSelect.value = key;
      if (window.syncInspectorWithSelectedElement) {
        window.syncInspectorWithSelectedElement(key, 'widget');
      }
    }
  }

  // Sync sliders in widgetsTab
  if (b) {
    const posX = document.getElementById('widgetPosXSlider');
    const posY = document.getElementById('widgetPosYSlider');
    const posW = document.getElementById('widgetWidthSlider');
    const posH = document.getElementById('widgetHeightSlider');
    const cur = state.config.widgetPositions[key] || b;

    if (posX) { posX.value = cur.x; document.getElementById('widgetPosXVal').textContent = `${cur.x}px`; }
    if (posY) { posY.value = cur.y; document.getElementById('widgetPosYVal').textContent = `${cur.y}px`; }
    if (posW) { posW.value = cur.width; document.getElementById('widgetWidthVal').textContent = `${cur.width}px`; }
    if (posH) { posH.value = cur.height; document.getElementById('widgetHeightVal').textContent = `${cur.height}px`; }

    const rot = (typeof cur.rotation === 'number') ? cur.rotation : ((state.config.elementStyles && state.config.elementStyles[key] && typeof state.config.elementStyles[key].rotation === 'number') ? state.config.elementStyles[key].rotation : ((typeof b.rotation === 'number') ? b.rotation : 0));
    const rotSlider = document.getElementById('widgetRotationSlider');
    const rotInput = document.getElementById('widgetRotationInput');
    const rotVal = document.getElementById('widgetRotationVal');
    if (rotSlider) rotSlider.value = rot;
    if (rotInput) rotInput.value = rot;
    if (rotVal) rotVal.textContent = `${rot}°`;

    const inspRotSlider = document.getElementById('inspectorWidgetRotationSlider');
    const inspRotInput = document.getElementById('inspectorWidgetRotationInput');
    const inspRotVal = document.getElementById('inspectorWidgetRotationVal');
    if (inspRotSlider) inspRotSlider.value = rot;
    if (inspRotInput) inspRotInput.value = rot;
    if (inspRotVal) inspRotVal.textContent = `${rot}°`;
  }
}

function updateGizmoBox() {
  if (!gizmoBox) return;

  if (!state.isInteractiveLayout || !state.selectedWidget) {
    gizmoBox.style.display = 'none';
    return;
  }

  const b = renderer.widgetBounds[state.selectedWidget];
  if (!b) {
    gizmoBox.style.display = 'none';
    return;
  }

  const isPhoto = state.selectedWidget === '__bg_photo__';
  const isBgBorder = state.selectedWidget && state.selectedWidget.endsWith('_bg');
  const gizmoSubPartSelect = document.getElementById('gizmoSubPartSelect');
  if (gizmoSubPartSelect) {
    gizmoSubPartSelect.style.display = isPhoto ? 'none' : '';
    gizmoSubPartSelect.value = isBgBorder ? 'border' : 'widget';
  }
  if (isBgBorder) {
    gizmoBox.classList.add('mode-bg-border');
  } else {
    gizmoBox.classList.remove('mode-bg-border');
  }

  const canvasRect = canvas.getBoundingClientRect();
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  const scale = canvasRect.width / canvas.width;

  const offsetX = canvasRect.left - wrapperRect.left;
  const offsetY = canvasRect.top - wrapperRect.top;

  const cssLeft = offsetX + b.x * scale;
  const cssTop = offsetY + b.y * scale;
  const cssWidth = b.width * scale;
  const cssHeight = b.height * scale;

  gizmoBox.style.display = 'block';
  gizmoBox.style.left = `${cssLeft}px`;
  gizmoBox.style.top = `${cssTop}px`;
  gizmoBox.style.width = `${cssWidth}px`;
  gizmoBox.style.height = `${cssHeight}px`;

  const rot = (typeof b.rotation === 'number') ? b.rotation : 0;
  gizmoBox.style.transform = `rotate(${rot}deg)`;
  gizmoBox.style.transformOrigin = 'center center';

  if (gizmoTitle) {
    if (isPhoto) {
      gizmoTitle.textContent = `🖼️ Photo (${b.width}×${b.height}) - Pan: ${state.config.photoPanX || 0}%, ${state.config.photoPanY || 0}%`;
    } else {
      const rotSuffix = rot !== 0 ? ` [${rot}°]` : '';
      gizmoTitle.textContent = `${b.name} (${b.width}×${b.height})${rotSuffix}`;
    }
  }

  if (gizmoDeleteBtn) {
    gizmoDeleteBtn.style.display = 'inline-flex';
  }
}
window.selectWidget = selectWidget;
window.updateGizmoBox = updateGizmoBox;

function centerWidget(key) {
  const b = renderer.widgetBounds[key];
  if (!b) return;
  const cur = state.config.widgetPositions[key] || b;
  let newX = Math.round((canvas.width - cur.width) / 2);
  if (state.config.snapToGrid) {
    const g = state.config.gridSize || 20;
    newX = Math.round(newX / g) * g;
  }
  state.config.widgetPositions[key] = { ...cur, x: newX };
  triggerRender();
  showToast('Centered widget horizontally');
}

function syncPhotoSliders() {
  const cfg = state.config;
  const zoom = typeof cfg.photoZoom === 'number' ? cfg.photoZoom : 1;
  const panX = typeof cfg.photoPanX === 'number' ? cfg.photoPanX : 0;
  const panY = typeof cfg.photoPanY === 'number' ? cfg.photoPanY : 0;
  const blur = typeof cfg.photoBlur === 'number' ? cfg.photoBlur : 0;
  const brightness = typeof cfg.photoBrightness === 'number' ? cfg.photoBrightness : 100;
  const contrast = typeof cfg.photoContrast === 'number' ? cfg.photoContrast : 100;
  const fit = cfg.photoFit || 'fit';
  const backdrop = cfg.photoBackdrop || 'blur';

  const zoomSlider = document.getElementById('photoZoom');
  const zoomInput = document.getElementById('photoZoomInput');
  const zoomVal = document.getElementById('photoZoomVal');
  if (zoomSlider) zoomSlider.value = zoom;
  if (zoomInput) zoomInput.value = zoom;
  if (zoomVal) zoomVal.textContent = `${zoom.toFixed(2)}x`;

  const panXSlider = document.getElementById('photoPanX');
  const panXInput = document.getElementById('photoPanXInput');
  const panXVal = document.getElementById('photoPanXVal');
  if (panXSlider) panXSlider.value = panX;
  if (panXInput) panXInput.value = panX;
  if (panXVal) panXVal.textContent = `${panX}%`;

  const panYSlider = document.getElementById('photoPanY');
  const panYInput = document.getElementById('photoPanYInput');
  const panYVal = document.getElementById('photoPanYVal');
  if (panYSlider) panYSlider.value = panY;
  if (panYInput) panYInput.value = panY;
  if (panYVal) panYVal.textContent = `${panY}%`;

  const blurSlider = document.getElementById('photoBlur');
  const blurVal = document.getElementById('photoBlurVal');
  if (blurSlider) blurSlider.value = blur;
  if (blurVal) blurVal.textContent = `${blur}px`;

  const brightSlider = document.getElementById('photoBrightness');
  const brightVal = document.getElementById('photoBrightnessVal');
  if (brightSlider) brightSlider.value = brightness;
  if (brightVal) brightVal.textContent = `${brightness}%`;

  const contrastSlider = document.getElementById('photoContrast');
  const contrastVal = document.getElementById('photoContrastVal');
  if (contrastSlider) contrastSlider.value = contrast;
  if (contrastVal) contrastVal.textContent = `${contrast}%`;

  const fitBtn = document.getElementById('photoFitBtn');
  const coverBtn = document.getElementById('photoCoverBtn');
  const fitBadge = document.getElementById('photoFitBadge');
  const ratioBadge = document.getElementById('photoRatioStatusBadge');
  if (fitBtn && coverBtn) {
    fitBtn.classList.toggle('active', fit === 'fit' || fit === 'contain');
    coverBtn.classList.toggle('active', fit === 'cover');
  }
  if (fitBadge) {
    fitBadge.textContent = (fit === 'fit' || fit === 'contain') ? '100% Uncropped' : 'Fill Canvas';
  }
  if (ratioBadge) {
    ratioBadge.textContent = (fit === 'fit' || fit === 'contain') ? 'No Crop Mode' : 'Cover Mode';
  }

  const backdropSelect = document.getElementById('photoBackdropSelect');
  if (backdropSelect) backdropSelect.value = backdrop;

  const protectToggle = document.getElementById('togglePhotoProtection');
  if (protectToggle) protectToggle.checked = cfg.photoProtectionGradient !== false;
}

// ==========================================
// 8. STYLE & BACKGROUND CONTROLS
// ==========================================
function setupStyleControls() {
  const photoSection = document.getElementById('photoControlsSection');
  const bgPhotoInput = document.getElementById('bgPhotoInput');

  setupCardGrid('#bgTypeGrid', 'data-bg', (bg) => {
    pushUndoSnapshot();
    state.config.bgType = bg;
    if (bg === 'photo') {
      photoSection.style.display = 'block';
    } else {
      photoSection.style.display = 'none';
      if (state.selectedWidget === '__bg_photo__') selectWidget(null);
    }
    triggerRender();
  });

  if (bgPhotoInput) {
    bgPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          pushUndoSnapshot();
          renderer.setBgImage(img);
          state.config.bgType = 'photo';

          // Detect aspect ratio difference:
          const imgAspect = img.width / img.height;
          const [rw, rh] = (state.config.aspectRatio || '9:16').split(':').map(Number);
          const canvasAspect = (rw && rh) ? rw / rh : 9 / 16;
          const isRatioSimilar = Math.abs(imgAspect - canvasAspect) / Math.max(imgAspect, canvasAspect) < 0.05;

          // If ratio is not similar, default to 'fit' (contain) so no unseen part is cropped!
          if (!isRatioSimilar) {
            state.config.photoFit = 'fit';
          }
          state.config.photoPanX = 0;
          state.config.photoPanY = 0;
          state.config.photoZoom = 1;

          photoSection.style.display = 'block';
          updateActiveCard('#bgTypeGrid', 'data-bg', 'photo');
          syncPhotoSliders();
          triggerRender();
          showToast('Background photo loaded (100% full uncropped image)!');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Ratio & Fit Mode Buttons
  const photoFitBtn = document.getElementById('photoFitBtn');
  if (photoFitBtn) {
    photoFitBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoFit = 'fit';
      syncPhotoSliders();
      triggerRender();
      showToast('Photo Fit: 100% full uncropped photo');
    });
  }

  const photoCoverBtn = document.getElementById('photoCoverBtn');
  if (photoCoverBtn) {
    photoCoverBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoFit = 'cover';
      syncPhotoSliders();
      triggerRender();
      showToast('Photo Fit: Fill frame');
    });
  }

  // Margin Backdrop Select
  const photoBackdropSelect = document.getElementById('photoBackdropSelect');
  if (photoBackdropSelect) {
    photoBackdropSelect.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.photoBackdrop = e.target.value;
      triggerRender();
    });
  }

  // Pan X slider & number input
  const photoPanX = document.getElementById('photoPanX');
  const photoPanXInput = document.getElementById('photoPanXInput');
  if (photoPanX) {
    photoPanX.addEventListener('input', (e) => {
      state.config.photoPanX = parseFloat(e.target.value) || 0;
      if (photoPanXInput) photoPanXInput.value = state.config.photoPanX;
      const panXVal = document.getElementById('photoPanXVal');
      if (panXVal) panXVal.textContent = `${state.config.photoPanX}%`;
      triggerRender();
    });
    photoPanX.addEventListener('change', () => pushUndoSnapshot());
  }
  if (photoPanXInput) {
    photoPanXInput.addEventListener('input', (e) => {
      state.config.photoPanX = parseFloat(e.target.value) || 0;
      if (photoPanX) photoPanX.value = state.config.photoPanX;
      const panXVal = document.getElementById('photoPanXVal');
      if (panXVal) panXVal.textContent = `${state.config.photoPanX}%`;
      triggerRender();
    });
    photoPanXInput.addEventListener('change', () => pushUndoSnapshot());
  }

  // Pan Y slider & number input
  const photoPanY = document.getElementById('photoPanY');
  const photoPanYInput = document.getElementById('photoPanYInput');
  if (photoPanY) {
    photoPanY.addEventListener('input', (e) => {
      state.config.photoPanY = parseFloat(e.target.value) || 0;
      if (photoPanYInput) photoPanYInput.value = state.config.photoPanY;
      const panYVal = document.getElementById('photoPanYVal');
      if (panYVal) panYVal.textContent = `${state.config.photoPanY}%`;
      triggerRender();
    });
    photoPanY.addEventListener('change', () => pushUndoSnapshot());
  }
  if (photoPanYInput) {
    photoPanYInput.addEventListener('input', (e) => {
      state.config.photoPanY = parseFloat(e.target.value) || 0;
      if (photoPanY) photoPanY.value = state.config.photoPanY;
      const panYVal = document.getElementById('photoPanYVal');
      if (panYVal) panYVal.textContent = `${state.config.photoPanY}%`;
      triggerRender();
    });
    photoPanYInput.addEventListener('change', () => pushUndoSnapshot());
  }

  // Directional Nudge Buttons
  const photoNudgeLeftBtn = document.getElementById('photoNudgeLeftBtn');
  if (photoNudgeLeftBtn) {
    photoNudgeLeftBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanX = Math.round(((state.config.photoPanX || 0) - 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoNudgeRightBtn = document.getElementById('photoNudgeRightBtn');
  if (photoNudgeRightBtn) {
    photoNudgeRightBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanX = Math.round(((state.config.photoPanX || 0) + 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoNudgeUpBtn = document.getElementById('photoNudgeUpBtn');
  if (photoNudgeUpBtn) {
    photoNudgeUpBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanY = Math.round(((state.config.photoPanY || 0) - 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoNudgeDownBtn = document.getElementById('photoNudgeDownBtn');
  if (photoNudgeDownBtn) {
    photoNudgeDownBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanY = Math.round(((state.config.photoPanY || 0) + 5) * 10) / 10;
      syncPhotoSliders();
      triggerRender();
    });
  }

  const photoCenterBtn = document.getElementById('photoCenterBtn');
  if (photoCenterBtn) {
    photoCenterBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoPanX = 0;
      state.config.photoPanY = 0;
      syncPhotoSliders();
      triggerRender();
      showToast('Photo centered');
    });
  }

  // Reset Photo Button
  const resetPhotoPosBtn = document.getElementById('resetPhotoPosBtn');
  if (resetPhotoPosBtn) {
    resetPhotoPosBtn.addEventListener('click', () => {
      pushUndoSnapshot();
      state.config.photoZoom = 1;
      state.config.photoPanX = 0;
      state.config.photoPanY = 0;
      state.config.photoFit = 'fit';
      syncPhotoSliders();
      triggerRender();
      showToast('Photo reset to default');
    });
  }

  // Zoom slider & input
  const photoZoom = document.getElementById('photoZoom');
  const photoZoomInput = document.getElementById('photoZoomInput');
  if (photoZoom) {
    photoZoom.addEventListener('input', (e) => {
      state.config.photoZoom = parseFloat(e.target.value) || 1;
      if (photoZoomInput) photoZoomInput.value = state.config.photoZoom;
      const zoomVal = document.getElementById('photoZoomVal');
      if (zoomVal) zoomVal.textContent = `${state.config.photoZoom.toFixed(2)}x`;
      triggerRender();
    });
    photoZoom.addEventListener('change', () => pushUndoSnapshot());
  }
  if (photoZoomInput) {
    photoZoomInput.addEventListener('input', (e) => {
      state.config.photoZoom = parseFloat(e.target.value) || 1;
      if (photoZoom) photoZoom.value = state.config.photoZoom;
      const zoomVal = document.getElementById('photoZoomVal');
      if (zoomVal) zoomVal.textContent = `${state.config.photoZoom.toFixed(2)}x`;
      triggerRender();
    });
    photoZoomInput.addEventListener('change', () => pushUndoSnapshot());
  }

  // Blur, Brightness, Contrast & Protection
  setupSlider('photoBlur', 'photoBlurVal', (val) => {
    state.config.photoBlur = parseFloat(val);
    triggerRender();
  }, 'px');

  setupSlider('photoBrightness', 'photoBrightnessVal', (val) => {
    state.config.photoBrightness = parseFloat(val);
    triggerRender();
  }, '%');

  setupSlider('photoContrast', 'photoContrastVal', (val) => {
    state.config.photoContrast = parseFloat(val);
    triggerRender();
  }, '%');

  const togglePhotoProtection = document.getElementById('togglePhotoProtection');
  if (togglePhotoProtection) {
    togglePhotoProtection.addEventListener('change', (e) => {
      pushUndoSnapshot();
      state.config.photoProtectionGradient = e.target.checked;
      triggerRender();
    });
  }

  setupCardGrid('#themeGrid', 'data-theme', (theme) => {
    state.config.theme = theme;
    state.config.customAccentColor = null;
    triggerRender();
  });

  document.getElementById('customColorInput').addEventListener('input', (e) => {
    state.config.customAccentColor = e.target.value;
    triggerRender();
  });

  setupCardGrid('#cardStyleGrid', 'data-cardstyle', (style) => {
    state.config.cardStyle = style;
    triggerRender();
  });

  setupCardGrid('#fontGrid', 'data-font', (font) => {
    state.config.fontFamily = font;
    triggerRender();
  });
}

function setupSlider(sliderId, valLabelId, onChange, unit = '') {
  const slider = document.getElementById(sliderId);
  const valLabel = document.getElementById(valLabelId);
  if (!slider || !valLabel) return;

  slider.addEventListener('input', (e) => {
    valLabel.textContent = `${e.target.value}${unit}`;
    onChange(e.target.value);
  });
}

// ==========================================
// 9. EXPORT CONTROLS
// ==========================================
function setupExportControls() {
  setupCardGrid('#exportScaleGrid', 'data-scale', (scale) => {
    state.export.scale = parseInt(scale, 10);
  });

  setupCardGrid('#exportFormatGrid', 'data-format', (format) => {
    state.export.format = format;
  });

  const doDownload = () => exportImage('download');
  document.getElementById('downloadBtn').addEventListener('click', doDownload);
  document.getElementById('mobileDownloadBtn').addEventListener('click', doDownload);
  document.getElementById('quickExportBtn').addEventListener('click', doDownload);



  const doShare = () => exportImage('share');
  document.getElementById('shareBtn').addEventListener('click', doShare);
  document.getElementById('mobileShareBtn').addEventListener('click', doShare);

  document.getElementById('copyBtn').addEventListener('click', () => exportImage('copy'));
}

function exportImage(action = 'download') {
  if (!state.currentActivity) {
    showToast('No activity loaded to export.');
    return;
  }

  showToast('Generating high-resolution export...');
  const exportCanvas = document.getElementById('exportCanvas');
  const exportRenderer = new OverlayRenderer(exportCanvas);
  exportRenderer.setBgImage(renderer.bgImage);

  exportRenderer.render(state.currentActivity, state.config, state.export.scale);

  const mimeType = state.export.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = state.export.format === 'jpeg' ? 0.92 : undefined;
  const ext = state.export.format === 'jpeg' ? 'jpg' : 'png';
  const fileName = `runoverlay-${Date.now()}.${ext}`;

  exportCanvas.toBlob(async (blob) => {
    if (!blob) {
      showToast('Export failed.');
      return;
    }



    if (action === 'share') {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: state.currentActivity.title || 'My Run',
            text: `Ran ${state.currentActivity.distanceMain} ${state.currentActivity.distanceUnit} in ${state.currentActivity.durationFormatted}!`,
            files: [file],
          });
          showToast('Shared successfully!');
          return;
        } catch (e) {
          if (e.name !== 'AbortError') console.error('Share error:', e);
        }
      } else {
        showToast('Web Share not supported; downloading instead.');
        downloadBlob(blob, fileName);
      }
    } else if (action === 'copy') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Image copied to clipboard!');
      } catch (e) {
        console.error('Clipboard copy failed:', e);
        showToast('Copy not supported on this browser. Downloading...');
        downloadBlob(blob, fileName);
      }
    } else {
      downloadBlob(blob, fileName);
      showToast('Image downloaded!');
    }
  }, mimeType, quality);
}



function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ==========================================
// UTILITIES
// ==========================================
function setupCardGrid(gridSelector, dataAttr, onSelect) {
  const container = document.querySelector(gridSelector);
  if (!container) return;

  const cards = container.querySelectorAll('.choice-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const val = card.getAttribute(dataAttr);
      onSelect(val);
    });
  });
}

function updateActiveCard(gridSelector, dataAttr, targetVal) {
  const container = document.querySelector(gridSelector);
  if (!container) return;

  const cards = container.querySelectorAll('.choice-card');
  cards.forEach((card) => {
    if (card.getAttribute(dataAttr) === targetVal) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg') || toast;
  toastMsg.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', init);
