import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import { toastEventBus } from '../../utils/toastEventBus';
import { normalizeBaseModelSelection } from '../../utils/modelCatalog';
import {
  LineChart,
  ChartSpline,
  Sigma,
  BrainCircuit,
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
interface Model {
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
  implementationNotes?: string[];
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

// Corrected and verified base models data
const baseModels: Model[] = [
  {
    id: 'moving_average',
    name: '移动平均法',
    shortName: 'MA',
    icon: LineChart,
    category: '传统统计方法',
    summary: '移动平均法是最基础的时间序列预测方法之一，通过计算固定窗口内数据的平均值来平滑波动并预测未来趋势。',
    principle: {
      description: '移动平均法的核心思想是"平滑"。它假设时间序列由趋势、季节性和随机波动组成，通过对一定时间窗口内的数据求平均，可以有效地过滤掉短期的随机波动，从而更清晰地看到数据的整体趋势。',
      keyIdea: '用历史数据的平均值代表当前的"真实水平"，并以此作为未来的预测值。'
    },
    implementationNotes: [
      '教科书移动平均通常先定义为下一期预测：用最近n期实际值的平均数预测下一期。',
      '本系统为了预测未来多期销量，会将每一期预测值滚入窗口继续递推，整个评估过程不使用评估集真实值作为下一步输入。'
    ],
    mathematics: {
      description: '移动平均法的计算公式非常简单直观：',
      formula: 'MA(t) = (X(t-n+1) + X(t-n+2) + ... + X(t)) / n',
      variables: [
        { symbol: 'MA(t)', meaning: 't时刻的移动平均值' },
        { symbol: 'X(t)', meaning: 't时刻的实际观测值' },
        { symbol: 'n', meaning: '移动平均的窗口大小' }
      ],
      example: '例如3期移动平均：如果最近3个月销量为100、120、110，则预测值 = (100+120+110)/3 = 110'
    },
    workflow: {
      steps: [
        { title: '确定窗口大小', description: '根据数据特点选择合适的n值。n越大平滑效果越强，但反应越慢。', tip: '常见选择：3期、5期、7期或12期' },
        { title: '计算移动平均', description: '从第n个数据点开始，每次取最近n个数据点计算平均值。', tip: '滑动窗口随时间向前移动' },
        { title: '生成预测', description: '最后一个窗口的平均值先作为下一期预测；需要多期预测时，再把预测值滚入窗口继续计算。', tip: '本系统使用递推方式服务未来销量预测' }
      ]
    },
    parameters: [{ name: '窗口大小 (n)', description: '用于计算平均值的历史数据点数量', impact: '窗口越大越平滑但滞后越严重；窗口越小反应越快但易受噪声影响', typical: '3-12期，取决于数据波动性' }],
    suitability: {
      suitable: ['数据相对平稳，无明显趋势', '短期波动较大，需要平滑处理', '需要快速的短期销量预测', '数据量较小', '需要快速简单的预测方法'],
      notSuitable: ['数据有明显上升或下降趋势', '存在明显季节性模式', '需要较长周期的高精度预测', '数据发生结构性变化', '对预测精度要求很高']
    },
    useCases: [
      { industry: '零售业', scenario: '日常商品库存预测', description: '便利店使用7天移动平均预测牛奶日销量，决定每日进货量。销量相对稳定，简单方法即可满足。' },
      { industry: '制造业', scenario: '短期需求预测', description: '工厂使用3个月移动平均预测标准零件需求，安排生产计划。需求稳定，移动平均足以应对。' }
    ],
    pros: [
      { title: '极其简单', description: '易于理解和实现，不需要复杂数学知识' },
      { title: '计算快速', description: '只需简单运算，适合实时预测' },
      { title: '平滑效果好', description: '有效过滤随机噪声和异常值' },
      { title: '数据要求低', description: '不需要大量数据或特定分布' }
    ],
    cons: [
      { title: '无法捕捉趋势', description: '对趋势数据预测会滞后于实际值' },
      { title: '不能处理季节性', description: '无法识别周期性波动模式' },
      { title: '窗口选择困难', description: 'n值影响大但无统一标准，需试错' },
      { title: '长期能力弱', description: '多期递推会快速趋于平滑水平，难以刻画趋势和季节变化' }
    ],
    bestPractices: ['尝试多个n值，选择历史误差最小的', '考虑业务周期，如数据有周周期性可用7期', '多步预测时关注递推后的平滑偏差', '数据模式变化时及时调整或换方法', '可作为评估复杂模型的基准'],
    performance: {
      speed: { level: 'high', description: '计算极快，适合实时' },
      accuracy: { level: 'low-medium', description: '平稳数据尚可，趋势数据较差' },
      dataRequirement: { level: 'low', description: '只需n个历史点' },
      complexity: { level: 'low', description: '简单易维护' }
    }
  },
  {
    id: 'exponential_smoothing',
    name: '指数平滑法',
    shortName: 'ES',
    icon: ChartSpline,
    category: '传统统计方法',
    summary: '指数平滑法是一种加权移动平均方法，赋予近期数据更高权重，权重随时间呈指数级递减；本系统实现的一次指数平滑适合水平型短期销量预测。',
    principle: {
      description: '与移动平均法平等对待所有历史数据不同，指数平滑法认为"最近的数据更重要"。它对历史观测值分配递减的权重，越近期的数据权重越大，越久远的数据权重越小，权重衰减遵循指数函数。',
      keyIdea: '用加权平均的方式估计当前水平，让模型既利用历史信息，又能响应新变化。'
    },
    implementationNotes: [
      '本系统实现的是一次指数平滑，也就是教科书中的基础指数平滑模型。',
      '系统要求平滑系数满足 0 < α < 1；α=0 完全忽略新观测值，α=1 则退化为“上一期即预测”的朴素预测，两个端点都不作为可选参数。',
      '教科书里初始平滑值常取第一个观测值或前几期平均；本系统改由 statsmodels 基于整段训练数据自动估计初始水平，用户只需指定 α，无需手动设定初始值。',
      '一次指数平滑的多期未来销量预测为水平外推；趋势和季节性需要 Holt 或 Holt-Winters 扩展，本模型未启用这些扩展。'
    ],
    mathematics: {
      description: '指数平滑的基本公式非常简洁：',
      formula: 'S(t) = α·X(t) + (1-α)·S(t-1)',
      variables: [
        { symbol: 'S(t)', meaning: 't时刻的平滑值（预测值）' },
        { symbol: 'X(t)', meaning: 't时刻的实际观测值' },
        { symbol: 'S(t-1)', meaning: 't-1时刻的平滑值' },
        { symbol: 'α', meaning: '平滑系数，本系统取值范围为 0 < α < 1' }
      ],
      example: '若α=0.3，上期平滑值100，本期实际值120，则新平滑值 = 0.3×120 + 0.7×100 = 106'
    },
    workflow: {
      steps: [
        { title: '选择平滑系数α', description: 'α决定模型对新数据的敏感度。α越大反应越快，α越小越平滑。', tip: '通常选择0.1-0.3，可通过历史数据优化' },
        { title: '初始化平滑值', description: '第一个平滑值可以设为第一个观测值，或前几个数据的平均值。', tip: '初始值影响较小，几期后会被"遗忘"' },
        { title: '递推计算', description: '从第二期开始，用公式逐期计算平滑值，每个新值都融合了全部历史信息。', tip: '只需存储上一期平滑值，内存开销极小' },
        { title: '生成预测', description: '最新的平滑值即为下一期预测；多期预测时，一次指数平滑保持该水平向未来外推。', tip: '趋势和季节性要使用扩展模型' }
      ]
    },
    parameters: [{ name: '平滑系数 α (alpha)', description: '控制新旧数据的权重分配，是模型的核心参数', impact: 'α接近1时模型几乎只看最新数据，反应敏捷但易受噪声影响；α接近0时模型变化缓慢，平滑但滞后', typical: '0.1-0.3（平稳数据），0.3-0.5（波动数据），可用网格搜索优化' }],
    suitability: {
      suitable: ['数据无明显趋势或季节性', '需要快速响应最新水平变化', '历史数据量有限或存储受限', '需要实时更新短期预测', '数据相对平稳但非完全随机'],
      notSuitable: ['数据有强烈季节性周期', '存在结构性断点或突变', '需要捕捉复杂非线性关系', '数据中噪声过大', '需要显式建模长期趋势或季节性']
    },
    useCases: [
      { industry: '电商', scenario: '日销量短期预测', description: '电商平台用指数平滑预测明日销量，α=0.2。能快速捕捉促销活动带来的销量变化，同时过滤随机波动。' },
      { industry: '金融', scenario: '股票价格技术分析', description: '使用EMA（指数移动平均）作为技术指标，α=0.1追踪长期趋势，α=0.3追踪短期波动，两者交叉产生交易信号。' },
      { industry: '供应链', scenario: '需求预测', description: '制造商用Holt-Winters（指数平滑的扩展）预测季节性产品需求，同时捕捉趋势和季节模式。' }
    ],
    pros: [
      { title: '反应灵敏', description: '能快速跟踪数据的最新变化趋势' },
      { title: '高效简洁', description: '计算简单，只需存储少量状态变量' },
      { title: '适应性强', description: '可通过调整α适应不同波动特性的数据' },
      { title: '理论完善', description: '有坚实的统计理论基础，有多种成熟变体' }
    ],
    cons: [
      { title: '参数敏感', description: 'α的选择对结果影响很大，需要仔细调优' },
      { title: '基础版局限', description: '单次指数平滑无法处理趋势和季节性' },
      { title: '水平外推', description: '多步预测保持同一水平，遇到趋势拐点会滞后' },
      { title: '缺乏解释性', description: '难以分解出数据的内在结构成分' }
    ],
    bestPractices: ['使用时间顺序留出验证选择合适α值，而非主观猜测', '数据有趋势时使用双次或三次指数平滑（Holt方法）', '数据有季节性时使用Holt-Winters方法', '定期重新评估α，数据特性变化时及时调整', '可与其他方法组合，如ARIMA+指数平滑'],
    performance: {
      speed: { level: 'high', description: '计算极快，适合实时系统' },
      accuracy: { level: 'medium', description: '水平型数据表现良好，复杂趋势或季节模式较差' },
      dataRequirement: { level: 'low', description: '少量历史数据即可运行' },
      complexity: { level: 'low', description: '实现简单，易于维护' }
    }
  },
  {
    id: 'arima',
    name: 'ARIMA模型',
    shortName: 'ARIMA',
    icon: Sigma,
    category: '高级统计方法',
    summary: 'ARIMA（自回归积分移动平均模型）是经典的统计预测方法。本系统实现了自动化定阶功能：用户只需指定差分阶数d，系统会自动基于AIC/BIC准则搜索最优的AR阶数(p)和MA阶数(q)。',
    principle: {
      description: 'ARIMA通过三个核心组件建模：AR（自回归）利用历史值预测未来；I（差分）将非平稳序列转化为平稳序列；MA（移动平均）利用历史预测误差修正当前预测。本系统引入了智能定阶机制，针对小样本数据（<30个点）优先采用BIC准则以防止过拟合，对大样本则兼顾AIC准则以提升精度。',
      keyIdea: '将非平稳序列平稳化，然后自动搜索最优的线性方程来刻画数据规律。'
    },
    implementationNotes: [
      '教科书 ARIMA 通常通过平稳性检验、ACF/PACF 图和信息准则共同确定 p、d、q。',
      '本系统由用户指定差分阶数 d，并用 AIC/BIC 自动搜索 p 和 q，以降低课堂操作复杂度并控制小样本过拟合。',
      '预测未来销量时使用拟合后的 ARIMA 模型直接生成多步 forecast，并返回由置信区间换算的标准差。',
      'ARIMA 的预测区间随步长展宽；其他模型返回的 std_dev 是评估段残差的常数标准差，两者统计口径不同，横向对比预测区间时需注意。'
    ],
    mathematics: {
      description: 'ARIMA(p,d,q)模型方程：',
      formula: '(1 - ΣφᵢBⁱ)(1-B)ᵈ yₜ = c + (1 + ΣθᵢBⁱ)εₜ\n目标：min(AIC = 2k - 2ln(L))',
      variables: [
        { symbol: 'p', meaning: '自回归阶数（自动搜索）' },
        { symbol: 'd', meaning: '差分阶数（用户指定）' },
        { symbol: 'q', meaning: '移动平均阶数（自动搜索）' },
        { symbol: 'AIC/BIC', meaning: '信息准则，用于平衡模型精度与复杂度' },
        { symbol: 'k', meaning: '参数数量' }
      ],
      example: '若用户设定d=1，系统可能会比较(1,1,0), (0,1,1)等多种组合，最终发现(1,1,1)的AIC最小，则自动选用ARIMA(1,1,1)。'
    },
    workflow: {
      steps: [
        { title: '平稳性处理', description: '用户根据数据的趋势情况设定差分阶数d（通常0或1）。', tip: '有趋势的数据通常设d=1' },
        { title: '空间搜索', description: '系统会根据训练数据量自动设置最大p和最大q范围（最高到5），并在该范围内搜索(p,q)组合。', tip: '训练页无需手动填写max_p/max_q' },
        { title: '准则评估', description: '计算每个候选模型的AIC和BIC值。对于小样本，系统会惩罚复杂模型。', tip: '自动平衡拟合优度和复杂度' },
        { title: '最优拟合', description: '选中最佳参数组合进行最终训练，并计算残差和置信区间。', tip: '输出包括95%置信区间' }
      ]
    },
    parameters: [
      { name: '差分阶数 (d)', description: '消除趋势所需的差分次数', impact: 'd=1去除线性趋势，d=2去除二次趋势。设错可能导致模型不收敛。', typical: '0（平稳数据）或 1（趋势数据）' },
      { name: '最大AR阶数 (max_p，系统自动设置)', description: '自动搜索p时的内部上限', impact: '范围越大搜索越慢，且易过拟合。系统会根据训练数据量自动调整，训练页不开放手动输入。', typical: '小样本通常1-2，数据较多时最高到5' },
      { name: '最大MA阶数 (max_q，系统自动设置)', description: '自动搜索q时的内部上限', impact: '同max_p。系统会随样本量自动收紧或放宽搜索范围，以控制小样本过拟合风险。', typical: '小样本通常1-2，数据较多时最高到5' }
    ],
    suitability: {
      suitable: ['数据具有线性趋势或自相关性', '样本量适中（30-100个点）', '需要明确的统计解释（置信区间）', '短期预测（精度随步长递减）'],
      notSuitable: ['数据具有极其复杂的非线性', '样本量极小（<10个点，差分后更少）', '存在大量缺失值（需插值处理）', '完全随机波动的数据']
    },
    useCases: [
      { industry: '经济', scenario: 'GDP增长预测', description: '设定d=1消除增长趋势，系统自动匹配ARIMA(2,1,2)，捕捉经济周期的惯性。' },
      { industry: '制造', scenario: '物料消耗', description: '对于平稳的消耗数据（d=0），系统自动选择ARMA(1,1)模型进行库存预警。' },
      { industry: '销售', scenario: '季度业绩', description: '利用AIC准则自动剔除冗余参数，防止仅有的12个季度数据导致模型过拟合。' }
    ],
    pros: [
      { title: '自动定阶', description: '无需人工查看ACF/PACF图，自动找到最优参数' },
      { title: '防过拟合', description: '内置BIC准则优先策略，特别适合小样本场景' },
      { title: '区间预测', description: '不仅给出预测值，还能给出置信区间范围' },
      { title: '理论成熟', description: '经典的统计学方法，结果具有强可解释性' }
    ],
    cons: [
      { title: '需手动定d', description: '差分阶数仍需用户根据经验或检验确定' },
      { title: '仅限线性', description: '对非线性模式的捕捉能力不如神经网络' },
      { title: '对异常值敏感', description: '异常值会严重扭曲参数估计（均值回归特性）' },
      { title: '长步长失效', description: '预测误差会随时间步长积累而迅速扩大' }
    ],
    bestPractices: ['如果不确定d，先试d=1（大多数经济数据都有趋势）', '数据量少时（<20），信任系统自动降低的max_p/max_q限制', '观察置信区间，如果区间极宽，说明模型不确定性很高', '对比d=0和d=1的结果，选择RMSE更小的那个'],
    performance: {
      speed: { level: 'medium', description: '搜索过程需要多次拟合，比简单模型慢' },
      accuracy: { level: 'medium', description: '线性数据表现优秀，鲁棒性好' },
      dataRequirement: { level: 'medium', description: '建议至少20-30个有效数据点' },
      complexity: { level: 'medium', description: '原理复杂但使用简单（自动化了）' }
    }
  },
  {
    id: 'lstm',
    name: 'LSTM模型',
    shortName: 'LSTM',
    icon: BrainCircuit,
    category: '深度学习方法',
    summary: 'LSTM（长短期记忆网络）是一种特殊的循环神经网络，依靠门控机制捕捉时间序列的长期依赖。本系统支持多变量输入和类别特征自动编码，用于学习复杂非线性的销量变化。',
    principle: {
      description: 'LSTM的核心是"记忆细胞"和门控机制（遗忘门、输入门、输出门），能够自主决定记住或忘记历史信息。本系统特别实现了混合特征处理：对数值特征进行归一化（MinMax/Z-Score），对类别特征进行One-Hot编码，然后输入到门控循环网络中学习。',
      keyIdea: '通过门控循环网络从多变量历史数据中提取时序特征，并面向未来销量预测输出多步结果。'
    },
    implementationNotes: [
      '教科书定义关注 LSTM 单元的门控结构；层数和隐藏单元数属于工程实现选择。',
      '本系统使用单层 LSTM 加全连接输出层，并配合 Dropout 与 L2 正则抑制小样本过拟合；隐藏单元数会按训练样本量动态选择，而不是固定的大型堆叠结构。',
      '训练页只开放归一化方式和输入特征选择；Lookback窗口、训练轮数等工程参数由系统按数据量和默认策略自动设置。',
      '默认训练为直接多步预测模型，一次输出整个评估 horizon；只有生产预测准备阶段重训数据不足以支持该 horizon 时，才回退为一步递归预测。',
      '训练中的 EarlyStopping 监控训练损失而非验证损失（教学数据过小，不再切分验证集），其作用是训练损失进入平台期即停止，并非教科书意义的验证集早停。'
    ],
    mathematics: {
      description: 'LSTM的核心方程组（简化版）：',
      formula: 'f_t = σ(W_f·[h_{t-1}, x_t] + b_f)\ni_t = σ(W_i·[h_{t-1}, x_t] + b_i)\nC_t = f_t * C_{t-1} + i_t * tanh(W_C·[h_{t-1}, x_t] + b_C)',
      variables: [
        { symbol: 'f_t', meaning: '遗忘门：决定丢弃多少旧记忆' },
        { symbol: 'i_t', meaning: '输入门：决定更新多少新信息' },
        { symbol: 'C_t', meaning: '细胞状态：LSTM的长期记忆载体' },
        { symbol: 'x_t', meaning: '输入向量（包含数值和编码后的类别特征）' }
      ],
      example: '在预测销量时，f_t可能学会忽略上个月的随机噪声，i_t则重点关注刚发生的促销活动信号（由类别特征编码而来）。'
    },
    workflow: {
      steps: [
        { title: '特征工程', description: '自动识别特征类型。数值特征进行标准化/归一化，类别特征进行One-Hot编码。', tip: '支持多变量输入，自动处理混合数据' },
        { title: '序列构造', description: '基于系统自动设置的Lookback窗口，将时间序列转换为监督学习样本(X, Y)。', tip: '训练页无需手动填写Lookback' },
        { title: '深度建模', description: '构建单层LSTM网络加全连接输出层，配合Dropout与L2正则，使用Adam优化器、学习率衰减和早停策略进行训练。', tip: '隐藏单元数、批量大小和训练轮数由系统策略控制' },
        { title: '多步预测', description: '默认直接输出未来多个时间步的销量预测，减少递归预测的误差累积。', tip: '生产重训若无法支撑直接多步horizon，才回退为一步递归预测' }
      ]
    },
    parameters: [
      { name: 'Lookback窗口（系统自动设置）', description: '模型向后看多少个时间步', impact: '决定模型可利用的历史长度。窗口过短信息不足，过长会增加训练难度；当前训练页不开放手动配置。', typical: '系统按训练样本量自动取值，通常在3-6之间' },
      { name: '训练轮数 Epochs（系统默认设置）', description: '整个数据集被训练的次数', impact: '过多易过拟合，过少易欠拟合。本系统配合学习率衰减和早停策略使用。', typical: '当前默认20轮；融合内部训练会采用保守默认' },
      { name: '归一化方式', description: '数值特征的缩放方法', impact: 'MinMax适合有界数据，Z-Score适合近似正态且有离群值的数据；这是训练页开放给用户选择的参数。', typical: '默认MinMax (0-1)' }
    ],
    suitability: {
      suitable: ['数据量充足（>100个点）', '存在复杂非线性关系', '包含类别型特征（如天气、节假日）', '需要捕捉长期依赖模式'],
      notSuitable: ['数据极少（<20个点）', '完全随机的白噪声数据', '对训练速度要求极高', '需要极其直观的公式解释']
    },
    useCases: [
      { industry: '零售', scenario: '多维销量预测', description: '结合历史销量（数值）和促销类型（类别），预测未来一周销量。One-Hot编码让模型理解了"大促"与"日常"的区别。' },
      { industry: '能源', scenario: '负荷预测', description: '输入温度、湿度和历史负荷，LSTM捕捉气象因素对电力负荷的非线性影响延迟。' },
      { industry: '交通', scenario: '流量预测', description: '利用过去24小时流量预测未来1小时。深层架构有效记住了早晚高峰的周期性特征。' }
    ],
    pros: [
      { title: '混合特征支持', description: '原生支持数值和类别特征的混合输入' },
      { title: '非线性表达力', description: '单层LSTM配合全连接层即可学习复杂的时序关系' },
      { title: '自动衰减', description: '内置学习率衰减策略，训练更稳定' },
      { title: '直接多步预测', description: '面向评估区间直接输出未来多期销量' }
    ],
    cons: [
      { title: '训练较慢', description: '神经网络参数训练比统计模型耗时更长' },
      { title: '数据饥渴', description: '大模型需要足够的数据喂养才能避免过拟合' },
      { title: '稳定性依赖数据', description: '样本量不足或特征质量较差时，多步输出也可能不稳定' },
      { title: '黑箱模型', description: '难以像线性回归那样给出精确的参数解释' }
    ],
    bestPractices: ['样本量较少时优先减少输入特征数量，避免噪声过多导致不稳定', '对于包含类别特征的数据，LSTM可能比统计模型更有优势', '理解Lookback窗口由系统按样本量自动设置，若训练失败可调整数据窗口或减少预测跨度', '预测步数不宜过长，避免超出训练数据能支持的horizon'],
    performance: {
      speed: { level: 'low', description: '深层网络计算量大，训练耗时' },
      accuracy: { level: 'high', description: '在复杂数据集上通常优于统计模型' },
      dataRequirement: { level: 'medium', description: '建议至少几百个数据点' },
      complexity: { level: 'high', description: '内部结构复杂，但对外参数已简化' }
    }
  }
];

type View = 'introduction' | 'selection';

const ModelIntroductionFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState } = useExperiment();
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [view, setView] = useState<View>('introduction');
  const [selectedModels, setSelectedModels] = useState<string[]>(() =>
    normalizeBaseModelSelection(state.selected_base_models),
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // On mount, check if we should jump to the last step
  useEffect(() => {
    if (location.state?.returnTo === 'last') {
      setView('selection');
      setCurrentModelIndex(baseModels.length - 1);
    }
  }, [location.state]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentModelIndex]);

  useEffect(() => {
    setSelectedModels(normalizeBaseModelSelection(state.selected_base_models));
  }, [state.selected_base_models]);

  const activeModel = baseModels[currentModelIndex];
  if (!activeModel) return null;

  const Icon = activeModel.icon;
  const isLastModel = currentModelIndex === baseModels.length - 1;

  const handleNext = async () => {
    if (view === 'introduction') {
      if (isLastModel) {
        setView('selection');
      } else {
        setCurrentModelIndex(prev => prev + 1);
      }
    } else if (view === 'selection') {
      if (selectedModels.length >= 2) {
        try {
          await updateState({ selected_base_models: normalizeBaseModelSelection(selectedModels) }, { forceSync: true, throwOnSyncError: true });
          navigate('/model/model-select');
        } catch (error) {
          console.error('保存基础模型选择失败:', error);
          toastEventBus.error('保存基础模型选择失败，请稍后重试');
        }
      }
    }
  };

  const handlePrevious = () => {
    if (view === 'introduction') {
      if (currentModelIndex === 0) {
        navigate('/model/window');
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
      normalizeBaseModelSelection(
        prev.includes(modelId)
          ? prev.filter(id => id !== modelId)
          : [...prev, modelId],
      )
    );
  };

  const renderIntroductionView = () => (
    <div ref={scrollContainerRef} className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0">
      {/* Model Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-2xl font-bold text-gray-900">{activeModel.name}</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">
                {activeModel.shortName}
              </span>
            </div>
            <p className="text-sm text-gray-500">{activeModel.category}</p>
            <p className="text-gray-700 mt-2 leading-relaxed">{activeModel.summary}</p>
          </div>
        </div>
      </div>

        {/* Core Principle */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-blue-800">核心原理</h4>
          </div>
          <p className="text-blue-900 text-base leading-relaxed mb-2">
            {activeModel.principle.description}
          </p>
          <div className="mt-3 pl-4 border-l-4 border-blue-400">
            <p className="text-blue-800 font-medium italic">{activeModel.principle.keyIdea}</p>
          </div>
        </div>

        {activeModel.implementationNotes && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-5 h-5 text-sky-600" />
              <h4 className="text-lg font-semibold text-sky-800">本系统实现说明</h4>
            </div>
            <ul className="space-y-2">
              {activeModel.implementationNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-sky-900">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mathematics */}
        {activeModel.mathematics && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-semibold text-purple-800">数学原理</h4>
            </div>
            <p className="text-purple-900 mb-3">{activeModel.mathematics.description}</p>
            <div className="bg-white rounded p-3 mb-3 font-mono text-sm text-purple-900 border border-purple-300 whitespace-pre-wrap">
              {activeModel.mathematics.formula}
            </div>
            <div className="space-y-1 mb-3">
              {activeModel.mathematics.variables?.map((v, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="font-mono font-semibold text-purple-700">{v.symbol}:</span>
                  <span className="text-purple-800">{v.meaning}</span>
                </div>
              ))}
            </div>
            <div className="bg-purple-100 rounded p-3 text-sm text-purple-900">
              <span className="font-semibold">示例：</span> {activeModel.mathematics.example}
            </div>
          </div>
        )}

        {/* Workflow */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Workflow className="w-5 h-5 text-indigo-600" />
            <h4 className="text-lg font-semibold text-indigo-800">工作流程</h4>
          </div>
          <div className="space-y-3">
            {activeModel.workflow.steps?.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-indigo-900 mb-1">{step.title}</h5>
                  <p className="text-indigo-800 text-sm mb-1">{step.description}</p>
                  <p className="text-xs text-indigo-600 italic">💡 {step.tip}</p>
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
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Briefcase className="w-5 h-5 text-cyan-600" />
            <h4 className="text-lg font-semibold text-cyan-800">实际应用案例</h4>
          </div>
          <div className="space-y-3">
            {activeModel.useCases.map((useCase, i) => (
              <div key={i} className="bg-white rounded p-3 border border-cyan-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded">
                    {useCase.industry}
                  </span>
                  <span className="text-sm font-semibold text-cyan-900">{useCase.scenario}</span>
                </div>
                <p className="text-sm text-cyan-800">{useCase.description}</p>
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
  );

  const renderSelectionView = () => (
    <>
      <div className="flex-1">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">选择基础模型</h3>
        <p className="text-gray-600 mb-6">请选择至少两个基础模型进行后续的训练和对比。</p>
        <div className="flex flex-col items-start gap-4">
          {baseModels.map(model => {
            const isSelected = selectedModels.includes(model.id);
            const ModelIcon = model.icon;
            return (
              <label
                key={model.id}
                className={`py-4 pl-4 pr-6 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-blue-400'}`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleModelToggle(model.id)}
                    className="form-checkbox h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <ModelIcon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>{model.name}</span>
                </div>
              </label>
            );
          })}
        </div>
        {selectedModels.length < 2 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <Info className="w-5 h-5 flex-shrink-0" />
            <span>请至少选择两个模型。</span>
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
          disabled={selectedModels.length < 2}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
        >
          下一步
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-2">
      {/* Compact Header */}
      <div className="mb-3 flex-shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <h2 className="shrink-0 text-xl font-bold text-gray-800">
              {view === 'introduction' ? '基础模型介绍' : '基础模型选择'}
            </h2>
            {view === 'introduction' && (
              <div className="flex min-w-0 flex-1 items-center gap-x-3 gap-y-2 overflow-x-auto">
                {baseModels.map((model, index) => {
                  const isCompleted = index < currentModelIndex;
                  const isActive = index === currentModelIndex;
                  return (
                    <React.Fragment key={model.id}>
                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-blue-500' : isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className="text-xs font-bold text-white">
                            {index + 1}
                          </span>
                        </div>
                        <span
                          className={`font-medium text-sm ${isActive ? 'text-blue-600' : isCompleted ? 'text-gray-800' : 'text-gray-500'}`}
                        >
                          {model.name}
                        </span>
                      </div>
                      {index < baseModels.length - 1 && (
                        <ChevronRight className="w-4 h-4 shrink-0 text-gray-300" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
          {view === 'introduction' && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handlePrevious}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-blue-700 hover:to-indigo-700"
              >
                {isLastModel ? '选择基础模型' : '下一个模型'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col min-h-0">
        {view === 'introduction' ? renderIntroductionView() : renderSelectionView()}
      </div>
    </div>
  );
};

export default ModelIntroductionFlow;
