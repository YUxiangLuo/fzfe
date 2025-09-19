import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { TrendingUp, Award, CheckCircle, Star } from 'lucide-react';

const ResultEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  const [selectedBestModel, setSelectedBestModel] = useState<string | null>(state.best_model);

  const handleNext = () => {
    if (selectedBestModel) {
      updateState({ 
          highest_completed_step: 6,
          current_step: 7,
          best_model: selectedBestModel,
      });
      navigate('/production');
    }
  };

  const completedModels = useMemo(() => {
    const entries = [
      {
        id: 'moving_average',
        name: '移动平均法',
        completed: state.movingAverage.completed,
        metrics: state.movingAverage.metrics,
      },
      {
        id: 'exponential_smoothing',
        name: '指数平滑法',
        completed: state.exponentialSmoothing.completed,
        metrics: state.exponentialSmoothing.metrics,
      },
      {
        id: 'arima',
        name: 'ARIMA模型',
        completed: state.arima.completed,
        metrics: state.arima.metrics,
      },
      {
        id: 'lstm',
        name: 'LSTM神经网络',
        completed: state.lstm.completed,
        metrics: state.lstm.metrics,
      },
      {
        id: 'weighted_ensemble',
        name: '加权平均融合',
        completed: state.ensembleWeighted.completed,
        metrics: state.ensembleWeighted.metrics,
      },
      {
        id: 'boosting_ensemble',
        name: 'Boosting融合',
        completed: state.ensembleBoosting.completed,
        metrics: state.ensembleBoosting.metrics,
      },
      {
        id: 'stacking_ensemble',
        name: 'Stacking融合',
        completed: state.ensembleStacking.completed,
        metrics: state.ensembleStacking.metrics,
      },
    ];

    return entries.filter((item) => item.completed);
  }, [
    state.movingAverage.completed,
    state.movingAverage.metrics,
    state.exponentialSmoothing.completed,
    state.exponentialSmoothing.metrics,
    state.arima.completed,
    state.arima.metrics,
    state.lstm.completed,
    state.lstm.metrics,
    state.ensembleWeighted.completed,
    state.ensembleWeighted.metrics,
    state.ensembleBoosting.completed,
    state.ensembleBoosting.metrics,
    state.ensembleStacking.completed,
    state.ensembleStacking.metrics,
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
            <span>下一步：制定生产计划</span>
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultEvaluation;
