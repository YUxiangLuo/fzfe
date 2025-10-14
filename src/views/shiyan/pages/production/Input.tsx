import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { useExperiment } from '../../contexts/ExperimentContext';

const Input: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useExperiment();

  const hasGeneratedForecast = state.production_forecast_periods !== null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Package className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">理解生产投入量</h2>
          <p className="text-blue-600 font-medium">连接过去、现在与未来的生产决策</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Prerequisite Check */}
        {!hasGeneratedForecast && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              ⚠️ 请先在上一步"计算预测量"页面生成需求预测结果。
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 什么是生产投入量 (Production Input)？</h3>
          <p className="text-blue-700">
            "生产投入量"指的是您在当前生产周期（例如本月）需要实际安排生产的产品数量。它不是简单地等于您的"计划生产量"，而是动态调整后的结果，因为它必须考虑上个周期的"遗产"——即剩余的库存和未满足的缺货。
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">生产投入量计算公式</h3>
          <p className="text-gray-600 mb-4">
            这个公式确保了生产的连续性和对历史情况的修正：
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-lg font-mono text-gray-800">
              <span className="font-bold text-blue-600">生产投入量</span> ={' '}
              <span className="font-bold text-green-600">计划生产量</span> -{' '}
              <span className="font-bold text-orange-600">上期期末库存</span> +{' '}
              <span className="font-bold text-red-600">上期缺货量</span>
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">举个例子</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
            <p>• 根据预测，您本月的<strong>计划生产量</strong>（含安全库存）为 <strong>2,150</strong> 件。</p>
            <p>• 假设上月底盘点，仓库里还剩下 <strong>200</strong> 件产品 (<strong>上期期末库存</strong>)。</p>
            <p>• 同时，上月有 <strong>50</strong> 件的订单因缺货未能满足 (<strong>上期缺货量</strong>)。</p>
            <p className="border-t border-gray-200 pt-3 mt-3 font-semibold">
              • <strong>生产投入量</strong> = 2,150 - 200 + 50 = <span className="text-xl text-blue-600">2,000</span> 件。
            </p>
            <p className="text-xs text-gray-500 pt-2">
              这意味着，您本月实际需要下达生产2,000件的指令。这个数量既满足了本月的计划，又利用了现有库存并补上了上月的缺口。
            </p>
          </div>
        </div>

        {hasGeneratedForecast && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">📊 您的生产计划参数</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-gray-600 mb-1">预测期数</p>
                <p className="text-xl font-semibold text-green-700">{state.production_forecast_periods} 期</p>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-gray-600 mb-1">期初库存</p>
                <p className="text-xl font-semibold text-green-700">{state.production_initial_inventory?.toLocaleString()} 件</p>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-gray-600 mb-1">目标服务水平</p>
                <p className="text-xl font-semibold text-green-700">
                  {state.production_target_service_level ? `${(state.production_target_service_level * 100).toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <p className="text-gray-600 mb-1">安全库存系数</p>
                <p className="text-xl font-semibold text-green-700">
                  Z = {state.production_safety_stock_z_score?.toFixed(2) || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">💡 为什么不能只看预测？</h3>
          <p className="text-green-700 text-sm">
            只看预测会导致生产与实际脱节。不考虑现有库存会造成积压和资金浪费；不理会上期缺货则会损害客户关系和市场信誉。这个公式确保了生产计划的平稳和可持续性。
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🔄 接下来：生成完整MPS表</h3>
          <p className="text-blue-700 text-sm mb-3">
            在下一步中，我们将基于您设定的参数和预测结果，生成一张完整的<strong>主生产计划表（MPS Table）</strong>。
          </p>
          <p className="text-blue-700 text-sm">
            该表格将展示每个预测期的：预测需求、计划生产、投入量、期初/期末库存、缺货情况、服务水平等关键指标。这将是您制定生产决策的核心依据。
          </p>
        </div>

        <button
          onClick={() => navigate('/production/final-plan')}
          disabled={!hasGeneratedForecast}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <span>我已理解，生成完整MPS表</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Input;
