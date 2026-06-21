import assert from "node:assert/strict";
import test from "node:test";
import { CENTER_LOGO_IDS, WIKIMEDIA_LOGOS } from "../src/logos.js";
import {
  addCaptionsToSvg,
  addInkscapeDataToSvg,
  addPrintBleedToSvg,
  getExportPixelSize,
  stripInkscapeDataFromSvg
} from "../src/export.js";
import { getLogoLibraryPreviewUrl, LOGO_LIBRARY_ENTRIES } from "../src/logoLibrary.js";
import { createQrCode } from "../src/qr.js";
import { buildWikimediaUrl, normalizeDirectUrl } from "../src/wikimedia.js";

test("builds canonical Wikimedia project URLs", () => {
  assert.equal(
    buildWikimediaUrl({
      project: "wikipedia",
      language: "fr",
      title: "QR code"
    }),
    "https://fr.wikipedia.org/wiki/QR_code"
  );

  assert.equal(
    buildWikimediaUrl({
      project: "commons",
      language: "en",
      title: "File:Example image.svg"
    }),
    "https://commons.wikimedia.org/wiki/File:Example_image.svg"
  );
});

test("normalizes pasted URLs", () => {
  assert.equal(
    normalizeDirectUrl("meta.wikimedia.org/wiki/Wikimania"),
    "https://meta.wikimedia.org/wiki/Wikimania"
  );
});

test("generates a QR matrix and SVG", () => {
  const qr = createQrCode("https://www.wikimedia.org/", {
    errorCorrection: "medium"
  });

  assert.ok(qr.version >= 1);
  assert.equal(qr.modules.length, qr.size);
  assert.equal(qr.modules.every((row) => row.length === qr.size), true);
  assert.equal(qr.modules.flat().every((cell) => typeof cell === "boolean"), true);

  const svg = qr.toSvg({ margin: 4 });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<path fill="#202122"/);
});

test("uses larger QR versions for longer content", () => {
  const shortQr = createQrCode("https://w.wiki/abc");
  const longQr = createQrCode("https://meta.wikimedia.org/wiki/" + "Wikimedia_".repeat(60));

  assert.ok(longQr.version > shortQr.version);
});

test("renders styled QR SVGs with Wikimedia logos", () => {
  const qr = createQrCode("https://commons.wikimedia.org/wiki/Main_Page", {
    errorCorrection: "high"
  });
  const svg = qr.toSvg({
    moduleStyle: "dot",
    colorMode: "gradient",
    foreground: "#202122",
    foregroundSecondary: "#14866d",
    logo: WIKIMEDIA_LOGOS.commons,
    logoSize: 0.24
  });

  assert.match(svg, /<circle cx="/);
  assert.match(svg, /linearGradient id="qr-dots-gradient"/);
  assert.match(svg, /Wikimedia Commons/);
  assert.match(svg, /stroke="#006699"/);
});

test("exposes Wikimania in the central logo library", () => {
  const libraryEntry = LOGO_LIBRARY_ENTRIES.find((entry) => entry.id === "wikimania");

  assert.ok(CENTER_LOGO_IDS.includes("wikimania"));
  assert.equal(WIKIMEDIA_LOGOS.wikimania.sourceTitle, "File:Wikimania logo.svg");
  assert.equal(libraryEntry?.name, "Wikimania");
  assert.match(getLogoLibraryPreviewUrl(libraryEntry), /Special:FilePath\/Wikimania%20logo\.svg/);
});

test("renders custom finder corner shapes", () => {
  const qr = createQrCode("https://www.wikimedia.org/");
  const svg = qr.toSvg({
    margin: 4,
    cornerSquareStyle: "dot",
    cornerDotStyle: "rounded",
    background: "#f8fafc"
  });

  assert.match(svg, /<circle cx="7.5" cy="7.5" r="3.5"\/>/);
  assert.match(svg, /<circle cx="7.5" cy="7.5" r="2.5" fill="#f8fafc"\/>/);
  assert.match(svg, /<rect x="6" y="6" width="3" height="3" rx="0.6"\/>/);
});

test("adds print bleed to exported SVGs", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M0 0h100v100H0z"/></svg>';
  const withBleed = addPrintBleedToSvg(svg, {
    background: "#f8fafc",
    enabled: true,
    ratio: 0.05
  });

  assert.match(withBleed, /viewBox="-5 -5 110 110"/);
  assert.match(withBleed, /<path fill="#f8fafc" d="M-5 -5h110v110H-5z"\/>/);
  assert.equal(addPrintBleedToSvg(svg, { enabled: false }), svg);
});

