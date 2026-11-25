/**
 * Minimal, zero-dependency ISO/IEC 18004 QR Code Model 2 SVG generator (Versions 1-15, EC Level L, Byte Mode).
 * Runs 100% offline in the browser with zero third-party packages or external network requests.
 */

// Each entry: [ecCodewordsPerBlock, group1Blocks, group1DataCw, group2Blocks, group2DataCw]
const VERSION_L_SPECS: readonly [number, number, number, number, number][] = [
  [0, 0, 0, 0, 0], // placeholder index 0
  [7, 1, 19, 0, 0],
  [10, 1, 34, 0, 0],
  [15, 1, 55, 0, 0],
  [20, 1, 80, 0, 0],
  [26, 1, 108, 0, 0],
  [18, 2, 68, 0, 0],
  [20, 2, 78, 0, 0],
  [24, 2, 97, 0, 0],
  [30, 2, 116, 0, 0],
  [18, 2, 68, 2, 69],
  [20, 4, 81, 0, 0],
  [24, 2, 92, 2, 93],
  [26, 4, 107, 0, 0],
  [30, 3, 115, 1, 116],
  [22, 5, 87, 1, 88],
];

const ALIGNMENT_COORDS: readonly (readonly number[])[] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
];

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root) ^ (j + 1 < degree ? result[j + 1] : 0);
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[divisor.length - 1] = 0;
    for (let j = 0; j < divisor.length; j++) {
      result[j] ^= gfMul(divisor[j], factor);
    }
  }
  return result;
}

function maskBit(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function computePenalty(modules: Uint8Array[], size: number): number {
  let penalty = 0;
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[r][c];
        runLen = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[r][c];
        runLen = 1;
      }
    }
  }
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c];
      if (
        v === modules[r][c + 1] &&
        v === modules[r + 1][c] &&
        v === modules[r + 1][c + 1]
      ) {
        penalty += 3;
      }
    }
  }
  return penalty;
}

export function encodeQrMatrix(text: string): boolean[][] {
  const payload = new TextEncoder().encode(text);
  let version = 0;
  for (let v = 1; v < VERSION_L_SPECS.length; v++) {
    const [, g1b, g1d, g2b, g2d] = VERSION_L_SPECS[v];
    const totalDataCw = g1b * g1d + g2b * g2d;
    const headerBits = 4 + (v <= 9 ? 8 : 16);
    if (headerBits + payload.length * 8 <= totalDataCw * 8) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    throw new Error('QR payload exceeds supported capacity (max ~520 bytes)');
  }

  const [ecCwPerBlock, g1Blocks, g1DataCw, g2Blocks, g2DataCw] = VERSION_L_SPECS[version];
  const totalDataCw = g1Blocks * g1DataCw + g2Blocks * g2DataCw;
  const countBits = version <= 9 ? 8 : 16;

  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };

  pushBits(0b0100, 4);
  pushBits(payload.length, countBits);
  for (let i = 0; i < payload.length; i++) pushBits(payload[i], 8);
  pushBits(0, Math.min(4, totalDataCw * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCw = new Uint8Array(totalDataCw);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    dataCw[i] = b;
  }
  for (let i = bits.length / 8, padIdx = 0; i < totalDataCw; i++, padIdx++) {
    dataCw[i] = padIdx % 2 === 0 ? 0xec : 0x11;
  }

  const divisor = rsDivisor(ecCwPerBlock);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  const totalBlocks = g1Blocks + g2Blocks;
  for (let b = 0; b < totalBlocks; b++) {
    const len = b < g1Blocks ? g1DataCw : g2DataCw;
    const slice = dataCw.subarray(offset, offset + len);
    offset += len;
    dataBlocks.push(slice);
    ecBlocks.push(rsRemainder(slice, divisor));
  }

  const allCodewords: number[] = [];
  const maxDataLen = Math.max(g1DataCw, g2DataCw);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (i < dataBlocks[b].length) allCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecCwPerBlock; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      allCodewords.push(ecBlocks[b][i]);
    }
  }

  const size = version * 4 + 17;
  const baseModules: Uint8Array[] = Array.from({ length: size }, () => new Uint8Array(size));
  const isFunction: Uint8Array[] = Array.from({ length: size }, () => new Uint8Array(size));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    baseModules[r][c] = dark ? 1 : 0;
    isFunction[r][c] = 1;
  };

  const drawFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        setFunctionModule(topR + dr, leftC + dc, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  const align = ALIGNMENT_COORDS[version];
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === align.length - 1) ||
        (i === align.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = align[i];
      const cc = align[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunctionModule(cr + dr, cc + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunctionModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunctionModule(i, 6, i % 2 === 0);
  }

  // Reserve format info modules + set dark module
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    setFunctionModule(8, size - 1 - i, false);
    setFunctionModule(size - 1 - i, 8, false);
  }
  setFunctionModule(size - 8, 8, true);

  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const verBits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((verBits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      setFunctionModule(a, b, dark);
      setFunctionModule(b, a, dark);
    }
  }

  // Place data + EC bits in standard 2-column zigzag
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            dark = ((allCodewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          baseModules[r][c] = dark ? 1 : 0;
        }
      }
    }
  }

  const writeFormatBits = (grid: Uint8Array[], mask: number) => {
    const data = (0b01 << 3) | mask; // EC Level L = 01
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits15 = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) grid[i][8] = (bits15 >>> i) & 1;
    grid[7][8] = (bits15 >>> 6) & 1;
    grid[8][8] = (bits15 >>> 7) & 1;
    grid[8][7] = (bits15 >>> 8) & 1;
    for (let i = 9; i < 15; i++) grid[8][14 - i] = (bits15 >>> i) & 1;

    for (let i = 0; i < 8; i++) grid[8][size - 1 - i] = (bits15 >>> i) & 1;
    for (let i = 8; i < 15; i++) grid[size - 15 + i][8] = (bits15 >>> i) & 1;
    grid[size - 8][8] = 1;
  };

  let bestGrid: Uint8Array[] = baseModules;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = baseModules.map((row) => new Uint8Array(row));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunction[r][c] && maskBit(mask, r, c)) {
          candidate[r][c] ^= 1;
        }
      }
    }
    writeFormatBits(candidate, mask);
    const score = computePenalty(candidate, size);
    if (score < bestScore) {
      bestScore = score;
      bestGrid = candidate;
    }
  }

  return bestGrid.map((row) => Array.from(row, (v) => v === 1));
}

export function buildQrSvgPath(matrix: boolean[][], border = 4): {
  viewBoxSize: number;
  pathD: string;
} {
  const n = matrix.length;
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        parts.push(`M${c + border},${r + border}h1v1h-1z`);
      }
    }
  }
  return {
    viewBoxSize: n + border * 2,
    pathD: parts.join(''),
  };
}

/**
 * Converts a colon-separated or plain SHA-256 hex string into URL-safe Base64 without '=' padding,
 * matching Android DevicePolicyManager PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM / PACKAGE_CHECKSUM.
 */
export function hexSha256ToBase64UrlNoPad(hexInput: string): string {
  const cleanHex = String(hexInput || '')
    .replace(/:/g, '')
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(cleanHex)) {
    return '';
  }
  let bin = '';
  for (let i = 0; i < 64; i += 2) {
    bin += String.fromCharCode(parseInt(cleanHex.slice(i, i + 2), 16));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
