const LANGUAGE_PROJECTS = new Set(["wikipedia", "wiktionary", "wikisource"]);

export const PROJECTS = {
  wikipedia: {
    label: "Wikipedia",
    host: (language) => `${language}.wikipedia.org`
  },
  commons: {
    label: "Wikimedia Commons",
    host: () => "commons.wikimedia.org"
  },
  wikidata: {
    label: "Wikidata",
    host: () => "www.wikidata.org"
  },
  wiktionary: {
    label: "Wiktionary",
    host: (language) => `${language}.wiktionary.org`
  },
  wikisource: {
    label: "Wikisource",
    host: (language) => `${language}.wikisource.org`
  },
  meta: {
    label: "Meta-Wiki",
    host: () => "meta.wikimedia.org"
  },
  mediawiki: {
    label: "MediaWiki",
    host: () => "www.mediawiki.org"
  }
};

export function projectUsesLanguage(project) {
  return LANGUAGE_PROJECTS.has(project);
}

export function buildWikimediaUrl({ project, language, title }) {
  const config = PROJECTS[project];
  if (!config) {
    throw new Error("Choose a supported Wikimedia project.");
  }

  const normalizedTitle = normalizeWikiTitle(title);
  if (!normalizedTitle) {
    throw new Error("Enter a page title or item id.");
  }

  const normalizedLanguage = normalizeLanguage(language);
  if (projectUsesLanguage(project) && !normalizedLanguage) {
    throw new Error("Choose a language edition.");
  }

  return `https://${config.host(normalizedLanguage)}/wiki/${encodeWikiTitle(normalizedTitle)}`;
}

export function normalizeDirectUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    throw new Error("Enter a URL.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Use an HTTP or HTTPS URL.");
  }

  return parsed.href;
}

export function isLikelyWikimediaHost(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host === "wikimedia.org" ||
      host.endsWith(".wikimedia.org") ||
      host === "wikidata.org" ||
      host.endsWith(".wikidata.org") ||
      host === "wikipedia.org" ||
      host.endsWith(".wikipedia.org") ||
      host === "wiktionary.org" ||
      host.endsWith(".wiktionary.org") ||
      host === "wikisource.org" ||
      host.endsWith(".wikisource.org") ||
      host === "mediawiki.org" ||
      host.endsWith(".mediawiki.org")
    );
  } catch {
    return false;
  }
}

function normalizeLanguage(language) {
  return String(language || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function normalizeWikiTitle(title) {
  return String(title || "")
    .trim()
    .replace(/\s+/g, "_");
}

function encodeWikiTitle(title) {
  return title
    .split("/")
    .map((part) =>
      encodeURIComponent(part)
        .replace(/%3A/gi, ":")
        .replace(/%2C/gi, ",")
    )
    .join("/");
}

