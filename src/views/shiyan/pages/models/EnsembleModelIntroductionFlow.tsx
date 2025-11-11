import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import {
  Scale,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Target,
} from 'lucide-react';

// Expanded ensemble models data
const ensembleModels = [
  {
    id: 'weighted_ensemble',
    name: '加权平均融合',
    icon: Scale,
    principle: '根据基础模型过去的表现（如RMSE、R²等指标）为它们分配不同权重，表现越好的模型权重越高，最终将所有模型的预测结果加权平均。',
    use_case: '当基础模型性能差异较大时，此方法能有效放大表现好的模型的影响力，同时抑制表现差的模型，从而获得更稳健的预测结果。',
    pros: ['实现简单，计算开销小', '直观且易于解释，权重直接反映模型重要性', '能有效提升预测的稳定性和准确性'],
    cons: ['权重的确定依赖于历史数据，可能存在过拟合', '无法捕捉模型间的复杂非线性关系', '当所有基础模型性能相近时，效果提升有限'],
  },
  {
    id: 'boosting_ensemble',
    name: 'Boosting融合',
    icon: Sparkles,
    principle: '串行训练一系列模型，每个新模型都专注于修正前一个模型的预测误差。通过迭代地“增强”弱学习器，最终组合成一个强大的预测模型。',
    use_case: '适用于追求极致预测精度的场景。通过不断减少残差，Boosting能够挖掘出数据中更深层次的规律，常用于各种数据科学竞赛。',
    pros: ['通常能达到非常高的预测精度', '能够处理复杂的非线性关系', '模型具有很强的泛化能力'],
    cons: ['对噪声数据比较敏感，容易过拟合', '模型训练是串行的，速度较慢', '模型的可解释性相对较差'],
  },
  {
    id: 'stacking_ensemble',
    name: 'Stacking融合',
    icon: Layers,
    principle: '构建一个两层学习结构。第一层是多个基础模型，它们对数据进行预测。第二层是一个“元模型”，它将第一层模型的预测结果作为新的特征，来学习如何最优地组合它们。',
    use_case: '当不同类型的基础模型能从不同角度捕捉数据特征时，Stacking能有效地学习这些模型间的差异和互补性，实现“博采众长”。',
    pros: ['能学习并利用模型间的复杂关系', '通常是所有融合方法中性能上限最高的', '结构灵活，可以堆叠多种不同类型的模型'],
    cons: ['实现复杂，计算成本非常高', '容易过拟合，特别是当数据量较少时', '元模型的选择对最终结果影响很大'],
  },
];

type View = 'introduction' | 'selection';

const EnsembleModelIntroductionFlow: React.FC = () => {
  const navigate = useNavigate();
  const { updateState } = useExperiment();
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [view, setView] = useState<View>('introduction');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const activeModel = ensembleModels[currentModelIndex];
  if (!activeModel) return null; // Safety check

  const Icon = activeModel.icon;
  const isLastModel = currentModelIndex === ensembleModels.length - 1;

  const handleNext = async () => {
    if (view === 'introduction') {
      if (isLastModel) {
        setView('selection');
      } else {
        setCurrentModelIndex(prev => prev + 1);
      }
    } else if (view === 'selection') {
      if (selectedModels.length >= 1) {
        await updateState({ selected_ensemble_models: selectedModels });
        navigate('/model/ensemble-select');
      }
    }
  };

  const handlePrevious = () => {
    if (view === 'introduction') {
      if (currentModelIndex === 0) {
        navigate('/model/model-select');
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
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-100 to-fuchsia-100">
            <Icon className="w-9 h-9 text-purple-600" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gray-900">{activeModel.name}</h3>
          </div>
        </div>

        {/* Principle Card */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-purple-600" />
            <h4 className="text-lg font-semibold text-purple-800">核心思想</h4>
          </div>
          <p className="text-purple-900 text-base leading-relaxed">{activeModel.principle}</p>
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
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white cursor-pointer"
        >
          {isLastModel ? '选择融合模型' : '下一个模型'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  const renderSelectionView = () => (
    <>
      <div className="flex-1">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">选择融合模型</h3>
        <p className="text-gray-600 mb-6">请选择至少一个融合模型进行训练。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ensembleModels.map(model => {
            const isSelected = selectedModels.includes(model.id);
            const ModelIcon = model.icon;
            return (
              <div
                key={model.id}
                onClick={() => handleModelToggle(model.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected ? 'bg-purple-50 border-purple-500 shadow-md' : 'bg-white border-gray-200 hover:border-purple-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ModelIcon className={`w-6 h-6 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                    <span className={`font-semibold ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>{model.name}</span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {selectedModels.length < 1 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <Info className="w-5 h-5 flex-shrink-0" />
            <span>请至少选择一个模型。</span>
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
          disabled={selectedModels.length < 1}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
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
          {view === 'introduction' ? '融合模型介绍' : '融合模型选择'}
        </h2>
        {view === 'introduction' && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
              {ensembleModels.map((model, index) => {
                const isCompleted = index < currentModelIndex;
                const isActive = index === currentModelIndex;
                return (
                  <React.Fragment key={model.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                          isActive ? 'bg-purple-500' : isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`text-xs font-bold text-white`}>
                          {index + 1}
                        </span>
                      </div>
                      <span
                        className={`font-medium text-sm ${
                          isActive ? 'text-purple-600' : isCompleted ? 'text-gray-800' : 'text-gray-500'
                        }`}
                      >
                        {model.name}
                      </span>
                    </div>
                    {index < ensembleModels.length - 1 && (
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

export default EnsembleModelIntroductionFlow;