/**
 * Peer ブロードキャスト
 * 登録・ハートビート・状態更新・削除を全 peer monkey に伝播する
 */

import 'dotenv/config';

/** PEER_URLS=http://host:4001,http://host:4002 */
const PEER_URLS: string[] = (process.env.PEER_URLS ?? '')
  .split(',')
  .map(u => u.trim())
  .filter(u => u.length > 0);

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? '';

/** 伝播リクエストかどうか判定 */
export function isPropagated(headers: Record<string, string | string[] | undefined>): boolean {
  return headers['x-propagated'] === 'true';
}

/**
 * 全 peer に同じリクエストを転送する
 * 失敗しても例外を投げず、ログだけ出す
 */
export async function broadcast(
  method: string,
  path: string,
  body?: unknown,
): Promise<void> {
  if (PEER_URLS.length === 0) return;

  await Promise.allSettled(
    PEER_URLS.map(async (peerUrl) => {
      const url = `${peerUrl}${path}`;
      try {
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': INTERNAL_TOKEN,
            'X-Propagated': 'true',
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          console.warn(`[peers] ⚠️  ${method} ${url} -> ${res.status}`);
        } else {
          console.log(`[peers] ✅ propagated: ${method} ${url}`);
        }
      } catch (e: any) {
        console.warn(`[peers] ❌ failed to propagate: ${method} ${url} (${e?.message})`);
      }
    })
  );
}
