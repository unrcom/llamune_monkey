/**
 * deny_apps 管理
 * POST   /api/deny-models   - アプリをルーティング拒否リストに追加
 * DELETE /api/deny-models   - アプリをルーティング拒否リストから削除
 * GET    /api/deny-models   - 現在の拒否リストを取得
 */

import { Router } from 'express';

const router = Router();

export const denyApps = new Set<string>();

// 一覧
router.get('/', (_req, res) => {
  res.json({ deny_apps: Array.from(denyApps) });
});

// 追加
router.post('/', (req, res) => {
  const { app_name } = req.body;
  if (!app_name || typeof app_name !== 'string') {
    res.status(400).json({ error: 'app_name は必須です' });
    return;
  }
  if (denyApps.has(app_name)) {
    res.status(409).json({ error: '既に拒否リストに登録されています' });
    return;
  }
  denyApps.add(app_name);
  console.log(`🚫 deny_apps: ${app_name} を追加`);
  res.status(201).json({ message: `${app_name} をルーティング拒否リストに追加しました` });
});

// 削除
router.delete('/', (req, res) => {
  const { app_name } = req.body;
  if (!app_name || typeof app_name !== 'string') {
    res.status(400).json({ error: 'app_name は必須です' });
    return;
  }
  if (!denyApps.has(app_name)) {
    res.status(404).json({ error: '拒否リストにありません' });
    return;
  }
  denyApps.delete(app_name);
  console.log(`✅ deny_apps: ${app_name} を削除`);
  res.json({ message: `${app_name} をルーティング拒否リストから削除しました` });
});

export default router;
