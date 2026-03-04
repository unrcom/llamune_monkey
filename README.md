# 🐒 llamune_monkey

llamune インスタンスのレジストリ・ルーティング・モニタリングサービスです。  
複数の llamune_poc インスタンスを一元管理し、チャットリクエストを最適なインスタンスへルーティングします。

## 概要

```
llamune_poc (Mac mini #1) ──┐
llamune_poc (Mac mini #2) ──┼──▶ llamune_monkey ◀── WebSocket ── ブラウザ (監視UI)
llamune_poc (Mac mini #3) ──┘         ▲
                                 クライアント (chat)
```

各 llamune_poc は起動時に自己登録し、定期的にハートビートを送信します。  
llamune_monkey はハートビートのタイムアウトで死活を判定し、タイムアウトしたインスタンスを自動削除します。

## 機能

- **インスタンスレジストリ** — llamune_poc インスタンスの登録・登録解除・状態更新
- **ハートビート受信** — poc からのハートビートで last_seen_at を更新
- **死活監視** — ハートビートタイムアウトで自動削除（ポーリングなし）
- **チャットルーティング** — model_name・version・queue_size に基づき最適な poc へプロキシ
- **APIキー管理** — チャットリクエストの認証キーをメモリ管理
- **deny_models** — 特定モデルへのルーティングを一時停止
- **ロギング** — チャットの routed / routing_failed / auth_error / proxy_error / auto_removed を JSONL 形式で記録
- **WebSocket 配信** — インスタンス状態の変化をリアルタイムにブロードキャスト
- **監視 Web UI** — React 製のリアルタイムダッシュボード

## 技術スタック

| 役割 | 技術 |
|------|------|
| サーバー | Node.js 20+, TypeScript, Express |
| リアルタイム通信 | WebSocket (ws) |
| Web UI | React, Vite, Tailwind CSS |

## セットアップ

### 必要環境

- Node.js 20 以上

### インストール

```bash
# サーバー
git clone <repo-url>
cd llamune_monkey
npm install

# Web UI
cd web
npm install
```

### 環境変数

`.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `PORT` | `4000` | サーバーのポート番号 |
| `INTERNAL_TOKEN` | `` | 内部通信用トークン（poc と合わせる） |
| `HEARTBEAT_INTERVAL_MS` | `30000` | poc のハートビート間隔（ミリ秒）。poc の `HEARTBEAT_INTERVAL` × 1000 と合わせる |
| `HEARTBEAT_MISS_COUNT` | `3` | この回数分ハートビートが来なければインスタンスを削除 |
| `POC_URL` | `` | （オプション）poc の URL |

## 起動

### 開発モード

```bash
# サーバー（ホットリロード有効）
npm run dev

# Web UI（別ターミナルで）
cd web
npm run dev
```

### 本番モード

```bash
# サーバービルド＆起動
npm run build
npm start
```

## API エンドポイント

内部通信用エンドポイント（poc → monkey）は `X-Internal-Token` ヘッダーによる認証が必要です。  
チャットエンドポイントは `X-Api-Key` ヘッダーによる認証が必要です。

### ヘルスチェック

```
GET /api/health
```

### インスタンス登録

```
POST /api/registry/register
X-Internal-Token: <token>
```

```json
{
  "instance_id": "mini-a",
  "url": "http://192.168.1.10:8000",
  "description": "Mac mini #1",
  "allowed_models": [
    { "model_name": "qwen2.5-14b-accounting", "version": 1 }
  ]
}
```

### インスタンス登録解除

```
DELETE /api/registry/:instance_id
X-Internal-Token: <token>
```

### 状態更新

```
PATCH /api/registry/:instance_id
X-Internal-Token: <token>
```

```json
{
  "model_status": "inferring",
  "current_model": "qwen2.5-14b-accounting",
  "queue_size": 2,
  "active_request": {
    "session_id": 42,
    "question_preview": "売上原価の計算方法は...",
    "started_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### ハートビート

```
PUT /api/registry/:instance_id/heartbeat
X-Internal-Token: <token>
```

- 登録済みの場合：`last_seen_at` を更新して 200 を返す
- 未登録の場合：404 を返す（poc 側が再登録を行う）

### インスタンス一覧取得

```
GET /api/registry/instances
```

### チャット

```
POST /api/chat
X-Api-Key: <api_key>
```

```json
{
  "model_name": "qwen2.5-14b-accounting",
  "session_id": 1,
  "user_id": 1,
  "question": "売上原価の計算方法は？"
}
```

model_name に対応する healthy なインスタンスへプロキシします。  
ストリーミングレスポンスをそのまま返します。

### deny_models

```
POST   /api/deny-models       # モデルをルーティング停止
DELETE /api/deny-models       # ルーティング停止を解除
GET    /api/deny-models       # 停止中モデル一覧
```

### APIキー管理

```
POST   /api/keys   # APIキーを追加
DELETE /api/keys   # APIキーを削除
GET    /api/keys   # APIキー一覧
```

いずれも `X-Internal-Token` ヘッダーによる認証が必要です。

### WebSocket — リアルタイム状態配信

```
WS /ws/status
```

接続すると即座に全インスタンスのスナップショットを受信し、以降は変化があるたびに自動プッシュされます。

## ログ

`logs/monkey.jsonl` に JSONL 形式で記録されます。`api_key` は先頭4文字と末尾4文字のみ記録されます。

| event | 説明 |
|-------|------|
| `routed` | チャットリクエストのルーティング成功 |
| `routing_failed` | ルーティング失敗（no_matching_model / no_healthy_instance / training_in_progress） |
| `auth_error` | 認証エラー |
| `proxy_error` | poc へのプロキシエラー |
| `auto_removed` | ハートビートタイムアウトによるインスタンス自動削除 |

## インスタンスのステータス

| `model_status` | 説明 |
|----------------|------|
| `idle` | 待機中 |
| `loading` | モデルロード中 |
| `inferring` | 推論実行中 |

## llamune エコシステムにおける位置づけ

```
llamune_monkey  ← このリポジトリ（レジストリ・ルーティング・監視）
llamune_poc     ← LLM 推論・評価サービス（Python / FastAPI）
llamune_chat    ← チャットフロントエンド
```

## ライセンス

MIT
