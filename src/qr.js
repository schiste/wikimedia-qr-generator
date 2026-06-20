const ECC_CODEWORDS_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
];

const NUM_ERROR_CORRECTION_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
];

const ERROR_CORRECTION_LEVELS = {
  low: { index: 0, formatBits: 1, label: "L" },
  medium: { index: 1, formatBits: 0, label: "M" },
  quartile: { index: 2, formatBits: 3, label: "Q" },
  high: { index: 3, formatBits: 2, label: "H" }
};

export function createQrCode(text, options = {}) {
  const content = String(text ?? "");
  const bytes = Array.from(new TextEncoder().encode(content));
  const ecl = normalizeErrorCorrection(options.errorCorrection);
  const minVersion = clampInteger(options.minVersion ?? 1, 1, 40);
  const maxVersion = clampInteger(options.maxVersion ?? 40, minVersion, 40);

  let version = minVersion;
  while (version <= maxVersion && !fitsInVersion(bytes.length, version, ecl)) {
    version += 1;
  }

  if (version > maxVersion) {
    throw new Error(`Content is too long for QR Code version ${maxVersion}.`);
  }

  const dataCodewords = createDataCodewords(bytes, version, ecl);
  const codewords = addErrorCorrectionAndInterleave(dataCodewords, version, ecl);
  const qr = new QrMatrix(version, ecl);
  qr.drawFunctionPatterns();
  qr.drawCodewords(codewords);

  const requestedMask = options.mask;
  let mask;
  if (Number.isInteger(requestedMask) && requestedMask >= 0 && requestedMask <= 7) {
    mask = requestedMask;
    qr.applyMask(mask);
    qr.drawFormatBits(mask);
  } else {
    mask = qr.chooseBestMask();
  }

  return Object.freeze({
    version,
    size: qr.size,
    errorCorrection: ecl.label,
    mask,
    modules: qr.modules.map((row) => row.slice()),
    toSvg: (svgOptions = {}) => renderSvg(qr.modules, svgOptions)
  });
}

function normalizeErrorCorrection(value) {
  const key = String(value || "medium").toLowerCase();
  const ecl = ERROR_CORRECTION_LEVELS[key];
  if (!ecl) {
    throw new Error("Unsupported error correction level.");
  }
  return ecl;
}

function fitsInVersion(byteLength, version, ecl) {
  const charCountBits = version <= 9 ? 8 : 16;
  const payloadBits = 4 + charCountBits + byteLength * 8;
  return payloadBits <= getNumDataCodewords(version, ecl) * 8;
}

function createDataCodewords(bytes, version, ecl) {
  const capacityBits = getNumDataCodewords(version, ecl) * 8;
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, version <= 9 ? 8 : 16);

  for (const byte of bytes) {
    appendBits(bits, byte, 8);
  }

  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const result = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) {
      byte = (byte << 1) | bits[i + j];
    }
    result.push(byte);
  }

  for (let pad = 0xec; result.length < getNumDataCodewords(version, ecl); pad ^= 0xfd) {
    result.push(pad);
  }

  return result;
}

function appendBits(target, value, length) {
  if (length < 0 || value >>> length !== 0) {
    throw new RangeError("Value does not fit in bit length.");
  }
  for (let i = length - 1; i >= 0; i -= 1) {
    target.push((value >>> i) & 1);
  }
}

function addErrorCorrectionAndInterleave(data, version, ecl) {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl.index][version];
  const blockEccLength = ECC_CODEWORDS_PER_BLOCK[ecl.index][version];
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLength = Math.floor(rawCodewords / numBlocks);
  const rsDivisor = reedSolomonComputeDivisor(blockEccLength);
  const blocks = [];
  let offset = 0;

  for (let i = 0; i < numBlocks; i += 1) {
    const dataLength = shortBlockLength - blockEccLength + (i < numShortBlocks ? 0 : 1);
    const blockData = data.slice(offset, offset + dataLength);
    offset += dataLength;
    const blockEcc = reedSolomonComputeRemainder(blockData, rsDivisor);
    blocks.push({ data: blockData, ecc: blockEcc });
  }

  const result = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));
  for (let i = 0; i < maxDataLength; i += 1) {
    for (const block of blocks) {
      if (i < block.data.length) {
        result.push(block.data[i]);
      }
    }
  }

  for (let i = 0; i < blockEccLength; i += 1) {
    for (const block of blocks) {
      result.push(block.ecc[i]);
    }
  }

  return result;
}

function reedSolomonComputeDivisor(degree) {
  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;

  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) {
        result[j] ^= result[j + 1];
      }
    }
    root = reedSolomonMultiply(root, 0x02);
  }

  return result;
}

function reedSolomonComputeRemainder(data, divisor) {
  const result = Array(divisor.length).fill(0);

  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < result.length; i += 1) {
      result[i] ^= reedSolomonMultiply(divisor[i], factor);
    }
  }

  return result;
}

function reedSolomonMultiply(x, y) {
  let z = 0;
  while (y !== 0) {
    if ((y & 1) !== 0) {
      z ^= x;
    }
    x <<= 1;
    if ((x & 0x100) !== 0) {
      x ^= 0x11d;
    }
    y >>>= 1;
  }
  return z & 0xff;
}

