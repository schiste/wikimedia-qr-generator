import { parseCsv, formatCsvIssues } from "./csv.js";
import { getExportPixelSize } from "./export.js";
import { normalizeDirectUrl } from "./wikimedia.js";

export const ADVANCED_BULK_LIMIT = 100;
export const ADVANCED_BULK_MAX_RASTER_PIXELS = 200_000_000;
export const ADVANCED_BULK_COLUMNS = [
  "filename",
  "format",
  "contentType",
  "url",
  "text",
  "emailTo",
  "emailSubject",
  "emailBody",
  "smsNumber",
  "smsMessage",
  "wifiSsid",
  "wifiPassword",
  "wifiEncryption",
  "wifiHidden",
  "logo",
  "logoSize",
  "errorCorrection",
  "moduleStyle",
  "cornerSquareStyle",
  "cornerDotStyle",
  "colorMode",
  "foreground",
  "foregroundSecondary",
  "background",
  "margin",
  "size",
  "captionTop",
  "captionBottom",
  "captionFont",
  "captionSize",
  "captionWeight",
  "captionColor",
  "captionCorners",
  "captionCornerStyle",
  "captionCornerColorMode",
  "captionCornerColor",
  "captionCornerColorSecondary",
  "exportSize",
  "printBleed",
  "inkscapeSvg"
];

export const ADVANCED_BULK_TEMPLATE_COLUMNS = [
  "filename",
  "format",
  "contentType",
  "url",
  "text",
  "emailTo",
  "emailSubject",
  "emailBody",
  "smsNumber",
  "smsMessage",
  "wifiSsid",
  "wifiPassword",
  "wifiEncryption",
  "wifiHidden",
  "logo",
  "logoSize",
  "errorCorrection",
  "moduleStyle",
  "cornerSquareStyle",
  "cornerDotStyle",
  "colorMode",
  "foreground",
  "foregroundSecondary",
  "background",
  "margin",
  "captionTop",
  "captionBottom",
  "captionFont",
  "captionSize",
  "captionWeight",
  "captionColor",
  "captionCorners",
  "captionCornerStyle",
  "captionCornerColorMode",
  "captionCornerColor",
  "captionCornerColorSecondary",
  "exportSize",
  "printBleed",
  "inkscapeSvg"
];

const FORMAT_VALUES = ["png", "svg", "both"];
const CONTENT_TYPE_VALUES = ["url", "text", "email", "sms", "wifi"];
const ERROR_CORRECTION_VALUES = ["low", "medium", "quartile", "high"];
const MODULE_STYLE_VALUES = ["square", "rounded", "dot"];
const CORNER_SQUARE_STYLE_VALUES = ["square", "rounded", "extra-rounded", "dot"];
const CORNER_DOT_STYLE_VALUES = ["square", "rounded", "dot"];
const COLOR_MODE_VALUES = ["solid", "gradient"];
const CAPTION_FONT_VALUES = ["atkinson-hyperlegible", "fira-sans", "inter", "noto-sans", "open-sans", "roboto", "source-sans-3"];
const CAPTION_WEIGHT_VALUES = ["400", "600", "700"];
const CAPTION_CORNER_STYLE_VALUES = ["right", "rounded"];
const WIFI_ENCRYPTION_VALUES = ["WPA", "WEP", "nopass"];
const WIFI_ENCRYPTION_ALIASES = new Map([
  ["wpa", "WPA"],
  ["wpa2", "WPA"],
  ["wpa/wpa2", "WPA"],
  ["wep", "WEP"],
  ["none", "nopass"],
  ["no", "nopass"],
  ["nopass", "nopass"],
  ["open", "nopass"]
]);

const FIELD_RULES = {
  filename: { type: "filename" },
  format: { type: "enum", values: FORMAT_VALUES },
  contentType: { type: "enum", values: CONTENT_TYPE_VALUES },
  url: { type: "string" },
  text: { type: "string" },
  emailTo: { type: "email" },
  emailSubject: { type: "string" },
  emailBody: { type: "string" },
  smsNumber: { type: "phone" },
  smsMessage: { type: "string" },
  wifiSsid: { type: "string" },
  wifiPassword: { type: "string" },
  wifiEncryption: { type: "wifiEncryption" },
  wifiHidden: { type: "boolean" },
  logo: { type: "logo" },
  logoSize: { type: "integer", min: 18, max: 32 },
  errorCorrection: { type: "enum", values: ERROR_CORRECTION_VALUES },
  moduleStyle: { type: "enum", values: MODULE_STYLE_VALUES },
  cornerSquareStyle: { type: "enum", values: CORNER_SQUARE_STYLE_VALUES },
  cornerDotStyle: { type: "enum", values: CORNER_DOT_STYLE_VALUES },
  colorMode: { type: "enum", values: COLOR_MODE_VALUES },
  foreground: { type: "color" },
  foregroundSecondary: { type: "color" },
  background: { type: "color" },
  margin: { type: "integer", min: 2, max: 8 },
  size: { type: "integer", min: 192, max: 1024 },
  captionTop: { type: "string" },
  captionBottom: { type: "string" },
  captionFont: { type: "enum", values: CAPTION_FONT_VALUES },
  captionSize: { type: "integer", min: 4, max: 12 },
  captionWeight: { type: "enum", values: CAPTION_WEIGHT_VALUES },
  captionColor: { type: "color" },
  captionCorners: { type: "boolean" },
  captionCornerStyle: { type: "enum", values: CAPTION_CORNER_STYLE_VALUES },
  captionCornerColorMode: { type: "enum", values: COLOR_MODE_VALUES },
  captionCornerColor: { type: "color" },
  captionCornerColorSecondary: { type: "color" },
  exportSize: { type: "integer", min: 128, max: 4096 },
  printBleed: { type: "boolean" },
  inkscapeSvg: { type: "boolean" }
};

const HEADER_MAP = new Map(ADVANCED_BULK_COLUMNS.map((column) => [normalizeHeader(column), column]));

export class AdvancedBulkValidationError extends Error {
  constructor(issues) {
    super(formatAdvancedBulkIssues(issues));
    this.name = "AdvancedBulkValidationError";
    this.issues = issues;
  }
}

export function lintAdvancedBulkCsv(text, options = {}) {
  const issues = [];
  const baseConfig = { ...(options.baseConfig || {}) };
  let parsed;

  try {
    parsed = parseCsv(text);
  } catch (error) {
    return {
      ok: false,
      issues: normalizeParseIssues(error.issues || [{ line: 1, message: error.message }]),
      rows: []
    };
  }

  const headerInfo = normalizeHeaders(parsed.headers, issues);
  if (parsed.rows.length > (options.limit || ADVANCED_BULK_LIMIT)) {
    issues.push(makeIssue(
      parsed.rows[(options.limit || ADVANCED_BULK_LIMIT)]?.lineNumber || parsed.rows.at(-1)?.lineNumber || 1,
      null,
      `Advanced CSV bulk supports up to ${options.limit || ADVANCED_BULK_LIMIT} rows at a time.`
    ));
  }

  const rows = [];
  for (const row of parsed.rows.slice(0, options.limit || ADVANCED_BULK_LIMIT)) {
    const rowIssues = [];
    const overrides = {};
    const output = {};

    headerInfo.columns.forEach((column, index) => {
      if (!column) {
        return;
      }

      const originalHeader = headerInfo.originalHeaders[index];
      const rawValue = row.values[originalHeader];
      if (String(rawValue || "").trim() === "") {
        return;
      }

      const coerced = coerceColumnValue(column, rawValue, row.lineNumber, originalHeader, options);
      if (coerced.issue) {
        rowIssues.push(coerced.issue);
        return;
      }
      if (column === "filename" || column === "format") {
        output[column] = coerced.value;
      } else {
        overrides[column] = coerced.value;
      }
    });

    const config = { ...baseConfig, ...overrides };
    const payloadResult = validateAndBuildPayload(config, row.lineNumber, headerInfo.sourceHeaders);
    if (payloadResult.issues.length > 0) {
      rowIssues.push(...payloadResult.issues);
    }

    const format = normalizeOutputFormat(output.format || options.defaultFormat || "png");
    const exportSize = Number(config.exportSize || baseConfig.exportSize || 600);
    const filenameBase = output.filename || safeFileBaseName(
      payloadResult.label || payloadResult.payload || `row-${row.index + 1}`,
      row.index
    );

    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
    } else {
      rows.push({
        config,
        exportSize,
        filenameBase,
        format,
        index: row.index,
        label: payloadResult.label,
        lineNumber: row.lineNumber,
        payload: payloadResult.payload
      });
    }
  }

  if (issues.length === 0) {
    issues.push(...validateAdvancedBulkWorkload(rows, options));
  }

  return {
    ok: issues.length === 0,
    issues,
    rows
  };
}

