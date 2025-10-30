# 生产计划学习步骤组件模板

## 已完成的步骤

- ✅ ConceptStep1.tsx - MPS概述 + 参数设置
- ✅ ConceptStep2.tsx - 第1列：预测需求
- ✅ ConceptStep3.tsx - 第2列：安全库存

## 待实现的步骤模板

### ConceptStep4.tsx - 第3列：计划生产量

**概念**：计划生产量 = 预测需求 + 安全库存

**填充字段**：`fillPeriod2Field('plannedProduction', value)`

**计算逻辑**：
```typescript
const plannedProduction = (state.period2Data.demandForecast || 0) + (state.period2Data.safetyStock || 0);
```

**关键点**：
- 展示公式：计划生产 = 需求预测 + 安全库存
- 说明为什么要这样计算（既满足需求又有缓冲）
- 填充第2期第3列

---

### ConceptStep5.tsx - 第4列：期初库存

**概念**：每期的期初库存 = 上期的期末库存

**填充字段**：`fillPeriod2Field('beginningInventory', value)`

**计算逻辑**：
```typescript
const beginningInventory = state.initialInventory; // 第2期的期初库存就是设置的期初库存
```

**关键点**：
- 解释库存的连续性
- 第2期特殊：直接使用用户设置的期初库存
- 填充第2期第4列

---

### ConceptStep6.tsx - 第5列：产出量

**概念**：生产投入量 = 计划生产 - 期初库存 + 上期缺货

**填充字段**：`fillPeriod2Field('productionOutput', value)`

**计算逻辑**：
```typescript
const plannedProduction = state.period2Data.plannedProduction || 0;
const beginningInventory = state.period2Data.beginningInventory || 0;
const previousStockout = 0; // 第2期没有上期缺货

const productionOutput = Math.max(0, plannedProduction - beginningInventory + previousStockout);
```

**关键点**：
- 解释投入量的计算逻辑
- 说明为什么要考虑期初库存和上期缺货
- 填充第2期第5列

---

### ConceptStep7.tsx - 第6列：期末库存

**概念**：期末库存 = 期初库存 + 产出量 - 预测需求

**填充字段**：`fillPeriod2Field('endingInventory', value)`

**计算逻辑**：
```typescript
const beginningInventory = state.period2Data.beginningInventory || 0;
const productionOutput = state.period2Data.productionOutput || 0;
const demandForecast = state.period2Data.demandForecast || 0;

let endingInventory = beginningInventory + productionOutput - demandForecast;
let stockout = 0;

if (endingInventory < 0) {
  stockout = Math.abs(endingInventory);
  endingInventory = 0;
}

fillPeriod2Field('endingInventory', endingInventory);
// 同时填充缺货（如果有）
if (stockout > 0) {
  fillPeriod2Field('stockout', stockout);
}
```

**关键点**：
- 展示库存平衡公式
- 说明负库存的含义（缺货）
- 同时处理缺货情况
- 填充第2期第6列和第7列

---

### ConceptStep8.tsx - 第7-8列：缺货与服务水平

**概念**：服务水平 = 1 - (缺货量 / 预测需求量)

**填充字段**：`fillPeriod2Field('serviceLevel', value)`

**计算逻辑**：
```typescript
const demandForecast = state.period2Data.demandForecast || 0;
const stockout = state.period2Data.stockout || 0;

const serviceLevel = demandForecast > 0 ? 1 - (stockout / demandForecast) : 1;

fillPeriod2Field('serviceLevel', serviceLevel);
```

**关键点**：
- **重要修正**：服务水平基于**预测需求**，不是"实际需求"
- 解释服务水平的含义（满足率）
- 展示公式和计算过程
- 填充第2期第8列

**统一逻辑**：
- 所有计算都基于**预测数据**（预测需求）
- 不引入"实际需求"的概念
- 这是事前计划逻辑，不是事后统计

---

### ConceptStep9.tsx - 生成完整计划

**功能**：调用API生成所有期的完整MPS表

**操作**：
1. 调用 `POST /model/predict` 获取所有期的预测结果
2. 调用 `generateFullMPS(predictions)` 生成完整表格
3. 显示汇总统计和完成消息
4. 提供导航到测验的按钮

**计算逻辑**：
```typescript
const handleGenerate = async () => {
  // 1. 调用API获取预测
  const response = await apiClient.post('/model/predict', {
    model_type: mapModelType(state.selectedBestModel),
    forecast_steps: state.forecastPeriods,
  });

  // 2. 生成完整MPS
  generateFullMPS(response.results.predictions);

  // 3. 显示成功消息
};
```

**关键点**：
- 展示学习总结
- 提供完整计划生成按钮
- 显示汇总统计（总需求、平均服务水平等）
- 完成后可以导航到下一环节

---

## 实现指南

每个步骤组件应包含：

1. **标题区域**：图标 + 标题 + 副标题
2. **概念说明**：用颜色框突出显示概念定义
3. **计算公式**（如果有）：用代码框或公式框展示
4. **计算结果展示**：大字号显示计算结果 + CheckCircle图标
5. **提示框**：引导学生查看右侧表格的对应位置
6. **下一步按钮**：调用 `completeCurrentStep()`

## 统一样式规范

- 标题区：12px圆角，flex布局，图标+文字
- 概念框：蓝色/绿色/橙色背景，带边框
- 计算框：白色背景，灰色边框，居中对齐
- 按钮：全宽，圆角，带图标，hover效果

## 数据流

```
用户点击"下一步"
  → completeCurrentStep()
  → currentStep++, completedSteps.push(currentStep)
  → 下一个ConceptStep组件加载
  → useEffect自动计算并填充对应字段
  → fillPeriod2Field(field, value)
  → 右侧表格自动更新显示
```

## 关键修正点（针对客户反馈）

1. ✅ **渐进式流程**：不是线性向导，而是在概念和表格间切换学习
2. ✅ **表格始终可见**：右侧MPS表格固定显示，实时更新
3. ✅ **第2期渐进式填充**：每学一个概念，填充一列
4. ✅ **统一计算逻辑**：所有计算基于**预测需求**，移除"实际需求"
5. ✅ **移除多余页面**：不再有独立的参数设置页、中间结果表页、参数总结页