function getNumDataCodewords(version, ecl) {
  return Math.floor(getNumRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl.index][version] * NUM_ERROR_CORRECTION_BLOCKS[ecl.index][version];
}

function getNumRawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
}

class QrMatrix {
  constructor(version, ecl) {
    this.version = version;
    this.ecl = ecl;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => Array(this.size).fill(false));
  }

  drawFunctionPatterns() {
    for (let i = 0; i < this.size; i += 1) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    const alignments = getAlignmentPatternPositions(this.version);
    for (const x of alignments) {
      for (const y of alignments) {
        if (!this.isFunction[y][x]) {
          this.drawAlignmentPattern(x, y);
        }
      }
    }

    this.drawFormatBits(0);
    this.drawVersion();
  }

  drawFinderPattern(cx, cy) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
          continue;
        }
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFunctionModule(x, y, distance !== 2 && distance !== 4);
      }
    }
  }

  drawAlignmentPattern(cx, cy) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        this.setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  drawFormatBits(mask) {
    const data = (this.ecl.formatBits << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i += 1) {
      remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
    }
    const bits = ((data << 10) | remainder) ^ 0x5412;

    for (let i = 0; i <= 5; i += 1) {
      this.setFunctionModule(8, i, getBit(bits, i));
    }
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i += 1) {
      this.setFunctionModule(14 - i, 8, getBit(bits, i));
    }

    for (let i = 0; i < 8; i += 1) {
      this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    }
    for (let i = 8; i < 15; i += 1) {
      this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    }
    this.setFunctionModule(8, this.size - 8, true);
  }

  drawVersion() {
    if (this.version < 7) {
      return;
    }

    let remainder = this.version;
    for (let i = 0; i < 12; i += 1) {
      remainder = (remainder << 1) ^ (((remainder >>> 11) & 1) * 0x1f25);
    }
    const bits = (this.version << 12) | remainder;

    for (let i = 0; i < 18; i += 1) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  drawCodewords(data) {
    let bitIndex = 0;
    const totalBits = data.length * 8;

    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right = 5;
      }

      for (let vertical = 0; vertical < this.size; vertical += 1) {
        for (let offset = 0; offset < 2; offset += 1) {
          const x = right - offset;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vertical : vertical;
          if (this.isFunction[y][x]) {
            continue;
          }

          let dark = false;
          if (bitIndex < totalBits) {
            dark = getBit(data[bitIndex >>> 3], 7 - (bitIndex & 7));
            bitIndex += 1;
          }
          this.modules[y][x] = dark;
        }
      }
    }
  }

  chooseBestMask() {
    let bestMask = 0;
    let bestPenalty = Number.POSITIVE_INFINITY;

    for (let mask = 0; mask < 8; mask += 1) {
      this.applyMask(mask);
      this.drawFormatBits(mask);
      const penalty = this.getPenaltyScore();
      if (penalty < bestPenalty) {
        bestMask = mask;
        bestPenalty = penalty;
      }
      this.applyMask(mask);
    }

    this.applyMask(bestMask);
    this.drawFormatBits(bestMask);
    return bestMask;
  }

  applyMask(mask) {
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (!this.isFunction[y][x] && getMaskBit(mask, x, y)) {
          this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }

  getPenaltyScore() {
    let result = 0;

    for (let y = 0; y < this.size; y += 1) {
      result += getLinePenalty(this.modules[y]);
    }

    for (let x = 0; x < this.size; x += 1) {
      const column = [];
      for (let y = 0; y < this.size; y += 1) {
        column.push(this.modules[y][x]);
      }
      result += getLinePenalty(column);
    }

    for (let y = 0; y < this.size - 1; y += 1) {
      for (let x = 0; x < this.size - 1; x += 1) {
        const color = this.modules[y][x];
        if (
          color === this.modules[y][x + 1] &&
          color === this.modules[y + 1][x] &&
          color === this.modules[y + 1][x + 1]
        ) {
          result += 3;
        }
      }
    }

    let dark = 0;
    for (const row of this.modules) {
      for (const module of row) {
        if (module) {
          dark += 1;
        }
      }
    }

    const total = this.size * this.size;
    result += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return result;
  }

  setFunctionModule(x, y, dark) {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }
}

function getAlignmentPatternPositions(version) {
  if (version === 1) {
    return [];
  }

  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32
    ? 26
    : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];

  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }

  return result;
}

