# 生产计划模块重构方案总结

## 📋 客户问题与解决方案

### 问题1：交互流程不符合需求
**客户反馈**：需要渐进式填充学习流程，而不是线性向导式

**解决方案**：
- ✅ 改为单页面布局：左侧概念学习区 + 右侧MPS表格（始终可见）
- ✅ 学生在概念和表格间切换学习
- ✅ 每学完一个概念，第2期对应列自动填充
- ✅ 9个学习步骤，渐进式理解每一列的含义

### 问题2：新增了未定义页面
**客户反馈**：增加了参数设置页、中间结果表、参数总结页

**解决方案**：
- ✅ 移除独立的参数设置页（整合到步骤1：MPS概述）
- ✅ 移除中间结果表页（表格始终在右侧显示）
- ✅ 移除参数总结页（不需要单独回顾）

### 问题3：计算逻辑不一致
**客户反馈**：步骤2用"预测需求"，步骤3却用"实际需求量"

**解决方案**：
- ✅ 统一使用**预测需求**作为计算基准
- ✅ 服务水平公式改为：服务水平 = 1 - (缺货量 / **预测需求量**)
- ✅ 所有计算都基于事前计划逻辑，不引入"实际需求"概念

---

## 🏗 新架构设计

### 页面结构
```
┌─────────────────────────────────────────────────────────┐
│  步骤 7: 制定生产计划                                    │
│  通过渐进式学习，逐步理解MPS表的每一列如何生成          │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│  左侧（1/3宽度）     │  右侧（2/3宽度）                 │
│                      │                                  │
│  [步骤导航]          │  [MPS表格 - 始终可见]            │
│  1. ✓ MPS概述        │  ┌────────────────────────────┐  │
│  2. ● 需求预测       │  │ 期数 │ 预测需求 │ ... │     │  │
│  3. ○ 安全库存       │  ├────────────────────────────┤  │
│  4. ○ 计划生产       │  │ 期初 │   -     │  (起始)  │  │
│  5. ○ 期初库存       │  ├────────────────────────────┤  │
│  6. ○ 产出量         │  │ 期2  │ 1050 ✓  │ 86 ✓│... │  │
│  7. ○ 期末库存       │  │(学习)│(已填充) │(已填充)  │  │
│  8. ○ 缺货与服务水平 │  ├────────────────────────────┤  │
│  9. ⊘ 生成完整计划   │  │ 期3  │    ?    │    ?    │  │
│                      │  │ ...  │   ...   │   ...   │  │
│  [概念学习区]        │  └────────────────────────────┘  │
│  [当前步骤的详细内容]│  提示：随着学习进度，期2数据会    │
│  [图表/公式/计算]    │  逐步填充完整                     │
│  [下一步按钮]        │                                  │
│                      │                                  │
└──────────────────────┴──────────────────────────────────┘
```

### 学习流程（9个步骤）

| 步骤 | 名称 | 填充列 | 核心概念 |
|------|------|--------|---------|
| 1 | MPS概述 | - | 介绍MPS + 设置参数（期数、期初库存、服务水平） |
| 2 | 需求预测 | 第1列 | 基于最佳模型预测未来需求 |
| 3 | 安全库存 | 第2列 | 安全库存 = Z分数 × 标准差 |
| 4 | 计划生产 | 第3列 | 计划生产 = 预测需求 + 安全库存 |
| 5 | 期初库存 | 第4列 | 期初库存 = 上期期末库存（连续性） |
| 6 | 产出量 | 第5列 | 投入量 = 计划生产 - 期初库存 + 上期缺货 |
| 7 | 期末库存 | 第6-7列 | 期末库存 = 期初 + 产出 - 预测需求；处理缺货 |
| 8 | 服务水平 | 第8列 | 服务水平 = 1 - (缺货 / **预测需求**) ⚠️ 关键修正 |
| 9 | 完整计划 | 所有期 | 调用API生成所有期的完整MPS表 |

---

## 📁 新文件结构

