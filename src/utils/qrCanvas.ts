/**
 * Lightweight QR Code generator for Taro Canvas (WeChat Mini Program).
 * Uses a minimal QR encoding approach suitable for short URLs/deep links.
 */

type CanvasContext = any;

// QR code matrix generation (simplified: supports alphanumeric, medium error correction)
// Based on QR Code Model 2, Version 2-6 for short strings

const GALOIS_EXP = new Uint8Array(256);
const GALOIS_LOG = new Uint8Array(256);

// Initialize Galois field
(function initGalois() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GALOIS_EXP[i] = x;
    GALOIS_LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x11d;
  }
  GALOIS_EXP[255] = GALOIS_EXP[0];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GALOIS_EXP[(GALOIS_LOG[a] + GALOIS_LOG[b]) % 255];
}

function getGenerator(degree: number): Uint8Array {
  let gen = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(gen.length + 1);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], GALOIS_EXP[i]);
    }
    gen = next;
  }
  return gen;
}

function polyRemainder(data: Uint8Array, gen: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length + gen.length - 1);
  result.set(data);
  for (let i = 0; i < data.length; i++) {
    if (result[i] !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] ^= gfMul(gen[j], result[i]);
      }
    }
  }
  return result.slice(data.length);
}

interface QRVersion {
  version: number;
  size: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocks: number;
  dataCodewords: number;
}

const QR_VERSIONS: QRVersion[] = [
  null as any, // index 0 unused
  { version: 1, size: 21, totalCodewords: 26, ecCodewordsPerBlock: 7, numBlocks: 1, dataCodewords: 19 },
  { version: 2, size: 25, totalCodewords: 44, ecCodewordsPerBlock: 10, numBlocks: 1, dataCodewords: 34 },
  { version: 3, size: 29, totalCodewords: 70, ecCodewordsPerBlock: 15, numBlocks: 1, dataCodewords: 55 },
  { version: 4, size: 33, totalCodewords: 100, ecCodewordsPerBlock: 20, numBlocks: 1, dataCodewords: 80 },
  { version: 5, size: 37, totalCodewords: 134, ecCodewordsPerBlock: 26, numBlocks: 1, dataCodewords: 108 },
  { version: 6, size: 41, totalCodewords: 172, ecCodewordsPerBlock: 18, numBlocks: 2, dataCodewords: 136 },
];

function selectVersion(dataLen: number): QRVersion {
  // Byte mode: 4 bits mode + 8 bits count + data + terminator + pad
  for (let i = 1; i < QR_VERSIONS.length; i++) {
    const v = QR_VERSIONS[i];
    const availableBits = v.dataCodewords * 8;
    const neededBits = 4 + 8 + dataLen * 8; // mode indicator + char count + data
    if (neededBits <= availableBits) return v;
  }
  return QR_VERSIONS[6]; // fallback
}

function encodeData(text: string, version: QRVersion): Uint8Array {
  const dataBytes: number[] = [];
  // Mode: byte (0100)
  let bits = 4;
  let bitBuffer = 0b0100;

  // Character count (8 bits for version 1-9)
  bitBuffer = (bitBuffer << 8) | text.length;
  bits += 8;

  // Data
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bitBuffer = (bitBuffer << 8) | code;
    bits += 8;
    // Flush complete bytes
    while (bits >= 8) {
      dataBytes.push((bitBuffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  // Terminator (up to 4 zero bits)
  const maxDataBits = version.dataCodewords * 8;
  const terminatorBits = Math.min(4, maxDataBits - (dataBytes.length * 8 + bits));
  if (terminatorBits > 0) {
    bitBuffer = (bitBuffer << terminatorBits);
    bits += terminatorBits;
  }

  // Flush remaining bits
  if (bits > 0) {
    dataBytes.push((bitBuffer << (8 - bits)) & 0xff);
    bits = 0;
  }

  // Pad to data codewords length
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < version.dataCodewords) {
    dataBytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  return new Uint8Array(dataBytes);
}

function generateECAndInterleave(data: Uint8Array, version: QRVersion): Uint8Array {
  const ecPerBlock = version.ecCodewordsPerBlock;
  const numBlocks = version.numBlocks;
  const shortBlockLen = Math.floor(version.dataCodewords / numBlocks);
  const longBlocks = version.dataCodewords % numBlocks;

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  const gen = getGenerator(ecPerBlock);

  for (let b = 0; b < numBlocks; b++) {
    const blockLen = shortBlockLen + (b >= numBlocks - longBlocks ? 1 : 0);
    const blockData = data.slice(offset, offset + blockLen);
    offset += blockLen;
    dataBlocks.push(blockData);
    ecBlocks.push(polyRemainder(blockData, gen));
  }

  // Interleave
  const result: number[] = [];
  const maxDataLen = shortBlockLen + 1;
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) result.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      result.push(ecBlocks[b][i]);
    }
  }

  return new Uint8Array(result);
}

