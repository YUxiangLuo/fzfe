import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext';
import { TrendingUp, Award, CheckCircle, Star, BookOpenCheck } from 'lucide-react';

type SortKey = 'rmse' | 'mae' | 'r2';
type SortDirection = 'asc' | 'desc';

const ResultEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState, recordStepEvent } = useExperiment();
  const [selectedBestModel, setSelectedBestModel] = useState<SelectedBestModel | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'r2', direction: 'desc' });
  const [isSorting, setIsSorting] = useState(false); // For animation
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

  const completedModels = useMemo(() => {
    const entries: Array<{
      id: SelectedBestModel;
      name: string;
      completed: boolean;
      metrics: ModelMetrics;
    }> = [
      { id: 'ma', name: '移动平均法', completed: state.moving_average_completed, metrics: { rmse: state.moving_average_metrics_rmse, mae: state.moving_average_metrics_mae, r2: state.moving_average_metrics_r2 } },
      { id: 'exp', name: '指数平滑法', completed: state.exponential_smoothing_completed, metrics: { rmse: state.exponential_smoothing_metrics_rmse, mae: state.exponential_smoothing_metrics_mae, r2: state.exponential_smoothing_metrics_r2 } },
      { id: 'arima', name: 'ARIMA模型', completed: state.arima_completed, metrics: { rmse: state.arima_metrics_rmse, mae: state.arima_metrics_mae, r2: state.arima_metrics_r2 } },
      { id: 'lstm', name: 'LSTM神经网络', completed: state.lstm_completed, metrics: { rmse: state.lstm_metrics_rmse, mae: state.lstm_metrics_mae, r2: state.lstm_metrics_r2 } },
      { id: 'ensemble_weighted', name: '加权平均融合', completed: state.ensemble_weighted_completed, metrics: { rmse: state.ensemble_weighted_metrics_rmse, mae: state.ensemble_weighted_metrics_mae, r2: state.ensemble_weighted_metrics_r2 } },
      { id: 'ensemble_boosting', name: 'Boosting融合', completed: state.ensemble_boosting_completed, metrics: { rmse: state.ensemble_boosting_metrics_rmse, mae: state.ensemble_boosting_metrics_mae, r2: state.ensemble_boosting_metrics_r2 } },
      { id: 'ensemble_stacking', name: 'Stacking融合', completed: state.ensemble_stacking_completed, metrics: { rmse: state.ensemble_stacking_metrics_rmse, mae: state.ensemble_stacking_metrics_mae, r2: state.ensemble_stacking_metrics_r2 } },
    ];
    return entries.filter((item) => item.completed);
  }, [state]);

  const sortedModels = useMemo(() => {
    const sortableModels = [...completedModels];
    sortableModels.sort((a, b) => {
      const key = sortConfig.key;
      const aValue = a.metrics[key];
      const bValue = b.metrics[key];

      // Handle nulls: push them to the bottom
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // R² should be descending, others ascending
      const directionModifier = sortConfig.direction === 'desc' ? -1 : 1;
      return (aValue - bValue) * directionModifier;
    });
    return sortableModels;
  }, [completedModels, sortConfig]);

  const handleSortChange = (value: string) => {
    const [key, direction] = value.split('-') as [SortKey, SortDirection];
    
    setIsSorting(true);
    setSortConfig({ key, direction });

    setTimeout(() => {
      setIsSorting(false);
    }, 200); // Duration of the flash animation
  };

  const sortOptions = [
    { value: 'r2-desc', label: '按 R² 排序 (从高到低)' },
    { value: 'rmse-asc', label: '按 RMSE 排序 (从低到高)' },
    { value: 'mae-asc', label: '按 MAE 排序 (从低到高)' },
  ];

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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">模型性能对比</h2>
              <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                <span className="text-sm font-medium text-gray-600">排序方式:</span>
                <div className="flex items-center space-x-2 rounded-lg bg-gray-100 p-1">
                  {sortOptions.map(opt => {
                    const isActive = sortConfig.key === opt.value.split('-')[0] && sortConfig.direction === opt.value.split('-')[1];
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleSortChange(opt.value)}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                          isActive
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className={`transition-opacity duration-200 ${isSorting ? 'opacity-25' : 'opacity-100'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-3 font-semibold">模型</th>
                      <th className="p-3 font-semibold">RMSE (越低越好)</th>
                      <th className="p-3 font-semibold">MAE (越低越好)</th>
                      <th className="p-3 font-semibold">R² (越高越好)</th>
                      <th className="p-3 font-semibold text-center">选择</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedModels.map((model) => {
                      const isSelected = selectedBestModel === model.id;
                      const isBestRmse = model.metrics.rmse !== null && model.metrics.rmse === Math.min(...completedModels.map(m => m.metrics.rmse).filter(v => v !== null) as number[]);
                      const isBestMae = model.metrics.mae !== null && model.metrics.mae === Math.min(...completedModels.map(m => m.metrics.mae).filter(v => v !== null) as number[]);
                      const isBestR2 = model.metrics.r2 !== null && model.metrics.r2 === Math.max(...completedModels.map(m => m.metrics.r2).filter(v => v !== null) as number[]);
                      
                      return (
                        <tr key={model.id} className={`border-b ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="p-3 font-semibold text-gray-800">{model.name}</td>
                          <td className={`p-3 ${isBestRmse ? 'font-bold text-green-600' : ''}`}>{model.metrics.rmse?.toFixed(4) ?? '—'}</td>
                          <td className={`p-3 ${isBestMae ? 'font-bold text-green-600' : ''}`}>{model.metrics.mae?.toFixed(4) ?? '—'}</td>
                          <td className={`p-3 ${isBestR2 ? 'font-bold text-green-600' : ''}`}>{model.metrics.r2?.toFixed(4) ?? '—'}</td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => setSelectedBestModel(model.id)}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                            >
                              {isSelected ? '已选定' : '选择'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedBestModel && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center justify-center space-x-3">
              <Star className="w-6 h-6 text-yellow-500" />
              <h4 className="font-semibold text-green-800 text-lg">
                您已选择 <span className="font-bold">"{completedModels.find(m => m.id === selectedBestModel)?.name}"</span> 作为最佳模型。
              </h4>
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
