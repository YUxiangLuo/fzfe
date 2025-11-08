import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  ChartSpline,
  Sigma,
  BrainCircuit,
  Scale,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  Target,
  Settings,
  TrendingUp,
  Circle,
  Eye,
  Award,
} from 'lucide-react';

interface ModelDetail {
  id: string;
  name: string;
  icon: React.ElementType;
  type: 'basic' | 'ensemble';
  principle: string;
  detailedPrinciple: string[];
  workflow: string[];
  parameters: { name: string; description: string }[];
  scenario: string;
  advantages: string[];
  disadvantages: string[];
  tips: string[];
}

const ModelIntroduction: React.FC = () => {
  const navigate = useNavigate();
  const [activeModelId, setActiveModelId] = useState<string>('moving_average');
  const [readModels, setReadModels] = useState<Set<string>>(new Set(['moving_average'])); // 初始包含第一个模型
  const contentRef = useRef<HTMLDivElement>(null);

  const models: ModelDetail[] = [
    {
      id: 'moving_average',
      name: '移动平均法',
      icon: LineChart,
      type: 'basic',
      principle: '移动平均法通过计算一定时期内数据的平均值来预测未来趋势，能够有效平滑数据中的随机波动。',
      detailedPrinciple: [
        '移动平均法的核心思想是用最近 N 个时期的平均值作为下一时期的预测值。',
        '简单移动平均：对所有历史数据赋予相同权重，计算公式为 F(t+1) = (X(t) + X(t-1) + ... + X(t-N+1)) / N',
        '该方法假设未来趋势延续最近 N 期的平均水平，适合处理平稳的时间序列数据。',
        '窗口大小 N 的选择至关重要：N 值越大，预测越平滑但滞后越明显；N 值越小，对近期变化反应越快但易受噪声影响。',
      ],
      workflow: [
        '选择合适的窗口大小 N（通常为 3-12 个时期）',
        '从历史数据中提取最近 N 个观测值',
        '计算这 N 个观测值的算术平均值',
        '将该平均值作为下一时期的预测值',
        '随着新数据加入，窗口向前滑动，剔除最早的数据',
      ],
      parameters: [
        { name: '窗口大小 (N)', description: '用于计算平均值的历史数据点数量。N 越大，预测越平滑；N 越小，对变化反应越快。' },
      ],
      scenario: '适用于需求相对稳定、波动较小的产品，如日常消费品、成熟期产品。不适合有明显趋势或季节性的数据。',
      advantages: [
        '计算简单直观，易于理解和向管理层解释',
        '能有效过滤随机波动和短期异常值',
        '不需要复杂的参数设置，实施成本低',
        '对数据要求不高，少量历史数据即可使用',
      ],
      disadvantages: [
        '对突发变化和转折点反应滞后，存在时滞效应',
        '无法捕捉数据中的趋势和季节性模式',
        '所有历史数据权重相同，未考虑近期数据更重要',
        '预测值始终落后于实际值的变化',
      ],
      tips: [
        '对于稳定需求的产品，建议选择较大的窗口（N=6-12）',
        '对于需要快速响应市场变化的产品，选择较小的窗口（N=3-5）',
        '可以通过试验不同的 N 值，选择使预测误差最小的窗口大小',
      ],
    },
    {
      id: 'exponential_smoothing',
      name: '指数平滑法',
      icon: ChartSpline,
      type: 'basic',
      principle: '指数平滑法对历史数据赋予不同权重，近期数据权重更大，能够快速响应数据变化。',
      detailedPrinciple: [
        '指数平滑法通过加权平均的方式，对不同时期的数据赋予不同权重，近期数据权重呈指数递减。',
        '一次指数平滑公式：F(t+1) = α × X(t) + (1-α) × F(t)，其中 α 为平滑系数（0<α<1）',
        '平滑系数 α 决定了新旧数据的权重分配：α 越大，对近期数据反应越敏感；α 越小，预测越平稳。',
        '该方法可以扩展到二次、三次指数平滑，分别用于捕捉线性趋势和二次趋势。',
      ],
      workflow: [
        '选择合适的平滑系数 α（通常在 0.1-0.3 之间）',
        '确定初始预测值（通常使用前几期数据的平均值）',
        '根据公式计算新的预测值：加权结合实际值和上期预测值',
        '更新预测值，继续下一期预测',
        '可根据预测误差动态调整平滑系数',
      ],
      parameters: [
        { name: '平滑系数 (α)', description: '控制新旧数据的权重分配，取值范围 0-1。α=0.1 适合平稳数据，α=0.3 适合波动数据。' },
        { name: '初始值', description: '首次预测的起始值，通常使用前 3-5 期数据的平均值作为初始预测。' },
      ],
      scenario: '适用于有一定波动但无明显季节性的需求预测，如电子产品、快时尚商品。可以快速适应市场变化。',
      advantages: [
        '对近期数据变化反应灵敏，能快速调整预测',
        '计算效率高，只需保存上一期预测值',
        '可以通过调整平滑系数适应不同的数据特征',
        '可扩展到处理趋势性和季节性数据（Holt-Winters方法）',
      ],
      disadvantages: [
        '平滑系数的选择对结果影响很大，需要经验或优化',
        '对异常值较为敏感，可能导致预测偏差',
        '初始值的选择会影响前期预测效果',
        '基础指数平滑无法处理明显的趋势和季节性',
      ],
      tips: [
        '平滑系数建议从 0.2 开始，根据预测效果逐步调整',
        '如果数据有明显趋势，建议使用 Holt 二次指数平滑',
        '如果数据有季节性，建议使用 Holt-Winters 方法',
        '定期回顾并调整平滑系数以适应市场变化',
      ],
    },
    {
      id: 'arima',
      name: 'ARIMA模型',
      icon: Sigma,
      type: 'basic',
      principle: 'ARIMA是自回归移动平均模型，结合自回归(AR)、差分(I)和移动平均(MA)，能处理非平稳时间序列。',
      detailedPrinciple: [
        'ARIMA(p,d,q) 模型由三个部分组成：AR(p) 自回归、I(d) 差分、MA(q) 移动平均。',
        'AR(p)：当前值由过去 p 个值的线性组合加上白噪声构成，捕捉数据的自相关性。',
        'I(d)：对原始数据进行 d 次差分，消除趋势使数据平稳化。',
        'MA(q)：当前值由过去 q 个预测误差的线性组合加上白噪声构成，捕捉预测误差的相关性。',
        '模型参数 p, d, q 需要通过 ACF、PACF 图识别，或使用 AIC/BIC 准则自动选择。',
      ],
      workflow: [
        '检验时间序列的平稳性（使用 ADF 检验）',
        '若非平稳，进行差分处理直到平稳（确定 d 值）',
        '观察 ACF 和 PACF 图，初步确定 p 和 q 值',
        '使用最大似然估计拟合模型参数',
        '进行残差检验，确保残差为白噪声',
        '使用拟合好的模型进行预测',
      ],
      parameters: [
        { name: 'p (AR阶数)', description: '自回归项的阶数，表示使用过去多少期的值来预测当前值。通常 p≤5。' },
        { name: 'd (差分阶数)', description: '差分次数，用于使数据平稳。通常 d=0, 1, 或 2，多数情况 d=1 即可。' },
        { name: 'q (MA阶数)', description: '移动平均项的阶数，表示使用过去多少期的预测误差。通常 q≤5。' },
      ],
      scenario: '适用于具有趋势性、自相关性的复杂时间序列，如股票价格、宏观经济指标、季节性销售数据。',
      advantages: [
        '理论基础扎实，统计性质明确',
        '能同时处理趋势、自相关和移动平均特性',
        '可以建模复杂的时间序列模式',
        '预测精度通常高于简单方法',
        '可扩展为 SARIMA 处理季节性数据',
      ],
      disadvantages: [
        '参数识别和模型选择需要专业知识',
        '对数据平稳性要求高，需要预处理',
        '计算复杂度较高，训练时间较长',
        '对于短时间序列效果可能不佳',
        '模型解释性相对较差',
      ],
      tips: [
        '先进行探索性数据分析，了解数据的基本特征',
        '差分次数通常不超过 2 次，过度差分会丢失信息',
        '可以尝试多组 (p,d,q) 组合，选择 AIC 最小的模型',
        '残差诊断很重要，确保残差为白噪声',
      ],
    },
    {
      id: 'lstm',
      name: 'LSTM神经网络',
      icon: BrainCircuit,
      type: 'basic',
      principle: 'LSTM是长短期记忆网络，一种深度学习模型，能学习时间序列中的长期依赖关系和复杂非线性模式。',
      detailedPrinciple: [
        'LSTM 通过门控机制（输入门、遗忘门、输出门）解决了传统 RNN 的梯度消失问题。',
        '遗忘门决定从细胞状态中丢弃哪些信息，输入门决定存储哪些新信息，输出门决定输出哪些信息。',
        '细胞状态像传送带一样贯穿整个链，使信息能够长期保留，从而捕捉长期依赖关系。',
        'LSTM 可以自动学习特征，无需手动进行特征工程，适合处理多变量、高维度的时间序列数据。',
        '通过堆叠多层 LSTM 和配合注意力机制，可以提升模型对复杂模式的捕捉能力。',
      ],
      workflow: [
        '数据预处理：归一化处理，划分训练集、验证集、测试集',
        '构建时间窗口：将时间序列转换为监督学习问题',
        '设计网络结构：确定 LSTM 层数、隐藏单元数、激活函数等',
        '训练模型：使用反向传播和梯度下降优化模型参数',
        '评估模型：在验证集上评估，调整超参数',
        '进行预测：使用训练好的模型对未来进行预测',
      ],
      parameters: [
        { name: '时间窗口大小', description: '用于预测的历史时间步数，通常为 7-30 天。窗口越大能捕捉更长期的模式。' },
        { name: '隐藏单元数', description: 'LSTM 层的神经元数量，通常为 50-200。更多单元可学习更复杂模式但易过拟合。' },
        { name: 'LSTM 层数', description: '堆叠的 LSTM 层数，通常为 1-3 层。多层可提升表达能力但增加计算成本。' },
        { name: '学习率', description: '控制参数更新步长，通常为 0.001-0.01。需要配合学习率衰减策略。' },
        { name: 'Batch Size', description: '每次训练的样本数，通常为 32-128。影响训练速度和模型泛化能力。' },
      ],
      scenario: '适用于数据量充足（至少数百个观测点）、模式复杂、存在长期依赖的预测场景，如能源消耗、交通流量。',
      advantages: [
        '能自动学习复杂的非线性模式和长期依赖',
        '可以处理多变量输入，融合多源信息',
        '不需要数据平稳性假设，适应性强',
        '对于大规模数据集效果优异',
        '可以通过迁移学习利用预训练模型',
      ],
      disadvantages: [
        '需要大量数据才能有效训练（通常需要数百到数千个样本）',
        '训练时间长，需要较强的计算资源（GPU）',
        '模型黑箱性质，解释性差',
        '超参数调优复杂，需要大量实验',
        '容易过拟合，需要正则化技术',
      ],
      tips: [
        '数据量不足时不建议使用，优先考虑传统方法',
        '一定要进行数据归一化（如 MinMaxScaler）',
        '使用早停法(Early Stopping)防止过拟合',
        '可以尝试添加 Dropout 层提高泛化能力',
        '如果训练集不够大，考虑使用数据增强技术',
      ],
    },
    {
      id: 'weighted_ensemble',
      name: '加权平均融合',
      icon: Scale,
      type: 'ensemble',
      principle: '加权平均融合通过对多个基础模型的预测结果按权重加权平均，综合各模型优势，提高预测稳定性。',
      detailedPrinciple: [
        '集成学习的核心思想是"三个臭皮匠，顶个诸葛亮"，通过组合多个模型的预测结果降低单一模型的风险。',
        '加权平均融合公式：F = w1×F1 + w2×F2 + ... + wn×Fn，其中 wi 为第 i 个模型的权重，∑wi = 1。',
        '权重可以根据各模型在验证集上的表现确定：表现好的模型权重大，表现差的模型权重小。',
        '常用的权重确定方法：等权重、基于误差倒数、基于模型性能评分、优化算法求解最优权重。',
      ],
      workflow: [
        '训练多个不同的基础模型（至少 2 个）',
        '在验证集上评估各基础模型的预测性能',
        '根据性能指标（RMSE、MAE等）确定每个模型的权重',
        '对各模型的预测结果进行加权平均',
        '在测试集上评估融合模型的效果',
        '根据反馈调整权重配置',
      ],
      parameters: [
        { name: '模型权重', description: '各基础模型的权重系数，和为 1。可以等权重（1/n），或根据模型性能动态分配。' },
        { name: '基础模型选择', description: '选择要融合的基础模型。建议选择差异较大、互补性强的模型组合。' },
      ],
      scenario: '适用于多个基础模型预测效果相近、各有优劣的场景。通过融合可以提高预测稳定性，降低风险。',
      advantages: [
        '简单有效，实施成本低',
        '能够综合多个模型的优点，提高稳定性',
        '降低单一模型的预测风险和偶然误差',
        '权重可解释，便于向管理层说明',
        '对基础模型性能要求不苛刻',
      ],
      disadvantages: [
        '权重设置需要经验或优化算法',
        '如果基础模型质量差异很大，效果有限',
        '通常无法超越表现最好的单一模型',
        '模型多样性不足时融合收益小',
      ],
      tips: [
        '选择原理不同、互补性强的模型进行融合',
        '可以先使用等权重，再根据效果调整',
        '定期重新评估并更新权重配置',
        '融合模型数量建议 2-4 个，过多反而可能降低性能',
      ],
    },
    {
      id: 'boosting_ensemble',
      name: 'Boosting融合',
      icon: Sparkles,
      type: 'ensemble',
      principle: 'Boosting通过迭代训练多个模型，每个新模型重点关注前一模型预测错误的部分，逐步提升整体预测能力。',
      detailedPrinciple: [
        'Boosting 是一种串行集成方法，通过逐步纠正前一个模型的错误来提升整体性能。',
        '核心思想：训练第一个模型后，找出预测误差较大的样本，提高这些样本的权重，训练第二个模型时更关注这些难预测的样本。',
        '常见的 Boosting 算法包括 AdaBoost、Gradient Boosting、XGBoost、LightGBM 等。',
        'Gradient Boosting 通过拟合前一个模型的残差，逐步降低整体预测误差。',
        '最终预测：F = F1 + F2 + ... + Fn，每个模型关注前一个模型的不足。',
      ],
      workflow: [
        '初始化：训练第一个基础预测模型',
        '计算残差：计算第一个模型的预测误差',
        '训练新模型：用残差作为新的目标变量训练第二个模型',
        '更新预测：将新模型的预测累加到之前的预测上',
        '迭代：重复步骤 2-4，直到达到预设的模型数量或误差阈值',
        '组合：将所有模型的预测结果累加得到最终预测',
      ],
      parameters: [
        { name: '基模型数量 (n_estimators)', description: '迭代训练的模型数量，通常为 50-200。数量越多精度越高，但易过拟合。' },
        { name: '学习率 (learning_rate)', description: '每个模型对最终预测的贡献度，通常为 0.01-0.1。较小的学习率需要更多模型。' },
        { name: '树深度 (max_depth)', description: '如使用决策树作为基模型，控制树的最大深度，通常为 3-10。' },
      ],
      scenario: '适用于希望最大化预测精度、对计算资源和训练时间不敏感的场景。在机器学习竞赛中广泛使用。',
      advantages: [
        '能显著提升预测精度，通常优于单一模型',
        '自适应调整，自动关注难预测的样本',
        '理论上可以拟合任意复杂的函数',
        '有成熟的工具库支持（如 XGBoost、LightGBM）',
      ],
      disadvantages: [
        '容易过拟合，需要精心调参',
        '对噪声和异常值敏感',
        '训练时间较长，模型串行训练无法并行',
        '模型复杂度高，解释性差',
        '需要较多的历史数据',
      ],
      tips: [
        '从较小的学习率（0.01-0.05）开始，配合较多的模型数量',
        '使用交叉验证选择最优的模型数量，防止过拟合',
        '可以使用早停法在验证集误差不再下降时停止训练',
        '数据预处理和异常值处理非常重要',
      ],
    },
    {
      id: 'stacking_ensemble',
      name: 'Stacking融合',
      icon: Layers,
      type: 'ensemble',
      principle: 'Stacking使用元模型学习如何最优组合多个基础模型的预测，通过两层学习结构提升预测性能。',
      detailedPrinciple: [
        'Stacking 是一种两层的集成学习方法：第一层是多个基础模型，第二层是元模型（Meta-Model）。',
        '基础模型（Base Models）：训练多个不同的模型，如线性回归、决策树、神经网络等。',
        '元模型（Meta-Model）：学习如何组合基础模型的预测结果，通常使用简单的线性模型或逻辑回归。',
        '关键技术：使用交叉验证生成训练元模型的数据，避免信息泄露和过拟合。',
        '元模型的输入是各基础模型的预测值，输出是最终预测结果。',
      ],
      workflow: [
        '数据分割：将训练集划分为 K 折',
        '训练基础模型：对每一折，用其他 K-1 折训练基础模型，在该折上预测',
        '生成元特征：收集所有基础模型在各折上的预测，作为元模型的训练数据',
        '训练元模型：使用元特征训练元模型（如线性回归）',
        '测试阶段：用完整训练集重新训练基础模型，在测试集上预测，再用元模型组合',
        '输出：元模型的预测结果作为最终预测',
      ],
      parameters: [
        { name: '基础模型选择', description: '选择多个不同类型的模型，建议 3-5 个。模型差异越大，融合效果越好。' },
        { name: '元模型类型', description: '通常使用简单的线性模型（线性回归、Ridge 回归）避免过拟合。' },
        { name: '交叉验证折数 (K)', description: '生成元特征时的折数，通常为 5 或 10。折数越多，元特征质量越高。' },
      ],
      scenario: '适用于有多个性能优秀的基础模型，希望通过智能组合获得最佳预测效果，且有充足数据的场景。',
      advantages: [
        '能充分利用各基础模型的优势',
        '元模型可以学习最优组合策略，效果通常优于简单平均',
        '理论上可以达到接近最优的预测性能',
        '灵活性高，可以组合任意类型的模型',
      ],
      disadvantages: [
        '实现复杂，需要两层训练和交叉验证',
        '训练成本高，需要更多计算资源',
        '需要额外的验证集训练元模型',
        '容易过拟合，元模型选择很重要',
        '模型解释性差，难以理解组合逻辑',
      ],
      tips: [
        '基础模型应该是不同类型、互补性强的模型',
        '元模型建议使用简单的线性模型，避免过拟合',
        '使用 5 折或 10 折交叉验证生成元特征',
        '可以尝试多个元模型，选择效果最好的',
        '确保有足够的数据量，否则可能不如简单方法',
      ],
    },
  ];

  const defaultModel = models[0]!;
  const activeModel = models.find(m => m.id === activeModelId) ?? defaultModel;
  const Icon = activeModel.icon;

  const allModelsRead = readModels.size === models.length;
  const readCount = readModels.size;

  // 滚动到顶部当切换模型时
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeModelId]);

  const handleModelClick = (modelId: string) => {
    setActiveModelId(modelId);
    // 点击进入即标记为已读
    setReadModels((prev) => {
      const newSet = new Set(prev);
      newSet.add(modelId);
      return newSet;
    });
  };

  const handlePrevious = () => {
    navigate('/model/window');
  };

  const handleNext = () => {
    if (allModelsRead) {
      navigate('/model/model-select');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 顶部进度区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">需求预测模型介绍</h2>
            <p className="text-gray-600 text-sm mt-1">
              了解每个模型的原理、参数、适用场景 · 请仔细阅读所有模型介绍
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 阅读进度 */}
            {!allModelsRead && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <Eye className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 font-medium">
                  已阅读 {readCount}/{models.length}
                </span>
              </div>
            )}
            {allModelsRead && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  已完成所有模型学习 ✓
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 - 左右布局 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 min-h-0 overflow-hidden flex">
        {/* 左侧：模型导航列表 */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">模型列表</h3>
            <p className="text-xs text-gray-600 mt-1">点击查看详细介绍</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {/* 基础模型 */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2 px-2">基础模型 (4个)</div>
                {models.filter(m => m.type === 'basic').map((model) => {
                  const ModelIcon = model.icon;
                  const isActive = model.id === activeModelId;
                  const isRead = readModels.has(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelClick(model.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left ${
                        isActive
                          ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                          : 'border-2 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <ModelIcon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                          {model.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {isRead ? '已阅读' : '未阅读'}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isRead ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 融合模型 */}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2 px-2">融合模型 (3个)</div>
                {models.filter(m => m.type === 'ensemble').map((model) => {
                  const ModelIcon = model.icon;
                  const isActive = model.id === activeModelId;
                  const isRead = readModels.has(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelClick(model.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left ${
                        isActive
                          ? 'bg-purple-50 border-2 border-purple-500 shadow-sm'
                          : 'border-2 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        <ModelIcon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${isActive ? 'text-purple-900' : 'text-gray-900'}`}>
                          {model.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {isRead ? '已阅读' : '未阅读'}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isRead ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：模型详细内容 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto p-6"
          >
            <div className="space-y-4 max-w-4xl">
              {/* 模型标题和图标 */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    activeModel.type === 'basic' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    <Icon className={`w-7 h-7 ${
                      activeModel.type === 'basic' ? 'text-blue-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{activeModel.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      activeModel.type === 'basic'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {activeModel.type === 'basic' ? '基础模型' : '融合模型'}
                    </span>
                  </div>
                </div>
                {/* 阅读状态标记 */}
                {readModels.has(activeModel.id) && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">已阅读</span>
                  </div>
                )}
                {!readModels.has(activeModel.id) && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600">滚动到底部标记为已读</span>
                  </div>
                )}
              </div>

              {/* 概述 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 leading-relaxed">{activeModel.principle}</p>
              </div>

              {/* 详细原理 */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  详细原理
                </h4>
                <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                  {activeModel.detailedPrinciple.map((text, idx) => (
                    <p key={idx} className="pl-4 border-l-2 border-gray-300">{text}</p>
                  ))}
                </div>
              </div>

              {/* 工作流程 */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  工作流程
                </h4>
                <div className="space-y-2">
                  {activeModel.workflow.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 参数说明 */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  参数说明
                </h4>
                <div className="space-y-2">
                  {activeModel.parameters.map((param, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900 text-sm mb-1">{param.name}</div>
                      <div className="text-xs text-gray-600">{param.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 适用场景 */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  适用场景
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed bg-orange-50 border border-orange-200 rounded-lg p-3">
                  {activeModel.scenario}
                </p>
              </div>

              {/* 优缺点 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    优点
                  </h4>
                  <ul className="space-y-1">
                    {activeModel.advantages.map((adv, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-500 mt-1 flex-shrink-0">✓</span>
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    缺点
                  </h4>
                  <ul className="space-y-1">
                    {activeModel.disadvantages.map((dis, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-500 mt-1 flex-shrink-0">✗</span>
                        <span>{dis}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 使用建议 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">💡 使用建议</h4>
                <ul className="space-y-1">
                  {activeModel.tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-amber-900 flex items-start gap-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 底部提示 */}
              {!readModels.has(activeModel.id) && (
                <div className="bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg p-4 text-center">
                  <Eye className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-blue-900 font-medium">继续滚动到页面底部</p>
                  <p className="text-xs text-blue-700 mt-1">阅读完成后将自动标记为已读</p>
                </div>
              )}
              {readModels.has(activeModel.id) && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-900 font-medium">您已完成本模型的学习</p>
                  <p className="text-xs text-green-700 mt-1">可以继续学习其他模型</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部导航按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all hover:shadow-md font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            上一步
          </button>

          <div className="flex items-center gap-3">
            {!allModelsRead && (
              <span className="text-sm text-gray-600">
                还需阅读 <span className="font-bold text-amber-600">{models.length - readCount}</span> 个模型
              </span>
            )}
            <button
              onClick={handleNext}
              disabled={!allModelsRead}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium ${
                allModelsRead
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!allModelsRead ? '请先阅读完所有模型介绍' : ''}
            >
              {allModelsRead ? '开始选择模型' : '下一步'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelIntroduction;
