/**
 * レジストリ API
 * POST   /api/registry/register          - インスタンス登録
 * DELETE /api/registry/:instance_id      - インスタンス登録解除
 * PATCH  /api/registry/:instance_id      - 状態更新
 * GET    /api/registry/instances         - インスタンス一覧
 */

import { Router } from 'express';
import { registry } from '../../registry.js';

const router = Router();

// 登録
router.post('/register', (req, res) => {
  const { instance_id, url, description, allowed_models } = req.body;
  if (!instance_id || !url) {
    res.status(400).json({ error: 'instance_id と url は必須です' });
    return;
  }
  const instance = registry.register({ instance_id, url, description, allowed_models });
  console.log(`✅ Registered: ${instance_id} (${url})`);
  res.status(201).json(instance);
});

// 登録解除
router.delete('/:instance_id', (req, res) => {
  const { instance_id } = req.params;
  const deleted = registry.unregister(instance_id);
  if (!deleted) {
    res.status(404).json({ error: 'インスタンスが見つかりません' });
    return;
  }
  console.log(`🗑️  Unregistered: ${instance_id}`);
  res.json({ message: `${instance_id} の登録を解除しました` });
});

// 状態更新
router.patch('/:instance_id', (req, res) => {
  const { instance_id } = req.params;
  const { model_status, current_model, queue_size, active_request, allowed_models } = req.body;
  const updated = registry.updateStatus(instance_id, {
    model_status,
    current_model,
    queue_size,
    active_request,
    allowed_models,
  });
  if (!updated) {
    res.status(404).json({ error: 'インスタンスが見つかりません' });
    return;
  }
  res.json(registry.get(instance_id));
});

// 一覧
router.get('/instances', (_req, res) => {
  res.json(registry.getAll());
});

export default router;
