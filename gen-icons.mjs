// 纯 Node 生成 PWA 图标（金色罗盘，无第三方依赖）
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  // 每行前加过滤字节 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = size * 0.42, ringW = size * 0.03;
  const gold = [212, 175, 55], dark = [10, 10, 12];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy);
      let c = dark, alpha = 0;
      if (r <= R) { // 表盘
        c = dark; alpha = 255;
        // 外环
        if (r > R - ringW) c = gold;
        // 刻度：每 15° 一格，主方位加粗
        const ang = ((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360;
        const tickIdx = Math.round(ang / 15) % 24;
        const diff = Math.abs(ang - tickIdx * 15);
        const d = Math.min(diff, 360 - diff);
        if (r < R - ringW && r > R * 0.82 && d < (tickIdx % 6 === 0 ? 1.8 : 0.9)) c = gold;
        // 指针（指北红色针 + 南针）
        if (r < R * 0.78) {
          const needleHalf = size * 0.028; // 针的半宽
          const na = ((ang - 0) + 360) % 360; // 0°=北
          const perp = Math.abs(((ang + 90) % 360) - 180); // 与北向的横向偏差
          const off = (90 - Math.abs(((na % 90) - 45))) ; // rough
          // 简化：横向距离 = r * sin(相对北的角度)
          const rel = na * Math.PI / 180;
          const lateral = Math.abs(r * Math.sin(rel));
          const along = r * Math.cos(rel);
          if (lateral < needleHalf && along > 0) c = [211, 47, 47];      // 北针(红)
          if (lateral < needleHalf && along < 0) c = [236, 236, 236];    // 南针(白)
          if (r < size * 0.035) c = gold; // 中轴
        }
      }
      rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = alpha;
    }
  }
  return png(size, size, rgba);
}

writeFileSync(new URL('./public/icon-192.png', import.meta.url), drawIcon(192));
writeFileSync(new URL('./public/icon-512.png', import.meta.url), drawIcon(512));
console.log('icons generated: icon-192.png, icon-512.png');
