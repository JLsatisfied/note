/**
 * 生成应用图标 build/icon.png（1024×1024，圆角蓝底 + 白色文档）。
 *
 * 零依赖：用 Node 自带的 zlib 手写 PNG 编码，形状用 SDF（有向距离场）求覆盖度，
 * 边缘自带抗锯齿。想换配色改下面的 COLORS / 几何常量再跑一次即可：
 *
 *   node scripts/make-icon.mjs
 *
 * 生成的这张 png 会被 electron-builder 自动转成 .ico / .icns，
 * 不需要自己准备多尺寸图标。
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "icon.png");

// ---------- 配色 ----------
const BG_TOP = [96, 175, 255]; // 渐变起始色
const BG_BOTTOM = [37, 99, 235]; // 渐变结束色
const SHEET = [255, 255, 255]; // 文档纸面
const LINE = [59, 130, 246]; // 文档上的文字线

// ---------- 几何（以 1024 画布为基准） ----------
const S = 1024;
const C = S / 2;
const BG_HALF = C - 0.06 * S; // 圆角方块半径（留 6% 透明边距）
const BG_R = BG_HALF * 0.45; // 圆角半径

const SHEET_HW = 0.17 * S; // 纸面半宽
const SHEET_HH = 0.215 * S; // 纸面半高
const SHEET_R = 0.035 * S;

const LINE_R = 0.015 * S; // 文字线粗细
const LINE_LEN = 0.115 * S; // 文字线半长
const LINE_YS = [-0.129, -0.051, 0.027, 0.105].map((f) => C + f * S);
const LINE_SCALE = [1, 1, 1, 0.5]; // 最后一行短一截，像段落收尾

// ---------- 基础工具 ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;

/** 距离转覆盖度：d<0 在形状内，边界 1px 内做线性过渡 = 抗锯齿 */
const cover = (d) => clamp(0.5 - d, 0, 1);

/** 圆角矩形的有向距离 */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    r
  );
}

/** 水平胶囊（圆头线段）的有向距离 */
function sdCapsuleH(px, py, cx, cy, hl, r) {
  return Math.hypot(Math.max(Math.abs(px - cx) - hl, 0), py - cy) - r;
}

// ---------- 画布：用 0..1 的浮点 RGBA 累积，最后再量化成 8 位 ----------
const buf = new Float64Array(S * S * 4);

/** 把颜色 (r,g,b,a) 以 src-over 方式叠到像素 i 上 */
function over(i, r, g, b, a) {
  if (a <= 0) return;
  const da = buf[i + 3];
  const oa = a + da * (1 - a);
  if (oa <= 0) return;
  buf[i] = (r * a + buf[i] * da * (1 - a)) / oa;
  buf[i + 1] = (g * a + buf[i + 1] * da * (1 - a)) / oa;
  buf[i + 2] = (b * a + buf[i + 2] * da * (1 - a)) / oa;
  buf[i + 3] = oa;
}

const nx = (v) => v / 255;

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const px = x + 0.5;
    const py = y + 0.5;
    const i = (y * S + x) * 4;

    // 1) 背景圆角方块 + 竖向渐变
    const bgA = cover(sdRoundRect(px, py, C, C, BG_HALF, BG_HALF, BG_R));
    if (bgA > 0) {
      const t = clamp((py - (C - BG_HALF)) / (2 * BG_HALF), 0, 1);
      over(
        i,
        nx(mix(BG_TOP[0], BG_BOTTOM[0], t)),
        nx(mix(BG_TOP[1], BG_BOTTOM[1], t)),
        nx(mix(BG_TOP[2], BG_BOTTOM[2], t)),
        bgA
      );
    }

    // 2) 纸面投影（下移 12px，40px 内柔和淡出）
    const shadow = sdRoundRect(px, py - 12, C, C, SHEET_HW, SHEET_HH, SHEET_R);
    if (shadow < 40) {
      over(i, 0, 0, 0, 0.22 * clamp(0.5 - shadow / 40, 0, 1));
    }

    // 3) 纸面
    over(
      i,
      nx(SHEET[0]),
      nx(SHEET[1]),
      nx(SHEET[2]),
      cover(sdRoundRect(px, py, C, C, SHEET_HW, SHEET_HH, SHEET_R))
    );

    // 4) 文字线
    for (let k = 0; k < LINE_YS.length; k++) {
      const d = sdCapsuleH(px, py, C, LINE_YS[k], LINE_LEN * LINE_SCALE[k], LINE_R);
      if (d < 1) over(i, nx(LINE[0]), nx(LINE[1]), nx(LINE[2]), cover(d));
    }
  }
}

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(bytes) {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 每通道 8 位
  ihdr[9] = 6; // RGBA
  // 10/11/12 = 压缩方式 / 过滤方式 / 隔行扫描，均为 0

  // 每条扫描线前面要加一个过滤类型字节（0 = None）
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1);
    raw[at] = 0;
    pixels.copy(raw, at + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const pixels = Buffer.alloc(S * S * 4);
for (let i = 0; i < S * S; i++) {
  pixels[i * 4] = Math.round(clamp(buf[i * 4], 0, 1) * 255);
  pixels[i * 4 + 1] = Math.round(clamp(buf[i * 4 + 1], 0, 1) * 255);
  pixels[i * 4 + 2] = Math.round(clamp(buf[i * 4 + 2], 0, 1) * 255);
  pixels[i * 4 + 3] = Math.round(clamp(buf[i * 4 + 3], 0, 1) * 255);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePng(S, S, pixels));
console.log(`已生成 ${OUT}（${S}×${S}）`);
