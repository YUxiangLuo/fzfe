import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext.zustand';

const ResultEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState, recordStepEvent } = useExperiment();
  const [selectedBestModel, setSelectedBestModel] = useState<SelectedBestModel | null>(null);
  const hasRecordedStartRef = useRef(false);
  const prevHighestStepRef = useRef(state.highest_completed_step);

  // Sync local selection with global state, especially after a page refresh
  useEffect(() => {
    setSelectedBestModel(state.selected_best_model);
  }, [state.selected_best_model]);

  useEffect(() => {
    if (state.highest_completed_step < prevHighestStepRef.current) {
      hasRecordedStartRef.current = false;
    }
    prevHighestStepRef.current = state.highest_completed_step;

    if (6 > state.highest_completed_step && !hasRecordedStartRef.current) {
      recordStepEvent(6, 'STARTED');
      hasRecordedStartRef.current = true;
    }
  }, [state.highest_completed_step, recordStepEvent]);

  const handleNext = () => {
    if (!selectedBestModel) return;

    if (state.quiz_about_model_completed) {
      navigate('/production');
    } else {
      updateState({
        highest_completed_step: 6,
        current_step: 7,
        selected_best_model: selectedBestModel,
      });
      navigate('/quiz');
    }
  };

  const allModels: Array<{
    id: SelectedBestModel;
    name: string;
    completed: boolean;
    metrics: ModelMetrics;
  }> = [
    { id: 'ma', name: '移动平均法', completed: state.moving_average_completed, metrics: { rmse: state.moving_average_metrics_rmse, mae: state.moving_average_metrics_mae, r2: state.moving_average_metrics_r2 } },
    { id: 'exp', name: '指数平滑法', completed: state.exponential_smoothing_completed, metrics: { rmse: state.exponential_smoothing_metrics_rmse, mae: state.exponential_smoothing_metrics_mae, r2: state.exponential_smoothing_metrics_r2 } },
    { id: 'arima', name: 'ARIMA 法', completed: state.arima_completed, metrics: { rmse: state.arima_metrics_rmse, mae: state.arima_metrics_mae, r2: state.arima_metrics_r2 } },
    { id: 'lstm', name: 'LSTM 法', completed: state.lstm_completed, metrics: { rmse: state.lstm_metrics_rmse, mae: state.lstm_metrics_mae, r2: state.lstm_metrics_r2 } },
    { id: 'ensemble_weighted', name: '加权平均融合模型', completed: state.ensemble_weighted_completed, metrics: { rmse: state.ensemble_weighted_metrics_rmse, mae: state.ensemble_weighted_metrics_mae, r2: state.ensemble_weighted_metrics_r2 } },
    { id: 'ensemble_boosting', name: 'Boosting 融合模型', completed: state.ensemble_boosting_completed, metrics: { rmse: state.ensemble_boosting_metrics_rmse, mae: state.ensemble_boosting_metrics_mae, r2: state.ensemble_boosting_metrics_r2 } },
    { id: 'ensemble_stacking', name: 'Stacking 融合模型', completed: state.ensemble_stacking_completed, metrics: { rmse: state.ensemble_stacking_metrics_rmse, mae: state.ensemble_stacking_metrics_mae, r2: state.ensemble_stacking_metrics_r2 } },
  ];

  return (
    <div className="bg-gray-50 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Optimization Criteria */}
          <div className="bg-white rounded-xl border-2 border-gray-300 p-8 min-h-[600px] flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">最优准则</h2>

            <div className="space-y-8 text-base text-gray-700 leading-loose flex-1 flex flex-col justify-center">
              <p className="pl-8">
                <span className="font-semibold">1.主要关注 RMSE 和 MAE：</span>
                RMSE（均方根误差）：反映模型对较大误差的敏感度，适用于评估模型在大偏差情况下的表现；MAE（平均绝对误差）：提供平均误差水平，适用于评估模型的整体稳定性和准确性。
              </p>

              <p className="pl-8">
                <span className="font-semibold">2.比较模型的 RMSE 和 MAE 值：</span>
                选择 RMSE 和 MAE 值较低的模型，这意味着模型在整体和局部都具有良好的预测性能。
              </p>

              <p className="pl-8">
                <span className="font-semibold">3.使用 R²作为辅助指标：</span>
                当多个模型的 RMSE 和 MAE 相近时，选择 R²值更接近 1 的模型，以确保模型对数据的拟合程度更好。
              </p>

              <p className="pl-8">
                <span className="font-semibold">4.综合评估，选出最优模型：</span>
                优先选择在 RMSE、MAE 和 R²上均表现优秀的模型，确保模型在准确性和稳健性方面都有良好表现。
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-xl border-2 border-gray-300 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">评价结果对比</h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-3 px-4 text-left font-semibold text-gray-900">评价指标</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900">移动平均</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900">指数平滑</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900">ARIMA法</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900">LSTM法</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900">加权平均</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900">Boosting</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-900">Stacking</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4 font-semibold text-gray-900">RMSE</td>
                    {allModels.map((model) => (
                      <td key={`rmse-${model.id}`} className="py-3 px-4 text-center text-gray-700">
                        {model.completed ? (model.metrics.rmse?.toFixed(2) ?? '—') : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4 font-semibold text-gray-900">MAE</td>
                    {allModels.map((model) => (
                      <td key={`mae-${model.id}`} className="py-3 px-4 text-center text-gray-700">
                        {model.completed ? (model.metrics.mae?.toFixed(2) ?? '—') : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-gray-900">R²</td>
                    {allModels.map((model) => (
                      <td key={`r2-${model.id}`} className="py-3 px-4 text-center text-gray-700">
                        {model.completed ? (model.metrics.r2?.toFixed(4) ?? '—') : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border-2 border-gray-300 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              请根据最优准则及评估结果对比，勾选出最佳方法:
            </h2>

            <div className="space-y-3">
              {allModels.map((model) => {
                const isSelected = selectedBestModel === model.id;
                const isDisabled = !model.completed;

                return (
                  <div key={model.id}>
                    <label
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                        isDisabled
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-300 hover:border-blue-300 cursor-pointer'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isDisabled
                          ? 'border-gray-300 bg-gray-100'
                          : isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-400 bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="radio"
                        name="bestModel"
                        value={model.id}
                        checked={isSelected}
                        onChange={() => !isDisabled && setSelectedBestModel(model.id)}
                        disabled={isDisabled}
                        className="sr-only"
                      />
                      <span className={`text-lg ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                        {model.name}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-center">
            <button
              onClick={handleNext}
              disabled={!selectedBestModel}
              className={`w-full py-4 rounded-lg text-lg font-semibold transition-all ${
                selectedBestModel
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              下一步
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultEvaluation;
