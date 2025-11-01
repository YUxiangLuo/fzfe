import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useExperiment, type MPSTableRow as GlobalMPSTableRow } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import type { MPSTableRow as LocalMPSTableRow } from '../ProductionPlanContextV2';

// 模型类型映射：前端模型ID -> 后端API参数
const MODEL_TYPE_MAP: Record<string, string> = {
  'ma': 'ma',
  'exp': 'es',
  'arima': 'arima',
  'lstm': 'lstm',
  'ensemble_weighted': 'weighted_average',
  'ensemble_boosting': 'boosting',
  'ensemble_stacking': 'stacking',
};

// 🔄 将本地MPS表格数据转换为全局类型（去除null）
const convertToGlobalMPSTable = (localTable: LocalMPSTableRow[]): GlobalMPSTableRow[] => {
  return localTable.map(row => ({
    period: row.period,
    period_label: row.period_label,
    demand_forecast: row.demand_forecast ?? 0,
    safety_stock: row.safety_stock ?? 0,
    planned_production: row.planned_production ?? 0,
    beginning_inventory: row.beginning_inventory ?? 0,
    production_output: row.production_output ?? 0,
    ending_inventory: row.ending_inventory ?? 0,
    stockout: row.stockout ?? 0,
    service_level: row.service_level ?? 0,
  }));
};

const ConceptStep9: React.FC = () => {
  const navigate = useNavigate();
  const { state, generateFullMPS } = useProductionPlan();
  const { state: experimentState, updateState, recordStepEvent } = useExperiment();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRecordedStartRef = useRef(false);
  const prevHighestStepRef = useRef(experimentState.highest_completed_step);
  const hasSavedMPSRef = useRef(false);
  const latestPredictionsRef = useRef<Array<{ prediction: number; std_dev: number }> | null>(null);

  // 📝 记录步骤开始事件
  useEffect(() => {
    if (experimentState.highest_completed_step < prevHighestStepRef.current) {
      hasRecordedStartRef.current = false;
    }
    prevHighestStepRef.current = experimentState.highest_completed_step;

    if (7 > experimentState.highest_completed_step && !hasRecordedStartRef.current) {
      recordStepEvent(7, 'STARTED');
      hasRecordedStartRef.current = true;
    }
  }, [experimentState.highest_completed_step, recordStepEvent]);

  // 💾 当MPS表生成完成后，保存到全局状态
  useEffect(() => {
    if (state.isFullPlanGenerated && !hasSavedMPSRef.current && latestPredictionsRef.current) {
      const saveMPSData = async () => {
        try {
          console.log('💾 保存生产计划数据到全局状态');

          // 转换MPS表格数据类型
          const globalMPSTable = convertToGlobalMPSTable(state.fullMPSTable);

          await updateState({
            production_plan_completed: true,
            production_forecast_periods: state.forecastPeriods,
            production_initial_inventory: state.initialInventory,
            production_target_service_level: state.targetServiceLevel,
            production_safety_stock_z_score: state.safetyStockZScore,
            production_forecast_results: latestPredictionsRef.current,
            production_mps_table: globalMPSTable,
            // 🆕 保存产能约束参数
            production_capacity_mode: state.capacityMode,
            production_capacity_scenario: state.capacityScenario,
            production_capacity: state.productionCapacity,
            production_custom_capacity: state.customCapacity,
          });
          console.log('✅ 生产计划数据已保存到全局状态');
          hasSavedMPSRef.current = true;
        } catch (err) {
          console.error('保存生产计划数据失败:', err);
        }
      };

      saveMPSData();
    }
  }, [state.isFullPlanGenerated, state.fullMPSTable, state.forecastPeriods, state.initialInventory, state.targetServiceLevel, state.safetyStockZScore, updateState]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // 🔧 使用真实的最佳模型（从全局状态获取）
      console.log('📌 使用的最佳模型:', state.selectedBestModel);

      const modelType = MODEL_TYPE_MAP[state.selectedBestModel];
      if (!modelType) {
        throw new Error(`无效的模型类型: ${state.selectedBestModel}`);
      }

      console.log('🚀 调用预测API:', { model_type: modelType, forecast_steps: state.forecastPeriods });

      const response = await apiClient.post<{
        status: string;
        results: { predictions: Array<{ prediction: number; std_dev: number }> };
      }>('/models/predictions', {
        model_type: modelType,
        forecast_steps: state.forecastPeriods,
      });

      if (response.status === 'success' && response.results?.predictions) {
        // 🐛 调试：打印API返回的预测数据
        console.log('🔍 API返回的预测数据:', response.results.predictions);
        console.log('📊 预测期数:', response.results.predictions.length);

        // 数据质量检查
        let anomalyCount = 0;
        response.results.predictions.forEach((pred, idx) => {
          const ratio = pred.prediction > 0 ? (pred.std_dev / pred.prediction) : 0;
          const isAnomaly = pred.std_dev === 0 || ratio > 0.3 || pred.std_dev < 0 || !isFinite(pred.std_dev);

          console.log(
            `期 ${idx + 1}: 预测值=${pred.prediction.toFixed(2)}, 标准差=${pred.std_dev.toFixed(2)} (${(ratio * 100).toFixed(1)}%)${isAnomaly ? ' ⚠️异常' : ' ✓'}`
          );

          if (isAnomaly) anomalyCount++;
        });

        if (anomalyCount > 0) {
          console.warn(`⚠️ 发现 ${anomalyCount}/${response.results.predictions.length} 期的标准差数据异常，将使用原始值进行计算`);
        } else {
          console.log('✅ 所有预测数据的标准差都在合理范围内');
        }

        // 保存预测结果到ref（供后续保存到全局状态使用）
        latestPredictionsRef.current = response.results.predictions;

        // 生成完整MPS表
        generateFullMPS(response.results.predictions);
      } else {
        throw new Error('预测API返回数据格式错误');
      }
    } catch (err: any) {
      console.error('Generate MPS error:', err);
      setError(err.message || '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async () => {
    try {
      // 📊 更新步骤进度：完成步骤7
      console.log('📊 更新步骤进度：完成步骤7');
      await updateState({
        highest_completed_step: 7,
        current_step: 7, // max step is 7
      });
      console.log('✅ 步骤进度已更新');

      // 导航到生产计划测验
      navigate('/quiz-plan');
    } catch (err) {
      console.error('更新步骤进度失败:', err);
      // 即使失败也继续导航
      navigate('/quiz-plan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">生成完整生产计划</h3>
          <p className="text-sm text-blue-600">Generate Full MPS</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">🎉 恭喜！您已掌握MPS的核心概念</h4>
        <p className="text-sm text-gray-700 mb-3">
          您已经通过第2期的渐进式学习，理解了MPS表每一列的含义和计算方法。现在，让我们将所学应用到所有 {state.forecastPeriods} 期，生成完整的生产计划表。
        </p>
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-700">
            <strong>学习总结</strong>：您理解了预测需求、安全库存、计划生产、期初/期末库存、产出量、缺货和服务水平的计算逻辑。所有计算都基于<strong>预测需求</strong>，保持了逻辑的一致性。
          </p>
        </div>
      </div>

      {!state.isFullPlanGenerated ? (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>正在生成完整MPS表...</span>
            </>
          ) : (
            <>
              <BarChart3 className="w-5 h-5" />
              <span>生成所有 {state.forecastPeriods} 期的完整计划表</span>
            </>
          )}
        </button>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h4 className="font-semibold text-gray-800">完整MPS表已生成！</h4>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            请查看右侧表格，现在所有 {state.forecastPeriods} 期的数据都已填充完整。您可以分析整体的生产计划，包括总需求、平均服务水平等指标。
          </p>

          {/* 汇总统计 */}
          {state.fullMPSTable.length > 0 && (
            <div className="bg-white p-4 rounded border border-gray-200 mb-4">
              <h5 className="font-semibold text-gray-800 mb-2">📊 计划摘要</h5>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">总预测需求</p>
                  <p className="text-lg font-bold text-blue-600">
                    {state.fullMPSTable.reduce((sum, row) => sum + (row.demand_forecast || 0), 0).toLocaleString()} 件
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">平均服务水平</p>
                  <p className="text-lg font-bold text-green-600">
                    {(
                      (state.fullMPSTable.reduce((sum, row) => sum + (row.service_level || 0), 0) /
                        state.fullMPSTable.length) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleComplete}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            <span>完成生产计划制定，进入测验</span>
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">生成失败</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptStep9;
