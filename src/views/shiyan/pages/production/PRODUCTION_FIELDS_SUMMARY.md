# Production Planning 全局状态字段总结

## 📋 最终的 production_* 字段列表

### 基础字段（共 7 个）

| 字段名 | 类型 | 说明 | 来源 |
|--------|------|------|------|
| `production_plan_completed` | `boolean` | 生产计划是否完成 | 步骤9完成时设为 true |
| `production_forecast_periods` | `number \| null` | 预测期数 | 步骤1学生输入（默认6） |
| `production_initial_inventory` | `number \| null` | 期初库存 | 步骤1学生输入（默认100） |
| `production_target_service_level` | `number \| null` | 目标服务水平 | 步骤1学生选择（0.90/0.95/0.98/0.99） |
| `production_safety_stock_z_score` | `number \| null` | 安全库存Z值 | 根据服务水平自动计算 |
| `production_forecast_results` | `Array<{ prediction: number; std_dev: number }> \| null` | API返回的预测数据 | 步骤9调用 `/model/predict` 获取 |
| `production_mps_table` | `MPSTableRow[]` | 完整的MPS表格 | 步骤9根据预测结果生成 |

### 🆕 产能约束字段（共 4 个 - 重构后新增）

| 字段名 | 类型 | 说明 | 来源 |
|--------|------|------|------|
| `production_capacity_mode` | `'scenario' \| 'auto' \| 'custom' \| null` | 产能计算模式 | 步骤1学生选择/系统设置 |
| `production_capacity_scenario` | `'tight' \| 'normal' \| 'abundant' \| null` | 产能场景 | 步骤1学生选择（scenario模式） |
| `production_capacity` | `number \| null` | 实际产能值（件/期） | 根据模式和场景计算 |
| `production_custom_capacity` | `number \| null` | 自定义产能 | 步骤1学生输入（custom模式） |

---

## 📊 字段详细说明

### 1. production_plan_completed
- **初始值**: `false`
- **更新时机**: 步骤9生成完整MPS表后
- **用途**: 标记生产计划步骤是否完成

### 2. production_forecast_periods
- **初始值**: `null`
- **更新时机**: 步骤1完成时
- **典型值**: 6
- **用途**: 确定预测和计划的期数

### 3. production_initial_inventory
- **初始值**: `null`
- **更新时机**: 步骤1完成时
- **典型值**: 100
- **用途**: MPS表第一期的期初库存

### 4. production_target_service_level
- **初始值**: `null`
- **更新时机**: 步骤1完成时
- **可选值**: 0.90, 0.95, 0.98, 0.99
- **用途**: 确定安全库存的计算标准

### 5. production_safety_stock_z_score
- **初始值**: `null`
- **更新时机**: 步骤1根据服务水平自动计算
- **映射关系**:
  - 90% → 1.28
  - 95% → 1.65
  - 98% → 2.05
  - 99% → 2.33
- **用途**: 计算安全库存 = Z值 × 标准差

### 6. production_forecast_results
- **初始值**: `null`
- **更新时机**: 步骤9调用预测API后
- **数据结构**:
  ```typescript
  [
    { prediction: 52193.16, std_dev: 2609.66 },
    { prediction: 70127.99, std_dev: 3506.40 },
    // ...
  ]
  ```
- **用途**: 保存原始预测数据，用于报告和审计

### 7. production_mps_table
- **初始值**: `[]`
- **更新时机**: 步骤9生成完整MPS表后
- **数据结构**:
  ```typescript
  interface MPSTableRow {
    period: number;                // 期数
    period_label: string;          // 期数标签（如"期 1"）
    demand_forecast: number;       // 预测需求
    safety_stock: number;          // 安全库存
    planned_production: number;    // 计划生产量
    beginning_inventory: number;   // 期初库存
    production_output: number;     // 产出量（应用产能约束后）
    ending_inventory: number;      // 期末库存
    stockout: number;              // 缺货量
    service_level: number;         // 服务水平（0-1）
  }
  ```
- **用途**: 实验报告展示、数据分析

### 8. production_capacity_mode 🆕
- **初始值**: `null`
- **更新时机**: 步骤1完成时
- **可选值**:
  - `'scenario'`: 场景选择模式（当前实现）
  - `'auto'`: 自动计算模式（保留）
  - `'custom'`: 自定义输入模式（保留）
- **用途**: 确定产能计算方式

### 9. production_capacity_scenario 🆕
- **初始值**: `null`
- **更新时机**: 步骤1学生选择场景时
- **可选值**:
  - `'tight'`: 产能紧张（平均需求 × 110%）
  - `'normal'`: 产能正常（平均需求 × 130%，推荐）
  - `'abundant'`: 产能充裕（平均需求 × 150%）
