import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { apiClient } from '../../../../../utils/apiClient';
import { validatePredictions } from '../utils/predictionValidator';

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

/**
 * 完整计划表（结果视图）
 *
 * 按照客户文档重构，教学结构：
 * - 目的与重要性
 * - (1) 第二个月的成功案例
 * - (2) 逐月生成完整生产计划表的逻辑
 * - (3) 生成完整生产计划表的步骤
 * - (4) 观察与分析完整生产计划表
 * - (5) 总结
 */
const CompletePlanView: React.FC = () => {
  const { state, generateFullMPS, hideCompletePlanTeaching, saveMPSDataToGlobal } = useProductionPlan();
  const { state: experimentState, updateState } = useExperiment();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  // 自动生成完整计划（仅在首次进入且未生成时自动执行一次）
  useEffect(() => {
    if (!state.isFullPlanGenerated && !hasAttempted) {
      setHasAttempted(true);
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFullPlanGenerated, hasAttempted]);

  // 💾 保存逻辑已移至 handleGenerate 中，在生成表格后立即保存
  // 不再需要这个 useEffect

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      // 🆕 优先使用Step1中已保存的预测数据
      if (state.predictions && state.predictions.length > 0) {
        const validation = validatePredictions(state.predictions);
        validation.allWarnings.forEach(warning => console.warn(warning));
        const predictionsToUse = validation.validatedData.slice(0, state.forecastPeriods);
        if (predictionsToUse.length < state.forecastPeriods) {
          throw new Error(`预测数据不足：期望 ${state.forecastPeriods} 期，实际 ${predictionsToUse.length} 期`);
        }

        const generatedTable = generateFullMPS(predictionsToUse);
        await saveMPSDataToGlobal(updateState, generatedTable, predictionsToUse);
      } else {
        // 如果没有保存的预测数据，则调用API获取
        if (!experimentState.experiment_id) {
          throw new Error('实验状态未初始化，无法进行需求预测');
        }

        const modelType = MODEL_TYPE_MAP[state.selectedBestModel];
        if (!modelType) {
          throw new Error(`无效的模型类型: ${state.selectedBestModel}`);
        }

        const response = await apiClient.post<{
          status: string;
          results: { predictions: Array<{ prediction: number; std_dev: number }> };
        }>(`/models/${modelType==="weighted_average"?"weighted_avg":modelType}/predict`, {
          experiment_id: experimentState.experiment_id,
          forecast_steps: state.forecastPeriods,
        });

        if (response.status === 'success' && response.results?.predictions) {
          const validation = validatePredictions(response.results.predictions);
          validation.allWarnings.forEach(warning => console.warn(warning));
          const predictionsToUse = validation.validatedData.slice(0, state.forecastPeriods);
          if (predictionsToUse.length < state.forecastPeriods) {
            throw new Error(`预测数据不足：期望 ${state.forecastPeriods} 期，实际 ${predictionsToUse.length} 期`);
          }

          const generatedTable = generateFullMPS(predictionsToUse);
          await saveMPSDataToGlobal(updateState, generatedTable, predictionsToUse);
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
          <h3 className="text-xl font-bold text-gray-900">完整计划表与分析</h3>
          <p className="text-sm text-green-600">Complete Plan View</p>
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
            disabled={isGenerating}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isGenerating ? '重试中...' : '重试'}
          </button>
        </div>
      )}

      {/* 保存状态提示 */}
      {state.isSaving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="text-sm text-blue-900">
              正在保存生产计划数据到全局状态...
            </div>
          </div>
        </div>
      )}

      {/* 保存错误提示 */}
      {state.savingError && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-900">数据保存遇到问题</div>
              <div className="text-sm text-amber-800 mt-1">{state.savingError}</div>
              <div className="text-xs text-amber-700 mt-2">
                💡 您仍可以查看和分析生产计划表。请重试保存，成功后再进入测验。
              </div>
            </div>
          </div>
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
            {/* 保存状态指示 */}
            {!state.isSaving && !state.savingError && state.hasSavedToGlobal && (
              <div className="mt-2 text-sm text-green-700 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>数据已安全保存</span>
              </div>
            )}
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
              点击下方“查看最终MPS表”后，你将看到一张完整的生产计划表，其中展示了整个预测时段内的各项关键数据。这张表格将包括：
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
                <p className="text-xs text-purple-800">期初库存加上产出量减去实际需求量后的剩余产品数量</p>
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
                <li>❌ <strong>服务水平较低</strong>：建议提升产能上限或优化投入策略</li>
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
                接下来，请点击下方"查看最终MPS表"按钮，<strong>全屏查看完整的生产计划表</strong>，并通过观察和分析这张表格，进一步巩固所学的知识。
              </p>
              <p className="font-semibold">
                教学内容将隐藏，MPS表格将全屏显示所有{summary.totalPeriods}期的详细信息。
              </p>
            </div>
          </div>

          {/* 进入完整视图 */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => {
                hideCompletePlanTeaching();
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
            >
              <CheckCircle className="w-5 h-5" />
              <span>查看最终MPS表</span>
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

export default CompletePlanView;
