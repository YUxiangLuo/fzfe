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
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Target,
} from 'lucide-react';

// Expanded base models data
const baseModels = [
  {
    id: 'moving_average',
    name: '移动平均法',
    icon: LineChart,
    principle: '通过计算一定周期内数据的平均值来预测未来趋势，核心思想是平滑短期波动，揭示长期趋势。',
    use_case: '适用于短期预测，尤其是在数据没有明显趋势或季节性，且波动较为随机的场景，如短期库存预测。',
    pros: ['计算简单，易于理解', '能有效滤除数据中的随机噪声', '适用于平稳序列的短期预测'],
    cons: ['对趋势变化反应迟钝', '无法预测序列的转折点', '窗口大小的选择对结果影响很大'],
  },
  {
    id: 'exponential_smoothing',
    name: '指数平滑法',
    icon: ChartSpline,
    principle: '对历史数据赋予不同权重，近期数据权重更大。它是一种加权平均，权重随时间呈指数级递减。',
    use_case: '广泛用于各种时间序列预测，特别是当数据有一定趋势或季节性时（需使用其变体Holt-Winters）。',
    pros: ['对近期数据变化反应灵敏', '计算效率高，需要存储的数据少', '模型有多种变体，可适应不同数据模式'],
    cons: ['对参数（如alpha）的选择敏感', '基础模型无法处理复杂的季节性模式', '可能产生滞后误差'],
  },
  {
    id: 'arima',
    name: 'ARIMA模型',
    icon: Sigma,
    principle: '结合自回归(AR)、差分(I)和移动平均(MA)三大模块，能专业地处理非平稳时间序列数据。',
    use_case: '金融领域（股价预测）、经济学（GDP预测）等需要精确建模时间序列内在结构和趋势的场景。',
    pros: ['理论基础坚实，模型解释性强', '能处理多种类型的非平稳时间序列', '是许多复杂模型的基础'],
    cons: ['需要手动进行定阶（p, d, q的选择）', '要求数据量较大，且不能有缺失值', '只能捕捉线性关系'],
  },
  {
    id: 'lstm',
    name: 'LSTM神经网络',
    icon: BrainCircuit,
    principle: '一种特殊的循环神经网络（RNN），通过“门”结构来学习时间序列中的长期依赖关系和复杂的非线性模式。',
    use_case: '适用于具有复杂模式和长期依赖的序列数据，如自然语言处理、股票市场预测、天气预报等。',
    pros: ['能有效捕捉长期依赖关系', '可以处理非常复杂的非线性模式', '对数据中的噪声有较好的鲁棒性'],
    cons: ['模型复杂，需要大量数据进行训练', '计算成本高，训练时间长', '模型是“黑箱”，可解释性较差'],
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
      <div className="space-y-6 flex-1">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
            <Icon className="w-9 h-9 text-blue-600" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-900">{activeModel.name}</h3>
          </div>
        </div>

        {/* Principle Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-blue-800">核心思想</h4>
          </div>
          <p className="text-blue-900 text-base leading-relaxed">{activeModel.principle}</p>
        </div>

        {/* Use Case Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h4 className="text-lg font-semibold text-green-800">应用场景</h4>
          </div>
          <p className="text-green-900 text-base leading-relaxed">{activeModel.use_case}</p>
        </div>

        {/* Pros and Cons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <ThumbsUp className="w-5 h-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-800">优点</h4>
            </div>
            <ul className="space-y-2">
              {activeModel.pros.map((pro, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <ThumbsDown className="w-5 h-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-800">缺点</h4>
            </div>
            <ul className="space-y-2">
              {activeModel.cons.map((con, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{con}</span>
                </li>
              ))}
            </ul>
          </div>
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
