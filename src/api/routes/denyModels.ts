/**
 * deny_models 管理
 * POST   /api/deny_models   - モデルをルーティング拒否リストに追加
 * DELETE /api/deny_models   - モデルをルーティング拒否リストから削除
 * GET    /api/deny_models   - 現在の拒否リストを取得
 */

import { Router } from 'express';

const router = Router();

// モデル名のセット（全バージョン一括で管理）
export const denyModels = new Set<string>();

// 一覧
router.get('/', (_req, res) => {
  res.json({ deny_models: Array.from(denyModels) });
});

// 追加
router.post('/', (req, res) => {
  const { model_name } = req.body;
  if (!model_name || typeof model_name !== 'string') {
    res.status(400).json({ error: 'model_name は必須です' });
    return;
  }
  if (denyModels.has(model_name)) {
    res.status(409).json({ error: '既に拒否リストに登録されています' });
    return;
  }
  denyModels.add(model_name);
  console.log(`🚫 deny_models: ${model_name} を追加`);
  res.status(201).json({ message: `${model_name} をルーティング拒否リストに追加しました` });
});

// 削除
router.delete('/', (req, res) => {
  const { model_name } = req.body;
  if (!model_name || typeof model_name !== 'string') {
    res.status(400).json({ error: 'model_name は必須です' });
    return;
  }
  if (!denyModels.has(model_name)) {
    res.status(404).json({ error: '拒否リストにありません' });
    return;
  }
  denyModels.delete(model_name);
  console.log(`✅ deny_models: ${model_name} を削除`);
  res.json({ message: `${model_name} をルーティング拒否リストから削除しました` });
});

export default router;
