import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ArrowRight } from 'lucide-react';

const Variables: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Calculator className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">计算生产变量</h2>
          <p className="text-green-600 font-medium">理解生产计划的核心平衡公式</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">四大核心生产变量</h3>
          <p className="text-green-700 mb-4">
            一个成功的生产计划，本质上是在以下四个关键变量之间寻求最佳平衡。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900">① 预测需求量 (Demand)</h4>
              <p className="text-sm text-green-800">您通过数据模型预测出的、未来市场可能需要的产品数量。</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900">② 计划产出量 (Production)</h4>
              <p className="text-sm text-green-800">我们根据需求和产能，主动决定要生产的产品数量。</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900">③ 库存量 (Inventory)</h4>
              <p className="text-sm text-green-800">仓库中现有的产品数量，是连接生产与销售的缓冲带。</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900">④ 缺货量 (Shortage)</h4>
              <p className="text-sm text-green-800">当库存和产出无法满足需求时，产生的供应缺口。</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">库存平衡公式</h3>
          <p className="text-gray-600 mb-4">
            这四个变量通过一个基础的库存平衡公式紧密联系在一起，这是制定任何生产计划的基石：
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-lg font-mono text-gray-800">
              <span className="font-bold text-blue-600">期末库存</span> ={' '}
              <span className="text-gray-600">期初库存</span> +{' '}
              <span className="font-bold text-green-600">计划产出</span> -{' '}
              <span className="font-bold text-red-600">预测需求</span>
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="font-semibold text-blue-800">如果 <strong>期末库存 ≥ 0</strong></p>
              <p className="text-blue-700">恭喜，库存足以满足需求，没有缺货。期末库存值就是月底仓库里剩余的产品数量。</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="font-semibold text-red-800">如果 <strong>期末库存 &lt; 0</strong></p>
              <p className="text-red-700">注意，产生了缺货！缺货量就是期末库存的绝对值。例如，-50就代表缺货50件。</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/production/service-level')}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
        >
          <span>我已理解，开始计算服务水平</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Variables;
