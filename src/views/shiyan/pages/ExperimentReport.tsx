import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext';
import {
  FileText, Save, Database, BarChart3, CheckSquare, Calculator, ClipboardList,
  X, CheckCircle, Loader2, Building, Factory, Package, TrendingUp, Brain, AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';

interface UserSummary {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
}

// Moved ReportCard outside to prevent re-creation on every render
const ReportCard = ({ icon, title, analysisKey, children, getAnalysisValue, getAnalysisSetter, isSubmitting }: {
  icon: React.ReactNode,
  title: string,
  analysisKey: string,
  children: React.ReactNode,
  getAnalysisValue: (key: string) => string,
  getAnalysisSetter: (key: string) => (value: string) => void,
  isSubmitting: boolean
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="p-6 border-b border-gray-200 bg-gray-50/50">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center">
        {icon}
        <span className="ml-3">{title}</span>
      </h2>
    </div>
    <div className="p-6 space-y-6">
      {children}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">结果分析<span className="text-red-500 ml-1">*</span></label>
        <textarea
          value={getAnalysisValue(analysisKey)}
          onChange={(e) => getAnalysisSetter(analysisKey)(e.target.value)}
          placeholder="请根据上述实验结果展开具体分析..."
          className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-y text-sm"
          disabled={isSubmitting}
        />
      </div>
    </div>
  </div>
);

const ExperimentReport: React.FC = () => {
  const { state, updateState } = useExperiment();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState<UserSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [countdown, setCountdown] = useState(8);

  // Countdown timer effect for auto-logout
  useEffect(() => {
    if (showCompletionModal) {
      localStorage.removeItem('token');
      setCountdown(8); // Reset countdown each time modal opens
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = "/login";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer); // Cleanup on unmount or modal close
    }
  }, [showCompletionModal]);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch user info on mount
  useEffect(() => {
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

  const [dataAnalysis, setDataAnalysis] = useState('');
  const [modelComparisonAnalysis, setModelComparisonAnalysis] = useState('');
  const [modelSelectionAnalysis, setModelSelectionAnalysis] = useState('');
  const [planParamsAnalysis, setPlanParamsAnalysis] = useState('');
  const [planDecisionAnalysis, setPlanDecisionAnalysis] = useState('');

  const getAnalysisSetter = (key: string) => {
    const setters: { [key: string]: React.Dispatch<React.SetStateAction<string>> } = {
      data: setDataAnalysis,
      comparison: setModelComparisonAnalysis,
      selection: setModelSelectionAnalysis,
      params: setPlanParamsAnalysis,
      decision: setPlanDecisionAnalysis,
    };
    return setters[key] || (() => { });
  };

  const getAnalysisValue = (key: string) => {
    const values: { [key: string]: string } = {
      data: dataAnalysis,
      comparison: modelComparisonAnalysis,
      selection: modelSelectionAnalysis,
      params: planParamsAnalysis,
      decision: planDecisionAnalysis,
    };
    return values[key] || '';
  };

  const secondForecastStdDev = state.production_forecast_results?.[1]?.std_dev;

  const allModels = useMemo(() => {
    const models = [];
    if (state.moving_average_completed) models.push({ name: '移动平均法', params: `窗口: ${state.moving_average_window ?? 'N/A'}`, rmse: state.moving_average_metrics_rmse, mae: state.moving_average_metrics_mae, r2: state.moving_average_metrics_r2 });
    if (state.exponential_smoothing_completed) models.push({ name: '指数平滑法', params: `Alpha: ${state.exponential_smoothing_alpha ?? 'N/A'}`, rmse: state.exponential_smoothing_metrics_rmse, mae: state.exponential_smoothing_metrics_mae, r2: state.exponential_smoothing_metrics_r2 });
    if (state.arima_completed) models.push({ name: 'ARIMA', params: `(p,d,q): (${state.arima_p ?? '?'},${state.arima_d ?? '?'},${state.arima_q ?? '?'})`, rmse: state.arima_metrics_rmse, mae: state.arima_metrics_mae, r2: state.arima_metrics_r2 });
    if (state.lstm_completed) models.push({ name: 'LSTM', params: `归一化: ${state.lstm_normalization || 'N/A'}`, rmse: state.lstm_metrics_rmse, mae: state.lstm_metrics_mae, r2: state.lstm_metrics_r2 });
    if (state.ensemble_weighted_completed) models.push({ name: '加权融合', params: `模型数: ${state.ensemble_weighted_base_models?.length ?? 0}`, rmse: state.ensemble_weighted_metrics_rmse, mae: state.ensemble_weighted_metrics_mae, r2: state.ensemble_weighted_metrics_r2 });
    if (state.ensemble_boosting_completed) models.push({ name: 'Boosting融合', params: `模型数: ${state.ensemble_boosting_base_models?.length ?? 0}`, rmse: state.ensemble_boosting_metrics_rmse, mae: state.ensemble_boosting_metrics_mae, r2: state.ensemble_boosting_metrics_r2 });
    if (state.ensemble_stacking_completed) models.push({ name: 'Stacking融合', params: `模型数: ${state.ensemble_stacking_base_models?.length ?? 0}`, rmse: state.ensemble_stacking_metrics_rmse, mae: state.ensemble_stacking_metrics_mae, r2: state.ensemble_stacking_metrics_r2 });
    return models;
  }, [state]);

  const bestModelMetrics = useMemo(() => {
    const modelKey = state.selected_best_model;
    if (!modelKey) return null;
    const metricsMap: Record<SelectedBestModel, ModelMetrics> = {
      ma: { rmse: state.moving_average_metrics_rmse, mae: state.moving_average_metrics_mae, r2: state.moving_average_metrics_r2 },
      exp: { rmse: state.exponential_smoothing_metrics_rmse, mae: state.exponential_smoothing_metrics_mae, r2: state.exponential_smoothing_metrics_r2 },
      arima: { rmse: state.arima_metrics_rmse, mae: state.arima_metrics_mae, r2: state.arima_metrics_r2 },
      lstm: { rmse: state.lstm_metrics_rmse, mae: state.lstm_metrics_mae, r2: state.lstm_metrics_r2 },
      ensemble_weighted: { rmse: state.ensemble_weighted_metrics_rmse, mae: state.ensemble_weighted_metrics_mae, r2: state.ensemble_weighted_metrics_r2 },
      ensemble_boosting: { rmse: state.ensemble_boosting_metrics_rmse, mae: state.ensemble_boosting_metrics_mae, r2: state.ensemble_boosting_metrics_r2 },
      ensemble_stacking: { rmse: state.ensemble_stacking_metrics_rmse, mae: state.ensemble_stacking_metrics_mae, r2: state.ensemble_stacking_metrics_r2 },
    };
    return metricsMap[modelKey];
  }, [state]);

  const generateHTMLForTables = () => {
    const modelLabels: Record<SelectedBestModel, string> = { ma: '移动平均法', exp: '指数平滑法', arima: 'ARIMA模型', lstm: 'LSTM神经网络', ensemble_weighted: '加权平均融合', ensemble_boosting: 'Boosting融合', ensemble_stacking: 'Stacking融合' };

    const renderValue = (val: number | null | undefined) => val?.toFixed(4) ?? 'N/A';

    let html = '<h2>一、实验概述</h2><table>';
    html += `<tr><td>行业</td><td>${state.selected_industry || 'N/A'}</td></tr>`;
    html += `<tr><td>公司</td><td>${state.selected_company || 'N/A'}</td></tr>`;
    html += `<tr><td>产品</td><td>${state.selected_product || 'N/A'}</td></tr></table>`;

    html += '<h2>二、模型性能对比</h2><table><thead><tr><th>模型</th><th>参数</th><th>RMSE</th><th>MAE</th><th>R²</th></tr></thead><tbody>';
    allModels.forEach(m => {
      html += `<tr><td>${m.name}</td><td>${m.params}</td><td>${renderValue(m.rmse)}</td><td>${renderValue(m.mae)}</td><td>${renderValue(m.r2)}</td></tr>`;
    });
    html += '</tbody></table>';

    html += '<h2>三、最优模型</h2><table>';
    html += `<tr><td>选定模型</td><td colspan="2">${state.selected_best_model ? modelLabels[state.selected_best_model] : 'N/A'}</td></tr>`;
    html += `<tr><td>RMSE</td><td colspan="2">${renderValue(bestModelMetrics?.rmse)}</td></tr>`;
    html += `<tr><td>MAE</td><td colspan="2">${renderValue(bestModelMetrics?.mae)}</td></tr>`;
    html += `<tr><td>R²</td><td colspan="2">${renderValue(bestModelMetrics?.r2)}</td></tr></table>`;

    html += '<h2>四、生产计划参数计算结果</h2>';
    html += '<p style="background: #EFF6FF; padding: 10px; border-left: 4px solid #3B82F6; margin: 10px 0;">💡 以下是您在学习过程中逐步计算出的<strong>期2（学习演示期）</strong>的各项参数</p>';

    // 提取期2数据
    const period2 = state.production_mps_table.length > 1 ? state.production_mps_table[1] : null;
    if (period2) {
      html += '<h3>基础生产变量</h3><table>';
      html += `<tr><td>需求预测</td><td>${period2.demand_forecast} 件</td><td>来源: ${state.selected_best_model ? { ma: '移动平均', exp: '指数平滑', arima: 'ARIMA', lstm: 'LSTM', ensemble_weighted: '加权融合', ensemble_boosting: 'Boosting融合', ensemble_stacking: 'Stacking融合' }[state.selected_best_model] : ''} 模型</td></tr>`;
      html += `<tr><td>产出量</td><td>${period2.production_output} 件</td><td>您手动输入的生产量</td></tr>`;
      html += `<tr><td>期初库存</td><td>${period2.beginning_inventory} 件</td><td>继承自期1的期末库存</td></tr>`;
      html += `<tr><td>期末库存</td><td>${period2.ending_inventory} 件</td><td>= 期初 + 产出 - 需求</td></tr>`;
      html += `<tr><td>缺货量</td><td style="color: ${period2.stockout > 0 ? 'red' : 'black'}">${period2.stockout} 件</td><td>期末库存为负时的绝对值</td></tr></table>`;

      html += '<h3>服务水平</h3><table>';
      html += `<tr><td>服务水平</td><td style="color: ${period2.service_level >= (state.production_target_service_level || 0.99) ? 'green' : 'red'}">${(period2.service_level * 100).toFixed(1)}%</td><td>= 1 - (${period2.stockout} / ${period2.demand_forecast})</td></tr>`;
      html += `<tr><td>目标对比</td><td colspan="2">实际 ${(period2.service_level * 100).toFixed(1)}% vs 目标 ${((state.production_target_service_level || 0.99) * 100).toFixed(0)}% ${period2.service_level >= (state.production_target_service_level || 0.99) ? '✓ 达标' : '✗ 未达标'}</td></tr></table>`;

      html += '<h3>安全库存与预测量</h3><table>';
      html += `<tr><td>安全库存</td><td>${period2.safety_stock} 件</td><td>= Z值 ${state.production_safety_stock_z_score || 2.33} × 标准差</td></tr>`;
      html += `<tr><td>预测量</td><td>${period2.demand_forecast + period2.safety_stock} 件</td><td>= 需求 + 安全库存</td></tr></table>`;

      html += '<h3>计划生产</h3><table>';
      html += `<tr><td>计划生产</td><td>${period2.planned_production} 件</td><td>= 预测量 - 期初库存</td></tr></table>`;
    }

    html += '<h2>五、生产计划决策结果</h2>';
    html += '<p style="background: #ECFDF5; padding: 10px; border-left: 4px solid #10B981; margin: 10px 0;">📊 基于您在期2学习的参数计算方法，系统自动生成了完整的生产计划</p>';
    html += '<table><thead><tr><th>周期</th><th>预测需求</th><th>安全库存</th><th>计划生产</th><th>期初库存</th><th>产出量</th><th>期末库存</th><th>缺货量</th><th>服务水平</th></tr></thead><tbody>';
    state.production_mps_table.forEach(row => {
      html += `<tr><td>${row.period_label}</td><td>${row.demand_forecast}</td><td>${row.safety_stock}</td><td>${row.planned_production}</td><td>${row.beginning_inventory}</td><td>${row.production_output}</td><td>${row.ending_inventory}</td><td>${row.stockout}</td><td>${(row.service_level * 100).toFixed(1)}%</td></tr>`;
    });
    html += '</tbody></table>';

    // 添加汇总统计
    const totalDemand = state.production_mps_table.reduce((sum, row) => sum + row.demand_forecast, 0);
    const totalProduction = state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0);
    const avgServiceLevel = state.production_mps_table.reduce((sum, row) => sum + row.service_level, 0) / state.production_mps_table.length;
    html += '<h3>计划汇总统计</h3><table>';
    html += `<tr><td>总预测需求</td><td>${totalDemand.toLocaleString()} 件</td></tr>`;
    html += `<tr><td>总产出量</td><td>${totalProduction.toLocaleString()} 件</td></tr>`;
    html += `<tr><td>平均服务水平</td><td>${(avgServiceLevel * 100).toFixed(1)}%</td></tr>`;
    html += `<tr><td>供需匹配率</td><td>${((totalProduction / totalDemand) * 100).toFixed(1)}%</td></tr></table>`;

    return html;
  };

  const handleSave = async () => {
    if (!state.experiment_id) {
      setSubmitError('实验ID不存在，无法提交报告');
      return;
    }
    if (Object.values({ dataAnalysis, modelComparisonAnalysis, modelSelectionAnalysis, planParamsAnalysis, planDecisionAnalysis }).some(v => !v.trim())) {
      setShowValidationErrorModal(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const modelLabels: Record<SelectedBestModel, string> = { ma: '移动平均法', exp: '指数平滑法', arima: 'ARIMA模型', lstm: 'LSTM神经网络', ensemble_weighted: '加权平均融合', ensemble_boosting: 'Boosting融合', ensemble_stacking: 'Stacking融合' };
      const renderValue = (val: number | null | undefined, precision = 4) => val !== null && val !== undefined ? val.toFixed(precision) : 'N/A';

      const formatDate = (dateString: string | null): string => {
        if (!dateString) return '未知';
        try {
          return new Date(dateString).toLocaleString('zh-CN', { hour12: false });
        } catch {
          return '未知';
        }
      };
      const currentDate = new Date().toLocaleString('zh-CN', { hour12: false });

      const markdownContent = `# ${userInfo?.full_name || '学生'}的实验报告

## 报告信息

- **学生姓名**: ${userInfo?.full_name || '未知'}
- **学生ID**: ${state.student_id || '未知'}
- **实验ID**: ${state.experiment_id || '未知'}
- **实验开始时间**: ${formatDate(state.start_time)}
- **报告生成时间**: ${currentDate}

---

## 一、实验概述

| 项目 | 内容 |
|------|------|
| 行业 | ${state.selected_industry || 'N/A'} |
| 公司 | ${state.selected_company || 'N/A'} |
| 产品 | ${state.selected_product || 'N/A'} |

${dataAnalysis}

---

## 二、模型性能对比

| 模型 | 参数 | RMSE | MAE | R² |
|------|------|------|-----|-----|
${allModels.map(m => `| ${m.name} | ${m.params} | ${renderValue(m.rmse)} | ${renderValue(m.mae)} | ${renderValue(m.r2)} |`).join('\n')}

${modelComparisonAnalysis}

---

## 三、最优模型选择

| 指标 | 值 |
|------|-----|
| 选定模型 | ${state.selected_best_model ? modelLabels[state.selected_best_model] : 'N/A'} |
| RMSE | ${renderValue(bestModelMetrics?.rmse)} |
| MAE | ${renderValue(bestModelMetrics?.mae)} |
| R² | ${renderValue(bestModelMetrics?.r2)} |

${modelSelectionAnalysis}

---

## 四、生产计划参数计算结果

> 💡 以下是您在学习过程中逐步计算出的**期2（学习演示期）**的各项参数

${(() => {
const period2 = state.production_mps_table.length > 1 ? state.production_mps_table[1] : null;
if (!period2) return '暂无期2数据';
return `### 基础生产变量

| 项目 | 值 | 说明 |
|------|-----|------|
| 需求预测 | ${period2.demand_forecast} 件 | 来源: ${state.selected_best_model ? modelLabels[state.selected_best_model] : ''} 模型 |
| 产出量 | ${period2.production_output} 件 | 您手动输入的生产量 |
| 期初库存 | ${period2.beginning_inventory} 件 | 继承自期1的期末库存 |
| 期末库存 | ${period2.ending_inventory} 件 | = 期初 + 产出 - 需求 |
| 缺货量 | ${period2.stockout} 件 | 期末库存为负时的绝对值 |

### 服务水平

| 项目 | 值 | 说明 |
|------|-----|------|
| 服务水平 | ${(period2.service_level * 100).toFixed(1)}% | = 1 - (${period2.stockout} / ${period2.demand_forecast}) |
| 目标对比 | 实际 ${(period2.service_level * 100).toFixed(1)}% vs 目标 ${((state.production_target_service_level || 0.99) * 100).toFixed(0)}% | ${period2.service_level >= (state.production_target_service_level || 0.99) ? '✓ 达标' : '✗ 未达标'} |

### 安全库存与预测量

| 项目 | 值 | 说明 |
|------|-----|------|
| 安全库存 | ${period2.safety_stock} 件 | = Z值 ${state.production_safety_stock_z_score || 2.33} × 标准差 |
| 预测量 | ${period2.demand_forecast + period2.safety_stock} 件 | = 需求 + 安全库存 |

### 计划生产

| 项目 | 值 | 说明 |
|------|-----|------|
| 计划生产 | ${period2.planned_production} 件 | = 预测量 - 期初库存 |`;
})()}

${planParamsAnalysis}

---

## 五、生产计划决策结果

> 📊 基于您在期2学习的参数计算方法，系统自动生成了完整的生产计划

| 周期 | 预测需求 | 安全库存 | 计划生产 | 期初库存 | 产出量 | 期末库存 | 缺货量 | 服务水平 |
|------|----------|----------|----------|----------|--------|----------|--------|----------|
${state.production_mps_table.map(row => `| ${row.period_label} | ${row.demand_forecast} | ${row.safety_stock} | ${row.planned_production} | ${row.beginning_inventory} | ${row.production_output} | ${row.ending_inventory} | ${row.stockout} | ${(row.service_level * 100).toFixed(1)}% |`).join('\n')}

### 计划汇总统计

| 指标 | 值 |
|------|-----|
| 总预测需求 | ${state.production_mps_table.reduce((sum, row) => sum + row.demand_forecast, 0).toLocaleString()} 件（${state.production_mps_table.length}期累计） |
| 总产出量 | ${state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0).toLocaleString()} 件（${state.production_mps_table.length}期累计） |
| 平均服务水平 | ${((state.production_mps_table.reduce((sum, row) => sum + row.service_level, 0) / state.production_mps_table.length) * 100).toFixed(1)}% |
| 产能利用率 | ${state.production_capacity ? ((state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0) / (state.production_capacity * state.production_mps_table.length)) * 100).toFixed(1) : 'N/A'}% |
| 总安全库存 | ${state.production_mps_table.reduce((sum, row) => sum + row.safety_stock, 0).toLocaleString()} 件（${state.production_mps_table.length}期累计） |
| 总缺货量 | ${state.production_mps_table.reduce((sum, row) => sum + row.stockout, 0).toLocaleString()} 件（${state.production_mps_table.filter(row => row.stockout > 0).length}/${state.production_mps_table.length}期缺货） |
| 平均期末库存 | ${Math.round(state.production_mps_table.reduce((sum, row) => sum + row.ending_inventory, 0) / state.production_mps_table.length).toLocaleString()} 件 |
| 供需匹配率 | ${((state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0) / state.production_mps_table.reduce((sum, row) => sum + row.demand_forecast, 0)) * 100).toFixed(1)}% |

${planDecisionAnalysis}`;

      // Markdown 文本直接发送，无需 base64 编码
      const response = await apiClient.post<{ message: string; report_id: number; pdf_path: string }>(`/experiment-runs/${state.experiment_id}/report`, {
        report_content: markdownContent,
      });

      setSubmitSuccess(true);
      setPdfPath(response.pdf_path);
      const now = new Date().toISOString();
      await updateState({ status: 'Completed', last_activity_at: now, completion_time: now });
      setShowCompletionModal(true);

    } catch (error: any) {
      setSubmitError(error.message || '提交报告失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleLogout = () => {
    // localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const renderValue = (value: string | number | null | undefined) => value ?? <span className="text-gray-400">N/A</span>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center">
                <FileText className="w-9 h-9 mr-4 text-blue-600" />
                实验报告
              </h1>
              <p className="text-gray-600 mt-2">
                请根据实验结果，完成以下五个部分的分析，然后提交报告。
              </p>
            </div>
            <button onClick={() => navigate('/production')} disabled={showCompletionModal} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="返回">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="space-y-8">
          <ReportCard icon={<Database className="w-6 h-6 text-blue-600" />} title="一、实验概述" analysisKey="data" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <table className="w-full text-sm text-left text-gray-700">
              <tbody>
                <tr className="border-b"><td className="py-2 font-medium text-gray-500 w-1/4">行业</td><td className="py-2 font-semibold">{renderValue(state.selected_industry)}</td></tr>
                <tr className="border-b"><td className="py-2 font-medium text-gray-500">公司</td><td className="py-2 font-semibold">{renderValue(state.selected_company)}</td></tr>
                <tr><td className="py-2 font-medium text-gray-500">产品</td><td className="py-2 font-semibold">{renderValue(state.selected_product)}</td></tr>
              </tbody>
            </table>
          </ReportCard>

          <ReportCard icon={<Brain className="w-6 h-6 text-purple-600" />} title="二、模型性能对比" analysisKey="comparison" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-3 font-semibold">模型</th><th className="p-3 font-semibold">参数</th>
                    <th className="p-3 font-semibold">RMSE</th><th className="p-3 font-semibold">MAE</th><th className="p-3 font-semibold">R²</th>
                  </tr>
                </thead>
                <tbody>
                  {allModels.map((m, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-medium">{m.name}</td><td className="p-3 font-mono text-xs">{m.params}</td>
                      <td className="p-3">{renderValue(m.rmse?.toFixed(4))}</td><td className="p-3">{renderValue(m.mae?.toFixed(4))}</td><td className="p-3">{renderValue(m.r2?.toFixed(4))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportCard>

          <ReportCard icon={<TrendingUp className="w-6 h-6 text-green-600" />} title="三、最优模型选择" analysisKey="selection" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <table className="w-full text-sm text-left text-gray-700">
              <tbody>
                <tr className="border-b"><td className="py-2 font-medium text-gray-500 w-1/4">选定模型</td><td className="py-2 font-semibold">{renderValue(state.selected_best_model ? { ma: '移动平均', exp: '指数平滑', arima: 'ARIMA', lstm: 'LSTM', ensemble_weighted: '加权融合', ensemble_boosting: 'Boosting融合', ensemble_stacking: 'Stacking融合' }[state.selected_best_model] : null)}</td></tr>
                <tr className="border-b"><td className="py-2 font-medium text-gray-500">RMSE</td><td className="py-2 font-semibold">{renderValue(bestModelMetrics?.rmse?.toFixed(4))}</td></tr>
                <tr className="border-b"><td className="py-2 font-medium text-gray-500">MAE</td><td className="py-2 font-semibold">{renderValue(bestModelMetrics?.mae?.toFixed(4))}</td></tr>
                <tr><td className="py-2 font-medium text-gray-500">R²</td><td className="py-2 font-semibold">{renderValue(bestModelMetrics?.r2?.toFixed(4))}</td></tr>
              </tbody>
            </table>
          </ReportCard>

          <ReportCard icon={<Calculator className="w-6 h-6 text-orange-600" />} title="四、生产计划参数计算结果" analysisKey="params" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <div className="space-y-4">
              {/* 提示说明 */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-sm text-blue-800">
                  💡 以下是您在学习过程中逐步计算出的<strong>期2（学习演示期）</strong>的各项参数，展示了 MPS 参数的完整计算过程。
                </p>
              </div>

              {(() => {
                // 提取期2的数据（索引为1）
                const period2 = state.production_mps_table.length > 1 ? state.production_mps_table[1] : null;
                const targetServiceLevel = state.production_target_service_level || 0.99;
                const zScore = state.production_safety_stock_z_score || 2.33;

                if (!period2) {
                  return <div className="text-gray-500 text-sm">暂无期2数据</div>;
                }

                const isServiceLevelMet = period2.service_level >= targetServiceLevel;
                const demandForecast = period2.demand_forecast;
                const productionOutput = period2.production_output;
                const beginningInventory = period2.beginning_inventory;
                const endingInventory = period2.ending_inventory;
                const stockout = period2.stockout;
                const serviceLevel = period2.service_level;
                const safetyStock = period2.safety_stock;
                const forecastQuantity = demandForecast + safetyStock;
                const plannedProduction = period2.planned_production;

                return (
                  <div className="space-y-4">
                    {/* 基础生产变量 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        基础生产变量
                      </h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b"><td className="py-2 text-gray-600 w-1/3">需求预测</td><td className="py-2 font-semibold">{demandForecast.toLocaleString()} 件</td><td className="py-2 text-xs text-gray-500">来源: {state.selected_best_model ? { ma: '移动平均', exp: '指数平滑', arima: 'ARIMA', lstm: 'LSTM', ensemble_weighted: '加权融合', ensemble_boosting: 'Boosting融合', ensemble_stacking: 'Stacking融合' }[state.selected_best_model] : ''} 模型预测</td></tr>
                          <tr className="border-b"><td className="py-2 text-gray-600">产出量</td><td className="py-2 font-semibold">{productionOutput.toLocaleString()} 件</td><td className="py-2 text-xs text-gray-500">您手动输入的生产量</td></tr>
                          <tr className="border-b"><td className="py-2 text-gray-600">期初库存</td><td className="py-2 font-semibold">{beginningInventory.toLocaleString()} 件</td><td className="py-2 text-xs text-gray-500">继承自期1的期末库存</td></tr>
                          <tr className="border-b"><td className="py-2 text-gray-600">期末库存</td><td className="py-2 font-semibold">{endingInventory.toLocaleString()} 件</td><td className="py-2 text-xs text-gray-500">= 期初 + 产出 - 需求</td></tr>
                          <tr><td className="py-2 text-gray-600">缺货量</td><td className="py-2 font-semibold"><span className={stockout > 0 ? 'text-red-600' : ''}>{stockout.toLocaleString()} 件</span></td><td className="py-2 text-xs text-gray-500">期末库存为负时的绝对值</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 服务水平 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        服务水平
                      </h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600 w-1/3">服务水平</td>
                            <td className="py-2 font-semibold">
                              <span className={isServiceLevelMet ? 'text-green-600' : 'text-red-600'}>
                                {(serviceLevel * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2 text-xs text-gray-500">= 1 - (缺货量 / 需求) = 1 - ({stockout} / {demandForecast})</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-600">目标对比</td>
                            <td className="py-2 font-semibold" colSpan={2}>
                              实际 {(serviceLevel * 100).toFixed(1)}% vs 目标 {(targetServiceLevel * 100).toFixed(0)}%
                              <span className={`ml-2 ${isServiceLevelMet ? 'text-green-600' : 'text-red-600'}`}>
                                {isServiceLevelMet ? '✓ 达标' : '✗ 未达标'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 安全库存与预测量 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        安全库存与预测量
                      </h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 text-gray-600 w-1/3">安全库存</td>
                            <td className="py-2 font-semibold">{safetyStock.toLocaleString()} 件</td>
                            <td className="py-2 text-xs text-gray-500">
                              = Z值 {zScore} × 标准差 {secondForecastStdDev !== undefined ? secondForecastStdDev.toFixed(2) : '?'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-600">预测量</td>
                            <td className="py-2 font-semibold">{forecastQuantity.toLocaleString()} 件</td>
                            <td className="py-2 text-xs text-gray-500">= 需求预测 {demandForecast.toLocaleString()} + 安全库存 {safetyStock.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 计划生产 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        计划生产（投入量）
                      </h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-2 text-gray-600 w-1/3">计划生产</td>
                            <td className="py-2 font-semibold">{plannedProduction.toLocaleString()} 件</td>
                            <td className="py-2 text-xs text-gray-500">= 预测量 {forecastQuantity.toLocaleString()} - 期初库存 {beginningInventory.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 学习要点 */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-4 rounded">
                      <h4 className="text-sm font-semibold text-purple-900 mb-2">🔍 学习要点</h4>
                      <ul className="text-sm text-purple-800 space-y-1">
                        <li>• 您在 Step2 设置的产出量（{productionOutput.toLocaleString()} 件）{stockout > 0 ? `导致了缺货（${stockout.toLocaleString()} 件）` : '满足了需求'}</li>
                        <li>• {stockout > 0 ? `缺货直接影响了服务水平，从目标 ${(targetServiceLevel * 100).toFixed(0)}% 降至 ${(serviceLevel * 100).toFixed(1)}%` : '服务水平达标，满足了客户需求'}</li>
                        <li>• 通过这个演示期，您学习了需求预测、库存、产出、缺货、服务水平等参数之间的因果关系</li>
                        <li>• 安全库存（{safetyStock.toLocaleString()} 件）用于应对需求波动，基于统计学原理计算（Z值法）</li>
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          </ReportCard>

          <ReportCard icon={<ClipboardList className="w-6 h-6 text-indigo-600" />} title="五、生产计划决策结果" analysisKey="decision" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <div className="space-y-4">
              {/* 提示说明 */}
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-sm text-green-800">
                  📊 基于您在期2学习的参数计算方法，系统自动生成了完整的 <strong>{state.production_forecast_periods || 6} 期生产计划</strong>，这是最终的生产决策结果。
                </p>
              </div>

              {/* MPS表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 text-xs">
                    <tr>
                      {['周期', '预测需求', '安全库存', '计划生产', '期初库存', '产出量', '期末库存', '缺货量', '服务水平'].map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {state.production_mps_table.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{row.period_label}</td>
                        <td className="p-2">{row.demand_forecast}</td>
                        <td className="p-2">{row.safety_stock}</td>
                        <td className="p-2">{row.planned_production}</td>
                        <td className="p-2">{row.beginning_inventory}</td>
                        <td className="p-2">{row.production_output}</td>
                        <td className="p-2">{row.ending_inventory}</td>
                        <td className="p-2">{row.stockout > 0 ? <span className="text-red-600 font-semibold">{row.stockout}</span> : row.stockout}</td>
                        <td className="p-2">{`${(row.service_level * 100).toFixed(1)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 计划汇总统计 */}
              {state.production_mps_table.length > 0 && (() => {
                const totalPeriods = state.production_mps_table.length;
                const totalDemand = state.production_mps_table.reduce((sum, row) => sum + row.demand_forecast, 0);
                const totalSafetyStock = state.production_mps_table.reduce((sum, row) => sum + row.safety_stock, 0);
                const totalPlannedProduction = state.production_mps_table.reduce((sum, row) => sum + row.planned_production, 0);
                const totalProduction = state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0);
                const totalStockout = state.production_mps_table.reduce((sum, row) => sum + row.stockout, 0);
                const avgServiceLevel = state.production_mps_table.reduce((sum, row) => sum + row.service_level, 0) / totalPeriods;
                const avgInventory = state.production_mps_table.reduce((sum, row) => sum + row.ending_inventory, 0) / totalPeriods;
                const periodsWithStockout = state.production_mps_table.filter(row => row.stockout > 0).length;
                const capacityUtilization = state.production_capacity ? (totalProduction / (state.production_capacity * totalPeriods)) : 0;

                return (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 计划汇总统计</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">总预测需求</div>
                        <div className="text-lg font-bold text-blue-600">{totalDemand.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">{totalPeriods}期累计</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">总产出量</div>
                        <div className="text-lg font-bold text-green-600">{totalProduction.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">{totalPeriods}期累计</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">平均服务水平</div>
                        <div className={`text-lg font-bold ${avgServiceLevel >= 0.95 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {(avgServiceLevel * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400">{avgServiceLevel >= 0.95 ? '✓ 达标' : '⚠ 偏低'}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">产能利用率</div>
                        <div className={`text-lg font-bold ${capacityUtilization > 0.9 ? 'text-red-600' : capacityUtilization > 0.7 ? 'text-green-600' : 'text-blue-600'}`}>
                          {(capacityUtilization * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400">{capacityUtilization > 0.9 ? '⚠ 接近满载' : '正常'}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">总安全库存</div>
                        <div className="text-lg font-bold text-purple-600">{totalSafetyStock.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">{totalPeriods}期累计</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">总缺货量</div>
                        <div className={`text-lg font-bold ${totalStockout > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {totalStockout.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{periodsWithStockout}/{totalPeriods}期缺货</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">平均期末库存</div>
                        <div className="text-lg font-bold text-indigo-600">{Math.round(avgInventory).toLocaleString()}</div>
                        <div className="text-xs text-gray-400">平均值</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">供需匹配率</div>
                        <div className="text-lg font-bold text-teal-600">{((totalProduction / totalDemand) * 100).toFixed(1)}%</div>
                        <div className="text-xs text-gray-400">产出/需求</div>
                      </div>
                    </div>

                    {/* 决策质量评估 */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">🎯 决策质量评估</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start">
                          <span className={`mr-2 ${avgServiceLevel >= (state.production_target_service_level || 0.99) ? 'text-green-600' : 'text-yellow-600'}`}>
                            {avgServiceLevel >= (state.production_target_service_level || 0.99) ? '✓' : '⚠'}
                          </span>
                          <div>
                            <span className="font-medium">服务水平：</span>
                            平均 {(avgServiceLevel * 100).toFixed(1)}%，
                            {avgServiceLevel >= (state.production_target_service_level || 0.99)
                              ? `达到目标 ${((state.production_target_service_level || 0.99) * 100).toFixed(0)}%`
                              : `未达目标 ${((state.production_target_service_level || 0.99) * 100).toFixed(0)}%（差距 ${(((state.production_target_service_level || 0.99) - avgServiceLevel) * 100).toFixed(1)}%）`
                            }
                          </div>
                        </div>
                        <div className="flex items-start">
                          <span className={`mr-2 ${capacityUtilization >= 0.6 && capacityUtilization <= 0.85 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {capacityUtilization >= 0.6 && capacityUtilization <= 0.85 ? '✓' : '⚠'}
                          </span>
                          <div>
                            <span className="font-medium">产能利用率：</span>
                            {(capacityUtilization * 100).toFixed(1)}%，
                            {capacityUtilization > 0.9 ? '接近满载，存在产能瓶颈风险' :
                             capacityUtilization > 0.7 ? '合理水平，有适当余量' :
                             '偏低，可能存在产能浪费'}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <span className={`mr-2 ${totalStockout === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totalStockout === 0 ? '✓' : '✗'}
                          </span>
                          <div>
                            <span className="font-medium">缺货控制：</span>
                            {totalStockout === 0
                              ? '完美，无缺货发生'
                              : `${periodsWithStockout} 个期次出现缺货，总缺货量 ${totalStockout.toLocaleString()} 件`
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 问题识别与优化建议 */}
                    {(totalStockout > 0 || avgServiceLevel < (state.production_target_service_level || 0.99)) && (
                      <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                        <h4 className="text-sm font-semibold text-amber-900 mb-2">💡 优化建议</h4>
                        <ul className="text-sm text-amber-800 space-y-1">
                          {totalStockout > 0 && (
                            <>
                              <li>• <strong>缺货问题：</strong>
                                {(() => {
                                  const stockoutPeriods = state.production_mps_table
                                    .filter(row => row.stockout > 0)
                                    .map(row => `期${row.period}(${row.stockout}件)`)
                                    .join('、');
                                  return `${stockoutPeriods} 出现缺货`;
                                })()}
                              </li>
                              <li>• <strong>根因分析：</strong>
                                {capacityUtilization > 0.85
                                  ? '产能约束是主要瓶颈，建议调整产能场景'
                                  : '可能由于期2的初始缺货导致后续期次库存恢复困难'
                                }
                              </li>
                            </>
                          )}
                          {avgServiceLevel < (state.production_target_service_level || 0.99) && (
                            <li>• <strong>短期措施：</strong>
                              {state.production_capacity_scenario === 'tight'
                                ? '将产能场景从 tight 调整为 normal 或 abundant，预计可提升服务水平 10-15%'
                                : state.production_capacity_scenario === 'normal'
                                ? '将产能场景调整为 abundant，或适当增加安全库存系数'
                                : '优化期2的手动生产量设置，避免初始缺货'
                              }
                            </li>
                          )}
                          {capacityUtilization < 0.6 && (
                            <li>• <strong>成本优化：</strong>
                              产能利用率较低（{(capacityUtilization * 100).toFixed(1)}%），考虑降低产能配置以减少成本
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* 完美计划提示 */}
                    {totalStockout === 0 && avgServiceLevel >= (state.production_target_service_level || 0.99) && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-500 rounded">
                        <h4 className="text-sm font-semibold text-green-900 mb-2">🎉 计划质量优秀</h4>
                        <p className="text-sm text-green-800">
                          恭喜！您的生产计划达到了目标服务水平（{((state.production_target_service_level || 0.99) * 100).toFixed(0)}%），
                          且无缺货发生，产能利用率为 {(capacityUtilization * 100).toFixed(1)}%。
                          这是一个平衡了服务水平和成本效率的优质计划。
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </ReportCard>

          <div className="pt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSubmitting || submitSuccess}
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />提交中...</> : (submitSuccess ? <><CheckCircle className="w-5 h-5 mr-2" />已提交</> : <><Save className="w-5 h-5 mr-2" />保存并提交报告</>)}
            </button>
          </div>
          {submitError && <p className="text-right text-red-600 mt-4">{submitError}</p>}
        </main>
      </div>

      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">恭喜！实验完成</h2>
            <p className="text-gray-600 mb-6">您的实验报告已成功提交并保存。</p>
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                退出登录 ({countdown})
              </button>
            </div>
          </div>
        </div>
      )}

      {showValidationErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <AlertTriangle className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">内容不完整</h2>
            <p className="text-gray-600 mb-6">
              请检查并确保所有部分的分析内容都已填写。
            </p>
            <button
              onClick={() => setShowValidationErrorModal(false)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              返回修改
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperimentReport;
