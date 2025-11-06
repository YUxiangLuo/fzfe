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

    html += '<h2>四、生产计划参数</h2><h3>基础参数</h3><table>';
    html += `<tr><td>预测期数</td><td>${state.production_forecast_periods || 'N/A'}</td></tr>`;
    html += `<tr><td>期初库存</td><td>${state.production_initial_inventory?.toLocaleString() || 'N/A'}</td></tr>`;
    html += `<tr><td>目标服务水平</td><td>${state.production_target_service_level ? (state.production_target_service_level * 100).toFixed(0) + '%' : 'N/A'}</td></tr>`;
    html += `<tr><td>安全库存Z值</td><td>${state.production_safety_stock_z_score?.toFixed(2) || 'N/A'}</td></tr></table>`;
    html += '<h3>产能约束配置</h3><table>';
    html += `<tr><td>产能场景</td><td>${
      state.production_capacity_scenario === 'tight' ? '产能紧张 (90%)' :
      state.production_capacity_scenario === 'normal' ? '产能正常 (130%)' :
      state.production_capacity_scenario === 'abundant' ? '产能充裕 (180%)' : 'N/A'
    }</td></tr>`;
    html += `<tr><td>实际产能值</td><td>${state.production_capacity?.toLocaleString() || 'N/A'} 件/期</td></tr>`;
    html += `<tr><td>产能模式</td><td>${
      state.production_capacity_mode === 'scenario' ? '场景选择' :
      state.production_capacity_mode === 'auto' ? '自动计算' :
      state.production_capacity_mode === 'custom' ? '自定义产能' : 'N/A'
    }</td></tr></table>`;

    html += '<h2>五、主生产计划 (MPS)</h2><table><thead><tr><th>周期</th><th>预测需求</th><th>安全库存</th><th>计划生产</th><th>期初库存</th><th>产出量</th><th>期末库存</th><th>缺货量</th><th>服务水平</th></tr></thead><tbody>';
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

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <title>实验报告</title>
          <style>
            body { font-family: 'SimSun', serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 40px auto; padding-left: 30px; padding-right: 30px; box-sizing: border-box; }
            h1, h2, h3 { color: #1a202c; }
            h1 { text-align: center; font-size: 24px; }
            h2 { font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; }
            .report-meta { text-align: center; margin-bottom: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0; }
            .report-meta table { margin: 0 auto; border-collapse: collapse; }
            .report-meta td { padding: 8px 15px; text-align: left; font-size: 14px; color: #555; border: none; }
            .report-meta .label { font-weight: bold; color: #333; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e0; padding: 8px; text-align: left; font-size: 14px; }
            th { background-color: #f7fafc; }
            .analysis { margin-top: 16px; text-indent: 2em; }
          </style>
        </head>
        <body>
          <h1>${userInfo?.full_name || '学生'}的实验报告</h1>
          
          <div class="report-meta">
            <table>
              <tr>
                <td class="label">学生姓名：</td><td>${userInfo?.full_name || '未知'}</td>
                <td class="label">学生ID：</td><td>${state.student_id || '未知'}</td>
              </tr>
              <tr>
                <td class="label">实验ID：</td><td>${state.experiment_id || '未知'}</td>
                <td class="label">实验开始时间：</td><td>${formatDate(state.start_time)}</td>
              </tr>
              <tr>
                <td class="label">报告生成时间：</td><td colspan="3">${currentDate}</td>
              </tr>
            </table>
          </div>

          <h2>一、实验概述</h2>
          <table>
            <tr><th>行业</th><td>${state.selected_industry || 'N/A'}</td></tr>
            <tr><th>公司</th><td>${state.selected_company || 'N/A'}</td></tr>
            <tr><th>产品</th><td>${state.selected_product || 'N/A'}</td></tr>
          </table>
          <p class="analysis">${dataAnalysis}</p>

          <h2>二、模型性能对比</h2>
          <table>
            <thead><tr><th>模型</th><th>参数</th><th>RMSE</th><th>MAE</th><th>R²</th></tr></thead>
            <tbody>
              ${allModels.map(m => `
                <tr>
                  <td>${m.name}</td>
                  <td>${m.params}</td>
                  <td>${renderValue(m.rmse)}</td>
                  <td>${renderValue(m.mae)}</td>
                  <td>${renderValue(m.r2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="analysis">${modelComparisonAnalysis}</p>

          <h2>三、最优模型选择</h2>
          <table>
            <tr><th>选定模型</th><td>${state.selected_best_model ? modelLabels[state.selected_best_model] : 'N/A'}</td></tr>
            <tr><th>RMSE</th><td>${renderValue(bestModelMetrics?.rmse)}</td></tr>
            <tr><th>MAE</th><td>${renderValue(bestModelMetrics?.mae)}</td></tr>
            <tr><th>R²</th><td>${renderValue(bestModelMetrics?.r2)}</td></tr>
          </table>
          <p class="analysis">${modelSelectionAnalysis}</p>

          <h2>四、生产计划参数</h2>
          <h3>基础参数</h3>
          <table>
            <tr><th>预测期数</th><td>${state.production_forecast_periods || 'N/A'}</td></tr>
            <tr><th>期初库存</th><td>${state.production_initial_inventory?.toLocaleString() || 'N/A'}</td></tr>
            <tr><th>目标服务水平</th><td>${state.production_target_service_level ? `${(state.production_target_service_level * 100).toFixed(0)}%` : 'N/A'}</td></tr>
            <tr><th>安全库存Z值</th><td>${state.production_safety_stock_z_score?.toFixed(2) || 'N/A'}</td></tr>
          </table>
          <h3>产能约束配置</h3>
          <table>
            <tr><th>产能场景</th><td>${
              state.production_capacity_scenario === 'tight' ? '产能紧张 (90%)' :
              state.production_capacity_scenario === 'normal' ? '产能正常 (130%)' :
              state.production_capacity_scenario === 'abundant' ? '产能充裕 (180%)' : 'N/A'
            }</td></tr>
            <tr><th>实际产能值</th><td>${state.production_capacity?.toLocaleString() || 'N/A'} 件/期</td></tr>
            <tr><th>产能模式</th><td>${
              state.production_capacity_mode === 'scenario' ? '场景选择' :
              state.production_capacity_mode === 'auto' ? '自动计算' :
              state.production_capacity_mode === 'custom' ? '自定义产能' : 'N/A'
            }</td></tr>
          </table>
          <p class="analysis">${planParamsAnalysis}</p>

          <h2>五、主生产计划 (MPS)</h2>
          <table>
            <thead><tr><th>周期</th><th>预测需求</th><th>安全库存</th><th>计划生产</th><th>期初库存</th><th>产出量</th><th>期末库存</th><th>缺货量</th><th>服务水平</th></tr></thead>
            <tbody>
              ${state.production_mps_table.map(row => `
                <tr>
                  <td>${row.period_label}</td>
                  <td>${row.demand_forecast}</td>
                  <td>${row.safety_stock}</td>
                  <td>${row.planned_production}</td>
                  <td>${row.beginning_inventory}</td>
                  <td>${row.production_output}</td>
                  <td>${row.ending_inventory}</td>
                  <td>${row.stockout}</td>
                  <td>${(row.service_level * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h3>计划汇总统计</h3>
          <table>
            <tr><th>总预测需求</th><td>${state.production_mps_table.reduce((sum, row) => sum + row.demand_forecast, 0).toLocaleString()} 件（${state.production_mps_table.length}期累计）</td></tr>
            <tr><th>总产出量</th><td>${state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0).toLocaleString()} 件（${state.production_mps_table.length}期累计）</td></tr>
            <tr><th>平均服务水平</th><td>${((state.production_mps_table.reduce((sum, row) => sum + row.service_level, 0) / state.production_mps_table.length) * 100).toFixed(1)}%</td></tr>
            <tr><th>产能利用率</th><td>${state.production_capacity ? ((state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0) / (state.production_capacity * state.production_mps_table.length)) * 100).toFixed(1) : 'N/A'}%</td></tr>
            <tr><th>总安全库存</th><td>${state.production_mps_table.reduce((sum, row) => sum + row.safety_stock, 0).toLocaleString()} 件（${state.production_mps_table.length}期累计）</td></tr>
            <tr><th>总缺货量</th><td>${state.production_mps_table.reduce((sum, row) => sum + row.stockout, 0).toLocaleString()} 件（${state.production_mps_table.filter(row => row.stockout > 0).length}/${state.production_mps_table.length}期缺货）</td></tr>
            <tr><th>平均期末库存</th><td>${Math.round(state.production_mps_table.reduce((sum, row) => sum + row.ending_inventory, 0) / state.production_mps_table.length).toLocaleString()} 件</td></tr>
            <tr><th>供需匹配率</th><td>${((state.production_mps_table.reduce((sum, row) => sum + row.production_output, 0) / state.production_mps_table.reduce((sum, row) => sum + row.demand_forecast, 0)) * 100).toFixed(1)}%</td></tr>
          </table>
          <p class="analysis">${planDecisionAnalysis}</p>
        </body>
        </html>
      `;

      const base64Content = btoa(unescape(encodeURIComponent(htmlContent)));

      const response = await apiClient.post<{ message: string; report_id: number; pdf_path: string }>(`/experiment-runs/${state.experiment_id}/report`, {
        report_content: base64Content,
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

          <ReportCard icon={<Calculator className="w-6 h-6 text-orange-600" />} title="四、生产计划参数" analysisKey="params" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <div className="space-y-4">
              {/* 基础参数 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">基础参数</h3>
                <table className="w-full text-sm text-left text-gray-700">
                  <tbody>
                    <tr className="border-b"><td className="py-2 font-medium text-gray-500 w-1/2">预测期数</td><td className="py-2 font-semibold">{renderValue(state.production_forecast_periods)}</td></tr>
                    <tr className="border-b"><td className="py-2 font-medium text-gray-500">期初库存</td><td className="py-2 font-semibold">{renderValue(state.production_initial_inventory?.toLocaleString())}</td></tr>
                    <tr className="border-b"><td className="py-2 font-medium text-gray-500">目标服务水平</td><td className="py-2 font-semibold">{renderValue(state.production_target_service_level ? `${(state.production_target_service_level * 100).toFixed(0)}%` : null)}</td></tr>
                    <tr><td className="py-2 font-medium text-gray-500">安全库存Z值</td><td className="py-2 font-semibold">{renderValue(state.production_safety_stock_z_score?.toFixed(2))}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* 产能约束参数 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">产能约束配置</h3>
                <table className="w-full text-sm text-left text-gray-700">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 font-medium text-gray-500 w-1/2">产能场景</td>
                      <td className="py-2 font-semibold">
                        {state.production_capacity_scenario === 'tight' ? '产能紧张 (90%)' :
                         state.production_capacity_scenario === 'normal' ? '产能正常 (130%)' :
                         state.production_capacity_scenario === 'abundant' ? '产能充裕 (180%)' :
                         renderValue(null)}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium text-gray-500">实际产能值</td>
                      <td className="py-2 font-semibold">{renderValue(state.production_capacity?.toLocaleString())}<span className="text-xs text-gray-500 ml-1">件/期</span></td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-500">产能模式</td>
                      <td className="py-2 font-semibold">
                        {state.production_capacity_mode === 'scenario' ? '场景选择' :
                         state.production_capacity_mode === 'auto' ? '自动计算' :
                         state.production_capacity_mode === 'custom' ? '自定义产能' :
                         renderValue(null)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </ReportCard>

          <ReportCard icon={<ClipboardList className="w-6 h-6 text-indigo-600" />} title="五、主生产计划 (MPS)" analysisKey="decision" getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting}>
            <div className="space-y-4">
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
