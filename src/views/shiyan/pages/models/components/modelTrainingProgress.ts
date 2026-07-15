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
  { label: '生成回测预测', description: '生成评估区间预测，并将最终销量点预测截断到不小于0。', weight: 1.1 },
  { label: '计算评估指标', description: '用非负截断后的同一预测计算残差、RMSE、MAE、R²等指标。', weight: 0.9 },
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
      { label: '执行差分检验', description: '对d=0、1、2分别执行含常数项的ADF检验，并以AIC自动选择检验滞后。', weight: 2.2 },
      { label: '应用ADF门槛', description: 'p<0.05时拒绝单位根零假设并判为通过；否则表示当前证据不足以拒绝单位根，不等于证明序列不平稳。', weight: 0.9 },
      { label: '保存检验结果', description: '将可用的平稳性检验结果写入实验记录。', weight: 0.8 },
    ],
  },
  ma: {
    title: '移动平均模型计算中',
    subtitle: '后端正在按时间窗口计算移动平均预测并评估效果。',
    estimate: '通常需要数秒',
    accent: 'blue',
    steps: [
      { label: '校验时间窗口', description: '确认窗口是2到训练样本数之间的整数。', weight: 0.7 },
      { label: '加载训练数据', description: '读取训练区间和评估区间的销量序列。', weight: 0.8 },
      { label: '计算移动平均', description: '取最近n期均值递推多步，最终销量点预测按max(0, ŷ)截断。', weight: 1.4 },
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
      { label: '拟合指数平滑', description: '固定用户α并估计初始水平；多步保持末尾水平，同时按ETS公式展宽不确定性。', weight: 1.5 },
      ...BASE_FINAL_STEPS,
    ],
  },
  arima: {
    title: 'ARIMA 自动寻优中',
    subtitle: '后端正在进行 AICc 参数搜索、收敛检查、残差诊断和评估预测。',
    estimate: '通常需要几十秒',
    accent: 'indigo',
    steps: [
      { label: '校验差分阶数', description: '确认 d 值、训练样本和评估窗口有效。', weight: 0.8 },
      { label: 'AICc 参数搜索', description: '在有效样本量自适应边界内运行一次非季节stepwise搜索。', weight: 3.2 },
      { label: '收敛检查', description: '必要时提高迭代上限重拟合完全相同的模型规格。', weight: 1.0 },
      { label: '残差诊断', description: '记录自由度修正的Ljung–Box白噪声检验。', weight: 0.8 },
      ...BASE_FINAL_STEPS,
    ],
    tip: '点预测截断为非负；95%区间仍来自未截断的ARIMA分布。模型不包含季节项。',
  },
  lstm: {
    title: 'LSTM 模型训练中',
    subtitle: '后端正在完成特征处理、神经网络训练和回测评估。',
    estimate: '通常需要几十秒到数分钟',
    accent: 'purple',
    steps: [
      { label: '分析字段类型', description: '识别数值、类别和目标字段，准备训练输入。', weight: 0.9 },
      { label: '归一化与构造序列', description: '仅用训练区间拟合缩放/编码器，构造历史窗口与直接多步标签。', weight: 1.4 },
      { label: '构建神经网络', description: '按参数预算创建单层LSTM和horizon长度输出层，配置Adam。', weight: 1.0 },
      { label: '动态轮数训练', description: '标准模式以时间验证loss早停选轮数，再在全部窗口重拟合；小样本标记教学演示。', weight: 4.2 },
      ...BASE_FINAL_STEPS,
    ],
    tip: '逆缩放后的销量点预测截断为非负；只读取历史窗口，不读取未来特征路径。',
  },
  ensemble: {
    title: '融合模型训练中',
    subtitle: '后端正在整合多个基础模型的预测结果，计算过程相对复杂。',
    estimate: '可能需要几分钟',
    accent: 'purple',
    steps: [
      { label: '检查基础模型', description: '确认所选基础模型均已完成且版本匹配，并读取产物中的真实配置。', weight: 1.0 },
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
      { label: '检查基础模型', description: '只读取用户选择的成员配置；隐藏参数将在当前数据段重算。', weight: 1.0 },
      { label: '生成验证集预测', description: '动态留出时间末段并在前缀重拟合，ARIMA阶数与LSTM配置重新推导。', weight: 3.0 },
      { label: '计算模型权重', description: '按验证MSE倒数计算候选权重，再依据样本可靠度向等权收缩。', weight: 1.3 },
      { label: '完整训练与加权组合', description: '成员销量先截断再加权；独立评估只计算指标，不确定性由内部权重验证段残差校准。', weight: 2.5 },
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
      { label: '检查基础模型', description: '确认产物版本并读取用户选择的成员配置。', weight: 1.0 },
      { label: '训练 Level-0 模型', description: '只在前段重拟合，ARIMA重新搜索p/q，生成 Level-1 训练预测。', weight: 3.3 },
      { label: '训练元模型', description: '求解非负无截距最小二乘（NNLS），保留未归一化系数。', weight: 1.4 },
      { label: '生成最终评估预测', description: '截断成员销量后交给元模型；不确定性沿用Level-1组合残差校准。', weight: 2.6 },
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
      { label: '检查基础模型', description: '读取用户选择的成员配置，并按数据推导验证段和最大轮数。', weight: 1.0 },
      { label: '初始化残差', description: '按时间顺序留出验证段，并以原始销量作为第一轮残差目标。', weight: 1.0 },
      { label: '逐轮残差学习', description: '沿用核心配置但改训当前残差；首轮截断非负，后续保留有符号输出。', weight: 4.2 },
      { label: '组合模型链', description: '每阶段用非负平方损失线搜索求系数；不确定性由内部验证残差校准，评估真实值不参与。', weight: 2.0 },
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
