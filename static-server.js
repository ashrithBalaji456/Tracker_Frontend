import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.env.PORT || 5173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const requested = normalize(url.pathname).replace(/^([/\\])+/, '');
  let file = join(root, requested);

  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(root, 'index.html');
  }

  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  createReadStream(file)
    .on('error', () => {
      res.statusCode = 500;
      res.end('Unable to read file');
    })
    .pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`Static frontend ready at http://127.0.0.1:${port}`);
});