function createMatrix(version: QRVersion): { matrix: number[][], reserved: boolean[][] } {
  const size = version.size;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns
  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[rr][cc] = 1;
          }
        }
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    reserved[i][6] = true;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Dark module
  reserved[size - 8][8] = true;
  matrix[size - 8][8] = 1;

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
  reserved[8][8] = true;

  // Alignment patterns (version 2+)
  if (version.version >= 2) {
    const alignPos = getAlignmentPositions(version.version);
    for (const row of alignPos) {
      for (const col of alignPos) {
        if (reserved[row]?.[col]) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const rr = row + r, cc = col + c;
            if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
            reserved[rr][cc] = true;
            if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
              matrix[rr][cc] = 1;
            }
          }
        }
      }
    }
  }

  return { matrix, reserved };
}

function getAlignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const positions = [6];
  const size = version * 4 + 17;
  const last = size - 7;
  const count = Math.floor(version / 7) + 2;
  const step = Math.ceil((last - 6) / (count - 1) / 2) * 2;
  for (let pos = last; positions.length < count; pos -= step) {
    if (pos !== 6) positions.unshift(pos);
  }
  return positions;
}

function placeData(matrix: number[][], reserved: boolean[][], codewords: Uint8Array): void {
  const size = matrix.length;
  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // skip vertical timing
    for (let row = 0; row < size; row++) {
      const actualRow = upward ? (size - 1 - row) : row;
      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        if (c < 0 || reserved[actualRow][c]) continue;
        if (bitIdx < codewords.length * 8) {
          const byteIdx = Math.floor(bitIdx / 8);
          const bitPos = 7 - (bitIdx % 8);
          matrix[actualRow][c] = (codewords[byteIdx] >> bitPos) & 1;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }
}

function applyMask(matrix: number[][], reserved: boolean[][]): void {
  const size = matrix.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      // Mask pattern 0: (row + col) % 2 === 0
      if ((r + c) % 2 === 0) {
        matrix[r][c] ^= 1;
      }
    }
  }
}

function placeFormatInfo(matrix: number[][], maskPattern: number): void {
  // Error correction level M (0), mask pattern
  const formatBits = (maskPattern & 7) << 10;
  // BCH(15,5) encoding for format info
  let data = formatBits >> 10;
  let bch = data << 10;
  let gen = 0b10100110111;
  for (let i = 4; i >= 0; i--) {
    if ((bch >> (i + 10)) & 1) bch ^= gen << i;
  }
  const format = ((data << 10) | bch) ^ 0b101010000010010;

  const size = matrix.length;
  // Place format bits
  const bits = [];
  for (let i = 14; i >= 0; i--) bits.push((format >> i) & 1);

  // Around top-left finder
  const pos1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  // Around other finders
  const pos2 = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];

  for (let i = 0; i < 15; i++) {
    const [r1, c1] = pos1[i];
    const [r2, c2] = pos2[i];
    matrix[r1][c1] = bits[i];
    matrix[r2][c2] = bits[i];
  }
}

