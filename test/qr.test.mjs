import assert from "node:assert/strict";
import test from "node:test";
import { CENTER_LOGO_IDS, WIKIMEDIA_LOGOS } from "../src/logos.js";
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
