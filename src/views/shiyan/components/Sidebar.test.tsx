/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let experimentValue = {
  state: {
    current_step: 3,
    highest_completed_step: 2,
  },
  ui: {
    isTrainingLocked: false,
  },
  isStepCompleted: (step: number) => step <= 2,
  isStepUnlocked: (step: number) => step <= 4,
};

mock.module(
  "/home/alice/pros/fangzhen/fe/src/views/shiyan/contexts/ExperimentContext.zustand.tsx",
  () => ({
    useExperiment: () => experimentValue,
  }),
);

const renderSidebar = async (initialEntry = "/product") => {
  const { default: Sidebar } = await import("./Sidebar");
  let view!: RenderResult;

  await act(async () => {
    view = render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Sidebar />
      </MemoryRouter>
    );
  });

  return view;
};

describe("Sidebar", () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    experimentValue = {
      state: {
        current_step: 3,
        highest_completed_step: 2,
      },
      ui: {
        isTrainingLocked: false,
      },
      isStepCompleted: (step: number) => step <= 2,
      isStepUnlocked: (step: number) => step <= 4,
    };
  });

  afterEach(async () => {
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it("renders completed, current, available, and locked steps with progress", async () => {
    view = await renderSidebar("/product");

    expect(view.getByText("步骤 1")).toBeDefined();
    expect(view.getByText("步骤 7")).toBeDefined();
    expect(view.getByText("2/7")).toBeDefined();

    const links = view.getAllByRole("link");
    const linkedTexts = links.map((node) => node.textContent?.replace(/\s+/g, "") ?? "");
    expect(linkedTexts).toContain("步骤1选择行业");
    expect(linkedTexts).toContain("步骤3选择产品");
    expect(linkedTexts).toContain("步骤4历史数据");
    expect(linkedTexts.some((text) => text.includes("步骤5需求预测"))).toBe(false);

    const progressBar = view.container.querySelector(
      ".bg-gradient-to-r.from-blue-400.to-blue-600",
    ) as HTMLDivElement | null;
    expect(progressBar?.style.width).toBe(`${(2 / 7) * 100}%`);
  });

  it("disables all step navigation while training is locked", async () => {
    experimentValue = {
      ...experimentValue,
      ui: {
        isTrainingLocked: true,
      },
      isStepUnlocked: () => true,
    };

    view = await renderSidebar("/company");

    expect(view.queryAllByRole("link")).toHaveLength(0);

    const wrappersWithTitle = view.container.querySelectorAll(
      '[title="融合模型训练进行中，请等待当前训练完成后再离开此页面"]',
    );
    expect(wrappersWithTitle).toHaveLength(7);
  });
});