export function parseAdvancedBulkCsv(text, options = {}) {
  const result = lintAdvancedBulkCsv(text, options);
  if (!result.ok) {
    throw new AdvancedBulkValidationError(result.issues);
  }
  return result.rows;
}

export function validateAdvancedBulkWorkload(rows, options = {}) {
  const maxRasterPixels = Number(options.maxRasterPixels ?? ADVANCED_BULK_MAX_RASTER_PIXELS);
  if (!Number.isFinite(maxRasterPixels) || maxRasterPixels <= 0) {
    return [];
  }

  let rasterPixels = 0;
  let rasterFiles = 0;

  for (const row of rows) {
    if (row.format !== "png" && row.format !== "both") {
      continue;
    }

    const dimensions = getExportPixelSize(Number(row.exportSize), row.config.printBleed);
    rasterPixels += dimensions.total * dimensions.total;
    rasterFiles += 1;

    if (rasterPixels > maxRasterPixels) {
      return [makeIssue(
        row.lineNumber,
        "exportSize",
        [
          `Advanced bulk raster workload is too large (${formatMegapixels(rasterPixels)} MP across ${rasterFiles} PNG export${rasterFiles === 1 ? "" : "s"}).`,
          `Reduce exportSize, choose SVG for some rows, or split the CSV. Limit: ${formatMegapixels(maxRasterPixels)} MP.`
        ].join(" ")
      )];
    }
  }

  return [];
}

export function formatAdvancedBulkIssues(issues, options = {}) {
  return formatCsvIssues(issues, options);
}

export function createAdvancedBulkTemplateCsv(baseConfig = {}) {
  const row = {
    filename: "wikimedia-example",
    format: "png",
    contentType: baseConfig.contentType || "url",
    url: baseConfig.url || "https://meta.wikimedia.org/wiki/Wikimania",
    text: "",
    emailTo: "",
    emailSubject: "",
    emailBody: "",
    smsNumber: "",
    smsMessage: "",
    wifiSsid: "",
    wifiPassword: "",
    wifiEncryption: baseConfig.wifiEncryption || "WPA",
    wifiHidden: String(Boolean(baseConfig.wifiHidden)),
    logo: baseConfig.logo || "wikimania",
    logoSize: baseConfig.logoSize || "24",
    errorCorrection: baseConfig.errorCorrection || "high",
    moduleStyle: baseConfig.moduleStyle || "dot",
    cornerSquareStyle: baseConfig.cornerSquareStyle || "dot",
    cornerDotStyle: baseConfig.cornerDotStyle || "dot",
    colorMode: baseConfig.colorMode || "solid",
    foreground: baseConfig.foreground || "#006bb6",
    foregroundSecondary: baseConfig.foregroundSecondary || "#14866d",
    background: baseConfig.background || "#ffffff",
    margin: baseConfig.margin || "4",
    captionTop: "Check West Room Planning",
    captionBottom: "",
    captionFont: baseConfig.captionFont || "inter",
    captionSize: baseConfig.captionSize || "6",
    captionWeight: baseConfig.captionWeight || "600",
    captionColor: baseConfig.captionColor || "#202122",
    captionCorners: String(Boolean(baseConfig.captionCorners)),
    captionCornerStyle: baseConfig.captionCornerStyle || "right",
    captionCornerColorMode: baseConfig.captionCornerColorMode || "solid",
    captionCornerColor: baseConfig.captionCornerColor || "#202122",
    captionCornerColorSecondary: baseConfig.captionCornerColorSecondary || "#006bb6",
    exportSize: baseConfig.exportSize || "1200",
    printBleed: String(baseConfig.printBleed ?? true),
    inkscapeSvg: String(Boolean(baseConfig.inkscapeSvg))
  };

  return [
    ADVANCED_BULK_TEMPLATE_COLUMNS.join(","),
    ADVANCED_BULK_TEMPLATE_COLUMNS.map((column) => escapeCsvValue(row[column] ?? "")).join(",")
  ].join("\n");
}

export function advancedBulkFileName(row, extension, itemIndex = 0) {
  const number = String(itemIndex + 1).padStart(3, "0");
  const base = row.filenameBase || safeFileBaseName(row.label || row.payload || "wikimedia-qr", itemIndex);
  return `${number}-${base}.${extension}`;
}

function normalizeHeaders(headers, issues) {
  const columns = [];
  const sourceHeaders = new Map();
  const seenColumns = new Map();

  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    const column = HEADER_MAP.get(key);
    if (!column) {
      const suggestion = closestColumn(header);
      issues.push(makeIssue(
        1,
        header || `column ${index + 1}`,
        `Unsupported column "${header}".${suggestion ? ` Did you mean "${suggestion}"?` : ` Allowed columns: ${ADVANCED_BULK_COLUMNS.join(", ")}.`}`
      ));
      columns.push(null);
      return;
    }

    if (seenColumns.has(column)) {
      issues.push(makeIssue(1, header, `Duplicate column "${column}".`));
      columns.push(null);
      return;
    }

    seenColumns.set(column, header);
    sourceHeaders.set(column, header);
    columns.push(column);
  });

  return { columns, originalHeaders: headers, sourceHeaders };
}

function coerceColumnValue(column, rawValue, lineNumber, header, options) {
  const rule = FIELD_RULES[column];
  const value = String(rawValue ?? "").trim();

  switch (rule.type) {
    case "string":
      return { value };
    case "filename":
      return coerceFilename(value, lineNumber, header);
    case "boolean":
      return coerceBoolean(value, lineNumber, header);
    case "integer":
      return coerceInteger(value, rule, lineNumber, header);
    case "enum":
      return coerceEnum(value, rule.values, lineNumber, header);
    case "wifiEncryption":
      return coerceWifiEncryption(value, lineNumber, header);
    case "color":
      return coerceColor(value, lineNumber, header);
    case "email":
      return coerceEmail(value, lineNumber, header);
    case "phone":
      return coercePhone(value, lineNumber, header);
    case "logo":
      return coerceLogo(value, lineNumber, header, options);
    default:
      return { value };
  }
}

function validateAndBuildPayload(config, lineNumber, sourceHeaders) {
  const issues = [];
  const contentType = String(config.contentType || "url").trim().toLowerCase();

  try {
    switch (contentType) {
      case "url": {
        const url = requireValue(config.url, "url", "URL content requires a url value.", lineNumber, sourceHeaders);
        let payload;
        if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:\/\//i.test(url)) {
          issues.push(makeIssue(lineNumber, sourceHeaders.get("url") || "url", "Use an HTTP or HTTPS URL."));
          return { issues, payload: "", label: "" };
        }
        try {
          payload = normalizeDirectUrl(url);
        } catch {
          issues.push(makeIssue(lineNumber, sourceHeaders.get("url") || "url", "Expected a valid HTTP or HTTPS URL."));
          return { issues, payload: "", label: "" };
        }
        return { issues, payload, label: payload };
      }
      case "text": {
        const payload = requireValue(config.text, "text", "Text content requires a text value.", lineNumber, sourceHeaders);
        return { issues, payload, label: summarize(payload, "Text") };
      }
      case "email": {
        const to = requireValue(config.emailTo, "emailTo", "Email content requires an emailTo value.", lineNumber, sourceHeaders);
        const email = coerceEmail(to, lineNumber, sourceHeaders.get("emailTo") || "emailTo");
        if (email.issue) {
          issues.push(email.issue);
          return { issues, payload: "", label: "" };
        }
        const params = new URLSearchParams();
        if (config.emailSubject) {
          params.set("subject", String(config.emailSubject).trim());
        }
        if (config.emailBody) {
          params.set("body", String(config.emailBody).trim());
        }
        const query = params.toString();
        return { issues, payload: `mailto:${email.value}${query ? `?${query}` : ""}`, label: `Email: ${email.value}` };
      }
      case "sms": {
        const number = requireValue(config.smsNumber, "smsNumber", "SMS content requires an smsNumber value.", lineNumber, sourceHeaders);
        const phone = coercePhone(number, lineNumber, sourceHeaders.get("smsNumber") || "smsNumber");
        if (phone.issue) {
          issues.push(phone.issue);
          return { issues, payload: "", label: "" };
        }
        const message = String(config.smsMessage || "").trim();
        return {
          issues,
          payload: `sms:${phone.value}${message ? `?&body=${encodeURIComponent(message)}` : ""}`,
          label: `SMS: ${phone.value}`
        };
      }
      case "wifi": {
        const ssid = requireValue(config.wifiSsid, "wifiSsid", "Wi-Fi content requires a wifiSsid value.", lineNumber, sourceHeaders);
        const encryption = WIFI_ENCRYPTION_ALIASES.get(String(config.wifiEncryption || "WPA").trim().toLowerCase()) || "WPA";
        const password = String(config.wifiPassword || "");
        if (encryption !== "nopass" && !password) {
          issues.push(makeIssue(lineNumber, sourceHeaders.get("wifiPassword") || "wifiPassword", "Wi-Fi content requires wifiPassword unless wifiEncryption is nopass."));
          return { issues, payload: "", label: "" };
        }
        const hidden = Boolean(config.wifiHidden);
        return {
          issues,
          payload: [
            "WIFI:",
            `T:${escapeWifiValue(encryption)};`,
            `S:${escapeWifiValue(ssid)};`,
            encryption === "nopass" ? "" : `P:${escapeWifiValue(password)};`,
            hidden ? "H:true;" : "",
            ";"
          ].join(""),
          label: `WiFi: ${ssid}`
        };
      }
      default:
        issues.push(makeIssue(lineNumber, sourceHeaders.get("contentType") || "contentType", `Unsupported contentType "${contentType}". Use ${CONTENT_TYPE_VALUES.join(", ")}.`));
        return { issues, payload: "", label: "" };
    }
  } catch (error) {
    issues.push(error.issue || makeIssue(lineNumber, null, error.message || "Could not build the QR payload."));
    return { issues, payload: "", label: "" };
  }
}

function requireValue(value, column, message, lineNumber, sourceHeaders) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    const error = new Error(message);
    error.issue = makeIssue(lineNumber, sourceHeaders.get(column) || column, message);
    throw error;
  }
  return trimmed;
}

function coerceFilename(value, lineNumber, header) {
  if (/[/\\]/.test(value) || /[\u0000-\u001f]/.test(value)) {
    return { issue: makeIssue(lineNumber, header, "Use a file name without slashes or control characters.") };
  }
  const safe = value
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  if (!safe) {
    return { issue: makeIssue(lineNumber, header, "Filename must contain at least one letter or number.") };
  }
  return { value: safe };
}

function coerceBoolean(value, lineNumber, header) {
  const normalized = value.toLowerCase();
  if (["true", "yes", "y", "1", "on"].includes(normalized)) {
    return { value: true };
  }
  if (["false", "no", "n", "0", "off"].includes(normalized)) {
    return { value: false };
  }
  return { issue: makeIssue(lineNumber, header, "Expected a boolean value: true, false, yes, no, 1, or 0.") };
}

