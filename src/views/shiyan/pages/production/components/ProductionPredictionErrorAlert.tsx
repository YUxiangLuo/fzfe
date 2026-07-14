import React from 'react';
import { AlertCircle, RotateCcw, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SelectedBestModel } from '../../../store/experiment/types';
import type { ProductionPredictionError } from '../../../services/modelLifecycle';
import { getBestModelRetrainingPath } from '../../../utils/modelCatalog';

interface ProductionPredictionErrorAlertProps {
  error: ProductionPredictionError;
  selectedBestModel: SelectedBestModel;
  isRetrying: boolean;
  onRetry: () => void | Promise<void>;
}

const ProductionPredictionErrorAlert: React.FC<ProductionPredictionErrorAlertProps> = ({
  error,
  selectedBestModel,
  isRetrying,
  onRetry,
}) => {
  const navigate = useNavigate();
  const title = error.stage === 'prepare' ? '生产模型准备失败' : '需求预测失败';
  const shouldRetrain = error.recoveryAction === 'retrain';

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-red-900">{title}</div>
          <p className="mt-1 text-sm leading-6 text-red-800">{error.message}</p>
          <div className="mt-3">
            {shouldRetrain ? (
              <button
                type="button"
                onClick={() => navigate(getBestModelRetrainingPath(selectedBestModel))}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Wrench className="h-4 w-4" />
                返回对应模型重新训练
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onRetry()}
                disabled={isRetrying}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
                  isRetrying
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <RotateCcw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? '正在重试...' : '重试'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPredictionErrorAlert;
