const encoder = new TextEncoder();
const CRC_TABLE = createCrcTable();
const ZIP_MIME_TYPE = "application/zip";
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const VERSION_NEEDED = 20;

export function createZipBlob(files, { date = new Date() } = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Add at least one file to the ZIP archive.");
  }

  const parts = [];
  const centralDirectory = [];
  let offset = 0;
  const timestamp = toDosDateTime(date);

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = normalizeData(file.data);
    const crc = crc32(data);
    const localHeader = createLocalHeader({
      nameBytes,
      dataLength: data.byteLength,
      crc,
      timestamp
    });

    parts.push(localHeader, nameBytes, data);
    centralDirectory.push(createCentralDirectoryHeader({
      nameBytes,
      dataLength: data.byteLength,
      crc,
      timestamp,
      offset
    }), nameBytes);
    offset += localHeader.byteLength + nameBytes.byteLength + data.byteLength;
  }

  const centralDirectorySize = centralDirectory.reduce((size, part) => size + part.byteLength, 0);
  parts.push(...centralDirectory, createEndOfCentralDirectory({
    fileCount: files.length,
    centralDirectorySize,
    centralDirectoryOffset: offset
  }));

  return new Blob(parts, { type: ZIP_MIME_TYPE });
}

function normalizeData(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return encoder.encode(String(value ?? ""));
}

function createLocalHeader({ nameBytes, dataLength, crc, timestamp }) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, VERSION_NEEDED, true);
  view.setUint16(6, UTF8_FLAG, true);
  view.setUint16(8, STORE_METHOD, true);
  view.setUint16(10, timestamp.time, true);
  view.setUint16(12, timestamp.date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, dataLength, true);
  view.setUint32(22, dataLength, true);
  view.setUint16(26, nameBytes.byteLength, true);
  view.setUint16(28, 0, true);
  return header;
}

function createCentralDirectoryHeader({ nameBytes, dataLength, crc, timestamp, offset }) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, VERSION_NEEDED, true);
  view.setUint16(6, VERSION_NEEDED, true);
  view.setUint16(8, UTF8_FLAG, true);
  view.setUint16(10, STORE_METHOD, true);
  view.setUint16(12, timestamp.time, true);
  view.setUint16(14, timestamp.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, dataLength, true);
  view.setUint32(24, dataLength, true);
  view.setUint16(28, nameBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  return header;
}

function createEndOfCentralDirectory({ fileCount, centralDirectorySize, centralDirectoryOffset }) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return header;
}

function toDosDateTime(date) {
  const safeDate = Number.isFinite(date?.getTime()) ? date : new Date();
  const year = Math.max(1980, safeDate.getFullYear());
  return {
    time: (safeDate.getHours() << 11) | (safeDate.getMinutes() << 5) | Math.floor(safeDate.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((safeDate.getMonth() + 1) << 5) | safeDate.getDate()
  };
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  return Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}
