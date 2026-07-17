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
    summary: '移动平均法是最基础的时间序列基准之一：用最近固定窗口的算术平均预测下一期。本系统以递推方式扩展到多期预测，适合刻画相对稳定的局部水平，不会主动外推趋势。',
    principle: {
      description: '移动平均法的核心思想是“平滑”：用最近 n 个观测的算术平均估计局部水平。平均会削弱短期随机波动，但也会滞后于趋势，而且算术平均本身对异常值并不稳健。',
      keyIdea: '用最近 n 期历史值的平均数预测下一期；它是局部水平基准，不是趋势模型。'
    },
    implementationNotes: [
      '教科书移动平均通常先定义为下一期预测：用最近n期实际值的平均数预测下一期。',
      '本系统要求窗口 n 为整数、2≤n≤训练样本数；n=1只是上一期值延续，不能展示均值平滑特性，因此不开放。',
      '为了预测未来多期销量，系统会将每一期预测值滚入窗口继续递推，整个评估过程不使用评估集真实值作为下一步输入。',
      '最终作为销量使用的点预测按 max(0, ŷ) 截断，并以截断值计算评估残差和指标；逐 horizon 的误差校准独立来自训练段 rolling-origin 回测，不读取评估区间真实值。该非负兜底不属于教科书移动平均公式。',
      '逐 horizon 的 std_dev、95%区间和99%上侧误差来自训练段 rolling-origin 多步 actual-prediction 残差；区间使用经验分位数以保留稳定偏差，样本不足的 horizon 使用明确标注的一阶差分 sqrt(h) 正态近似回退。'
    ],
    mathematics: {
      description: '移动平均法的计算公式非常简单直观：',
      formula: 'ŷ(t+1) = (1/n)Σ[j=0...n-1] y(t-j)',
      variables: [
        { symbol: 'ŷ(t+1)', meaning: '在t时刻对下一期的预测值' },
        { symbol: 'y(t-j)', meaning: '截至t时刻、向前第j期的实际观测值' },
        { symbol: 'n', meaning: '移动平均的窗口大小' }
      ],
      example: '例如3期移动平均：如果最近3个月销量为100、120、110，则预测值 = (100+120+110)/3 = 110'
    },
    workflow: {
      steps: [
        { title: '确定窗口大小', description: '选择满足2≤n≤训练样本数的整数。n越大平滑效果越强，但反应越慢。', tip: '可结合业务周期和时间顺序回测比较多个窗口' },
        { title: '计算移动平均', description: '积累满n个实际观测后，取最近n期的平均值预测下一期。', tip: '预测下一期后，滑动窗口随时间向前移动' },
        { title: '生成预测', description: '最后一个窗口的平均值先作为下一期预测；需要多期预测时，再把预测值滚入窗口继续计算，最终销量点预测截断为不小于0。', tip: '非负截断是业务后处理，不改变教科书均值公式' }
      ]
    },
    parameters: [{ name: '窗口大小 (n)', description: '用于计算平均值的最近历史点数量；本系统要求整数且至少为2', impact: '窗口越大越平滑但滞后越严重；窗口越小反应越快但易受噪声影响', typical: '在2到训练样本数之间，常结合业务周期与回测选择' }],
    suitability: {
      suitable: ['数据相对平稳，无明显趋势', '短期波动较大，需要平滑处理', '需要快速的短期销量预测', '数据量较小', '需要快速简单的预测方法'],
      notSuitable: ['数据有明显上升或下降趋势', '存在明显季节性模式', '需要较长周期的高精度预测', '数据发生结构性变化', '对预测精度要求很高']
    },
    useCases: [
      { industry: '零售业', scenario: '日常商品库存预测', description: '便利店可用7天移动平均预测牛奶日销量，并通过时间顺序回测确认它是否足以支持每日进货决策。' },
      { industry: '制造业', scenario: '短期需求预测', description: '工厂可用3个月移动平均作为标准零件需求的快速基准；是否用于生产计划仍应由留出评估结果决定。' }
    ],
    pros: [
      { title: '极其简单', description: '易于理解和实现，不需要复杂数学知识' },
      { title: '计算快速', description: '只需简单运算，适合实时预测' },
      { title: '平滑随机波动', description: '能削弱短期噪声；但均值仍会受异常值影响' },
      { title: '数据要求低', description: '不需要大量数据或特定分布' }
    ],
    cons: [
      { title: '无法捕捉趋势', description: '对趋势数据预测会滞后于实际值' },
      { title: '不能处理季节性', description: '无法识别周期性波动模式' },
      { title: '窗口选择困难', description: 'n值影响大但无统一标准，需试错' },
      { title: '长期能力弱', description: '多期递推会快速趋于平滑水平，难以刻画趋势和季节变化' }
    ],
    bestPractices: ['在同一时间顺序回测或留出区间比较多个n值，选择误差较小且表现稳定的窗口', '考虑业务周期，如数据有周周期性可用7期', '多步预测时关注递推后的平滑偏差', '数据模式变化时及时调整或换方法', '可作为评估复杂模型的基准'],
    performance: {
      speed: { level: 'high', description: '计算极快，适合实时' },
      accuracy: { level: 'low-medium', description: '平稳数据尚可，趋势数据较差' },
      dataRequirement: { level: 'low', description: '至少需要n个训练历史点；本系统n≥2' },
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
      description: '固定窗口移动平均对窗口内最近n期等权；指数平滑则认为“最近的数据更重要”，对全部历史观测分配随时间指数递减的权重。越近期的数据权重越大，越久远的数据权重越小。',
      keyIdea: '用加权平均的方式估计当前水平，让模型既利用历史信息，又能响应新变化。'
    },
    implementationNotes: [
      '本系统实现的是一次指数平滑，也就是教科书中的基础指数平滑模型。',
      '系统保持用户给定 α 不变，并用训练数据估计初始水平；随后按一次指数平滑递推公式更新。',
      '系统要求平滑系数满足 0 < α ≤ 1；α=0不会引入新观测值，因此不作为可选参数。',
      'α由用户固定输入，训练过程不会自动估计或网格搜索 α。',
      '一次指数平滑的多期未来销量预测为水平外推；趋势和季节性需要 Holt 或 Holt-Winters 扩展，本模型未启用这些扩展。',
      '非负训练销量通常会自然得到非负水平；系统仍将最终销量点预测按 max(0, ŷ) 截断，并以截断值计算评估残差和指标。误差校准来自训练期未做输出截断的一步 actual-prediction 残差；该兜底不是 SES 递推式的一部分。',
      'std_dev 使用 ETS(A,N,N) 的解析预测方差 σ²[1+α²(h-1)]；95%区间和99%上侧误差则取带相同步长增长因子的经验残差分位数，以保留稳定偏差。样本不足时明确标记正态近似回退。'
    ],
    mathematics: {
      description: '指数平滑的基本公式非常简洁：',
      formula: 'S(t) = α·X(t) + (1-α)·S(t-1)',
      variables: [
        { symbol: 'S(t)', meaning: '看到X(t)后估计的t时刻水平，用于预测下一期及以后' },
        { symbol: 'X(t)', meaning: 't时刻的实际观测值' },
        { symbol: 'S(t-1)', meaning: 't-1时刻的平滑值' },
        { symbol: 'α', meaning: '平滑系数，本系统取值范围为0 < α ≤ 1' }
      ],
      example: '若α=0.3，上期平滑值100，本期实际值120，则新平滑值 = 0.3×120 + 0.7×100 = 106'
    },
    workflow: {
      steps: [
        { title: '选择平滑系数α', description: 'α决定模型对新数据的敏感度。α越大反应越快，α越小越平滑。', tip: '本系统使用用户输入值，不自动优化' },
        { title: '估计初始水平', description: '教科书有多种初始化方案；本系统在固定α下由训练数据估计初始水平。', tip: '训练结果会记录估计出的初始水平' },
        { title: '递推计算', description: '从第二期开始，用公式逐期计算平滑值，每个新值都融合了全部历史信息。', tip: '只需存储上一期平滑值，内存开销极小' },
        { title: '生成预测', description: '最新平滑值向未来保持不变，最终作为销量的点预测再截断到不小于0。', tip: '趋势和季节性要使用扩展模型；截断只是业务后处理' }
      ]
    },
    parameters: [{ name: '平滑系数 α (alpha)', description: '控制新观测与上一平滑水平的权重，本系统要求0<α≤1并由用户指定', impact: 'α接近1时模型几乎只看最新数据，反应敏捷但易受噪声影响；α接近0时水平变化缓慢、更平滑但更滞后', typical: '没有普适最优值；可另做时间顺序回测比较，但本训练流程不自动搜索' }],
    suitability: {
      suitable: ['数据无明显趋势或季节性', '需要快速响应最新水平变化', '历史数据量有限或存储受限', '需要实时更新短期预测', '数据相对平稳但非完全随机'],
      notSuitable: ['数据有强烈季节性周期', '存在结构性断点或突变', '需要捕捉复杂非线性关系', '数据中噪声过大', '需要显式建模长期趋势或季节性']
    },
    useCases: [
      { industry: '电商', scenario: '日销量短期预测', description: '电商平台可用一次指数平滑预测明日销量。促销观测进入训练历史后，水平会按α逐步响应；未来多步仍保持同一水平，不会预知下一次促销。' },
      { industry: '服务业', scenario: '短期呼入量预测', description: '当呼入量围绕缓慢变化的水平波动、且没有明显趋势或季节性时，可用一次指数平滑预测近期需求。' },
      { industry: '供应链', scenario: '稳定备件补货', description: '对没有明显趋势和季节性的低频备件需求，可用一次指数平滑更新当前需求水平，并通过留出评估判断是否适用。' }
    ],
    pros: [
      { title: '响应最新水平', description: 'α较大时能较快响应最新观测的水平变化' },
      { title: '高效简洁', description: '计算简单，只需存储少量状态变量' },
      { title: '适应性强', description: '可通过调整α适应不同波动特性的数据' },
      { title: '理论完善', description: '有坚实的统计理论基础，有多种成熟变体' }
    ],
    cons: [
      { title: '参数敏感', description: 'α的选择对结果影响很大，需要仔细调优' },
      { title: '基础版局限', description: '单次指数平滑无法处理趋势和季节性' },
      { title: '水平外推', description: '多步预测保持同一水平，遇到趋势拐点会滞后' },
      { title: '结构表达有限', description: '只能表示水平成分，不能单独表达趋势和季节结构' }
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
    summary: 'ARIMA（自回归积分移动平均模型）是经典线性时间序列方法。本系统实现非季节 ARIMA：用户固定差分阶数 d，系统按有效样本量确定边界并执行一次 AICc stepwise 搜索。',
    principle: {
      description: 'ARIMA通过三个核心组件建模：AR（自回归）利用差分后序列的历史值；I（差分）处理非平稳性；MA（移动平均）利用历史创新项。本系统以小样本修正的 AICc 平衡拟合与复杂度。',
      keyIdea: '先用固定阶数的非季节差分处理非平稳性，再用 AR 与 MA 项刻画差分后序列的线性相关结构。'
    },
    implementationNotes: [
      '教科书 ARIMA 通常通过平稳性检验、ACF/PACF 图和信息准则共同确定 p、d、q。',
      '本系统由用户指定差分阶数 d；对 p、q 运行一次 AICc 目标的 stepwise 搜索。stepwise 是启发式逐步搜索，不等同于穷举全部组合。',
      '搜索边界按差分后的有效训练点数收紧：不多于12点时p/q上限为1，13–20点时为2，更长时最高为min(5, floor(n_eff/6))。',
      '本模型是非季节 ARIMA，不包含季节差分或季节 AR/MA 项。原始点预测可能为负，系统将用于残差、指标和输出的销量点预测按 max(0, ŷ) 截断。',
      '95%预测区间仍来自未截断的ARIMA预测分布；系统按精确95%正态临界值由区间宽度反推std_dev，并由同一分布计算99%上侧误差。这不是截断正态区间，区间通常会随预测步长展宽。'
    ],
    mathematics: {
      description: 'ARIMA(p,d,q)模型方程：',
      formula: '(1 - ΣφᵢBⁱ)(1-B)ᵈ yₜ = c + (1 + ΣθᵢBⁱ)εₜ\nAIC = 2k - 2ln(L)\n目标：min[AICc = AIC + 2k(k+1)/(n-k-1)]',
      variables: [
        { symbol: 'p', meaning: '自回归阶数（自动搜索）' },
        { symbol: 'd', meaning: '差分阶数（用户指定）' },
        { symbol: 'q', meaning: '移动平均阶数（自动搜索）' },
        { symbol: 'B', meaning: '滞后算子，Byₜ=yₜ₋₁' },
        { symbol: 'φᵢ / θᵢ', meaning: '第i阶自回归系数 / 移动平均系数' },
        { symbol: 'c', meaning: '模型中的常数项或漂移相关项' },
        { symbol: 'εₜ', meaning: 't时刻的随机创新项' },
        { symbol: 'AICc', meaning: '带小样本修正的信息准则，用于平衡拟合与复杂度' },
        { symbol: 'k', meaning: '用于信息准则计算的估计参数数量' },
        { symbol: 'n', meaning: '差分后用于拟合的有效样本数' },
        { symbol: 'L', meaning: '候选模型在训练数据上的最大似然值' }
      ],
      example: '若用户设定d=1，系统会在有效样本量允许的边界内执行 AICc stepwise 搜索；它不保证检查范围内每个(p,q)。'
    },
    workflow: {
      steps: [
        { title: '平稳性处理', description: '系统对d=0、1、2分别进行ADF检验，用户据此固定本次建模的差分阶数d。', tip: '本系统以p<0.05判为拒绝单位根原假设' },
        { title: 'AICc逐步搜索', description: '系统按有效训练点数设置p/q上限，运行一次非季节 AICc stepwise 搜索。', tip: '逐步搜索不保证遍历所有组合' },
        { title: '收敛与诊断', description: '检查优胜模型收敛状态，必要时提高迭代上限重试，并记录自由度修正的 Ljung–Box 诊断。', tip: '诊断用于解释，不在评估集上事后换模' },
        { title: '预测与区间', description: '生成多步预测，将销量点预测截断为非负；同时保留原始ARIMA分布的95%区间宽度。', tip: '点预测受业务约束，区间并未改造成截断分布' }
      ]
    },
    parameters: [
      { name: '差分阶数 (d)', description: '对非季节相邻差分重复应用的次数，由用户依据ADF结果固定', impact: '差分可减弱随机趋势或低阶确定性趋势，但过度差分会损失信息并引入额外相关性；它不会自动处理季节性。', typical: '本系统允许0、1、2，优先选择达到平稳所需的最小阶数' },
      { name: '最大AR阶数 (max_p，系统自动设置)', description: '自动搜索p时的内部上限', impact: '范围越大搜索越慢，且易过拟合。系统会根据训练数据量自动调整，训练页不开放手动输入。', typical: '小样本通常1-2，数据较多时最高到5' },
      { name: '最大MA阶数 (max_q，系统自动设置)', description: '自动搜索q时的内部上限', impact: '同max_p。系统会随样本量自动收紧或放宽搜索范围，以控制小样本过拟合风险。', typical: '小样本通常1-2，数据较多时最高到5' }
    ],
    suitability: {
      suitable: ['数据具有线性趋势或自相关性', '样本量足以支持差分和参数估计', '需要明确的统计解释（预测区间）', '短期预测（不确定性通常随步长增加）'],
      notSuitable: ['数据具有极其复杂的非线性', '差分后有效样本极少，无法稳定估计候选阶数', '存在大量缺失值（需插值处理）', '白噪声虽可表示为ARIMA(0,0,0)，但没有可利用的预测结构']
    },
    useCases: [
      { industry: '经济', scenario: 'GDP增长预测', description: '若一阶差分通过当前ADF门槛，可设d=1，再由系统在样本量允许的范围内用stepwise搜索选择p、q；具体阶数由数据决定。' },
      { industry: '制造', scenario: '物料消耗', description: '若原序列通过当前ADF门槛，可设d=0，再由系统以AICc stepwise搜索非季节ARMA候选模型。' },
      { industry: '销售', scenario: '季度业绩', description: '系统会随小样本收紧p、q上限，并始终以AICc作为当前搜索目标；信息准则和stepwise搜索只能降低、不能消除过拟合风险。' }
    ],
    pros: [
      { title: '辅助定阶', description: '用 AICc stepwise 搜索降低人工查看ACF/PACF的操作负担，但不保证全局最优' },
      { title: '小样本收缩', description: '样本少时收紧阶数边界并使用 AICc 修正，以降低而非消除过拟合风险' },
      { title: '区间预测', description: '除点预测外，还给出未来观测值的95%预测区间' },
      { title: '理论成熟', description: '经典的统计学方法，结果具有强可解释性' }
    ],
    cons: [
      { title: '需手动定d', description: '差分阶数仍需用户根据经验或检验确定' },
      { title: '仅限线性', description: '对非线性模式的捕捉能力不如神经网络' },
      { title: '对异常值敏感', description: '异常值可能扭曲参数估计与残差诊断' },
      { title: '远期不确定性', description: 'd=0的平稳模型区间通常趋于有限宽度；d≥1时预测区间会继续随步长增长' }
    ],
    bestPractices: ['先查看ADF结果，选择达到平稳所需的最小d，而不是默认从d=1开始', '数据量少时注意系统会自动降低max_p/max_q，但简单阶数仍可能过拟合', '观察预测区间，区间很宽说明模型对远期预测更不确定', '结合评估误差与残差诊断判断模型，不能只看信息准则'],
    performance: {
      speed: { level: 'medium', description: '搜索过程需要多次拟合，比简单模型慢' },
      accuracy: { level: 'medium', description: '在线性自相关结构明显时可能表现良好；对异常值和结构变化敏感' },
      dataRequirement: { level: 'medium', description: '建议至少20-30个有效数据点' },
      complexity: { level: 'medium', description: '定阶与诊断原理较复杂，系统自动执行部分搜索步骤' }
    }
  },
  {
    id: 'lstm',
    name: 'LSTM模型',
    shortName: 'LSTM',
    icon: BrainCircuit,
    category: '深度学习方法',
    summary: 'LSTM（长短期记忆网络）用门控循环结构学习时序依赖。本系统把截止点前的多变量历史窗口编码后输入单层 LSTM，并由直接多步输出头一次预测整个未来跨度。',
    principle: {
      description: 'LSTM的核心是记忆细胞和遗忘门、输入门、输出门。本系统仅用训练区间拟合预处理器：数值特征做MinMax或Z-score变换，类别特征做One-Hot编码；目标销量也自动作为历史数值输入。',
      keyIdea: '从截止点之前的多变量历史窗口提取时序表示，再一次性输出固定长度的未来销量向量。'
    },
    implementationNotes: [
      '教科书定义关注 LSTM 单元的门控结构；层数和隐藏单元数属于工程实现选择。',
      '本系统使用单层 LSTM 加 Dense 输出层，look-back 在2到12之间，隐藏单元、批大小和最大轮数按窗口数、跨度及特征维度动态选择；若无法保留至少两个历史步和四个监督窗口则拒绝训练。',
      '预处理器只在训练区间拟合，避免评估数据参与缩放或类别学习；评估期与未来期的特征轨迹不会作为输入。',
      '训练页只开放数值缩放方式和输入特征选择；Lookback窗口、训练轮数等工程参数由系统按数据量和默认策略自动设置。',
      '默认训练为直接多步预测模型，一次输出整个评估 horizon；生产预测准备阶段用同样的直接多步策略重训，若数据窗口不足以支撑该 horizon，系统会报错提示扩大数据窗口，而不是改用一步递归预测。',
      '有限时间验证模式按时间顺序留出验证窗口并隔离标签重叠，EarlyStopping 监控验证损失；选定轮数后在全部窗口重拟合。窗口不足时进入明确标注的教学演示模式。两种模式都不等同于生产级泛化验证。',
      '线性Dense输出层不保证非负；系统在逆缩放后把最终销量点预测按 max(0, ŷ) 截断，并以截断值计算评估残差和指标，销量范围也同步限制为非负并保证包含点预测。std_dev、名义95%范围和名义99%上侧误差估计优先来自临时时间验证模型中逆缩放、未做非负截断的逐 horizon actual-prediction 残差；该验证段同时用于EarlyStopping，最终模型也会重拟合，因此输出明确标记为未校准、无覆盖率保证。Boosting内部拟合有符号残差时会显式关闭点预测和区间截断。独立评估还应另行对比朴素基线。'
    ],
    mathematics: {
      description: 'LSTM的核心方程组（简化版）：',
      formula: 'f_t = σ(W_f·[h_{t-1}, x_t] + b_f)\ni_t = σ(W_i·[h_{t-1}, x_t] + b_i)\nC_t = f_t * C_{t-1} + i_t * tanh(W_C·[h_{t-1}, x_t] + b_C)\no_t = σ(W_o·[h_{t-1}, x_t] + b_o)\nh_t = o_t * tanh(C_t)',
      variables: [
        { symbol: 'f_t', meaning: '遗忘门：决定丢弃多少旧记忆' },
        { symbol: 'i_t', meaning: '输入门：决定更新多少新信息' },
        { symbol: 'o_t', meaning: '输出门：决定当前记忆向隐藏状态暴露多少' },
        { symbol: 'C_t', meaning: '细胞状态：LSTM的长期记忆载体' },
        { symbol: 'h_t', meaning: '隐藏状态：传递给下一时刻和输出层的表示' },
        { symbol: 'x_t', meaning: '输入向量（包含数值和编码后的类别特征）' },
        { symbol: 'σ', meaning: 'Sigmoid激活函数，把门值压缩到0到1之间' },
        { symbol: 'W_*', meaning: '各个门和候选记忆对应的可训练权重矩阵' },
        { symbol: 'b_*', meaning: '各个门和候选记忆对应的可训练偏置向量' }
      ],
      example: '在预测销量时，f_t可能学会忽略上个月的随机噪声，i_t则重点关注经数值缩放或类别编码后的促销活动信号。'
    },
    workflow: {
      steps: [
        { title: '特征工程', description: '自动识别字段类型，仅用训练区间拟合数值缩放器和类别One-Hot编码器。', tip: '目标销量自动加入历史输入，评估期特征不参与拟合' },
        { title: '序列构造', description: '基于系统自动设置的Lookback窗口，将时间序列转换为监督学习样本(X, Y)。', tip: '训练页无需手动填写Lookback' },
        { title: '动态建模', description: '按参数预算构建单层LSTM和Dense输出层，使用Adam与时间验证早停选择训练轮数。', tip: '小样本会明确进入教学演示模式' },
        { title: '多步预测', description: '仅取截止点前动态推导的最近历史窗口，一次输出未来多期，逆缩放后将销量点预测截断为不小于0。', tip: '不会读取未来特征路径；截断是输出业务约束' }
      ]
    },
    parameters: [
      { name: 'Lookback窗口（系统自动设置）', description: '模型向后看多少个时间步', impact: '决定模型可利用的历史长度。窗口过短信息不足，过长会增加训练难度；当前训练页不开放手动配置。', typical: '系统按训练样本量自动取值，范围为2-12；若无法保留至少2步历史和4个监督窗口则拒绝训练' },
      { name: '训练轮数 Epochs（系统动态设置）', description: '整个数据集被训练的次数', impact: '有限时间验证模式用时间验证早停选取，并在全部窗口按最佳轮数重拟合；演示模式按更新步预算设置。', typical: '由样本窗数和批大小决定，不使用固定默认值' },
      { name: '附加输入特征（用户选择）', description: '除历史销量外送入LSTM的历史字段；可以不选择，形成单变量模型', impact: '有效特征可能提供额外信号，过多或事后字段会增加过拟合和数据泄漏风险。', typical: '优先选择少量、与销量有业务关系且在对应历史时点已经产生的字段' },
      { name: '数值缩放方式（用户选择）', description: '数值特征的缩放方法；类别字段始终One-Hot编码', impact: 'MinMax按训练区间最小/最大值线性缩放，Z-score按训练均值和标准差缩放；两者都受异常值影响，且Z-score不会把非正态数据变成正态分布。', typical: '系统不预选默认值；用户必须选择MinMax或Z-score' }
    ],
    suitability: {
      suitable: ['可用监督窗口足以划分训练与时间验证', '存在复杂非线性关系', '包含类别型特征（如天气、节假日）', '最近2-12个时间步内存在可学习的时序依赖'],
      notSuitable: ['监督窗口偏少时只能进入教学演示，无法据此声称泛化性能；若无法保留至少2步历史和4个监督窗口则直接拒绝训练', '完全随机的白噪声数据', '对训练速度要求极高', '需要极其直观的公式解释']
    },
    useCases: [
      { industry: '零售', scenario: '多维销量预测', description: '结合截止点之前的历史销量和历史促销类型，学习促销后销量变化的时序模式；本系统不会读取未来促销计划。' },
      { industry: '能源', scenario: '负荷预测', description: '输入截止点之前的温度、湿度和历史负荷，学习气象因素的滞后影响；若要利用未来天气预报，需要扩展当前输入接口。' },
      { industry: '交通', scenario: '流量预测', description: '利用系统动态选择的最近2-12个时间步预测未来多步流量；若采样频率、历史窗口与样本量合适，LSTM可能学到窗口内的重复模式。' }
    ],
    pros: [
      { title: '混合特征支持', description: '通过数值缩放与One-Hot预处理支持历史数值和类别字段' },
      { title: '非线性表达力', description: 'LSTM门控层和全连接输出能学习非线性时序关系' },
      { title: '动态容量', description: '参数预算随可用窗口与特征维度调整，避免固定大网络' },
      { title: '直接多步预测', description: '从训练截止点一次输出完整评估跨度的多期销量，不读取评估区间特征' }
    ],
    cons: [
      { title: '训练较慢', description: '神经网络参数训练比统计模型耗时更长' },
      { title: '数据饥渴', description: '大模型需要足够的数据喂养才能避免过拟合' },
      { title: '稳定性依赖数据', description: '样本量不足或特征质量较差时，多步输出也可能不稳定' },
      { title: '黑箱模型', description: '难以像线性回归那样给出精确的参数解释' }
    ],
    bestPractices: ['样本量较少时优先减少输入特征数量，避免噪声过多导致不稳定', '对于包含类别特征的数据，LSTM可能比统计模型更有优势', '理解Lookback窗口由系统按样本量自动设置，若训练失败可调整数据窗口或减少预测跨度', '预测步数不宜过长，避免超出训练数据能支持的horizon'],
    performance: {
      speed: { level: 'low', description: '即使是当前单层网络，反向传播和动态训练也明显慢于统计模型' },
      accuracy: { level: 'medium-high', description: '有足够样本和有效非线性历史信号时有较高潜力，不保证优于统计模型' },
      dataRequirement: { level: 'high', description: '系统兼容较小数据，但样本越少，直接多步网络越容易不稳定或过拟合' },
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
                <span aria-hidden="true" className="text-teal-600 font-bold flex-shrink-0">•</span>
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
          <p className="mb-3 text-xs leading-5 text-slate-600">
            以下是算法结构的定性比较，不是当前数据集上的实测排名；实际效果以相同评估区间的指标为准。
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(activeModel.performance).map(([key, value]) => {
              const labels: Record<string, string> = {
                speed: '计算速度',
                accuracy: '表达潜力（非精度保证）',
                dataRequirement: '数据需求',
                complexity: '复杂程度'
              };
              const levelColors: Record<string, string> = {
                high: 'bg-green-100 text-green-700',
                'medium-high': 'bg-emerald-100 text-emerald-700',
                'low-medium': 'bg-yellow-100 text-yellow-700',
                low: 'bg-blue-100 text-blue-700',
                medium: 'bg-orange-100 text-orange-700'
              };
              return (
                <div key={key} className="bg-white rounded p-3 border border-slate-200">
                  <div className="text-xs text-slate-600 mb-1">{labels[key]}</div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded inline-block mb-1 ${levelColors[value.level] || 'bg-gray-100 text-gray-700'}`}>
                    {{ high: '高', 'medium-high': '中高', medium: '中', 'low-medium': '中低', low: '低' }[value.level] ?? value.level}
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
