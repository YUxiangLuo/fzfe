import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import {
  Scale,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info,
  ThumbsUp,
  ThumbsDown,
  Target,
  Workflow,
  Settings,
  Gauge,
  CheckCheck,
  XCircle,
  BookOpen,
  Briefcase,
  Lightbulb,
} from 'lucide-react';

// Define a type for better type safety
interface EnsembleModel {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  category: string;
  summary: string;
  principle: {
    description: string;
    keyIdea: string;
  };
  mathematics?: {
    description: string;
    formula: string;
    variables: { symbol: string; meaning: string }[];
    example: string;
  };
  workflow: {
    steps: { title: string; description: string; tip: string }[];
  };
  parameters: {
    name: string;
    description: string;
    impact: string;
    typical: string;
  }[];
  suitability: {
    suitable: string[];
    notSuitable: string[];
  };
  useCases: {
    industry: string;
    scenario: string;
    description: string;
  }[];
  pros: { title: string; description: string }[];
  cons: { title: string; description: string }[];
  bestPractices: string[];
  performance: {
    speed: { level: string; description: string };
    accuracy: { level: string; description: string };
    dataRequirement: { level: string; description: string };
    complexity: { level: string; description: string };
  };
}

// Corrected and verified ensemble models data
const ensembleModels: EnsembleModel[] = [
  {
    id: 'weighted_ensemble',
    name: '加权平均融合',
    shortName: 'Weighted',
    icon: Scale,
    category: '模型融合方法',
    summary: '加权平均融合根据各基础模型的预测性能分配权重，性能越好权重越高，最终预测是所有模型的加权组合。本系统采用方差倒数加权法。',
    principle: {
      description: '加权平均的核心思想是"让优秀的模型有更大发言权"。每个基础模型在验证集上都有不同的表现，我们根据其误差大小（方差）分配权重。方差越小（预测越稳定准确），权重越大。这样可以自动平衡各模型的优缺点，取长补短。',
      keyIdea: '用数据驱动的方式自动确定各模型的重要性，而非简单平均或主观判断。本系统使用方差倒数加权。'
    },
    mathematics: {
      description: '方差倒数加权的计算公式：',
      formula: 'w_i = (1/σ²_i) / Σ(1/σ²_j)\nŷ = Σ(w_i · ŷ_i)',
      variables: [
        { symbol: 'w_i', meaning: '模型i的权重' },
        { symbol: 'σ²_i', meaning: '模型i在验证集上的预测方差' },
        { symbol: 'ŷ_i', meaning: '模型i的预测值' },
        { symbol: 'ŷ', meaning: '最终融合预测值' }
      ],
      example: '假设3个模型方差为：0.01, 0.04, 0.09，则权重为：100/(100+25+11.1)≈0.73, 0.18, 0.09。方差最小的模型获得73%的权重。'
    },
    workflow: {
      steps: [
        { title: '训练基础模型', description: '分别训练多个不同的基础模型（如MA、ES、ARIMA、LSTM）。', tip: '模型越多样化，融合效果通常越好' },
        { title: '验证集评估', description: '在独立的验证集上评估每个模型，计算其预测误差的方差。', tip: '验证集必须未用于训练，避免权重过拟合' },
        { title: '计算权重', description: '根据方差倒数公式计算每个模型的权重，方差小的模型获得更高权重。', tip: '权重之和为1' },
        { title: '加权融合', description: '对于新的预测任务，用计算好的权重对各模型预测进行加权求和。', tip: '权重固定后可快速预测' }
      ]
    },
    parameters: [{ name: '验证集划分', description: '用于计算权重的验证数据比例', impact: '太小权重不可靠，太大训练数据不足', typical: '10-20%的数据用于验证' }],
    suitability: {
      suitable: ['有多个基础模型可用', '基础模型性能有差异', '追求稳健性和鲁棒性', '需要可解释的融合方法', '计算资源有限'],
      notSuitable: ['只有一个基础模型', '所有模型高度相关（预测几乎相同）', '需要捕捉模型间复杂交互', '验证集数据不足', '基础模型都表现很差']
    },
    useCases: [
      { industry: '零售', scenario: '销量预测融合', description: '超市综合MA、ES、ARIMA三个模型预测周销量。ARIMA方差最小（100件²），权重60%；ES次之（200件²），权重30%；MA最大（300件²），权重10%。融合后RMSE降低15%。' },
      { industry: '气象', scenario: '多模式天气预报', description: '气象台融合欧洲、美国、日本三个数值预报模型。根据各模型历史准确率（方差倒数）加权，生成本地化预报，准确率优于任何单一模型。' }
    ],
    pros: [
      { title: '简单高效', description: '实现容易，计算快速，无额外训练成本' },
      { title: '直观可解释', description: '权重有明确含义，可理解各模型贡献' },
      { title: '稳健性强', description: '分散单一模型风险，预测更可靠' },
      { title: '方差最优', description: '方差倒数加权在线性组合中理论上最优（最小方差）' }
    ],
    cons: [
      { title: '线性限制', description: '只是简单加权，无法学习模型间非线性关系' },
      { title: '静态权重', description: '权重固定，无法适应数据分布变化' },
      { title: '依赖验证集', description: '验证集不代表未来时权重可能失效' },
      { title: '提升有限', description: '当基础模型已很好或很差时，改进空间小' }
    ],
    bestPractices: ['选择差异化的基础模型，避免高度相关', '验证集应代表未来数据分布', '定期用新数据重新计算权重', '检查权重分布，若某个模型权重过高(>0.8)需警惕', '对比简单平均，确保加权确实带来提升', '可考虑加入正则化，限制极端权重'],
    performance: {
      speed: { level: 'high', description: '仅需一次验证评估，预测极快' },
      accuracy: { level: 'medium', description: '通常优于单一模型，但不如复杂融合' },
      dataRequirement: { level: 'medium', description: '需要足够验证集评估方差' },
      complexity: { level: 'low', description: '实现和理解都很简单' }
    }
  },
  {
    id: 'boosting_ensemble',
    name: 'Boosting融合',
    shortName: 'Boosting',
    icon: Sparkles,
    category: '模型融合方法',
    summary: 'Boosting通过串行训练一系列模型，每个新模型专注于修正前一个模型的误差。本系统采用基于异构模型的残差学习法，支持将MA、ES、ARIMA、LSTM等不同类型的模型串联使用，逐步提升预测精度。',
    principle: {
      description: 'Boosting的核心是"从错误中学习"。传统的AdaBoost通过调整样本权重来关注错误，但ARIMA等时序模型通常不支持样本权重。因此，本系统采用"基于残差的贪心Boosting"：算法首先训练一个基模型预测原始数据。随后的每一轮，系统都会遍历模型库中所有可用模型，评估它们拟合当前残差的效果，并"贪心"地选择表现最好的那个加入链条。',
      keyIdea: '贪心策略 + 残差学习。每一步都选择当前最优的异构模型（如ARIMA或LSTM）来修正前一步的错误。'
    },
    mathematics: {
      description: '基于残差学习的加法模型公式：',
      formula: 'F_m(x) = F_{m-1}(x) + η·h_m(x)\n其中 h_m = argmin(Loss(y - F_{m-1}, h))',
      variables: [
        { symbol: 'F_m(x)', meaning: '第m轮后的最终预测值' },
        { symbol: 'h_m(x)', meaning: '本轮贪心选出的最佳模型' },
        { symbol: 'η', meaning: '学习率，控制每个新模型的贡献权重' },
        { symbol: 'argmin', meaning: '从候选模型库中选择误差最小的' }
      ],
      example: '第一轮MA预测100（残差10）；第二轮对比LSTM和ARIMA拟合残差的效果，发现LSTM更好（预测8），于是贪心选择LSTM；最终预测 = 100 + 0.5×8。'
    },
    workflow: {
      steps: [
        { title: '初始预测', description: '从模型库中选择一个基模型预测原始时间序列y。', tip: '第一轮通常预测原始数据的整体趋势' },
        { title: '计算残差', description: '计算当前组合模型的预测误差（真实值 - 预测值）。', tip: '残差代表了目前模型还无法解释的部分' },
        { title: '贪心选择', description: '遍历所有候选模型（MA, ARIMA, LSTM等），分别训练它们去拟合当前残差，并记录效果。', tip: '这是"贪心"策略的核心：每轮都试错' },
        { title: '择优集成', description: '选出本轮拟合残差效果最好的那个模型，乘以学习率加入到总预测公式中。', tip: '只保留最好的，确保每一步提升最大' },
        { title: '循环迭代', description: '重复上述步骤，直到达到最大轮数或误差不再降低。', tip: '系统会自动构建一个最优的异构模型链' }
      ]
    },
    parameters: [
      { name: '最大迭代轮数 (max_rounds)', description: '最多串联多少个模型', impact: '越多精度可能越高，但训练变慢且易过拟合', typical: '5-10轮（异构模型通常不需要太多轮）' },
      { name: '学习率 (learning_rate)', description: '每个新模型修正误差的步长', impact: '越小收敛越稳健但需更多轮数，越大收敛快但易震荡', typical: '0.1 - 0.5' },
      { name: '候选模型库', description: '参与Boosting的基础模型类型', impact: '模型类型越丰富，互补性越强', typical: 'ARIMA, LSTM, MA, ES' }
    ],
    suitability: {
      suitable: ['数据模式复杂，单一模型难以完全捕捉', '追求比单一模型更高的精度', '不同模型之间存在互补性（如线性+非线性）', '可以接受较长的训练时间'],
      notSuitable: ['数据信噪比极低（全是噪声）', '时间序列极短，无法支持多次残差拟合', '需要极快的实时响应', '模型库单一，无法发挥异构优势']
    },
    useCases: [
      { industry: '金融', scenario: '股价波动预测', description: '使用ARIMA捕捉长期趋势，再用LSTM捕捉ARIMA遗漏的高频非线性波动残差，组合预测精度显著提升。' },
      { industry: '零售', scenario: '复杂销量预测', description: '先用ES（指数平滑）处理季节性，再用Boosting串联一个回归树模型去拟合促销带来的突发销量残差。' },
      { industry: '能源', scenario: '电力负荷预测', description: '基础模型预测日常负荷曲线，Boosting引入气象敏感模型专门修正极端天气下的负荷偏差。' }
    ],
    pros: [
      { title: '异构互补', description: '能结合线性、非线性等不同模型的长处' },
      { title: '精度极高', description: '通过针对性地修正误差，通常能达到最高精度' },
      { title: '适应性强', description: '自动根据数据特点选择最适合修正残差的模型' },
      { title: '灵活扩展', description: '可以随时加入新的模型类型作为基学习器' }
    ],
    cons: [
      { title: '易过拟合', description: '如果对噪声也强行拟合，会导致泛化能力下降' },
      { title: '训练耗时', description: '串行训练，且每轮都要评估多个候选模型' },
      { title: '误差累积', description: '若早期模型出现严重偏差，后续模型可能难以挽回' },
      { title: '参数敏感', description: '学习率和轮数需要配合调整' }
    ],
    bestPractices: ['基模型应包含多种类型（如ARIMA+LSTM）以实现优势互补', '学习率设置保守一些（如0.3），避免步子太大错过最优解', '关注验证集误差，一旦验证集误差上升立即停止（Early Stopping）', '对于噪声很大的数据，限制迭代轮数'],
    performance: {
      speed: { level: 'low', description: '串行且每轮需训练多个候选模型，速度较慢' },
      accuracy: { level: 'high', description: '异构互补通常能获得SOTA级别的精度' },
      dataRequirement: { level: 'medium', description: '需要足够的数据来划分验证集以评估残差' },
      complexity: { level: 'high', description: '系统内部逻辑复杂，但对外表现为自动优化' }
    }
  },
  {
    id: 'stacking_ensemble',
    name: 'Stacking融合',
    shortName: 'Stacking',
    icon: Layers,
    category: '模型融合方法',
    summary: 'Stacking（堆叠法）构建多层学习架构：第一层多个异构模型各自预测，第二层元模型学习如何最优组合这些预测。本系统采用严谨的Hold-out验证策略防止数据泄露，并使用非负线性回归作为元模型。',
    principle: {
      description: 'Stacking的哲学是"让模型教模型"。不同模型有不同的视角和偏好——ARIMA擅长捕捉线性趋势，LSTM擅长非线性模式。Stacking不是简单平均它们的预测，而是训练一个元模型（Meta-Learner）去学习：在什么情况下更相信哪个模型。为了防止"作弊"，元模型的训练数据必须是基础模型从未见过的（Out-of-Fold）预测值。',
      keyIdea: '用机器学习的方式学习如何做机器学习融合。本系统自动划分Level-0和Level-1数据集，确保元模型学到的是泛化能力而非记忆。'
    },
    mathematics: {
      description: '两层堆叠结构（Meta-Model采用非负线性回归）：',
      formula: '第一层: z_{i} = M_{i}(X)  (i=1...n)\n第二层: ŷ = w_0 + Σ(w_i · z_i),  w_i ≥ 0',
      variables: [
        { symbol: 'M_{i}', meaning: '第i个基础模型（MA, ARIMA, LSTM等）' },
        { symbol: 'z_{i}', meaning: '基础模型的预测输出（作为第二层的特征）' },
        { symbol: 'w_i', meaning: '元模型学到的组合权重' },
        { symbol: 'w_i ≥ 0', meaning: '约束权重非负，保证组合逻辑稳定可解释' }
      ],
      example: 'ARIMA预测100，LSTM预测110。元模型发现LSTM在类似情况下更准，给予0.8权重，ARIMA给0.2。最终预测 = 0.2×100 + 0.8×110 + 截距。'
    },
    workflow: {
      steps: [
        { title: '数据划分', description: '将训练数据划分为Level-0（约80%）和Level-1（约20%）两部分。', tip: '防止元模型直接记住训练数据（数据泄露）' },
        { title: 'Level-1预测', description: '用Level-0数据训练所有基础模型，并让它们对Level-1数据进行预测。', tip: '这些预测值构成了元模型的训练特征' },
        { title: '训练元模型', description: '以Level-1的真实值为目标，训练一个线性回归模型来组合基础模型的预测。', tip: '学习如何分配权重以最小化误差' },
        { title: '全局重训练', description: '使用全部训练数据重新训练所有基础模型，用于最终的实际预测。', tip: '最大化基础模型的利用率' }
      ]
    },
    parameters: [
      { name: '基础模型组合', description: '选择参与第一层的异构模型', impact: '模型越多样（统计+深度学习），Stacking效果越好', typical: '建议至少包含ARIMA和LSTM' },
      { name: '元模型类型', description: '第二层融合模型的算法', impact: '本系统固定使用非负线性回归', typical: 'LinearRegression(positive=True)' },
      { name: '划分比例', description: 'Level-0/Level-1的分割点', impact: 'Level-1太少会导致元模型过拟合', typical: '系统自动设定（通常80/20）' }
    ],
    suitability: {
      suitable: ['追求最高预测精度', '有多个表现不错但风格不同的基础模型', '数据量充足（支持划分Hold-out集）', '有充足计算资源'],
      notSuitable: ['数据量很小（<15个数据点）', '只有一两个基础模型', '基础模型预测结果高度相关', '需要快速训练']
    },
    useCases: [
      { industry: 'Kaggle竞赛', scenario: '房价预测', description: '冠军方案通常是3-4层的Stacking。本系统简化为2层，但保留了核心的Out-of-Fold训练机制，能有效提升单模型无法突破的精度瓶颈。' },
      { industry: '工业', scenario: '传感器融合', description: '融合振动传感器（高频）和温度传感器（低频）的预测模型。Stacking能自动学习不同工况下应该侧重哪个传感器的数据。' },
      { industry: '量化交易', scenario: '多因子策略', description: '将基于动量的模型和基于价值的模型通过Stacking结合，根据近期市场风格自动调整权重。' }
    ],
    pros: [
      { title: '性能天花板', description: '通常能达到单一融合方法的最高精度' },
      { title: '纠错能力', description: '元模型能学会忽略某些表现糟糕的模型' },
      { title: '防过拟合', description: '严格的Hold-out划分机制减少了过拟合风险' },
      { title: '自动权重', description: '比人工指定权重的加权平均更科学' }
    ],
    cons: [
      { title: '数据饥渴', description: '需要额外的数据进行Hold-out划分，小数据不友好' },
      { title: '计算昂贵', description: '需要多次训练基础模型（部分数据+全量数据）' },
      { title: '黑箱属性', description: '虽然使用了线性回归，但双层结构仍增加了解释难度' },
      { title: '工程复杂', description: '涉及复杂的数据流转和多次模型IO' }
    ],
    bestPractices: ['务必选择原理差异大的模型（如MA vs LSTM）', '数据量少时优先选用加权平均而非Stacking', '观察元模型的系数，如果某模型系数为0，说明它对集成无贡献', '保持基础模型参数的一致性'],
    performance: {
      speed: { level: 'low', description: '最慢，需要训练两轮基础模型' },
      accuracy: { level: 'high', description: '理论上限最高' },
      dataRequirement: { level: 'high', description: '需要足够数据进行切分' },
      complexity: { level: 'high', description: '逻辑最复杂的融合方法' }
    }
  }
];