- **用途**: scenario 模式下确定产能倍数
- **示例**:
  - 平均需求 = 1,050 件/期
  - normal 场景 → 产能 = 1,365 件/期

### 10. production_capacity 🆕
- **初始值**: `null`
- **更新时机**: 步骤1根据模式和场景计算
- **计算方式**:
  - scenario 模式: `平均需求 × 场景倍数`
  - auto 模式: 智能算法（基于平均和峰值需求）
  - custom 模式: 使用 `production_custom_capacity`
- **用途**: 所有产出量计算使用此值作为上限
- **公式**: `产出量 = min(生产投入量, production_capacity)`

### 11. production_custom_capacity 🆕
- **初始值**: `null`
- **更新时机**: custom 模式下学生输入
- **用途**: 高级用户自定义产能值
- **当前状态**: 功能已预留，UI未实现

---

## 🔄 数据流程

```
步骤1: 参数设置
├─ 学生输入预测期数 → production_forecast_periods
├─ 学生输入期初库存 → production_initial_inventory
├─ 学生选择服务水平 → production_target_service_level
├─ 自动计算Z值 → production_safety_stock_z_score
├─ 学生选择产能场景 → production_capacity_scenario
├─ 设置产能模式 → production_capacity_mode = 'scenario'
└─ 计算产能 → production_capacity = 平均需求 × 1.3

步骤2-8: 渐进式学习
└─ 使用演示数据填充第2期

步骤9: 生成完整MPS
├─ 调用 /model/predict API
├─ 获取预测数据 → production_forecast_results
├─ 生成MPS表（应用产能约束）→ production_mps_table
├─ 标记完成 → production_plan_completed = true
└─ 保存所有字段到全局状态

步骤9完成按钮
├─ 更新进度 → highest_completed_step = 7, current_step = 8
└─ 导航到生产计划测验
```

---

## 📝 使用场景

### 1. 实验报告生成
**使用字段**: 全部 11 个字段

报告内容示例：
```
生产计划参数配置
├─ 预测期数: 6
├─ 期初库存: 100
├─ 目标服务水平: 95%
├─ 安全库存系数: 1.65
└─ 产能配置: 产能正常 (1,365 件/期)

主生产计划表（MPS）
[显示 production_mps_table 的完整数据]

计划摘要
├─ 总预测需求: 315,936 件
├─ 平均服务水平: 96.8%
├─ 产能利用率: 76.3%
└─ 总缺货次数: 1 次
```

### 2. 步骤进度跟踪
**使用字段**: `production_plan_completed`

- 用于判断步骤7是否完成
- 控制测验页面的访问权限

### 3. 教学分析
**使用字段**: 全部字段

教师可以分析：
- 学生的参数选择是否合理
- 产能配置对服务水平的影响
- 不同产能场景下的结果对比

---

## 🔧 重置逻辑

### resetModelingFields() 函数中的重置
当以下情况发生时，所有 production_* 字段重置为初始值：
- 重新选择行业
- 重新选择公司
- 重新选择产品
- 修改数据窗口

### resetProductionPlanFields() 函数中的重置
当以下情况发生时，所有 production_* 字段重置为初始值：
- 重新选择最佳模型

---

## ✅ 完整性检查

### 必须字段（7个基础字段）
- [x] production_plan_completed
- [x] production_forecast_periods
- [x] production_initial_inventory
- [x] production_target_service_level
- [x] production_safety_stock_z_score
- [x] production_forecast_results
- [x] production_mps_table

### 🆕 新增字段（4个产能字段）
- [x] production_capacity_mode
- [x] production_capacity_scenario
- [x] production_capacity
- [x] production_custom_capacity

### 已更新位置
- [x] ExperimentContext.tsx - 接口定义
- [x] ExperimentContext.tsx - 初始化
- [x] ExperimentContext.tsx - resetModelingFields 函数
- [x] ExperimentContext.tsx - resetProductionPlanFields 函数
- [x] ConceptStep9.tsx - 保存逻辑
- [x] 所有7个模型页面 - 重置逻辑

---

## 🎯 总结

**总计**: 11 个 production_* 字段
- **基础字段**: 7 个（原有）
- **产能字段**: 4 个（🆕 重构新增）

**状态**: ✅ 全部实现并测试通过

**特点**:
1. 完整记录学生的决策过程
2. 支持实验报告生成
3. 保留未来扩展能力（auto/custom 模式）
4. 与生产计划模块解耦（读写分离）

---

**文档创建时间**: 2025-10-30
**最后更新**: 2025-10-30
