import React from 'react';

const Intro: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">ARIMA 法 - 方法步骤</h3>
      <p>ARIMA 法的一般步骤为:</p>
      <ol className="list-decimal list-inside space-y-2 text-gray-700">
        <li>
          <strong>平稳性检验:</strong> 使用 ADF 单位根检验对原始数据进行平稳性检验。
        </li>
        <li>
          <strong>差分处理:</strong> 若非平稳，进行差分处理，将非平稳时间序列转化为平稳时间序列。
        </li>
        <li>
          <strong>模型定阶:</strong> 借助自相关(ACF)和偏自相关(PACF)图，初步识别模型的可能形式，然后根据 AIC 等定阶准则选择最佳模型。
        </li>
        <li>
          <strong>参数估计与诊断:</strong> 检验模型参数的显著性、模型的有效性以及残差序列是否为白噪声。
        </li>
        <li>
          <strong>模型预测:</strong> 使用建立的 ARIMA 模型进行预测。
        </li>
      </ol>
    </div>
  );
};

export default Intro;
