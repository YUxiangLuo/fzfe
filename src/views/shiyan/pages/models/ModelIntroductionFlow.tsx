import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
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
        { title: '生成预测', description: '最后一个窗口的平均值即为下一期的预测值。', tip: '通常只预测下一期' }
      ]
    },
    parameters: [{ name: '窗口大小 (n)', description: '用于计算平均值的历史数据点数量', impact: '窗口越大越平滑但滞后越严重；窗口越小反应越快但易受噪声影响', typical: '3-12期，取决于数据波动性' }],
    suitability: {
      suitable: ['数据相对平稳，无明显趋势', '短期波动较大，需要平滑处理', '只需预测下一期（短期预测）', '数据量较小', '需要快速简单的预测方法'],
      notSuitable: ['数据有明显上升或下降趋势', '存在明显季节性模式', '需要长期预测（多期）', '数据发生结构性变化', '对预测精度要求很高']
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
      { title: '仅适合短期', description: '只能预测下一期，无法多期预测' }
    ],
    bestPractices: ['尝试多个n值，选择历史误差最小的', '考虑业务周期，如数据有周周期性可用7期', '数据模式变化时及时调整或换方法', '可作为评估复杂模型的基准'],
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
    summary: '指数平滑法是一种加权移动平均方法，赋予近期数据更高权重，权重随时间呈指数级递减，能够灵敏地跟踪数据变化。',
    principle: {
      description: '与移动平均法平等对待所有历史数据不同，指数平滑法认为"最近的数据更重要"。它对历史观测值分配递减的权重，越近期的数据权重越大，越久远的数据权重越小，权重衰减遵循指数函数。',
      keyIdea: '用加权平均的方式，让模型既能记住历史趋势，又能快速响应新变化。'
    },
    mathematics: {
      description: '指数平滑的基本公式非常简洁：',
      formula: 'S(t) = α·X(t) + (1-α)·S(t-1)',
      variables: [
        { symbol: 'S(t)', meaning: 't时刻的平滑值（预测值）' },
        { symbol: 'X(t)', meaning: 't时刻的实际观测值' },
        { symbol: 'S(t-1)', meaning: 't-1时刻的平滑值' },
        { symbol: 'α', meaning: '平滑系数，取值范围0-1' }
      ],
      example: '若α=0.3，上期平滑值100，本期实际值120，则新平滑值 = 0.3×120 + 0.7×100 = 106'
    },
    workflow: {
      steps: [
        { title: '选择平滑系数α', description: 'α决定模型对新数据的敏感度。α越大反应越快，α越小越平滑。', tip: '通常选择0.1-0.3，可通过历史数据优化' },
        { title: '初始化平滑值', description: '第一个平滑值可以设为第一个观测值，或前几个数据的平均值。', tip: '初始值影响较小，几期后会被"遗忘"' },
        { title: '递推计算', description: '从第二期开始，用公式逐期计算平滑值，每个新值都融合了全部历史信息。', tip: '只需存储上一期平滑值，内存开销极小' },
        { title: '生成预测', description: '最新的平滑值即为下一期的预测值（单次指数平滑）。', tip: '更复杂的变体可预测多期' }
      ]
    },
    parameters: [{ name: '平滑系数 α (alpha)', description: '控制新旧数据的权重分配，是模型的核心参数', impact: 'α接近1时模型几乎只看最新数据，反应敏捷但易受噪声影响；α接近0时模型变化缓慢，平滑但滞后', typical: '0.1-0.3（平稳数据），0.3-0.5（波动数据），可用网格搜索优化' }],
    suitability: {
      suitable: ['数据有缓慢变化的趋势', '需要快速响应最新变化', '历史数据量有限或存储受限', '需要实时更新预测', '数据相对平稳但非完全随机'],
      notSuitable: ['数据有强烈季节性周期', '存在结构性断点或突变', '需要捕捉复杂非线性关系', '数据中噪声过大', '需要长期（多期）预测']
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
      { title: '仍有滞后', description: '虽比移动平均好，但预测仍会滞后于实际拐点' },
      { title: '缺乏解释性', description: '难以分解出数据的内在结构成分' }
    ],
    bestPractices: ['使用交叉验证选择最优α值，而非主观猜测', '数据有趋势时使用双次或三次指数平滑（Holt方法）', '数据有季节性时使用Holt-Winters方法', '定期重新评估α，数据特性变化时及时调整', '可与其他方法组合，如ARIMA+指数平滑'],
    performance: {
      speed: { level: 'high', description: '计算极快，适合实时系统' },
      accuracy: { level: 'medium', description: '平稳趋势数据表现良好，复杂模式较差' },
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
    summary: 'ARIMA（自回归积分移动平均模型）是时间序列分析的经典方法，结合AR、I、MA三大组件，能够系统地建模和预测非平稳时间序列。',
    principle: {
      description: 'ARIMA通过三个核心机制处理时间序列：AR（自回归）利用数据自身的历史值预测未来；I（差分）将非平稳序列转化为平稳序列；MA（移动平均）对预测误差进行建模。三者结合，形成强大而灵活的预测框架。',
      keyIdea: '将复杂的时间序列分解为可建模的平稳成分，然后用线性模型精确刻画其内在规律。'
    },
    mathematics: {
      description: 'ARIMA(p,d,q)模型的一般形式：',
      formula: '(1-φ₁B-...-φₚBᵖ)(1-B)ᵈX(t) = (1+θ₁B+...+θ_qB^q)ε(t)',
      variables: [
        { symbol: 'p', meaning: 'AR阶数（自回归项数量）' },
        { symbol: 'd', meaning: '差分阶数（差分次数）' },
        { symbol: 'q', meaning: 'MA阶数（移动平均项数量）' },
        { symbol: 'B', meaning: '后移算子' },
        { symbol: 'ε(t)', meaning: '白噪声误差项' }
      ],
      example: 'ARIMA(1,1,1)表示：1阶差分后，用1个AR项和1个MA项建模。适合有趋势的数据。'
    },
    workflow: {
      steps: [
        { title: '平稳性检验', description: '通过ADF检验等方法判断序列是否平稳，确定差分阶数d。', tip: '非平稳序列需要差分，差分后再次检验' },
        { title: '模型定阶', description: '通过ACF和PACF图，或使用AIC/BIC准则确定p和q的值。', tip: '这是ARIMA最关键也最困难的步骤' },
        { title: '参数估计', description: '使用最大似然估计或最小二乘法估计模型参数φ和θ。', tip: '现代软件会自动完成，但需检查参数显著性' },
        { title: '模型诊断', description: '检查残差是否为白噪声，通过Ljung-Box检验验证模型充分性。', tip: '残差有模式说明模型不够好，需重新定阶' },
        { title: '预测', description: '使用拟合好的模型进行未来值预测，可给出置信区间。', tip: 'ARIMA可进行多期预测，但越远越不准' }
      ]
    },
    parameters: [
      { name: 'p - AR阶数', description: '模型使用多少个历史值进行自回归', impact: 'p过小无法捕捉自相关结构，p过大导致过拟合和计算复杂', typical: '通常0-5，观察PACF图截尾位置' },
      { name: 'd - 差分阶数', description: '需要进行几次差分使序列平稳', impact: 'd=0表示序列已平稳，d=1去除线性趋势，d=2去除二次趋势', typical: '通常0-2，多于2次差分很少见' },
      { name: 'q - MA阶数', description: '模型使用多少个历史误差项', impact: 'q过小丢失误差信息，q过大模型复杂且不稳定', typical: '通常0-5，观察ACF图截尾位置' }
    ],
    suitability: {
      suitable: ['数据有明显的自相关性', '序列可通过差分变平稳', '需要理论支撑和可解释性', '数据量充足（至少50个观测）', '线性趋势和规律性强'],
      notSuitable: ['数据有复杂非线性关系', '强季节性（需用SARIMA）', '数据量太小（<30个点）', '有大量缺失值或异常值', '需要纳入外部变量（需用ARIMAX）']
    },
    useCases: [
      { industry: '经济学', scenario: 'GDP预测', description: '经济学家用ARIMA(2,1,2)模型预测季度GDP增长率。差分去除趋势，AR和MA项捕捉经济周期的自相关。' },
      { industry: '金融', scenario: '汇率预测', description: '银行用ARIMA模型预测短期汇率波动，结合基本面分析制定交易策略。模型可提供置信区间评估风险。' },
      { industry: '能源', scenario: '电力负荷预测', description: '电网公司用SARIMA（季节性ARIMA）预测每小时电力需求，兼顾日内模式和季节性，优化发电调度。' }
    ],
    pros: [
      { title: '理论严谨', description: '有完整的统计理论支撑，可进行假设检验和区间估计' },
      { title: '灵活强大', description: '通过调整(p,d,q)可适应多种时间序列模式' },
      { title: '可解释性强', description: '参数有明确含义，可分析序列的内在机制' },
      { title: '基础地位', description: '是许多现代方法（如GARCH、VAR）的基础' }
    ],
    cons: [
      { title: '定阶困难', description: '选择合适的p、d、q需要经验和反复试验' },
      { title: '仅限线性', description: '无法捕捉非线性关系和复杂交互' },
      { title: '数据要求高', description: '需要大量连续数据，不能有缺失值' },
      { title: '计算复杂', description: '参数估计和诊断过程相对繁琐' }
    ],
    bestPractices: ['先绘制时序图和ACF/PACF图，理解数据特征', '使用auto.arima或类似工具自动选择最优阶数', '始终检查残差，确保无剩余模式', '对比多个候选模型，选择AIC/BIC最小的', '预测时给出置信区间，量化不确定性', '定期用新数据重新拟合，模型会"老化"'],
    performance: {
      speed: { level: 'medium', description: '参数估计较慢，预测较快' },
      accuracy: { level: 'medium', description: '线性平稳数据优秀，非线性数据一般' },
      dataRequirement: { level: 'high', description: '需要至少50-100个观测点' },
      complexity: { level: 'high', description: '需要统计学知识，实施复杂' }
    }
  },
  {
    id: 'lstm',
    name: 'LSTM神经网络',
    shortName: 'LSTM',
    icon: BrainCircuit,
    category: '深度学习方法',
    summary: 'LSTM（长短期记忆网络）是一种特殊的循环神经网络，通过精巧的门控机制解决了传统RNN的梯度消失问题，能够学习长期依赖和复杂非线性模式。',
    principle: {
      description: 'LSTM的核心是"记忆细胞"和三个门结构。遗忘门决定丢弃哪些旧信息，输入门决定存储哪些新信息，输出门决定输出什么。通过这种机制，LSTM能够选择性地记住重要信息，忘记无关信息，从而在长序列中保持有效的信息传递。',
      keyIdea: '用可学习的门控机制，让神经网络自主决定记住什么、忘记什么，突破传统方法的线性和短期限制。'
    },
    mathematics: {
      description: 'LSTM的核心方程组（简化版）：',
      formula: 'f(t)=σ(W_f·[h(t-1),x(t)])\ni(t)=σ(W_i·[h(t-1),x(t)])\nC(t)=f(t)*C(t-1)+i(t)*tanh(W_C·[h(t-1),x(t)])',
      variables: [
        { symbol: 'f(t)', meaning: '遗忘门激活值' },
        { symbol: 'i(t)', meaning: '输入门激活值' },
        { symbol: 'C(t)', meaning: '细胞状态（记忆）' },
        { symbol: 'h(t)', meaning: '隐藏状态（输出）' },
        { symbol: 'σ', meaning: 'sigmoid函数' }
      ],
      example: '每个时间步，LSTM会根据当前输入和上一步状态，动态调整记忆内容。例如预测销量时，可能记住去年同期数据，忘记无关的短期噪声。'
    },
    workflow: {
      steps: [
        { title: '数据准备', description: '将时间序列转为监督学习格式，创建滑动窗口。标准化数据到相同尺度。', tip: '窗口大小（lookback）是关键超参数' },
        { title: '网络设计', description: '确定LSTM层数、每层单元数、dropout率等架构参数。', tip: '从简单开始（1-2层），逐步增加复杂度' },
        { title: '模型训练', description: '用反向传播和优化器（如Adam）最小化损失函数。通常需要多个epoch。', tip: '使用早停法防止过拟合，监控验证集损失' },
        { title: '超参数调优', description: '调整学习率、批次大小、LSTM单元数等，找到最优配置。', tip: '使用网格搜索或贝叶斯优化' },
        { title: '预测', description: '用训练好的模型进行单步或多步预测。', tip: '多步预测可用递归或直接多输出方式' }
      ]
    },
    parameters: [
      { name: 'LSTM单元数', description: '每层LSTM的隐藏单元数量', impact: '越多模型容量越大，但易过拟合且计算慢', typical: '32-256，视数据复杂度而定' },
      { name: 'lookback窗口', description: '用多少个历史时间步预测下一步', impact: '太小捕捉不到长期模式，太大训练样本减少且易过拟合', typical: '10-60个时间步，取决于数据周期' },
      { name: 'dropout率', description: '训练时随机丢弃神经元的比例，用于正则化', impact: '太低易过拟合，太高欠拟合', typical: '0.2-0.5' },
      { name: '学习率', description: '优化器的步长大小', impact: '太大不收敛，太小训练慢', typical: '0.001-0.01，常用Adam自适应调整' }
    ],
    suitability: {
      suitable: ['数据有复杂非线性关系', '存在长期依赖（几十步以上）', '数据量充足（几千个样本以上）', '传统方法效果不佳', '有GPU等计算资源'],
      notSuitable: ['数据量很小（<500个点）', '数据是简单线性关系', '需要强可解释性', '计算资源有限', '需要快速迭代和调整']
    },
    useCases: [
      { industry: '金融', scenario: '股票价格预测', description: '对冲基金用多层LSTM学习股价的非线性动态，结合技术指标和市场情绪，捕捉复杂的市场规律。lookback=60天。' },
      { industry: '能源', scenario: '风电功率预测', description: '风电场用LSTM预测未来24小时发电功率。模型学习风速、温度、历史功率的复杂交互，准确率超过传统方法15%。' },
      { industry: '互联网', scenario: '用户行为预测', description: '电商用LSTM预测用户未来7天购买概率。模型处理用户浏览、搜索、购买等长序列行为，个性化推荐。' }
    ],
    pros: [
      { title: '强大表达力', description: '可学习任意复杂的非线性时序模式' },
      { title: '长期记忆', description: '有效处理长期依赖，突破传统方法限制' },
      { title: '自动特征', description: '无需手动特征工程，自动学习有用表示' },
      { title: '多变量支持', description: '容易扩展为多变量时间序列预测' }
    ],
    cons: [
      { title: '数据饥渴', description: '需要大量数据才能充分训练，小样本易过拟合' },
      { title: '黑箱特性', description: '难以解释模型决策，不知道为何做出预测' },
      { title: '计算昂贵', description: '训练慢，需要GPU加速，推理也比统计方法慢' },
      { title: '调参困难', description: '超参数多，需要大量实验找到最优配置' }
    ],
    bestPractices: ['数据量不足时考虑数据增强或迁移学习', '始终划分训练/验证/测试集，避免数据泄露', '标准化输入数据，预测后记得反标准化', '使用early stopping和checkpoint保存最佳模型', '尝试双向LSTM或attention机制提升性能', '与传统方法对比，确保复杂度带来实际收益', '监控训练曲线，识别过拟合和欠拟合'],
    performance: {
      speed: { level: 'low', description: '训练很慢，推理中等' },
      accuracy: { level: 'high', description: '复杂非线性数据表现优秀' },
      dataRequirement: { level: 'high', description: '需要数千个样本才能有效' },
      complexity: { level: 'high', description: '实现复杂，需要深度学习知识' }
    }
  }
];