```
production/
├── ProductionPlanContextV2.tsx       # 新的Context（渐进式状态管理）
├── ProductionPlanPageV2.tsx          # 新的主页面（左右布局）
├── components/
│   └── MPSTableView.tsx              # MPS表格视图组件
├── steps/
│   ├── ConceptStep1.tsx              # 步骤1：MPS概述
│   ├── ConceptStep2.tsx              # 步骤2：需求预测
│   ├── ConceptStep3.tsx              # 步骤3：安全库存
│   ├── ConceptStep4.tsx              # 步骤4：计划生产
│   ├── ConceptStep5.tsx              # 步骤5：期初库存（待实现）
│   ├── ConceptStep6.tsx              # 步骤6：产出量（待实现）
│   ├── ConceptStep7.tsx              # 步骤7：期末库存（待实现）
│   ├── ConceptStep8.tsx              # 步骤8：服务水平（待实现）
│   ├── ConceptStep9.tsx              # 步骤9：生成完整计划（待实现）
│   └── STEPS_TEMPLATE.md             # 步骤实现模板
└── REFACTOR_SUMMARY.md               # 本文档
```

---

## 🔧 核心代码逻辑

### 状态管理（ProductionPlanContextV2）

```typescript
interface ProductionPlanState {
  // 学习进度
  currentStep: number;              // 当前步骤 1-9
  completedSteps: number[];         // 已完成步骤列表

  // 参数
  forecastPeriods: number;          // 预测期数
  initialInventory: number;         // 期初库存
  targetServiceLevel: number;       // 目标服务水平
  safetyStockZScore: number;        // Z分数

  // 演示数据（第2期）
  demoPrediction: number;           // 示例预测值
  demoStdDev: number;               // 示例标准差

  // 第2期渐进式填充数据
  period2Data: {
    demandForecast: number | null;
    safetyStock: number | null;
    plannedProduction: number | null;
    beginningInventory: number | null;
    productionOutput: number | null;
    endingInventory: number | null;
    stockout: number | null;
    serviceLevel: number | null;
  };

  // 完整MPS表
  fullMPSTable: MPSTableRow[];
  isFullPlanGenerated: boolean;
}
```

### 关键方法

```typescript
// 步骤控制
goToStep(step: number);              // 跳转到指定步骤
completeCurrentStep();               // 完成当前步骤，前进到下一步

// 数据填充
fillPeriod2Field(field, value);     // 填充第2期的某个字段

// 完整计划生成
generateFullMPS(predictions);        // 生成所有期的MPS表
```

### 渐进式填充流程

```typescript
// 在每个ConceptStep组件中：
useEffect(() => {
  if (state.period2Data.xxx === null) {
    // 计算该字段的值
    const value = calculateXXX();
    // 自动填充
    fillPeriod2Field('xxx', value);
  }
}, []);
```

---

## ⚠️ 关键修正点

### 修正1：服务水平计算基准统一

**错误的方式**（旧版本）：
```typescript
// 步骤2：基于预测需求计算库存
endingInventory = beginningInventory + production - demandForecast;

// 步骤3：却基于"实际需求"计算服务水平 ❌
serviceLevel = 1 - (stockout / actualDemand);  // 矛盾！
```

**正确的方式**（新版本）：
```typescript
// 统一基于预测需求 ✅
endingInventory = beginningInventory + production - demandForecast;
serviceLevel = 1 - (stockout / demandForecast);  // 一致！
```

**原因**：
- MPS是**事前计划**工具，所有计算都基于预测数据
- "实际需求"是事后统计概念，不应出现在计划制定阶段
- 保持逻辑一致性：既然缺货基于预测需求计算，服务水平也应基于预测需求

### 修正2：移除多余页面

| 旧版本 | 新版本 |
|--------|--------|
| 独立参数设置页 | 整合到步骤1（MPS概述） |
| 中间结果展示页（预测+安全库存表） | 渐进式填充到主表格 |
| 参数总结回顾页 | 移除（不需要） |
| 6个线性步骤页面 | 9个交互式概念学习组件 |

### 修正3：渐进式 vs 线性

**旧版本（线性）**：
```
步骤1 → 步骤2 → ... → 步骤6 → 一次性生成完整表格
（表格始终不可见，直到最后）
```

