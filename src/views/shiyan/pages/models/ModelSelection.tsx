import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import {
  LineChart,
  ChartSpline,
  Sigma,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PartyPopper,
} from 'lucide-react';

// Full model list to get details from
const allModels = [
  { id: 'moving_average', name: '移动平均法', description: '最近窗口均值的递推多步基准。', icon: LineChart, path: '/model/moving-average/intro' },
  { id: 'exponential_smoothing', name: '指数平滑法', description: '用户固定α的一次水平平滑。', icon: ChartSpline, path: '/model/exponential-smoothing/intro' },
  { id: 'arima', name: 'ARIMA模型', description: '固定d、stepwise辅助定阶的非季节ARIMA。', icon: Sigma, path: '/model/arima/intro' },
  { id: 'lstm', name: 'LSTM模型', description: '历史多变量输入的直接多步网络。', icon: BrainCircuit, path: '/model/lstm/intro' },
];

const ModelCard: React.FC<{ model: any; isCompleted: boolean; onClick: () => void }> = ({ model, isCompleted, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative p-6 rounded-xl border-2 transition-all duration-300 bg-white hover:border-blue-500 hover:shadow-lg cursor-pointer ${
        isCompleted ? 'border-green-500' : 'border-gray-200'
      }`}
    >
      {isCompleted && (
        <div className="absolute top-2 right-2 text-green-500">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50">
          <model.icon className="w-7 h-7 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{model.name}</h3>
          <p className="text-sm text-gray-500">{model.description}</p>
        </div>
      </div>
    </div>
  );
};

const ModelSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useExperiment();

  // Filter the models to be displayed based on user's selection
  const selectedModelDetails = allModels.filter(model => state.selected_base_models.includes(model.id));

  // Check completion status of selected models
  const completionMap: Record<string, boolean> = {
    moving_average: state.moving_average_completed,
    exponential_smoothing: state.exponential_smoothing_completed,
    arima: state.arima_completed,
    lstm: state.lstm_completed,
  };

  const allSelectedCompleted = selectedModelDetails.length > 0 && selectedModelDetails.every(model => completionMap[model.id]);

  const handlePrevious = () => {
    // Navigate back to the intro flow with a state to indicate the return context
    navigate('/model/model-intro', { state: { returnTo: 'last' } });
  };

  const handleNext = () => {
    if (allSelectedCompleted) {
      navigate('/model/ensemble-intro');
    }
  };

  const renderModelExecutionView = () => (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">请完成您选择的基础模型</h2>
        <p className="text-sm text-gray-500 mt-1">点击下方的卡片进入每个模型的详细步骤。</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {selectedModelDetails.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              isCompleted={!!completionMap[model.id]}
              onClick={() => navigate(model.path)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            返回
          </button>
          <p className="text-sm text-gray-600">
            请完成所有已选模型的学习与训练
          </p>
          <div style={{ width: '120px' }}></div>
        </div>
      </div>
    </>
  );

  const renderCompletionView = () => (
    <>
      <div className="flex-1 flex flex-col items-center justify-center text-center bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <PartyPopper className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">基础模型已全部完成！</h2>
        <p className="text-gray-600 max-w-md">
          您已完成所有已选基础模型的学习和训练。下一步可以学习融合方法，并在同一独立评估区间检验它们是否真的改善准确性或稳定性；融合并不保证优于最佳单模型。
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0 mt-6">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            返回
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            下一步：学习融合模型
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-full flex flex-col gap-6 py-4">
      {allSelectedCompleted ? renderCompletionView() : renderModelExecutionView()}
    </div>
  );
};

export default ModelSelection;
