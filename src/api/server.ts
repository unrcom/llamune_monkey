/**
 * API サーバー
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import registryRouter from './routes/registry.js';
import { setupWebSocket } from './routes/ws.js';

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());

// リクエストログ
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ルート
app.use('/api/registry', registryRouter);

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// HTTP サーバー＋WebSocket サーバーを統合
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws/status' });
setupWebSocket(wss);

export { httpServer };
