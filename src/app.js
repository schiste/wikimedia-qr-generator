import { createQrCode } from "./qr.js";
import { bulkQrFileName, parseBulkUrlList } from "./bulk.js";
import {
  addCaptionsToSvg,
  addInkscapeDataToSvg,
  addPrintBleedToSvg,
  getExportPixelSize,
  stripInkscapeDataFromSvg
} from "./export.js";
import {
  advancedBulkFileName,
  createAdvancedBulkTemplateCsv,
  formatAdvancedBulkIssues,
  lintAdvancedBulkCsv,
  parseAdvancedBulkCsv
} from "./advancedBulk.js";
import { fetchCatalogCommonsLogo } from "./commonsLogo.js";
import { createZipBlob } from "./zip.js";
import {
  getLogoLibraryPreviewUrl,
  getLogoLibraryEntry,
  hasLogoLibraryEntry,
  LOGO_LIBRARY_COUNTS,
  LOGO_LIBRARY_ENTRIES,
  LOGO_LIBRARY_FILTERS,
  normalizeLogoSearchText
} from "./logoLibrary.js";
import {
  buildWikimediaUrl,
  normalizeDirectUrl
} from "./wikimedia.js";
import { CENTER_LOGO_IDS, getLogo, renderLogoMarkup, renderLogoPreview } from "./logos.js";

const form = document.querySelector("#qr-form");
const appShell = document.querySelector("#app-shell");
const appPicker = document.querySelector("#app-picker");
const appPickerButton = document.querySelector("#app-picker-button");
const designsMenu = document.querySelector("#designs-menu");
const designsMenuButton = document.querySelector("#designs-menu-button");
const designsDropdown = document.querySelector("#designs-dropdown");
const designActionsMenu = document.querySelector("#design-actions-menu");
const designActionsMenuButton = document.querySelector("#design-actions-menu-button");
const designsCount = document.querySelector("#designs-count");
const designsEmpty = document.querySelector("#designs-empty");
const designsList = document.querySelector("#designs-list");
const saveDesignButton = document.querySelector("#save-design");
const saveDesignDialog = document.querySelector("#save-design-dialog");
const saveDesignForm = document.querySelector("#save-design-form");
const saveDesignNameInput = document.querySelector("#save-design-name");
const saveDesignNameError = document.querySelector("#save-design-name-error");
const cancelSaveDesignButton = document.querySelector("#cancel-save-design");
const cancelSaveDesignXButton = document.querySelector("#cancel-save-design-x");
const importDesignsInput = document.querySelector("#import-designs");
const exportDesignsButton = document.querySelector("#export-designs");
const refreshQrButton = document.querySelector("#refresh-qr");
const themeDarkButton = document.querySelector("#theme-dark");
const themeLightButton = document.querySelector("#theme-light");
const contentTypeButtons = document.querySelectorAll("[data-content-type]");
const contentPanels = document.querySelectorAll("[data-content-panel]");
const qrUrlInput = document.querySelector("#qr-url");
const qrTextInput = document.querySelector("#qr-text");
const emailToInput = document.querySelector("#email-to");
const emailSubjectInput = document.querySelector("#email-subject");
const emailBodyInput = document.querySelector("#email-body");
const smsNumberInput = document.querySelector("#sms-number");
const smsMessageInput = document.querySelector("#sms-message");
const wifiSsidInput = document.querySelector("#wifi-ssid");
const wifiPasswordInput = document.querySelector("#wifi-password");
const wifiEncryptionInput = document.querySelector("#wifi-encryption");
const wifiHiddenInput = document.querySelector("#wifi-hidden");
const errorCorrectionInput = document.querySelector("#error-correction");
const moduleStyleInput = document.querySelector("#module-style");
const cornerSquareStyleInput = document.querySelector("#corner-square-style");
const cornerDotStyleInput = document.querySelector("#corner-dot-style");
const colorModeInput = document.querySelector("#color-mode");
const marginInput = document.querySelector("#margin");
const sizeInput = document.querySelector("#size");
const foregroundInput = document.querySelector("#foreground");
const foregroundSecondaryInput = document.querySelector("#foreground-secondary");
const backgroundInput = document.querySelector("#background");
const captionTopInput = document.querySelector("#caption-top");
const captionBottomInput = document.querySelector("#caption-bottom");
const captionFontInput = document.querySelector("#caption-font");
const captionSizeInput = document.querySelector("#caption-size");
const captionWeightInput = document.querySelector("#caption-weight");
const captionColorInput = document.querySelector("#caption-color");
const captionCornersInput = document.querySelector("#caption-corners");
const captionCornerStyleInput = document.querySelector("#caption-corner-style");
const captionCornerColorModeInput = document.querySelector("#caption-corner-color-mode");
const captionCornerColorInput = document.querySelector("#caption-corner-color");
const captionCornerColorSecondaryInput = document.querySelector("#caption-corner-color-secondary");
const accentColorField = document.querySelector("#accent-color-field");
const resetSizeControlsButton = document.querySelector("#reset-size-controls");
const presetButtons = document.querySelectorAll("[data-preset]");
const colorButtons = document.querySelectorAll("[data-color-target]");
const logoSelect = document.querySelector("#logo-select");
const selectedLogoGlyph = document.querySelector("#selected-logo-glyph");
const logoMeta = document.querySelector("#logo-meta");
const logoDetailId = document.querySelector("#logo-detail-id");
const logoDetailSource = document.querySelector("#logo-detail-source");
const logoDetailMode = document.querySelector("#logo-detail-mode");
const logoSizeField = document.querySelector("#logo-size-field");
const logoSizeInput = document.querySelector("#logo-size");
const logoSizeValueOutput = document.querySelector("#logo-size-value");
const openLogoLibraryButton = document.querySelector("#open-logo-library");
const logoLibraryDialog = document.querySelector("#logo-library-dialog");
const closeLogoLibraryButton = document.querySelector("#close-logo-library");
const logoLibrarySearchInput = document.querySelector("#logo-library-search");
const logoLibraryFilters = document.querySelector("#logo-library-filters");
const logoLibraryCount = document.querySelector("#logo-library-count");
const logoLibraryResults = document.querySelector("#logo-library-results");
const qrStage = document.querySelector("#qr-stage");
const targetUrlOutput = document.querySelector("#target-url");
const qrMetaOutput = document.querySelector("#qr-meta");
const statusLine = document.querySelector("#status-line");
const scanStatusText = document.querySelector("#scan-status-text");
const scanGuidance = document.querySelector("#scan-guidance");
const exportSizeInput = document.querySelector("#export-size");
const exportSizeSummary = document.querySelector("#export-size-summary");
const marginValueOutput = document.querySelector("#margin-value");
const sizeValueOutput = document.querySelector("#size-value");
const captionSizeValueOutput = document.querySelector("#caption-size-value");
const printBleedInput = document.querySelector("#print-bleed");
const inkscapeSvgInput = document.querySelector("#inkscape-svg");
const copySvgButton = document.querySelector("#copy-svg");
const downloadSvgButton = document.querySelector("#download-svg");
const downloadPngButton = document.querySelector("#download-png");
const bulkUrlsInput = document.querySelector("#bulk-urls");
const bulkGenerateButton = document.querySelector("#bulk-generate");
const bulkStatus = document.querySelector("#bulk-status");
const advancedBulkCsvInput = document.querySelector("#advanced-bulk-csv");
const advancedBulkFileInput = document.querySelector("#advanced-bulk-file");
const advancedBulkTemplateButton = document.querySelector("#advanced-bulk-template");
const advancedBulkValidateButton = document.querySelector("#advanced-bulk-validate");
const advancedBulkGenerateButton = document.querySelector("#advanced-bulk-generate");
const advancedBulkProgress = document.querySelector("#advanced-bulk-progress");
const advancedBulkStatus = document.querySelector("#advanced-bulk-status");
const validationErrorOutputs = document.querySelectorAll("[data-validation-error-for]");
const modalBackgroundElements = [
  document.querySelector(".top-band"),
  document.querySelector(".app-body"),
  document.querySelector(".app-footer")
].filter(Boolean);

const STORAGE_VERSION = 1;
const STORAGE_KEY = `wikimediaQr.customPresets.v${STORAGE_VERSION}`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M6 6l1 15h10l1-15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const REFRESH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 0 1-15.3 6.4M3 12A9 9 0 0 1 18.3 5.6M18 2v4h-4M6 22v-4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const APP_PICKER_OPTIONS = [
  {
    id: "qr-generator",
    name: "Wikimedia QR Generator",
    description: "Client-side codes for movement links and campaign pages",
    href: "/",
    current: true
  },
  {
    id: "wikiround",
    name: "WikiRound Generator",
    description: "Live Wikimedia logo clusters",
    href: "https://logo-round-gen.toolforge.org/"
  }
];

const QR_PRESETS = {
  article: {
    contentType: "url",
    url: "https://en.wikipedia.org/wiki/Wikimedia_Foundation",
    logo: "wikipedia",
    errorCorrection: "high",
    moduleStyle: "square",
    cornerSquareStyle: "square",
    cornerDotStyle: "square",
    colorMode: "solid",
    foreground: "#202122",
    foregroundSecondary: "#14866d",
    background: "#ffffff"
  },
  commons: {
    contentType: "url",
    url: "https://commons.wikimedia.org/wiki/File:Example_image.svg",
    logo: "commons",
    errorCorrection: "high",
    moduleStyle: "rounded",
    cornerSquareStyle: "dot",
    cornerDotStyle: "dot",
    colorMode: "solid",
    foreground: "#006bb6",
    foregroundSecondary: "#14866d",
    background: "#ffffff"
  },
  wikidata: {
    contentType: "url",
    url: "https://www.wikidata.org/wiki/Q42",
    logo: "wikidata",
    errorCorrection: "high",
    moduleStyle: "square",
    cornerSquareStyle: "square",
    cornerDotStyle: "square",
    colorMode: "solid",
    foreground: "#202122",
    foregroundSecondary: "#049dff",
    background: "#ffffff"
  },
  campaign: {
    contentType: "url",
    url: "https://meta.wikimedia.org/wiki/Wikimania",
    logo: "wikimania",
    errorCorrection: "high",
    moduleStyle: "rounded",
    cornerSquareStyle: "rounded",
    cornerDotStyle: "dot",
    colorMode: "gradient",
    foreground: "#006bb6",
    foregroundSecondary: "#14866d",
    background: "#ffffff"
  }
};
const PRIMARY_FIELD_BY_CONTENT_TYPE = {
  url: "qr-url",
  text: "qr-text",
  email: "email-to",
  sms: "sms-number",
  wifi: "wifi-ssid"
};

let contentType = "url";
let selectedLogo = "none";
let libraryFilter = "all";
let libraryLogosById = new Map();
let libraryLoadingById = {};
let libraryErrorById = {};
let currentSvg = "";
let currentUrl = "";
let currentPngSize = 512;
let customDesigns = readCustomDesigns();
let designsMenuOpen = false;
let designActionsMenuOpen = false;
let appPickerOpen = false;
let appPickerMenu = null;
let actionBusy = false;
let logoLibraryReturnFocus = null;
let saveDesignReturnFocus = null;

for (const element of [
  qrUrlInput,
  qrTextInput,
  emailToInput,
  emailSubjectInput,
  emailBodyInput,
  smsNumberInput,
  smsMessageInput,
  wifiSsidInput,
  wifiPasswordInput,
  wifiEncryptionInput,
  wifiHiddenInput,
  errorCorrectionInput,
  moduleStyleInput,
  cornerSquareStyleInput,
  cornerDotStyleInput,
  colorModeInput,
  marginInput,
  sizeInput,
  foregroundInput,
  foregroundSecondaryInput,
  backgroundInput,
  captionTopInput,
  captionBottomInput,
  captionFontInput,
  captionSizeInput,
  captionWeightInput,
  captionColorInput,
  captionCornersInput,
  captionCornerStyleInput,
  captionCornerColorModeInput,
  captionCornerColorInput,
  captionCornerColorSecondaryInput,
  logoSizeInput,
  exportSizeInput
]) {
  element.addEventListener("input", render);
  element.addEventListener("change", render);
}

form.addEventListener("submit", (event) => event.preventDefault());
for (const button of contentTypeButtons) {
  button.addEventListener("click", () => setContentType(button.dataset.contentType));
}
appPickerButton.addEventListener("click", () => setAppPickerOpen(!appPickerOpen));
designsMenuButton.addEventListener("click", () => setDesignsMenuOpen(!designsMenuOpen));
designActionsMenuButton.addEventListener("click", () => setDesignActionsMenuOpen(!designActionsMenuOpen));
saveDesignButton.addEventListener("click", openSaveDesignDialog);
saveDesignForm.addEventListener("submit", handleSaveDesign);
cancelSaveDesignButton.addEventListener("click", closeSaveDesignDialog);
cancelSaveDesignXButton.addEventListener("click", closeSaveDesignDialog);
importDesignsInput.addEventListener("change", handleImportDesigns);
exportDesignsButton.addEventListener("click", exportDesigns);
refreshQrButton.addEventListener("click", () => {
  render();
  setStatus("QR preview refreshed.", "success");
});
resetSizeControlsButton.addEventListener("click", resetSizeControls);
logoSelect.addEventListener("change", () => {
  selectLogo(logoSelect.value);
});
openLogoLibraryButton.addEventListener("click", openLogoLibrary);
closeLogoLibraryButton.addEventListener("click", closeLogoLibrary);
logoLibraryDialog.addEventListener("mousedown", (event) => {
  if (event.target === logoLibraryDialog) {
    closeLogoLibrary();
  }
});
saveDesignDialog.addEventListener("mousedown", (event) => {
  if (event.target === saveDesignDialog) {
    closeSaveDesignDialog();
  }
});
logoLibrarySearchInput.addEventListener("input", () => {
  renderLogoLibrary();
});
printBleedInput.addEventListener("change", render);
inkscapeSvgInput.addEventListener("change", render);
copySvgButton.addEventListener("click", () => runExportAction(copySvg));
downloadSvgButton.addEventListener("click", () => runExportAction(downloadSvg));
downloadPngButton.addEventListener("click", () => runExportAction(() => downloadPng(Number(exportSizeInput.value))));
bulkGenerateButton.addEventListener("click", runBulkGeneration);
advancedBulkFileInput.addEventListener("change", handleAdvancedBulkFile);
advancedBulkTemplateButton.addEventListener("click", downloadAdvancedBulkTemplate);
advancedBulkValidateButton.addEventListener("click", validateAdvancedBulkCsv);
advancedBulkGenerateButton.addEventListener("click", runAdvancedBulkGeneration);
themeDarkButton.addEventListener("click", () => setTheme("dark"));
themeLightButton.addEventListener("click", () => setTheme("light"));
document.addEventListener("mousedown", (event) => {
  if (appPickerOpen && !appPicker.contains(event.target)) {
    setAppPickerOpen(false);
  }
  if (designsMenuOpen && !designsMenu.contains(event.target)) {
    setDesignsMenuOpen(false);
  }
  if (designActionsMenuOpen && !designActionsMenu.contains(event.target)) {
    setDesignActionsMenuOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setAppPickerOpen(false);
    setDesignsMenuOpen(false);
    setDesignActionsMenuOpen(false);
    closeSaveDesignDialog();
    closeLogoLibrary();
    return;
  }

  if (event.key === "Tab" && isSaveDesignDialogOpen()) {
    trapDialogFocus(saveDesignDialog, event);
    return;
  }

  if (event.key === "Tab" && isLogoLibraryOpen()) {
    trapDialogFocus(logoLibraryDialog, event);
  }
});

initializeLogoSelect();
initializeLogoLibraryFilters();
initializeColorRows();
initializePresets();
renderCustomDesigns();
setTheme(localStorage.getItem("wikimedia-qr-theme") || "light");
setContentType("url");

function setAppPickerOpen(open) {
  appPickerOpen = open;
  appPickerButton.setAttribute("aria-expanded", String(open));

  if (!open) {
    appPickerMenu?.remove();
    appPickerMenu = null;
    return;
  }

  if (!appPickerMenu) {
    appPickerMenu = renderAppPickerMenu();
    appPicker.append(appPickerMenu);
  }
}