test("adds optional captions above and below QR SVGs", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="QR code"><path fill="#fff" d="M0 0h100v100H0z"/><path fill="#202122" d="M10 10h10v10H10z"/></svg>';
  const captioned = addCaptionsToSvg(svg, {
    background: "#f8fafc",
    bottomText: "wikimedia.org",
    color: "#970302",
    fontSizePercent: 8,
    fontWeight: "700",
    topText: "Scan & learn"
  });

  assert.match(captioned, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/);
  assert.match(captioned, /<path fill="#f8fafc" d="M0 0h100v100H0z"\/>/);
  assert.match(captioned, /<text[^>]+fill="#970302"[^>]+font-size="8"[^>]+font-weight="700"[^>]*>Scan &amp; learn<\/text>/);
  assert.match(captioned, /<text[^>]*>wikimedia\.org<\/text>/);
  assert.match(captioned, /transform="translate\(16 16\) scale\(0\.68\)"/);
  assert.equal(addCaptionsToSvg(svg, { topText: "", bottomText: "" }), svg);
});

test("fits long caption text inside the square SVG artwork", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M0 0h100v100H0z"/></svg>';
  const captioned = addCaptionsToSvg(svg, {
    topText: "This is a deliberately long Wikimedia campaign caption for testing",
    fontSizePercent: 10
  });

  assert.match(captioned, /textLength="90" lengthAdjust="spacingAndGlyphs"/);
});

test("adds optional Inkscape document data to exported SVGs", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M0 0h100v100H0z"/></svg>';
  const withInkscapeData = addInkscapeDataToSvg(svg, {
    documentName: 'qr "draft".svg',
    enabled: true,
    title: "Wikimedia & QR"
  });

  assert.match(withInkscapeData, /xmlns:inkscape="http:\/\/www\.inkscape\.org\/namespaces\/inkscape"/);
  assert.match(withInkscapeData, /xmlns:sodipodi="http:\/\/sodipodi\.sourceforge\.net\/DTD\/sodipodi-0\.dtd"/);
  assert.match(withInkscapeData, /sodipodi:docname="qr &quot;draft&quot;\.svg"/);
  assert.match(withInkscapeData, /<metadata id="wikimedia-qr-inkscape-metadata">/);
  assert.match(withInkscapeData, /<dc:title>Wikimedia &amp; QR<\/dc:title>/);
  assert.match(withInkscapeData, /<sodipodi:namedview id="wikimedia-qr-inkscape-view"/);
  assert.equal(addInkscapeDataToSvg(withInkscapeData, { enabled: true }), withInkscapeData);
  assert.equal(addInkscapeDataToSvg(svg, { enabled: false }), svg);
});

test("strips Inkscape and Sodipodi data from default SVG exports", () => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" viewBox="0 0 100 100" sodipodi:docname="draft.svg" inkscape:version="1.3">',
    '<metadata><rdf:RDF><cc:Work xmlns:cc="http://creativecommons.org/ns#"/></rdf:RDF></metadata>',
    '<sodipodi:namedview id="namedview1" inkscape:pageopacity="0"/>',
    '<path fill="#fff" inkscape:connector-curvature="0" d="M0 0h100v100H0z"/>',
    "</svg>"
  ].join("");
  const cleaned = stripInkscapeDataFromSvg(svg);

  assert.doesNotMatch(cleaned, /inkscape[:=]/i);
  assert.doesNotMatch(cleaned, /sodipodi[:=]/i);
  assert.doesNotMatch(cleaned, /<metadata/i);
  assert.doesNotMatch(cleaned, /xmlns:rdf=/i);
  assert.match(cleaned, /<path fill="#fff" d="M0 0h100v100H0z"\/>/);
});

test("computes export pixel size with print bleed", () => {
  assert.deepEqual(getExportPixelSize(600, true, 0.05), {
    bleed: 30,
    total: 660,
    trim: 600
  });
  assert.deepEqual(getExportPixelSize(600, false), {
    bleed: 0,
    total: 600,
    trim: 600
  });
  assert.deepEqual(getExportPixelSize(100, true, -1), {
    bleed: 5,
    total: 110,
    trim: 100
  });
});
