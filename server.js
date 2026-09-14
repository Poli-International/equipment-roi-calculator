import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Equipment ROI Calculator' });
});

// Tool-specific subpath routing for exact parity with live site URL structure
app.use('/tools/equipment-roi-calculator/css', express.static(path.join(__dirname, 'css')));
app.use('/tools/equipment-roi-calculator/js', express.static(path.join(__dirname, 'js')));
app.use('/tools/equipment-roi-calculator/tools/shared', express.static(path.join(__dirname, 'tools/shared')));

// Shared tool stylesheets and utilities
app.use('/tools/shared', express.static(path.join(__dirname, 'tools/shared')));
app.use('/tools', express.static(path.join(__dirname, 'tools')));

// Direct static paths
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Root static
app.use(express.static(__dirname));

// Primary entry routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tools/equipment-roi-calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tools/equipment-roi-calculator/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Equipment ROI Calculator running at http://0.0.0.0:${PORT}`);
});
