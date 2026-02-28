# Shiyan E2E 过程记录

## 当前发现的可修复/优化点

（暂无）

## 已关闭项

| # | 问题 | 处置 | 理由 |
|---|------|------|------|
| 1 | 缺少 `data-testid` | 不修复 | role/text 选择器 + `clickLastEnabledButton` 已覆盖 |
| 2 | 生产情景页轮播图门槛 | 不修复 | E2E 通过 `.swiper-button-next-custom` 可操作 |
| 3 | 报告提交后清 token 倒计时登出 | 不修复 | 属设计意图，E2E 已适配 |
| 4 | 生产计划缺统一状态标识 | 不修复 | E2E 等最终结果文案即可，无稳定性问题 |
| 5 | Introduction 两套 logout + console.log | 已修复 | 删除 console.log；两套函数是合理设计（弹窗内免确认） |
| 6 | 模型 CTA 文案不统一 | 不修复 | 文案差异是有意的阶段转换信号，正则已处理 |
| 7 | 融合模型非数值特征容错 | 已修复 | `build_numeric_subprocess_records()` 已过滤类别列 |

## 后续补充方式

- 每次发现会补充：`现象`、`触发步骤`、`建议修复`、`是否影响 E2E 稳定性`。
