import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { useExperiment, type MPSTableRow } from '../../contexts/ExperimentContext';
import { apiClient } from '../../../../utils/apiClient';

// Map selected_best_model to API model_type
const MODEL_TYPE_MAP: Record<string, string> = {
  'ma': 'ma',
  'exp': 'es',
  'arima': 'arima',
  'lstm': 'lstm',
  'ensemble_weighted': 'weighted_average',
  'ensemble_boosting': 'boosting',
  'ensemble_stacking': 'stacking',
};

interface ForecastResult {
  predictions: number[];
  mode: string;
  forecast_steps: number;
}

const FinalPlan: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpsTable, setMpsTable] = useState<MPSTableRow[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if we already have MPS table in state
  useEffect(() => {
    if (state.production_mps_table && state.production_mps_table.length > 0) {
      setMpsTable(state.production_mps_table);
      setIsCompleted(state.production_plan_completed);
    }
  }, []);

  // Calculate safety stock (mock version, will use forecast variance when backend provides it)
  const calculateSafetyStock = (demandForecast: number): number => {
    const mockVarianceRatio = 0.05;
    const zScore = state.production_safety_stock_z_score || 1.65;
    return Math.round(demandForecast * mockVarianceRatio * zScore);
  };

  // Generate MPS table
  const handleGenerateMPS = async () => {
    if (!state.selected_best_model) {
      setError('请先在结果评估阶段选择最佳模型');
      return;
    }

    if (!state.production_forecast_periods) {
      setError('请先在"计算预测量"页面设置参数并生成预测');
      return;
    }

    const modelType = MODEL_TYPE_MAP[state.selected_best_model];
    if (!modelType) {
      setError('无效的模型类型');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Call prediction API
      const response = await apiClient.post<{ status: string; results: ForecastResult }>(
        '/model/predict',
        {
          model_type: modelType,
          forecast_steps: state.production_forecast_periods,
        }
      );

      if (response.status !== 'success' || !response.results) {
        setError('预测失败，请重试');
        setIsGenerating(false);
        return;
      }

      const predictions = response.results.predictions;

      // Generate MPS table
      const generatedTable: MPSTableRow[] = [];
      let previousEndingInventory = state.production_initial_inventory || 0;
      let previousStockout = 0;

      for (let i = 0; i < predictions.length; i++) {
        const demandForecast = Math.round(predictions[i]);
        const safetyStock = calculateSafetyStock(demandForecast);
        const plannedProduction = demandForecast + safetyStock;

        // Beginning inventory = previous period's ending inventory
        const beginningInventory = previousEndingInventory;

        // Production input = planned production - beginning inventory + previous stockout
        const productionInput = plannedProduction - beginningInventory + previousStockout;

        // Production output (assume we can produce what we planned)
        const productionOutput = productionInput > 0 ? productionInput : 0;

        // Calculate ending inventory
        let endingInventory = beginningInventory + productionOutput - demandForecast;
        let stockout = 0;

        if (endingInventory < 0) {
          stockout = Math.abs(endingInventory);
          endingInventory = 0;
        }

        // Calculate service level
        const serviceLevel = demandForecast > 0 ? 1 - (stockout / demandForecast) : 1;

        const row: MPSTableRow = {
          period: i + 1,
          period_label: `期 ${i + 1}`,
          demand_forecast: demandForecast,
          safety_stock: safetyStock,
          planned_production: plannedProduction,
          beginning_inventory: beginningInventory,
          production_output: productionOutput,
          ending_inventory: endingInventory,
          stockout: stockout,
          service_level: serviceLevel,
        };

        generatedTable.push(row);

        // Update for next period
        previousEndingInventory = endingInventory;
        previousStockout = stockout;
      }

      setMpsTable(generatedTable);

      // Save to state and mark as completed
      await updateState({
        production_mps_table: generatedTable,
        production_plan_completed: true,
      });

      setIsCompleted(true);
    } catch (err: any) {
      console.error('MPS generation error:', err);
      setError(err.message || 'MPS表生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async () => {
    if (!isCompleted) {
      setError('请先生成MPS表');
      return;
    }
    // Ensure step 7 is marked as completed
    await updateState({
      highest_completed_step: 7,
    });
    navigate('/quiz-plan');
  };

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    if (mpsTable.length === 0) return null;

    const totalDemand = mpsTable.reduce((sum, row) => sum + row.demand_forecast, 0);
    const totalProduction = mpsTable.reduce((sum, row) => sum + row.production_output, 0);
    const totalStockout = mpsTable.reduce((sum, row) => sum + row.stockout, 0);
    const avgInventory = mpsTable.reduce((sum, row) => sum + row.ending_inventory, 0) / mpsTable.length;
    const avgServiceLevel = mpsTable.reduce((sum, row) => sum + row.service_level, 0) / mpsTable.length;
    const stockoutPeriods = mpsTable.filter(row => row.stockout > 0).length;

    return {
      totalDemand,
      totalProduction,
      totalStockout,
      avgInventory,
      avgServiceLevel,
      stockoutPeriods,
    };
  };

  const stats = calculateSummaryStats();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">生成完整MPS表（主生产计划）</h2>
          <p className="text-blue-600 font-medium">总览您的生产决策全景</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 MPS表包含什么？</h3>
          <p className="text-blue-700 mb-4">
            主生产计划表（Master Production Schedule）是生产管理的核心工具，它展示了整个计划期内的完整生产安排：
          </p>
          <ul className="space-y-2 text-sm text-blue-600 list-disc list-inside">
            <li><strong>预测需求</strong>：每期基于最佳模型预测的市场需求量</li>
            <li><strong>安全库存</strong>：根据服务水平目标计算的缓冲库存</li>
            <li><strong>计划生产</strong>：预测需求 + 安全库存的目标生产量</li>
            <li><strong>期初库存</strong>：每期开始时的可用库存（上期期末库存）</li>
            <li><strong>产出量</strong>：本期实际安排的生产数量（考虑库存调整）</li>
            <li><strong>期末库存</strong>：本期结束后的剩余库存</li>
            <li><strong>缺货量</strong>：无法满足的需求数量</li>
            <li><strong>服务水平</strong>：实际满足需求的比例</li>
          </ul>
        </div>

        {/* Generate Button */}
        {mpsTable.length === 0 && (
          <button
            onClick={handleGenerateMPS}
            disabled={isGenerating}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>正在生成MPS表...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>生成完整MPS表</span>
              </>
            )}
          </button>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">错误</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* MPS Table */}
        {mpsTable.length > 0 && (
          <>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 border-b">期数</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b">预测需求</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b">安全库存</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b bg-blue-50">计划生产</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b">期初库存</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b bg-green-50">产出量</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b">期末库存</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b">缺货量</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700 border-b">服务水平</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mpsTable.map((row) => (
                      <tr key={row.period} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-600">{row.period_label}</td>
                        <td className="py-2 px-3 text-right text-gray-800">{row.demand_forecast.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-orange-600">{row.safety_stock.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-medium text-blue-600 bg-blue-50">
                          {row.planned_production.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600">{row.beginning_inventory.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-medium text-green-600 bg-green-50">
                          {row.production_output.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-800">{row.ending_inventory.toLocaleString()}</td>
                        <td className={`py-2 px-3 text-right ${row.stockout > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          {row.stockout > 0 ? row.stockout.toLocaleString() : '-'}
                        </td>
                        <td className={`py-2 px-3 text-right font-medium ${row.service_level >= 0.95 ? 'text-green-600' : row.service_level >= 0.90 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {(row.service_level * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Statistics */}
            {stats && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 计划摘要分析</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">总预测需求</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalDemand.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">件</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">总产出量</p>
                    <p className="text-2xl font-bold text-green-600">{stats.totalProduction.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">件</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">总缺货量</p>
                    <p className={`text-2xl font-bold ${stats.totalStockout > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {stats.totalStockout.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">件</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">平均期末库存</p>
                    <p className="text-2xl font-bold text-orange-600">{Math.round(stats.avgInventory).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">件</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">平均服务水平</p>
                    <p className={`text-2xl font-bold ${stats.avgServiceLevel >= 0.95 ? 'text-green-600' : stats.avgServiceLevel >= 0.90 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {(stats.avgServiceLevel * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">目标: {state.production_target_service_level ? (state.production_target_service_level * 100).toFixed(0) + '%' : 'N/A'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">缺货期数</p>
                    <p className={`text-2xl font-bold ${stats.stockoutPeriods > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.stockoutPeriods}
                    </p>
                    <p className="text-xs text-gray-500">/ {mpsTable.length} 期</p>
                  </div>
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">💡 结果洞察</h3>
              <div className="space-y-2 text-sm text-green-700">
                {stats && stats.avgServiceLevel >= (state.production_target_service_level || 0.95) ? (
                  <p>✓ 您的生产计划达到了目标服务水平 {state.production_target_service_level ? (state.production_target_service_level * 100).toFixed(0) + '%' : ''}，说明安全库存设置合理。</p>
                ) : (
                  <p>⚠ 平均服务水平低于目标，建议提高安全库存或期初库存。</p>
                )}
                {stats && stats.stockoutPeriods === 0 ? (
                  <p>✓ 整个计划期内无缺货，库存管理良好。</p>
                ) : (
                  <p>⚠ 有 {stats?.stockoutPeriods} 期出现缺货，可能影响客户满意度。</p>
                )}
                {stats && stats.avgInventory > 0 && (
                  <p>• 平均期末库存为 {Math.round(stats.avgInventory)} 件，需权衡库存持有成本。</p>
                )}
              </div>
            </div>

            {/* Complete Button */}
            <button
              onClick={handleComplete}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
            >
              <CheckCircle className="w-5 h-5" />
              <span>完成生产计划制定，进入测验</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FinalPlan;
