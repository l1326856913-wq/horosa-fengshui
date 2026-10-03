// 本地开发服务器：静态托管 public/ + 以 Vercel 兼容方式运行 api/index.js
// 用法：node dev-server.mjs [端口，默认 8000]
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/index.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.argv[2] || 8000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function makeVercelStyle(req, res) {
  // 为 Vercel 风格 handler 补齐 res.status().json() 等助手
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
  // 解析 JSON 请求体
  const original = req;
  return new Promise((resolve) => {
    let chunks = [];
    original.on('data', (c) => chunks.push(c));
    original.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      try { original.body = raw ? JSON.parse(raw) : {}; } catch { original.body = {}; }
      resolve([original, res]);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname.startsWith('/api/')) {
    const [, wrappedRes] = await makeVercelStyle(req, res);
    try {
      await handler(req, wrappedRes);
    } catch (e) {
      if (!wrappedRes.headersSent) wrappedRes.status(500).json({ error: e.message });
      else wrappedRes.end();
    }
    return;
  }

  // 静态文件
  let file = pathname === '/' ? '/index.html' : pathname;
  const full = normalize(join(ROOT, 'public', file));
  if (!full.startsWith(join(ROOT, 'public')) || !existsSync(full)) {
    res.statusCode = 404; res.end('Not Found'); return;
  }
  res.setHeader('Content-Type', MIME[extname(full)] || 'application/octet-stream');
  res.end(readFileSync(full));
});

server.listen(PORT, () => {
  console.log(`[dev] Horosa 本地服务已启动: http://localhost:${PORT}`);
  console.log('[dev] 提示：手机测试需 HTTPS（可用 ngrok 暴露），本机浏览器可直接访问');
});
