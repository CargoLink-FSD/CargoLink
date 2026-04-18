import { createServer } from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');
const port = Number(process.env.PORT) || 8080;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const sendFile = (filePath, res) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
};

const toSafeFilePath = (urlPath) => {
  const normalizedPath = path.normalize(urlPath).replace(/^([.][.][/\\])+/, '');
  const absolutePath = path.join(distDir, normalizedPath);

  if (!absolutePath.startsWith(distDir)) {
    return null;
  }

  return absolutePath;
};

const server = createServer((req, res) => {
  if (!existsSync(indexFile)) {
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Frontend build artifacts are missing.' }));
    return;
  }

  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const normalizedRequestPath = requestPath === '/' ? '/index.html' : requestPath;
  const candidatePath = toSafeFilePath(normalizedRequestPath);

  if (candidatePath && existsSync(candidatePath) && statSync(candidatePath).isFile()) {
    sendFile(candidatePath, res);
    return;
  }

  // SPA fallback
  sendFile(indexFile, res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend service listening on port ${port}`);
});
