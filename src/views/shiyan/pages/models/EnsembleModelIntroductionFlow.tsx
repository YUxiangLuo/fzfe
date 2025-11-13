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
    summary: 'Boosting通过串行训练一系列模型，每个新模型专注于修正前一个模型的误差，迭代地将"弱学习器"提升为"强学习器"，追求极致预测精度。',
    principle: {
      description: 'Boosting的核心是"从错误中学习"。第一个模型对数据进行预测后，会产生误差（残差）。第二个模型不再预测原始目标，而是专门预测第一个模型的残差。第三个模型再预测第二个模型的残差，如此迭代。最终，所有模型预测相加，理论上可以完美拟合训练数据。',
      keyIdea: '每个新模型都在"纠正"前面所有模型的集体错误，逐步逼近真实值。'
    },
    mathematics: {
      description: 'Gradient Boosting的迭代公式：',
      formula: 'F_m(x) = F_{m-1}(x) + η·h_m(x)\nh_m训练目标 = -∂L(y, F_{m-1})/∂F',
      variables: [
        { symbol: 'F_m(x)', meaning: '第m轮的融合模型' },
        { symbol: 'h_m(x)', meaning: '第m个基学习器' },
        { symbol: 'η', meaning: '学习率，控制每步的步长' },
        { symbol: 'L', meaning: '损失函数' }
      ],
      example: '预测销量100，第1个模型预测90（残差10），第2个模型预测残差得8，第3个模型预测剩余残差得1.5...最终：90+8+1.5+... ≈ 100'
    },
    workflow: {
      steps: [
        { title: '初始化', description: '用一个简单模型（如均值）作为初始预测。', tip: '初始预测可以是常数或简单线性模型' },
        { title: '计算残差', description: '计算当前融合模型的预测误差（真实值-预测值）。', tip: '残差是下一个模型的训练目标' },
        { title: '训练新模型', description: '训练一个新的基学习器，目标是预测当前残差。', tip: '基学习器通常是决策树或简单神经网络' },
        { title: '更新融合模型', description: '将新模型乘以学习率后加入融合模型。', tip: '学习率<1可防止过拟合' },
        { title: '迭代或停止', description: '重复2-4步，直到达到最大迭代次数或残差足够小。', tip: '用验证集监控，避免过拟合' }
      ]
    },
    parameters: [
      { name: '迭代次数 (n_estimators)', description: '训练多少个基学习器', impact: '越多精度越高但易过拟合，训练也越慢', typical: '50-500，视数据复杂度' },
      { name: '学习率 (learning_rate)', description: '每个新模型的贡献比例', impact: '越小需要更多迭代但更稳定，越大收敛快但易过拟合', typical: '0.01-0.3' },
      { name: '基学习器复杂度', description: '每个基模型的容量（如树的深度）', impact: '越复杂单个模型越强但易过拟合', typical: '深度3-6的决策树' }
    ],
    suitability: {
      suitable: ['追求极致预测精度', '数据有复杂非线性关系', '特征与目标关系不明确', '愿意投入计算资源', '可解释性要求不高'],
      notSuitable: ['数据噪声很大', '样本量极小（<100）', '需要实时预测（毫秒级）', '需要强可解释性', '数据有严重异常值']
    },
    useCases: [
      { industry: '数据竞赛', scenario: 'Kaggle销量预测', description: '数据科学家用XGBoost（Boosting的高效实现）赢得销量预测竞赛。1000轮迭代，学习率0.05，最终RMSE比第二名低3%。' },
      { industry: '金融', scenario: '信用评分', description: '银行用LightGBM（快速Boosting）预测客户违约概率。500轮迭代，AUC达0.85，比逻辑回归高10个百分点，用于贷款审批。' },
      { industry: '推荐系统', scenario: '点击率预测', description: '广告平台用Boosting预测广告点击率。捕捉用户行为的微妙模式，CTR预测准确率提升20%，广告收入显著增加。' }
    ],
    pros: [
      { title: '精度极高', description: '通常是单一模型和简单融合中最准确的' },
      { title: '特征自动', description: '可自动发现特征交互，无需手动工程' },
      { title: '处理多种数据', description: '可处理数值、类别、缺失值等多种数据' },
      { title: '成熟工具', description: 'XGBoost、LightGBM等高效实现广泛应用' }
    ],
    cons: [
      { title: '易过拟合', description: '对噪声敏感，需仔细调参和正则化' },
      { title: '训练慢', description: '串行训练无法并行，大数据集很慢' },
      { title: '黑箱模型', description: '难以理解为何做出某个预测' },
      { title: '调参复杂', description: '超参数多且交互复杂，需要经验' }
    ],
    bestPractices: ['始终用早停法（early stopping）防止过拟合', '学习率和迭代次数成反比，学习率小需更多迭代', '用验证曲线观察过拟合点', '对异常值敏感的数据先进行预处理', '尝试不同的损失函数（如Huber对异常值鲁棒）', '调参顺序：先迭代次数和学习率，再树深度', '与简单模型对比，确保复杂度物有所值'],
    performance: {
      speed: { level: 'low', description: '串行训练慢，现代实现有所改善' },
      accuracy: { level: 'high', description: '通常是最准确的方法之一' },
      dataRequirement: { level: 'medium', description: '几百到几千样本即可，但越多越好' },
      complexity: { level: 'high', description: '调参和理解都有难度' }
    }
  },
  {
    id: 'stacking_ensemble',
    name: 'Stacking融合',
    shortName: 'Stacking',
    icon: Layers,
    category: '模型融合方法',
    summary: 'Stacking构建多层学习架构：第一层多个异构模型各自预测，第二层元模型学习如何最优组合这些预测，是最强大但也最复杂的融合方法。',
    principle: {
      description: 'Stacking的哲学是"让模型教模型"。不同模型有不同的视角和偏好——ARIMA擅长捕捉线性趋势，LSTM擅长非线性模式。Stacking不是简单平均它们的预测，而是训练一个元模型（meta-learner）去学习：在什么情况下更相信哪个模型，如何将它们的预测智能地组合。',
      keyIdea: '用机器学习的方式学习如何做机器学习融合，自动发现最优组合策略。'
    },
    mathematics: {
      description: 'Stacking的两层结构：',
      formula: '第一层: ŷ₁=M₁(X), ŷ₂=M₂(X), ..., ŷₙ=Mₙ(X)\n第二层: ŷ_final = Meta([ŷ₁, ŷ₂, ..., ŷₙ])',
      variables: [
        { symbol: 'M₁...Mₙ', meaning: 'n个异构基础模型（第一层）' },
        { symbol: 'ŷ₁...ŷₙ', meaning: '各基础模型的预测输出' },
        { symbol: 'Meta', meaning: '元模型（第二层），如线性回归、神经网络等' },
        { symbol: 'ŷ_final', meaning: '最终融合预测' }
      ],
      example: '第一层：MA预测100，ARIMA预测105，LSTM预测98。第二层元模型（如岭回归）学到的权重为0.2, 0.5, 0.3，最终预测=0.2×100+0.5×105+0.3×98=101.9'
    },
    workflow: {
      steps: [
        { title: '训练第一层模型', description: '在训练集上分别训练多个异构的基础模型（如MA、ARIMA、LSTM等）。', tip: '模型越多样化越好，避免高度相关的模型' },
        { title: '生成元特征', description: '用交叉验证获取第一层模型在训练集上的预测，作为第二层的训练数据。', tip: '必须用交叉验证，否则元模型会过拟合' },
        { title: '训练元模型', description: '用第一层的预测作为特征，真实值作为目标，训练元模型（如岭回归、GBDT等）。', tip: '元模型通常选择简单模型防止过拟合' },
        { title: '整体预测', description: '对新数据：先用第一层模型预测，再将预测结果输入元模型得到最终预测。', tip: '两层预测是串行的' }
      ]
    },
    parameters: [
      { name: '基础模型选择', description: '第一层使用哪些模型', impact: '模型多样性是关键，同质模型收益小', typical: '3-10个不同类型的模型' },
      { name: '元模型选择', description: '第二层用什么模型融合', impact: '复杂元模型易过拟合，简单模型更稳健', typical: '线性回归、岭回归、简单神经网络' },
      { name: '交叉验证折数', description: '生成元特征时的CV折数', impact: '太少元模型易过拟合，太多计算慢', typical: '5-10折' }
    ],
    suitability: {
      suitable: ['追求最高预测精度', '有多个表现不错但风格不同的基础模型', '数据量充足（上千样本）', '有充足计算资源和时间', '可接受复杂系统'],
      notSuitable: ['数据量很小（<500）', '只有一两个基础模型', '基础模型都很差', '需要快速部署和预测', '需要强可解释性']
    },
    useCases: [
      { industry: 'Kaggle竞赛', scenario: '房价预测', description: '冠军方案：第一层10个模型（GBDT、XGB、LSTM、RandomForest等），第二层用神经网络融合。最终RMSE比最好单模型低5%，险胜第二名。' },
      { industry: '医疗', scenario: '疾病诊断', description: '医院用Stacking融合影像AI、基因分析、临床指标三个模型预测癌症风险。元模型学会在不同病例类型下信任不同模型，准确率92%。' },
      { industry: '工业', scenario: '设备故障预测', description: '工厂融合时序模型（ARIMA）、传感器模型（CNN）、维修记录模型（XGB）。Stacking将三者优势结合，故障预警提前3天，准确率85%。' }
    ],
    pros: [
      { title: '性能天花板', description: '通常能达到单一融合方法的最高精度' },
      { title: '自动优化', description: '元模型自动学习最优组合，无需手动调权重' },
      { title: '捕捉复杂交互', description: '可学习模型间的非线性关系和条件依赖' },
      { title: '高度灵活', description: '可堆叠任意类型和数量的模型' }
    ],
    cons: [
      { title: '极易过拟合', description: '两层学习导致过拟合风险翻倍，需仔细验证' },
      { title: '计算昂贵', description: '训练和预测都是两层，时间和资源消耗大' },
      { title: '实现复杂', description: '涉及交叉验证、多模型管理，工程难度高' },
      { title: '调试困难', description: '出问题时难以定位是哪层或哪个模型的问题' }
    ],
    bestPractices: ['第一层选择差异化模型：统计+机器学习+深度学习', '元模型从简单开始（线性回归），确有必要再用复杂模型', '必须用out-of-fold预测训练元模型，严防泄露', '在独立测试集上验证，训练集表现不可信', '监控各基础模型和元模型的过拟合', '考虑多层Stacking，但每层都增加过拟合风险', '与简单融合对比，确保复杂度物有所值', '保存所有模型和pipeline，便于部署和调试'],
    performance: {
      speed: { level: 'low', description: '两层计算，训练和预测都慢' },
      accuracy: { level: 'high', description: '通常是所有方法中最准确的' },
      dataRequirement: { level: 'high', description: '需要大量数据支撑两层学习' },
      complexity: { level: 'high', description: '实现和维护都非常复杂' }
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
