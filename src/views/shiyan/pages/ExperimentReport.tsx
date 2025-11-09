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
    html += '<table><thead><tr><th>周期</th><th>预测需求</th><th>安全库存</th><th>计划生产</th><th>期初库存</th><th>产出量</th><th>期末库存</th><th>缺货量</th><th>服务水平</th></tr></thead><tbody>';
    state.production_mps_table.forEach(row => {
      html += `<tr><td>${row.period_label}</td><td>${row.demand_forecast}</td><td>${row.safety_stock}</td><td>${row.planned_production}</td><td>${row.beginning_inventory}</td><td>${row.production_output}</td><td>${row.ending_inventory}</td><td>${row.stockout}</td><td>${(row.service_level * 100).toFixed(1)}%</td></tr>`;
    });
    html += '</tbody></table>';

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

${(() => {
const period2 = state.production_mps_table.length > 1 ? state.production_mps_table[1] : null;
if (!period2) return `**📝 说明：生产计划数据未保存**

以下是生产计划关键参数的参考说明：

| 参数名称 | 计算公式 | 说明 |
|---------|---------|------|
| 需求预测 | 模型预测值 | 使用选定的最佳预测模型生成 |
| 安全库存 | Z × σ | Z值（通常2.33）乘以需求标准差 |
| 预测量 | 需求 + 安全库存 | 总需求量（包含缓冲） |
| 计划生产 | 预测量 - 期初库存 | 本期应投入的生产量 |
| 产出量 | min(上期投入, 产能) | 受产能约束的实际产出 |
| 期末库存 | 期初 + 产出 - 需求 | 本期结束后的库存 |
| 缺货量 | max(0, -期末库存) | 未满足的需求量 |
| 服务水平 | 1 - (缺货/需求) | 满足需求的比例 |

**核心概念：**
- **提前期：** 从投入生产到产出的时间间隔（本系统为1期）
- **安全库存：** 用于应对需求波动，基于服务水平目标和需求不确定性计算
- **产能约束：** 实际产出不能超过生产能力上限`;
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

${state.production_mps_table.length > 0 ? `| 周期 | 预测需求 | 安全库存 | 计划生产 | 期初库存 | 产出量 | 期末库存 | 缺货量 | 服务水平 |
|------|----------|----------|----------|----------|--------|----------|--------|----------|
${state.production_mps_table.map(row => `| ${row.period_label} | ${row.demand_forecast} | ${row.safety_stock} | ${row.planned_production} | ${row.beginning_inventory} | ${row.production_output} | ${row.ending_inventory} | ${row.stockout} | ${(row.service_level * 100).toFixed(1)}% |`).join('\n')}` : `**📝 说明：生产计划数据未保存**

以下是 MPS（主生产计划）表格结构的参考说明：

### MPS 表格列说明

| 列名 | 含义 | 计算方法 |
|------|------|----------|
| 周期 | 时间期次 | 期1、期2、...、期N |
| 预测需求 | 市场需求预测值 | 由预测模型生成 |
| 安全库存 | 应对不确定性的缓冲库存 | Z × 需求标准差 |
| 计划生产 | 本期计划投入的生产量 | 预测量 - 期初库存 |
| 期初库存 | 期初的可用库存 | 上期期末库存 |
| 产出量 | 本期实际产出 | min(上期投入, 产能) |
| 期末库存 | 期末剩余库存 | 期初 + 产出 - 需求 |
| 缺货量 | 未满足的需求 | max(0, -期末库存) |
| 服务水平 | 需求满足率 | 1 - (缺货/需求) |`}

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
            {(() => {
              // 提取期2的数据（索引为1）
              const period2 = state.production_mps_table.length > 1 ? state.production_mps_table[1] : null;
              const targetServiceLevel = state.production_target_service_level || 0.99;
              const zScore = state.production_safety_stock_z_score || 2.33;

              if (!period2) {
                return (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="py-2 px-3 text-left text-gray-600 font-semibold">参数名称</th>
                        <th className="py-2 px-3 text-left text-gray-600 font-semibold">计算公式</th>
                        <th className="py-2 px-3 text-left text-gray-600 font-semibold">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3 text-gray-700">需求预测</td>
                        <td className="py-2 px-3 font-mono text-xs">模型预测值</td>
                        <td className="py-2 px-3 text-xs text-gray-500">使用选定的最佳预测模型生成</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 text-gray-700">安全库存</td>
                        <td className="py-2 px-3 font-mono text-xs">Z × σ</td>
                        <td className="py-2 px-3 text-xs text-gray-500">Z值（通常2.33）乘以需求标准差</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 text-gray-700">预测量</td>
                        <td className="py-2 px-3 font-mono text-xs">需求 + 安全库存</td>
                        <td className="py-2 px-3 text-xs text-gray-500">总需求量（包含缓冲）</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 text-gray-700">计划生产</td>
                        <td className="py-2 px-3 font-mono text-xs">预测量 - 期初库存</td>
                        <td className="py-2 px-3 text-xs text-gray-500">本期应投入的生产量</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 text-gray-700">产出量</td>
                        <td className="py-2 px-3 font-mono text-xs">min(上期投入, 产能)</td>
                        <td className="py-2 px-3 text-xs text-gray-500">受产能约束的实际产出</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 text-gray-700">期末库存</td>
                        <td className="py-2 px-3 font-mono text-xs">期初 + 产出 - 需求</td>
                        <td className="py-2 px-3 text-xs text-gray-500">本期结束后的库存</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3 text-gray-700">缺货量</td>
                        <td className="py-2 px-3 font-mono text-xs">max(0, -期末库存)</td>
                        <td className="py-2 px-3 text-xs text-gray-500">未满足的需求量</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-gray-700">服务水平</td>
                        <td className="py-2 px-3 font-mono text-xs">1 - (缺货/需求)</td>
                        <td className="py-2 px-3 text-xs text-gray-500">满足需求的比例</td>
                      </tr>
                    </tbody>
                  </table>
                );
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
                  </div>
                );
              })()}
            </div>
          </ReportCard>

          <ReportCard icon={<ClipboardList className="w-6 h-6 text-indigo-600" />} title="五、生产计划决策结果" analysisKey="decision" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <div className="space-y-4">
              {state.production_mps_table.length > 0 ? (
                <>
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
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">MPS 表格结构说明</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      主生产计划（MPS）表格通常包含以下列，按时间周期（通常为月度）展示：
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-100">
                          <tr className="border-b">
                            <th className="p-2 text-left text-gray-600 font-semibold">列名</th>
                            <th className="p-2 text-left text-gray-600 font-semibold">含义</th>
                            <th className="p-2 text-left text-gray-600 font-semibold">计算方法</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          <tr className="border-b">
                            <td className="p-2">周期</td>
                            <td className="p-2">时间期次</td>
                            <td className="p-2 text-xs text-gray-500">期1、期2、...、期N</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">预测需求</td>
                            <td className="p-2">市场需求预测值</td>
                            <td className="p-2 text-xs text-gray-500">由预测模型生成</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">安全库存</td>
                            <td className="p-2">应对不确定性的缓冲库存</td>
                            <td className="p-2 text-xs text-gray-500">Z × 需求标准差</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">计划生产</td>
                            <td className="p-2">本期计划投入的生产量</td>
                            <td className="p-2 text-xs text-gray-500">预测量 - 期初库存</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">期初库存</td>
                            <td className="p-2">期初的可用库存</td>
                            <td className="p-2 text-xs text-gray-500">上期期末库存</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">产出量</td>
                            <td className="p-2">本期实际产出</td>
                            <td className="p-2 text-xs text-gray-500">min(上期投入, 产能)</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">期末库存</td>
                            <td className="p-2">期末剩余库存</td>
                            <td className="p-2 text-xs text-gray-500">期初 + 产出 - 需求</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">缺货量</td>
                            <td className="p-2">未满足的需求</td>
                            <td className="p-2 text-xs text-gray-500">max(0, -期末库存)</td>
                          </tr>
                          <tr>
                            <td className="p-2">服务水平</td>
                            <td className="p-2">需求满足率</td>
                            <td className="p-2 text-xs text-gray-500">1 - (缺货/需求)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
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
