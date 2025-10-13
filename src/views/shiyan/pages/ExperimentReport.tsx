import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext';
import {
  FileText, Save, Database, BarChart3, CheckSquare, Calculator, ClipboardList,
  AlertCircle, ChevronDown, ChevronUp, X
} from 'lucide-react';

interface ReportSection {
  title: string;
  icon: React.ReactNode;
  content: string;
  analysis: string;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 px-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

const ExperimentReport: React.FC = () => {
  const { state } = useExperiment();
  const navigate = useNavigate();

  // Section 1: 数据情况
  const [dataAnalysis, setDataAnalysis] = useState('');
  const dataContent = useMemo(() => {
    return `实验数据概况：
• 行业：${state.selected_industry || 'N/A'}
• 公司：${state.selected_company || 'N/A'}
• 产品：${state.selected_product || 'N/A'}
• 训练集范围：索引 ${state.data_window_train_start_index ?? 'N/A'} 至 ${state.data_window_train_end_index ?? 'N/A'}（共 ${state.data_window_train_end_index !== null && state.data_window_train_start_index !== null ? state.data_window_train_end_index - state.data_window_train_start_index + 1 : 'N/A'} 个数据点）
• 评估集范围：索引 ${state.data_window_evaluate_start_index ?? 'N/A'} 至 ${state.data_window_evaluate_end_index ?? 'N/A'}（共 ${state.data_window_evaluate_end_index !== null && state.data_window_evaluate_start_index !== null ? state.data_window_evaluate_end_index - state.data_window_evaluate_start_index + 1 : 'N/A'} 个数据点）`;
  }, [state]);

  // Section 2: 模型对比结果
  const [modelComparisonAnalysis, setModelComparisonAnalysis] = useState('');
  const modelComparisonContent = useMemo(() => {
    const models = [];

    if (state.moving_average_completed) {
      models.push({
        name: '移动平均法',
        params: `窗口大小: ${state.moving_average_window ?? 'N/A'}`,
        rmse: state.moving_average_metrics_rmse,
        mae: state.moving_average_metrics_mae,
        r2: state.moving_average_metrics_r2,
      });
    }

    if (state.exponential_smoothing_completed) {
      models.push({
        name: '指数平滑法',
        params: `平滑系数α: ${state.exponential_smoothing_alpha ?? 'N/A'}`,
        rmse: state.exponential_smoothing_metrics_rmse,
        mae: state.exponential_smoothing_metrics_mae,
        r2: state.exponential_smoothing_metrics_r2,
      });
    }

    if (state.arima_completed) {
      models.push({
        name: 'ARIMA模型',
        params: `参数(p,d,q): (${state.arima_p ?? '?'}, ${state.arima_d ?? '?'}, ${state.arima_q ?? '?'})`,
        rmse: state.arima_metrics_rmse,
        mae: state.arima_metrics_mae,
        r2: state.arima_metrics_r2,
      });
    }

    if (state.lstm_completed) {
      models.push({
        name: 'LSTM神经网络',
        params: `归一化: ${state.lstm_normalization || 'N/A'}, 目标字段: ${state.lstm_target_field || 'N/A'}, 特征数: ${state.lstm_features?.length ?? 0}`,
        rmse: state.lstm_metrics_rmse,
        mae: state.lstm_metrics_mae,
        r2: state.lstm_metrics_r2,
      });
    }

    if (state.ensemble_weighted_completed) {
      models.push({
        name: '加权平均融合',
        params: `基础模型: ${state.ensemble_weighted_base_models?.join(', ') || 'N/A'}`,
        rmse: state.ensemble_weighted_metrics_rmse,
        mae: state.ensemble_weighted_metrics_mae,
        r2: state.ensemble_weighted_metrics_r2,
      });
    }

    if (state.ensemble_boosting_completed) {
      models.push({
        name: 'Boosting融合',
        params: `基础模型: ${state.ensemble_boosting_base_models?.join(', ') || 'N/A'}`,
        rmse: state.ensemble_boosting_metrics_rmse,
        mae: state.ensemble_boosting_metrics_mae,
        r2: state.ensemble_boosting_metrics_r2,
      });
    }

    if (state.ensemble_stacking_completed) {
      models.push({
        name: 'Stacking融合',
        params: `基础模型: ${state.ensemble_stacking_base_models?.join(', ') || 'N/A'}`,
        rmse: state.ensemble_stacking_metrics_rmse,
        mae: state.ensemble_stacking_metrics_mae,
        r2: state.ensemble_stacking_metrics_r2,
      });
    }

    if (models.length === 0) {
      return '暂无已完成的模型，无法进行对比。';
    }

    let result = '各模型性能对比表：\n\n';
    result += '模型名称 | 参数配置 | RMSE | MAE | R²\n';
    result += ''.padEnd(80, '-') + '\n';

    models.forEach(model => {
      result += `${model.name.padEnd(12)} | ${model.params.padEnd(30)} | ${model.rmse !== null ? model.rmse.toFixed(4) : 'N/A'} | ${model.mae !== null ? model.mae.toFixed(4) : 'N/A'} | ${model.r2 !== null ? model.r2.toFixed(4) : 'N/A'}\n`;
    });

    return result;
  }, [state]);

  // Section 3: 模型选择结果
  const [modelSelectionAnalysis, setModelSelectionAnalysis] = useState('');
  const modelSelectionContent = useMemo(() => {
    const labels: Record<SelectedBestModel, string> = {
      ma: '移动平均法',
      exp: '指数平滑法',
      arima: 'ARIMA模型',
      lstm: 'LSTM神经网络',
      ensemble_weighted: '加权平均融合',
      ensemble_boosting: 'Boosting融合',
      ensemble_stacking: 'Stacking融合',
    };

    if (!state.selected_best_model) {
      return '尚未选择最优模型。';
    }

    const bestModelName = labels[state.selected_best_model];
    let metrics: ModelMetrics | null = null;

    switch (state.selected_best_model) {
      case 'ma':
        metrics = {
          rmse: state.moving_average_metrics_rmse,
          mae: state.moving_average_metrics_mae,
          r2: state.moving_average_metrics_r2,
        };
        break;
      case 'exp':
        metrics = {
          rmse: state.exponential_smoothing_metrics_rmse,
          mae: state.exponential_smoothing_metrics_mae,
          r2: state.exponential_smoothing_metrics_r2,
        };
        break;
      case 'arima':
        metrics = {
          rmse: state.arima_metrics_rmse,
          mae: state.arima_metrics_mae,
          r2: state.arima_metrics_r2,
        };
        break;
      case 'lstm':
        metrics = {
          rmse: state.lstm_metrics_rmse,
          mae: state.lstm_metrics_mae,
          r2: state.lstm_metrics_r2,
        };
        break;
      case 'ensemble_weighted':
        metrics = {
          rmse: state.ensemble_weighted_metrics_rmse,
          mae: state.ensemble_weighted_metrics_mae,
          r2: state.ensemble_weighted_metrics_r2,
        };
        break;
      case 'ensemble_boosting':
        metrics = {
          rmse: state.ensemble_boosting_metrics_rmse,
          mae: state.ensemble_boosting_metrics_mae,
          r2: state.ensemble_boosting_metrics_r2,
        };
        break;
      case 'ensemble_stacking':
        metrics = {
          rmse: state.ensemble_stacking_metrics_rmse,
          mae: state.ensemble_stacking_metrics_mae,
          r2: state.ensemble_stacking_metrics_r2,
        };
        break;
    }

    return `最优模型选择结果：

选定模型：${bestModelName}

性能指标：
• RMSE（均方根误差）：${metrics?.rmse !== null ? metrics?.rmse?.toFixed(4) : 'N/A'}
• MAE（平均绝对误差）：${metrics?.mae !== null ? metrics?.mae?.toFixed(4) : 'N/A'}
• R²（决定系数）：${metrics?.r2 !== null ? metrics?.r2?.toFixed(4) : 'N/A'}`;
  }, [state]);

  // Section 4: 生产计划参数计算结果
  const [planParamsAnalysis, setPlanParamsAnalysis] = useState('');
  const planParamsContent = useMemo(() => {
    // TODO: 这部分需要从生产计划步骤获取数据
    // 目前全局状态中没有这些字段，可能需要添加
    return `生产计划参数计算结果：

（注：此部分数据暂未在全局状态中提供，需要补充相关字段）

预测需求量：待补充
安全库存：待补充
生产批量：待补充
生产周期：待补充`;
  }, [state]);

  // Section 5: 生产计划决策结果
  const [planDecisionAnalysis, setPlanDecisionAnalysis] = useState('');
  const planDecisionContent = useMemo(() => {
    // TODO: 这部分需要从生产计划步骤获取数据
    return `生产计划决策结果：

（注：此部分数据暂未在全局状态中提供，需要补充相关字段）

生产计划方案：待补充
资源配置：待补充
时间安排：待补充`;
  }, [state]);

  const sections: ReportSection[] = [
    {
      title: '一、数据情况',
      icon: <Database className="w-5 h-5" />,
      content: dataContent,
      analysis: dataAnalysis,
    },
    {
      title: '二、模型对比结果',
      icon: <BarChart3 className="w-5 h-5" />,
      content: modelComparisonContent,
      analysis: modelComparisonAnalysis,
    },
    {
      title: '三、模型选择结果',
      icon: <CheckSquare className="w-5 h-5" />,
      content: modelSelectionContent,
      analysis: modelSelectionAnalysis,
    },
    {
      title: '四、生产计划参数计算结果',
      icon: <Calculator className="w-5 h-5" />,
      content: planParamsContent,
      analysis: planParamsAnalysis,
    },
    {
      title: '五、生产计划决策结果',
      icon: <ClipboardList className="w-5 h-5" />,
      content: planDecisionContent,
      analysis: planDecisionAnalysis,
    },
  ];

  const getCharCount = (text: string) => text.trim().length;

  const getAnalysisSetter = (index: number) => {
    switch (index) {
      case 0: return setDataAnalysis;
      case 1: return setModelComparisonAnalysis;
      case 2: return setModelSelectionAnalysis;
      case 3: return setPlanParamsAnalysis;
      case 4: return setPlanDecisionAnalysis;
      default: return () => {};
    }
  };

  const getAnalysisValue = (index: number) => {
    switch (index) {
      case 0: return dataAnalysis;
      case 1: return modelComparisonAnalysis;
      case 2: return modelSelectionAnalysis;
      case 3: return planParamsAnalysis;
      case 4: return planDecisionAnalysis;
      default: return '';
    }
  };

  // Calculate similarity between two texts (simple version)
  const calculateSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;

    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  };

