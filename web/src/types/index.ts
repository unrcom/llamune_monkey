export type ModelStatus = 'idle' | 'loading' | 'inferring';

export type ActiveRequest = {
  session_id: number;
  question_preview: string;
  started_at: string;
};

export type InstanceInfo = {
  instance_id: string;
  url: string;
  description: string;
  model_status: ModelStatus;
  current_model: string | null;
  queue_size: number;
  active_request: ActiveRequest | null;
  registered_at: string;
  last_seen_at: string;
  healthy: boolean;
};
