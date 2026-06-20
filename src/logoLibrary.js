import {
  AFFILIATE_LOGOS,
  AFFILIATE_LOGO_KIND_COUNTS,
  AFFILIATE_LOGO_KIND_LABELS
} from "./affiliateLogos.js";
import { CENTER_LOGO_IDS, getLogo } from "./logos.js";

const CORE_LABEL = "Core logos";

export const LOGO_LIBRARY_FILTERS = [
  { id: "all", label: "All" },
  { id: "core", label: "Core" },
  { id: "chapter", label: AFFILIATE_LOGO_KIND_LABELS.chapter },
  { id: "thematic", label: AFFILIATE_LOGO_KIND_LABELS.thematic },
  { id: "user-group", label: AFFILIATE_LOGO_KIND_LABELS["user-group"] }
];

const CORE_LOGO_ENTRIES = CENTER_LOGO_IDS
  .filter((id) => id !== "none")
  .map((id) => {
    const logo = getLogo(id);
    return {
      id,
      kind: "core",
      kindLabel: CORE_LABEL,
      code: logo.shortLabel,
      name: logo.label,
      commonsTitle: logo.sourceTitle,
      metaPageUrl: logo.sourceTitle
        ? `https://commons.wikimedia.org/wiki/${encodeURIComponent(logo.sourceTitle.replaceAll(" ", "_"))}`
        : "",
      local: true
    };
  });

export const LOGO_LIBRARY_ENTRIES = [
  ...CORE_LOGO_ENTRIES,
  ...AFFILIATE_LOGOS
];

export const LOGO_LIBRARY_COUNTS = {
  all: LOGO_LIBRARY_ENTRIES.length,
  core: CORE_LOGO_ENTRIES.length,
  ...AFFILIATE_LOGO_KIND_COUNTS
};

const LOGO_LIBRARY_BY_ID = new Map(LOGO_LIBRARY_ENTRIES.map((entry) => [entry.id, entry]));

export function getLogoLibraryEntry(id) {
  return LOGO_LIBRARY_BY_ID.get(id) || null;
}

export function hasLogoLibraryEntry(id) {
  return LOGO_LIBRARY_BY_ID.has(id);
}

export function normalizeLogoSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
