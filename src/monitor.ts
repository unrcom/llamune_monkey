/**
 * 死活監視
 * 登録済みインスタンスに定期的に GET /health を送り、
 * 応答がなければ unhealthy にマークする。
 * 一定時間 unhealthy が続いたインスタンスは自動削除する。
 */

import 'dotenv/config';
import { registry } from './registry.js';

const INTERVAL_MS = parseInt(process.env.INSTANCE_CHECK_INTERVAL_MS ?? '10000');
const AUTO_REMOVE_MS = parseInt(process.env.UNHEALTHY_AUTO_REMOVE_MS ?? '300000'); // デフォルト5分

async function checkInstance(instance_id: string, url: string) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      registry.markHealthy(instance_id);
    } else {
      registry.markUnhealthy(instance_id);
    }
  } catch {
    registry.markUnhealthy(instance_id);
  }
}

export function startMonitor() {
  console.log(`🔍 Monitor started (interval: ${INTERVAL_MS}ms, auto-remove after: ${AUTO_REMOVE_MS}ms)`);
  setInterval(() => {
    const instances = registry.getAll();
    for (const instance of instances) {
      checkInstance(instance.instance_id, instance.url);
    }
    registry.autoRemoveUnhealthy(AUTO_REMOVE_MS);
  }, INTERVAL_MS);
}
