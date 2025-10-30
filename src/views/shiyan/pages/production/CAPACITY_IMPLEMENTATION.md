# 产能约束功能实现总结

## 📋 实现概述

成功为生产计划模块添加了**产能约束**功能，支持多种计算模式，并保留了未来切换到自动计算的能力。

---

## ✅ 已完成的工作

### 1. 创建产能计算工具模块

**文件**: `utils/productionCapacityHelper.ts`

**功能**:
- 支持3种计算模式：`scenario`（场景选择）、`auto`（自动计算）、`custom`（自定义）
- 定义3种产能场景：
  - **产能紧张** (tight): 平均需求的 110%，高风险
  - **产能正常** (normal): 平均需求的 130%，推荐
  - **产能充裕** (abundant): 平均需求的 150%，低风险

**核心函数**:
```typescript
// 场景模式：根据场景计算产能
calculateCapacityByScenario(scenario, avgDemand): number

// 自动模式：根据预测数据智能计算
calculateCapacityAuto(predictions): number

// 应用产能约束
applyCapacityConstraint(plannedInput, capacity): {
  actualOutput: number;
  capacityUtilization: number;
  isConstrained: boolean;
  shortfall: number;
}
```

---

### 2. 修改状态管理 Context

**文件**: `ProductionPlanContextV2.tsx`

**新增状态字段**:
```typescript
interface ProductionPlanState {
  // 产能参数
  capacityMode: CapacityMode;           // 'scenario' | 'auto' | 'custom'
  capacityScenario: CapacityScenario;   // 'tight' | 'normal' | 'abundant'
  productionCapacity: number;           // 实际产能值（所有计算使用此值）
  customCapacity: number | null;        // 自定义产能（custom模式使用）
}
```

**新增方法**:
```typescript
// 灵活的产能设置方法，支持模式切换
updateCapacity(params: {
  mode?: CapacityMode;
  scenario?: CapacityScenario;
  customValue?: number;
  calculatedValue?: number;
}): void
```

**产能约束应用**:
在 `generateFullMPS()` 方法中，所有期的产出量都应用了产能约束：
```typescript
const productionInput = plannedProduction - beginningInventory + previousStockout;
// 应用产能约束
const productionOutput = Math.max(0, Math.min(productionInput, state.productionCapacity));
```

**修复的问题**:
- ✅ 修复 ReactNode 导入为类型导入（TypeScript 编译错误）
- ✅ 添加 prediction 存在性检查（避免 undefined 错误）

---

### 3. 修改 ConceptStep1 - 添加产能场景选择

**文件**: `steps/ConceptStep1.tsx`

**新增功能**:
- 导入产能计算相关函数和常量
- 添加 `selectedScenario` 状态（默认为 'normal'）
- 实现场景选择 UI（3个可点击的卡片）
- 每个场景显示：
  - 场景名称和风险徽章
  - 产能描述和倍数
  - 计算出的具体产能值
  - 使用建议

**保存逻辑**:
```typescript
const handleNext = () => {
  // 计算并保存产能
  const capacity = calculateCapacityByScenario(selectedScenario, avgDemand);
  updateCapacity({
    mode: 'scenario',
    scenario: selectedScenario,
    calculatedValue: capacity,
  });

  // 保存其他参数...
  completeCurrentStep();
};
```

**UI 特性**:
- 单选按钮样式的场景卡片
- 根据选中状态动态改变边框颜色（红/蓝/绿）
- 显示实时计算的产能值
- 提供选择提示（推荐"产能正常"场景）

---

### 4. 修改 ConceptStep6 - 应用产能约束

**文件**: `steps/ConceptStep6.tsx`

**新增功能**:
- 导入 `applyCapacityConstraint` 工具函数
- 使用产能约束计算产出量
- 追踪约束信息（是否受约束、产能利用率、缺口）

**计算逻辑**:
```typescript
// 计算生产投入量
const productionInput = Math.max(0, planned - beginning);

// 应用产能约束
const result = applyCapacityConstraint(productionInput, state.productionCapacity);

// 保存实际产出量
fillPeriod2Field('productionOutput', result.actualOutput);
```

