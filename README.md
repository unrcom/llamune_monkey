cat > ~/dev/llamune_monkey/README.md << 'EOF'
# 🐒 llamune_monkey

llamune インスタンスのレジストリ・ルーティング・監視サービスです。
llamune_poc・llamune_learn インスタンスを一元管理し、リクエストを最適なインスタンスへルーティングします。

## llamune エコシステムにおける位置づけ
```
llamune_poc (Mac mini #1) ──┐
llamune_poc (Mac mini #2) ──┤
llamune_learn (Mac mini #1) ┼──▶ llamune_monkey ◀── WebSocket ── ブラウザ（監視・poc・learn フロント）
llamune_learn (Mac mini #2) ┘         ▲
                                  クライアント
```

各インスタンスは起動時に自己登録し、定期的にハートビートを送信します。
llamune_monkey はハートビートのタイムアウトで死活を判定し、タイムアウトしたインスタンスを自動削除します。

## 主な機能

- **インスタンスレジストリ** — poc・learn インスタンスの登録・登録解除・状態更新
- **ハートビート受信** — インスタンスからのハートビートで死活監視
- **チャットルーティング** — app_name・version・queue_size に基づき最適な poc へプロキシ
- **汎用プロキシ** — `/api/poc/*` を poc インスタンスへ、`/api/learn/*` を learn インスタンスへプロキシ
- **deny_apps** — 特定アプリへのルーティングを一時停止（訓練中など）
- **ロギング** — ルーティングイベントを JSONL 形式で記録
- **WebSocket 配信** — インスタンス状態の変化をリアルタイムにブロードキャスト

## 技術スタック

| 役割 | 技術 |
|------|------|
| サーバー | Node.js 20+、TypeScript、Express |
| リアルタイム通信 | WebSocket (ws) |

## セットアップ

### 必要環境

- Node.js 20 以上

### インストール
```bash
npm install
```

### 環境変数
```bash
cp .env.example .env
```

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `PORT` | `4000` | サーバーのポート番号 |
| `INTERNAL_TOKEN` | `` | 内部通信用トークン（poc・learn と合わせる） |
| `HEARTBEAT_INTERVAL_MS` | `30000` | ハートビート間隔（ミリ秒）。各インスタンスの `HEARTBEAT_INTERVAL` × 1000 と合わせる |
| `HEARTBEAT_MISS_COUNT` | `3` | この回数分ハートビートが来なければインスタンスを削除 |

## 起動方法

### pm2 で起動（推奨）
```bash
npm run build
pm2 start ecosystem.config.cjs
```

### 開発モード
```bash
npm run dev
```

## API エンドポイント

内部通信用エンドポイントは `X-Internal-Token` ヘッダーによる認証が必要です。

### ヘルスチェック
```
GET /api/health
```

### インスタンス登録
```
POST /api/registry/register
X-Internal-Token: <token>
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
  "queue_size": 2
}
```

### ハートビート
```
PUT /api/registry/:instance_id/heartbeat
X-Internal-Token: <token>
```

### インスタンス一覧
```
GET /api/registry/instances
X-Internal-Token: <token>
```

### チャットルーティング
```
POST /api/chat
Authorization: Bearer <token>
```
```json
{
  "app_name": "p1-m1",
  "session_id": 1,
  "question": "売上原価の計算方法は？"
}
```

### 汎用プロキシ
```
ALL /api/poc/*   → llamune-poc プレフィックスのインスタンスへプロキシ
ALL /api/learn/* → llamune-learn プレフィックスのインスタンスへプロキシ
```

### deny_apps
```
POST   /api/deny-models   # アプリをルーティング停止
DELETE /api/deny-models   # ルーティング停止を解除
GET    /api/deny-models   # 停止中アプリ一覧
```

## WebSocket — リアルタイム状態配信
```
WS /ws/status
```

接続すると全インスタンスのスナップショットを受信し、以降は変化があるたびに自動プッシュされます。

## インスタンスのステータス

### poc インスタンス
| `model_status` | 説明 |
|----------------|------|
| `idle` | 待機中 |
| `loading` | モデルロード中 |
| `inferring` | 推論実行中 |

### learn インスタンス
| `model_status` | 説明 |
|----------------|------|
| `idle` | 待機中 |
| `training` | ファインチューニング実行中 |

## ルーティングロジック

チャットリクエストは以下の順で最適なインスタンスを選択します：

1. `deny_apps` に含まれる `app_name` はルーティング不可
2. `allowed_apps` に `app_name` が含まれる healthy なインスタンスを絞り込み
3. version が最新のものを優先
4. `queue_size` が最小のものを選択

## ライセンス

MIT
