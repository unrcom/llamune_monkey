import { useMonkey } from './hooks/useMonkey';
import { InstanceCard } from './components/InstanceCard';

export default function App() {
  const { instances, connected } = useMonkey();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐒</span>
            <h1 className="text-xl font-bold text-gray-900">llamune_monkey</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {connected ? 'WebSocket 接続中' : 'WebSocket 切断'}
            </span>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* サマリー */}
        <div className="flex gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-400">インスタンス数</p>
            <p className="text-2xl font-bold text-gray-900">{instances.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-400">正常</p>
            <p className="text-2xl font-bold text-green-600">
              {instances.filter(i => i.healthy).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-400">異常</p>
            <p className="text-2xl font-bold text-red-500">
              {instances.filter(i => !i.healthy).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-400">推論中</p>
            <p className="text-2xl font-bold text-blue-600">
              {instances.filter(i => i.model_status === 'inferring').length}
            </p>
          </div>
        </div>

        {/* インスタンス一覧 */}
        {instances.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">🐒</p>
            <p className="text-lg">登録済みのインスタンスがありません</p>
            <p className="text-sm mt-2">llamune_poc を起動すると自動的に表示されます</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map(instance => (
              <InstanceCard key={instance.instance_id} instance={instance} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
