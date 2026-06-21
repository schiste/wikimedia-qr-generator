export const PRINT_BLEED_RATIO = 0.05;

const OPEN_SOURCE_CAPTION_FONTS = {
  "atkinson-hyperlegible": "'Atkinson Hyperlegible', 'Inter', 'Noto Sans'",
  "fira-sans": "'Fira Sans', 'Inter', 'Noto Sans'",
  inter: "'Inter', 'Noto Sans', 'Open Sans'",
  "noto-sans": "'Noto Sans', 'Inter', 'Open Sans'",
  "open-sans": "'Open Sans', 'Noto Sans', 'Inter'",
  roboto: "'Roboto', 'Noto Sans', 'Inter'",
  "source-sans-3": "'Source Sans 3', 'Source Sans Pro', 'Noto Sans'"
};

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

export function addCaptionsToSvg(svg, options = {}) {
  const topText = normalizeCaptionText(options.topText);
  const bottomText = normalizeCaptionText(options.bottomText);
  const cornersEnabled = Boolean(options.cornersEnabled);
  if (!topText && !bottomText && !cornersEnabled) {
    return svg;
  }

  const svgString = String(svg);
  const rootMatch = svgString.match(/<svg\b[^>]*>/);
  const closeIndex = svgString.lastIndexOf("</svg>");
  if (!rootMatch || closeIndex === -1) {
    return svg;
  }

  const viewBoxMatch = rootMatch[0].match(/\bviewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? parseViewBox(viewBoxMatch[1]) : null;
  if (!viewBox) {
    return svg;
  }

  const fontSize = viewBox.width * normalizeCaptionSizePercent(options.fontSizePercent) / 100;
  const topBand = topText ? fontSize * 2 : 0;
  const bottomBand = bottomText ? fontSize * 2 : 0;
  const cornerInset = cornersEnabled ? viewBox.width * 0.06 : 0;
  const availableWidth = Math.max(viewBox.width * 0.5, viewBox.width - cornerInset * 2);
  const availableHeight = Math.max(viewBox.height * 0.5, viewBox.height - cornerInset * 2 - topBand - bottomBand);
  const qrScale = Math.min(
    availableWidth / viewBox.width,
    availableHeight / viewBox.height
  );
  const qrWidth = viewBox.width * qrScale;
  const qrHeight = viewBox.height * qrScale;
  const qrX = viewBox.x + (viewBox.width - qrWidth) / 2;
  const qrY = viewBox.y + cornerInset + topBand + (availableHeight - qrHeight) / 2;
  const qrBottom = qrY + qrHeight;
  const pageTop = viewBox.y + (cornersEnabled ? getCornerMarkerInset(viewBox) : 0);
  const pageBottom = viewBox.y + viewBox.height - (cornersEnabled ? getCornerMarkerInset(viewBox) : 0);
  const centerX = viewBox.x + viewBox.width / 2;
  const maxTextWidth = availableWidth * 0.94;
  const background = escapeAttribute(options.background || "#ffffff");
  const color = escapeAttribute(options.color || "#202122");
  const fontFamily = escapeAttribute(normalizeCaptionFontFamily(options.fontFamily));
  const weight = normalizeCaptionWeight(options.fontWeight);
  const cornerDefs = cornersEnabled ? renderCornerDefs(options) : "";
  const cornerLayer = cornersEnabled ? renderPageCorners(viewBox, options) : "";
  const inner = svgString.slice(rootMatch.index + rootMatch[0].length, closeIndex);
  const outerRoot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${formatViewBox(viewBox)}" role="img" aria-label="QR code with captions">`;
  const qrLayer = [
    `<g transform="translate(${formatNumber(qrX)} ${formatNumber(qrY)}) scale(${formatNumber(qrScale)})" shape-rendering="crispEdges">`,
    viewBox.x || viewBox.y ? `<g transform="translate(${formatNumber(-viewBox.x)} ${formatNumber(-viewBox.y)})">` : "",
    inner,
    viewBox.x || viewBox.y ? "</g>" : "",
    "</g>"
  ].join("");

  return [
    outerRoot,
    cornerDefs,
    `<path fill="${background}" d="M${formatNumber(viewBox.x)} ${formatNumber(viewBox.y)}h${formatNumber(viewBox.width)}v${formatNumber(viewBox.height)}H${formatNumber(viewBox.x)}z"/>`,
    qrLayer,
    topText ? renderCaptionText(topText, {
      color,
      fontFamily,
      fontSize,
      maxTextWidth,
      weight,
      x: centerX,
      y: (pageTop + qrY) / 2
    }) : "",
    bottomText ? renderCaptionText(bottomText, {
      color,
      fontFamily,
      fontSize,
      maxTextWidth,
      weight,
      x: centerX,
      y: (qrBottom + pageBottom) / 2
    }) : "",
    cornerLayer,
    "</svg>"
  ].filter(Boolean).join("");
}

export function stripInkscapeDataFromSvg(svg) {
  return String(svg)
    .replace(/<metadata\b[\s\S]*?<\/metadata>/gi, "")
    .replace(/<sodipodi:namedview\b[\s\S]*?<\/sodipodi:namedview>/gi, "")
    .replace(/<sodipodi:namedview\b[^>]*\/>/gi, "")
    .replace(/\s(?:inkscape|sodipodi):[A-Za-z_][\w:.-]*=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\sxmlns:(?:inkscape|sodipodi|rdf|dc|cc)=(?:"[^"]*"|'[^']*')/gi, "");
}

export function addInkscapeDataToSvg(svg, options = {}) {
  if (!options.enabled) {
    return svg;
  }

  const svgString = String(svg);
  if (svgString.includes('id="wikimedia-qr-inkscape-metadata"')) {
    return svgString;
  }

  const rootMatch = svgString.match(/<svg\b[^>]*>/);
  if (!rootMatch) {
    return svg;
  }

  const title = escapeText(options.title || "Wikimedia QR code");
  const documentName = options.documentName || "wikimedia-qr.svg";
  const rootTag = addSvgRootAttributes(rootMatch[0], {
    "xmlns:dc": "http://purl.org/dc/elements/1.1/",
    "xmlns:cc": "http://creativecommons.org/ns#",
    "xmlns:rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "xmlns:sodipodi": "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd",
    "xmlns:inkscape": "http://www.inkscape.org/namespaces/inkscape",
    "sodipodi:docname": documentName,
    "inkscape:version": "1.3"
  });
  const metadata = [
    '<metadata id="wikimedia-qr-inkscape-metadata">',
    "<rdf:RDF>",
    '<cc:Work rdf:about="">',
    "<dc:format>image/svg+xml</dc:format>",
    '<dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>',
    `<dc:title>${title}</dc:title>`,
    "<dc:creator><cc:Agent><dc:title>Wikimedia QR Generator</dc:title></cc:Agent></dc:creator>",
    "</cc:Work>",
    "</rdf:RDF>",
    "</metadata>"
  ].join("");
  const namedView = [
    '<sodipodi:namedview id="wikimedia-qr-inkscape-view"',
    ' pagecolor="#ffffff"',
    ' bordercolor="#666666"',
    ' borderopacity="1"',
    ' inkscape:pageopacity="0"',
    ' inkscape:pageshadow="2"',
    ' inkscape:pagecheckerboard="0"',
    ' inkscape:deskcolor="#d1d1d1"',
    ' inkscape:document-units="px"/>'
  ].join("");

  return svgString.replace(rootMatch[0], `${rootTag}${metadata}${namedView}`);
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

function formatViewBox(viewBox) {
  return [
    viewBox.x,
    viewBox.y,
    viewBox.width,
    viewBox.height
  ].map(formatNumber).join(" ");
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

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeCaptionText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function normalizeCaptionSizePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 6;
  }
  return Math.min(12, Math.max(4, number));
}

function normalizeCaptionWeight(value) {
  const weight = String(value ?? "");
  return ["400", "600", "700"].includes(weight) ? weight : "600";
}

function normalizeCaptionFontFamily(value) {
  const font = String(value ?? "");
  return OPEN_SOURCE_CAPTION_FONTS[font] || OPEN_SOURCE_CAPTION_FONTS.inter;
}

function renderCaptionText(text, options) {
  const fitAttributes = getCaptionFitAttributes(text, options.fontSize, options.maxTextWidth);
  return `<text x="${formatNumber(options.x)}" y="${formatNumber(options.y)}" fill="${options.color}" font-family="${options.fontFamily}" font-size="${formatNumber(options.fontSize)}" font-weight="${options.weight}" text-anchor="middle" dominant-baseline="middle"${fitAttributes}>${escapeText(text)}</text>`;
}

function getCaptionFitAttributes(text, fontSize, maxWidth) {
  const estimatedWidth = text.length * fontSize * 0.56;
  if (estimatedWidth <= maxWidth) {
    return "";
  }
  return ` textLength="${formatNumber(maxWidth)}" lengthAdjust="spacingAndGlyphs"`;
}

function renderCornerDefs(options) {
  if (options.cornerColorMode !== "gradient") {
    return "";
  }
  const start = escapeAttribute(options.cornerColor || "#202122");
  const end = escapeAttribute(options.cornerColorSecondary || "#006bb6");
  return `<defs><linearGradient id="qr-page-corners-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs>`;
}

function renderPageCorners(viewBox, options) {
  const stroke = options.cornerColorMode === "gradient"
    ? "url(#qr-page-corners-gradient)"
    : escapeAttribute(options.cornerColor || "#202122");
  const style = options.cornerStyle === "rounded" ? "rounded" : "right";
  const strokeWidth = getCornerStrokeWidth(viewBox);
  const inset = getCornerMarkerInset(viewBox);
  const length = viewBox.width * 0.12;
  const radius = length * 0.32;
  const paths = style === "rounded"
    ? renderRoundedCornerPaths(viewBox, inset, length, radius)
    : renderRightCornerPaths(viewBox, inset, length);
  const lineJoin = style === "rounded" ? "round" : "miter";
  return `<g class="page-corners" fill="none" stroke="${stroke}" stroke-width="${formatNumber(strokeWidth)}" stroke-linecap="round" stroke-linejoin="${lineJoin}">${paths}</g>`;
}

function getCornerStrokeWidth(viewBox) {
  return Math.max(0.8, viewBox.width * 0.012);
}

function getCornerMarkerInset(viewBox) {
  return getCornerStrokeWidth(viewBox) * 2;
}

function renderRightCornerPaths(viewBox, inset, length) {
  const left = viewBox.x + inset;
  const right = viewBox.x + viewBox.width - inset;
  const top = viewBox.y + inset;
  const bottom = viewBox.y + viewBox.height - inset;
  return [
    `M${formatNumber(left)} ${formatNumber(top + length)}V${formatNumber(top)}H${formatNumber(left + length)}`,
    `M${formatNumber(right - length)} ${formatNumber(top)}H${formatNumber(right)}V${formatNumber(top + length)}`,
    `M${formatNumber(right)} ${formatNumber(bottom - length)}V${formatNumber(bottom)}H${formatNumber(right - length)}`,
    `M${formatNumber(left + length)} ${formatNumber(bottom)}H${formatNumber(left)}V${formatNumber(bottom - length)}`
  ].map((path) => `<path d="${path}"/>`).join("");
}

function renderRoundedCornerPaths(viewBox, inset, length, radius) {
  const left = viewBox.x + inset;
  const right = viewBox.x + viewBox.width - inset;
  const top = viewBox.y + inset;
  const bottom = viewBox.y + viewBox.height - inset;
  return [
    `M${formatNumber(left)} ${formatNumber(top + length)}V${formatNumber(top + radius)}Q${formatNumber(left)} ${formatNumber(top)} ${formatNumber(left + radius)} ${formatNumber(top)}H${formatNumber(left + length)}`,
    `M${formatNumber(right - length)} ${formatNumber(top)}H${formatNumber(right - radius)}Q${formatNumber(right)} ${formatNumber(top)} ${formatNumber(right)} ${formatNumber(top + radius)}V${formatNumber(top + length)}`,
    `M${formatNumber(right)} ${formatNumber(bottom - length)}V${formatNumber(bottom - radius)}Q${formatNumber(right)} ${formatNumber(bottom)} ${formatNumber(right - radius)} ${formatNumber(bottom)}H${formatNumber(right - length)}`,
    `M${formatNumber(left + length)} ${formatNumber(bottom)}H${formatNumber(left + radius)}Q${formatNumber(left)} ${formatNumber(bottom)} ${formatNumber(left)} ${formatNumber(bottom - radius)}V${formatNumber(bottom - length)}`
  ].map((path) => `<path d="${path}"/>`).join("");
}

function addSvgRootAttributes(rootTag, attributes) {
  let tag = rootTag;
  for (const [name, value] of Object.entries(attributes)) {
    if (hasSvgRootAttribute(tag, name)) {
      continue;
    }
    tag = tag.replace(/>$/, ` ${name}="${escapeAttribute(value)}">`);
  }
  return tag;
}

function hasSvgRootAttribute(rootTag, name) {
  return new RegExp(`\\s${escapeRegExp(name)}=`).test(rootTag);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
