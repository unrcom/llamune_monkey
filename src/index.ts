/**
 * llamune_monkey - llamune インスタンス レジストリ＆モニタリング
 */

import 'dotenv/config';
import { httpServer } from './api/server.js';
import { startMonitor } from './monitor.js';

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
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
  console.log('  WS     /ws/status                     - リアルタイム状態配信');
  console.log('');
});

// 死活監視開始
startMonitor();
