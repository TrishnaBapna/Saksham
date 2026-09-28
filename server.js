/**
 * Saksham Local Development & Web Server
 * Serves static assets and provides WebAuthn / Passkeys API at /api/*
 */

const express = require('express');
const path = require('path');
const { app: apiApp } = require('./functions/index.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Mount WebAuthn API under /api (clean separation from static files)
app.use('/api', apiApp);

// Serve static frontend assets AFTER the API routes
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  index: 'index.html',
}));

// Fallback to index.html for any unmatched non-asset routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('================================================================');
  console.log('  SAKSHAM - Cognitive Wellness & Routine Studio (सक्षम)');
  console.log('  WebAuthn / Passkeys Authentication Server Running');
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  API Base:    http://localhost:${PORT}/api`);
  console.log('  WebAuthn RP: localhost');
  console.log('================================================================');
});