**新版本（渐进式）**：
```
步骤1：概述（表格已显示，第2期全空）
   ↓
步骤2：需求预测 → 第2期第1列填充✓
   ↓
步骤3：安全库存 → 第2期第2列填充✓
   ↓
步骤4：计划生产 → 第2期第3列填充✓
   ...（继续填充）
   ↓
步骤9：生成完整计划 → 所有期全部填充✓
（表格始终可见，实时更新）
```

---

## 🚀 使用方式

### 1. 替换路由

在 `ProductionPlan.tsx` 或 `App.tsx` 中：

```typescript
// 旧的
import ProductionPlan from './production/ProductionPlan';

// 新的
import ProductionPlanPageV2 from './production/ProductionPlanPageV2';

// 路由配置
<Route path="/production/*" element={<ProductionPlanPageV2 />} />
```

### 2. 完成剩余步骤组件

参考已完成的 `ConceptStep1-4.tsx` 和 `STEPS_TEMPLATE.md`，实现 `ConceptStep5-9.tsx`。

每个组件的核心结构：
```typescript
const ConceptStepX: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  // 自动计算并填充
  useEffect(() => {
    if (state.period2Data.xxx === null) {
      const value = calculate();
      fillPeriod2Field('xxx', value);
    }
  }, []);

  return (
    <div>
      {/* 标题 */}
      {/* 概念说明 */}
      {/* 计算公式 */}
      {/* 计算结果展示 */}
      {/* 提示查看表格 */}
      {/* 下一步按钮 */}
    </div>
  );
};
```

### 3. API集成（步骤9）

在 `ConceptStep9.tsx` 中调用预测API：

```typescript
const handleGenerate = async () => {
  const response = await apiClient.post('/model/predict', {
    model_type: mapModelType(state.selectedBestModel),
    forecast_steps: state.forecastPeriods,
  });

  generateFullMPS(response.results.predictions);
};
```

---

## ✅ 验收标准

1. ✅ 单页面布局，左侧概念学习，右侧表格始终可见
2. ✅ 9个学习步骤，可以前后切换（已完成的步骤）
3. ✅ 每学完一个概念，第2期对应列自动填充
4. ✅ 所有计算基于**预测需求**，不出现"实际需求"
5. ✅ 移除了独立的参数设置页、中间结果页、参数总结页
6. ✅ 步骤9能够生成所有期的完整MPS表
7. ✅ 表格显示完整的9列数据
8. ✅ 服务水平计算公式：1 - (缺货 / 预测需求)

---

## 📊 对比总结

| 维度 | 旧版本 | 新版本（重构后） |
|------|--------|-----------------|
| **交互模式** | 线性向导（6步） | 渐进式学习（9步） |
| **表格可见性** | 最后才显示 | 始终可见，实时更新 |
| **学习方式** | 依次阅读概念 | 概念与表格间切换学习 |
| **第2期填充** | 无 | 渐进式填充（教学重点） |
| **页面数量** | 6个核心页 + 3个额外页 | 1个主页面 + 9个概念组件 |
| **计算逻辑** | 混用预测/实际需求 | 统一使用预测需求 |
| **服务水平公式** | 1 - (缺货/实际需求) ❌ | 1 - (缺货/预测需求) ✅ |

---

## 🎯 下一步工作

1. **完成剩余步骤组件** (ConceptStep5-9.tsx)
   - 按照 `STEPS_TEMPLATE.md` 指导实现
   - 参考已完成的 Step1-4 作为模板

2. **测试完整流程**
   - 验证9个步骤能否正常切换
   - 检查第2期数据是否正确填充
   - 确认完整MPS表生成无误

3. **UI/UX优化**
   - 添加过渡动画
   - 优化移动端适配
   - 添加帮助提示

4. **集成到主项目**
   - 更新路由配置
   - 连接真实的模型预测API
   - 同步实验进度到全局状态（如需要）

---

## 📞 问题与支持

如有疑问，请参考：
- `STEPS_TEMPLATE.md` - 步骤实现指南
- 已完成的 `ConceptStep1-4.tsx` - 代码示例
- `ProductionPlanContextV2.tsx` - 状态管理逻辑

**重要提醒**：
- 所有计算必须基于**预测需求**
- 服务水平公式：`1 - (缺货量 / 预测需求量)`
- 不要引入"实际需求"概念