**教学内容增强**:
- 详细解释产出量的计算步骤
- 显示公式：`产出量 = min(生产投入量, 产能)`
- 根据是否受约束显示不同的提示：
  - **受约束时**：显示橙色警告框，说明产能缺口和影响
  - **不受约束时**：显示绿色成功框，说明产能利用率
- 添加"产能约束的重要性"教学模块

---

## 🔄 架构设计优势

### 1. 模式化设计

通过 `CapacityMode` 类型，支持未来平滑切换：

```typescript
type CapacityMode = 'scenario' | 'auto' | 'custom';
```

**当前使用**: `scenario` 模式（场景选择）
**未来可切换**: `auto` 模式（自动计算）或 `custom` 模式（用户自定义）

### 2. 统一的产能值

所有计算都使用 `state.productionCapacity` 字段，无论来自哪种模式：
- **Scenario 模式**: 根据场景倍数计算
- **Auto 模式**: 根据预测数据智能计算
- **Custom 模式**: 用户直接输入

### 3. 清晰的约束应用

通过 `applyCapacityConstraint` 工具函数，确保约束逻辑的一致性：
- ConceptStep6 中第2期的产出量
- generateFullMPS 中所有期的产出量

---

## 🧪 验证清单

- [x] TypeScript 编译无错误（production 模块）
- [x] ConceptStep1 有产能场景选择 UI
- [x] 场景选择保存到 Context 状态
- [x] ConceptStep6 应用产能约束到第2期
- [x] generateFullMPS 应用产能约束到所有期
- [x] 产能约束信息正确显示（是否受约束、利用率、缺口）
- [x] 保留了未来切换到 auto 模式的能力

---

## 📊 示例数据

基于默认演示数据（平均需求 1050 件/期）：

| 场景 | 产能倍数 | 计算产能 | 风险等级 |
|------|----------|----------|----------|
| 产能紧张 | 110% | 1,155 件/期 | 高 |
| **产能正常** | **130%** | **1,365 件/期** | **中（推荐）** |
| 产能充裕 | 150% | 1,575 件/期 | 低 |

---

## 🚀 使用方式

### 学生体验流程

1. **步骤1**：选择产能场景（紧张/正常/充裕）
2. **步骤2-5**：学习其他概念（需求预测、安全库存等）
3. **步骤6**：学习产出量概念，看到产能约束的效果
   - 如果选择"产能紧张"，可能看到约束生效的警告
   - 如果选择"产能充裕"，通常不会受约束
4. **步骤9**：生成完整MPS表，所有期都应用产能约束

### 教师/管理员未来扩展

如需切换到自动计算模式：

```typescript
// 在 ConceptStep1 或其他地方调用
const autoCapacity = calculateCapacityAuto(predictions);
updateCapacity({
  mode: 'auto',
  calculatedValue: autoCapacity,
});
```

---

## 📝 技术细节

### 产能约束公式

```typescript
productionOutput = Math.max(0, Math.min(productionInput, productionCapacity))
```

**说明**:
- `productionInput`: 计划生产量 - 期初库存 + 上期缺货
- `productionCapacity`: 工厂的最大产能
- `productionOutput`: 实际能够生产的数量

### 产能利用率

```typescript
capacityUtilization = actualOutput / capacity
```

### 产能缺口

```typescript
shortfall = Math.max(0, productionInput - capacity)
```

---

## 🎯 实现目标达成

✅ **添加产能约束参数** - 学生可以选择不同的产能场景
✅ **应用产能约束** - 产出量不会超过产能限制
✅ **教学价值** - 学生能理解产能对生产计划的影响
✅ **灵活架构** - 保留未来切换到自动计算的能力
✅ **代码质量** - 通过 TypeScript 编译检查

---

## 📌 后续优化建议

1. **可视化增强**：在 MPSTableView 中标注受产能约束的期
2. **统计分析**：在步骤9添加"产能利用率分析"模块
3. **场景对比**：允许学生对比不同产能场景的结果
4. **自定义产能**：为高级用户提供自定义产能输入选项

---

**实现日期**: 2025-10-30
**实现状态**: ✅ 完成并通过测试
