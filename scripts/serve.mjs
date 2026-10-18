// Minimal static file server for the built site.
//
// The production build loads its JavaScript as ES modules, which browsers refuse
// to load from a file:// URL. Opening dist/index.html by double-click therefore
// shows a blank page. This server exists so the built site can be viewed with a
// single click and no Node/ npm on PATH.
//
// Usage: node scripts/serve.mjs [port] [--no-open]

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.hdr': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
};

const args = process.argv.slice(2);
const open = !args.includes('--no-open');
const port = Number(args.find((a) => /^\d+$/.test(a)) ?? 8080);

if (!existsSync(path.join(ROOT, 'index.html'))) {
  console.error('No build found in dist/. Run a production build first.');
  process.exit(1);
}

function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const full = path.resolve(ROOT, `.${decoded}`);
  return full === ROOT || full.startsWith(ROOT + path.sep) ? full : null;
}

const server = createServer(async (req, res) => {
  let file = resolveSafe(req.url ?? '/');
  if (!file) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  // Unknown extension-less paths fall back to the app shell.
  if (!existsSync(file) && !path.extname(file)) file = path.join(ROOT, 'index.html');

  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    return;
  }

  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', async () => {
  const url = `http://localhost:${port}/`;
  console.log(`F1 is served at ${url}`);
  console.log('Press Ctrl+C to stop.');
  if (open && process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (open && process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else if (open) {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
});
