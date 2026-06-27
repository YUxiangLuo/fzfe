export type ModelProgressProfileKey =
  | 'adf'
  | 'ma'
  | 'es'
  | 'arima'
  | 'lstm'
  | 'weighted_avg'
  | 'boosting'
  | 'stacking'
  | 'ensemble'
  | 'generic';

export interface TrainingProgressStep {
  label: string;
  description: string;
  weight?: number;
}

export interface TrainingProgressProfile {
  title: string;
  subtitle: string;
  estimate: string;
  accent: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber';
  steps: TrainingProgressStep[];
  tip?: string;
}

const BASE_FINAL_STEPS: TrainingProgressStep[] = [
  { label: '生成回测预测', description: '使用评估区间生成预测值，准备与真实值对比。', weight: 1.1 },
  { label: '计算评估指标', description: '计算 RMSE、MAE、R² 等模型质量指标。', weight: 0.9 },
  { label: '保存模型产物', description: '写入实验模型文件，并等待后端返回训练结果。', weight: 0.9 },
];

export const TRAINING_PROGRESS_PROFILES: Record<ModelProgressProfileKey, TrainingProgressProfile> = {
  generic: {
    title: '模型任务执行中',
    subtitle: '后端正在处理当前模型任务，请保持页面打开。',
    estimate: '通常需要数秒到数分钟',
    accent: 'blue',
    steps: [
      { label: '提交训练请求', description: '校验实验状态、模型参数和训练窗口。', weight: 0.8 },
      { label: '加载实验数据', description: '读取当前行业、企业、产品对应的数据片段。', weight: 0.9 },
      { label: '执行模型计算', description: '调用后端 Python 训练流程并等待结果。', weight: 2.5 },
      ...BASE_FINAL_STEPS,
    ],
  },
  adf: {
    title: 'ADF 平稳性检验中',
    subtitle: '后端正在对训练序列进行不同差分阶数的平稳性检验。',
    estimate: '通常需要十几秒',
    accent: 'indigo',
    steps: [
      { label: '准备训练序列', description: '截取训练区间的销量时间序列。', weight: 0.8 },
      { label: '执行差分检验', description: '依次计算不同差分阶数下的 ADF 统计量和 p 值。', weight: 2.2 },
      { label: '判定平稳性', description: '根据 p 值和临界值判断序列是否平稳。', weight: 0.9 },
      { label: '保存检验结果', description: '将可用的平稳性检验结果写入实验记录。', weight: 0.8 },
    ],
  },
  ma: {
    title: '移动平均模型计算中',
    subtitle: '后端正在按时间窗口计算移动平均预测并评估效果。',
    estimate: '通常需要数秒',
    accent: 'blue',
    steps: [
      { label: '校验时间窗口', description: '确认移动平均窗口不超过训练数据长度。', weight: 0.7 },
      { label: '加载训练数据', description: '读取训练区间和评估区间的销量序列。', weight: 0.8 },
      { label: '计算移动平均', description: '滚动计算历史窗口均值并生成预测。', weight: 1.4 },
      ...BASE_FINAL_STEPS,
    ],
  },
  es: {
    title: '指数平滑模型训练中',
    subtitle: '后端正在拟合指数平滑模型并生成评估预测。',
    estimate: '通常需要数秒',
    accent: 'emerald',
    steps: [
      { label: '校验平滑系数', description: '确认 α 参数和实验数据窗口有效。', weight: 0.7 },
      { label: '加载训练数据', description: '读取训练区间和评估区间的销量序列。', weight: 0.8 },
      { label: '拟合指数平滑', description: '根据平滑系数拟合模型并更新状态。', weight: 1.5 },
      ...BASE_FINAL_STEPS,
    ],
  },
  arima: {
    title: 'ARIMA 自动寻优中',
    subtitle: '后端正在进行 AIC/BIC 参数搜索、模型选择和评估预测。',
    estimate: '通常需要几十秒',
    accent: 'indigo',
    steps: [
      { label: '校验差分阶数', description: '确认 d 值、训练样本和评估窗口有效。', weight: 0.8 },
      { label: 'AIC 参数搜索', description: '搜索 p、q 组合，寻找 AIC 表现更优的候选模型。', weight: 2.4 },
      { label: 'BIC 参数搜索', description: '使用 BIC 准则再次寻优，降低小样本过拟合风险。', weight: 2.4 },
      { label: '选择最优阶数', description: '比较候选模型并确定最终 ARIMA(p,d,q)。', weight: 1.0 },
      ...BASE_FINAL_STEPS,
    ],
    tip: 'ARIMA 的自动搜索由后端算法执行，耗时会随训练窗口和候选阶数组合变化。',
  },
  lstm: {
    title: 'LSTM 模型训练中',
    subtitle: '后端正在完成特征处理、神经网络训练和回测评估。',
    estimate: '通常需要几十秒到数分钟',
    accent: 'purple',
    steps: [
      { label: '分析字段类型', description: '识别数值、类别和目标字段，准备训练输入。', weight: 0.9 },
      { label: '归一化与构造序列', description: '按选择的归一化方式转换数据，并构造 LSTM 时间窗口样本。', weight: 1.4 },
      { label: '构建神经网络', description: '创建 LSTM 层和 Dense 输出层，配置优化器与学习率策略。', weight: 1.0 },
      { label: 'Epoch 训练', description: '在后端逐轮训练神经网络，并应用早停策略保留较优权重。', weight: 4.2 },
      ...BASE_FINAL_STEPS,
    ],
    tip: 'LSTM 训练会占用较多计算资源，请不要刷新或关闭页面。',
  },
  ensemble: {
    title: '融合模型训练中',
    subtitle: '后端正在整合多个基础模型的预测结果，计算过程相对复杂。',
    estimate: '可能需要几分钟',
    accent: 'purple',
    steps: [
      { label: '检查基础模型', description: '确认所选基础模型均已完成训练，并读取可复用模型产物。', weight: 1.0 },
      { label: '生成基础预测', description: '训练或复用基础模型，生成验证区间和评估区间预测。', weight: 3.8 },
      { label: '计算融合结果', description: '组合多个基础模型输出，得到最终融合预测。', weight: 2.0 },
      ...BASE_FINAL_STEPS,
    ],
    tip: '融合模型需要多次调用基础模型，请耐心等待，不要切换或刷新页面。',
  },
  weighted_avg: {
    title: '加权平均融合训练中',
    subtitle: '后端正在基于验证集残差计算基础模型权重并生成加权预测。',
    estimate: '可能需要几分钟',
    accent: 'purple',
    steps: [
      { label: '检查基础模型', description: '确认基础模型状态并读取已训练模型产物。', weight: 1.0 },
      { label: '生成验证集预测', description: '在权重验证集上获取各基础模型预测。', weight: 3.0 },
      { label: '计算模型权重', description: '根据验证集残差 MSE 的倒数计算归一化权重。', weight: 1.3 },
      { label: '完整训练与加权组合', description: '在完整训练区间生成评估预测并加权组合。', weight: 2.5 },
      ...BASE_FINAL_STEPS,
    ],
    tip: '加权平均会多次调用基础模型，训练期间请保持当前页面打开。',
  },
  stacking: {
    title: 'Stacking 融合训练中',
    subtitle: '后端正在训练基础模型、构建元模型并生成最终预测。',
    estimate: '可能需要几分钟',
    accent: 'purple',
    steps: [
      { label: '检查基础模型', description: '确认基础模型配置和已保存模型产物。', weight: 1.0 },
      { label: '训练 Level-0 模型', description: '训练或复用基础模型，生成 Level-1 训练预测。', weight: 3.3 },
      { label: '训练元模型', description: '在 Level-1 预测矩阵上拟合融合元模型。', weight: 1.4 },
      { label: '生成最终评估预测', description: '完整训练基础模型并通过元模型输出最终预测。', weight: 2.6 },
      ...BASE_FINAL_STEPS,
    ],
    tip: 'Stacking 需要基础模型与元模型两层训练，耗时通常比单模型更长。',
  },
  boosting: {
    title: 'Boosting 融合训练中',
    subtitle: '后端正在按残差学习方式逐轮选择基础模型并组合预测。',
    estimate: '可能需要几分钟',
    accent: 'amber',
    steps: [
      { label: '检查基础模型', description: '确认基础模型配置、学习率和最大迭代轮数。', weight: 1.0 },
      { label: '初始化残差', description: '划分 Boosting 训练集和验证集，准备残差序列。', weight: 1.0 },
      { label: '逐轮残差学习', description: '每轮评估候选基础模型，选择残差改进最大的模型。', weight: 4.2 },
      { label: '组合模型链', description: '按学习率累加各轮模型输出，形成最终预测。', weight: 2.0 },
      ...BASE_FINAL_STEPS,
    ],
    tip: 'Boosting 会逐轮训练和评估候选模型，训练时间会随轮数和基础模型数量增加。',
  },
};

export const getTrainingProgressProfile = (
  modelType?: ModelProgressProfileKey,
  isEnsembleModel = false,
): TrainingProgressProfile => {
  if (modelType && TRAINING_PROGRESS_PROFILES[modelType]) {
    return TRAINING_PROGRESS_PROFILES[modelType];
  }

  if (isEnsembleModel) {
    return TRAINING_PROGRESS_PROFILES.ensemble;
  }

  return TRAINING_PROGRESS_PROFILES.generic;
};