function getLinePenalty(line) {
  let penalty = 0;
  let runColor = line[0];
  let runLength = 1;

  for (let i = 1; i < line.length; i += 1) {
    if (line[i] === runColor) {
      runLength += 1;
      if (runLength === 5) {
        penalty += 3;
      } else if (runLength > 5) {
        penalty += 1;
      }
    } else {
      runColor = line[i];
      runLength = 1;
    }
  }

  for (let i = 0; i <= line.length - 11; i += 1) {
    if (
      line[i] &&
      !line[i + 1] &&
      line[i + 2] &&
      line[i + 3] &&
      line[i + 4] &&
      !line[i + 5] &&
      line[i + 6] &&
      !line[i + 7] &&
      !line[i + 8] &&
      !line[i + 9] &&
      !line[i + 10]
    ) {
      penalty += 40;
    }
    if (
      !line[i] &&
      !line[i + 1] &&
      !line[i + 2] &&
      !line[i + 3] &&
      line[i + 4] &&
      !line[i + 5] &&
      line[i + 6] &&
      line[i + 7] &&
      line[i + 8] &&
      !line[i + 9] &&
      line[i + 10]
    ) {
      penalty += 40;
    }
  }

  return penalty;
}

function getMaskBit(mask, x, y) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      throw new RangeError("Mask must be between 0 and 7.");
  }
}

function renderSvg(modules, options = {}) {
  const margin = clampInteger(options.margin ?? 4, 0, 16);
  const foreground = escapeAttribute(options.foreground ?? "#202122");
  const background = escapeAttribute(options.background ?? "#ffffff");
  const moduleStyle = normalizeModuleStyle(options.moduleStyle);
  const colorDefs = renderColorDefs(options);
  const moduleFill = colorDefs ? "url(#qr-dots-gradient)" : foreground;
  const size = modules.length;
  const dimension = size + margin * 2;
  const logoLayer = renderLogoLayer(options.logo, {
    background,
    logoSize: Number(options.logoSize ?? 0.24),
    margin,
    qrSize: size
  });

  const darkModules = renderModules(modules, {
    color: moduleFill,
    margin,
    style: moduleStyle
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" role="img" aria-label="QR code" shape-rendering="crispEdges">`,
    colorDefs,
    `<path fill="${background}" d="M0 0h${dimension}v${dimension}H0z"/>`,
    darkModules,
    logoLayer,
    "</svg>"
  ].filter(Boolean).join("");
}

function renderColorDefs(options) {
  if (options.colorMode !== "gradient") {
    return "";
  }

  const start = escapeAttribute(options.foreground ?? "#202122");
  const end = escapeAttribute(options.foregroundSecondary ?? "#14866d");
  return `<defs><linearGradient id="qr-dots-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs>`;
}

function renderModules(modules, options) {
  if (options.style === "square") {
    const darkModules = [];
    for (let y = 0; y < modules.length; y += 1) {
      for (let x = 0; x < modules.length; x += 1) {
        if (modules[y][x]) {
          darkModules.push(`M${x + options.margin},${y + options.margin}h1v1h-1z`);
        }
      }
    }
    return `<path fill="${options.color}" d="${darkModules.join("")}"/>`;
  }

  const radius = options.style === "dot" ? 0.5 : 0.28;
  const elements = [];
  for (let y = 0; y < modules.length; y += 1) {
    for (let x = 0; x < modules.length; x += 1) {
      if (!modules[y][x]) {
        continue;
      }
      if (options.style === "dot") {
        elements.push(`<circle cx="${x + options.margin + 0.5}" cy="${y + options.margin + 0.5}" r="${radius}"/>`);
      } else {
        elements.push(`<rect x="${x + options.margin}" y="${y + options.margin}" width="1" height="1" rx="${radius}"/>`);
      }
    }
  }

  return `<g fill="${options.color}">${elements.join("")}</g>`;
}

function renderLogoLayer(logo, options) {
  if (!logo || !logo.body || !logo.viewBox) {
    return "";
  }

  const requestedSize = Number.isFinite(options.logoSize) ? options.logoSize : 0.24;
  const ratio = Math.min(0.36, Math.max(0.16, requestedSize));
  const boxSize = options.qrSize * ratio;
  const backgroundPadding = Math.max(1.2, boxSize * 0.12);
  const backgroundSize = boxSize + backgroundPadding * 2;
  const backgroundX = options.margin + (options.qrSize - backgroundSize) / 2;
  const backgroundY = options.margin + (options.qrSize - backgroundSize) / 2;
  const logoX = backgroundX + backgroundPadding;
  const logoY = backgroundY + backgroundPadding;
  const radius = Math.max(1, backgroundSize * 0.12);
  const label = escapeAttribute(logo.label || "Wikimedia logo");

  return [
    `<g aria-label="${label}">`,
    `<rect x="${round(backgroundX)}" y="${round(backgroundY)}" width="${round(backgroundSize)}" height="${round(backgroundSize)}" rx="${round(radius)}" fill="${options.background}"/>`,
    `<svg x="${round(logoX)}" y="${round(logoY)}" width="${round(boxSize)}" height="${round(boxSize)}" viewBox="${escapeAttribute(logo.viewBox)}" preserveAspectRatio="xMidYMid meet">`,
    logo.body,
    "</svg>",
    "</g>"
  ].join("");
}

function normalizeModuleStyle(value) {
  return ["square", "rounded", "dot"].includes(value) ? value : "square";
}

function round(value) {
  return Number(value.toFixed(3));
}

function clampInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[character]));
}

function getBit(value, index) {
  return ((value >>> index) & 1) !== 0;
}
