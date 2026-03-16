/**
 * チャットルーティング・プロキシ
 * POST /api/chat - チャットリクエストを最適なインスタンスにプロキシ
 */

import { Router, Request, Response } from 'express';
import { registry } from '../../registry.js';
import { denyApps } from './denyModels.js';
import { logRouted, logRoutingFailed, logProxyError } from '../../logger.js';

const router = Router();

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? '';

function selectInstance(app_name: string) {
  // 1. deny_apps チェック
  if (denyApps.has(app_name)) {
    return { routable: false, reason: 'training_in_progress' } as const;
  }

  // 2. allowed_apps に app_name が含まれる healthy なインスタンスを絞り込む
  const candidates = registry.getAll().filter(
    (i) =>
      i.healthy &&
      i.allowed_apps.some((a) => a.app_name === app_name)
  );

  if (candidates.length === 0) {
    const anyMatch = registry.getAll().some((i) =>
      i.allowed_apps.some((a) => a.app_name === app_name)
    );
    return {
      routable: false,
      reason: anyMatch ? 'no_healthy_instance' : 'no_matching_app',
    } as const;
  }

  // 3. version が最新のものを優先
  const maxVersion = Math.max(
    ...candidates.map(
      (i) => i.allowed_apps.find((a) => a.app_name === app_name)!.version
    )
  );
  const latestCandidates = candidates.filter(
    (i) => i.allowed_apps.find((a) => a.app_name === app_name)!.version === maxVersion
  );

  // 4. queue_size が最小のものを選ぶ
  const selected = latestCandidates.reduce((a, b) =>
    a.queue_size <= b.queue_size ? a : b
  );

  return { routable: true, instance: selected, version: maxVersion } as const;
}

router.post('/', async (req: Request, res: Response) => {
  const { app_name, session_id, user_id } = req.body;
  const api_key = req.headers['authorization'] as string;
  const from_ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

  if (!app_name) {
    res.status(400).json({ error: 'app_name は必須です' });
    return;
  }

  const result = selectInstance(app_name);

  if (!result.routable) {
    logRoutingFailed({
      api_key,
      app_name,
      version: null,
      session_id: session_id ?? 0,
      user_id: user_id ?? 0,
      reason: result.reason,
    });
    res.json({ routable: false, reason: result.reason });
    return;
  }

  const { instance, version } = result;
  const targetUrl = `${instance.url}/chat`;
  const requestStart = Date.now();
  let ttft_ms: number | null = null;

  try {
    const pocRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': api_key,
        'X-Internal-Token': INTERNAL_TOKEN,
      },
      body: JSON.stringify(req.body),
    });

    res.setHeader('Content-Type', pocRes.headers.get('content-type') ?? 'text/plain');
    res.setHeader('X-Instance-Id', instance.instance_id);

    if (!pocRes.ok) {
      const errorBody = await pocRes.json().catch(() => ({ detail: pocRes.statusText }));
      res.status(pocRes.status).json(errorBody);
      return;
    }

    res.setHeader('Transfer-Encoding', 'chunked');

    if (!pocRes.body) {
      res.status(502).json({ error: 'poc からレスポンスがありません' });
      return;
    }

    const reader = pocRes.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (ttft_ms === null) {
          ttft_ms = Date.now() - requestStart;
        }
        res.write(value);
      }
      res.end();

      logRouted({
        api_key,
        from_ip,
        to_instance_id: instance.instance_id,
        app_name,
        version,
        session_id: session_id ?? 0,
        user_id: user_id ?? 0,
        ttft_ms: ttft_ms ?? 0,
        total_ms: Date.now() - requestStart,
      });
    };
    await pump();
  } catch (e: any) {
    console.error(`❌ Proxy error to ${instance.instance_id}:`, e);
    logProxyError({
      api_key,
      app_name,
      version,
      instance_id: instance.instance_id,
      session_id: session_id ?? 0,
      user_id: user_id ?? 0,
      error: e?.message ?? String(e),
    });
    res.status(502).json({ error: 'プロキシエラー' });
  }
});

export { selectInstance };
export default router;
