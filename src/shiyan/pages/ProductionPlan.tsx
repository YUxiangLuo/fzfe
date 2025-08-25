import React, { useState } from 'react';
import { AppState } from '../App';
import { Calendar, CheckCircle, Factory, Truck, AlertTriangle } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ProductionPlan: React.FC<Props> = ({ completeStep }) => {
  const [planGenerated, setPlanGenerated] = useState(false);

  const handleGeneratePlan = () => {
    setPlanGenerated(true);
    completeStep(7);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">制定生产计划</h1>
          <p className="text-lg text-gray-600">
            基于需求预测结果，制定合理的生产计划。考虑生产能力、库存成本、
            交货期等因素，优化生产排程和资源配置。
          </p>
        </div>

        {!planGenerated ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Factory className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">准备生成生产计划</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              系统将根据您选择的最优预测模型结果，结合企业的生产能力、
              原材料供应情况、市场需求变化等因素，自动生成未来6个月的详细生产计划。
            </p>
            
            <button
              onClick={handleGeneratePlan}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all text-lg font-medium"
            >
              生成生产计划
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-green-800">生产计划生成完成</h2>
              </div>
              <p className="text-green-700">
                恭喜！您已成功完成整个需求预测与生产计划决策流程。
                系统已基于LSTM模型的预测结果生成了详细的生产计划。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">未来6个月生产计划</h3>
                
                <div className="space-y-4">
                  {[
                    { month: '2025年1月', demand: '15,200台', production: '16,000台', status: 'safe' },
                    { month: '2025年2月', demand: '18,500台', production: '19,000台', status: 'safe' },
                    { month: '2025年3月', demand: '12,800台', production: '13,500台', status: 'safe' },
                    { month: '2025年4月', demand: '14,300台', production: '15,000台', status: 'safe' },
                    { month: '2025年5月', demand: '16,900台', production: '17,500台', status: 'safe' },
                    { month: '2025年6月', demand: '13,600台', production: '14,200台', status: 'warning' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{item.month}</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-gray-600">需求: </span>
                          <span className="font-medium">{item.demand}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">计划: </span>
                          <span className="font-medium">{item.production}</span>
                        </div>
                        {item.status === 'safe' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">关键指标</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">总产量计划</span>
                      <span className="font-semibold text-gray-900">95,200 台</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">预计库存成本</span>
                      <span className="font-semibold text-gray-900">¥280万</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">生产线利用率</span>
                      <span className="font-semibold text-green-600">87.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">交货准时率</span>
                      <span className="font-semibold text-green-600">96.2%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <Truck className="inline w-5 h-5 mr-2" />
                    物流安排
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">原材料采购周期</span>
                      <span className="font-medium">15天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">生产周期</span>
                      <span className="font-medium">7天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">配送时间</span>
                      <span className="font-medium">3天</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">实验总结</h3>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>• 通过7个步骤完成了完整的需求预测流程</p>
                    <p>• 学习了3种不同的预测算法及其适用场景</p>
                    <p>• 掌握了评估预测模型质量的关键指标</p>
                    <p>• 体验了从预测到生产计划的决策过程</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionPlan;