const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const albumsHandler = require('./api/albums');
const memoriesHandler = require('./api/memories');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  req.query = Object.fromEntries(requestUrl.searchParams.entries());

  if (requestUrl.pathname === '/api/albums') {
    return albumsHandler(req, res);
  }

  if (requestUrl.pathname === '/api/memories') {
    return memoriesHandler(req, res);
  }

  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const safePath = path.normalize(path.join(ROOT, pathname));

  if (!safePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  serveFile(safePath, res);
});

server.listen(PORT, () => {
  console.log(`Field Notes Album running at http://localhost:${PORT}`);
});
