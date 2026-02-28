import type { InstanceInfo, ModelStatus } from '../types';

const statusConfig: Record<ModelStatus, { label: string; color: string }> = {
  idle:      { label: 'アイドル',   color: 'bg-green-100 text-green-800' },
  loading:   { label: 'ロード中',   color: 'bg-yellow-100 text-yellow-800' },
  inferring: { label: '推論中',     color: 'bg-blue-100 text-blue-800' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ja-JP');
}

interface Props {
  instance: InstanceInfo;
}

export function InstanceCard({ instance }: Props) {
  const status = statusConfig[instance.model_status];

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${instance.healthy ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'}`}>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{instance.instance_id}</h2>
          <p className="text-sm text-gray-500">{instance.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${instance.healthy ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
            {instance.healthy ? '✓ 正常' : '✗ 応答なし'}
          </span>
        </div>
      </div>

      {/* モデル */}
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-1">モデル</p>
        <p className="text-sm text-gray-700 font-mono">
          {instance.current_model ?? '未ロード'}
        </p>
      </div>

      {/* キュー */}
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-1">キュー</p>
        <p className="text-sm text-gray-700">{instance.queue_size} 件待機中</p>
      </div>

      {/* 推論中リクエスト */}
      {instance.active_request && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-400 mb-1">処理中のリクエスト</p>
          <p className="text-sm text-blue-800">
            セッション #{instance.active_request.session_id}
          </p>
          <p className="text-sm text-blue-700 mt-1 truncate">
            「{instance.active_request.question_preview}」
          </p>
          <p className="text-xs text-blue-400 mt-1">
            開始: {formatTime(instance.active_request.started_at)}
          </p>
        </div>
      )}

      {/* フッター */}
      <div className="flex justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
        <span>登録: {formatTime(instance.registered_at)}</span>
        <span>最終確認: {formatTime(instance.last_seen_at)}</span>
      </div>
    </div>
  );
}
