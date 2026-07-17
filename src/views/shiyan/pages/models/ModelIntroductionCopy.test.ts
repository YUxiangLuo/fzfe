/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const baseCopy = readFileSync(new URL('./ModelIntroductionFlow.tsx', import.meta.url), 'utf8');
const ensembleCopy = readFileSync(new URL('./EnsembleModelIntroductionFlow.tsx', import.meta.url), 'utf8');
const weightedIntroCopy = readFileSync(new URL('./WeightedEnsemble/Intro.tsx', import.meta.url), 'utf8');
const boostingIntroCopy = readFileSync(new URL('./BoostingEnsemble/Intro.tsx', import.meta.url), 'utf8');
const boostingResultsCopy = readFileSync(new URL('./BoostingEnsemble/Results.tsx', import.meta.url), 'utf8');
const stackingIntroCopy = readFileSync(new URL('./StackingEnsemble/Intro.tsx', import.meta.url), 'utf8');
const esIntroCopy = readFileSync(new URL('./ExponentialSmoothing/Intro.tsx', import.meta.url), 'utf8');
const lstmIndexCopy = readFileSync(new URL('./LSTM/index.tsx', import.meta.url), 'utf8');
const lstmBuildCopy = readFileSync(new URL('./LSTM/Build.tsx', import.meta.url), 'utf8');
const scenarioCopy = readFileSync(new URL('./ScenarioIntroduction.tsx', import.meta.url), 'utf8');
const resultEvaluationCopy = readFileSync(new URL('../ResultEvaluation.tsx', import.meta.url), 'utf8');

describe('model introduction teaching copy', () => {
  it('describes MA and SES without off-by-one or level/forecast ambiguity', () => {
    expect(baseCopy).toContain('积累满n个实际观测后');
    expect(baseCopy).toContain('在同一时间顺序回测或留出区间比较多个n值');
    expect(baseCopy).toContain('固定窗口移动平均对窗口内最近n期等权');
    expect(baseCopy).toContain('看到X(t)后估计的t时刻水平，用于预测下一期及以后');
    expect(baseCopy).toContain("title: '结构表达有限'");
    expect(baseCopy).not.toContain("scenario: '促销销量预测'");
    expect(baseCopy).not.toContain("scenario: '股票价格技术分析'");
    const alphaSelectionPosition = esIntroCopy.indexOf('由用户给定平滑系数 α');
    const initialLevelPosition = esIntroCopy.indexOf('固定用户 α，用训练数据估计一次指数平滑的初始水平');
    expect(alphaSelectionPosition).toBeGreaterThan(-1);
    expect(initialLevelPosition).toBeGreaterThan(-1);
    expect(alphaSelectionPosition).toBeLessThan(initialLevelPosition);
  });

  it('states the ARIMA and LSTM feasibility limits precisely', () => {
    expect(baseCopy).toContain('白噪声虽可表示为ARIMA(0,0,0)，但没有可利用的预测结构');
    expect(baseCopy).toContain("title: '远期不确定性', description: 'd=0的平稳模型区间通常趋于有限宽度；d≥1时预测区间会继续随步长增长'");
    expect(baseCopy).not.toContain('均值回归特性');
    expect(baseCopy).toContain("name: '附加输入特征（用户选择）'");
    expect(baseCopy).toContain("name: '数值缩放方式（用户选择）'");
    expect(baseCopy).toContain('系统不预选默认值');
    expect(baseCopy).toContain('4个监督窗口');
    expect(baseCopy).toContain('则直接拒绝训练');
    expect(lstmIndexCopy).toContain("name: '选择历史输入特征'");
    expect(lstmBuildCopy).toContain('LSTM 法 - 选择历史输入特征');
    expect(lstmBuildCopy).not.toContain('LSTM 法 - 构建LSTM模型');
    expect(baseCopy).toContain('从训练截止点一次输出完整评估跨度的多期销量');
    expect(baseCopy).not.toContain('面向评估区间直接输出未来多期销量');
    expect(baseCopy).toContain("{ symbol: 'σ'");
    expect(baseCopy).toContain("{ symbol: 'B'");
  });

  it('matches weighted, boosting, and stacking copy to the implemented protocols', () => {
    expect(ensembleCopy).toContain('向等权组合收缩');
    expect(ensembleCopy).not.toContain('>0.8');
    expect(ensembleCopy).toContain('第一阶段遍历全部候选');
    expect(ensembleCopy).not.toContain('随时加入');
    expect(ensembleCopy).toContain("title: '贪心路径依赖'");
    expect(ensembleCopy).toContain('差分后序列的线性自相关');
    expect(ensembleCopy).toContain('LSTM始终不接收已知未来特征');
    expect(ensembleCopy).toContain('第一阶段可复用配置和训练区间匹配的已完成基础模型');
    expect(ensembleCopy).toContain('所有阶段都保留时间留出验证选出的系数');
    expect(boostingIntroCopy).toContain('首阶段优先复用匹配的已完成基础模型');
    expect(boostingIntroCopy).toContain('部署阶段系数始终保持为时间验证段的线搜索结果');
    expect(boostingResultsCopy).toContain('首阶段可能复用匹配的已完成基础模型');
    expect(weightedIntroCopy).toContain('LSTM 不接收任何已知未来特征');
    expect(weightedIntroCopy).toContain('不是经过统计估计的可靠度');
    expect(weightedIntroCopy).toContain('明确标记为未校准、无覆盖率保证');
    expect(ensembleCopy).toContain('不是经过统计估计的可靠度');
    expect(stackingIntroCopy).toContain('LSTM 不接收任何已知未来特征');
    for (const copy of [ensembleCopy, weightedIntroCopy, boostingIntroCopy, stackingIntroCopy]) {
      expect(copy).not.toContain('最多三折');
      expect(copy).not.toContain('OOF');
      expect(copy).not.toContain('滚动折');
    }
    expect(ensembleCopy).toContain('数据量少时优先使用加权平均');
    expect(ensembleCopy).not.toContain('房价预测');
    expect(ensembleCopy).toContain("{ symbol: 'ρ'");
    expect(weightedIntroCopy).toContain('随目标数据尺度调整的数值稳定项');
    for (const copy of [ensembleCopy, boostingIntroCopy, boostingResultsCopy]) {
      expect(copy).not.toContain('逐级重训');
      expect(copy).not.toContain('重新计算非负阶段系数');
    }
  });

  it('uses accurate, accessible scenario teaching copy instead of stale image text', () => {
    expect(scenarioCopy).toContain('训练区间与独立评估区间都来自历史数据');
    expect(scenarioCopy).toContain('先完成至少两个基础模型，再训练融合模型');
    expect(scenarioCopy).toContain('不存在对所有数据都“最佳”的模型');
    expect(scenarioCopy).not.toContain('/images/model');
    expect(scenarioCopy).not.toContain('Autoplay');
    expect(resultEvaluationCopy).toContain('方案选择准则');
    expect(resultEvaluationCopy).toContain('选择当前方案');
    expect(resultEvaluationCopy).not.toContain('勾选出最佳方法');
  });
});
