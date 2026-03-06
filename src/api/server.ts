/**
 * API サーバー
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import registryRouter from './routes/registry.js';
import denyModelsRouter from './routes/denyModels.js';
import chatRouter from './routes/chat.js';
import { setupWebSocket } from './routes/ws.js';

const app = express();

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? '';
const POC_PROXY_URL = process.env.POC_PROXY_URL ?? '';

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

// ── ミドルウェア ──────────────────────────────

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── ルート ────────────────────────────────────

// registry は X-Internal-Token で保護
app.use('/api/registry', requireInternalToken, registryRouter);

// deny_models 管理は X-Internal-Token で保護
app.use('/api/deny-models', requireInternalToken, denyModelsRouter);

// チャット（ルーティング・プロキシ）は認証素通し（poc バックで検証）
app.use('/api/chat', chatRouter);

// /api/poc/* 汎用プロキシ（認証素通し、poc バックで検証）
app.use('/api/poc', async (req: Request, res: Response) => {
  if (!POC_PROXY_URL) {
    res.status(503).json({ error: 'POC_PROXY_URL が設定されていません' });
    return;
  }
  const targetPath = req.originalUrl.replace('/api/poc', '');
  const targetUrl = `${POC_PROXY_URL}${targetPath}`;
  try {
    const pocRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...( req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] as string } : {}),
        'X-Internal-Token': INTERNAL_TOKEN,
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const data = await pocRes.json();
    res.status(pocRes.status).json(data);
  } catch (e: any) {
    console.error(`❌ Proxy error to poc:`, e);
    res.status(502).json({ error: 'プロキシエラー' });
  }
});

// ヘルスチェック（認証不要）
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws/status' });
setupWebSocket(wss);

export { httpServer, app };
