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

export function addCaptionsToSvg(svg, options = {}) {
  const topText = normalizeCaptionText(options.topText);
  const bottomText = normalizeCaptionText(options.bottomText);
  if (!topText && !bottomText) {
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
  const availableHeight = Math.max(viewBox.height * 0.5, viewBox.height - topBand - bottomBand);
  const qrSize = Math.min(viewBox.width, availableHeight);
  const qrScale = qrSize / Math.max(viewBox.width, viewBox.height);
  const qrX = viewBox.x + (viewBox.width - viewBox.width * qrScale) / 2;
  const qrY = viewBox.y + topBand + (availableHeight - viewBox.height * qrScale) / 2;
  const centerX = viewBox.x + viewBox.width / 2;
  const maxTextWidth = viewBox.width * 0.9;
  const background = escapeAttribute(options.background || "#ffffff");
  const color = escapeAttribute(options.color || "#202122");
  const weight = normalizeCaptionWeight(options.fontWeight);
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
    `<path fill="${background}" d="M${formatNumber(viewBox.x)} ${formatNumber(viewBox.y)}h${formatNumber(viewBox.width)}v${formatNumber(viewBox.height)}H${formatNumber(viewBox.x)}z"/>`,
    topText ? renderCaptionText(topText, {
      color,
      fontSize,
      maxTextWidth,
      weight,
      x: centerX,
      y: viewBox.y + topBand / 2
    }) : "",
    qrLayer,
    bottomText ? renderCaptionText(bottomText, {
      color,
      fontSize,
      maxTextWidth,
      weight,
      x: centerX,
      y: viewBox.y + viewBox.height - bottomBand / 2
    }) : "",
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

function renderCaptionText(text, options) {
  const fitAttributes = getCaptionFitAttributes(text, options.fontSize, options.maxTextWidth);
  return `<text x="${formatNumber(options.x)}" y="${formatNumber(options.y)}" fill="${options.color}" font-family="Arial, Helvetica, sans-serif" font-size="${formatNumber(options.fontSize)}" font-weight="${options.weight}" text-anchor="middle" dominant-baseline="middle"${fitAttributes}>${escapeText(text)}</text>`;
}

function getCaptionFitAttributes(text, fontSize, maxWidth) {
  const estimatedWidth = text.length * fontSize * 0.56;
  if (estimatedWidth <= maxWidth) {
    return "";
  }
  return ` textLength="${formatNumber(maxWidth)}" lengthAdjust="spacingAndGlyphs"`;
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
