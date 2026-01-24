// Production server untuk Next.js di cPanel
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = parseInt(process.env.PORT || '1002', 10);

// Inisialisasi Next.js app
const app = next({ 
  dev,
  hostname,
  port,
  dir: __dirname // Pastikan menggunakan directory yang benar
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV || 'production'}`);
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err);
  process.exit(1);
});

