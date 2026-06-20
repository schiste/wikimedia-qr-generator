import { createQrCode } from "./qr.js";
import {
  buildWikimediaUrl,
  isLikelyWikimediaHost,
  normalizeDirectUrl,
  projectUsesLanguage
} from "./wikimedia.js";
import { getLogo, renderLogoPreview } from "./logos.js";

const form = document.querySelector("#qr-form");
const appShell = document.querySelector("#app-shell");
const brandMark = document.querySelector("#brand-mark");
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
const logoPicker = document.querySelector("#logo-picker");
const logoSizeField = document.querySelector("#logo-size-field");
const logoSizeInput = document.querySelector("#logo-size");
const qrStage = document.querySelector("#qr-stage");
const targetUrlOutput = document.querySelector("#target-url");
const qrMetaOutput = document.querySelector("#qr-meta");
const statusLine = document.querySelector("#status-line");
const scanStatusText = document.querySelector("#scan-status-text");
const downloadFormatInput = document.querySelector("#download-format");
const exportSizeInput = document.querySelector("#export-size");
const downloadQrButton = document.querySelector("#download-qr");
const copySvgButton = document.querySelector("#copy-svg");

let mode = "build";
let selectedLogo = "none";
let currentSvg = "";
let currentUrl = "";
let currentPngSize = 512;

for (const element of [
  form,
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

buildMode.addEventListener("click", () => setMode("build"));
directMode.addEventListener("click", () => setMode("direct"));
downloadQrButton.addEventListener("click", downloadSelectedFormat);
copySvgButton.addEventListener("click", copySvg);
themeDarkButton.addEventListener("click", () => setTheme("dark"));
themeLightButton.addEventListener("click", () => setTheme("light"));

brandMark.innerHTML = renderLogoPreview("wikimedia");
initializeLogoPicker();
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

function initializeLogoPicker() {
  for (const button of logoPicker.querySelectorAll("[data-logo]")) {
    const logoId = button.dataset.logo;
    const mark = button.querySelector(".logo-option__mark");
    if (mark) {
      mark.innerHTML = renderLogoPreview(logoId);
    }
    button.addEventListener("click", () => {
      selectedLogo = logoId;
      for (const option of logoPicker.querySelectorAll("[data-logo]")) {
        const active = option.dataset.logo === selectedLogo;
        option.classList.toggle("is-active", active);
        option.setAttribute("aria-pressed", String(active));
      }
      render();
    });
  }
}

function setStatus(message, tone) {
  statusLine.textContent = message;
  statusLine.dataset.tone = tone;
}

function setActionState(disabled) {
  downloadQrButton.disabled = disabled;
  copySvgButton.disabled = disabled;
}

function downloadSelectedFormat() {
  if (downloadFormatInput.value === "svg") {
    downloadSvg();
    return;
  }
  downloadPng(Number(exportSizeInput.value));
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
