import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext.zustand';
import { FileText, Save, Loader2, CheckCircle, X } from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';
import { validateAnalyses } from '../utils/reportValidation';

import { ExperimentOverview } from './report_components/ExperimentOverview';
import { ModelComparison } from './report_components/ModelComparison';
import { BestModelSelection } from './report_components/BestModelSelection';
import { PlanParameters } from './report_components/PlanParameters';
import { PlanDecisionResults } from './report_components/PlanDecisionResults';
import { CompletionModal, ValidationErrorModal } from './report_components/SubmissionModals';

interface UserSummary {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
}

const ExperimentReport: React.FC = () => {
  const { state, updateState, productSalesData } = useExperiment();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState<UserSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [countdown, setCountdown] = useState(8);

  // Analysis states
  const [dataAnalysis, setDataAnalysis] = useState('');
  const [modelComparisonAnalysis, setModelComparisonAnalysis] = useState('');
  const [modelSelectionAnalysis, setModelSelectionAnalysis] = useState('');
  const [planParamsAnalysis, setPlanParamsAnalysis] = useState('');
  const [planDecisionAnalysis, setPlanDecisionAnalysis] = useState('');

  // Effects for countdown, scrolling, and user info fetching
  useEffect(() => {
    if (showCompletionModal) {
      localStorage.removeItem('token');
      setCountdown(8);
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
      return () => clearInterval(timer);
    }
  }, [showCompletionModal]);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  // Analysis state management
  const analysisSetters: { [key: string]: React.Dispatch<React.SetStateAction<string>> } = {
    data: setDataAnalysis,
    comparison: setModelComparisonAnalysis,
    selection: setModelSelectionAnalysis,
    params: setPlanParamsAnalysis,
    decision: setPlanDecisionAnalysis,
  };
  const analysisValues: { [key: string]: string } = {
    data: dataAnalysis,
    comparison: modelComparisonAnalysis,
    selection: modelSelectionAnalysis,
    params: planParamsAnalysis,
    decision: planDecisionAnalysis,
  };
  const getAnalysisSetter = (key: string) => analysisSetters[key] || (() => {});
  const getAnalysisValue = (key: string) => analysisValues[key] || '';

  // Memoized data calculations
  const { trainingData, evaluationData } = useMemo(() => {
    const sales = productSalesData?.monthlySales;
    if (!sales || state.data_window_train_start_index === null || state.data_window_train_end_index === null || state.data_window_evaluate_start_index === null || state.data_window_evaluate_end_index === null) {
      return { trainingData: [], evaluationData: [] };
    }
    const train = sales.slice(state.data_window_train_start_index, state.data_window_train_end_index + 1);
    const evaluate = sales.slice(state.data_window_evaluate_start_index, state.data_window_evaluate_end_index + 1);
    return { trainingData: train, evaluationData: evaluate };
  }, [productSalesData, state]);

  const allModels = useMemo(() => {
    const modelDisplayNameMap: { [key: string]: string } = {
      'moving_average': '移动平均法',
      'exponential_smoothing': '指数平滑法',
      'ARIMA': 'ARIMA模型',
      'LSTM': 'LSTM模型',
      'ma': '移动平均法',
      'exp': '指数平滑法',
      'arima': 'ARIMA模型',
      'lstm': 'LSTM模型',
    };

    const getEnsembleParams = (baseModels: (SelectedBestModel | string)[] | null | undefined): string => {
      if (!baseModels || baseModels.length === 0) return 'N/A';
      return baseModels.map(key => modelDisplayNameMap[key] || key).join(', ');
    };

    const models = [];
    if (state.moving_average_completed) models.push({ name: '移动平均法', params: `窗口: ${state.moving_average_window ?? 'N/A'}`, rmse: state.moving_average_metrics_rmse, mae: state.moving_average_metrics_mae, r2: state.moving_average_metrics_r2 });
    if (state.exponential_smoothing_completed) models.push({ name: '指数平滑法', params: `Alpha: ${state.exponential_smoothing_alpha ?? 'N/A'}`, rmse: state.exponential_smoothing_metrics_rmse, mae: state.exponential_smoothing_metrics_mae, r2: state.exponential_smoothing_metrics_r2 });
    if (state.arima_completed) models.push({ name: 'ARIMA', params: `(p,d,q): (${state.arima_p ?? '?'},${state.arima_d ?? '?'},${state.arima_q ?? '?'})`, rmse: state.arima_metrics_rmse, mae: state.arima_metrics_mae, r2: state.arima_metrics_r2 });
    if (state.lstm_completed) models.push({ name: 'LSTM', params: `归一化: ${state.lstm_normalization || 'N/A'}`, rmse: state.lstm_metrics_rmse, mae: state.lstm_metrics_mae, r2: state.lstm_metrics_r2 });
    if (state.ensemble_weighted_completed) models.push({ name: '加权融合', params: getEnsembleParams(state.ensemble_weighted_base_models), rmse: state.ensemble_weighted_metrics_rmse, mae: state.ensemble_weighted_metrics_mae, r2: state.ensemble_weighted_metrics_r2 });
    if (state.ensemble_boosting_completed) models.push({ name: 'Boosting融合', params: getEnsembleParams(state.ensemble_boosting_base_models), rmse: state.ensemble_boosting_metrics_rmse, mae: state.ensemble_boosting_metrics_mae, r2: state.ensemble_boosting_metrics_r2 });
    if (state.ensemble_stacking_completed) models.push({ name: 'Stacking融合', params: getEnsembleParams(state.ensemble_stacking_base_models), rmse: state.ensemble_stacking_metrics_rmse, mae: state.ensemble_stacking_metrics_mae, r2: state.ensemble_stacking_metrics_r2 });
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

  const planSummary = useMemo(() => {
    if (!state.production_mps_table || state.production_mps_table.length === 0) return null;
    const table = state.production_mps_table;
    const totalPeriods = table.length;
    const avgServiceLevel = table.reduce((sum, row) => sum + (row.service_level ?? 0), 0) / totalPeriods;
    const totalStockout = table.reduce((sum, row) => sum + (row.stockout ?? 0), 0);
    const avgInventory = table.reduce((sum, row) => sum + (row.ending_inventory ?? 0), 0) / totalPeriods;
    const periodsWithStockout = table.filter(row => (row.stockout ?? 0) > 0).length;
    return { avgServiceLevel, totalStockout, avgInventory, periodsWithStockout, totalPeriods };
  }, [state.production_mps_table]);

  // Submission handler
  const handleSave = async () => {
    if (!state.experiment_id) {
      setSubmitError('实验ID不存在，无法提交报告');
      return;
    }
    if (!validateAnalyses(analysisValues)) {
      setShowValidationErrorModal(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Markdown generation logic...
      // This part remains complex but is now more manageable.
      const modelLabels: Record<SelectedBestModel, string> = { ma: '移动平均法', exp: '指数平滑法', arima: 'ARIMA模型', lstm: 'LSTM模型', ensemble_weighted: '加权平均融合', ensemble_boosting: 'Boosting融合', ensemble_stacking: 'Stacking融合' };
      const renderValue = (val: number | null | undefined, precision = 4) => val !== null && val !== undefined ? val.toFixed(precision) : 'N/A';
      const formatDate = (dateString: string | null): string => dateString ? new Date(dateString).toLocaleString('zh-CN', { hour12: false }) : '未知';
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

### 1.1 实验选择
| 项目 | 内容 |
|------|------|
| 行业 | ${state.selected_industry || 'N/A'} |
| 公司 | ${state.selected_company || 'N/A'} |
| 产品 | ${state.selected_product || 'N/A'} |

### 1.2 数据预处理

#### 训练集 (${trainingData.length}条)
| 月份 | 销量 |
|---|---|
${trainingData.map(d => `| ${d.month} | ${d.sales.toLocaleString()} |`).join('\n')}

#### 评估集 (${evaluationData.length}条)
| 月份 | 销量 |
|---|---|
${evaluationData.map(d => `| ${d.month} | ${d.sales.toLocaleString()} |`).join('\n')}

### 1.3 分析
${dataAnalysis}

---

## 二、模型性能对比

| 模型 | 参数 | RMSE | MAE | R² |
|------|------|------|-----|-----|
${allModels.map(m => `| ${m.name} | ${m.params} | ${renderValue(m.rmse)} | ${renderValue(m.mae)} | ${renderValue(m.r2)} |`).join('\n')}

### 分析
${modelComparisonAnalysis}

---

## 三、最优模型选择

**选定模型**: ${state.selected_best_model ? modelLabels[state.selected_best_model] : 'N/A'}

| 指标 | 值 |
|------|-----|
| RMSE | ${renderValue(bestModelMetrics?.rmse)} |
| MAE | ${renderValue(bestModelMetrics?.mae)} |
| R² | ${renderValue(bestModelMetrics?.r2)} |

### 分析
${modelSelectionAnalysis}

---

## 四、生产计划参数计算结果
(以期1和期2为例)

### 4.1 默认参数
| 参数 | 值 |
|------|-----|
| 目标服务水平 | ${state.production_target_service_level ? `${state.production_target_service_level * 100}%` : 'N/A'} |
| 安全库存Z值 | ${state.production_safety_stock_z_score || 'N/A'} |
| 产能上限/期 | ${state.production_capacity ? `${state.production_capacity.toLocaleString()} 件` : 'N/A'} |

### 4.2 数据对比
${(() => {
const period1 = state.production_mps_table.length > 0 ? state.production_mps_table[0] : null;
const period2 = state.production_mps_table.length > 1 ? state.production_mps_table[1] : null;
if (!period1 || !period2) return '**📝 说明：数据不完整**';

return `| 变量/参数 | 期 1 (参考) | 期 2 (学习) |
|---|---|---|
| **需求与库存** | | |
| 需求预测 | ${period1.demand_forecast?.toLocaleString()} | ${period2.demand_forecast?.toLocaleString()} |
| 期初库存 | ${period1.beginning_inventory?.toLocaleString()} | ${period2.beginning_inventory?.toLocaleString()} |
| 安全库存 | ${period1.safety_stock?.toLocaleString()} | ${period2.safety_stock?.toLocaleString()} |
| 预测量 | ${((period1.demand_forecast ?? 0) + (period1.safety_stock ?? 0)).toLocaleString()} | ${((period2.demand_forecast ?? 0) + (period2.safety_stock ?? 0)).toLocaleString()} |
| **生产与产出** | | |
| 计划生产 (投入量) | ${period1.planned_production?.toLocaleString()} | ${period2.planned_production?.toLocaleString()} |
| 产出量 | ${period1.production_output?.toLocaleString()} | ${period2.production_output?.toLocaleString()} |
| **结果与评估** | | |
| 期末库存 | ${period1.ending_inventory?.toLocaleString()} | ${period2.ending_inventory?.toLocaleString()} |
| 缺货量 | ${period1.stockout?.toLocaleString()} | ${period2.stockout?.toLocaleString()} |
| 服务水平 | ${`${((period1.service_level ?? 0) * 100).toFixed(1)}%`} | ${`${((period2.service_level ?? 0) * 100).toFixed(1)}%`} |
`;
})()}

### 4.3 分析
${planParamsAnalysis}

---

## 五、生产计划决策结果

### 5.1 完整生产计划表 (MPS)
${state.production_mps_table.length > 0 ? `| 周期 | 预测需求 | 安全库存 | 计划生产 | 期初库存 | 产出量 | 期末库存 | 缺货量 | 服务水平 |
|------|----------|----------|----------|----------|--------|----------|--------|----------|
${state.production_mps_table.map(row => `| ${row.period_label} | ${row.demand_forecast} | ${row.safety_stock} | ${row.planned_production} | ${row.beginning_inventory} | ${row.production_output} | ${row.ending_inventory} | ${row.stockout} | ${((row.service_level ?? 0) * 100).toFixed(1)}% |`).join('\n')}` : `**📝 说明：生产计划数据未保存**`}

### 5.2 计划总体评估
${planSummary ? `| 指标 | 结果 |
|------|------|
| 平均服务水平 | ${(planSummary.avgServiceLevel * 100).toFixed(1)}% |
| 总缺货量 | ${planSummary.totalStockout.toLocaleString()} 件 |
| 平均期末库存 | ${Math.round(planSummary.avgInventory).toLocaleString()} 件 |
| 缺货周期数 | ${planSummary.periodsWithStockout} / ${planSummary.totalPeriods} |` : '**📝 说明：无汇总数据**'}

### 5.3 分析
${planDecisionAnalysis}`;
      
      const response = await apiClient.post<{ message: string; report_id: number; pdf_path: string }>(`/experiment-runs/${state.experiment_id}/report`, {
        report_content: markdownContent,
      });

      setSubmitSuccess(true);
      const now = new Date().toISOString();
      await updateState({ status: 'Completed', last_activity_at: now, completion_time: now });
      setShowCompletionModal(true);

    } catch (error: any) {
      setSubmitError(error.message || '提交报告失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => window.location.href = '/login';
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
          <ExperimentOverview state={state} trainingData={trainingData} evaluationData={evaluationData} getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting} renderValue={renderValue} />
          <ModelComparison allModels={allModels} getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting} renderValue={renderValue} />
          <BestModelSelection state={state} bestModelMetrics={bestModelMetrics} getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting} renderValue={renderValue} />
          <PlanParameters state={state} getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting} />
          <PlanDecisionResults state={state} planSummary={planSummary} getAnalysisValue={getAnalysisValue} getAnalysisSetter={getAnalysisSetter} isSubmitting={isSubmitting} />

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

      {showCompletionModal && <CompletionModal countdown={countdown} onLogout={handleLogout} />}
      {showValidationErrorModal && <ValidationErrorModal onClose={() => setShowValidationErrorModal(false)} />}
    </div>
  );
};

export default ExperimentReport;
