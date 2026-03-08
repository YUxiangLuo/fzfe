export const STUDENT_USERNAME =
  process.env.E2E_STUDENT_USERNAME ?? "20240002";
export const STUDENT_PASSWORD =
  process.env.E2E_STUDENT_PASSWORD ?? "StudentE2E!234";
export const SECONDARY_STUDENT_USERNAME =
  process.env.E2E_SHIYAN_SECONDARY_STUDENT_USERNAME ?? "20240001";
export const SECONDARY_STUDENT_PASSWORD =
  process.env.E2E_SHIYAN_SECONDARY_STUDENT_PASSWORD ?? "StudentE2E!345";

export const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ??
  process.env.E2E_SHIYAN_V2_BACKEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_BACKEND_PORT ?? "54104"}`;

export const SHIYAN_INDUSTRY =
  process.env.E2E_SHIYAN_INDUSTRY ?? "E2E智能制造业";
export const SHIYAN_COMPANY =
  process.env.E2E_SHIYAN_COMPANY ?? "E2E样本企业A";
export const SHIYAN_PRIMARY_PRODUCT =
  process.env.E2E_SHIYAN_PRODUCT_PRIMARY ?? "智能传感器A型";

export const DEFAULT_DATA_WINDOW = {
  trainStart: "0",
  trainEnd: "27",
  evaluateStart: "28",
  evaluateEnd: "35",
} as const;

export const REPORT_ANALYSES = [
  "训练集与评估集区间划分合理，训练集覆盖完整季节波动，评估集用于检验泛化表现。",
  "基础模型与融合模型对比显示融合模型在误差指标上更均衡，稳定性更好。",
  "综合 RMSE、MAE 与 R² 指标，最终选择融合模型以兼顾精度与鲁棒性。",
  "安全库存与预测量计算遵循服务水平约束，能够在需求波动下保持供给连续性。",
  "完整 MPS 结果表明服务水平可接受，缺货周期可控，后续可继续优化产能与库存权衡。",
] as const;
