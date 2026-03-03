/**
 * ロガー
 * イベントを JSONL 形式でファイルに記録する
 */

import fs from 'fs';
import path from 'path';

const LOG_FILE = process.env.LOG_FILE ?? 'logs/monkey.jsonl';

// ログディレクトリを作成
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function write(record: object) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...record,
  });
  fs.appendFileSync(LOG_FILE, line + '\n');
}

export function logRouted(params: {
  api_key: string;
  model_name: string;
  version: number;
  instance_id: string;
  session_id: number;
  user_id: number;
  ttft_ms: number;
  total_ms: number;
}) {
  write({ event: 'routed', ...params });
}

export function logRoutingFailed(params: {
  api_key: string;
  model_name: string;
  version: number | null;
  session_id: number;
  user_id: number;
  reason: string;
}) {
  write({ event: 'routing_failed', ...params });
}

export function logAuthError(params: {
  path: string;
  api_key: string;
}) {
  write({ event: 'auth_error', ...params });
}

export function logProxyError(params: {
  api_key: string;
  model_name: string;
  version: number;
  instance_id: string;
  session_id: number;
  user_id: number;
  error: string;
}) {
  write({ event: 'proxy_error', ...params });
}
