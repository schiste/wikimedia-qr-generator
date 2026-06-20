export const WIKIMEDIA_LOGOS = {
  none: {
    label: "No logo",
    shortLabel: "None",
    viewBox: "0 0 1 1",
    body: ""
  },
  wikimedia: {
    label: "Wikimedia movement logo",
    shortLabel: "Wikimedia",
    viewBox: "-599 -599 1198 1198",
    body: `
      <defs>
        <clipPath id="logo-wikimedia-a">
          <path d="M47.5-87.5v425h-95v-425l-552-552v1250h1199v-1250z"/>
        </clipPath>
      </defs>
      <g clip-path="url(#logo-wikimedia-a)">
        <circle r="336.5" fill="#396"/>
        <circle r="480.25" fill="none" stroke="#069" stroke-width="135.5"/>
      </g>
      <circle cy="-379.5" r="184.5" fill="#900"/>
    `
  },
  commons: {
    label: "Wikimedia Commons logo",
    shortLabel: "Commons",
    viewBox: "-305 -516 610 820",
    body: `
      <defs>
        <clipPath id="logo-commons-c"><circle r="298"/></clipPath>
      </defs>
      <circle r="100" fill="#900"/>
      <g fill="#069">
        <g id="logo-commons-arrow" clip-path="url(#logo-commons-c)">
          <path d="m-11 180v118h22v-118"/>
          <path d="m-43 185l43-75 43 75"/>
        </g>
        <g id="logo-commons-arrows3">
          <use href="#logo-commons-arrow" transform="rotate(45)"/>
          <use href="#logo-commons-arrow" transform="rotate(90)"/>
          <use href="#logo-commons-arrow" transform="rotate(135)"/>
        </g>
        <use href="#logo-commons-arrows3" transform="scale(-1 1)"/>
        <path transform="rotate(-45)" stroke="#069" stroke-width="84" fill="none" d="M0-256A256 256 0 1 0 256 0C256-100 155-150 250-275"/>
        <path d="m-23-515s-36 135-80 185 116-62 170-5-90-180-90-180z"/>
      </g>
    `
  },
  wikidata: {
    label: "Wikidata logo",
    shortLabel: "Wikidata",
    viewBox: "0 0 1050 590",
    body: `
      <path d="M120 545h30V45h-30v500zm60 0h90V45h-90v500zM300 45v500h90V45h-90z" fill="#900"/>
      <path d="M840 545h30V45h-30v500zM900 45v500h30V45h-30zM420 545h30V45h-30v500zM480 45v500h30V45h-30z" fill="#396"/>
      <path d="M540 545h90V45h-90v500zm120 0h30V45h-30v500zM720 45v500h90V45h-90z" fill="#069"/>
    `
  }
};

export function getLogo(id) {
  return WIKIMEDIA_LOGOS[id] || WIKIMEDIA_LOGOS.none;
}

export function renderLogoPreview(id) {
  const logo = getLogo(id);
  if (id === "none") {
    return "";
  }

  return `<svg viewBox="${logo.viewBox}" aria-hidden="true" focusable="false">${logo.body}</svg>`;
}
