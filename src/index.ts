/**
 * llamune_monkey - llamune インスタンス レジストリ＆モニタリング
 */

import 'dotenv/config';
import { httpServer, apiKeys } from './api/server.js';
import { startMonitor } from './monitor.js';

const PORT = process.env.PORT || 4000;
const POC_URL = process.env.POC_URL ?? '';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN ?? '';

async function loadApiKeysFromPoc() {
  if (!POC_URL) return;
  try {
    const res = await fetch(`${POC_URL}/users`, {
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const users = await res.json() as { api_key: string }[];
    for (const user of users) {
      apiKeys.add(user.api_key);
    }
    console.log(`🔑 Loaded ${users.length} API key(s) from poc`);
  } catch (e) {
    console.warn(`⚠️  Failed to load API keys from poc: ${e}`);
  }
}

httpServer.listen(PORT, async () => {
  console.log('');
  console.log('🐒 llamune_monkey starting...');
  console.log('');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET    /api/health                    - ヘルスチェック');
  console.log('  POST   /api/registry/register         - インスタンス登録');
  console.log('  DELETE /api/registry/:id              - インスタンス登録解除');
  console.log('  PATCH  /api/registry/:id              - 状態更新');
  console.log('  GET    /api/registry/instances        - インスタンス一覧');
  console.log('  GET    /api/keys                      - APIキー一覧');
  console.log('  POST   /api/keys                      - APIキー追加');
  console.log('  DELETE /api/keys                      - APIキー削除');
  console.log('  WS     /ws/status                     - リアルタイム状態配信');
  console.log('');

  // 起動時に poc から api-key を取得
  await loadApiKeysFromPoc();
});

// 死活監視開始
startMonitor();
