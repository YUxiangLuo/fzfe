import React from 'react';
import { Database, Cpu, TrendingUp } from 'lucide-react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">LSTM 法 - 方法步骤</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          LSTM 法的一般步骤为:
        </p>
      </div>

      <div className="space-y-4 mt-8">
        <div className="flex gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-blue-600" />
              <p className="text-gray-800 font-medium">对时序数据进行标准化或归一化处理。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-purple-600" />
              <p className="text-gray-800 font-medium">构建和训练 LSTM 模型；使用训练集数据对模型进行训练通过优化算法调整模型参数，使其能够有效捕捉数据中的时间依赖关系。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            3
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-gray-800 font-medium">模型预测。</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          LSTM 的教科书重点是门控单元的记忆机制。本系统采用单层 LSTM 加全连接输出层，配合 Dropout 与 L2 正则抑制小样本过拟合；回看窗口和隐藏单元数由系统按训练样本量自动设置，最大训练轮数默认 20，并支持在训练损失进入平台期时早停。训练页只开放归一化方式和输入特征。评估阶段采用直接多步输出，生产阶段固定直接输出未来 6 期；若数据不足，系统会要求先调整数据窗口。
        </p>
      </div>
    </div>
  );
};

export default Intro;