function renderAppPickerMenu() {
  const menu = document.createElement("div");
  menu.className = "app-picker-menu";
  menu.id = "app-picker-menu";

  for (const option of APP_PICKER_OPTIONS) {
    const link = document.createElement("a");
    link.className = `app-picker-option${option.current ? " app-picker-option-current" : ""}`;
    link.href = option.href;
    if (option.current) {
      link.setAttribute("aria-current", "page");
    }
    link.addEventListener("click", () => setAppPickerOpen(false));

    const title = document.createElement("span");
    title.className = "app-picker-option-title";

    const name = document.createElement("span");
    name.textContent = option.name;
    title.append(name);

    if (option.current) {
      title.insertAdjacentHTML("beforeend", CHECK_ICON);
    }

    const description = document.createElement("span");
    description.className = "app-picker-option-description";
    description.textContent = option.description;

    link.append(title, description);
    menu.append(link);
  }

  return menu;
}

function setTheme(nextTheme) {
  const theme = nextTheme === "light" ? "light" : "dark";
  appShell.classList.toggle("theme-light", theme === "light");
  appShell.classList.toggle("theme-dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  themeDarkButton.classList.toggle("active", theme === "dark");
  themeLightButton.classList.toggle("active", theme === "light");
  themeDarkButton.setAttribute("aria-pressed", String(theme === "dark"));
  themeLightButton.setAttribute("aria-pressed", String(theme === "light"));
  localStorage.setItem("wikimedia-qr-theme", theme);
}

function setContentType(nextType) {
  contentType = normalizeContentType(nextType);

  for (const button of contentTypeButtons) {
    const active = button.dataset.contentType === contentType;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  for (const panel of contentPanels) {
    panel.classList.toggle("is-hidden", panel.dataset.contentPanel !== contentType);
  }

  render();
}

function render() {
  try {
    logoSizeField.classList.toggle("is-hidden", selectedLogo === "none");
    accentColorField.classList.toggle("is-hidden", colorModeInput.value !== "gradient");
    updateRangeValueOutputs();
    updateLogoDetails();
    syncColorRows();

    const designConfig = getDesignConfig();
    updateExportSizeSummary(designConfig);
    const content = compileContentPayload();
    const qrAsset = createStyledQrSvg(content.payload, designConfig);
    const previewSvg = getCaptionedSvg(qrAsset.svg, designConfig);
    const previewSize = Number(designConfig.size);
    currentPngSize = previewSize;
    currentUrl = content.payload;
    currentSvg = qrAsset.svg;

    qrStage.style.setProperty("--qr-preview-size", `${previewSize}px`);
    qrStage.innerHTML = previewSvg;
    targetUrlOutput.value = content.label;
    qrMetaOutput.value = `v${qrAsset.qr.version} / ${qrAsset.qr.size} modules / EC ${qrAsset.qr.errorCorrection}`;
    clearValidationErrors();

    if (designConfig.logo !== "none") {
      setStatus(
        printBleedInput.checked
          ? "Logo + bleed ready."
          : "Logo correction ready.",
        "success"
      );
      scanStatusText.textContent = "High correction active";
    } else if (printBleedInput.checked) {
      setStatus("Bleed ready.", "success");
      scanStatusText.textContent = "Active and scannable";
    } else {
      setStatus("Ready.", "success");
      scanStatusText.textContent = "Active and scannable";
    }

    updateScanGuidance(designConfig);
    refreshActionState();
  } catch (error) {
    currentSvg = "";
    currentUrl = "";
    renderEmptyPreview(error.message);
    targetUrlOutput.value = "";
    qrMetaOutput.value = "";
    scanStatusText.textContent = "Waiting for valid content";
    scanGuidance.replaceChildren();
    showValidationError(error);
    setStatus(error.message, "error");
    refreshActionState();
  }
}

function createStyledQrSvg(payload, config = getDesignConfig()) {
  const designConfig = normalizeDesignConfig(config);
  const qr = createQrCode(payload, {
    errorCorrection: getEffectiveErrorCorrection(designConfig)
  });

  return {
    qr,
    svg: qr.toSvg({
      margin: Number(designConfig.margin),
      foreground: designConfig.foreground,
      foregroundSecondary: designConfig.foregroundSecondary,
      background: designConfig.background,
      moduleStyle: designConfig.moduleStyle,
      cornerSquareStyle: designConfig.cornerSquareStyle,
      cornerDotStyle: designConfig.cornerDotStyle,
      colorMode: designConfig.colorMode,
      logo: getActiveLogo(designConfig.logo),
      logoSize: Number(designConfig.logoSize) / 100
    })
  };
}

function getEffectiveErrorCorrection(config = getDesignConfig()) {
  return config.logo === "none" ? config.errorCorrection : "high";
}

function compileContentPayload() {
  switch (contentType) {
    case "url":
      return compileUrlPayload();
    case "text":
      return compileTextPayload();
    case "email":
      return compileEmailPayload();
    case "sms":
      return compileSmsPayload();
    case "wifi":
      return compileWifiPayload();
    default:
      throw new Error("Choose a supported QR content type.");
  }
}

function compileUrlPayload() {
  const payload = withField("qr-url", () => normalizeDirectUrl(qrUrlInput.value));
  return { payload, label: payload };
}

function compileTextPayload() {
  const payload = requiredString(qrTextInput.value, "Enter text for the QR code.", "qr-text");
  return { payload, label: summarize(payload, "Text") };
}

function compileEmailPayload() {
  const to = requiredString(emailToInput.value, "Enter an email address.", "email-to");
  const subject = emailSubjectInput.value.trim();
  const body = emailBodyInput.value.trim();
  const params = new URLSearchParams();
  if (subject) {
    params.set("subject", subject);
  }
  if (body) {
    params.set("body", body);
  }

  const query = params.toString();
  const payload = `mailto:${to}${query ? `?${query}` : ""}`;
  return { payload, label: `Email: ${to}` };
}

function compileSmsPayload() {
  const number = normalizePhoneNumber(requiredString(smsNumberInput.value, "Enter a phone number.", "sms-number"));
  const message = smsMessageInput.value.trim();
  const payload = `sms:${number}${message ? `?&body=${encodeURIComponent(message)}` : ""}`;
  return { payload, label: `SMS: ${number}` };
}

function compileWifiPayload() {
  const ssid = requiredString(wifiSsidInput.value, "Enter a WiFi network name.", "wifi-ssid");
  const encryption = wifiEncryptionInput.value;
  const password = wifiPasswordInput.value;
  if (encryption !== "nopass" && !password) {
    throw validationError("Enter a WiFi password or choose no encryption.", "wifi-password");
  }
  const hidden = wifiHiddenInput.checked ? "true" : "false";
  const payload = [
    "WIFI:",
    `T:${escapeWifiValue(encryption)};`,
    `S:${escapeWifiValue(ssid)};`,
    encryption === "nopass" ? "" : `P:${escapeWifiValue(password)};`,
    wifiHiddenInput.checked ? `H:${hidden};` : "",
    ";"
  ].join("");

  return { payload, label: `WiFi: ${ssid}` };
}

function normalizeContentType(value) {
  return ["url", "text", "email", "sms", "wifi"].includes(value) ? value : "url";
}

function normalizePhoneNumber(value) {
  return String(value || "").trim().replace(/[()\s.-]/g, "");
}

function requiredString(value, message, fieldId) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    throw validationError(message, fieldId);
  }
  return trimmed;
}

function validationError(message, fieldId) {
  const error = new Error(message);
  error.fieldId = fieldId;
  return error;
}

function withField(fieldId, task) {
  try {
    return task();
  } catch (error) {
    error.fieldId = error.fieldId || fieldId;
    throw error;
  }
}