  // Check if any two sections have >20% similarity
  const checkSimilarity = (): { hasIssue: boolean; message: string } => {
    const analyses = [dataAnalysis, modelComparisonAnalysis, modelSelectionAnalysis, planParamsAnalysis, planDecisionAnalysis];

    for (let i = 0; i < analyses.length; i++) {
      for (let j = i + 1; j < analyses.length; j++) {
        if (analyses[i] && analyses[j]) {
          const similarity = calculateSimilarity(analyses[i], analyses[j]);
          if (similarity > 0.2) {
            return {
              hasIssue: true,
              message: `第${i + 1}部分与第${j + 1}部分的重复率为 ${(similarity * 100).toFixed(1)}%，超过了20%的限制。`
            };
          }
        }
      }
    }

    return { hasIssue: false, message: '' };
  };

  const handleSave = () => {
    // Check word count
    for (let i = 0; i < sections.length; i++) {
      const analysis = getAnalysisValue(i);
      if (getCharCount(analysis) < 100) {
        alert(`第${i + 1}部分"${sections[i].title}"的分析内容不足100字，当前为${getCharCount(analysis)}字。`);
        return;
      }
    }

    // Check similarity
    const { hasIssue, message } = checkSimilarity();
    if (hasIssue) {
      alert(message);
      return;
    }

    alert('报告验证通过！可以提交。\n（注：实际保存逻辑待实现）');
  };

