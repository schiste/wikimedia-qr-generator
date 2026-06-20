import assert from "node:assert/strict";
import test from "node:test";
import { WIKIMEDIA_LOGOS } from "../src/logos.js";
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
