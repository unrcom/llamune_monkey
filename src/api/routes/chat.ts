/**
 * チャットルーティング・プロキシ
 * POST /api/chat - チャットリクエストを最適なインスタンスにプロキシ
 */

import { Router, Request, Response } from 'express';
import { registry } from '../../registry.js';
import { denyModels } from './denyModels.js';
import { logRouted, logRoutingFailed, logProxyError } from '../../logger.js';

const router = Router();

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? '';

function selectInstance(model_name: string) {
  // 1. deny_models チェック
  if (denyModels.has(model_name)) {
    return { routable: false, reason: 'training_in_progress' } as const;
  }

  // 2. allowed_models に model_name が含まれるインスタンスを絞り込む
  // 3. healthy なものだけに絞る
  const candidates = registry.getAll().filter(
    (i) =>
      i.healthy &&
      i.allowed_models.some((m) => m.model_name === model_name)
  );

  if (candidates.length === 0) {
    const anyMatch = registry.getAll().some((i) =>
      i.allowed_models.some((m) => m.model_name === model_name)
    );
    return {
      routable: false,
      reason: anyMatch ? 'no_healthy_instance' : 'no_matching_model',
    } as const;
  }

  // 4. version が最新のものを優先
  const maxVersion = Math.max(
    ...candidates.map(
      (i) => i.allowed_models.find((m) => m.model_name === model_name)!.version
    )
  );
  const latestCandidates = candidates.filter(
    (i) => i.allowed_models.find((m) => m.model_name === model_name)!.version === maxVersion
  );

  // 5. queue_size が最小のものを選ぶ
  const selected = latestCandidates.reduce((a, b) =>
    a.queue_size <= b.queue_size ? a : b
  );

  return { routable: true, instance: selected, version: maxVersion } as const;
}

router.post('/', async (req: Request, res: Response) => {
  const { model_name, session_id, user_id } = req.body;
  const api_key = req.headers['x-api-key'] as string;
  const from_ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

  if (!model_name) {
    res.status(400).json({ error: 'model_name は必須です' });
    return;
  }

  const result = selectInstance(model_name);

  if (!result.routable) {
    logRoutingFailed({
      api_key,
      model_name,
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
        'X-Internal-Token': INTERNAL_TOKEN,
      },
      body: JSON.stringify(req.body),
    });

    res.setHeader('Content-Type', pocRes.headers.get('content-type') ?? 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Instance-Id', instance.instance_id);

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

      // ストリーム完了後にログ記録
      logRouted({
        api_key,
        from_ip,
        to_instance_id: instance.instance_id,
        model_name,
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
      model_name,
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
