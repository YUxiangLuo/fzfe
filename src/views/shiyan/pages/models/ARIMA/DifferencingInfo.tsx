import React from 'react';

const DifferencingInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">差分阶数选择的意义</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">什么是差分？</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          非季节差分是处理某些非平稳性的常用方法。相邻差分可消除随机游走型单位根，并可减弱低阶确定性趋势；但它不会一般性地消除季节性。季节模式通常需要按季节周期做季节差分或使用季节模型，而本系统没有启用季节 ARIMA。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          一阶差分计算公式为：<strong>ΔY<sub>t</sub> = Y<sub>t</sub> - Y<sub>t-1</sub></strong>
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">不同差分阶数的含义</h4>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-base font-semibold text-blue-700 mb-2">零阶差分（d=0）</p>
            <p className="text-gray-700 leading-relaxed">
              当原序列通过当前 ADF 门槛且后续模型诊断也可接受时，可以不做差分；此时 ARIMA(p,0,q) 就是 ARMA(p,q)。
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-base font-semibold text-indigo-700 mb-2">一阶差分（d=1）</p>
            <p className="text-gray-700 leading-relaxed">
              对随机游走型趋势或确定性线性趋势，一阶差分常可使序列更接近平稳；是否足够仍应看检验和残差，而不是仅凭“有上升趋势”判断。
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-base font-semibold text-purple-700 mb-2">二阶差分（d=2）</p>
            <p className="text-gray-700 leading-relaxed">
              二次差分是对一阶差分再次做相邻差分，可处理部分仍含单位根或低阶趋势的序列。实际应用较少，过度差分可能损失信息并引入额外相关性。
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">如何选择差分阶数？</h4>
        <div className="space-y-3 text-gray-800 text-base">
          <p className="leading-relaxed">
            <strong>1. 观察 ADF 检验结果：</strong>如果原序列 p&lt;0.05，本系统标记 d=0 可用；否则再查看更高差分阶数。
          </p>
          <p className="leading-relaxed">
            <strong>2. 逐步增加差分阶数：</strong>从 d=0 开始；若当前阶数未通过 ADF 门槛，再依次查看 d=1、d=2，优先选择最小的通过阶数。
          </p>
          <p className="leading-relaxed">
            <strong>3. 避免过度差分：</strong>差分阶数过高会导致序列损失过多信息，影响预测精度。一般不超过 2 阶。
          </p>
        </div>
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-base font-semibold text-gray-800 mb-2">注意事项</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          差分阶数 d 是 ARIMA 模型的核心参数之一。ADF 表中的 p 值和“通过/未通过”标识为选择 d 提供单位根证据，但单次检验不能直接证明序列平稳；仍应结合图形、业务背景和模型残差诊断。
        </p>
      </div>
    </div>
  );
};

export default DifferencingInfo;
