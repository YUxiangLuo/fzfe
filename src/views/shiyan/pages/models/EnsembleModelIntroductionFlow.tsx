import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import { toastEventBus } from '../../utils/toastEventBus';
import { normalizeEnsembleModelSelection } from '../../utils/modelCatalog';
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

// Corrected and verified ensemble models data
const ensembleModels: EnsembleModel[] = [
  {
    id: 'weighted_ensemble',
    name: '加权平均融合',
    shortName: 'Weighted',
    icon: Scale,
    category: '模型融合方法',
    summary: '加权平均融合用基础模型在内部时间验证段的残差MSE倒数形成候选权重，再按验证样本可靠度向等权组合收缩；最终预测是成员预测的固定加权和。',
    principle: {
      description: '加权平均的核心思想是根据同一内部时间验证段上的误差分配成员贡献。验证残差MSE较小的成员通常获得更高的候选权重，最终权重还会向等权组合收缩；组合是否优于单模型必须由独立评估确认。',
      keyIdea: '用数据驱动的方式自动确定各模型的重要性，而非简单平均或主观判断。本系统使用验证集残差均方误差的倒数加权。'
    },
    implementationNotes: [
      '教科书组合预测常用逆方差或误差方差-协方差思想分配权重，核心思想是误差越稳定、越小的模型权重越高。',
      '本系统按模型数、样本量和成员可训练条件动态留出时间末段，计算每个成员的验证残差MSE。',
      '先按带数据尺度ε的MSE倒数归一化，再按验证点数可靠度向等权组合收缩，降低短验证段产生极端权重的风险。',
      '内部验证只继承MA窗口、ES α、ARIMA d和LSTM历史特征/数值缩放方式；ARIMA阶数与LSTM隐藏参数按当前前缀重新推导，LSTM始终不接收已知未来特征。',
      '权重非负且和为1，但本实现不估计成员误差协方差，因此不是完整的最小方差组合。',
      '不确定性只用内部权重验证段的组合残差校准，并继承成员逐horizon的增长形状；独立评估真实值不参与校准，证据不足时明确标记fallback。'
    ],
    mathematics: {
      description: '验证残差MSE倒数加权的计算公式：',
      formula: 'MSE_i = (1/n)Σ(y_t - ŷ_{i,t})²\nv_i = [1/(MSE_i + ε)] / Σ[1/(MSE_j + ε)]\nw_i = ρv_i + (1-ρ)/K, ρ=n/(n+K+1)\nŷ = Σ(w_i · ŷ_i)',
      variables: [
        { symbol: 'w_i', meaning: '模型i的权重' },
        { symbol: 'v_i', meaning: '模型i按验证残差MSE倒数归一化得到的候选权重' },
        { symbol: 'MSE_i', meaning: '模型i在验证集上的残差均方误差' },
        { symbol: 'ε', meaning: '随目标数据尺度调整的数值稳定项，避免MSE接近0时倒数溢出' },
        { symbol: 'ρ', meaning: '验证权重可靠度；验证点越多，候选权重占比越高' },
        { symbol: 'n', meaning: '内部时间验证段的样本数' },
        { symbol: 'K', meaning: '参与融合的基础模型数量' },
        { symbol: 'ŷ_i', meaning: '模型i的预测值' },
        { symbol: 'ŷ', meaning: '最终融合预测值' }
      ],
      example: '假设3个模型验证残差MSE为100、200、400，倒数归一化的候选权重约为0.57、0.29、0.14；最终还会按验证点数向等权重0.33、0.33、0.33收缩。'
    },
    workflow: {
      steps: [
        { title: '训练基础模型', description: '分别训练多个不同的基础模型（如MA、ES、ARIMA、LSTM）。', tip: '结构差异可能带来互补误差，但增加模型不保证改善留出误差' },
        { title: '验证集评估', description: '每个模型仅在动态前缀训练，再预测时间末段并计算MSE。', tip: '拆分必须同时满足所有成员的最小训练条件' },
        { title: '计算权重', description: '先计算误差倒数候选权重，再按验证样本可靠度向等权收缩。', tip: '最终权重之和为1' },
        { title: '加权平均融合', description: '先截断成员销量预测，再按固定权重求和，最终组合结果也做非负兜底。', tip: '截断后的同一结果用于输出、残差和指标' }
      ]
    },
    parameters: [{ name: '验证集划分（系统动态）', description: '用于计算权重的时间顺序留出段', impact: '系统综合模型数、样本量和所有成员的可训练性决定；当前训练页不开放手动设置', typical: '期望约20%，必要时为成员可训练性缩减' }],
    suitability: {
      suitable: ['有多个基础模型可用', '基础模型性能有差异', '追求稳健性和鲁棒性', '需要可解释的融合方法', '计算资源有限'],
      notSuitable: ['只有一个基础模型', '所有模型高度相关（预测几乎相同）', '需要捕捉模型间复杂交互', '验证集数据不足', '基础模型都表现很差']
    },
    useCases: [
      { industry: '零售', scenario: '销量预测融合', description: '超市综合MA、ES、ARIMA三个模型预测周销量。验证误差较小的成员获得较高权重；是否降低独立评估RMSE仍需以结果为准。' },
      { industry: '气象', scenario: '多模式天气预报', description: '气象台可根据多个数值预报模型的历史误差倒数做本地化组合；组合是否优于最佳单一模型仍需独立检验。' }
    ],
    pros: [
      { title: '融合计算轻量', description: '权重确定后预测计算快速；训练阶段仍会进行时间顺序验证评估，并可能复用或重训基础模型' },
      { title: '直观可解释', description: '权重有明确含义，可理解各模型贡献' },
      { title: '分散模型风险', description: '成员误差不完全同步时可能比依赖单一模型更稳定' },
      { title: '误差驱动', description: '权重直接来自验证集预测误差，便于解释和复核' }
    ],
    cons: [
      { title: '线性限制', description: '只是简单加权，无法学习模型间非线性关系' },
      { title: '静态权重', description: '权重固定，无法适应数据分布变化' },
      { title: '依赖验证集', description: '验证集不代表未来时权重可能失效' },
      { title: '提升有限', description: '当基础模型已很好或很差时，改进空间小' }
    ],
    bestPractices: ['选择差异化的基础模型，避免高度相关', '验证集应代表未来数据分布', '定期用新数据重新计算权重', '权重明显集中于单一成员时，检查验证样本是否充分及成员误差是否稳定', '对比简单平均，确认加权是否确实带来提升', '当前系统已向等权收缩，仍需结合独立评估解释权重'],
    performance: {
      speed: { level: 'high', description: '融合预测极快；训练阶段需要一次内部验证评估' },
      accuracy: { level: 'medium', description: '有互补成员和代表性验证段时可能改进，不保证优于最佳单模型' },
      dataRequirement: { level: 'medium', description: '需要足够验证集评估误差' },
      complexity: { level: 'low', description: '实现和理解都很简单' }
    }
  },
  {
    id: 'boosting_ensemble',
    name: 'Boosting融合',
    shortName: 'Boosting',
    icon: Sparkles,
    category: '模型融合方法',
    summary: 'Boosting通过串行叠加学习器修正已有模型。本系统实现平方误差下的异构残差提升近似：每轮让MA、ES、ARIMA、LSTM候选拟合当前残差，只有验证RMSE改善时才加入模型链。',
    principle: {
      description: 'Boosting的核心是“从错误中学习”。传统AdaBoost通过调整样本权重来关注错误，但ARIMA等时序模型通常不支持样本权重。因此，本系统采用基于残差的贪心Boosting：第一阶段遍历全部候选，让它们拟合原始销量并按验证RMSE选出优胜者；后续阶段继续遍历候选拟合当前残差，选择达到改善门槛的模型加入链条。',
      keyIdea: '贪心策略 + 残差学习。每一步都在当前候选和同一验证段上选择局部最优的异构模型来修正已有误差。'
    },
    implementationNotes: [
      '教科书 Boosting 的核心是串行叠加弱学习器，使后续学习器修正前序误差。',
      '梯度提升在平方误差损失下等价于逐步拟合残差；本系统借鉴这一思想，但候选学习器是 MA、ES、ARIMA、LSTM 等时间序列模型。',
      'AdaBoost 使用样本权重实现错误关注；本系统的基础模型不支持样本权重，因此采用残差学习的加法模型。',
      '每一轮会在全部候选模型中选择最能降低同一时间留出段残差RMSE的模型；同一种候选类型可在不同轮次重复入选。',
      '候选只沿用用户选择的单模型配置；ARIMA阶数和LSTM隐藏参数针对当前训练目标与数据段重新推导，LSTM始终不接收已知未来特征。',
      '更新训练段残差时，MA尚未凑满完整窗口、LSTM尚未凑满look_back等没有样本内拟合值的开头位置按零修正处理，即保持原残差；不会临时改用短窗口或未来值。',
      '每个候选通过非负平方损失线搜索求阶段系数；短验证段要求至少5%相对改善，其余要求1%。',
      '最大轮数为min(2K,验证点数-1)。选定链随后准备完整训练区间的部署产物：第一阶段可复用配置和训练区间匹配的已完成基础模型，必要时重新拟合；后续阶段按当前完整训练残差拟合。所有阶段都保留时间留出验证选出的系数。',
      '不确定性只用内部时间验证段的组合残差校准各阶段逐horizon增长形状；独立评估真实值不参与校准。'
    ],
    mathematics: {
      description: '基于残差学习的加法模型公式：',
      formula: 'F_m(x) = F_{m-1}(x) + γ_m h_m(x)\nγ_m = max(0, ⟨r_m,h_m⟩/⟨h_m,h_m⟩)\nh_m = argmin_h RMSE(r_m - γ_m h)',
      variables: [
        { symbol: 'F_m(x)', meaning: '第m轮后的最终预测值' },
        { symbol: 'h_m(x)', meaning: '本轮贪心选出的最佳模型' },
        { symbol: 'γ_m', meaning: '第m阶段由数据线搜索得到的非负系数' },
        { symbol: 'argmin', meaning: '从候选模型库中选择误差最小的' }
      ],
      example: '若当前残差r与候选输出h的内积为40、h平方和为100，则γ=max(0,40/100)=0.4。'
    },
    workflow: {
      steps: [
        { title: '初始预测', description: '让全部候选拟合原始销量，为每个候选动态求非负系数，再按验证RMSE选出第一阶段。', tip: '第一阶段也不固定系数' },
        { title: '计算残差', description: '计算当前组合模型的预测误差（真实值 - 预测值）。', tip: '残差代表了目前模型还无法解释的部分' },
        { title: '贪心选择', description: '遍历所有候选模型（MA, ARIMA, LSTM等），分别训练它们去拟合当前残差，并记录效果。', tip: '这是"贪心"策略的核心：每轮都试错' },
        { title: '择优集成', description: '选出本轮验证残差RMSE最低且达到相对改善阈值的模型。', tip: '同一种模型类型可重复入选；局部改善不保证独立评估也改善' },
        { title: '循环迭代', description: '重复上述步骤，直到达到最大轮数或验证误差不再降低。', tip: '系统构建贪心模型链，不保证全局或未来最优' }
      ]
    },
    parameters: [
      { name: '最大迭代轮数（系统动态）', description: '最多串联多少个阶段', impact: '由候选模型数与内部验证点数共同限制，并支持提前停止。', typical: 'min(2×候选数, 验证点数-1)' },
      { name: '阶段系数 γ（系统动态）', description: '每个新模型修正误差的非负幅度', impact: '对每个候选按当前验证残差执行一维平方损失线搜索。', typical: 'max(0,⟨r,h⟩/⟨h,h⟩)' },
      { name: '候选模型库', description: '参与Boosting的基础模型类型', impact: '不同结构只有在能提供额外残差信号时才形成互补；用户在训练页选择已完成的基础模型作为候选库。', typical: 'ARIMA, LSTM, MA, ES 中至少选择两个' }
    ],
    suitability: {
      suitable: ['数据模式复杂，单一模型难以完全捕捉', '追求比单一模型更高的精度', '不同模型之间存在互补性（如线性+非线性）', '可以接受较长的训练时间'],
      notSuitable: ['数据信噪比极低（全是噪声）', '时间序列极短，无法支持多次残差拟合', '需要极快的实时响应', '模型库单一，无法发挥异构优势']
    },
    useCases: [
      { industry: '金融', scenario: '波动序列实验', description: '可先用ARIMA刻画线性自相关，再尝试LSTM拟合遗留的非线性残差；金融序列噪声很强，组合不保证显著提升。' },
      { industry: '零售', scenario: '复杂销量预测', description: '可先用ES或ARIMA刻画基础结构，再检验LSTM能否从截止点前的历史特征中拟合剩余误差；当前实现不读取未来促销计划。' },
      { industry: '能源', scenario: '电力负荷预测', description: '若历史数据包含天气字段，可检验LSTM是否学到历史天气关联；当前实现不能注入未来天气轨迹，因此不支持天气情景预测。' }
    ],
    pros: [
      { title: '异构互补', description: '能结合线性、非线性等不同模型的长处' },
      { title: '误差修正', description: '按当前残差逐阶段增加不同结构，提供超越单一模型的可能性' },
      { title: '逐轮选择', description: '每轮按内部验证误差贪心选择当前候选，不保证得到全局或未来最优模型链' },
      { title: '概念上可扩展', description: '可设计新的候选类型，但必须先适配训练协议、产物格式和残差目标' }
    ],
    cons: [
      { title: '易过拟合', description: '如果对噪声也强行拟合，会导致泛化能力下降' },
      { title: '训练耗时', description: '串行训练，且每轮都要评估多个候选模型' },
      { title: '贪心路径依赖', description: '每轮只按当前候选和同一验证段选择局部优胜者，早期选择会影响后续模型链' },
      { title: '验证选择敏感', description: '模型链、动态系数和轮数依赖同一时间验证段，短数据时仍可能过拟合' }
    ],
    bestPractices: ['基模型应包含多种类型（如ARIMA+LSTM）以实现优势互补', '查看每轮动态系数与相对改善，警惕系数极端或改善仅略过阈值', '关注验证集误差，系统会在没有候选模型充分改善时提前停止', '对于噪声很大的数据，优先选择少量互补模型，避免候选库过杂'],
    performance: {
      speed: { level: 'low', description: '串行且每轮需训练多个候选模型，速度较慢' },
      accuracy: { level: 'medium-high', description: '异构残差信号有效时可能提升；短验证段与噪声也可能导致退化' },
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
    summary: 'Stacking（堆叠法）构建多层学习架构：第一层多个异构模型各自预测，第二层用时间顺序 Hold-out 预测拟合无截距非负最小二乘（NNLS）元模型。',
    principle: {
      description: 'Stacking的哲学是“让模型教模型”。不同模型有不同的视角和偏好——ARIMA刻画差分后序列的线性自相关，趋势可通过差分或漂移项表达；LSTM则可表示非线性时序关系。Stacking训练元模型组合这些输出，并用基础模型对后段留出数据的预测保持时间因果顺序。',
      keyIdea: '用机器学习的方式学习如何做机器学习融合。本系统自动划分Level-0和Level-1时间段，让元模型基于未参与基础模型训练的预测来学习组合权重。'
    },
    implementationNotes: [
      '常见 Stacking 实现会用交叉验证预测训练元模型；时间序列数据不能随意打乱做普通K折。',
      '本系统按时间顺序划分 Level-0 和 Level-1：基础模型在前段训练，对后段预测，元模型再学习组合。',
      'Level-0只继承MA窗口、ES α、ARIMA d和LSTM历史特征/数值缩放方式；ARIMA阶数与LSTM隐藏配置按当前前缀重算，LSTM始终不接收已知未来特征。',
      '元模型直接求解非负、无截距最小二乘；系数不强制归一化，因此不是凸组合约束。',
      'Level-1至少需要基础模型数+2个点；不足时明确拒绝训练，不以inverse-MAE冒充Stacking。',
      '成员和最终销量预测做非负兜底；不确定性只用Level-1组合残差校准成员逐horizon增长形状，独立评估真实值不参与校准。'
    ],
    mathematics: {
      description: '两层堆叠结构（Meta-Model采用非负线性权重）：',
      formula: '第一层: z_i = M_i(X)  (i=1...K)\n第二层: β = argmin_{β≥0} ||Zβ-y||₂\n预测: ŷ = Zβ',
      variables: [
        { symbol: 'M_{i}', meaning: '第i个基础模型（MA, ARIMA, LSTM等）' },
        { symbol: 'z_{i}', meaning: '基础模型的预测输出（作为第二层的特征）' },
        { symbol: 'β_i', meaning: 'NNLS元模型学到的非负系数，不要求总和为1' },
        { symbol: 'Z', meaning: 'Level-1上的基础模型预测矩阵' }
      ],
      example: '若 NNLS 学到 ARIMA 系数0.2、LSTM系数0.8，则对100和110的预测组合为108；其他数据上系数总和也可能不等于1。'
    },
    workflow: {
      steps: [
        { title: '数据划分', description: '按时间顺序动态划分Level-0和Level-1，且Level-1至少为K+2个点。', tip: '不足时明确拒绝训练' },
        { title: 'Level-1预测', description: '用Level-0数据训练所有基础模型，并让它们对Level-1数据进行预测。', tip: '这些预测值构成了元模型的训练特征' },
        { title: '训练元模型', description: '以Level-1真实值为目标求解非负无截距最小二乘。', tip: '保留原始系数，不归一化也不回退另一算法' },
        { title: '完整训练区间预测', description: '重训或复用基础模型，截断成员销量后由元模型组合，最终结果再做非负兜底。', tip: '元模型权重保持由Level-1阶段学得的固定值' }
      ]
    },
    parameters: [
      { name: '基础模型组合', description: '选择参与第一层的异构模型', impact: '统计与深度学习模型可能提供互补信号，但无新增信息的模型也可能使小样本权重更不稳定', typical: '至少选择两个，并以留出结果检验是否互补' },
      { name: '元模型类型', description: '第二层融合模型的算法', impact: '本系统固定使用非负无截距最小二乘，系数无需和为1', typical: 'scipy.optimize.nnls' },
      { name: '动态划分', description: 'Level-0/Level-1的时间分割点', impact: 'Level-1至少为成员数+2个点，同时必须保留所有成员可训练的Level-0', typical: '目标为max(K+2, ceil(20%N))；若Level-0不可训练则逐步缩小Level-1，但不低于K+2' }
    ],
    suitability: {
      suitable: ['希望学习二层融合并检验精度潜力', '有多个表现不错但风格不同的基础模型', '数据量充足（支持时间留出）', '有充足计算资源'],
      notSuitable: ['数据量不足以同时保留Level-0和至少K+2个Level-1点', '只有一个基础模型', '基础模型预测结果高度相关', '需要快速训练']
    },
    useCases: [
      { industry: '零售', scenario: '多模型销量融合', description: '让统计模型和LSTM在Level-0训练，再用它们对后续Level-1销量的预测学习固定非负系数；是否改善仍以独立评估区间为准。' },
      { industry: '工业', scenario: '传感器融合', description: '融合不同传感器所训练模型的预测；当前NNLS学习一组固定系数，若工况改变，需要用新数据重新训练才能更新系数。' },
      { industry: '量化交易', scenario: '多因子策略', description: '可用时间顺序Level-1数据学习动量与价值模型的固定组合系数；当前实现不会在预测时识别市场风格并自动切换权重。' }
    ],
    pros: [
      { title: '精度潜力', description: '在基础模型互补且验证集充足时可能提高精度，但仍需独立评估确认' },
      { title: '纠错能力', description: '元模型能学会忽略某些表现糟糕的模型' },
      { title: '时间顺序留出', description: 'Level-1不参与基础模型训练，可降低直接复用训练拟合值造成的泄漏' },
      { title: '数据驱动权重', description: '权重由Level-1误差学习，但是否优于人工或简单平均仍需独立评估' }
    ],
    cons: [
      { title: '数据饥渴', description: '需要额外的数据进行Hold-out划分，小数据不友好' },
      { title: '计算昂贵', description: '需要部分区间训练与完整区间预测；匹配产物可复用，否则会再次训练成员' },
      { title: '黑箱属性', description: '虽然使用了线性回归，但双层结构仍增加了解释难度' },
      { title: '工程复杂', description: '涉及复杂的数据流转和多次模型IO' }
    ],
    bestPractices: ['优先选择原理差异较大的模型（如MA与LSTM），并用留出结果确认是否互补', '数据量少时优先使用加权平均；仅在Level-0可训练且Level-1至少保留K+2个点时比较Stacking', '若某成员系数为0，只能说明它在当前Level-1的非负线性组合中未获得正系数', '系统只继承MA窗口、ES α、ARIMA d与LSTM历史特征/数值缩放方式；ARIMA阶数和LSTM隐藏配置会在内部训练段重算，LSTM不接收已知未来特征。基础配置变化后应重新训练融合模型'],
    performance: {
      speed: { level: 'low', description: '需要两层流程和多次成员调用，通常明显慢于单模型' },
      accuracy: { level: 'medium-high', description: '互补成员与充足Level-1样本下有潜力，不保证高于其他融合方法' },
      dataRequirement: { level: 'high', description: '需要足够数据进行切分' },
      complexity: { level: 'high', description: '涉及两层时间拆分、多次成员训练和元模型拟合，工程复杂度较高' }
    }
  }
];

type View = 'introduction' | 'selection';

const EnsembleModelIntroductionFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState } = useExperiment();
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [view, setView] = useState<View>('introduction');
  const [selectedModels, setSelectedModels] = useState<string[]>(() =>
    normalizeEnsembleModelSelection(state.selected_ensemble_models),
  );
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

  useEffect(() => {
    setSelectedModels(normalizeEnsembleModelSelection(state.selected_ensemble_models));
  }, [state.selected_ensemble_models]);

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
        try {
          await updateState({ selected_ensemble_models: normalizeEnsembleModelSelection(selectedModels) }, { forceSync: true, throwOnSyncError: true });
          navigate('/model/ensemble-select');
        } catch (error) {
          console.error('保存融合模型选择失败:', error);
          toastEventBus.error('保存融合模型选择失败，请稍后重试');
        }
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
      normalizeEnsembleModelSelection(
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
          <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-100 to-fuchsia-100 flex-shrink-0">
            <Icon className="w-8 h-8 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-2xl font-bold text-gray-900">{activeModel.name}</h3>
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
            以下是算法结构的定性比较，不是当前数据集上的实测排名；融合效果仍需用相同独立评估区间验证。
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
    <div className="flex flex-col h-full bg-gray-50 pt-2">
      {/* Compact Header */}
      <div className="mb-3 flex-shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <h2 className="shrink-0 text-xl font-bold text-gray-800">
              {view === 'introduction' ? '融合模型介绍' : '融合模型选择'}
            </h2>
            {view === 'introduction' && (
              <div className="flex min-w-0 flex-1 items-center gap-x-3 gap-y-2 overflow-x-auto">
                {ensembleModels.map((model, index) => {
                  const isCompleted = index < currentModelIndex;
                  const isActive = index === currentModelIndex;
                  return (
                    <React.Fragment key={model.id}>
                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-purple-500' : isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className="text-xs font-bold text-white">
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
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-fuchsia-700"
              >
                {isLastModel ? '选择融合模型' : '下一个模型'}
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

export default EnsembleModelIntroductionFlow;
