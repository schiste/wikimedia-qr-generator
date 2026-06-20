import assert from "node:assert/strict";
import test from "node:test";
import { bulkQrFileName, parseBulkUrlList } from "../src/bulk.js";
import { createZipBlob } from "../src/zip.js";

test("parses comma-separated bulk URLs", () => {
  assert.deepEqual(
    parseBulkUrlList("en.wikipedia.org/wiki/QR_code, https://commons.wikimedia.org/wiki/Main_Page"),
    [
      "https://en.wikipedia.org/wiki/QR_code",
      "https://commons.wikimedia.org/wiki/Main_Page"
    ]
  );
});

test("rejects unsafe bulk URL input", () => {
  assert.throws(() => parseBulkUrlList("https://example.org,"), /empty entries/);
  assert.throws(() => parseBulkUrlList("javascript:alert(1)"), /HTTP or HTTPS/);
  assert.throws(() => parseBulkUrlList("https://example.org, ftp://example.org/file"), /URL 2 is invalid/);
});

test("creates stable bulk QR filenames", () => {
  assert.equal(
    bulkQrFileName("https://www.wikimedia.org/wiki/Fundraising/2026", 4, { suffix: "-bleed" }),
    "005-wikimedia-org-wiki-fundraising-2026-bleed.png"
  );
});

test("creates uncompressed ZIP archives", async () => {
  const zip = createZipBlob([
    { name: "001-example.png", data: new Uint8Array([1, 2, 3]) },
    { name: "notes/readme.txt", data: "hello" }
  ], { date: new Date("2026-06-20T12:00:00Z") });
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = new TextDecoder().decode(bytes);

  assert.equal(zip.type, "application/zip");
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.match(text, /001-example\.png/);
  assert.match(text, /notes\/readme\.txt/);

  const eocdOffset = bytes.length - 22;
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  assert.equal(view.getUint16(eocdOffset + 8, true), 2);
  assert.equal(view.getUint16(eocdOffset + 10, true), 2);
});
