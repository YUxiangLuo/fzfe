import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext.zustand';
import { toastEventBus } from '../utils/toastEventBus';
import { useStepStartRecorder } from '../hooks/useStepStartRecorder';
import { ROUTES } from '../constants/routes';
import { STEPS } from '../constants/steps';

const ResultEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const { state, ui, handleBestModelChange, recordStepEvent } = useExperiment();
  const [selectedBestModel, setSelectedBestModel] = useState<SelectedBestModel | null>(null);
  useStepStartRecorder(6, state.highest_completed_step, recordStepEvent);

  // Sync local selection with global state, especially after a page refresh
  useEffect(() => {
    setSelectedBestModel(state.selected_best_model);
  }, [state.selected_best_model]);

  const handleNext = async () => {
    if (!selectedBestModel) return;

    const hasChanged = selectedBestModel !== state.selected_best_model;
    const needsProgressUpdate = hasChanged || state.current_step < STEPS.PRODUCTION;

    if (needsProgressUpdate) {
      try {
        await handleBestModelChange(selectedBestModel);
      } catch (error) {
        console.error('保存所选模型失败:', error);
        toastEventBus.error('保存所选模型失败，请稍后重试');
        return;
      }
    }

    navigate(ROUTES.QUIZ_MODEL);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">方案选择准则</h2>

            <div className="space-y-8 text-base text-gray-700 leading-loose flex-1 flex flex-col justify-center">
              <p className="pl-8">
                <span className="font-semibold">1.主要关注 RMSE 和 MAE：</span>
                RMSE（均方根误差）会对较大误差给予更高惩罚；MAE（平均绝对误差）表示绝对误差的平均大小。两者量纲都与销量一致。
              </p>

              <p className="pl-8">
                <span className="font-semibold">2.比较模型的 RMSE 和 MAE 值：</span>
                只有目标、量纲和评估区间相同时才可直接比较；数值较低表示当前独立评估区间的误差较低，不保证未来仍保持同一排名。
              </p>

              <p className="pl-8">
                <span className="font-semibold">3.使用 R²作为辅助指标：</span>
                R²最高为1且越高通常越好，也可能为负。它反映模型相对评估集均值基准的表现，应与RMSE、MAE一起解释，不能单独保证预测可靠。
              </p>

              <p className="pl-8">
                <span className="font-semibold">4.综合评估，选择当前方案：</span>
                结合当前独立评估误差、不确定性质量、模型复杂度和业务可解释性，选择更适合当前数据与决策任务的模型，而不是寻找对所有场景都通用的“最佳模型”。
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
              请根据方案选择准则及评估结果，勾选更适合当前实验数据的方法：
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
              disabled={!selectedBestModel || ui.isSubmitting}
              className={`w-full py-4 rounded-lg text-lg font-semibold transition-all ${
                selectedBestModel && !ui.isSubmitting
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {ui.isSubmitting ? '处理中...' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultEvaluation;
