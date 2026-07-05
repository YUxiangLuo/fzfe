/// <reference types="bun-types" />
/// <reference lib="dom" />

import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { ReportPreviewModal } from "./SubmissionModals";

describe("ReportPreviewModal", () => {
  it("renders generated markdown as a readable report preview", () => {
    const view = render(
      <ReportPreviewModal
        markdown={`# 张三的实验报告\n\n## 报告信息\n\n- **学生姓名**: 张三\n\n| 指标 | 值 |\n|---|---|\n| RMSE | 1.2345 |`}
        isSubmitting={false}
        submitError={null}
        onClose={mock(() => {})}
        onConfirm={mock(() => {})}
      />,
    );

    expect(view.getByRole("heading", { name: "报告预览" })).not.toBeNull();
    expect(view.getByRole("heading", { name: "张三的实验报告" })).not.toBeNull();
    expect(view.getByRole("columnheader", { name: "指标" })).not.toBeNull();
    expect(view.getByRole("cell", { name: "1.2345" })).not.toBeNull();
  });

  it("hides the appendix page-break marker while rendering appendix content", () => {
    const view = render(
      <ReportPreviewModal
        markdown={`## 六、知识测验答题记录

暂无答题记录

<div class="report-appendix-break"></div>

## 附录：原始销量明细

### A.1 训练集完整明细
| 月份 | 销量 |
|---|---|
| 2024-01 | 100 |`}
        isSubmitting={false}
        submitError={null}
        onClose={mock(() => {})}
        onConfirm={mock(() => {})}
      />,
    );

    expect(view.queryByText(/report-appendix-break/)).toBeNull();
    expect(view.getByRole("heading", { name: "附录：原始销量明细" })).not.toBeNull();
    expect(view.getByRole("heading", { name: "A.1 训练集完整明细" })).not.toBeNull();
    expect(view.getByRole("cell", { name: "2024-01" })).not.toBeNull();
    expect(view.getByRole("cell", { name: "100" })).not.toBeNull();
  });

  it("keeps escaped table pipes inside quiz detail cells and wraps long columns", () => {
    const view = render(
      <ReportPreviewModal
        markdown={`## 六、知识测验答题记录

| 序号 | 题目 | 题型 | 学生答案 | 正确答案 | 结果 |
|------|------|------|----------|----------|------|
| 1 | RMSE \\| MAE<br>哪个越小越好？ | 单选题 | A. 越大越好 | B. 越小\\|越好 | 错误 |`}
        isSubmitting={false}
        submitError={null}
        onClose={mock(() => {})}
        onConfirm={mock(() => {})}
      />,
    );

    const questionCell = view.getByRole("cell", { name: /RMSE \| MAE/ });
    expect(questionCell).not.toBeNull();
    expect(questionCell.textContent).toContain("哪个越小越好？");
    expect(view.getByRole("cell", { name: "B. 越小|越好" })).not.toBeNull();

    const quizRow = questionCell.closest("tr");
    expect(quizRow).not.toBeNull();
    expect(within(quizRow!).getAllByRole("cell")).toHaveLength(6);
    expect(questionCell.className).toContain("whitespace-normal");
  });

  it("requires explicit confirmation before submitting", () => {
    const onClose = mock(() => {});
    const onConfirm = mock(() => {});

    const view = render(
      <ReportPreviewModal
        markdown="# 实验报告"
        isSubmitting={false}
        submitError={null}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "返回修改" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(0);

    fireEvent.click(view.getByRole("button", { name: "确认无误，提交报告" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
