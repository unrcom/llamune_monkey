/**
 * 死活監視
 * ハートビートのタイムアウトで unhealthy を判定し、即削除する。
 * HEARTBEAT_INTERVAL_MS × HEARTBEAT_MISS_COUNT 以上 last_seen_at が
 * 更新されなければインスタンスを削除する。
 */

import 'dotenv/config';
import { registry } from './registry.js';
import { logAutoRemoved } from './logger.js';

const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? '30000');
const HEARTBEAT_MISS_COUNT = parseInt(process.env.HEARTBEAT_MISS_COUNT ?? '3');
const TIMEOUT_MS = HEARTBEAT_INTERVAL_MS * HEARTBEAT_MISS_COUNT;
const CHECK_INTERVAL_MS = HEARTBEAT_INTERVAL_MS;

export function startMonitor() {
  console.log(
    `[${new Date().toISOString()}] 🔍 Monitor started (heartbeat interval: ${HEARTBEAT_INTERVAL_MS}ms, ` +
    `miss count: ${HEARTBEAT_MISS_COUNT}, timeout: ${TIMEOUT_MS}ms)`
  );
  setInterval(() => {
    const now = Date.now();
    for (const instance of registry.getAll()) {
      const lastSeen = new Date(instance.last_seen_at).getTime();
      if (now - lastSeen >= TIMEOUT_MS) {
        const msg = `[${new Date().toISOString()}] 🗑️  Auto-removing instance (heartbeat timeout): ${instance.instance_id} (last_seen_at: ${instance.last_seen_at})`;
        console.log(msg);
        logAutoRemoved({ instance_id: instance.instance_id, last_seen_at: instance.last_seen_at });
        registry.unregister(instance.instance_id);
      }
    }
  }, CHECK_INTERVAL_MS);
}
