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
 *
 * 按照客户文档重构，教学结构：
 * - 目的与重要性
 * - (1) 第二个月的成功案例
 * - (2) 逐月生成完整生产计划表的逻辑
 * - (3) 生成完整生产计划表的步骤
 * - (4) 观察与分析完整生产计划表
 * - (5) 总结
 */
const NewStep6: React.FC = () => {
  const navigate = useNavigate();
  const { state, generateFullMPS, hideStep6Teaching } = useProductionPlan();
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

  // 💾 使用ref保存最新的state，避免长依赖数组
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 💾 当MPS表生成完成后，保存到全局状态
  useEffect(() => {
    if (state.isFullPlanGenerated && !hasSavedMPSRef.current && state.predictions) {
      const saveMPSData = async () => {
        try {
          console.log('💾 保存生产计划数据到全局状态');

          // 使用ref获取最新的state数据
          const currentState = stateRef.current;

          // 转换MPS表格数据类型（fullMPSTable已包含所有期数1-N）
          const globalMPSTable = convertToGlobalMPSTable(currentState.fullMPSTable);

          console.log('📊 完整MPS表数据（期1-' + currentState.fullMPSTable.length + '）:', currentState.fullMPSTable);

          await updateState({
            production_plan_completed: true,
            production_forecast_periods: currentState.forecastPeriods,
            production_initial_inventory: currentState.initialInventory,
            production_target_service_level: currentState.targetServiceLevel,
            production_safety_stock_z_score: currentState.safetyStockZScore,
            production_forecast_results: currentState.predictions,
            production_mps_table: globalMPSTable,
            production_capacity_scenario: currentState.capacityScenario,
            production_capacity: currentState.productionCapacity,
          });
          console.log('✅ 生产计划数据已保存到全局状态');
          hasSavedMPSRef.current = true;
        } catch (err) {
          console.error('保存生产计划数据失败:', err);
        }
      };

      saveMPSData();
    }
  }, [state.isFullPlanGenerated, state.predictions, updateState]);

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
          <p className="text-sm text-green-600">Complete Plan</p>
        </div>
      </div>

      {/* 目的与重要性 */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-800 mb-3">目的与重要性</h4>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-3">
            <div className="font-semibold text-blue-900 mb-1">🎯 目的</div>
            <p className="text-blue-800">
              将前面几步中的所有步骤整合到一个完整的生产计划表中，展示整体生产计划的全貌。
            </p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 rounded p-3">
            <div className="font-semibold text-green-900 mb-1">⭐ 重要性</div>
            <p className="text-green-800">
              尽管实际操作中生产计划是<strong>逐月生成</strong>的，但完整的生产计划表能够帮助企业从<strong>全局视角审视和优化</strong>生产计划。它不仅展示了每个月的生产安排，还为未来的计划调整和资源优化提供了数据支持。通过这一表格，企业可以更好地预测和应对市场需求的变化。
            </p>
          </div>
        </div>
      </div>

      {/* 承上启下 */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-green-500 rounded-lg p-5">
        <p className="text-sm text-gray-700 leading-relaxed">
          经过前面<strong>五个步骤</strong>的深入学习和操作，我们已经成功完成了第二个月的生产计划制定。在这个过程中，详细探讨了如何从<strong>需求量、产出量、库存量、缺货量、服务水平以及预测量</strong>中推导出生产计划的每个关键部分。现在，将把这些知识整合起来，生成一个<strong>完整的生产计划表</strong>。
        </p>
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

          {/* (1) 第二个月的成功案例 */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-800 mb-3">(1) 第二个月的成功案例</h4>
            <p className="text-sm text-gray-700 mb-3">
              在第二个月中，我们运用前几步中学到的公式和逻辑，成功制定了第二个月的生产计划。这一步不仅为奠定了坚实的基础，也为未来的生产计划提供了一个清晰的模板。
            </p>
            <div className="bg-green-50 border border-green-300 rounded-lg p-4">
              <div className="text-sm text-green-800 space-y-2">
                <p><strong>✓ 第二个月我们学会了：</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 如何根据需求预测计算需求量、产出量、库存量和缺货量</li>
                  <li>• 如何评估服务水平，衡量生产计划的有效性</li>
                  <li>• 如何计算预测量（需求预测 + 安全库存）</li>
                  <li>• 如何根据预测量、上月库存和缺货计算投入量</li>
                </ul>
              </div>
            </div>
          </div>

          {/* (2) 逐月生成完整生产计划表的逻辑 */}
          <div className="bg-white border-2 border-purple-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-800 mb-3">(2) 逐月生成完整生产计划表的逻辑</h4>
            <p className="text-sm text-gray-700 mb-3">
              尽管我们实际操作时是<strong>逐月生成和调整</strong>生产计划，但为了便于学习和观察，在这一刻，你们将能够看到整个生产计划表的完整展示。这张表格不仅包含了第二个月的结果，还包括了未来各个月份的生产计划数据。<strong>每个月的生产计划都是基于前一个月的计算结果，逐步推导而来的。</strong>
            </p>
            <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
              <div className="text-sm text-purple-800">
                <p className="font-semibold mb-2">📊 逐月推导逻辑：</p>
                <div className="space-y-1">
                  <p>• <strong>第1期</strong>：标准化基准（期初库存=0，产出=需求，无缺货）</p>
                  <p>• <strong>第2期</strong>：根据第1期期末库存和缺货，计算第2期投入量</p>
                  <p>• <strong>第3期及之后</strong>：依次推导，每期都基于上期的结果</p>
                </div>
              </div>
            </div>
          </div>

          {/* (3) 生成完整生产计划表的步骤 */}
          <div className="bg-white border-2 border-indigo-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-800 mb-3">(3) 生成完整生产计划表的步骤</h4>
            <p className="text-sm text-gray-700 mb-3">
              点击下一步后，你将看到一张完整的生产计划表，其中展示了整个预测时段内的各项关键数据。这张表格将包括：
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                <div className="font-semibold text-indigo-900 text-sm mb-1">• 投入量</div>
                <p className="text-xs text-indigo-800">每个月计划投入生产的资源数量</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="font-semibold text-green-900 text-sm mb-1">• 产出量</div>
                <p className="text-xs text-green-800">根据投入量推导出的每个月的产出量</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <div className="font-semibold text-purple-900 text-sm mb-1">• 库存量</div>
                <p className="text-xs text-purple-800">产出量减去实际需求量后的剩余产品数量</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="font-semibold text-red-900 text-sm mb-1">• 缺货量</div>
                <p className="text-xs text-red-800">当产出量不足以满足需求时的缺货情况</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="font-semibold text-blue-900 text-sm mb-1">• 服务水平</div>
                <p className="text-xs text-blue-800">衡量企业满足市场需求能力的指标</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <div className="font-semibold text-amber-900 text-sm mb-1">• 预测量</div>
                <p className="text-xs text-amber-800">每个月基于需求预测和安全库存的生产计划目标</p>
              </div>
            </div>
          </div>

          {/* (4) 观察与分析完整生产计划表 */}
          <div className="bg-white border-2 border-green-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-800 mb-3">(4) 观察与分析完整生产计划表</h4>
            <p className="text-sm text-gray-700 mb-3">
              看到这张完整的生产计划表后，希望你能够通过观察每个月的数据变化，进一步理解生产计划制定的逻辑与关联。你们可以看到：
            </p>
            <div className="space-y-3">
              <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-3">
                <div className="font-semibold text-blue-900 text-sm mb-1">• 需求变化如何影响投入量</div>
                <p className="text-xs text-blue-800">随着需求的变化，投入量将如何相应调整</p>
              </div>
              <div className="bg-purple-50 border-l-4 border-purple-400 rounded p-3">
                <div className="font-semibold text-purple-900 text-sm mb-1">• 服务水平的动态变化</div>
                <p className="text-xs text-purple-800">通过不同月份的服务水平，了解生产计划的有效性</p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-400 rounded p-3">
                <div className="font-semibold text-green-900 text-sm mb-1">• 库存与缺货的管理</div>
                <p className="text-xs text-green-800">观察每个月的库存和缺货情况，分析这些量如何影响企业的整体运营</p>
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

          {/* (5) 总结 */}
          <div className="bg-white border-2 border-teal-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-800 mb-3">(5) 总结</h4>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                这张完整的生产计划表不仅是学习的成果，也是未来在实际生产管理中可以参考和应用的工具。尽管在现实中生产计划需要<strong>逐月生成和调整</strong>，但通过这次学习，已经掌握了如何系统性地制定和优化生产计划的方法。
              </p>
              <div className="bg-teal-50 border border-teal-300 rounded-lg p-4">
                <p className="font-semibold text-teal-900 mb-2">✨ 你已经掌握了：</p>
                <ul className="space-y-1 text-teal-800">
                  <li>• 从<strong>需求预测</strong>到<strong>投入量计算</strong>的全过程</li>
                  <li>• 如何理解和运用生产计划的各个关键变量</li>
                  <li>• 如何生成<strong>完整的生产计划表</strong></li>
                  <li>• 如何从全局视角<strong>审视和优化</strong>生产计划</li>
                </ul>
              </div>
              <p className="text-teal-800 bg-teal-50 border-l-4 border-teal-400 rounded p-3">
                💡 通过这次完整的学习和操作，相信你已经掌握了从需求预测到投入量计算，再到完整生产计划表生成的全过程。
              </p>
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
            <h4 className="font-semibold text-green-900 mb-3">🎓 恭喜！您已完成生产计划学习</h4>
            <div className="text-sm text-green-800 space-y-3">
              <p>
                接下来，请点击下方"下一步"按钮，<strong>全屏查看完整的生产计划表</strong>，并通过观察和分析这张表格，进一步巩固所学的知识。
              </p>
              <p className="font-semibold">
                教学内容将隐藏，MPS表格将全屏显示所有{summary.totalPeriods}期的详细信息。
              </p>
            </div>
          </div>

          {/* 下一步按钮 */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={hideStep6Teaching}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
            >
              <CheckCircle className="w-5 h-5" />
              <span>下一步：全屏查看MPS表</span>
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
