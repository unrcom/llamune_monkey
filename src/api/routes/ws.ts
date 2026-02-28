/**
 * WebSocket ハンドラー
 * ws://host:4000/ws/status に接続すると
 * インスタンス一覧の変化をリアルタイムで受け取れる
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { registry, InstanceInfo } from '../../registry.js';

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // /ws/status 以外は切断
    if (req.url !== '/ws/status') {
      ws.close(1008, 'Not found');
      return;
    }

    console.log(`🔌 WebSocket connected (${req.socket.remoteAddress})`);

    // 接続直後に現在のスナップショットを送信
    ws.send(JSON.stringify(registry.getAll()));

    // 変化があるたびに送信
    const listener = (instances: InstanceInfo[]) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(instances));
      }
    };
    registry.subscribe(listener);

    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected (${req.socket.remoteAddress})`);
      registry.unsubscribe(listener);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      registry.unsubscribe(listener);
    });
  });
}
