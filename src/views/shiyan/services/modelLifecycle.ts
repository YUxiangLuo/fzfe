import { apiClient } from '@/utils/apiClient';
import type { SelectedBestModel } from '../store/experiment/types';
import { BEST_MODEL_TO_BACKEND_MODEL_TYPE } from '../utils/modelCatalog';

export interface ModelPredictionPoint {
  prediction: number;
  std_dev: number;
}

interface ModelPredictionResponse {
  status: string;
  results: {
    predictions: ModelPredictionPoint[];
  };
}

const getBackendModelType = (selectedBestModel: SelectedBestModel): string => {
  const modelType = BEST_MODEL_TO_BACKEND_MODEL_TYPE[selectedBestModel];
  if (!modelType) {
    throw new Error(`无效的模型类型: ${selectedBestModel}`);
  }
  return modelType;
};

export const prepareBestModelForProduction = async (
  selectedBestModel: SelectedBestModel,
  experimentId: number,
): Promise<void> => {
  const modelType = getBackendModelType(selectedBestModel);
  await apiClient.post(`/models/${modelType}/prepare-production`, {
    experiment_id: experimentId,
  });
};

export const predictWithBestModel = async (
  selectedBestModel: SelectedBestModel,
  experimentId: number,
  forecastSteps: number,
): Promise<ModelPredictionResponse> => {
  await prepareBestModelForProduction(selectedBestModel, experimentId);

  const modelType = getBackendModelType(selectedBestModel);
  return await apiClient.post<ModelPredictionResponse>(`/models/${modelType}/predict`, {
    experiment_id: experimentId,
    forecast_steps: forecastSteps,
  });
};
