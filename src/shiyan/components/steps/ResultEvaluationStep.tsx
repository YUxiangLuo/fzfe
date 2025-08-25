import React, { useState } from 'react';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResultEvaluationStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const ResultEvaluationStep: React.FC<ResultEvaluationStepProps> = ({ data, onUpdate }) => {
  const [selectedMetric, setSelectedMetric] = useState('rmse');

  // Mock forecast results
  const results = {
    'moving-average': {
      rmse: 45.2,
      mae: 32.8,
      mape: 18.5,
      r2: 0.72,
      accuracy: 75
    },
    'exponential-smoothing': {
      rmse: 38.7,
      mae: 28.3,
      mape: 15.2,
      r2: 0.81,
      accuracy: 82
    },
    'arima': {
      rmse: 32.1,
      mae: 23.9,
      mape: 12.8,
      r2: 0.88,
      accuracy: 87
    },
    'lstm': {
      rmse: 28.4,
      mae: 20.1,
      mape: 10.5,
      r2: 0.92,
      accuracy: 91
    },
    'ensemble': {
      rmse: 25.8,
      mae: 18.7,
      mape: 9.2,
      r2: 0.94,
      accuracy: 93
    }
  };

  const selectedModel = data.selectedModel || 'arima';
  const modelResults = results[selectedModel as keyof typeof results] || results.arima;

  const metrics = [
    {
      id: 'rmse',
      name: 'RMSE',
      fullName: '均方根误差',
      description: '测量误差的平均幅度，对大误差给予更高权重',
      value: modelResults.rmse,
      unit: '单位',
      lowerIsBetter: true
    },
    {
      id: 'mae',
      name: 'MAE',
      fullName: '平均绝对误差',
      description: '预测值与实际值之间绝对差异的平均值',
      value: modelResults.mae,
      unit: '单位',
      lowerIsBetter: true
    },
    {
      id: 'mape',
      name: 'MAPE',
      fullName: '平均绝对百分比误差',
      description: '平均百分比误差，用于不同规模间的比较',
      value: modelResults.mape,
      unit: '%',
      lowerIsBetter: true
    },
    {
      id: 'r2',
      name: 'R²',
      fullName: '决定系数',
      description: '因变量中可由自变量预测的方差比例',
      value: modelResults.r2,
      unit: '',
      lowerIsBetter: false
    }
  ];

  const getMetricGrade = (metricId: string, value: number) => {
    const thresholds: { [key: string]: { excellent: number; good: number; fair: number } } = {
      rmse: { excellent: 30, good: 45, fair: 60 },
      mae: { excellent: 25, good: 35, fair: 50 },
      mape: { excellent: 10, good: 20, fair: 30 },
      r2: { excellent: 0.9, good: 0.8, fair: 0.7 }
    };

    const threshold = thresholds[metricId];
    if (!threshold) return 'good';

    if (metricId === 'r2') {
      if (value >= threshold.excellent) return 'excellent';
      if (value >= threshold.good) return 'good';
      if (value >= threshold.fair) return 'fair';
      return 'poor';
    } else {
      if (value <= threshold.excellent) return 'excellent';
      if (value <= threshold.good) return 'good';
      if (value <= threshold.fair) return 'fair';
      return 'poor';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'excellent': return <CheckCircle2 className="h-4 w-4" />;
      case 'good': return <CheckCircle2 className="h-4 w-4" />;
      case 'fair': return <AlertCircle className="h-4 w-4" />;
      case 'poor': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getGradeText = (grade: string) => {
    switch (grade) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '较差';
      default: return '未知';
    }
  };

  // Mock forecast vs actual data for visualization
  const generateComparisonData = () => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      const actual = 100 + Math.sin(i * 0.5) * 30 + Math.random() * 20;
      const forecast = actual + (Math.random() - 0.5) * (modelResults.mae * 2);
      data.push({
        period: `M${i + 1}`,
        actual: Math.round(actual),
        forecast: Math.round(forecast)
      });
    }
    return data;
  };

  const comparisonData = generateComparisonData();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">预测准确性评估</h2>
        <p className="text-gray-600">
          使用各种准确性指标和预测值与实际值的可视化比较
          分析您选择的预测模型的性能。
        </p>
      </div>

      {/* Model Performance Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">
              {selectedModel === 'moving-average' ? '移动平均' :
               selectedModel === 'exponential-smoothing' ? '指数平滑' :
               selectedModel === 'arima' ? 'ARIMA' :
               selectedModel === 'lstm' ? 'LSTM神经网络' :
               selectedModel === 'ensemble' ? '集成方法' : '未知'} 模型
            </h3>
            <p className="text-blue-100">整体性能评估</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{modelResults.accuracy}%</div>
            <div className="text-blue-200">准确率</div>
          </div>
        </div>
      </div>

      {/* Accuracy Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => {
          const grade = getMetricGrade(metric.id, metric.value);
          const colorClass = getGradeColor(grade);
          
          return (
            <div 
              key={metric.id}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedMetric === metric.id ? 'border-blue-500 bg-blue-50' : colorClass
              }`}
              onClick={() => setSelectedMetric(metric.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{metric.name}</span>
                {getGradeIcon(grade)}
              </div>
              <div className="text-2xl font-bold mb-1">
                {typeof metric.value === 'number' ? metric.value.toFixed(metric.id === 'r2' ? 2 : 1) : metric.value}
                <span className="text-sm font-normal ml-1">{metric.unit}</span>
              </div>
              <div className="text-xs text-gray-600 mb-2">{metric.fullName}</div>
              <div className={`text-xs px-2 py-1 rounded-full ${colorClass}`}>
                {getGradeText(grade)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Metric Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {metrics.find(m => m.id === selectedMetric)?.fullName} 详情
          </h3>
        </div>
        <p className="text-gray-600 mb-4">
          {metrics.find(m => m.id === selectedMetric)?.description}
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">解释指南</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-700 mb-2">
                <strong>当前值：</strong> {metrics.find(m => m.id === selectedMetric)?.value}
                {metrics.find(m => m.id === selectedMetric)?.unit}
              </p>
              <p className="text-gray-700">
                <strong>等级：</strong> {getGradeText(getMetricGrade(selectedMetric, metrics.find(m => m.id === selectedMetric)?.value || 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-700 text-sm">
                {selectedMetric === 'rmse' && '较低的RMSE表示更好的准确性。30以下的值为优秀。'}
                {selectedMetric === 'mae' && '较低的MAE表示更好的准确性。25以下的值为优秀。'}
                {selectedMetric === 'mape' && '较低的MAPE表示更好的准确性。10%以下的值为优秀。'}
                {selectedMetric === 'r2' && '较高的R²表示更好的拟合。0.9以上的值为优秀。'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast vs Actual Comparison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">预测值与实际值对比</h3>
        </div>
        
        <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-end space-x-2 h-full">
            {comparisonData.map((point, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                <div className="flex space-x-1 flex-1 items-end">
                  <div 
                    className="bg-blue-500 rounded-t w-4 transition-all hover:bg-blue-600"
                    style={{ height: `${(point.actual / 150) * 100}%`, minHeight: '4px' }}
                    title={`实际值: ${point.actual}`}
                  />
                  <div 
                    className="bg-orange-500 rounded-t w-4 transition-all hover:bg-orange-600"
                    style={{ height: `${(point.forecast / 150) * 100}%`, minHeight: '4px' }}
                    title={`预测值: ${point.forecast}`}
                  />
                </div>
                <span className="text-xs text-gray-500">{point.period}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>实际值</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>预测值</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">性能分析与建议</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">优势</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {modelResults.accuracy >= 90 && (
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>优秀的整体准确性 ({modelResults.accuracy}%)</span>
                </li>
              )}
              {modelResults.r2 >= 0.85 && (
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>强解释能力 (R² = {modelResults.r2})</span>
                </li>
              )}
              {modelResults.mape <= 15 && (
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>低百分比误差 (MAPE = {modelResults.mape}%)</span>
                </li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">改进机会</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>考虑集成方法以获得更好的性能</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>监控模型性能并根据需要重新训练</span>
              </li>
              <li className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>收集可能提高准确性的额外外部因素</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultEvaluationStep;