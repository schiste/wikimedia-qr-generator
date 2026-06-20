const COMMONS_API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
const COMMONS_IMAGEINFO_PROPS = "url|mime|timestamp|sha1|extmetadata";
const COMMONS_EXTMETADATA_FILTER = "Artist|LicenseShortName|LicenseUrl|AttributionRequired|Restrictions";

export async function fetchCatalogCommonsLogo(entry, { signal } = {}) {
  if (!entry?.commonsTitle) {
    throw new Error("This library entry does not have a Commons SVG title.");
  }

  const metadataResponse = await fetch(createCommonsImageInfoUrl(entry.commonsTitle), {
    signal,
    headers: { Accept: "application/json" }
  });

  if (!metadataResponse.ok) {
    throw new Error("Could not reach Wikimedia Commons.");
  }

  const metadata = await metadataResponse.json();
  const page = getPageForLogo(metadata, entry.commonsTitle);
  if (!page || page.missing !== undefined || page.invalid !== undefined) {
    throw new Error(`No Commons file named "${entry.commonsTitle}" was found.`);
  }

  const imageInfo = page.imageinfo?.[0];
  if (!imageInfo?.url) {
    throw new Error("Commons returned no image URL for this logo.");
  }
  if (imageInfo.mime !== "image/svg+xml") {
    throw new Error("Only SVG logos can be used in QR exports.");
  }

  const svgResponse = await fetch(imageInfo.url, {
    signal,
    headers: { Accept: "image/svg+xml" }
  });
  if (!svgResponse.ok) {
    throw new Error("Could not download this SVG from Commons.");
  }

  const sanitizedSvg = sanitizeSvgMarkup(await svgResponse.text());
  if (!sanitizedSvg) {
    throw new Error("That SVG could not be parsed safely.");
  }

  const parts = getSvgParts(sanitizedSvg);
  return {
    id: entry.id,
    label: entry.name,
    shortLabel: entry.code || entry.name,
    sourceTitle: page.title || entry.commonsTitle,
    color: entry.color || "#475569",
    viewBox: parts.viewBox,
    body: parts.inner,
    sourceUrl: imageInfo.url,
    descriptionUrl: imageInfo.descriptionurl,
    libraryKind: entry.kind,
    libraryKindLabel: entry.kindLabel
  };
}

function createCommonsImageInfoUrl(commonsTitle) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "imageinfo",
    iiprop: COMMONS_IMAGEINFO_PROPS,
    iiextmetadatafilter: COMMONS_EXTMETADATA_FILTER,
    titles: commonsTitle
  });

  return `${COMMONS_API_ENDPOINT}?${params}`;
}

function getPageForLogo(apiResponse, commonsTitle) {
  const pages = Object.values(apiResponse.query?.pages || {});
  const normalized = new Map((apiResponse.query?.normalized || []).map((item) => [item.from, item.to]));
  const expectedTitle = normalized.get(commonsTitle) || normalizeCommonsTitle(commonsTitle);

  return pages.find((page) => (
    page.title === expectedTitle ||
    page.title === commonsTitle ||
    page.title === normalizeCommonsTitle(commonsTitle)
  ));
}

function normalizeCommonsTitle(title) {
  return String(title || "").replaceAll("_", " ");
}

function parseSvgRoot(svgString) {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const root = doc.documentElement;

  if (!root || root.tagName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) {
    return null;
  }

  return root;
}

function sanitizeSvgMarkup(svgString) {
  const root = parseSvgRoot(svgString);
  if (!root) {
    return null;
  }

  root.querySelectorAll("script, foreignObject, iframe, object, embed, link").forEach((node) => node.remove());

  [root, ...root.querySelectorAll("*")].forEach((node) => {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      const isUrlAttribute = ["href", "xlink:href", "src"].includes(name);
      const isExternalUrl = value.startsWith("http:") || value.startsWith("https:") || value.startsWith("//");
      const isUnsafeDataUrl = value.startsWith("data:") && !value.startsWith("data:image/");
      const hasExternalStyleUrl = /url\(\s*['"]?(https?:|\/\/|data:)/i.test(value);
      const isUnsafeStyle = name === "style" && (
        value.includes("javascript:") ||
        value.includes("@import") ||
        hasExternalStyleUrl
      );

      if (
        name.startsWith("on") ||
        value.startsWith("javascript:") ||
        isUnsafeStyle ||
        (isUrlAttribute && (isExternalUrl || isUnsafeDataUrl))
      ) {
        node.removeAttribute(attr.name);
      }
    }
  });

  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!root.getAttribute("viewBox")) {
    const viewBox = getViewBoxFromDimensions(root);
    if (viewBox) {
      root.setAttribute("viewBox", viewBox);
    }
  }
  if (!root.getAttribute("preserveAspectRatio")) {
    root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  return new XMLSerializer().serializeToString(root);
}

function getSvgParts(svgString) {
  const root = parseSvgRoot(svgString);
  if (!root) {
    return { viewBox: "0 0 100 100", inner: "" };
  }

  return {
    viewBox: root.getAttribute("viewBox") || getViewBoxFromDimensions(root) || "0 0 100 100",
    inner: root.innerHTML
  };
}

function getViewBoxFromDimensions(root) {
  const width = parseSvgLength(root.getAttribute("width"));
  const height = parseSvgLength(root.getAttribute("height"));
  return width > 0 && height > 0 ? `0 0 ${width} ${height}` : null;
}

function parseSvgLength(value) {
  const match = String(value || "").trim().match(/^([0-9]*\.?[0-9]+)/);
  return match ? Number(match[1]) : 0;
}
