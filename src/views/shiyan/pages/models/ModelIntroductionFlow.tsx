import React, { useState } from 'react';
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
  Info,
} from 'lucide-react';

// Base models data
const baseModels = [
    {
      id: 'moving_average',
      name: '移动平均法',
      icon: LineChart,
      principle: '通过计算一定时期内数据的平均值来预测未来趋势，能够有效平滑数据中的随机波动。',
    },
    {
      id: 'exponential_smoothing',
      name: '指数平滑法',
      icon: ChartSpline,
      principle: '对历史数据赋予不同权重，近期数据权重更大，能够快速响应数据变化。',
    },
    {
      id: 'arima',
      name: 'ARIMA模型',
      icon: Sigma,
      principle: '结合自回归(AR)、差分(I)和移动平均(MA)，能处理非平稳时间序列。',
    },
    {
      id: 'lstm',
      name: 'LSTM神经网络',
      icon: BrainCircuit,
      principle: '一种深度学习模型，能学习时间序列中的长期依赖关系和复杂非线性模式。',
    },
];

type View = 'introduction' | 'selection';

const ModelIntroductionFlow: React.FC = () => {
  const navigate = useNavigate();
  const { updateState } = useExperiment();
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [view, setView] = useState<View>('introduction');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const activeModel = baseModels[currentModelIndex];

  if (!activeModel) {
    return null;
  }

  const Icon = activeModel.icon;
  const isLastModel = currentModelIndex === baseModels.length - 1;

  const handleNext = async () => {
    if (view === 'introduction') {
      if (isLastModel) {
        setView('selection');
      } else {
        setCurrentModelIndex(prev => prev + 1);
      }
    } else if (view === 'selection') {
      if (selectedModels.length >= 2) {
        await updateState({ selected_base_models: selectedModels });
        navigate('/model/model-select');
      }
    }
  };

  const handlePrevious = () => {
    if (view === 'introduction') {
      if (currentModelIndex === 0) {
        navigate('/model/window');
      } else {
        setCurrentModelIndex(prev => prev - 1);
      }
    } else if (view === 'selection') {
      setView('introduction');
    }
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const renderIntroductionView = () => (
    <>
      <div className="space-y-8 flex-1">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-blue-100">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-900">{activeModel.name}</h3>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 text-lg leading-relaxed">{activeModel.principle}</p>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={handlePrevious}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          上一步
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer"
        >
          {isLastModel ? '选择基础模型' : '下一个模型'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  const renderSelectionView = () => (
    <>
      <div className="flex-1">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">选择基础模型</h3>
        <p className="text-gray-600 mb-6">请选择至少两个基础模型进行后续的训练和对比。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {baseModels.map(model => {
            const isSelected = selectedModels.includes(model.id);
            const ModelIcon = model.icon;
            return (
              <div
                key={model.id}
                onClick={() => handleModelToggle(model.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ModelIcon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>{model.name}</span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {selectedModels.length < 2 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <Info className="w-5 h-5 flex-shrink-0" />
            <span>请至少选择两个模型。</span>
          </div>
        )}
      </div>
      <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={handlePrevious}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          返回介绍
        </button>
        <button
          onClick={handleNext}
          disabled={selectedModels.length < 2}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
        >
          下一步
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {view === 'introduction' ? '基础模型介绍' : '基础模型选择'}
        </h2>
        {view === 'introduction' && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
              {baseModels.map((model, index) => {
                const isCompleted = index < currentModelIndex;
                const isActive = index === currentModelIndex;
                return (
                  <React.Fragment key={model.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                          isActive ? 'bg-blue-500' : isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`text-xs font-bold text-white`}>
                          {index + 1}
                        </span>
                      </div>
                      <span
                        className={`font-medium text-sm ${
                          isActive ? 'text-blue-600' : isCompleted ? 'text-gray-800' : 'text-gray-500'
                        }`}
                      >
                        {model.name}
                      </span>
                    </div>
                    {index < baseModels.length - 1 && (
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
        {view === 'introduction' ? renderIntroductionView() : renderSelectionView()}
      </div>
    </div>
  );
};

export default ModelIntroductionFlow;
