/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const baseCopy = readFileSync(new URL('./ModelIntroductionFlow.tsx', import.meta.url), 'utf8');
const ensembleCopy = readFileSync(new URL('./EnsembleModelIntroductionFlow.tsx', import.meta.url), 'utf8');
const weightedIntroCopy = readFileSync(new URL('./WeightedEnsemble/Intro.tsx', import.meta.url), 'utf8');
const boostingIntroCopy = readFileSync(new URL('./BoostingEnsemble/Intro.tsx', import.meta.url), 'utf8');
const stackingIntroCopy = readFileSync(new URL('./StackingEnsemble/Intro.tsx', import.meta.url), 'utf8');

describe('model introduction teaching copy', () => {
  it('describes MA and SES without off-by-one or level/forecast ambiguity', () => {
    expect(baseCopy).toContain('积累满n个实际观测后');
    expect(baseCopy).toContain('在同一时间顺序回测或留出区间比较多个n值');
    expect(baseCopy).toContain('固定窗口移动平均对窗口内最近n期等权');
    expect(baseCopy).toContain('看到X(t)后估计的t时刻水平，用于预测下一期及以后');
    expect(baseCopy).toContain("title: '结构表达有限'");
    expect(baseCopy).not.toContain("scenario: '促销销量预测'");
    expect(baseCopy).not.toContain("scenario: '股票价格技术分析'");
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
  });

  it('matches weighted, boosting, and stacking copy to the implemented protocols', () => {
    expect(ensembleCopy).toContain('向等权组合收缩');
    expect(ensembleCopy).not.toContain('>0.8');
    expect(ensembleCopy).toContain('第一阶段遍历全部候选');
    expect(ensembleCopy).not.toContain('随时加入');
    expect(ensembleCopy).toContain("title: '贪心路径依赖'");
    expect(ensembleCopy).toContain('差分后序列的线性自相关');
    expect(ensembleCopy).toContain('LSTM始终不接收已知未来特征');
    expect(ensembleCopy).toContain('保留时间留出验证选出的阶段系数');
    expect(boostingIntroCopy).toContain('保留时间验证段选出的阶段系数');
    expect(weightedIntroCopy).toContain('LSTM 不接收任何已知未来特征');
    expect(stackingIntroCopy).toContain('LSTM 不接收任何已知未来特征');
    for (const copy of [ensembleCopy, weightedIntroCopy, boostingIntroCopy, stackingIntroCopy]) {
      expect(copy).not.toContain('最多三折');
      expect(copy).not.toContain('OOF');
      expect(copy).not.toContain('滚动折');
    }
    expect(ensembleCopy).toContain('数据量少时优先使用加权平均');
    expect(ensembleCopy).not.toContain('房价预测');
  });
});
