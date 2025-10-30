# 生产计划模块 - 全局状态集成总结

## 📋 集成概述

成功将生产计划模块与全局状态（ExperimentContext）集成，现在使用真实的用户选择的最佳模型进行预测。

---

## ✅ 完成的修改

### 1. **ProductionPlanPageV2.tsx** - 集成全局状态

**修改内容**：
- 导入 `useExperiment` hook
- 从全局状态获取 `selected_best_model`
- 将真实模型传递给 `ProductionPlanProvider`

**代码**：
```typescript
import { useExperiment } from '../../contexts/ExperimentContext';

const ProductionPlanPageV2: React.FC = () => {
  const { state: experimentState, productSalesData } = useExperiment();

  // 从全局状态获取真实模型
  const selectedBestModel = experimentState.selected_best_model || 'lstm';

  // 获取产品信息（用于显示或调试）
  const productInfo = productSalesData?.meta;

  return (
    <ProductionPlanProvider initialModel={selectedBestModel}>
      <ProductionPlanContent />
    </ProductionPlanProvider>
  );
};
```

**数据来源**：
- `experimentState.selected_best_model`: 学生在步骤6（结果评估）选择的最佳模型
- `productSalesData`: 产品销量数据（含元数据）

---

### 2. **ProductionPlanContextV2.tsx** - 接收初始模型参数

**修改内容**：
- 修改 `getDefaultState()` 接受 `initialModel` 参数
- 修改 `ProductionPlanProvider` props 接受 `initialModel`
- 使用传入的模型初始化状态

**代码**：
```typescript
const getDefaultState = (initialModel?: string): ProductionPlanState => {
  return {
    // ...其他字段
    selectedBestModel: initialModel || 'lstm', // 使用传入的真实模型
  };
};

export const ProductionPlanProvider: React.FC<{
  children: ReactNode;
  initialModel?: string;
}> = ({ children, initialModel }) => {
  const [state, setState] = useState<ProductionPlanState>(getDefaultState(initialModel));
  // ...
};
```

**优势**：
- 默认值兼容性：如果未传入模型，使用 'lstm' 作为后备
- 初始化时就使用正确的模型

---

### 3. **ConceptStep9.tsx** - 使用真实模型调用预测API

**修改内容**：
- 添加调试日志，显示使用的模型
- 使用 `state.selectedBestModel`（来自全局状态）
- 改进错误提示

**代码**：
```typescript
const handleGenerate = async () => {
  // 🔧 使用真实的最佳模型（从全局状态获取）
  console.log('📌 使用的最佳模型:', state.selectedBestModel);

  const modelType = MODEL_TYPE_MAP[state.selectedBestModel];
  if (!modelType) {
    throw new Error(`无效的模型类型: ${state.selectedBestModel}`);
  }

  console.log('🚀 调用预测API:', { model_type: modelType, forecast_steps: state.forecastPeriods });

  const response = await apiClient.post('/model/predict', {
    model_type: modelType,
    forecast_steps: state.forecastPeriods,
  });

  // 调试日志...
  generateFullMPS(response.results.predictions);
};
```

**模型映射**：
```typescript
const MODEL_TYPE_MAP: Record<string, string> = {
  'ma': 'ma',                           // 移动平均
  'exp': 'es',                          // 指数平滑
  'arima': 'arima',                     // ARIMA
  'lstm': 'lstm',                       // LSTM
  'ensemble_weighted': 'weighted_average',   // 加权平均集成
  'ensemble_boosting': 'boosting',           // Boosting集成
  'ensemble_stacking': 'stacking',           // Stacking集成
};
```

---

### 4. **ConceptStep2.tsx** - 显示真实模型名称

**修改内容**：
- 根据 `state.selectedBestModel` 显示友好的模型名称

**代码**：
```typescript
<p className="text-sm text-gray-600">
  使用最佳模型（
  {state.selectedBestModel === 'ma' && 'MA 移动平均'}
  {state.selectedBestModel === 'exp' && 'ES 指数平滑'}
  {state.selectedBestModel === 'arima' && 'ARIMA'}
  {state.selectedBestModel === 'lstm' && 'LSTM 长短期记忆网络'}
  {state.selectedBestModel === 'ensemble_weighted' && '加权平均集成'}
  {state.selectedBestModel === 'ensemble_boosting' && 'Boosting 集成'}
  {state.selectedBestModel === 'ensemble_stacking' && 'Stacking 集成'}
  ）预测：
</p>
```

---

## 🔄 数据流程

### 完整数据流：

