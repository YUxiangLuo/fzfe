import React, { useEffect } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const ConceptStep8: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  useEffect(() => {
    if (state.period2Data.demandForecast === null || state.period2Data.stockout === null) {
      return;
    }

    const demand = state.period2Data.demandForecast;
    const stockout = state.period2Data.stockout;

    // ⚠️ 关键修正：基于预测需求，不是实际需求
    const serviceLevel = demand > 0 ? 1 - stockout / demand : 1;

    if (state.period2Data.serviceLevel !== serviceLevel) {
      fillPeriod2Field('serviceLevel', serviceLevel);
    }
  }, [
    fillPeriod2Field,
    state.period2Data.demandForecast,
    state.period2Data.serviceLevel,
    state.period2Data.stockout,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <Target className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">第8列：服务水平</h3>
          <p className="text-sm text-green-600">Service Level</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">⚠️ 计算公式（已修正）</h4>
        <div className="bg-white p-3 rounded border border-gray-200 text-center mb-2">
          <p className="font-mono text-gray-800">
            服务水平 = 1 - (缺货量 / <strong className="text-green-600">预测需求量</strong>)
          </p>
        </div>
        <p className="text-sm text-gray-700">
          <strong>注意</strong>：我们使用<strong>预测需求量</strong>作为基准，而不是"实际需求量"。因为MPS是事前计划工具，所有计算都基于预测数据。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          第2期服务水平：<strong className="text-2xl text-green-600">
            {state.period2Data.serviceLevel !== null
              ? `${(state.period2Data.serviceLevel * 100).toFixed(1)}%`
              : '计算中...'}
          </strong>
        </p>
      </div>

      <button
        onClick={completeCurrentStep}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all font-medium"
      >
        <span>完成学习，生成完整计划</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep8;