function escapeWifiValue(value) {
  return String(value || "").replace(/([\\;,":])/g, "\\$1");
}

function summarize(value, fallback) {
  const trimmed = String(value || "").replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed;
}

function initializeLogoSelect() {
  logoSelect.innerHTML = "";

  for (const logoId of CENTER_LOGO_IDS) {
    ensureLogoOption(logoId);
  }

  logoSelect.value = selectedLogo;
  updateLogoDetails();
}

function ensureLogoOption(logoId) {
  if (!logoId || [...logoSelect.options].some((option) => option.value === logoId)) {
    return;
  }

  const entry = getLogoLibraryEntry(logoId);
  const logo = libraryLogosById.get(logoId) || getLogo(logoId);
  const option = document.createElement("option");
  option.value = logoId;
  option.textContent = logo.shortLabel || logo.label || entry?.name || logoId;
  logoSelect.append(option);
}

function getActiveLogo(logoId) {
  return libraryLogosById.get(logoId) || getLogo(logoId);
}

function advancedBulkOptions() {
  return {
    baseConfig: getDesignConfig(),
    isLogoKnown: isBulkLogoKnown
  };
}

function isBulkLogoKnown(logoId) {
  return CENTER_LOGO_IDS.includes(logoId) || hasLogoLibraryEntry(logoId) || libraryLogosById.has(logoId);
}

async function ensureBulkLogoLoaded(logoId) {
  if (!logoId || logoId === "none" || CENTER_LOGO_IDS.includes(logoId) || libraryLogosById.has(logoId)) {
    return;
  }

  const entry = getLogoLibraryEntry(logoId);
  if (!entry?.commonsTitle) {
    throw new Error(`Logo "${logoId}" is known but cannot be loaded for export.`);
  }

  const logo = await loadLibraryLogo(entry);
  if (!logo) {
    throw new Error(`Could not load logo "${logoId}" for advanced bulk export.`);
  }
}

function initializeLogoLibraryFilters() {
  logoLibraryFilters.innerHTML = "";

  for (const filter of LOGO_LIBRARY_FILTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.logoFilter = filter.id;
    button.innerHTML = `<span>${filter.label}</span><b>${LOGO_LIBRARY_COUNTS[filter.id] || 0}</b>`;
    button.addEventListener("click", () => {
      libraryFilter = filter.id;
      renderLogoLibrary();
    });
    logoLibraryFilters.append(button);
  }

  renderLogoLibrary();
}

function openLogoLibrary() {
  logoLibraryReturnFocus = document.activeElement;
  logoLibraryDialog.classList.remove("is-hidden");
  logoLibraryDialog.setAttribute("aria-hidden", "false");
  setBackgroundInert(true);
  renderLogoLibrary();
  window.setTimeout(() => logoLibrarySearchInput.focus(), 0);
}

function closeLogoLibrary() {
  if (!isLogoLibraryOpen()) {
    return;
  }
  logoLibraryDialog.classList.add("is-hidden");
  logoLibraryDialog.setAttribute("aria-hidden", "true");
  setBackgroundInert(false);
  logoLibraryReturnFocus?.focus?.();
  logoLibraryReturnFocus = null;
}

function isLogoLibraryOpen() {
  return !logoLibraryDialog.classList.contains("is-hidden");
}

function setBackgroundInert(inert) {
  document.documentElement.classList.toggle("modal-open", inert);
  for (const element of modalBackgroundElements) {
    element.inert = inert;
    element.setAttribute("aria-hidden", String(inert));
  }
}

function trapDialogFocus(container, event) {
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function getFocusableElements(container) {
  return [...container.querySelectorAll(
    [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",")
  )].filter((element) => element.offsetParent !== null || element === document.activeElement);
}

function openSaveDesignDialog() {
  saveDesignReturnFocus = document.activeElement;
  saveDesignNameInput.value = "";
  clearSaveDesignNameError();
  setDesignActionsMenuOpen(false);
  saveDesignDialog.classList.remove("is-hidden");
  saveDesignDialog.setAttribute("aria-hidden", "false");
  setBackgroundInert(true);
  window.setTimeout(() => saveDesignNameInput.focus(), 0);
}

function closeSaveDesignDialog() {
  if (!isSaveDesignDialogOpen()) {
    return;
  }
  saveDesignDialog.classList.add("is-hidden");
  saveDesignDialog.setAttribute("aria-hidden", "true");
  setBackgroundInert(false);
  saveDesignReturnFocus?.focus?.();
  saveDesignReturnFocus = null;
}

function isSaveDesignDialogOpen() {
  return !saveDesignDialog.classList.contains("is-hidden");
}

function clearSaveDesignNameError() {
  saveDesignNameInput.removeAttribute("aria-invalid");
  saveDesignNameError.textContent = "";
  saveDesignNameError.classList.remove("is-visible");
}

function showSaveDesignNameError(message) {
  saveDesignNameInput.setAttribute("aria-invalid", "true");
  saveDesignNameError.textContent = message;
  saveDesignNameError.classList.add("is-visible");
}

function renderLogoLibrary() {
  const query = normalizeLogoSearchText(logoLibrarySearchInput.value);
  const tokens = query.split(/\s+/).filter(Boolean);
  const entries = LOGO_LIBRARY_ENTRIES.filter((entry) => {
    if (libraryFilter !== "all" && entry.kind !== libraryFilter) {
      return false;
    }
    if (tokens.length === 0) {
      return true;
    }

    const searchText = normalizeLogoSearchText(`${entry.name} ${entry.code} ${entry.kindLabel} ${entry.commonsTitle}`);
    return tokens.every((token) => searchText.includes(token));
  });

  for (const button of logoLibraryFilters.querySelectorAll("button")) {
    const active = button.dataset.logoFilter === libraryFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  logoLibraryCount.textContent = `${entries.length} logo${entries.length === 1 ? "" : "s"}`;
  logoLibraryResults.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "library-empty";
    empty.textContent = "No matching logos.";
    logoLibraryResults.append(empty);
    return;
  }

  for (const entry of entries) {
    logoLibraryResults.append(renderLogoLibraryCard(entry));
  }
}

function renderLogoLibraryCard(entry) {
  const card = document.createElement("article");
  const isActive = entry.id === selectedLogo;
  const isLoading = Boolean(libraryLoadingById[entry.id]);
  const error = libraryErrorById[entry.id];
  card.className = `library-card${isActive ? " library-card-active" : ""}`;

  const glyph = renderLibraryLogoMark(entry);

  const main = document.createElement("div");
  main.className = "library-card-main";
  const title = document.createElement("div");
  title.className = "library-card-title";
  const strong = document.createElement("strong");
  strong.title = entry.name;
  strong.textContent = entry.name;
  title.append(strong);
  if (entry.code) {
    const code = document.createElement("span");
    code.textContent = entry.code;
    title.append(code);
  }

  const meta = document.createElement("div");
  meta.className = "library-card-meta";
  const kind = document.createElement("span");
  kind.textContent = entry.kindLabel;
  meta.append(kind);
  if (entry.metaPageUrl) {
    const link = document.createElement("a");
    link.href = entry.metaPageUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = entry.local ? "Commons" : "Meta";
    meta.append(link);
  }

  main.append(title, meta);
  if (error) {
    const message = document.createElement("p");
    message.className = "library-card-error";
    message.textContent = error;
    main.append(message);
  }

  const actions = document.createElement("div");
  actions.className = "library-card-actions";
  const button = document.createElement("button");
  button.type = "button";
  button.disabled = isActive || isLoading;
  button.innerHTML = `${isLoading ? REFRESH_ICON : CHECK_ICON}<span>${isActive ? "Center" : "Set center"}</span>`;
  button.addEventListener("click", () => setLibraryLogoAsCenter(entry));
  actions.append(button);

  card.append(glyph, main, actions);
  return card;
}

function renderLibraryLogoMark(entry) {
  const glyph = document.createElement("span");
  const logo = libraryLogosById.get(entry.id);
  const previewUrl = getLogoLibraryPreviewUrl(entry);
  glyph.className = "library-logo-glyph";
  glyph.setAttribute("aria-hidden", "true");

  if (logo?.body) {
    glyph.innerHTML = renderLogoMarkup(logo);
    return glyph;
  }

  if (previewUrl) {
    const image = document.createElement("img");
    image.src = previewUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => renderLibraryLogoFallback(glyph, entry));
    glyph.append(image);
    return glyph;
  }

  renderLibraryLogoFallback(glyph, entry);
  return glyph;
}

function renderLibraryLogoFallback(glyph, entry) {
  glyph.className = "library-logo-placeholder";
  glyph.textContent = String(entry.code || entry.name || "?").slice(0, 3);
}

async function setLibraryLogoAsCenter(entry) {
  let logo = libraryLogosById.get(entry.id);
  if (!logo && entry.commonsTitle) {
    logo = await loadLibraryLogo(entry);
  }
  if (!logo && !entry.local) {
    return;
  }

  selectLogo(entry.id);
  renderLogoLibrary();
}

async function loadLibraryLogo(entry) {
  libraryLoadingById = { ...libraryLoadingById, [entry.id]: true };
  libraryErrorById = removeObjectKey(libraryErrorById, entry.id);
  renderLogoLibrary();

  try {
    const logo = await fetchCatalogCommonsLogo(entry);
    libraryLogosById = new Map(libraryLogosById).set(logo.id, logo);
    ensureLogoOption(logo.id);
    return logo;
  } catch (error) {
    libraryErrorById = {
      ...libraryErrorById,
      [entry.id]: error.message || "Could not load this logo."
    };
    return null;
  } finally {
    libraryLoadingById = removeObjectKey(libraryLoadingById, entry.id);
    renderLogoLibrary();
  }
}

function selectLogo(logoId) {
  selectedLogo = normalizeLogoId(logoId, selectedLogo);
  ensureLogoOption(selectedLogo);
  logoSelect.value = selectedLogo;
  hydrateLibraryLogo(selectedLogo);
  render();
}

function hydrateLibraryLogo(logoId) {
  const entry = getLogoLibraryEntry(logoId);
  if (!entry || !entry.commonsTitle || libraryLogosById.has(logoId) || libraryLoadingById[logoId]) {
    return;
  }

  loadLibraryLogo(entry).then((logo) => {
    if (logo && selectedLogo === logo.id) {
      render();
    }
  });
}

function initializeColorRows() {
  for (const button of colorButtons) {
    button.addEventListener("click", () => {
      const target = document.querySelector(`#${button.dataset.colorTarget}`);
      if (!target) {
        return;
      }
      target.value = button.dataset.color;
      render();
    });
  }
}

function initializePresets() {
  for (const button of presetButtons) {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  }
}

function applyPreset(presetId) {
  const preset = QR_PRESETS[presetId];
  if (!preset) {
    return;
  }

  qrUrlInput.value = preset.url ?? qrUrlInput.value;
  errorCorrectionInput.value = preset.errorCorrection ?? errorCorrectionInput.value;
  moduleStyleInput.value = preset.moduleStyle ?? moduleStyleInput.value;
  cornerSquareStyleInput.value = preset.cornerSquareStyle ?? cornerSquareStyleInput.value;
  cornerDotStyleInput.value = preset.cornerDotStyle ?? cornerDotStyleInput.value;
  colorModeInput.value = preset.colorMode ?? colorModeInput.value;
  foregroundInput.value = preset.foreground ?? foregroundInput.value;
  foregroundSecondaryInput.value = preset.foregroundSecondary ?? foregroundSecondaryInput.value;
  backgroundInput.value = preset.background ?? backgroundInput.value;
  selectedLogo = preset.logo ?? selectedLogo;
  ensureLogoOption(selectedLogo);
  logoSelect.value = selectedLogo;
  hydrateLibraryLogo(selectedLogo);

  for (const button of presetButtons) {
    const active = button.dataset.preset === presetId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  setContentType(preset.contentType ?? "url");
}

function updateLogoDetails() {
  const entry = getLogoLibraryEntry(selectedLogo);
  const logo = getActiveLogo(selectedLogo);
  selectedLogoGlyph.innerHTML = libraryLogosById.has(selectedLogo)
    ? renderLogoMarkup(logo)
    : renderLogoPreview(selectedLogo);
  selectedLogoGlyph.classList.toggle("is-empty", selectedLogo === "none");
  logoMeta.textContent = `ID: ${selectedLogo}`;
  logoDetailId.textContent = selectedLogo;
  logoDetailSource.textContent = logo.sourceTitle || entry?.commonsTitle || "No logo selected";
  logoDetailMode.textContent = selectedLogo === "none" ? "Standard EC" : "High EC forced";
}

function syncColorRows() {
  for (const button of colorButtons) {
    const target = document.querySelector(`#${button.dataset.colorTarget}`);
    const active = target && target.value.toLowerCase() === button.dataset.color.toLowerCase();
    button.classList.toggle("active", Boolean(active));
  }
}

function updateRangeValueOutputs() {
  logoSizeValueOutput.textContent = `${logoSizeInput.value}%`;
  marginValueOutput.textContent = `${marginInput.value} module${marginInput.value === "1" ? "" : "s"}`;
  sizeValueOutput.textContent = `${sizeInput.value} px`;
  captionSizeValueOutput.textContent = `${captionSizeInput.value}%`;
}

function resetSizeControls() {
  marginInput.value = "4";
  sizeInput.value = "512";
  logoSizeInput.value = "24";
  captionSizeInput.value = "6";
  render();
  setStatus("Size controls reset.", "success");
}

function updateScanGuidance(config) {
  const checks = getScanGuidance(config);
  scanGuidance.replaceChildren(
    ...checks.map((check) => {
      const item = document.createElement("li");
      item.dataset.tone = check.tone;
      item.textContent = check.label;
      return item;
    })
  );

  const hasWarning = checks.some((check) => check.tone === "warning");
  if (hasWarning) {
    scanStatusText.textContent = "Review scan checks";
  }
}

function updateExportSizeSummary(config) {
  const dimensions = getExportPixelSize(Number(config.exportSize), config.printBleed);
  exportSizeSummary.textContent = `PNG ${dimensions.total} x ${dimensions.total} px`;
  exportSizeSummary.title = dimensions.bleed
    ? `${dimensions.trim}px export with ${dimensions.bleed}px print bleed on each side`
    : `${dimensions.trim}px export without print bleed`;
}

function getScanGuidance(config) {
  const contrast = Math.min(
    contrastRatio(config.foreground, config.background),
    config.colorMode === "gradient"
      ? contrastRatio(config.foregroundSecondary, config.background)
      : Number.POSITIVE_INFINITY
  );
  const checks = [
    contrast >= 4.5
      ? { tone: "success", label: `Contrast ${contrast.toFixed(1)}:1` }
      : { tone: "warning", label: `Low contrast ${contrast.toFixed(1)}:1` },
    Number(config.margin) >= 4
      ? { tone: "success", label: "Quiet zone OK" }
      : { tone: "warning", label: "Increase quiet zone" }
  ];

  if (config.colorMode === "gradient") {
    checks.push({ tone: "warning", label: "Test gradient scans" });
  }

  if (config.logo !== "none") {
    checks.push({ tone: "success", label: "High EC for logo" });
    if (Number(config.logoSize) > 28) {
      checks.push({ tone: "warning", label: "Logo may be large" });
    }
  }

  return checks;
}

function contrastRatio(firstColor, secondColor) {
  const first = relativeLuminance(firstColor);
  const second = relativeLuminance(secondColor);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color) {
  const channels = parseHexColor(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function parseHexColor(color) {
  const match = String(color || "").match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return [0, 0, 0];
  }
  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16)
  ];
}

function setDesignsMenuOpen(open) {
  designsMenuOpen = open;
  designsDropdown.classList.toggle("is-hidden", !open);
  designsMenuButton.setAttribute("aria-expanded", String(open));
}

function setDesignActionsMenuOpen(open) {
  designActionsMenuOpen = open;
  designActionsMenu.classList.toggle("is-open", open);
  designActionsMenuButton.setAttribute("aria-expanded", String(open));
}

function renderCustomDesigns() {
  designsList.innerHTML = "";
  designsEmpty.classList.toggle("is-hidden", customDesigns.length > 0);
  designsCount.textContent = String(customDesigns.length);
  designsCount.classList.toggle("is-hidden", customDesigns.length === 0);
  exportDesignsButton.disabled = customDesigns.length === 0;
  designsMenuButton.setAttribute(
    "aria-label",
    `My designs${customDesigns.length > 0 ? ` (${customDesigns.length} saved)` : ""}`
  );

  for (const preset of customDesigns) {
    const item = document.createElement("li");
    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.className = "designs-apply";
    applyButton.textContent = preset.name;
    applyButton.addEventListener("click", () => {
      applyDesignConfig(preset.config);
      setDesignsMenuOpen(false);
      setStatus(`Applied "${preset.name}".`, "success");
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${preset.name}`);
    deleteButton.innerHTML = TRASH_ICON;
    deleteButton.addEventListener("click", () => deleteDesign(preset.id));

    item.append(applyButton, deleteButton);
    designsList.append(item);
  }
}

function handleSaveDesign(event) {
  event.preventDefault();
  const trimmed = saveDesignNameInput.value.trim();
  if (!trimmed) {
    showSaveDesignNameError("Enter a name for this design.");
    return;
  }

  customDesigns = [
    ...customDesigns,
    {
      id: createDesignId(),
      name: trimmed,
      config: getDesignConfig()
    }
  ];
  if (!writeCustomDesigns(customDesigns)) {
    customDesigns = customDesigns.slice(0, -1);
    setStatus("Could not save this design in the browser.", "error");
    return;
  }
  renderCustomDesigns();
  closeSaveDesignDialog();
  setStatus(`Saved "${trimmed}".`, "success");
}

function deleteDesign(id) {
  const previousDesigns = customDesigns;
  customDesigns = customDesigns.filter((preset) => preset.id !== id);
  if (!writeCustomDesigns(customDesigns)) {
    customDesigns = previousDesigns;
    setStatus("Could not delete that saved design.", "error");
    return;
  }
  renderCustomDesigns();
  setStatus("Deleted saved design.", "success");
}

function exportDesigns() {
  try {
    downloadBlob(
      "wikimedia-qr-designs.json",
      new Blob([serializeCustomDesigns(customDesigns)], { type: "application/json;charset=utf-8" })
    );
    setStatus(`Exported ${customDesigns.length} design${customDesigns.length === 1 ? "" : "s"}.`, "success");
  } catch (error) {
    setStatus(error.message || "Could not export saved designs.", "error");
  }
}

async function handleImportDesigns(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    const imported = parseImportedDesigns(await file.text());
    customDesigns = [
      ...customDesigns,
      ...imported.map((preset) => ({ ...preset, id: createDesignId() }))
    ];
    if (!writeCustomDesigns(customDesigns)) {
      customDesigns = customDesigns.slice(0, -imported.length);
      setStatus("Could not import designs into browser storage.", "error");
      return;
    }
    renderCustomDesigns();
    setStatus(`Imported ${imported.length} design${imported.length === 1 ? "" : "s"}.`, "success");
  } catch (error) {
    setStatus(error.message || "Could not import designs.", "error");
  }
}

function getDesignConfig() {
  return {
    contentType,
    url: qrUrlInput.value,
    text: qrTextInput.value,
    emailTo: emailToInput.value,
    emailSubject: emailSubjectInput.value,
    emailBody: emailBodyInput.value,
    smsNumber: smsNumberInput.value,
    smsMessage: smsMessageInput.value,
    wifiSsid: wifiSsidInput.value,
    wifiPassword: wifiPasswordInput.value,
    wifiEncryption: wifiEncryptionInput.value,
    wifiHidden: wifiHiddenInput.checked,
    errorCorrection: errorCorrectionInput.value,
    moduleStyle: moduleStyleInput.value,
    cornerSquareStyle: cornerSquareStyleInput.value,
    cornerDotStyle: cornerDotStyleInput.value,
    colorMode: colorModeInput.value,
    margin: marginInput.value,
    size: sizeInput.value,
    foreground: foregroundInput.value,
    foregroundSecondary: foregroundSecondaryInput.value,
    background: backgroundInput.value,
    captionTop: captionTopInput.value,
    captionBottom: captionBottomInput.value,
    captionFont: captionFontInput.value,
    captionSize: captionSizeInput.value,
    captionWeight: captionWeightInput.value,
    captionColor: captionColorInput.value,
    captionCorners: captionCornersInput.checked,
    captionCornerStyle: captionCornerStyleInput.value,
    captionCornerColorMode: captionCornerColorModeInput.value,
    captionCornerColor: captionCornerColorInput.value,
    captionCornerColorSecondary: captionCornerColorSecondaryInput.value,
    logo: selectedLogo,
    logoSize: logoSizeInput.value,
    exportSize: exportSizeInput.value,
    printBleed: printBleedInput.checked,
    inkscapeSvg: inkscapeSvgInput.checked
  };
}

function applyDesignConfig(config) {
  const normalized = normalizeDesignConfig(config);
  qrUrlInput.value = normalized.url;
  qrTextInput.value = normalized.text;
  emailToInput.value = normalized.emailTo;
  emailSubjectInput.value = normalized.emailSubject;
  emailBodyInput.value = normalized.emailBody;
  smsNumberInput.value = normalized.smsNumber;
  smsMessageInput.value = normalized.smsMessage;
  wifiSsidInput.value = normalized.wifiSsid;
  wifiPasswordInput.value = normalized.wifiPassword;
  wifiEncryptionInput.value = normalized.wifiEncryption;
  wifiHiddenInput.checked = normalized.wifiHidden;
  errorCorrectionInput.value = normalized.errorCorrection;
  moduleStyleInput.value = normalized.moduleStyle;
  cornerSquareStyleInput.value = normalized.cornerSquareStyle;
  cornerDotStyleInput.value = normalized.cornerDotStyle;
  colorModeInput.value = normalized.colorMode;
  marginInput.value = normalized.margin;
  sizeInput.value = normalized.size;
  foregroundInput.value = normalized.foreground;
  foregroundSecondaryInput.value = normalized.foregroundSecondary;
  backgroundInput.value = normalized.background;
  captionTopInput.value = normalized.captionTop;
  captionBottomInput.value = normalized.captionBottom;
  captionFontInput.value = normalized.captionFont;
  captionSizeInput.value = normalized.captionSize;
  captionWeightInput.value = normalized.captionWeight;
  captionColorInput.value = normalized.captionColor;
  captionCornersInput.checked = normalized.captionCorners;
  captionCornerStyleInput.value = normalized.captionCornerStyle;
  captionCornerColorModeInput.value = normalized.captionCornerColorMode;
  captionCornerColorInput.value = normalized.captionCornerColor;
  captionCornerColorSecondaryInput.value = normalized.captionCornerColorSecondary;
  selectedLogo = normalized.logo;
  ensureLogoOption(selectedLogo);
  logoSelect.value = selectedLogo;
  hydrateLibraryLogo(selectedLogo);
  logoSizeInput.value = normalized.logoSize;
  exportSizeInput.value = normalized.exportSize;
  printBleedInput.checked = normalized.printBleed;
  inkscapeSvgInput.checked = normalized.inkscapeSvg;

  for (const button of presetButtons) {
    button.classList.remove("is-active");
    button.setAttribute("aria-pressed", "false");
  }

  setContentType(normalized.contentType);
}

function normalizeDesignConfig(config) {
  const fallback = getDesignConfig();
  const source = config && typeof config === "object" ? config : {};
  const legacyUrl = legacyConfigUrl(source, fallback.url);
  return {
    contentType: normalizeContentType(source.contentType || (source.mode ? "url" : fallback.contentType)),
    url: stringValue(source.url, legacyUrl),
    text: stringValue(source.text, fallback.text),
    emailTo: stringValue(source.emailTo, fallback.emailTo),
    emailSubject: stringValue(source.emailSubject, fallback.emailSubject),
    emailBody: stringValue(source.emailBody, fallback.emailBody),
    smsNumber: stringValue(source.smsNumber, fallback.smsNumber),
    smsMessage: stringValue(source.smsMessage, fallback.smsMessage),
    wifiSsid: stringValue(source.wifiSsid, fallback.wifiSsid),
    wifiPassword: stringValue(source.wifiPassword, fallback.wifiPassword),
    wifiEncryption: optionValue(wifiEncryptionInput, source.wifiEncryption, fallback.wifiEncryption),
    wifiHidden: Boolean(source.wifiHidden),
    errorCorrection: optionValue(errorCorrectionInput, source.errorCorrection, fallback.errorCorrection),
    moduleStyle: optionValue(moduleStyleInput, source.moduleStyle, fallback.moduleStyle),
    cornerSquareStyle: optionValue(cornerSquareStyleInput, source.cornerSquareStyle, fallback.cornerSquareStyle),
    cornerDotStyle: optionValue(cornerDotStyleInput, source.cornerDotStyle, fallback.cornerDotStyle),
    colorMode: optionValue(colorModeInput, source.colorMode, fallback.colorMode),
    margin: rangeValue(marginInput, source.margin, fallback.margin),
    size: rangeValue(sizeInput, source.size, fallback.size),
    foreground: colorValue(source.foreground, fallback.foreground),
    foregroundSecondary: colorValue(source.foregroundSecondary, fallback.foregroundSecondary),
    background: colorValue(source.background, fallback.background),
    captionTop: stringValue(source.captionTop, fallback.captionTop),
    captionBottom: stringValue(source.captionBottom, fallback.captionBottom),
    captionFont: optionValue(captionFontInput, source.captionFont, fallback.captionFont),
    captionSize: rangeValue(captionSizeInput, source.captionSize, fallback.captionSize),
    captionWeight: optionValue(captionWeightInput, source.captionWeight, fallback.captionWeight),
    captionColor: colorValue(source.captionColor, fallback.captionColor),
    captionCorners: booleanValue(source.captionCorners, fallback.captionCorners),
    captionCornerStyle: optionValue(captionCornerStyleInput, source.captionCornerStyle, fallback.captionCornerStyle),
    captionCornerColorMode: optionValue(captionCornerColorModeInput, source.captionCornerColorMode, fallback.captionCornerColorMode),
    captionCornerColor: colorValue(source.captionCornerColor, fallback.captionCornerColor),
    captionCornerColorSecondary: colorValue(source.captionCornerColorSecondary, fallback.captionCornerColorSecondary),
    logo: normalizeLogoId(source.logo, fallback.logo),
    logoSize: rangeValue(logoSizeInput, source.logoSize, fallback.logoSize),
    exportSize: optionValue(exportSizeInput, source.exportSize, fallback.exportSize),
    printBleed: booleanValue(source.printBleed, fallback.printBleed),
    inkscapeSvg: booleanValue(source.inkscapeSvg, fallback.inkscapeSvg)
  };
}

function legacyConfigUrl(source, fallback) {
  if (typeof source.url === "string") {
    return source.url;
  }
  if (typeof source.directUrl === "string" && source.directUrl.trim()) {
    return source.directUrl;
  }
  if (source.project && source.title) {
    try {
      return buildWikimediaUrl({
        project: source.project,
        language: source.language || "en",
        title: source.title
      });
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeDesignPreset(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  if (!name || !entry.config || typeof entry.config !== "object") {
    return null;
  }
  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : createDesignId(),
    name,
    config: normalizeDesignConfig(entry.config)
  };
}

function readCustomDesigns() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const payload = JSON.parse(raw);
    if (payload.version !== STORAGE_VERSION || !Array.isArray(payload.presets)) {
      return [];
    }
    return payload.presets.map(normalizeDesignPreset).filter(Boolean);
  } catch {
    return [];
  }
}

function writeCustomDesigns(presets) {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeCustomDesigns(presets));
    return true;
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
    return false;
  }
}

function serializeCustomDesigns(presets) {
  return JSON.stringify({ version: STORAGE_VERSION, presets }, null, 2);
}

function parseImportedDesigns(text) {
  const payload = JSON.parse(text);
  const list = Array.isArray(payload) ? payload : payload && payload.presets;
  if (!Array.isArray(list)) {
    throw new Error("No designs found in file");
  }
  const presets = list.map(normalizeDesignPreset).filter(Boolean);
  if (presets.length === 0) {
    throw new Error("No valid designs found in file");
  }
  return presets;
}

function createDesignId() {
  return `design-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function optionValue(select, value, fallback) {
  const candidate = String(value ?? "");
  return [...select.options].some((option) => option.value === candidate) ? candidate : fallback;
}

function normalizeLogoId(value, fallback = "none") {
  const logoId = typeof value === "string" ? value : "";
  if (CENTER_LOGO_IDS.includes(logoId) || hasLogoLibraryEntry(logoId) || libraryLogosById.has(logoId)) {
    return logoId;
  }
  return fallback;
}

function rangeValue(input, value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  const min = Number(input.min);
  const max = Number(input.max);
  const clamped = Math.min(max, Math.max(min, number));
  return String(Math.round(clamped));
}

function colorValue(value, fallback) {
  const candidate = String(value ?? "");
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}

function stringValue(value, fallback) {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value, fallback) {
  return typeof value === "boolean" ? value : Boolean(fallback);
}

function removeObjectKey(object, key) {
  const { [key]: removed, ...rest } = object;
  return rest;
}

function clearValidationErrors() {
  for (const output of validationErrorOutputs) {
    output.textContent = "";
    output.classList.remove("is-visible");
    const field = document.querySelector(`#${output.dataset.validationErrorFor}`);
    field?.removeAttribute("aria-invalid");
  }
}

function showValidationError(error) {
  clearValidationErrors();
  const fieldId = error.fieldId || PRIMARY_FIELD_BY_CONTENT_TYPE[contentType];
  const field = fieldId ? document.querySelector(`#${fieldId}`) : null;
  const output = fieldId ? document.querySelector(`[data-validation-error-for="${fieldId}"]`) : null;

  field?.setAttribute("aria-invalid", "true");
  if (output) {
    output.textContent = error.message || "Enter valid QR content.";
    output.classList.add("is-visible");
  }
}

function renderEmptyPreview(message) {
  qrStage.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "qr-empty-state";

  const title = document.createElement("strong");
  title.textContent = "QR preview paused";

  const copy = document.createElement("span");
  copy.textContent = message || "Enter valid content to generate a scannable QR code.";

  empty.append(title, copy);
  qrStage.append(empty);
}

function setStatus(message, tone) {
  statusLine.textContent = message;
  statusLine.dataset.tone = tone;
}

function setActionBusy(busy) {
  actionBusy = busy;
  refreshActionState();
}

function refreshActionState() {
  const exportDisabled = actionBusy || !currentSvg;
  copySvgButton.disabled = exportDisabled;
  downloadSvgButton.disabled = exportDisabled;
  downloadPngButton.disabled = exportDisabled;
  bulkGenerateButton.disabled = actionBusy;
  advancedBulkTemplateButton.disabled = actionBusy;
  advancedBulkValidateButton.disabled = actionBusy;
  advancedBulkGenerateButton.disabled = actionBusy;
}

function setBulkStatus(message, tone = "") {
  bulkStatus.value = message;
  bulkStatus.dataset.tone = tone;
}

function setAdvancedBulkStatus(message, tone = "") {
  advancedBulkStatus.value = message;
  advancedBulkStatus.dataset.tone = tone;
}

function setAdvancedBulkProgress(value, max) {
  advancedBulkProgress.max = Math.max(1, max);
  advancedBulkProgress.value = Math.max(0, Math.min(value, max));
}

async function runExportAction(action) {
  setActionBusy(true);
  try {
    await action();
  } catch (error) {
    setStatus(error.message || "Export failed.", "error");
  } finally {
    setActionBusy(false);
  }
}

async function runBulkGeneration() {
  setActionBusy(true);
  try {
    await generateBulkZip();
  } catch (error) {
    const message = error.message || "Bulk generation failed.";
    setStatus(message, "error");
    setBulkStatus(message, "error");
  } finally {
    setActionBusy(false);
  }
}

async function runAdvancedBulkGeneration() {
  setActionBusy(true);
  try {
    await generateAdvancedBulkZip();
  } catch (error) {
    const message = error.issues
      ? formatAdvancedBulkIssues(error.issues)
      : error.message || "Advanced bulk generation failed.";
    setStatus("Advanced CSV bulk failed. See the CSV status for details.", "error");
    setAdvancedBulkStatus(message, "error");
  } finally {
    setActionBusy(false);
  }
}

function validateAdvancedBulkCsv() {
  const result = lintAdvancedBulkCsv(advancedBulkCsvInput.value, advancedBulkOptions());
  if (result.ok) {
    setAdvancedBulkProgress(0, result.rows.length || 1);
    setAdvancedBulkStatus(
      `Validated ${result.rows.length} row${result.rows.length === 1 ? "" : "s"}. Blank cells will inherit the current design.`,
      "success"
    );
    setStatus("Advanced CSV validated.", "success");
  } else {
    setAdvancedBulkProgress(0, 1);
    setAdvancedBulkStatus(formatAdvancedBulkIssues(result.issues), "error");
    setStatus(`Advanced CSV has ${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}.`, "error");
  }
  return result;
}

async function handleAdvancedBulkFile() {
  const file = advancedBulkFileInput.files?.[0];
  if (!file) {
    return;
  }

  try {
    advancedBulkCsvInput.value = await file.text();
    setAdvancedBulkStatus(`Loaded ${file.name}. Validate before generating.`, "success");
    setAdvancedBulkProgress(0, 1);
  } catch (error) {
    setAdvancedBulkStatus(error.message || "Could not read the CSV file.", "error");
  }
}

function downloadAdvancedBulkTemplate() {
  const csv = createAdvancedBulkTemplateCsv(getDesignConfig());
  downloadBlob("wikimedia-qr-advanced-template.csv", new Blob([csv], { type: "text/csv;charset=utf-8" }));
  setAdvancedBulkStatus("Template CSV downloaded.", "success");
}

function downloadSvg() {
  downloadBlob(svgFileName(), new Blob([getExportSvg(currentSvg, getDesignConfig(), svgFileName())], { type: "image/svg+xml" }));
  setStatus("SVG downloaded.", "success");
}

async function downloadPng(size = currentPngSize) {
  const designConfig = getDesignConfig();
  const dimensions = getExportPixelSize(size, designConfig.printBleed);
  const blob = await createPngBlob(getRasterSvg(currentSvg, designConfig), dimensions.total, designConfig.background);

  downloadBlob(`${fileBaseName()}${fileExportSuffix(designConfig)}.png`, blob);
  setStatus(`PNG downloaded at ${dimensions.total} x ${dimensions.total}.`, "success");
}

async function generateBulkZip() {
  const urls = parseBulkUrlList(bulkUrlsInput.value);
  const designConfig = getDesignConfig();
  const dimensions = getExportPixelSize(Number(designConfig.exportSize), designConfig.printBleed);
  const suffix = fileExportSuffix(designConfig);
  const files = [];

  setBulkStatus(`Validated ${urls.length} URL${urls.length === 1 ? "" : "s"}.`, "success");

  for (const [index, url] of urls.entries()) {
    const svg = getRasterSvg(createStyledQrSvg(url, designConfig).svg, designConfig);
    const blob = await createPngBlob(svg, dimensions.total, designConfig.background);
    files.push({
      name: bulkQrFileName(url, index, { suffix }),
      data: new Uint8Array(await blob.arrayBuffer())
    });
    setBulkStatus(`Generated ${index + 1}/${urls.length}.`, "success");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  downloadBlob(`wikimedia-qr-bulk${suffix}.zip`, createZipBlob(files));
  setStatus(`Bulk ZIP downloaded with ${urls.length} QR code${urls.length === 1 ? "" : "s"}.`, "success");
  setBulkStatus(`Downloaded ${urls.length} QR code${urls.length === 1 ? "" : "s"} as PNG ZIP.`, "success");
}

async function generateAdvancedBulkZip() {
  const rows = parseAdvancedBulkCsv(advancedBulkCsvInput.value, advancedBulkOptions());
  const files = [];
  const usedNames = new Set();

  if (rows.length === 0) {
    throw new Error("Advanced CSV has no rows to generate.");
  }

  setAdvancedBulkProgress(0, rows.length);
  setAdvancedBulkStatus(`Validated ${rows.length} row${rows.length === 1 ? "" : "s"}. Starting generation...`, "success");

  for (const [index, row] of rows.entries()) {
    await ensureBulkLogoLoaded(row.config.logo);

    const qrAsset = createStyledQrSvg(row.payload, row.config);
    if (row.format === "svg" || row.format === "both") {
      const name = uniqueZipName(advancedBulkFileName(row, "svg", row.index), usedNames);
      const svg = getExportSvg(qrAsset.svg, row.config, name);
      files.push({ name, data: svg });
    }

    if (row.format === "png" || row.format === "both") {
      const dimensions = getExportPixelSize(Number(row.exportSize), row.config.printBleed);
      const svg = getRasterSvg(qrAsset.svg, row.config);
      const blob = await createPngBlob(svg, dimensions.total, row.config.background);
      files.push({
        name: uniqueZipName(advancedBulkFileName(row, "png", row.index), usedNames),
        data: new Uint8Array(await blob.arrayBuffer())
      });
    }

    setAdvancedBulkProgress(index + 1, rows.length);
    setAdvancedBulkStatus(`Generated ${index + 1}/${rows.length}: ${row.filenameBase}`, "success");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  downloadBlob("wikimedia-qr-advanced-bulk.zip", createZipBlob(files));
  setStatus(`Advanced ZIP downloaded with ${files.length} file${files.length === 1 ? "" : "s"}.`, "success");
  setAdvancedBulkStatus(`Downloaded ${files.length} file${files.length === 1 ? "" : "s"} from ${rows.length} CSV row${rows.length === 1 ? "" : "s"}.`, "success");
}

async function createPngBlob(svg, size, background = backgroundInput.value) {
  const image = new Image();
  const svgBlob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create a PNG canvas.");
    }
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, size, size);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("Could not build the PNG file.");
    }
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function copySvg() {
  const svg = getExportSvg();
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(svg);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = svg;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  setStatus("SVG copied to clipboard.", "success");
}

function downloadBlob(filename, blob) {
  if (!blob) {
    throw new Error("Could not build the export file.");
  }
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function uniqueZipName(name, usedNames) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }

  const match = String(name).match(/^(.*?)(\.[^.]+)?$/);
  const base = match?.[1] || "wikimedia-qr";
  const extension = match?.[2] || "";
  let counter = 2;
  let candidate = `${base}-${counter}${extension}`;
  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}${extension}`;
  }
  usedNames.add(candidate);
  return candidate;
}

function getExportSvg(svg = currentSvg, config = getDesignConfig(), documentName = svgFileName()) {
  const designConfig = normalizeDesignConfig(config);
  return addInkscapeDataToSvg(getRasterSvg(svg, designConfig), {
    documentName,
    enabled: designConfig.inkscapeSvg,
    title: "Wikimedia QR code"
  });
}

function getRasterSvg(svg = currentSvg, config = getDesignConfig()) {
  const designConfig = normalizeDesignConfig(config);
  const captionedSvg = getCaptionedSvg(svg, designConfig);
  const svgWithBleed = addPrintBleedToSvg(captionedSvg, {
    background: designConfig.background,
    enabled: designConfig.printBleed
  });

  return stripInkscapeDataFromSvg(svgWithBleed);
}

function getCaptionedSvg(svg, config = getDesignConfig()) {
  return addCaptionsToSvg(svg, getCaptionOptions(config));
}

function getCaptionOptions(config = getDesignConfig()) {
  const designConfig = normalizeDesignConfig(config);
  return {
    background: designConfig.background,
    bottomText: designConfig.captionBottom,
    color: designConfig.captionColor,
    cornerColor: designConfig.captionCornerColor,
    cornerColorMode: designConfig.captionCornerColorMode,
    cornerColorSecondary: designConfig.captionCornerColorSecondary,
    cornersEnabled: designConfig.captionCorners,
    cornerStyle: designConfig.captionCornerStyle,
    fontFamily: designConfig.captionFont,
    fontSizePercent: Number(designConfig.captionSize),
    fontWeight: designConfig.captionWeight,
    topText: designConfig.captionTop
  };
}

function svgFileName() {
  return `${fileBaseName()}${fileExportSuffix(getDesignConfig(), { includeInkscape: true })}.svg`;
}

function fileExportSuffix(config = getDesignConfig(), { includeInkscape = false } = {}) {
  const designConfig = normalizeDesignConfig(config);
  const parts = [];
  if (designConfig.printBleed) {
    parts.push("bleed");
  }
  if (includeInkscape && designConfig.inkscapeSvg) {
    parts.push("inkscape");
  }
  return parts.length ? `-${parts.join("-")}` : "";
}

function fileBaseName() {
  try {
    const url = new URL(currentUrl);
    const slug = `${url.hostname}${url.pathname}`
      .replace(/^www\./, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return slug || "wikimedia-qr";
  } catch {
    return "wikimedia-qr";
  }
}
