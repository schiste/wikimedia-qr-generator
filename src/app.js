import { createQrCode } from "./qr.js";
import {
  buildWikimediaUrl,
  isLikelyWikimediaHost,
  normalizeDirectUrl,
  projectUsesLanguage
} from "./wikimedia.js";
import { CENTER_LOGO_IDS, getLogo, renderLogoPreview } from "./logos.js";

const form = document.querySelector("#qr-form");
const appShell = document.querySelector("#app-shell");
const designsMenu = document.querySelector("#designs-menu");
const designsMenuButton = document.querySelector("#designs-menu-button");
const designsDropdown = document.querySelector("#designs-dropdown");
const designsCount = document.querySelector("#designs-count");
const designsEmpty = document.querySelector("#designs-empty");
const designsList = document.querySelector("#designs-list");
const saveDesignButton = document.querySelector("#save-design");
const importDesignsInput = document.querySelector("#import-designs");
const exportDesignsButton = document.querySelector("#export-designs");
const refreshQrButton = document.querySelector("#refresh-qr");
const themeDarkButton = document.querySelector("#theme-dark");
const themeLightButton = document.querySelector("#theme-light");
const buildMode = document.querySelector("#build-mode");
const directMode = document.querySelector("#direct-mode");
const builderFields = document.querySelector("#builder-fields");
const directFields = document.querySelector("#direct-fields");
const projectInput = document.querySelector("#project");
const languageField = document.querySelector("#language-field");
const languageInput = document.querySelector("#language");
const titleInput = document.querySelector("#title");
const directUrlInput = document.querySelector("#direct-url");
const errorCorrectionInput = document.querySelector("#error-correction");
const moduleStyleInput = document.querySelector("#module-style");
const colorModeInput = document.querySelector("#color-mode");
const marginInput = document.querySelector("#margin");
const sizeInput = document.querySelector("#size");
const foregroundInput = document.querySelector("#foreground");
const foregroundSecondaryInput = document.querySelector("#foreground-secondary");
const backgroundInput = document.querySelector("#background");
const accentColorField = document.querySelector("#accent-color-field");
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
const qrStage = document.querySelector("#qr-stage");
const targetUrlOutput = document.querySelector("#target-url");
const qrMetaOutput = document.querySelector("#qr-meta");
const statusLine = document.querySelector("#status-line");
const scanStatusText = document.querySelector("#scan-status-text");
const exportSizeInput = document.querySelector("#export-size");
const copySvgButton = document.querySelector("#copy-svg");
const downloadSvgButton = document.querySelector("#download-svg");
const downloadPngButton = document.querySelector("#download-png");

const STORAGE_VERSION = 1;
const STORAGE_KEY = `wikimediaQr.customPresets.v${STORAGE_VERSION}`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6V4h8v2M10 11v6M14 11v6M6 6l1 15h10l1-15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const QR_PRESETS = {
  article: {
    mode: "build",
    project: "wikipedia",
    language: "en",
    title: "Wikimedia Foundation",
    logo: "wikipedia",
    errorCorrection: "high",
    moduleStyle: "square",
    colorMode: "solid",
    foreground: "#202122",
    foregroundSecondary: "#14866d",
    background: "#ffffff"
  },
  commons: {
    mode: "build",
    project: "commons",
    title: "File:Example image.svg",
    logo: "commons",
    errorCorrection: "high",
    moduleStyle: "rounded",
    colorMode: "solid",
    foreground: "#006bb6",
    foregroundSecondary: "#14866d",
    background: "#ffffff"
  },
  wikidata: {
    mode: "build",
    project: "wikidata",
    title: "Q42",
    logo: "wikidata",
    errorCorrection: "high",
    moduleStyle: "square",
    colorMode: "solid",
    foreground: "#202122",
    foregroundSecondary: "#049dff",
    background: "#ffffff"
  },
  campaign: {
    mode: "direct",
    directUrl: "https://meta.wikimedia.org/wiki/Wikimania",
    logo: "wikimedia",
    errorCorrection: "high",
    moduleStyle: "rounded",
    colorMode: "gradient",
    foreground: "#006bb6",
    foregroundSecondary: "#14866d",
    background: "#ffffff"
  }
};

let mode = "build";
let selectedLogo = "none";
let currentSvg = "";
let currentUrl = "";
let currentPngSize = 512;
let customDesigns = readCustomDesigns();
let designsMenuOpen = false;

for (const element of [
  projectInput,
  languageInput,
  titleInput,
  directUrlInput,
  errorCorrectionInput,
  moduleStyleInput,
  colorModeInput,
  marginInput,
  sizeInput,
  foregroundInput,
  foregroundSecondaryInput,
  backgroundInput,
  logoSizeInput
]) {
  element.addEventListener("input", render);
  element.addEventListener("change", render);
}

form.addEventListener("submit", (event) => event.preventDefault());
buildMode.addEventListener("click", () => setMode("build"));
directMode.addEventListener("click", () => setMode("direct"));
designsMenuButton.addEventListener("click", () => setDesignsMenuOpen(!designsMenuOpen));
saveDesignButton.addEventListener("click", handleSaveDesign);
importDesignsInput.addEventListener("change", handleImportDesigns);
exportDesignsButton.addEventListener("click", exportDesigns);
refreshQrButton.addEventListener("click", () => {
  render();
  setStatus("QR preview refreshed.", "success");
});
logoSelect.addEventListener("change", () => {
  selectedLogo = logoSelect.value;
  render();
});
copySvgButton.addEventListener("click", copySvg);
downloadSvgButton.addEventListener("click", downloadSvg);
downloadPngButton.addEventListener("click", () => downloadPng(Number(exportSizeInput.value)));
themeDarkButton.addEventListener("click", () => setTheme("dark"));
themeLightButton.addEventListener("click", () => setTheme("light"));
document.addEventListener("mousedown", (event) => {
  if (designsMenuOpen && !designsMenu.contains(event.target)) {
    setDesignsMenuOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setDesignsMenuOpen(false);
  }
});

initializeLogoSelect();
initializeColorRows();
initializePresets();
renderCustomDesigns();
setTheme(localStorage.getItem("wikimedia-qr-theme") || "dark");
setMode("build");

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

function setMode(nextMode) {
  mode = nextMode;
  const isBuild = mode === "build";

  buildMode.classList.toggle("is-active", isBuild);
  buildMode.setAttribute("aria-selected", String(isBuild));
  directMode.classList.toggle("is-active", !isBuild);
  directMode.setAttribute("aria-selected", String(!isBuild));
  builderFields.classList.toggle("is-hidden", !isBuild);
  directFields.classList.toggle("is-hidden", isBuild);

  render();
}

function render() {
  try {
    languageField.classList.toggle("is-hidden", !projectUsesLanguage(projectInput.value));
    logoSizeField.classList.toggle("is-hidden", selectedLogo === "none");
    accentColorField.classList.toggle("is-hidden", colorModeInput.value !== "gradient");
    updateLogoDetails();
    syncColorRows();

    const url = mode === "build"
      ? buildWikimediaUrl({
        project: projectInput.value,
        language: languageInput.value,
        title: titleInput.value
      })
      : normalizeDirectUrl(directUrlInput.value);

    const effectiveErrorCorrection = selectedLogo === "none"
      ? errorCorrectionInput.value
      : "high";
    const qr = createQrCode(url, {
      errorCorrection: effectiveErrorCorrection
    });

    const margin = Number(marginInput.value);
    const previewSize = Number(sizeInput.value);
    currentPngSize = previewSize;
    currentUrl = url;
    currentSvg = qr.toSvg({
      margin,
      foreground: foregroundInput.value,
      foregroundSecondary: foregroundSecondaryInput.value,
      background: backgroundInput.value,
      moduleStyle: moduleStyleInput.value,
      colorMode: colorModeInput.value,
      logo: getLogo(selectedLogo),
      logoSize: Number(logoSizeInput.value) / 100
    });

    qrStage.style.setProperty("--qr-preview-size", `${previewSize}px`);
    qrStage.innerHTML = currentSvg;
    targetUrlOutput.value = url;
    qrMetaOutput.value = `v${qr.version} / ${qr.size} modules / EC ${qr.errorCorrection}`;

    if (mode === "direct" && !isLikelyWikimediaHost(url)) {
      setStatus("Direct URL is not a recognized Wikimedia movement domain.", "error");
      scanStatusText.textContent = "Review target domain";
    } else if (selectedLogo !== "none") {
      setStatus("Logo selected; high error correction is applied for scannability.", "success");
      scanStatusText.textContent = "High correction active";
    } else {
      setStatus("Ready to export.", "success");
      scanStatusText.textContent = "Active and scannable";
    }

    setActionState(false);
  } catch (error) {
    currentSvg = "";
    currentUrl = "";
    qrStage.innerHTML = "";
    targetUrlOutput.value = "";
    qrMetaOutput.value = "";
    scanStatusText.textContent = "Waiting for valid content";
    setStatus(error.message, "error");
    setActionState(true);
  }
}

