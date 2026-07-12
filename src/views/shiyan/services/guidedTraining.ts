import { apiClient } from '@/utils/apiClient';

export type GuidedModelType = 'ma' | 'es' | 'arima' | 'lstm' | 'weighted_avg' | 'stacking' | 'boosting';
export type GuidedTrainingStatus = 'ready' | 'running' | 'failed' | 'completed';
export type GuidedStepStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface GuidedTrainingStep {
  id: string;
  label: string;
  description: string;
  actionLabel: string;
  status: GuidedStepStatus;
  output?: unknown;
}

export interface GuidedTrainingSession {
  session_id: string;
  experiment_id: number;
  model_type: GuidedModelType;
  status: GuidedTrainingStatus;
  current_step_id: string | null;
  next_step_id: string | null;
  steps: GuidedTrainingStep[];
  step_outputs: Record<string, unknown>;
  result: {
    status: string;
    results: Record<string, any>;
    inferred_feature_types?: unknown;
  } | null;
  error_message: string | null;
  backtest_artifact_changed?: boolean;
  artifact_revision: string | null;
  experiment_state_version: number | null;
}

const guidedBasePath = (modelType: GuidedModelType) =>
  `/models/${modelType}/guided-training/sessions`;

export const createGuidedTrainingSession = async (
  modelType: GuidedModelType,
  body: Record<string, any>,
) => {
  return apiClient.post<GuidedTrainingSession>(guidedBasePath(modelType), body);
};

export const fetchGuidedTrainingSession = async (
  modelType: GuidedModelType,
  sessionId: string,
) => {
  return apiClient.get<GuidedTrainingSession>(`${guidedBasePath(modelType)}/${sessionId}`);
};

export const activateGuidedTrainingSession = async (
  modelType: GuidedModelType,
  sessionId: string,
) => {
  return apiClient.post<GuidedTrainingSession>(
    `${guidedBasePath(modelType)}/${sessionId}/activate`,
    {},
  );
};

export const runGuidedTrainingStep = async (
  modelType: GuidedModelType,
  sessionId: string,
  stepId: string,
) => {
  return apiClient.post<GuidedTrainingSession>(
    `${guidedBasePath(modelType)}/${sessionId}/steps/${stepId}/run`,
    {},
    {
      timeoutMs: null,
    },
  );
};

export const completeGuidedModel = async (
  modelType: GuidedModelType,
  experimentId: number,
  artifactRevision: string,
) => {
  return apiClient.post<{
    status: string;
    artifact_revision: string;
    experiment_state_version: number;
  }>(
    `/models/${modelType}/complete`,
    {
      experiment_id: experimentId,
      artifact_revision: artifactRevision,
    },
  );
};
