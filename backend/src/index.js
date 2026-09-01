// MACCAN RMS - Main Server
// Phase 3: POS & Kitchen Orders with WebSocket

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { initDb, getDb, closeDb } = require('./db/connection');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create HTTP server + WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected KDS clients
const kdsClients = new Set();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 KDS client connected from ${clientIp}`);
  kdsClients.add(ws);

  ws.on('close', () => {
    kdsClients.delete(ws);
    console.log(`🔌 KDS client disconnected (${kdsClients.size} active)`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    kdsClients.delete(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'KDS connected to MACCAN RMS', clients: kdsClients.size }));
});

// Broadcast function — sends to all KDS clients
function broadcast(message) {
  const payload = JSON.stringify(message);
  kdsClients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  });
}

async function startServer() {
  // Initialize database
  await initDb();
  console.log('✅ Database connected');

  // Routes
  const ordersRouter = require('./routes/orders');
  ordersRouter.setBroadcast(broadcast);

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/ingredients', require('./routes/ingredients'));
  app.use('/api/recipes', require('./routes/recipes'));
  app.use('/api/suppliers', require('./routes/suppliers'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/inventory', require('./routes/inventory'));
  app.use('/api/analytics', require('./routes/analytics'));
  app.use('/api/orders', ordersRouter);
  app.use('/api/nutrition', require('./routes/nutrition'));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '2.0.0',
      phase: 'Phase 3 - POS & Kitchen Orders',
      ws_clients: kdsClients.size,
      timestamp: new Date().toISOString()
    });
  });

  // Serve frontend in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/build')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
    });
  }

  // Error handling
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ error: 'Internal server error.' });
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════════╗\n║         🍽️  MACCAN RMS - Phase 3            ║\n║         POS & Kitchen Orders                 ║\n╠══════════════════════════════════════════════╣\n║  🌐 Server:  http://localhost:${PORT}          ║\n║  📊 API:     http://localhost:${PORT}/api       ║\n║  🔌 WebSocket: ws://localhost:${PORT}/ws       ║\n║  💚 Health:  http://localhost:${PORT}/api/health ║\n╚══════════════════════════════════════════════╝\n    `);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
