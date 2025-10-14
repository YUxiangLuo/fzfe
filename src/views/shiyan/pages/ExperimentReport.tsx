import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext';
import {
  FileText, Save, Database, BarChart3, CheckSquare, Calculator, ClipboardList,
  ChevronDown, ChevronUp, X, Download, CheckCircle, Loader2
} from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';

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

interface UserSummary {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  phone_number?: string | null;
  created_at: string;
}

const ExperimentReport: React.FC = () => {
  const { state, updateState, createNewExperiment } = useExperiment();
  const navigate = useNavigate();

  // User info state
  const [userInfo, setUserInfo] = useState<UserSummary | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Generate default report title based on experiment state
  const generateDefaultTitle = () => {
    const industry = state.selected_industry || '未知行业';
    const company = state.selected_company || '未知企业';
    const product = state.selected_product || '未知产品';
    return `${industry}-${company}-${product}需求预测与生产计划决策实验报告`;
  };

  const [reportTitle, setReportTitle] = useState(generateDefaultTitle());

  // Fetch user info on mount
  React.useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const profile = await apiClient.get<UserSummary>('/users/me');
        setUserInfo(profile);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserInfo();
  }, []);

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

  // Generate HTML report
  const generateHTMLReport = (): string => {
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    };

    // Format date
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return '未知';
      try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
      } catch {
        return '未知';
      }
    };

    // Get current date
    const currentDate = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const sections = [
      {
        title: '一、数据情况',
        content: dataContent,
        analysis: dataAnalysis,
      },
      {
        title: '二、模型对比结果',
        content: modelComparisonContent,
        analysis: modelComparisonAnalysis,
      },
      {
        title: '三、模型选择结果',
        content: modelSelectionContent,
        analysis: modelSelectionAnalysis,
      },
      {
        title: '四、生产计划参数计算结果',
        content: planParamsContent,
        analysis: planParamsAnalysis,
      },
      {
        title: '五、生产计划决策结果',
        content: planDecisionContent,
        analysis: planDecisionAnalysis,
      },
    ];

    let htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    body {
      font-family: 'SimSun', serif;
      line-height: 1.8;
      max-width: 900px;
      margin: 40px auto;
      padding: 20px;
      background: #fff;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #333;
    }
    .report-meta {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }
    .report-meta table {
      margin: 0 auto;
      border-collapse: collapse;
    }
    .report-meta td {
      padding: 8px 20px;
      text-align: left;
      font-size: 14px;
      color: #555;
    }
    .report-meta .label {
      font-weight: bold;
      color: #333;
      text-align: right;
    }
    h2 {
      font-size: 18px;
      font-weight: bold;
      margin-top: 30px;
      margin-bottom: 15px;
      color: #333;
    }
    h3 {
      font-size: 16px;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
      color: #555;
    }
    p {
      text-indent: 2em;
      margin-bottom: 12px;
      color: #333;
    }
    .section {
      margin-bottom: 30px;
    }
    .content-box {
      background: #f5f5f5;
      padding: 15px;
      border-left: 4px solid #4a90e2;
      margin: 15px 0;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      color: #333;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportTitle)}</h1>

  <div class="report-meta">
    <table>
      <tr>
        <td class="label">学生姓名：</td>
        <td>${escapeHtml(userInfo?.full_name || userInfo?.username || '未知')}</td>
        <td class="label">学生ID：</td>
        <td>${state.student_id || '未知'}</td>
      </tr>
      <tr>
        <td class="label">实验ID：</td>
        <td>${state.experiment_id || '未知'}</td>
        <td class="label">实验开始时间：</td>
        <td>${formatDate(state.start_time)}</td>
      </tr>
      <tr>
        <td class="label">报告生成时间：</td>
        <td colspan="3">${currentDate}</td>
      </tr>
    </table>
  </div>
`;

    sections.forEach((section) => {
      htmlContent += `
  <div class="section">
    <h2>${escapeHtml(section.title)}</h2>
    <h3>实验结果</h3>
    <div class="content-box">${escapeHtml(section.content)}</div>
    <h3>结果分析</h3>
    <p>${escapeHtml(section.analysis || '暂无分析内容')}</p>
  </div>
`;
    });

    htmlContent += `
</body>
</html>`;

    return htmlContent;
  };

  // Convert string to base64
  const toBase64 = (str: string): string => {
    return btoa(unescape(encodeURIComponent(str)));
  };

  // Handle save and submit
  const handleSave = async () => {
    if (!state.experiment_id) {
      setSubmitError('实验ID不存在，无法提交报告');
      return;
    }

    // Basic validation - check if all sections have analysis content
    const hasEmptySection = sections.some((_, idx) => !getAnalysisValue(idx).trim());
    if (hasEmptySection) {
      setSubmitError('请完成所有部分的分析内容后再提交');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      // Generate HTML report
      const htmlReport = generateHTMLReport();

      // Convert to base64
      const base64Content = toBase64(htmlReport);

      // Submit to API
      const response = await apiClient.post<{
        message: string;
        report_id: number;
        pdf_path: string;
      }>('/reports', {
        experiment_id: state.experiment_id,
        report_content: base64Content,
      });

      setSubmitSuccess(true);
      setPdfPath(response.pdf_path);
      setSubmitError(null);

      // Update experiment state to completed
      const now = new Date().toISOString();
      await updateState({
        status: 'Completed',
        last_activity_at: now,
        completion_time: now,
      });

      // Show completion modal
      setShowCompletionModal(true);
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      setSubmitError(error.message || '提交报告失败，请重试');
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    navigate('/production');
  };

  const handleStartNewExperiment = async () => {
    try {
      // Create a new experiment and update global state
      await createNewExperiment();
      // Redirect to introduction page
      navigate('/introduction');
    } catch (error) {
      console.error('Failed to start new experiment:', error);
      // Still navigate to introduction even if creation fails
      navigate('/introduction');
    }
  };

  const handleLogout = () => {
    // Clear token and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all z-10 shadow-sm"
        title="关闭并返回生产计划"
        disabled={isSubmitting}
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
                请根据实验结果，完成以下报告标题和五个部分的分析。
              </p>

              {/* Report Title Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  报告标题
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="请输入报告标题"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submission Status Messages */}
              {submitError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">提交失败</h3>
                    <p className="text-red-700 text-sm">{submitError}</p>
                  </div>
                </div>
              )}

              {submitSuccess && pdfPath && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-1">提交成功！</h3>
                      <p className="text-green-700 text-sm mb-3">您的实验报告已成功生成并保存为PDF文件。</p>
                      <div className="flex items-center space-x-3">
                        <code className="text-xs bg-white px-3 py-1 rounded border border-green-200 text-gray-700">
                          {pdfPath}
                        </code>
                        <button
                          onClick={() => navigate('/production')}
                          className="text-sm text-green-700 hover:text-green-800 font-medium underline"
                        >
                          返回生产计划
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                      </div>
                      <textarea
                        value={getAnalysisValue(idx)}
                        onChange={(e) => getAnalysisSetter(idx)(e.target.value)}
                        placeholder="请根据上述实验结果展开具体分析，要求逻辑通顺，表述完整..."
                        className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-sm"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        提示：请根据实验结果展开具体分析，要求逻辑通顺，表述完整。
                      </p>
                    </div>
                  </div>
                </CollapsibleSection>
              ))}
            </div>

            <footer className="mt-8 flex justify-end pb-8">
              <button
                onClick={handleSave}
                disabled={isSubmitting || submitSuccess}
                className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    已提交
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    保存并提交报告
                  </>
                )}
              </button>
            </footer>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                恭喜！实验完成
              </h2>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                您已成功完成本次需求预测与生产计划决策实验的全部内容。实验报告已提交并保存。
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleStartNewExperiment}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                >
                  开始新的实验
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperimentReport;
