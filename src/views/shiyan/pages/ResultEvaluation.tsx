import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext';
import { TrendingUp, Award, CheckCircle, Star, BookOpenCheck } from 'lucide-react';

const ResultEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  const [selectedBestModel, setSelectedBestModel] = useState<SelectedBestModel | null>(state.selected_best_model);

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

  const completedModels = useMemo(() => {
    const entries: Array<{
      id: SelectedBestModel;
      name: string;
      completed: boolean;
      metrics: ModelMetrics;
    }> = [
      {
        id: 'ma',
        name: '移动平均法',
        completed: state.moving_average_completed,
        metrics: {
          rmse: state.moving_average_metrics_rmse,
          mae: state.moving_average_metrics_mae,
          r2: state.moving_average_metrics_r2,
        },
      },
      {
        id: 'exp',
        name: '指数平滑法',
        completed: state.exponential_smoothing_completed,
        metrics: {
          rmse: state.exponential_smoothing_metrics_rmse,
          mae: state.exponential_smoothing_metrics_mae,
          r2: state.exponential_smoothing_metrics_r2,
        },
      },
      {
        id: 'arima',
        name: 'ARIMA模型',
        completed: state.arima_completed,
        metrics: {
          rmse: state.arima_metrics_rmse,
          mae: state.arima_metrics_mae,
          r2: state.arima_metrics_r2,
        },
      },
      {
        id: 'lstm',
        name: 'LSTM神经网络',
        completed: state.lstm_completed,
        metrics: {
          rmse: state.lstm_metrics_rmse,
          mae: state.lstm_metrics_mae,
          r2: state.lstm_metrics_r2,
        },
      },
      {
        id: 'ensemble_weighted',
        name: '加权平均融合',
        completed: state.ensemble_weighted_completed,
        metrics: {
          rmse: state.ensemble_weighted_metrics_rmse,
          mae: state.ensemble_weighted_metrics_mae,
          r2: state.ensemble_weighted_metrics_r2,
        },
      },
      {
        id: 'ensemble_boosting',
        name: 'Boosting融合',
        completed: state.ensemble_boosting_completed,
        metrics: {
          rmse: state.ensemble_boosting_metrics_rmse,
          mae: state.ensemble_boosting_metrics_mae,
          r2: state.ensemble_boosting_metrics_r2,
        },
      },
      {
        id: 'ensemble_stacking',
        name: 'Stacking融合',
        completed: state.ensemble_stacking_completed,
        metrics: {
          rmse: state.ensemble_stacking_metrics_rmse,
          mae: state.ensemble_stacking_metrics_mae,
          r2: state.ensemble_stacking_metrics_r2,
        },
      },
    ];

    return entries.filter((item) => item.completed);
  }, [
    state.moving_average_completed,
    state.moving_average_metrics_rmse,
    state.moving_average_metrics_mae,
    state.moving_average_metrics_r2,
    state.exponential_smoothing_completed,
    state.exponential_smoothing_metrics_rmse,
    state.exponential_smoothing_metrics_mae,
    state.exponential_smoothing_metrics_r2,
    state.arima_completed,
    state.arima_metrics_rmse,
    state.arima_metrics_mae,
    state.arima_metrics_r2,
    state.lstm_completed,
    state.lstm_metrics_rmse,
    state.lstm_metrics_mae,
    state.lstm_metrics_r2,
    state.ensemble_weighted_completed,
    state.ensemble_weighted_metrics_rmse,
    state.ensemble_weighted_metrics_mae,
    state.ensemble_weighted_metrics_r2,
    state.ensemble_boosting_completed,
    state.ensemble_boosting_metrics_rmse,
    state.ensemble_boosting_metrics_mae,
    state.ensemble_boosting_metrics_r2,
    state.ensemble_stacking_completed,
    state.ensemble_stacking_metrics_rmse,
    state.ensemble_stacking_metrics_mae,
    state.ensemble_stacking_metrics_r2,
  ]);

  const sortedModels = useMemo(
    () =>
      [...completedModels].sort((a, b) => {
        const aScore = a.metrics.rmse ?? Number.POSITIVE_INFINITY;
        const bScore = b.metrics.rmse ?? Number.POSITIVE_INFINITY;
        return aScore - bScore;
      }),
    [completedModels],
  );

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 6: 评估并选择最优模型</h1>
          <p className="text-lg text-gray-600">
            分析所有已完成模型的效果，选择您认为最合适的模型进入下一步的生产计划制定。
          </p>
        </div>

        <div className="space-y-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">模型性能对比</h2>
            <div className="space-y-4">
              {completedModels.length > 0 ? completedModels.map(model => {
                const isSelected = selectedBestModel === model.id;
                return (
                  <div 
                    key={model.id} 
                    onClick={() => setSelectedBestModel(model.id)}
                    className={`p-4 bg-gray-50 border-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">{model.name}</h3>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                <p className="text-gray-600">RMSE</p>
                                <p className="font-bold text-blue-800">{model.metrics.rmse ?? '—'}</p>
                                </div>
                                <div>
                                <p className="text-gray-600">R²</p>
                                <p className="font-bold text-blue-800">{model.metrics.r2 ?? '—'}</p>
                                </div>
                                <div>
                                <p className="text-gray-600">MAE</p>
                                <p className="font-bold text-blue-800">{model.metrics.mae ?? '—'}</p>
                                </div>
                            </div>
                        </div>
                        {isSelected && (
                            <div className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                                <Star className="w-4 h-4" />
                                <span>最佳模型</span>
                            </div>
                        )}
                    </div>
                  </div>
                )
              }) : <p className="text-gray-500">暂无已完成的模型结果。</p>}
            </div>
          </div>

          {sortedModels.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h4 className="font-semibold text-green-800 mb-3">🏆 模型性能排名 (按RMSE排序)</h4>
              <ol className="space-y-2 text-sm text-green-700">
                {sortedModels.map((model, index) => (
                  <li key={model.id} className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                    <span>
                      {model.name}
                      {model.metrics.rmse !== null && (
                        <span className="ml-2 text-green-600 font-semibold">RMSE: {model.metrics.rmse}</span>
                      )}
                    </span>
                    {index === 0 && <Award className="w-5 h-5 text-yellow-500" />}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/model')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
          <button
            onClick={handleNext}
            disabled={!selectedBestModel}
            className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {state.quiz_about_model_completed ? (
              <>
                <span>下一步：制定生产计划</span>
                <CheckCircle className="w-5 h-5" />
              </>
            ) : (
              <>
                <span>选定最佳模型，进入测验</span>
                <BookOpenCheck className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultEvaluation;
