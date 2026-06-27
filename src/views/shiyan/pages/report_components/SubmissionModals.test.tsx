/// <reference types="bun-types" />
/// <reference lib="dom" />

import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
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
