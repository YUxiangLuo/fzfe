import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Boosting 融合 - 方法步骤</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Boosting 与残差提升</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          Boosting 的核心思想是用多个弱学习器串行组合成更强的学习器。后续模型不再重复学习全部目标，而是重点修正前面模型没有解释好的部分。
        </p>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          AdaBoost 是经典代表，它通过调整样本权重关注难预测样本。本系统面向时间序列销量预测，基础模型通常不支持样本权重，因此采用残差提升：每一轮训练候选模型去拟合当前残差，并选择验证残差下降最多的模型加入加法组合。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          在平方误差损失下，拟合残差可以理解为梯度提升的一个直观版本；本系统保留“逐步修正误差”的教学核心，同时兼容 MA、ES、ARIMA、LSTM 等异构时间序列模型。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">算法流程</h4>
        <div className="space-y-3 text-gray-800 leading-relaxed text-base">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <p className="pt-0.5">生成最多三折扩展窗口滚动起点验证，让全部候选逐折拟合原始销量；每个候选通过合并OOF平方损失的非负线搜索求阶段系数，再比较合并残差RMSE。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <p className="pt-0.5">计算当前组合模型的残差（真实值 - 当前预测值）。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <p className="pt-0.5">遍历候选基础模型，分别训练它们拟合当前残差。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <p className="pt-0.5">选择验证残差RMSE最低且达到相对改善阈值的模型；同一种模型类型可以重复入选。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <p className="pt-0.5">重复残差计算和候选选择，最多 min(2K, 验证点数-1) 轮，或在改善不足时提前停止。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
            <p className="pt-0.5">在完整训练区间重训基础学习器并保留OOF选出的阶段系数：第一阶段销量输出截断为非负，后续有符号残差输出不截断；累加后最终物理销量再截断为不小于0。</p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-green-50 rounded-lg border border-green-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">方法特点</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>残差修正：</strong>后续模型重点学习前面模型尚未解释的误差。
          </p>
          <p>
            <strong>异构互补：</strong>可以用不同类型模型逐步修正线性、平滑或非线性误差。
          </p>
          <p>
            <strong>精度潜力：</strong>如果残差含有其他候选模型可学习的结构，组合可能改善；若验证段太短或主要是噪声，也可能退化。
          </p>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          页面中的 Boosting 指残差提升融合，不是 AdaBoost。短OOF校准样本要求至少5%相对改善，其余要求1%；有限的滚动起点样本反复用于贪心选择仍可能产生选择过拟合。选定链在完整训练段逐级重训基础学习器，但部署阶段系数保持为OOF线搜索结果，不用乐观的全量样本内拟合重新估计或裁剪模型链。
        </p>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          引导训练在每一轮把每个“候选模型 × 滚动折”拆成独立检查点，便于控制单步耗时并只重试失败任务。单折结果不会单独求阶段系数 γ；本轮全部有效折完成后，系统才汇总OOF残差、统一线搜索并选择胜出模型。预留但不存在的折会标记为已跳过。
        </p>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          候选只继承用户选择的 MA 窗口、ES α、ARIMA d 及 LSTM 历史特征/归一化；ARIMA 阶数与 LSTM 隐藏配置针对每轮、每折当前目标和历史前缀重算，LSTM 不接收已知未来特征。第一轮目标是销量，后续轮次拟合有符号残差并保留负修正。
        </p>
        <p className="text-gray-700 leading-relaxed text-base">
          更新训练段残差时，序列开头尚无样本内拟合值的位置按“零修正”处理，即保留原残差。例如 MA 必须先凑满完整窗口，LSTM 必须先凑满 look_back；系统不会为这些位置临时改用较短窗口或读取未来值。
        </p>
        <p className="mt-3 text-gray-700 leading-relaxed text-base">
          最终不确定性仅用滚动起点OOF组合残差校准各阶段逐 horizon 增长形状；独立评估区间的真实值只用于误差指标，不参与不确定性校准。
        </p>
      </div>
    </div>
  );
};

export default Intro;