function initializeLogoSelect() {
  logoSelect.innerHTML = "";

  for (const logoId of CENTER_LOGO_IDS) {
    const logo = getLogo(logoId);
    const option = document.createElement("option");
    option.value = logoId;
    option.textContent = logo.shortLabel || logo.label;
    logoSelect.append(option);
  }

  logoSelect.value = selectedLogo;
  updateLogoDetails();
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

  projectInput.value = preset.project ?? projectInput.value;
  languageInput.value = preset.language ?? languageInput.value;
  titleInput.value = preset.title ?? titleInput.value;
  directUrlInput.value = preset.directUrl ?? directUrlInput.value;
  errorCorrectionInput.value = preset.errorCorrection ?? errorCorrectionInput.value;
  moduleStyleInput.value = preset.moduleStyle ?? moduleStyleInput.value;
  colorModeInput.value = preset.colorMode ?? colorModeInput.value;
  foregroundInput.value = preset.foreground ?? foregroundInput.value;
  foregroundSecondaryInput.value = preset.foregroundSecondary ?? foregroundSecondaryInput.value;
  backgroundInput.value = preset.background ?? backgroundInput.value;
  selectedLogo = preset.logo ?? selectedLogo;
  logoSelect.value = selectedLogo;

  for (const button of presetButtons) {
    const active = button.dataset.preset === presetId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  setMode(preset.mode ?? "build");
}

function updateLogoDetails() {
  const logo = getLogo(selectedLogo);
  selectedLogoGlyph.innerHTML = renderLogoPreview(selectedLogo);
  selectedLogoGlyph.classList.toggle("is-empty", selectedLogo === "none");
  logoMeta.textContent = `ID: ${selectedLogo}`;
  logoDetailId.textContent = selectedLogo;
  logoDetailSource.textContent = logo.sourceTitle || "No logo selected";
  logoDetailMode.textContent = selectedLogo === "none" ? "Standard EC" : "High EC forced";
}

function syncColorRows() {
  for (const button of colorButtons) {
    const target = document.querySelector(`#${button.dataset.colorTarget}`);
    const active = target && target.value.toLowerCase() === button.dataset.color.toLowerCase();
    button.classList.toggle("active", Boolean(active));
  }
}

function setDesignsMenuOpen(open) {
  designsMenuOpen = open;
  designsDropdown.classList.toggle("is-hidden", !open);
  designsMenuButton.setAttribute("aria-expanded", String(open));
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
    applyButton.setAttribute("role", "menuitem");
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

function handleSaveDesign() {
  const name = window.prompt("Name this design");
  const trimmed = name && name.trim();
  if (!trimmed) {
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
  writeCustomDesigns(customDesigns);
  renderCustomDesigns();
  setStatus(`Saved "${trimmed}".`, "success");
}

function deleteDesign(id) {
  customDesigns = customDesigns.filter((preset) => preset.id !== id);
  writeCustomDesigns(customDesigns);
  renderCustomDesigns();
}

function exportDesigns() {
  downloadBlob(
    "wikimedia-qr-designs.json",
    new Blob([serializeCustomDesigns(customDesigns)], { type: "application/json;charset=utf-8" })
  );
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
    writeCustomDesigns(customDesigns);
    renderCustomDesigns();
    setStatus(`Imported ${imported.length} design${imported.length === 1 ? "" : "s"}.`, "success");
  } catch (error) {
    window.alert(error.message || "Could not import designs.");
  }
}

function getDesignConfig() {
  return {
    mode,
    project: projectInput.value,
    language: languageInput.value,
    title: titleInput.value,
    directUrl: directUrlInput.value,
    errorCorrection: errorCorrectionInput.value,
    moduleStyle: moduleStyleInput.value,
    colorMode: colorModeInput.value,
    margin: marginInput.value,
    size: sizeInput.value,
    foreground: foregroundInput.value,
    foregroundSecondary: foregroundSecondaryInput.value,
    background: backgroundInput.value,
    logo: selectedLogo,
    logoSize: logoSizeInput.value,
    exportSize: exportSizeInput.value
  };
}

function applyDesignConfig(config) {
  const normalized = normalizeDesignConfig(config);
  projectInput.value = normalized.project;
  languageInput.value = normalized.language;
  titleInput.value = normalized.title;
  directUrlInput.value = normalized.directUrl;
  errorCorrectionInput.value = normalized.errorCorrection;
  moduleStyleInput.value = normalized.moduleStyle;
  colorModeInput.value = normalized.colorMode;
  marginInput.value = normalized.margin;
  sizeInput.value = normalized.size;
  foregroundInput.value = normalized.foreground;
  foregroundSecondaryInput.value = normalized.foregroundSecondary;
  backgroundInput.value = normalized.background;
  selectedLogo = normalized.logo;
  logoSelect.value = selectedLogo;
  logoSizeInput.value = normalized.logoSize;
  exportSizeInput.value = normalized.exportSize;

  for (const button of presetButtons) {
    button.classList.remove("is-active");
    button.setAttribute("aria-pressed", "false");
  }

  setMode(normalized.mode);
}

function normalizeDesignConfig(config) {
  const fallback = getDesignConfig();
  const source = config && typeof config === "object" ? config : {};
  return {
    mode: source.mode === "direct" ? "direct" : "build",
    project: optionValue(projectInput, source.project, fallback.project),
    language: optionValue(languageInput, source.language, fallback.language),
    title: stringValue(source.title, fallback.title),
    directUrl: stringValue(source.directUrl, fallback.directUrl),
    errorCorrection: optionValue(errorCorrectionInput, source.errorCorrection, fallback.errorCorrection),
    moduleStyle: optionValue(moduleStyleInput, source.moduleStyle, fallback.moduleStyle),
    colorMode: optionValue(colorModeInput, source.colorMode, fallback.colorMode),
    margin: rangeValue(marginInput, source.margin, fallback.margin),
    size: rangeValue(sizeInput, source.size, fallback.size),
    foreground: colorValue(source.foreground, fallback.foreground),
    foregroundSecondary: colorValue(source.foregroundSecondary, fallback.foregroundSecondary),
    background: colorValue(source.background, fallback.background),
    logo: CENTER_LOGO_IDS.includes(source.logo) ? source.logo : fallback.logo,
    logoSize: rangeValue(logoSizeInput, source.logoSize, fallback.logoSize),
    exportSize: optionValue(exportSizeInput, source.exportSize, fallback.exportSize)
  };
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
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
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

function setStatus(message, tone) {
  statusLine.textContent = message;
  statusLine.dataset.tone = tone;
}

function setActionState(disabled) {
  copySvgButton.disabled = disabled;
  downloadSvgButton.disabled = disabled;
  downloadPngButton.disabled = disabled;
}

function downloadSvg() {
  downloadBlob(`${fileBaseName()}.svg`, new Blob([currentSvg], { type: "image/svg+xml" }));
}

async function downloadPng(size = currentPngSize) {
  const image = new Image();
  const svgBlob = new Blob([currentSvg], { type: "image/svg+xml" });
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
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, size, size);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    downloadBlob(`${fileBaseName()}.png`, blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function copySvg() {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(currentSvg);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = currentSvg;
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
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
