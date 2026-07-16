import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">Stacking 融合 - 方法步骤</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg border border-teal-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">两层架构</h4>
        <p className="text-gray-800 leading-relaxed text-base">
          Stacking 通常可以分为两层，第一层被称为<span className="font-semibold text-teal-700">初级学习器（基学习器）</span>。第二层指<span className="font-semibold text-emerald-700">元学习器（次级学习器）</span>。次级学习器层的输入为初级学习器输出的结果，通过训练输出最终模型结果。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">方法原理</h4>
        <p className="text-gray-800 leading-relaxed text-base">
          常见 Stacking 会使用折外预测训练元模型。普通随机K折不满足销量预测的时间因果顺序；本系统生成最多三折扩展窗口滚动起点预测，每折只用历史前缀训练基础模型，再合并它们对紧随后段Level-1的OOF预测训练元模型。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-lime-50 rounded-lg border border-green-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">方法特点</h4>
        <ul className="space-y-2 text-gray-800 leading-relaxed text-base list-disc list-inside">
          <li>能够结合多个不同类型的基本模型，更好地捕捉数据中的不同特征和模式</li>
          <li>使用验证段互不重叠的时间顺序滚动OOF数据来减少单次切分偶然性和时间泄漏风险</li>
          <li>成员互补且Level-1样本足够时具有改进潜力，但不保证优于单模型或简单平均</li>
        </ul>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          本系统按时间顺序生成最多三折扩展窗口 Level-0/Level-1，单折 Level-1 至少保留成员数+2个点且各折验证段互不重叠。元模型在合并OOF矩阵上直接求解无截距非负最小二乘（NNLS），保留原始系数而不强制总和为1。样本只支持一折时明确标记退化，再不足则拒绝训练，不切换为 inverse-MAE 等另一种融合算法。
        </p>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          引导训练把每个“基础模型 × Level-1折”作为可单独执行和失败重试的检查点。单折完成只保存该折特征列；全部有效折完成后才拼接完整OOF矩阵并拟合一次NNLS元模型。预留但不存在的折会明确标记为已跳过。
        </p>
        <p className="text-gray-700 leading-relaxed text-base">
          每折 Level-0 只继承用户选择的 MA 窗口、ES α、ARIMA d 与 LSTM 历史特征/归一化；ARIMA 阶数和 LSTM 隐藏配置均按该折前缀重算，LSTM 不接收已知未来特征。不确定性仅用合并 Level-1 OOF组合残差校准成员逐 horizon 增长形状，独立评估真实值不参与校准；证据不足时明确标记 fallback。
        </p>
      </div>
    </div>
  );
};

export default Intro;