  const similarityCheck = checkSimilarity();

  const handleClose = () => {
    navigate('/production');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all z-10 shadow-sm"
        title="关闭并返回生产计划"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="min-h-screen flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-[1400px] mx-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-blue-600" />
                撰写实验报告
              </h1>
              <p className="text-gray-600 mb-4">
                请根据实验结果，完成以下五个部分的分析。每部分分析不少于100字，且各部分内容重复率不超过20%。
              </p>

              {/* Validation Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">字数要求</h3>
                  <div className="space-y-1 text-sm">
                    {sections.map((section, idx) => {
                      const count = getCharCount(getAnalysisValue(idx));
                      const isValid = count >= 100;
                      return (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-gray-700">{section.title}</span>
                          <span className={`font-semibold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {count} / 100 字
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">重复率检查</h3>
                  {similarityCheck.hasIssue ? (
                    <div className="flex items-start space-x-2 text-sm text-red-700">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{similarityCheck.message}</span>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-2 text-sm text-green-700">
                      <CheckSquare className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>所有部分的重复率均未超过20%</span>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="space-y-6">
              {sections.map((section, idx) => (
                <CollapsibleSection key={idx} title={section.title}>
                  <div className="space-y-4">
                    {/* Display experiment results */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        {section.icon}
                        <h4 className="font-semibold text-gray-900">实验结果</h4>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                          {section.content}
                        </pre>
                      </div>
                    </div>

                    {/* Analysis textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-semibold text-gray-900">
                          结果分析
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <span className={`text-sm ${getCharCount(getAnalysisValue(idx)) >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                          {getCharCount(getAnalysisValue(idx))} / 100 字
                        </span>
                      </div>
                      <textarea
                        value={getAnalysisValue(idx)}
                        onChange={(e) => getAnalysisSetter(idx)(e.target.value)}
                        placeholder="请根据上述实验结果展开具体分析，要求逻辑通顺，表述完整，不少于100字..."
                        className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        提示：请同学们按结果展开具体分析，要求逻辑通顺，表述完整。
                      </p>
                    </div>
                  </div>
                </CollapsibleSection>
              ))}
            </div>

            <footer className="mt-8 flex justify-end pb-8">
              <button
                onClick={handleSave}
                className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
              >
                <Save className="w-5 h-5 mr-2" />
                保存并提交报告
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperimentReport;