function coerceInteger(value, rule, lineNumber, header) {
  if (!/^-?\d+$/.test(value)) {
    return { issue: makeIssue(lineNumber, header, `Expected a whole number between ${rule.min} and ${rule.max}.`) };
  }
  const number = Number(value);
  if (number < rule.min || number > rule.max) {
    return { issue: makeIssue(lineNumber, header, `Expected a whole number between ${rule.min} and ${rule.max}.`) };
  }
  return { value: String(number) };
}

function coerceEnum(value, allowed, lineNumber, header) {
  const normalized = value.toLowerCase();
  const match = allowed.find((allowedValue) => allowedValue.toLowerCase() === normalized);
  if (!match) {
    return { issue: makeIssue(lineNumber, header, `Expected one of: ${allowed.join(", ")}.`) };
  }
  return { value: match };
}

function coerceWifiEncryption(value, lineNumber, header) {
  const match = WIFI_ENCRYPTION_ALIASES.get(value.toLowerCase());
  if (!match || !WIFI_ENCRYPTION_VALUES.includes(match)) {
    return { issue: makeIssue(lineNumber, header, `Expected one of: WPA, WEP, nopass.`) };
  }
  return { value: match };
}

function coerceColor(value, lineNumber, header) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    return { issue: makeIssue(lineNumber, header, "Expected a #RRGGBB color, for example #006bb6.") };
  }
  return { value };
}

function coerceEmail(value, lineNumber, header) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { issue: makeIssue(lineNumber, header, "Expected an email address, for example person@example.org.") };
  }
  return { value };
}

function coercePhone(value, lineNumber, header) {
  const normalized = value.replace(/[()\s.-]/g, "");
  if (!/^\+?\d{3,20}$/.test(normalized)) {
    return { issue: makeIssue(lineNumber, header, "Expected a phone number with 3 to 20 digits, optionally starting with +.") };
  }
  return { value: normalized };
}

function coerceLogo(value, lineNumber, header, options) {
  const logoId = value.trim();
  const isKnownLogo = typeof options.isLogoKnown === "function"
    ? options.isLogoKnown(logoId)
    : logoId === "none";
  if (!isKnownLogo) {
    return { issue: makeIssue(lineNumber, header, `Unknown logo "${logoId}". Use a bundled Wikimedia logo ID or "none".`) };
  }
  return { value: logoId };
}

function normalizeOutputFormat(value) {
  const normalized = String(value || "png").trim().toLowerCase();
  return FORMAT_VALUES.includes(normalized) ? normalized : "png";
}

function safeFileBaseName(value, index) {
  const slug = String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || `wikimedia-qr-${index + 1}`;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function closestColumn(value) {
  const normalized = normalizeHeader(value);
  let best = null;
  let bestDistance = Infinity;
  for (const column of ADVANCED_BULK_COLUMNS) {
    const distance = editDistance(normalized, normalizeHeader(column));
    if (distance < bestDistance) {
      best = column;
      bestDistance = distance;
    }
  }
  return bestDistance <= 3 ? best : null;
}

function editDistance(left, right) {
  const matrix = Array.from({ length: left.length + 1 }, (_, row) => [row]);
  for (let column = 1; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)
      );
    }
  }
  return matrix[left.length][right.length];
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function escapeWifiValue(value) {
  return String(value).replace(/[\\;,":]/g, (char) => `\\${char}`);
}

function summarize(value, fallback) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 42 ? `${text.slice(0, 39)}...` : text || fallback;
}

function formatMegapixels(pixels) {
  const value = pixels / 1_000_000;
  return value >= 10 ? String(Math.round(value)) : value.toFixed(1);
}

function makeIssue(line, column, message) {
  return { line, column, message };
}

function normalizeParseIssues(issues) {
  return issues.map((entry) => makeIssue(entry.line || 1, entry.column || null, entry.message || "Invalid CSV."));
}