type View = 'introduction' | 'selection';

const EnsembleModelIntroductionFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateState } = useExperiment();
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [view, setView] = useState<View>('introduction');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // On mount, check if we should jump to the last step
  useEffect(() => {
    if (location.state?.returnTo === 'last') {
      setView('selection');
      setCurrentModelIndex(ensembleModels.length - 1);
    }
  }, [location.state]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentModelIndex]);

  const activeModel = ensembleModels[currentModelIndex];
  if (!activeModel) return null;

  const Icon = activeModel.icon;
  const isLastModel = currentModelIndex === ensembleModels.length - 1;

  const handleNext = async () => {
    if (view === 'introduction') {
      if (isLastModel) {
        setView('selection');
      } else {
        setCurrentModelIndex(prev => prev + 1);
      }
    } else if (view === 'selection') {
      if (selectedModels.length >= 1) {
        await updateState({ selected_ensemble_models: selectedModels });
        navigate('/model/ensemble-select');
      }
    }
  };

  const handlePrevious = () => {
    if (view === 'introduction') {
      if (currentModelIndex === 0) {
        navigate('/model/model-select');
      } else {
        setCurrentModelIndex(prev => prev - 1);
      }
    } else if (view === 'selection') {
      setView('introduction');
      // The currentModelIndex is already at the last model, so no change needed here.
      // This ensures that going back from the selection view lands on the last model's intro.
    }
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const renderIntroductionView = () => (
    <>
      <div ref={scrollContainerRef} className="space-y-6 flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-white z-10 pb-4 mb-2">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-100 to-fuchsia-100 flex-shrink-0">
              <Icon className="w-9 h-9 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-bold text-gray-900">{activeModel.name}</h3>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded">
                  {activeModel.shortName}
                </span>
              </div>
              <p className="text-sm text-gray-500">{activeModel.category}</p>
              <p className="text-gray-700 mt-2 leading-relaxed">{activeModel.summary}</p>
            </div>
          </div>
        </div>

        {/* Core Principle */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-5 h-5 text-purple-600" />
            <h4 className="text-lg font-semibold text-purple-800">核心原理</h4>
          </div>
          <p className="text-purple-900 text-base leading-relaxed mb-2">
            {activeModel.principle.description}
          </p>
          <div className="mt-3 pl-4 border-l-4 border-purple-400">
            <p className="text-purple-800 font-medium italic">{activeModel.principle.keyIdea}</p>
          </div>
        </div>

        {/* Mathematics */}
        {activeModel.mathematics && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h4 className="text-lg font-semibold text-indigo-800">数学原理</h4>
            </div>
            <p className="text-indigo-900 mb-3">{activeModel.mathematics.description}</p>
            <div className="bg-white rounded p-3 mb-3 font-mono text-sm text-indigo-900 border border-indigo-300 whitespace-pre-wrap">
              {activeModel.mathematics.formula}
            </div>
            <div className="space-y-1 mb-3">
              {activeModel.mathematics.variables?.map((v, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="font-mono font-semibold text-indigo-700">{v.symbol}:</span>
                  <span className="text-indigo-800">{v.meaning}</span>
                </div>
              ))}
            </div>
            <div className="bg-indigo-100 rounded p-3 text-sm text-indigo-900">
              <span className="font-semibold">示例：</span> {activeModel.mathematics.example}
            </div>
          </div>
        )}

        {/* Workflow */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Workflow className="w-5 h-5 text-cyan-600" />
            <h4 className="text-lg font-semibold text-cyan-800">工作流程</h4>
          </div>
          <div className="space-y-3">
            {activeModel.workflow.steps?.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-cyan-900 mb-1">{step.title}</h5>
                  <p className="text-cyan-800 text-sm mb-1">{step.description}</p>
                  <p className="text-xs text-cyan-600 italic">💡 {step.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="w-5 h-5 text-amber-600" />
            <h4 className="text-lg font-semibold text-amber-800">关键参数</h4>
          </div>
          <div className="space-y-3">
            {activeModel.parameters.map((param, i) => (
              <div key={i} className="bg-white rounded p-3 border border-amber-200">
                <h5 className="font-semibold text-amber-900 mb-1">{param.name}</h5>
                <p className="text-sm text-amber-800 mb-2">{param.description}</p>
                <p className="text-xs text-amber-700"><strong>影响：</strong>{param.impact}</p>
                <p className="text-xs text-amber-700"><strong>典型值：</strong>{param.typical}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suitability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <CheckCheck className="w-5 h-5 text-green-600" />
              <h4 className="text-lg font-semibold text-green-800">适用场景</h4>
            </div>
            <ul className="space-y-2">
              {activeModel.suitability.suitable?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-green-900">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <h4 className="text-lg font-semibold text-red-800">不适用场景</h4>
            </div>
            <ul className="space-y-2">
              {activeModel.suitability.notSuitable?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-red-900">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-blue-800">实际应用案例</h4>
          </div>
          <div className="space-y-3">
            {activeModel.useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                    {useCase.industry}
                  </span>
                  <span className="text-sm font-semibold text-blue-900">{useCase.scenario}</span>
                </div>
                <p className="text-sm text-blue-800">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pros and Cons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <ThumbsUp className="w-5 h-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-800">优点</h4>
            </div>
            <ul className="space-y-2">
              {activeModel.pros.map((pro, index) => (
                <li key={index} className="bg-white rounded p-2 border border-gray-200">
                  <div className="font-semibold text-gray-900 text-sm mb-1">{pro.title}</div>
                  <div className="text-xs text-gray-700">{pro.description}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <ThumbsDown className="w-5 h-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-800">缺点</h4>
            </div>
            <ul className="space-y-2">
              {activeModel.cons.map((con, index) => (
                <li key={index} className="bg-white rounded p-2 border border-gray-200">
                  <div className="font-semibold text-gray-900 text-sm mb-1">{con.title}</div>
                  <div className="text-xs text-gray-700">{con.description}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Lightbulb className="w-5 h-5 text-teal-600" />
            <h4 className="text-lg font-semibold text-teal-800">使用建议</h4>
          </div>
          <ul className="space-y-2">
            {activeModel.bestPractices.map((practice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-teal-600 font-bold flex-shrink-0">•</span>
                <span className="text-teal-900">{practice}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Performance */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Gauge className="w-5 h-5 text-slate-600" />
            <h4 className="text-lg font-semibold text-slate-800">性能特点</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(activeModel.performance).map(([key, value]) => {
              const labels: Record<string, string> = {
                speed: '计算速度',
                accuracy: '预测精度',
                dataRequirement: '数据需求',
                complexity: '复杂程度'
              };
              const levelColors: Record<string, string> = {
                high: 'bg-green-100 text-green-700',
                'low-medium': 'bg-yellow-100 text-yellow-700',
                low: 'bg-blue-100 text-blue-700',
                medium: 'bg-orange-100 text-orange-700'
              };
              return (
                <div key={key} className="bg-white rounded p-3 border border-slate-200">
                  <div className="text-xs text-slate-600 mb-1">{labels[key]}</div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded inline-block mb-1 ${levelColors[value.level] || 'bg-gray-100 text-gray-700'}`}>
                    {value.level.toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-700">{value.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={handlePrevious}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          上一步
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white cursor-pointer"
        >
          {isLastModel ? '选择融合模型' : '下一个模型'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  const renderSelectionView = () => (
    <>
      <div className="flex-1">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">选择融合模型</h3>
        <p className="text-gray-600 mb-6">请选择至少一个融合模型进行训练。</p>
        <div className="flex flex-col items-start gap-4">
          {ensembleModels.map(model => {
            const isSelected = selectedModels.includes(model.id);
            const ModelIcon = model.icon;
            return (
              <label
                key={model.id}
                className={`py-4 pl-4 pr-6 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-purple-50 border-purple-500 shadow-md' : 'bg-white border-gray-200 hover:border-purple-400'}`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleModelToggle(model.id)}
                    className="form-checkbox h-5 w-5 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <ModelIcon className={`w-6 h-6 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                  <span className={`font-semibold ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>{model.name}</span>
                </div>
              </label>
            );
          })}
        </div>
        {selectedModels.length < 1 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <Info className="w-5 h-5 flex-shrink-0" />
            <span>请至少选择一个模型。</span>
          </div>
        )}
      </div>
      <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
        <button
          onClick={handlePrevious}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          返回介绍
        </button>
        <button
          onClick={handleNext}
          disabled={selectedModels.length < 1}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
        >
          下一步
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">
          {view === 'introduction' ? '融合模型介绍' : '融合模型选择'}
        </h2>
        {view === 'introduction' && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
              {ensembleModels.map((model, index) => {
                const isCompleted = index < currentModelIndex;
                const isActive = index === currentModelIndex;
                return (
                  <React.Fragment key={model.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-purple-500' : isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`text-xs font-bold text-white`}>
                          {index + 1}
                        </span>
                      </div>
                      <span
                        className={`font-medium text-sm ${isActive ? 'text-purple-600' : isCompleted ? 'text-gray-800' : 'text-gray-500'}`}
                      >
                        {model.name}
                      </span>
                    </div>
                    {index < ensembleModels.length - 1 && (
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col min-h-0">
        {view === 'introduction' ? renderIntroductionView() : renderSelectionView()}
      </div>
    </div>
  );
};

export default EnsembleModelIntroductionFlow;
