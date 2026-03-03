/**
 * API サーバー
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import registryRouter from './routes/registry.js';
import keysRouter from './routes/keys.js';
import denyModelsRouter from './routes/denyModels.js';
import chatRouter from './routes/chat.js';
import { setupWebSocket } from './routes/ws.js';
import { logAuthError } from '../logger.js';

const app = express();

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? '';

// ── 認証ミドルウェア ───────────────────────────

/** poc → monkey 内部通信用（X-Internal-Token） */
export function requireInternalToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'];
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

/** フロントエンド → monkey 用（X-API-Key） */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key || !apiKeys.has(key)) {
    logAuthError({ path: req.originalUrl, api_key: key ?? '' });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// APIキーをメモリで管理（/api/keys エンドポイントで追加・削除）
export const apiKeys = new Set<string>();

// ── ミドルウェア ──────────────────────────────

app.use(cors());
app.use(express.json());

// リクエストログ
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── ルート ────────────────────────────────────

// registry は X-Internal-Token で保護
app.use('/api/registry', requireInternalToken, registryRouter);

// APIキー管理は X-Internal-Token で保護
app.use('/api/keys', requireInternalToken, keysRouter);

// deny_models 管理は X-Internal-Token で保護
app.use('/api/deny_models', requireInternalToken, denyModelsRouter);

// チャット（ルーティング・プロキシ）は X-API-Key で保護
app.use('/api/chat', requireApiKey, chatRouter);

// ヘルスチェック（認証不要）
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

export { httpServer, app };
