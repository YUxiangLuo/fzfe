import React, { useState } from 'react';
import { Brain, Settings, TrendingUp, Layers, Target } from 'lucide-react';

interface ForecastModelStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const models = [
  {
    id: 'moving-average',
    name: '移动平均',
    icon: TrendingUp,
    description: '最近几期的简单平均值',
    complexity: '低',
    accuracy: '中等',
    parameters: ['窗口大小 (n)'],
    bestFor: '无趋势的稳定需求模式'
  },
  {
    id: 'exponential-smoothing',
    name: '指数平滑',
    icon: Target,
    description: '对最近数据给予更多权重的加权平均',
    complexity: '中等',
    accuracy: '中高',
    parameters: ['平滑因子 (α)', '趋势因子 (β)', '季节因子 (γ)'],
    bestFor: '具有趋势和季节性模式的数据'
  },
  {
    id: 'arima',
    name: 'ARIMA',
    icon: Brain,
    description: '自回归综合移动平均模型',
    complexity: '高',
    accuracy: '高',
    parameters: ['AR阶数 (p)', '差分次数 (d)', 'MA阶数 (q)'],
    bestFor: '具有趋势和季节性的复杂时间序列'
  },
  {
    id: 'lstm',
    name: 'LSTM神经网络',
    icon: Brain,
    description: '长短期记忆深度学习模型',
    complexity: '极高',
    accuracy: '极高',
    parameters: ['隐藏单元', '学习率', '训练轮数', '批次大小'],
    bestFor: '复杂非线性模式和大数据集'
  },
  {
    id: 'ensemble',
    name: '集成方法',
    icon: Layers,
    description: '多个预测模型的组合',
    complexity: '高',
    accuracy: '极高',
    parameters: ['模型权重', '组合方法'],
    bestFor: '通过结合优势最大化准确性'
  }
];

const ForecastModelStep: React.FC<ForecastModelStepProps> = ({ data, onUpdate }) => {
  const [selectedModel, setSelectedModel] = useState(data.selectedModel || '');
  const [showParameters, setShowParameters] = useState(false);
  const [parameters, setParameters] = useState(data.parameters || {});

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setShowParameters(true);
    onUpdate({ ...data, selectedModel: modelId });
  };

  const handleParameterChange = (param: string, value: string) => {
    const newParams = { ...parameters, [param]: value };
    setParameters(newParams);
    onUpdate({ ...data, parameters: newParams });
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case '低': return 'text-green-600 bg-green-50';
      case '中等': return 'text-yellow-600 bg-yellow-50';
      case '高': return 'text-orange-600 bg-orange-50';
      case '极高': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAccuracyColor = (accuracy: string) => {
    if (accuracy.includes('极高')) return 'text-green-600 bg-green-50';
    if (accuracy.includes('高')) return 'text-blue-600 bg-blue-50';
    if (accuracy.includes('中')) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  const renderParameterInputs = () => {
    if (!selectedModelData) return null;

    const parameterDefaults: { [key: string]: { [key: string]: string } } = {
      'moving-average': { '窗口大小 (n)': '12' },
      'exponential-smoothing': { 
        '平滑因子 (α)': '0.3',
        '趋势因子 (β)': '0.1',
        '季节因子 (γ)': '0.1'
      },
      'arima': {
        'AR阶数 (p)': '2',
        '差分次数 (d)': '1',
        'MA阶数 (q)': '2'
      },
      'lstm': {
        '隐藏单元': '50',
        '学习率': '0.001',
        '训练轮数': '100',
        '批次大小': '32'
      },
      'ensemble': {
        '模型权重': '等权重',
        '组合方法': '加权平均'
      }
    };

    const defaults = parameterDefaults[selectedModel] || {};

    return (
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">模型参数</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {selectedModelData.parameters.map((param) => (
            <div key={param}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {param}
              </label>
              {param === '组合方法' ? (
                <select
                  value={parameters[param] || defaults[param] || ''}
                  onChange={(e) => handleParameterChange(param, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="加权平均">加权平均</option>
                  <option value="投票">投票</option>
                  <option value="堆叠">堆叠</option>
                </select>
              ) : param === '模型权重' ? (
                <select
                  value={parameters[param] || defaults[param] || ''}
                  onChange={(e) => handleParameterChange(param, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="等权重">等权重</option>
                  <option value="基于性能">基于性能</option>
                  <option value="自定义">自定义权重</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={parameters[param] || defaults[param] || ''}
                  onChange={(e) => handleParameterChange(param, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`输入${param.toLowerCase()}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">参数指导</h4>
          <div className="text-sm text-blue-700 space-y-1">
            {selectedModel === 'moving-average' && (
              <p>• 窗口大小：较大的值平滑波动但降低响应性</p>
            )}
            {selectedModel === 'exponential-smoothing' && (
              <>
                <p>• α (0-1)：较高值对最近观测给予更多权重</p>
                <p>• β (0-1)：控制趋势平滑</p>
                <p>• γ (0-1)：控制季节性模式平滑</p>
              </>
            )}
            {selectedModel === 'arima' && (
              <>
                <p>• p：自回归项数量</p>
                <p>• d：差分程度</p>
                <p>• q：移动平均项数量</p>
              </>
            )}
            {selectedModel === 'lstm' && (
              <>
                <p>• 隐藏单元：模型复杂度（通常50-200）</p>
                <p>• 学习率：优化步长（0.001-0.01）</p>
                <p>• 训练轮数：训练迭代次数（50-200）</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">选择预测模型</h2>
        <p className="text-gray-600">
          选择最适合您数据特征的预测算法。
          每个模型都有不同的优势，适用于不同类型的需求模式。
        </p>
      </div>

      <div className="space-y-4">
        {models.map((model) => (
          <div
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
              selectedModel === model.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <model.icon className="h-6 w-6 text-white" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{model.name}</h3>
                  <p className="text-gray-600 mb-4">{model.description}</p>
                  
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">复杂度</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getComplexityColor(model.complexity)}`}>
                        {model.complexity}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">准确性</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getAccuracyColor(model.accuracy)}`}>
                        {model.accuracy}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">参数</p>
                      <p className="text-sm font-medium text-gray-900">{model.parameters.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">训练时间</p>
                      <p className="text-sm font-medium text-gray-900">
                        {model.complexity === '低' ? '快' :
                         model.complexity === '中等' ? '中等' :
                         model.complexity === '高' ? '慢' : '很慢'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>最适用于：</strong> {model.bestFor}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedModel === model.id && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showParameters && renderParameterInputs()}

      {selectedModel && (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">模型训练过程</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                1
              </div>
              <p className="text-sm font-medium text-gray-900">数据准备</p>
              <p className="text-xs text-gray-600">清理和预处理数据</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                2
              </div>
              <p className="text-sm font-medium text-gray-900">模型训练</p>
              <p className="text-xs text-gray-600">使用历史数据训练</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                3
              </div>
              <p className="text-sm font-medium text-gray-900">验证</p>
              <p className="text-xs text-gray-600">在验证集上测试</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                4
              </div>
              <p className="text-sm font-medium text-gray-900">预测</p>
              <p className="text-xs text-gray-600">生成预测结果</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastModelStep;