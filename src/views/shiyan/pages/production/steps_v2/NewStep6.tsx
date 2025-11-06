import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useExperiment, type MPSTableRow as GlobalMPSTableRow } from '../../../contexts/ExperimentContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../../utils/apiClient';
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

/**
 * Step 6: 完整计划表
 * - 自动生成完整的多期MPS计划
 * - 整合所有学过的知识点
 * - 展示汇总统计
 */
const NewStep6: React.FC = () => {
  const navigate = useNavigate();
  const { state, generateFullMPS } = useProductionPlan();
  const { updateState } = useExperiment();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generationTriggeredRef = useRef(false);
  const hasSavedMPSRef = useRef(false);

  // 自动生成完整计划（仅执行一次）
  useEffect(() => {
    if (!generationTriggeredRef.current && !state.isFullPlanGenerated) {
      generationTriggeredRef.current = true;
      handleGenerate();
    }
  }, []);

  // 💾 当MPS表生成完成后，保存到全局状态
  useEffect(() => {
    if (state.isFullPlanGenerated && !hasSavedMPSRef.current && state.predictions) {
      const saveMPSData = async () => {
        try {
          console.log('💾 保存生产计划数据到全局状态');

          // 转换MPS表格数据类型（fullMPSTable已包含所有期数1-N）
          const globalMPSTable = convertToGlobalMPSTable(state.fullMPSTable);

          console.log('📊 完整MPS表数据（期1-' + state.fullMPSTable.length + '）:', state.fullMPSTable);

          await updateState({
            production_plan_completed: true,
            production_forecast_periods: state.forecastPeriods,
            production_initial_inventory: state.initialInventory,
            production_target_service_level: state.targetServiceLevel,
            production_safety_stock_z_score: state.safetyStockZScore,
            production_forecast_results: state.predictions,
            production_mps_table: globalMPSTable,
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
  }, [state.isFullPlanGenerated, state.fullMPSTable, state.predictions, state.forecastPeriods, state.initialInventory, state.targetServiceLevel, state.safetyStockZScore, state.capacityMode, state.capacityScenario, state.productionCapacity, state.customCapacity, updateState]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // 🆕 优先使用Step1中已保存的预测数据
      if (state.predictions && state.predictions.length > 0) {
        console.log('✅ 使用Step1中已保存的预测数据:', state.predictions);
        // 添加1秒虚拟loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        generateFullMPS(state.predictions);
        setHasGenerated(true);
      } else {
        // 如果没有保存的预测数据，则调用API获取
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
          console.log('🔍 API返回的预测数据:', response.results.predictions);

          // 添加1秒虚拟loading
          await new Promise(resolve => setTimeout(resolve, 1000));
          // 生成完整MPS表
          generateFullMPS(response.results.predictions);
          setHasGenerated(true);
        } else {
          throw new Error('预测API返回数据格式错误');
        }
      }
    } catch (err) {
      console.error('生成完整计划失败:', err);
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 计算汇总统计
  const handleComplete = async () => {
    try {
      // 📊 更新步骤进度：完成步骤7
      console.log('📊 更新步骤进度：完成步骤7');
      await updateState({
        highest_completed_step: 7,
        current_step: 7,
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

  const calculateSummary = () => {
    if (!state.isFullPlanGenerated || state.fullMPSTable.length === 0) {
      return null;
    }

    // fullMPSTable 现在已包含完整的期1-N数据，直接使用即可
    const table = state.fullMPSTable;
    const totalPeriods = table.length;
    const avgServiceLevel = table.reduce((sum, row) => sum + (row.service_level ?? 0), 0) / totalPeriods;
    const totalStockout = table.reduce((sum, row) => sum + (row.stockout ?? 0), 0);
    const totalDemand = table.reduce((sum, row) => sum + (row.demand_forecast ?? 0), 0);
    const totalProduction = table.reduce((sum, row) => sum + (row.production_output ?? 0), 0);
    const avgInventory = table.reduce((sum, row) => sum + (row.ending_inventory ?? 0), 0) / totalPeriods;
    const periodsWithStockout = table.filter(row => (row.stockout ?? 0) > 0).length;

    return {
      totalPeriods,
      avgServiceLevel,
      totalStockout,
      totalDemand,
      totalProduction,
      avgInventory,
      periodsWithStockout,
    };
  };

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第6步：完整计划表</h3>
          <p className="text-sm text-green-600">Complete MPS Plan</p>
        </div>
      </div>

      {/* 生成状态 */}
      {isGenerating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div>
              <div className="font-semibold text-blue-900">正在生成完整生产计划...</div>
              <div className="text-sm text-blue-700 mt-1">调用预测模型，计算{state.forecastPeriods}期的MPS表...</div>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <div className="font-semibold text-red-900">生成失败</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {/* 成功生成 */}
      {state.isFullPlanGenerated && summary && (
        <div className="space-y-6">
          {/* 成功提示 */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-400 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-lg font-bold text-green-900">完整生产计划已生成！</div>
                <div className="text-sm text-green-700">您已成功掌握MPS（主生产计划）的制定流程</div>
              </div>
            </div>
          </div>

          {/* 学习回顾 */}
          <div className="bg-white border-2 border-indigo-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-800 mb-4">📚 学习回顾：您掌握的核心知识点</h4>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div className="font-semibold text-blue-900">规划总览</div>
                </div>
                <div className="text-xs text-blue-800">MPS流程、时间单位、提前期</div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div className="font-semibold text-green-900">生产变量</div>
                </div>
                <div className="text-xs text-green-800">需求、产出、库存、缺货</div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div className="font-semibold text-purple-900">服务水平</div>
                </div>
                <div className="text-xs text-purple-800">服务水平 = 1 - (缺货/需求)</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <div className="font-semibold text-amber-900">预测量</div>
                </div>
                <div className="text-xs text-amber-800">预测量 = 需求 + 安全库存</div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
                  <div className="font-semibold text-indigo-900">投入量（核心公式）</div>
                </div>
                <div className="text-xs text-indigo-800">投入量 = 预测量 - 期初库存</div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">6</div>
                  <div className="font-semibold text-teal-900">完整计划</div>
                </div>
                <div className="text-xs text-teal-800">多期动态MPS表生成</div>
              </div>
            </div>
          </div>

          {/* 计划汇总统计 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-5">
            <h4 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>生产计划汇总统计</span>
            </h4>

            <div className="grid md:grid-cols-3 gap-4">
              {/* 服务水平 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">平均服务水平</div>
                <div className="text-3xl font-bold" style={{
                  color: summary.avgServiceLevel >= 0.99 ? '#16a34a' : summary.avgServiceLevel >= 0.95 ? '#eab308' : '#dc2626'
                }}>
                  {(summary.avgServiceLevel * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {summary.avgServiceLevel >= 0.99 ? '✅ 达到目标' : summary.avgServiceLevel >= 0.95 ? '⚠️ 接近目标' : '❌ 需改进'}
                </div>
              </div>

              {/* 总缺货 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">总缺货量</div>
                <div className="text-3xl font-bold text-red-600">{summary.totalStockout}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {summary.periodsWithStockout} / {summary.totalPeriods} 期发生缺货
                </div>
              </div>

              {/* 平均库存 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">平均期末库存</div>
                <div className="text-3xl font-bold text-purple-600">{Math.round(summary.avgInventory)}</div>
                <div className="text-xs text-gray-500 mt-1">库存持有成本相关</div>
              </div>

              {/* 总需求 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">总需求量</div>
                <div className="text-2xl font-bold text-blue-600">{summary.totalDemand}</div>
                <div className="text-xs text-gray-500 mt-1">{summary.totalPeriods}期累计</div>
              </div>

              {/* 总产出 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">总产出量</div>
                <div className="text-2xl font-bold text-green-600">{summary.totalProduction}</div>
                <div className="text-xs text-gray-500 mt-1">{summary.totalPeriods}期累计</div>
              </div>

              {/* 供需匹配率 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 mb-1">供需匹配率</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {((summary.totalProduction / summary.totalDemand) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">产出 / 需求</div>
              </div>
            </div>
          </div>

          {/* 关键洞察 */}
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2">💡 从计划中获得的洞察</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              {summary.avgServiceLevel >= 0.99 ? (
                <li>✅ <strong>达到目标服务水平</strong>：您的计划达到了{(summary.avgServiceLevel * 100).toFixed(1)}%的平均服务水平（目标99%），客户满意度高</li>
              ) : summary.avgServiceLevel >= 0.95 ? (
                <li>⚠️ <strong>接近目标但有提升空间</strong>：服务水平{(summary.avgServiceLevel * 100).toFixed(1)}%，离目标99%还有差距，考虑提高产能</li>
              ) : (
                <li>❌ <strong>服务水平较低</strong>：建议增加产能约束或优化生产计划</li>
              )}
              {summary.periodsWithStockout > 0 ? (
                <li>• <strong>{summary.periodsWithStockout}期发生缺货</strong>：这些时期的需求超过了可用库存</li>
              ) : (
                <li>• <strong>无缺货发生</strong>：完美满足所有需求！</li>
              )}
              <li>• <strong>库存管理</strong>：平均库存为{Math.round(summary.avgInventory)}，需要平衡库存成本与服务水平</li>
            </ul>
          </div>

          {/* 完成提示 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-5">
            <h4 className="font-semibold text-green-900 mb-3">🎓 恭喜！您已完成MPS学习</h4>
            <div className="text-sm text-green-800 space-y-2">
              <p>通过这6步渐进式学习，您已经掌握了：</p>
              <ul className="ml-4 space-y-1">
                <li>✓ MPS的基本概念和流程</li>
                <li>✓ 核心生产变量的定义和计算</li>
                <li>✓ 服务水平的意义和评估</li>
                <li>✓ 安全库存的作用和计算</li>
                <li>✓ MPS核心公式的应用</li>
                <li>✓ 完整多期生产计划的生成</li>
              </ul>
              <p className="mt-3 font-semibold">您可以在下方的表格中查看完整的MPS计划表。</p>
            </div>
          </div>

          {/* 完成按钮 */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg"
            >
              <CheckCircle className="w-5 h-5" />
              <span>完成生产计划制定，进入测验</span>
            </button>
          </div>
        </div>
      )}

      {/* 表格说明 */}
      {state.isFullPlanGenerated && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            💡 <strong>提示：</strong>
            完整的MPS表格显示在下方。表格包含所有{state.forecastPeriods}期的详细数据，
            包括需求预测、安全库存、投入量、产出量、库存、缺货和服务水平。
            您可以滚动查看所有数据列。
          </p>
        </div>
      )}
    </div>
  );
};

export default NewStep6;
