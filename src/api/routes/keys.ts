/**
 * APIキー管理
 * POST   /api/keys   - APIキーを追加
 * DELETE /api/keys   - APIキーを削除
 * GET    /api/keys   - APIキー一覧を取得
 */

import { Router } from 'express';
import { apiKeys } from '../server.js';

const router = Router();

// 一覧
router.get('/', (_req, res) => {
  res.json({ keys: Array.from(apiKeys) });
});

// 追加
router.post('/', (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'key は必須です' });
    return;
  }
  if (apiKeys.has(key)) {
    res.status(409).json({ error: '既に登録されています' });
    return;
  }
  apiKeys.add(key);
  console.log(`🔑 API key added`);
  res.status(201).json({ message: 'APIキーを追加しました' });
});

// 削除
router.delete('/', (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'key は必須です' });
    return;
  }
  if (!apiKeys.has(key)) {
    res.status(404).json({ error: 'APIキーが見つかりません' });
    return;
  }
  apiKeys.delete(key);
  console.log(`🗑️  API key removed`);
  res.json({ message: 'APIキーを削除しました' });
});

export default router;