```
┌─────────────────────────────────────────────────────────────────┐
│ 步骤6: 结果评估 (ResultEvaluation)                              │
│ - 学生对比所有模型的性能指标                                      │
│ - 选择最佳模型并保存到全局状态                                    │
│   experimentState.selected_best_model = 'lstm'                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 步骤7: 生产计划 (ProductionPlanPageV2)                          │
│ - useExperiment() 获取全局状态                                   │
│ - 读取 experimentState.selected_best_model                      │
│ - 传递给 ProductionPlanProvider                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ProductionPlanContextV2                                         │
│ - 初始化 state.selectedBestModel = 真实模型                     │
│ - 所有步骤组件通过 useProductionPlan() 访问                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ConceptStep2: 显示预测需求                                       │
│ - 显示模型名称（如 "LSTM 长短期记忆网络"）                        │
│ - 使用演示数据填充第2期                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ConceptStep9: 生成完整MPS                                        │
│ - 读取 state.selectedBestModel                                  │
│ - 映射为API参数 (MODEL_TYPE_MAP)                                │
│ - 调用 /model/predict 接口                                      │
│ - 生成所有期的MPS表                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 关键集成点

### 1. **全局状态 → 生产计划模块**
```typescript
// ExperimentContext 提供
state.selected_best_model: 'ma' | 'exp' | 'arima' | 'lstm' | 'ensemble_*'
```

### 2. **生产计划模块内部传递**
```typescript
ProductionPlanPageV2
  → ProductionPlanProvider (initialModel prop)
    → ProductionPlanState (selectedBestModel field)
      → ConceptStep2, ConceptStep9 等使用
```

### 3. **API调用**
```typescript
// 前端模型ID → 后端API参数
'lstm' → 'lstm'
'ensemble_weighted' → 'weighted_average'
```

---

## 🐛 调试功能

添加了详细的调试日志，方便追踪数据流：

```typescript
// ConceptStep9.tsx
console.log('📌 使用的最佳模型:', state.selectedBestModel);
console.log('🚀 调用预测API:', { model_type, forecast_steps });
console.log('🔍 API返回的预测数据:', predictions);
console.log('📊 预测期数:', predictions.length);
predictions.forEach((pred, idx) => {
  console.log(`期 ${idx + 1}: 预测值=${pred.prediction}, 标准差=${pred.std_dev}`);
});
```

打开浏览器控制台（F12）即可查看完整的数据流。

---

## ✅ 验证清单

- [x] ProductionPlanPageV2 从 ExperimentContext 获取模型
- [x] ProductionPlanProvider 接收并使用真实模型
- [x] ConceptStep2 显示正确的模型名称
- [x] ConceptStep9 使用真实模型调用预测API
- [x] MODEL_TYPE_MAP 映射所有7种模型类型
- [x] TypeScript 编译无错误
- [x] 添加调试日志便于追踪

---

## 🚀 测试步骤

### 1. 完成前置步骤
- 步骤1-3: 选择行业、公司、产品
- 步骤4: 查看历史数据
- 步骤5: 构建预测模型（至少训练1个模型）
- 步骤6: 选择最佳模型（如 LSTM）

### 2. 进入生产计划页面
- 导航到步骤7
- 打开浏览器控制台（F12）

### 3. 验证模型传递
- 查看步骤2，应显示：`使用最佳模型（LSTM 长短期记忆网络）预测：`
- 控制台应显示：`📌 使用的最佳模型: lstm`

### 4. 测试API调用
- 完成步骤1-8
- 在步骤9点击"生成完整计划表"
- 控制台应显示：
  ```
  📌 使用的最佳模型: lstm
  🚀 调用预测API: { model_type: 'lstm', forecast_steps: 6 }
  🔍 API返回的预测数据: [...]
  ```
- 检查MPS表数据是否合理

---

## 📝 注意事项

### 1. **后备默认值**
如果全局状态中没有 `selected_best_model`（如直接访问生产计划页面），会使用 `'lstm'` 作为默认模型。

### 2. **忽略 production_* 字段**
按照要求，不使用全局状态中的 `production_forecast_periods`、`production_initial_inventory` 等字段，这些参数由用户在步骤1中输入。

### 3. **数据验证**
已在 `ProductionPlanContextV2.tsx` 的 `generateFullMPS()` 中添加 `std_dev` 验证逻辑，自动处理异常数据。

---

## 🎉 总结

生产计划模块已成功与全局状态集成：
- ✅ 使用真实的用户选择的最佳模型
- ✅ 保持了模块的独立性和灵活性
- ✅ 添加了完善的调试功能
- ✅ 保持了向后兼容性（默认值机制）

学生的完整学习路径：选择模型 → 评估性能 → 选最佳 → 制定生产计划，数据流畅无缝！

---

**实现日期**: 2025-10-30
**实现状态**: ✅ 完成并通过测试
