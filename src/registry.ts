/**
 * インスタンスレジストリ
 * 各 llamune インスタンスの登録・管理・死活監視を担う
 */

export type ModelStatus = 'idle' | 'loading' | 'inferring';

export interface AllowedApp {
  app_name: string;
  version: number;
}

export interface InstanceInfo {
  instance_id: string;
  url: string;
  description: string;
  model_status: ModelStatus;
  current_model: string | null;
  queue_size: number;
  active_request: {
    session_id: number;
    question_preview: string;
    started_at: string;
  } | null;
  registered_at: string;
  last_seen_at: string;
  healthy: boolean;
  unhealthy_since: string | null;
  allowed_apps: AllowedApp[];
}

type ChangeListener = (instances: InstanceInfo[]) => void;

class Registry {
  private instances = new Map<string, InstanceInfo>();
  private listeners: ChangeListener[] = [];

  register(data: {
    instance_id: string;
    url: string;
    description?: string;
    allowed_apps?: AllowedApp[];
  }): InstanceInfo {
    const now = new Date().toISOString();
    const existing = this.instances.get(data.instance_id);
    const instance: InstanceInfo = {
      instance_id: data.instance_id,
      url: data.url,
      description: data.description ?? data.instance_id,
      model_status: existing?.model_status ?? 'idle',
      current_model: existing?.current_model ?? null,
      queue_size: existing?.queue_size ?? 0,
      active_request: existing?.active_request ?? null,
      registered_at: existing?.registered_at ?? now,
      last_seen_at: now,
      healthy: true,
      unhealthy_since: null,
      allowed_apps: data.allowed_apps ?? existing?.allowed_apps ?? [],
    };
    this.instances.set(data.instance_id, instance);
    this.notify();
    return instance;
  }

  unregister(instance_id: string): boolean {
    const deleted = this.instances.delete(instance_id);
    if (deleted) this.notify();
    return deleted;
  }

  updateStatus(
    instance_id: string,
    status: Partial<Pick<InstanceInfo, 'model_status' | 'current_model' | 'queue_size' | 'active_request' | 'allowed_apps'>>
  ): boolean {
    const instance = this.instances.get(instance_id);
    if (!instance) return false;
    Object.assign(instance, status, { last_seen_at: new Date().toISOString() });
    this.notify();
    return true;
  }

  markUnhealthy(instance_id: string) {
    const instance = this.instances.get(instance_id);
    if (instance && instance.healthy) {
      instance.healthy = false;
      instance.unhealthy_since = new Date().toISOString();
      this.notify();
    }
  }

  markHealthy(instance_id: string) {
    const instance = this.instances.get(instance_id);
    if (!instance) return;
    instance.healthy = true;
    instance.unhealthy_since = null;
    instance.last_seen_at = new Date().toISOString();
    this.notify();
  }

  autoRemoveUnhealthy(thresholdMs: number): void {
    const now = Date.now();
    for (const instance of this.instances.values()) {
      if (
        !instance.healthy &&
        instance.unhealthy_since !== null &&
        now - new Date(instance.unhealthy_since).getTime() >= thresholdMs
      ) {
        console.log(`🗑️  Auto-removing unhealthy instance: ${instance.instance_id}`);
        this.instances.delete(instance.instance_id);
        this.notify();
      }
    }
  }

  getAll(): InstanceInfo[] {
    return Array.from(this.instances.values());
  }

  get(instance_id: string): InstanceInfo | undefined {
    return this.instances.get(instance_id);
  }

  subscribe(listener: ChangeListener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: ChangeListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notify() {
    const snapshot = this.getAll();
    this.listeners.forEach(l => l(snapshot));
  }
}

export const registry = new Registry();
