# 生产计划页面全面Review报告

**审查日期**: 2025-11-09
**审查范围**: Production Plan Learning System (MPS教学系统)
**版本**: V2 (重构后)

---

## 📋 目录

1. [系统概览](#系统概览)
2. [架构设计评估](#架构设计评估)
3. [数据流与状态管理](#数据流与状态管理)
4. [教学内容准确性](#教学内容准确性)
5. [计算逻辑正确性](#计算逻辑正确性)
6. [UI/UX设计](#uiux设计)
7. [代码质量](#代码质量)
8. [发现的问题](#发现的问题)
9. [改进建议](#改进建议)
10. [总体评价](#总体评价)

---

## 系统概览

### 功能定位
交互式MPS（主生产计划）学习系统，通过6个渐进式步骤引导学生理解生产计划制定的完整流程。

### 核心组件
```
ProductionPlanSteps.tsx (主容器)
├── ProductionPlanContextV2.tsx (状态管理)
├── MPSTableViewV2.tsx (MPS表格显示)
└── steps_v2/
    ├── NewStep1.tsx (规划总览)
    ├── NewStep2.tsx (生产变量)
    ├── NewStep3.tsx (服务水平)
    ├── NewStep4.tsx (预测量)
    ├── NewStep5.tsx (投入量)
    └── NewStep6.tsx (完整计划表)
```

### 学习流程
```
Step1: 介绍MPS概念，预测第1期需求
  ↓
Step2: 计算第2期的库存量和缺货量
  ↓
Step3: 计算第2期的服务水平
  ↓
Step4: 计算第2期的安全库存和预测量
  ↓
Step5: 计算第2期的投入量
  ↓
Step6: 生成完整MPS表（第3-6期），全屏查看
  ↓
Quiz: 进入测验页面
```

---

## 架构设计评估

### ✅ 优点

#### 1. **清晰的关注点分离**
- **状态管理**: 集中在 `ProductionPlanContextV2.tsx`
- **UI展示**: 分离在各个Step组件
- **数据计算**: 在Context层面处理
- **全局状态**: 通过 `useExperiment()` 连接

#### 2. **渐进式学习设计**
```typescript
// 数据逐步填充
Step1: 填充 period1Data (完整标准化数据)
Step2: 填充 period2Data.demandForecast, productionOutput, endingInventory, stockout
Step3: 填充 period2Data.serviceLevel
Step4: 填充 period2Data.safetyStock
Step5: 填充 period2Data.plannedProduction
Step6: 生成 fullMPSTable (第3-N期)
```

#### 3. **Context Provider模式应用得当**
```typescript
<ProductionPlanProvider initialModel={...} avgDemand={...}>
  <ProductionPlanContent />
</ProductionPlanProvider>
```

#### 4. **组件复用性好**
- MPS表格组件独立，可在不同场景使用
- Toast组件统一错误提示
- 步骤导航可扩展

### ⚠️ 潜在问题

#### 1. **Context过于臃肿**
```typescript
// ProductionPlanContextV2.tsx 已有470+行
interface ProductionPlanContextValue {
  state: ProductionPlanState;
  goToStep: (step: number) => void;
  completeCurrentStep: () => void;
  updateParameters: (...) => void;
  updateCapacity: (...) => void;
  fillPeriod1Data: (...) => void;
  fillPeriod2Field: (...) => void;
  updatePeriod2Data: (...) => void;
  savePredictions: (...) => void;
  generateFullMPS: (...) => void;
  hideStep6Teaching: () => void;
  resetAll: () => void;
}
```
**建议**: 考虑拆分为多个Context（StepContext, DataContext, UIContext）

#### 2. **步骤间耦合度较高**
- Step2依赖Step1的period1Data
- Step3依赖Step2的stockout
- Step4依赖全局predictions
- Step5依赖Step4的forecastQuantity和Step1的endingInventory

**影响**: 步骤顺序固化，难以支持非线性学习路径

---

## 数据流与状态管理

### 数据流图

```
用户交互 (Step Components)
    ↓
Context Actions (updatePeriod2Data, fillPeriod1Data, etc.)
    ↓
Context State (period1Data, period2Data, fullMPSTable)
    ↓
MPS Table Display (MPSTableViewV2)
    ↓
全局状态同步 (useExperiment.updateState)
```

### ✅ 优点

#### 1. **单向数据流**
清晰的数据流向，易于追踪和调试

#### 2. **状态同步机制**
```typescript
// Step6中自动保存到全局状态
useEffect(() => {
  if (state.isFullPlanGenerated && !hasSavedMPSRef.current) {
    await updateState({
      production_plan_completed: true,
      production_mps_table: globalMPSTable,
      // ...其他参数
    });
  }
}, [state.isFullPlanGenerated]);
```

#### 3. **MPS表实时更新**
每个步骤计算完成后立即更新Context，MPS表同步显示

### ⚠️ 潜在问题

#### 1. **预测数据缓存问题**
```typescript
// Step1中保存predictions
savePredictions(predictions);

// Step6中重用
if (state.predictions && state.predictions.length > 0) {
  generateFullMPS(state.predictions);
}
```
**问题**: 如果用户重新选择模型，predictions不会自动更新
**建议**: 添加模型变更检测，清空缓存

#### 2. **状态重置不彻底**
```typescript
const resetAll = () => {
  setState(getDefaultState(model, avg));
};
```
**问题**:
- `isStep6TeachingHidden` 会被重置为false
- 但全局状态（`useExperiment`）不会重置
- 可能导致状态不一致

**建议**:
```typescript
const resetAll = async () => {
  // 重置本地状态
  setState(getDefaultState(model, avg));
  // 同步重置全局状态
  await updateState({
    production_plan_completed: false,
    production_mps_table: [],
    // ...
  });
};
```

#### 3. **期初库存计算逻辑分散**
```typescript
// NewStep2.tsx (行38-44)
const period2BeginningInventory = state.period1Data.endingInventory ?? 0;

// generateFullMPS in Context (行370)
const beginningInventory = previousEndingInventory;
```
**问题**: 相同逻辑在多处实现，容易出现不一致
**建议**: 提取为工具函数

---

## 教学内容准确性

### ✅ 优点

#### 1. **严格遵循客户文档**
每个Step的教学结构都按照客户提供的文档重构：

**Step1**:
- MPS概念介绍
- 关键概念（需求预测、提前期、时段选择）
- 逻辑流程（标准化第一月、第二月计算流程）

**Step2-5**:
- 定义与重要性
- 计算公式与解释
- 在生产计划中的应用

**Step6**:
- 目的与重要性
- (1) 第二个月的成功案例
- (2) 逐月生成完整生产计划表的逻辑
- (3) 生成完整生产计划表的步骤
- (4) 观察与分析完整生产计划表
- (5) 总结

#### 2. **固定实例讲解准确**
```typescript
// Step5: 投入量实例
投入量 = 预测量 - 上月库存量 + 上月缺货量
      = 1200 - 100 + 50
      = 1150 单位
```
所有固定实例都经过验证，数学计算正确

#### 3. **术语使用一致**
- 需求预测结果 / 实际需求
- 期初库存 / 期末库存
- 投入量 / 计划生产
- 产出量
- 预测量（需求+安全库存）

### ⚠️ 发现的问题

#### 1. **"预测量"概念可能混淆**

**问题描述**:
```typescript
// Step1中（第一期标准化）
plannedProduction: period1Demand,  // 投入量 = 预测量（第一月预测量=需求预测，不含安全库存）
```

**教学内容**（Step1，行273）:
> "预测量：第一个月的预测量不包含安全库存，仅为需求预测量。"

**但在Step4中**:
> "预测量 = 需求预测结果 + 安全库存"

**混淆点**:
- 第一期的"预测量"只是需求预测
- 第二期及之后的"预测量"才是 需求+安全库存

**建议**: 统一术语或明确说明第一期的特殊性

#### 2. **服务水平公式说明不够清晰**

**Step3当前公式**（行170）:
```
服务水平 = 1 - (缺货量 / 实际需求量)
```

**问题**:
- 没有说明这是"填充率"（Fill Rate）定义
- 没有说明与"周期服务水平"（Cycle Service Level）的区别
- 没有说明为什么第一期服务水平=100%（标准化假设）

**建议**: 添加服务水平类型说明

#### 3. **安全库存计算说明可以更详细**

**Step4当前说明**（行216-217）:
```typescript
• Z分数：基于目标服务水平的统计参数（目标：99% → Z = 2.33）
• 需求标准差：需求波动的度量（从预测模型获得）
```

**缺失内容**:
- 为什么99%对应Z=2.33（正态分布假设）
- 如果需求不服从正态分布怎么办
- 标准差是如何从LSTM模型中获得的

**建议**: 添加统计学背景说明（可选阅读）

---

## 计算逻辑正确性

### ✅ 验证通过的计算

#### 1. **期末库存和缺货计算** (Step2)
```typescript
// NewStep2.tsx 行59-68
const calculateInventoryAndStockout = () => {
  const availableInventory = period2BeginningInventory + productionOutput;
  const totalDemand = period2Demand;

  if (availableInventory >= totalDemand) {
    return {
      endingInventory: availableInventory - totalDemand,
      stockout: 0,
    };
  } else {
    return {
      endingInventory: 0,
      stockout: totalDemand - availableInventory,
    };
  }
};
```
**验证**: ✅ 逻辑正确，处理了库存和缺货互斥的情况

#### 2. **服务水平计算** (Step3)
```typescript
// NewStep3.tsx 行24-27
const calculateServiceLevel = (): number => {
  if (period2Demand === 0) return 1.0;
  return Math.max(0, (period2Demand - period2Stockout) / period2Demand);
};
```
**验证**: ✅ 正确处理了需求为0的边界情况，使用Math.max防止负值

#### 3. **安全库存计算** (Step4)
```typescript
// NewStep4.tsx 行26-39
const calculateSafetyStock = (): number => {
  const secondPrediction = state.predictions?.[1];
  if (secondPrediction) {
    const stdDev = secondPrediction.std_dev;
    const safetyStock = Math.round(zScore * stdDev);
    return Math.max(0, safetyStock);
  }
  // Fallback
  const avgDemand = state.avgDemand;
  const stdDev = avgDemand * 0.2;
  const safetyStock = Math.round(zScore * stdDev);
  return Math.max(0, safetyStock);
};
```
**验证**: ✅ 优先使用真实标准差，有fallback机制

#### 4. **投入量计算** (Step5)
```typescript
// NewStep5.tsx 行36-42
const calculatePlannedProduction = (): number => {
  const plannedProduction = Math.max(
    0,
    period2ForecastQuantity - period1EndingInventory + period1Stockout
  );
  return plannedProduction;
};
```
**公式**: 投入量 = 预测量 - 上月库存量 + 上月缺货量
**验证**: ✅ 符合客户文档要求

### ⚠️ 发现的问题

#### 1. **第一期标准差处理不一致**

**问题位置**: NewStep4.tsx 行59-68
```typescript
// 填充第1期的安全库存
const period1Prediction = state.predictions?.[0];
if (period1Prediction) {
  const period1StdDev = period1Prediction.std_dev;
  const period1SafetyStock = Math.round(state.safetyStockZScore * period1StdDev);
  fillPeriod1Data({
    ...state.period1Data,
    safetyStock: period1SafetyStock,  // ← 这里填充了安全库存
  });
}
```

**但在NewStep1.tsx 行110**:
```typescript
fillPeriod1Data({
  demandForecast: period1Demand,
  safetyStock: null,  // ← 安全库存在Step4才计算
  // ...
});
```

**冲突**:
- Step1设置 `safetyStock: null`
- Step4又通过 `fillPeriod1Data` 填充安全库存
- 可能覆盖之前的数据

**建议**:
- Option 1: Step1就计算第1期安全库存
- Option 2: 使用专门的 `updatePeriod1SafetyStock()` 方法

#### 2. **产能约束应用时机不明确**

**产能设置**: NewStep1.tsx 行119-135
```typescript
const capacity = Math.round(avgDemand * 1.1);
updateCapacity({
  scenario: 'normal',
  capacity: capacity,
});
```

**产能使用**: generateFullMPS (Context 行380)
```typescript
const productionOutput = Math.max(0, Math.min(requiredProduction, state.productionCapacity));
```

**问题**:
- 第2期的计算中**没有应用产能约束**
- 只在Step6生成第3期及以后时才应用
- 导致第2期可能出现不现实的产出量

**建议**: 在Step2计算第2期产出量时也应用产能约束

#### 3. **期初库存传递链可能断裂**

**问题场景**:
```typescript
// 如果用户跳过Step2，直接进入Step3
// period2Data.beginningInventory 可能为 null
// 导致后续计算错误
```

**当前保护**: NewStep2.tsx 行38
```typescript
const period2BeginningInventory = state.period1Data.endingInventory ?? 0;
```

**问题**:
- 使用了 `?? 0` 兜底
- 但如果period1Data没有正确填充，0可能不是正确的默认值

**建议**:
- 添加步骤验证，确保必须完成前置步骤
- 或添加明确的错误提示

#### 4. **标准差验证函数的位置**

**当前**: `validateAndFixStdDev` 在 `predictionValidator.ts`
**使用**: 只在 `generateFullMPS` 中使用（第3期及以后）

**问题**:
- Step4计算第2期安全库存时**没有使用**验证函数
- 可能出现异常的标准差值（NaN, Infinity, 负数）

**建议**: 在Step4也使用验证函数
```typescript
const calculateSafetyStock = (): number => {
  const secondPrediction = state.predictions?.[1];
  if (secondPrediction) {
    const validationResult = validateAndFixStdDev(
      secondPrediction.std_dev,
      period2Demand,
      1
    );
    const safetyStock = Math.round(zScore * validationResult.value);
    return Math.max(0, safetyStock);
  }
  // ...
};
```

---

## UI/UX设计

### ✅ 优点

#### 1. **视觉层次清晰**
- 顶部步骤导航（横向卡片）
- 左侧教学内容（可滚动）
- 右侧MPS表格（实时更新）
- 颜色编码清晰（每个步骤有独特的主题色）

#### 2. **渐进式信息披露**
```typescript
// MPS表格列逐步解锁
Step1-3: ['period', 'demand_forecast', 'beginning_inventory', 'production_output',
          'ending_inventory', 'stockout', 'service_level']
Step4:   + ['safety_stock', 'forecast_quantity']
Step5-6: + ['planned_production']
```

#### 3. **即时反馈机制**
- 计算按钮 → 显示计算过程 → 更新MPS表
- 错误提示（Toast）
- 成功动画（animate-fadeIn）

#### 4. **Step6全屏查看体验**
```typescript
// 点击"下一步" → 教学内容隐藏 → MPS表全屏
{state.currentStep === 6 && state.isStep6TeachingHidden ? (
  <全屏MPS表 + 完成按钮>
) : (
  <左右分栏布局>
)}
```

### ⚠️ 发现的问题

#### 1. **步骤导航不支持跳转回看**

**当前行为**:
```typescript
// ProductionPlanSteps.tsx 行69-72
onClick={() => {
  const status = getStepStatus(step.id);
  if (status !== 'locked') goToStep(step.id);
}}
```

**问题**:
- 只能跳转到"已完成"或"当前"步骤
- 不能跳转回"可用"状态的步骤
- 限制了用户复习的灵活性

**建议**:
```typescript
// 允许跳转到已完成的步骤复习
if (status === 'completed' || status === 'current') {
  goToStep(step.id);
}
```

#### 2. **MPS表格滚动体验问题**

**场景**: 当期数较多（如6期）时，表格宽度会超过容器

**当前处理**:
```typescript
// MPSTableViewV2.tsx 行88
<div className="overflow-x-auto">
  <table className="w-full">
```

**问题**:
- 横向滚动条不明显
- 没有粘性列（月份列不固定）
- 在小屏幕上体验差

**建议**:
```css
/* 添加粘性第一列 */
.mps-table th:first-child,
.mps-table td:first-child {
  position: sticky;
  left: 0;
  background-color: white;
  z-index: 10;
}
```

#### 3. **计算过程展示可以更动态**

**当前**: 计算结果一次性显示
**建议**: 分步骤动画显示，增强理解

```typescript
// 示例：Step3服务水平计算
<Step1 显示公式>
  ↓ (延迟300ms)
<Step2 显示代入数值>
  ↓ (延迟300ms)
<Step3 显示中间结果>
  ↓ (延迟300ms)
<Step4 显示最终结果>
```

#### 4. **响应式设计不足**

**问题**:
- 左右分栏在小屏幕上挤压严重
- 没有移动端适配（< 768px）
- 表格在窄屏幕上难以阅读

**建议**:
```typescript
// 小屏幕上垂直堆叠
@media (max-width: 768px) {
  .flex-layout {
    flex-direction: column;
  }
}
```

#### 5. **缺少进度指示**

**问题**:
- 只显示当前在哪一步
- 没有显示整体完成进度（如 "3/6 步骤完成"）
- 没有显示预计剩余时间

**建议**:
```typescript
// 添加进度条
<div className="progress-bar">
  <div className="progress-fill" style={{ width: `${(completedSteps.length / 6) * 100}%` }} />
</div>
<div className="progress-text">已完成 {completedSteps.length}/6 步骤</div>
```

---

## 代码质量

### ✅ 优点

#### 1. **TypeScript类型定义完整**
```typescript
interface ProductionPlanState {
  currentStep: number;
  completedSteps: number[];
  forecastPeriods: number;
  // ... 所有字段都有明确类型
}

interface MPSTableRow {
  period: number;
  period_label: string;
  demand_forecast: number | null;
  // ... 清晰的null处理
}
```

#### 2. **组件命名规范**
- 文件名：PascalCase (`NewStep1.tsx`)
- 组件名：PascalCase (`const NewStep1: React.FC`)
- 函数名：camelCase (`calculateServiceLevel`)
- 常量名：UPPER_SNAKE_CASE (`FIXED_FORECAST_PERIODS`)

#### 3. **代码注释充分**
```typescript
/**
 * Step 5: 投入量
 * 按照客户文档重构，教学结构：
 * 1. 投入量的定义与重要性
 * 2. 投入量的计算公式与解释
 * 3. 投入量在生产计划中的应用
 * 核心公式：投入量 = 预测量 - 上月库存量 + 上月缺货量
 */
```

#### 4. **错误处理完善**
```typescript
try {
  // API调用
} catch (err) {
  console.error('生成预测失败:', err);
  setError(err instanceof Error ? err.message : '生成预测失败，请重试');
}
```

### ⚠️ 可改进点

#### 1. **魔法数字**
```typescript
// NewStep1.tsx 行120
const capacity = Math.round(avgDemand * 1.1);  // 1.1是什么？

// NewStep4.tsx 行36
const stdDev = avgDemand * 0.2;  // 0.2是什么？
```

**建议**:
```typescript
const CAPACITY_MULTIPLIER = 1.1;  // 产能为平均需求的110%
const STD_DEV_FALLBACK_RATIO = 0.2;  // 标准差估算为需求的20%
```

#### 2. **重复代码**
```typescript
// NewStep2, NewStep3, NewStep4, NewStep5中都有
const handleNext = () => {
  if (!hasCalculated) {
    toast.showToast('...', 'error');
    return;
  }
  updatePeriod2Data({ ... });
  completeCurrentStep();
};
```

**建议**: 提取为自定义Hook
```typescript
const useStepCompletion = (hasCalculated: boolean, updateData: () => void) => {
  const { toast, completeCurrentStep } = ...;
  return () => {
    if (!hasCalculated) {
      toast.showToast('请先完成计算', 'error');
      return;
    }
    updateData();
    completeCurrentStep();
  };
};
```

#### 3. **长函数需要拆分**
```typescript
// generateFullMPS in Context: 122行 (line 312-434)
```

**建议**: 拆分为
```typescript
const calculatePeriodData = (period, previousState) => { ... };
const applyCapacityConstraint = (required, capacity) => { ... };
const calculateInventoryAndStockout = (available, demand, backlog) => { ... };
```

#### 4. **console.log应该使用日志库**
```typescript
// 生产环境中应该移除或使用日志级别控制
console.log('🚀 调用预测API:', ...);
console.log('✅ 预测数据获取成功:', ...);
console.error('生成预测失败:', ...);
```

**建议**:
```typescript
import { logger } from '@/utils/logger';

logger.info('调用预测API', { modelType, forecastSteps });
logger.success('预测数据获取成功', predictions);
logger.error('生成预测失败', error);
```

#### 5. **缺少单元测试**

**当前状态**: 没有测试文件

**建议**: 至少为计算函数添加测试
```typescript
// __tests__/calculations.test.ts
describe('MPS Calculations', () => {
  test('calculateServiceLevel with no stockout', () => {
    expect(calculateServiceLevel(1000, 0)).toBe(1.0);
  });

  test('calculateServiceLevel with stockout', () => {
    expect(calculateServiceLevel(1000, 100)).toBe(0.9);
  });

  test('calculateServiceLevel with zero demand', () => {
    expect(calculateServiceLevel(0, 0)).toBe(1.0);
  });
});
```

---

## 发现的问题

### 🔴 严重问题

#### 1. **产能约束不一致** (高优先级)
**位置**: NewStep2.tsx, generateFullMPS
**描述**: 第2期没有应用产能约束，第3期及以后才应用
**影响**: 学生会看到第2期产出量不受限制，与现实不符
**修复难度**: 中等
**建议修复**: 在Step2中应用产能约束

#### 2. **状态同步可能失败** (高优先级)
**位置**: Step6
**描述**: 异步保存到全局状态时如果失败，本地和全局状态不一致
**影响**: 进入Quiz页面后数据丢失
**修复难度**: 低
**建议修复**: 添加错误处理和重试机制

### 🟡 中等问题

#### 3. **预测量概念混淆** (中优先级)
**位置**: Step1教学内容
**描述**: 第1期"预测量"与后续期的"预测量"定义不同
**影响**: 学生理解困难
**修复难度**: 低
**建议修复**: 统一术语或明确说明

#### 4. **标准差验证不一致** (中优先级)
**位置**: Step4 calculateSafetyStock
**描述**: Step4没有使用 validateAndFixStdDev
**影响**: 可能出现异常的安全库存值
**修复难度**: 低
**建议修复**: 应用验证函数

#### 5. **MPS表格横向滚动体验差** (中优先级)
**位置**: MPSTableViewV2.tsx
**描述**: 没有粘性列，小屏幕难以使用
**影响**: 用户体验下降
**修复难度**: 中等
**建议修复**: 添加粘性第一列

### 🟢 轻微问题

#### 6. **步骤导航限制过严** (低优先级)
**位置**: ProductionPlanSteps.tsx
**描述**: 不能回看已完成的步骤
**影响**: 复习不便
**修复难度**: 低
**建议修复**: 允许跳转到已完成步骤

#### 7. **缺少进度指示** (低优先级)
**位置**: ProductionPlanSteps.tsx
**描述**: 没有整体进度显示
**影响**: 用户不清楚还有多少任务
**修复难度**: 低
**建议修复**: 添加进度条

#### 8. **魔法数字** (低优先级)
**位置**: 多处
**描述**: 1.1, 0.2等数字没有常量定义
**影响**: 代码可维护性下降
**修复难度**: 低
**建议修复**: 提取为常量

---

## 改进建议

### 短期改进（1-2天工作量）

#### 1. **修复产能约束不一致**
```typescript
// NewStep2.tsx
const calculateProductionOutput = (): number => {
  const period1PlannedProduction = state.period1Data.plannedProduction ?? 0;
  // 应用产能约束
  return Math.min(period1PlannedProduction, state.productionCapacity);
};
```

#### 2. **统一标准差验证**
```typescript
// Step4中使用验证函数
import { validateAndFixStdDev } from '../utils/predictionValidator';

const calculateSafetyStock = (): number => {
  const secondPrediction = state.predictions?.[1];
  if (secondPrediction) {
    const validationResult = validateAndFixStdDev(
      secondPrediction.std_dev,
      period2Demand,
      1
    );
    validationResult.warnings.forEach(w => console.warn(w));
    const safetyStock = Math.round(zScore * validationResult.value);
    return Math.max(0, safetyStock);
  }
  // ...
};
```

#### 3. **添加进度指示器**
```typescript
// ProductionPlanSteps.tsx
<div className="mb-2 flex items-center justify-between text-sm text-gray-600">
  <span>学习进度</span>
  <span className="font-semibold">{state.completedSteps.length} / 6 完成</span>
</div>
<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
    style={{ width: `${(state.completedSteps.length / 6) * 100}%` }}
  />
</div>
```

#### 4. **提取魔法数字为常量**
```typescript
// config/mpsConstants.ts
export const PRODUCTION_CAPACITY = {
  NORMAL_MULTIPLIER: 1.1,  // 正常产能为平均需求的110%
  TIGHT_MULTIPLIER: 1.0,
  ABUNDANT_MULTIPLIER: 1.5,
};

export const STD_DEV_ESTIMATION = {
  FALLBACK_RATIO: 0.2,  // 标准差估算为需求的20%
};
```

### 中期改进（3-5天工作量）

#### 5. **重构Context，拆分关注点**
```typescript
// contexts/
├── StepNavigationContext.tsx      (步骤导航)
├── MPSDataContext.tsx             (MPS数据管理)
├── CalculationContext.tsx         (计算逻辑)
└── UIStateContext.tsx             (UI状态，如isStep6TeachingHidden)
```

#### 6. **添加MPS表格粘性列**
```tsx
// MPSTableViewV2.tsx
<table className="mps-table">
  <thead>
    <tr>
      <th className="sticky-column">月份</th>
      {/* 其他列 */}
    </tr>
  </thead>
  {/* ... */}
</table>

<style>
.sticky-column {
  position: sticky;
  left: 0;
  background-color: white;
  z-index: 10;
  box-shadow: 2px 0 4px rgba(0,0,0,0.1);
}
</style>
```

#### 7. **添加计算过程动画**
```typescript
// hooks/useStaggeredReveal.ts
const useStaggeredReveal = (steps: string[], delay = 300) => {
  const [visibleSteps, setVisibleSteps] = useState<string[]>([]);

  useEffect(() => {
    steps.forEach((step, index) => {
      setTimeout(() => {
        setVisibleSteps(prev => [...prev, step]);
      }, index * delay);
    });
  }, [steps, delay]);

  return visibleSteps;
};

// 在Step组件中使用
const steps = ['formula', 'substitution', 'calculation', 'result'];
const visible = useStaggeredReveal(steps);
```

#### 8. **改进错误处理和重试机制**
```typescript
// utils/retry.ts
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

// 使用
await retryAsync(() => updateState({ ... }));
```

### 长期改进（1-2周工作量）

#### 9. **添加完整的测试覆盖**
```
tests/
├── unit/
│   ├── calculations.test.ts
│   ├── validators.test.ts
│   └── helpers.test.ts
├── integration/
│   ├── step-navigation.test.tsx
│   ├── mps-calculation-flow.test.tsx
│   └── data-persistence.test.tsx
└── e2e/
    └── complete-learning-path.spec.ts
```

#### 10. **实现响应式设计**
```typescript
// 使用Tailwind responsive classes
<div className="flex flex-col md:flex-row gap-6">
  <div className="w-full md:w-1/2">教学内容</div>
  <div className="w-full md:w-1/2">MPS表格</div>
</div>

// 移动端优化
<table className="text-xs md:text-sm">
```

#### 11. **添加数据持久化（本地存储）**
```typescript
// hooks/usePersistentState.ts
const usePersistentState = <T>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
};

// 使用
const [mpsState, setMpsState] = usePersistentState('mps-learning-progress', initialState);
```

#### 12. **添加导出功能**
```typescript
// utils/export.ts
export const exportMPSToExcel = (table: MPSTableRow[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('MPS计划表');

  // 添加表头
  worksheet.columns = [
    { header: '月份', key: 'period_label', width: 10 },
    { header: '需求预测', key: 'demand_forecast', width: 12 },
    // ...
  ];

  // 添加数据
  worksheet.addRows(table);

  // 下载
  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'MPS计划表.xlsx');
  });
};
```

---

## 总体评价

### 评分（5分制）

| 维度 | 评分 | 说明 |
|------|------|------|
| **架构设计** | 4.0/5.0 | 清晰的关注点分离，但Context过于臃肿 |
| **数据流管理** | 4.5/5.0 | 单向数据流清晰，状态同步机制完善 |
| **教学内容** | 4.5/5.0 | 严格遵循客户文档，内容准确，但个别概念需澄清 |
| **计算逻辑** | 4.0/5.0 | 核心计算正确，但产能约束不一致 |
| **UI/UX设计** | 4.0/5.0 | 视觉清晰，交互流畅，但响应式不足 |
| **代码质量** | 4.0/5.0 | TypeScript类型完整，注释充分，但有重复代码 |
| **可维护性** | 3.5/5.0 | 结构清晰但长函数较多，缺少测试 |

**综合评分**: **4.1/5.0** (优秀)

### 核心优势

1. **教学设计优秀**: 渐进式学习路径设计合理，每一步都有明确的教学目标
2. **实时反馈机制**: MPS表格随步骤进度逐列解锁，学生能立即看到计算结果
3. **客户需求契合度高**: 严格按照客户文档重构，每个步骤的教学内容都精准对应
4. **Step6全屏体验**: 创新的UX设计，教学内容隐藏后MPS表全屏显示，便于整体分析

### 主要短板

1. **产能约束不一致**: 第2期和第3期及以后的计算逻辑不统一
2. **响应式设计缺失**: 移动端体验差
3. **测试覆盖不足**: 没有单元测试和集成测试
4. **部分计算函数缺少验证**: 标准差验证没有全面应用

### 建议优先级

**P0 (必须修复)**:
- [ ] 产能约束不一致问题
- [ ] 状态同步错误处理

**P1 (强烈建议)**:
- [ ] 标准差验证统一应用
- [ ] 预测量概念澄清
- [ ] 添加进度指示器
- [ ] 提取魔法数字为常量

**P2 (建议改进)**:
- [ ] MPS表格粘性列
- [ ] 步骤导航允许回看
- [ ] 重构长函数
- [ ] 添加日志库

**P3 (长期优化)**:
- [ ] 测试覆盖
- [ ] 响应式设计
- [ ] Context拆分
- [ ] 导出功能

---

## 总结

这是一个**设计优秀、实现规范**的MPS教学系统。整体架构清晰，教学内容准确，用户体验良好。主要问题集中在：

1. **计算逻辑的一致性**（产能约束、标准差验证）
2. **代码的可维护性**（长函数、重复代码）
3. **工程质量**（测试覆盖、响应式设计）

按照上述优先级逐步改进，系统质量可以达到**4.5/5.0**以上。

---

**审查人**: Claude
**审查日期**: 2025-11-09
**下次审查建议**: 实施P0-P1改进后