function generateQRMatrix(text: string): number[][] {
  const version = selectVersion(text.length);
  const dataCodewords = encodeData(text, version);
  const finalCodewords = generateECAndInterleave(dataCodewords, version);
  const { matrix, reserved } = createMatrix(version);
  placeData(matrix, reserved, finalCodewords);
  applyMask(matrix, reserved);
  placeFormatInfo(matrix, 0);
  return matrix;
}

/**
 * Draw QR code on a Taro Canvas context
 */
export function drawQROnCanvas(
  ctx: CanvasContext,
  text: string,
  x: number,
  y: number,
  size: number,
  darkColor = '#1C1B1F',
  lightColor = '#ffffff'
): void {
  const matrix = generateQRMatrix(text);
  const moduleCount = matrix.length;
  const quietZone = 2; // modules of quiet zone
  const totalModules = moduleCount + quietZone * 2;
  const moduleSize = size / totalModules;

  // Draw background
  ctx.fillStyle = lightColor;
  ctx.fillRect(x, y, size, size);

  // Draw modules
  ctx.fillStyle = darkColor;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (matrix[row][col]) {
        const px = x + (col + quietZone) * moduleSize;
        const py = y + (row + quietZone) * moduleSize;
        ctx.fillRect(px, py, Math.ceil(moduleSize), Math.ceil(moduleSize));
      }
    }
  }
}

/**
 * Generate a friend invitation poster on Canvas and save to photos album
 */
export async function generateFriendPoster(options: {
  canvasId: string;
  nickname: string;
  avatarUrl: string;
  catName: string;
  catAvatarUrl: string;
  inviteCode: string;
  qrContent: string;
  width?: number;
  height?: number;
}): Promise<string> {
  const {
    canvasId,
    nickname,
    catName,
    catAvatarUrl,
    inviteCode,
    qrContent,
    width = 600,
    height = 900,
  } = options;

  return new Promise((resolve, reject) => {
    const instance = Taro.getCurrentInstance();
    const query = Taro.createSelectorQuery().in(instance.page);
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]?.node) {
          reject(new Error('Canvas node not found'));
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = Taro.getSystemInfoSync().pixelRatio;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#FFF9F5');
        gradient.addColorStop(1, '#FEF0E6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Top accent line
        ctx.fillStyle = '#D99B7A';
        ctx.fillRect(0, 0, width, 6);

        // User section
        ctx.fillStyle = '#1C1B1F';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(nickname, 100, 80);
        ctx.fillStyle = '#79747E';
        ctx.font = '14px sans-serif';
        ctx.fillText('邀请你成为好友', 100, 108);

        // Cat info
        ctx.fillStyle = '#D99B7A';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`🐱 代表猫咪：${catName}`, 40, 560);

        // QR code
        drawQROnCanvas(ctx, qrContent, (width - 280) / 2, 140, 280, '#1C1B1F', '#ffffff');

        // QR label
        ctx.fillStyle = '#79747E';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('扫描二维码添加好友', width / 2, 440);
        ctx.fillText(inviteCode, width / 2, 460);

        // Bottom hint
        ctx.fillStyle = 'rgba(93, 64, 55, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.fillText('让好友打开 Miao 扫描即可建立连接', width / 2, 600);
        ctx.textAlign = 'left';

        // Avatar circles (drawn after QR as decorative)
        // User avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(56, 84, 28, 0, Math.PI * 2);
        ctx.clip();
        // Fallback: draw placeholder circle
        ctx.fillStyle = '#FEF6F0';
        ctx.fill();
        ctx.restore();

        // Export
        setTimeout(() => {
          Taro.canvasToTempFilePath({
            canvas,
            width,
            height,
            destWidth: width * 2,
            destHeight: height * 2,
            success: (tempRes) => resolve(tempRes.tempFilePath),
            fail: (err) => reject(err),
          });
        }, 100);
      });
  });
}