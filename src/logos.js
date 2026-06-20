export const WIKIMEDIA_LOGOS = {
  none: {
    label: "No logo",
    shortLabel: "None",
    sourceTitle: "",
    color: "#64748b",
    viewBox: "0 0 1 1",
    body: ""
  },
  wikimedia: {
    label: "Wikimedia",
    shortLabel: "Wikimedia",
    sourceTitle: "File:Wikimedia-logo black.svg",
    color: "#000000",
    viewBox: "-16 -16 32 32",
    body: `
      <clipPath id="wikimedia-fallback-mark">
        <path d="m1-2v12h-2v-12l-15-15v33h32v-33z"/>
      </clipPath>
      <g clip-path="url(#wikimedia-fallback-mark)">
        <circle r="9" fill="#000000"/>
        <circle fill="none" r="13" stroke="#000000" stroke-width="4"/>
      </g>
      <circle cy="-10" r="5" fill="#000000"/>
    `
  },
  wikipedia: {
    label: "Wikipedia",
    shortLabel: "Wikipedia",
    sourceTitle: "File:Wikipedia-logo-v2.svg",
    color: "#000000",
    viewBox: "0 0 100 100",
    body: `
      <circle cx="50" cy="50" r="45" fill="none" stroke="#dddddd" stroke-width="2" stroke-dasharray="4,4"/>
      <path d="M18,25 L38,80 L50,38 L62,80 L82,25" fill="none" stroke="#111111" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="4" fill="#111111"/>
    `
  },
  commons: {
    label: "Wikimedia Commons",
    shortLabel: "Commons",
    sourceTitle: "File:Commons-logo.svg",
    color: "#006699",
    viewBox: "0 0 100 100",
    body: `
      <circle cx="50" cy="50" r="34" fill="none" stroke="#006699" stroke-width="8"/>
      <path d="M18,18 L36,36 M36,25 L36,36 L25,36" fill="none" stroke="#339966" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M82,18 L64,36 M64,25 L64,36 L75,36" fill="none" stroke="#339966" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M50,50 L50,84 M42,76 L50,84 L58,76" fill="none" stroke="#006699" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="9" fill="#d32f2f"/>
    `
  },
  wikidata: {
    label: "Wikidata",
    shortLabel: "Wikidata",
    sourceTitle: "File:Wikidata-logo.svg",
    color: "#005588",
    viewBox: "0 0 100 100",
    body: `
      <rect x="15" y="15" width="12" height="70" fill="#d32f2f" rx="3"/>
      <rect x="33" y="25" width="8" height="50" fill="#d32f2f" rx="2"/>
      <rect x="47" y="15" width="10" height="70" fill="#4caf50" rx="3"/>
      <rect x="63" y="25" width="10" height="50" fill="#2196f3" rx="3"/>
      <rect x="79" y="15" width="8" height="70" fill="#2196f3" rx="2"/>
    `
  },
  wikisource: {
    label: "Wikisource",
    shortLabel: "Wikisource",
    sourceTitle: "File:Wikisource-logo.svg",
    color: "#0d47a1",
    viewBox: "0 0 100 100",
    body: `
      <polygon points="50,12 82,72 18,72" fill="#90caf9" stroke="#0d47a1" stroke-width="6" stroke-linejoin="round"/>
      <polygon points="50,12 66,72 34,72" fill="#42a5f5" stroke="#0d47a1" stroke-width="4" stroke-linejoin="round"/>
      <path d="M10,82 L90,82" stroke="#0d47a1" stroke-width="7" stroke-linecap="round"/>
    `
  },
  wiktionary: {
    label: "Wiktionary",
    shortLabel: "Wiktionary",
    sourceTitle: "File:Wiktionary-logo-v2.svg",
    color: "#4a4a4a",
    viewBox: "0 0 100 100",
    body: `
      <rect x="15" y="15" width="70" height="70" rx="12" fill="#ffffff" stroke="#333333" stroke-width="7"/>
      <text x="50" y="67" font-family="serif" font-weight="bold" font-size="52" text-anchor="middle" fill="#333333">W</text>
    `
  },
  mediawiki: {
    label: "MediaWiki",
    shortLabel: "MediaWiki",
    sourceTitle: "File:MediaWiki-2020-icon.svg",
    color: "#334466",
    viewBox: "0 0 100 100",
    body: `
      <path d="M22,18 L8,18 L8,82 L22,82" fill="none" stroke="#334466" stroke-width="9" stroke-linecap="square"/>
      <path d="M78,18 L92,18 L92,82 L78,82" fill="none" stroke="#334466" stroke-width="9" stroke-linecap="square"/>
      <text x="50" y="58" font-family="monospace" font-weight="bold" font-size="34" text-anchor="middle" fill="#006699">mw</text>
    `
  }
};

export const CENTER_LOGO_IDS = [
  "none",
  "wikimedia",
  "wikipedia",
  "commons",
  "wikidata",
  "wikisource",
  "wiktionary",
  "mediawiki"
];

export function getLogo(id) {
  return WIKIMEDIA_LOGOS[id] || WIKIMEDIA_LOGOS.none;
}

export function renderLogoPreview(id) {
  const logo = getLogo(id);
  if (id === "none") {
    return "";
  }

  return `<svg viewBox="${logo.viewBox}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${logo.body}</svg>`;
}
