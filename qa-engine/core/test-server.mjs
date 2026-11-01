/**
 * Saksham 3.0 Autonomous Quality Assurance Engine
 * Lightweight Local Static Test Server
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

export class TestServer {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.port = options.port || (8100 + Math.floor(Math.random() * 500));
    this.server = null;
    this.baseUrl = '';
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/' || reqPath === '') {
          reqPath = '/index.html';
        }

        // Rewrites matching vercel.json
        if (reqPath === '/patient-onboarding') {
          reqPath = '/index.html';
        }

        const safePath = path.normalize(path.join(this.rootDir, reqPath));
        if (!safePath.startsWith(this.rootDir)) {
          res.statusCode = 403;
          return res.end('Access denied');
        }

        fs.stat(safePath, (err, stats) => {
          if (err || !stats.isFile()) {
            // Fallback to index.html for SPA client-side routes
            const indexPath = path.join(this.rootDir, 'index.html');
            fs.readFile(indexPath, (readErr, content) => {
              if (readErr) {
                res.statusCode = 404;
                return res.end('Not found');
              }
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(content);
            });
            return;
          }

          const ext = path.extname(safePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

          const stream = fs.createReadStream(safePath);
          stream.pipe(res);
        });
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        this.baseUrl = `http://127.0.0.1:${this.port}`;
        resolve(this.baseUrl);
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
