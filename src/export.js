export const PRINT_BLEED_RATIO = 0.05;

export function getPrintBleedPixels(trimSize, enabled, ratio = PRINT_BLEED_RATIO) {
  const size = Number(trimSize);
  if (!enabled || !Number.isFinite(size) || size <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(size * normalizeBleedRatio(ratio)));
}

export function getExportPixelSize(trimSize, enabled, ratio = PRINT_BLEED_RATIO) {
  const size = Number(trimSize);
  const safeSize = Number.isFinite(size) && size > 0 ? Math.round(size) : 0;
  const bleed = getPrintBleedPixels(safeSize, enabled, ratio);
  return {
    bleed,
    total: safeSize + bleed * 2,
    trim: safeSize
  };
}

export function addPrintBleedToSvg(svg, options = {}) {
  if (!options.enabled) {
    return svg;
  }

  const ratio = normalizeBleedRatio(options.ratio);
  const viewBoxMatch = String(svg).match(/\bviewBox="([^"]+)"/);
  if (!viewBoxMatch) {
    return svg;
  }

  const viewBox = parseViewBox(viewBoxMatch[1]);
  if (!viewBox) {
    return svg;
  }

  const bleedX = viewBox.width * ratio;
  const bleedY = viewBox.height * ratio;
  const expanded = {
    x: viewBox.x - bleedX,
    y: viewBox.y - bleedY,
    width: viewBox.width + bleedX * 2,
    height: viewBox.height + bleedY * 2
  };
  const expandedViewBox = [
    expanded.x,
    expanded.y,
    expanded.width,
    expanded.height
  ].map(formatNumber).join(" ");
  const background = escapeAttribute(options.background || "#ffffff");
  const bleedPath = `<path fill="${background}" d="M${formatNumber(expanded.x)} ${formatNumber(expanded.y)}h${formatNumber(expanded.width)}v${formatNumber(expanded.height)}H${formatNumber(expanded.x)}z"/>`;

  return String(svg)
    .replace(viewBoxMatch[0], `viewBox="${expandedViewBox}"`)
    .replace(/(<svg\b[^>]*>)/, `$1${bleedPath}`);
}

function parseViewBox(value) {
  const values = String(value).trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || !values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) {
    return null;
  }

  return {
    x: values[0],
    y: values[1],
    width: values[2],
    height: values[3]
  };
}

function formatNumber(value) {
  return Number.parseFloat(value.toFixed(3));
}

function normalizeBleedRatio(value) {
  return Number.isFinite(value) && value > 0 ? value : PRINT_BLEED_RATIO;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