type View = 'introduction' | 'selection';

const ModelIntroductionFlow: React.FC = () => {
  const navigate = useNavigate();
  const { updateState } = useExperiment();
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [view, setView] = useState<View>('introduction');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentModelIndex]);

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
        await updateState({ selected_base_models: selectedModels });
        navigate('/model/model-select');
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
      setCurrentModelIndex(baseModels.length - 1);
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
            <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0">
              <Icon className="w-9 h-9 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-bold text-gray-900">{activeModel.name}</h3>
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
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer"
        >
          {isLastModel ? '选择基础模型' : '下一个模型'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  const renderSelectionView = () => (
    <>
      <div className="flex-1">
        <h3 className="text-3xl font-bold text-gray-900 mb-4">选择基础模型</h3>
        <p className="text-gray-600 mb-6">请选择至少两个基础模型进行后续的训练和对比。</p>
        <div className="grid grid-cols-1 gap-4">
          {baseModels.map(model => {
            const isSelected = selectedModels.includes(model.id);
            const ModelIcon = model.icon;
            return (
              <div
                key={model.id}
                onClick={() => handleModelToggle(model.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-blue-400'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ModelIcon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>{model.name}</span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
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
    <div className="flex flex-col h-full p-4 bg-gray-50">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">
          {view === 'introduction' ? '基础模型介绍' : '基础模型选择'}
        </h2>
        {view === 'introduction' && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
              {baseModels.map((model, index) => {
                const isCompleted = index < currentModelIndex;
                const isActive = index === currentModelIndex;
                return (
                  <React.Fragment key={model.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-blue-500' : isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`text-xs font-bold text-white`}>
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

export default ModelIntroductionFlow;