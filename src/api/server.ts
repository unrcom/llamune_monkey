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
import { registry } from '../registry.js';

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

app.use((req, res, next) => {
  res.on("finish", () => console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode}`));
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
// healthy なインスタンスのうち queue_size 最小のものに転送
app.use('/api/poc', async (req: Request, res: Response) => {
  const candidates = registry.getAll().filter((i) => i.healthy && i.instance_type === 'poc');
  if (candidates.length === 0) {
    res.status(503).json({ error: 'no_healthy_instance' });
    return;
  }
  const instance = candidates.reduce((a, b) => a.queue_size <= b.queue_size ? a : b);

  const targetPath = req.originalUrl.replace('/api/poc', '');
  const targetUrl = `${instance.url}${targetPath}`;

  try {
    const pocRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] as string } : {}),
        'X-Internal-Token': INTERNAL_TOKEN,
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    // ストリーミングレスポンスの場合はそのままパイプ
    const contentType = pocRes.headers.get('content-type') ?? '';
    if (contentType.includes('text/plain') && pocRes.body) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.status(pocRes.status);
      const reader = pocRes.body.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(Buffer.from(value));
        await pump();
      };
      await pump();
    } else if (pocRes.status === 204) {
      res.status(204).end();
    } else {
      const data = await pocRes.json();
      res.status(pocRes.status).json(data);
    }
  } catch (e: any) {
    console.error(`❌ Proxy error to poc:`, e);
    res.status(502).json({ error: 'プロキシエラー' });
  }
});

// /api/learn/* 汎用プロキシ（認証素通し、learn バックで検証）
app.use('/api/learn', async (req: Request, res: Response) => {
  const candidates = registry.getAll().filter((i) => i.healthy && i.instance_type === 'learn');
  if (candidates.length === 0) {
    res.status(503).json({ error: 'no_healthy_instance' });
    return;
  }
  const instance = candidates.reduce((a, b) => a.queue_size <= b.queue_size ? a : b);
  const targetPath = req.originalUrl.replace('/api/learn', '');
  const targetUrl = `${instance.url}${targetPath}`;

  try {
    const learnRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] as string } : {}),
        'X-Internal-Token': INTERNAL_TOKEN,
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    // SSEストリーミングレスポンスの場合はそのままパイプ
    const contentType = learnRes.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream') && learnRes.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      res.status(learnRes.status);
      const reader = learnRes.body.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(Buffer.from(value));
        await pump();
      };
      await pump();
    } else if (learnRes.status === 204) {
      res.status(204).end();
    } else {
      const data = await learnRes.json();
      res.status(learnRes.status).json(data);
    }
  } catch (e: any) {
    console.error(`❌ Proxy error to learn:`, e);
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
