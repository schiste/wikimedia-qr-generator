import { normalizeDirectUrl } from "./wikimedia.js";

export const BULK_URL_LIMIT = 100;

export function parseBulkUrlList(value, { limit = BULK_URL_LIMIT } = {}) {
  const raw = String(value || "");
  if (!raw.trim()) {
    throw new Error("Enter at least one URL for bulk generation.");
  }

  const parts = raw.split(",");
  if (parts.some((part) => !part.trim())) {
    throw new Error("Remove empty entries from the comma-separated URL list.");
  }
  if (parts.length > limit) {
    throw new Error(`Bulk generation supports up to ${limit} URLs at a time.`);
  }

  return parts.map((part, index) => normalizeBulkUrl(part, index));
}

export function bulkQrFileName(url, index, { extension = "png", suffix = "" } = {}) {
  const number = String(index + 1).padStart(3, "0");
  return `${number}-${slugForUrl(url)}${suffix}.${extension}`;
}

function normalizeBulkUrl(value, index) {
  try {
    const trimmed = String(value || "").trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
      throw new Error("Use an HTTP or HTTPS URL.");
    }
    return normalizeDirectUrl(value);
  } catch (error) {
    throw new Error(`URL ${index + 1} is invalid: ${error.message || "Enter a valid URL."}`);
  }
}

function slugForUrl(value) {
  try {
    const url = new URL(value);
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
