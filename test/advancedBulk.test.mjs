import assert from "node:assert/strict";
import test from "node:test";
import {
  advancedBulkFileName,
  createAdvancedBulkTemplateCsv,
  formatAdvancedBulkIssues,
  lintAdvancedBulkCsv,
  parseAdvancedBulkCsv
} from "../src/advancedBulk.js";
import { parseCsv } from "../src/csv.js";

const BASE_CONFIG = {
  background: "#ffffff",
  captionFont: "inter",
  captionSize: "6",
  captionWeight: "600",
  captionColor: "#202122",
  captionCornerColor: "#202122",
  captionCornerColorMode: "solid",
  captionCornerColorSecondary: "#006bb6",
  captionCornerStyle: "right",
  captionCorners: false,
  colorMode: "solid",
  contentType: "url",
  cornerDotStyle: "dot",
  cornerSquareStyle: "dot",
  errorCorrection: "high",
  exportSize: "1200",
  foreground: "#202122",
  foregroundSecondary: "#14866d",
  logo: "wikimania",
  logoSize: "24",
  margin: "4",
  moduleStyle: "dot",
  printBleed: true,
  size: "512",
  url: "https://meta.wikimedia.org/wiki/Wikimania",
  wifiEncryption: "WPA"
};

const isLogoKnown = (logoId) => ["none", "wikimania", "commons"].includes(logoId);

test("parses CSV with quoted commas and newlines", () => {
  const parsed = parseCsv('filename,captionTop,text\nroom-a,"Check, Room A","Line 1\nLine 2"\n');

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].values.captionTop, "Check, Room A");
  assert.equal(parsed.rows[0].values.text, "Line 1\nLine 2");
});

test("advanced bulk rows inherit base config and override provided cells", () => {
  const rows = parseAdvancedBulkCsv([
    "filename,contentType,url,foreground,logo,captionTop",
    "room-a,url,https://example.org/a,#006bb6,commons,Room A"
  ].join("\n"), { baseConfig: BASE_CONFIG, isLogoKnown });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].payload, "https://example.org/a");
  assert.equal(rows[0].filenameBase, "room-a");
  assert.equal(rows[0].format, "png");
  assert.equal(rows[0].exportSize, 1200);
  assert.equal(rows[0].config.background, "#ffffff");
  assert.equal(rows[0].config.foreground, "#006bb6");
  assert.equal(rows[0].config.logo, "commons");
  assert.equal(rows[0].config.captionTop, "Room A");
});

test("advanced bulk linter suggests likely header typos", () => {
  const result = lintAdvancedBulkCsv("foregroun,url\n#006bb6,https://example.org", {
    baseConfig: BASE_CONFIG,
    isLogoKnown
  });

  assert.equal(result.ok, false);
  assert.match(formatAdvancedBulkIssues(result.issues), /Did you mean "foreground"/);
});

test("advanced bulk linter reports readable row and column errors", () => {
  const result = lintAdvancedBulkCsv([
    "filename,contentType,url,foreground,logo",
    "bad,url,javascript:alert(1),blue,not-real"
  ].join("\n"), { baseConfig: BASE_CONFIG, isLogoKnown });

  assert.equal(result.ok, false);
  const message = formatAdvancedBulkIssues(result.issues);
  assert.match(message, /Line 2, column "foreground": Expected a #RRGGBB color/);
  assert.match(message, /Line 2, column "logo": Unknown logo "not-real"/);
  assert.match(message, /Line 2, column "url": Use an HTTP or HTTPS URL/);
});

test("advanced bulk builds email, sms, and wifi payloads", () => {
  const rows = parseAdvancedBulkCsv([
    "filename,contentType,emailTo,emailSubject,smsNumber,smsMessage,wifiSsid,wifiPassword,wifiEncryption",
    "mail,email,person@example.org,Hello,,,,,",
    "sms,sms,,, +33 1 23 45 67 89,Bonjour,,,",
    "wifi,wifi,,,,,Event WiFi,secret,WPA"
  ].join("\n"), { baseConfig: BASE_CONFIG, isLogoKnown });

  assert.equal(rows[0].payload, "mailto:person@example.org?subject=Hello");
  assert.equal(rows[1].payload, "sms:+33123456789?&body=Bonjour");
  assert.equal(rows[2].payload, "WIFI:T:WPA;S:Event WiFi;P:secret;;");
});

test("advanced bulk creates safe output names and template csv", () => {
  const row = parseAdvancedBulkCsv("filename,url\nMy Room QR.svg,https://example.org/room", {
    baseConfig: BASE_CONFIG,
    isLogoKnown
  })[0];

  assert.equal(advancedBulkFileName(row, "png", 4), "005-my-room-qr.png");
  assert.match(createAdvancedBulkTemplateCsv(BASE_CONFIG), /^filename,format,contentType,url,/);
  assert.match(createAdvancedBulkTemplateCsv(BASE_CONFIG), /wikimedia-example,png,url,/);
});

test("advanced bulk rejects raster jobs that are too large", () => {
  const result = lintAdvancedBulkCsv("filename,format,exportSize,url\nbig,png,1200,https://example.org", {
    baseConfig: BASE_CONFIG,
    isLogoKnown,
    maxRasterPixels: 1000
  });

  assert.equal(result.ok, false);
  assert.match(formatAdvancedBulkIssues(result.issues), /Advanced bulk raster workload is too large/);
  assert.match(formatAdvancedBulkIssues(result.issues), /Reduce exportSize, choose SVG/);
});

test("advanced bulk workload limit ignores SVG-only rows", () => {
  const rows = parseAdvancedBulkCsv("filename,format,exportSize,url\nbig,svg,4096,https://example.org", {
    baseConfig: BASE_CONFIG,
    isLogoKnown,
    maxRasterPixels: 1
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].format, "svg");
});
