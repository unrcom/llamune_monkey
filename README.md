# 🐒 llamune_monkey

llamune インスタンスのレジストリ＆モニタリングサービスです。  
複数の llamune_poc インスタンスを一元管理し、死活監視とリアルタイム状態配信を行います。

## 概要

llamune_monkey は llamune エコシステムにおけるサービスレジストリです。  
各 llamune_poc インスタンスが起動時に自己登録し、llamune_monkey が定期的にヘルスチェックを行うことで、インスタンスの稼働状況をリアルタイムに把握できます。

```
llamune_poc (Mac mini #1) ──┐
llamune_poc (Mac mini #2) ──┼──▶ llamune_monkey ◀── WebSocket ── ブラウザ (監視UI)
llamune_poc (Mac mini #3) ──┘
```

## 機能

- **インスタンスレジストリ** — llamune_poc インスタンスの登録・登録解除・状態更新
- **死活監視** — 登録済みインスタンスへ定期的にヘルスチェックを実行
- **自動削除** — 一定時間 unhealthy が続いたインスタンスを自動的に削除
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
| `INSTANCE_CHECK_INTERVAL_MS` | `10000` | ヘルスチェック間隔（ミリ秒） |
| `UNHEALTHY_AUTO_REMOVE_MS` | `300000` | 異常インスタンスの自動削除までの時間（ミリ秒）|

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

### ヘルスチェック

```
GET /api/health
```

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

### インスタンス登録

```
POST /api/registry/register
```

```json
{
  "instance_id": "poc-01",
  "url": "http://192.168.1.10:8000",
  "description": "Mac mini #1"
}
```

### インスタンス登録解除

```
DELETE /api/registry/:instance_id
```

### 状態更新

```
PATCH /api/registry/:instance_id
```

```json
{
  "model_status": "inferring",
  "current_model": "qwen2.5:14b",
  "queue_size": 2,
  "active_request": {
    "session_id": 42,
    "question_preview": "売上原価の計算方法は...",
    "started_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### インスタンス一覧取得

```
GET /api/registry/instances
```

### WebSocket — リアルタイム状態配信

```
WS /ws/status
```

接続すると即座に全インスタンスのスナップショットを受信し、以降は変化があるたびに自動プッシュされます。

```json
[
  {
    "instance_id": "poc-01",
    "url": "http://192.168.1.10:8000",
    "description": "Mac mini #1",
    "model_status": "idle",
    "current_model": "qwen2.5:14b",
    "queue_size": 0,
    "active_request": null,
    "registered_at": "2024-01-01T00:00:00.000Z",
    "last_seen_at": "2024-01-01T00:00:05.000Z",
    "healthy": true,
    "unhealthy_since": null
  }
]
```

## インスタンスのステータス

| `model_status` | 説明 |
|----------------|------|
| `idle` | 待機中 |
| `loading` | モデルロード中 |
| `inferring` | 推論実行中 |

## Web UI

ブラウザで `http://localhost:5173`（開発時）を開くと、登録済みインスタンスのダッシュボードが表示されます。

- インスタンス数 / 正常数 / 異常数 / 推論中数のサマリー
- 各インスタンスの詳細カード（ステータス・モデル名・キューサイズ・リクエスト情報）
- WebSocket による自動リアルタイム更新

## llamune エコシステムにおける位置づけ

```
llamune_monkey  ← このリポジトリ（レジストリ＆監視）
llamune_poc     ← LLM 推論・評価サービス（Python / FastAPI）
llamune_chat    ← チャットフロントエンド
```

## ライセンス

MIT
