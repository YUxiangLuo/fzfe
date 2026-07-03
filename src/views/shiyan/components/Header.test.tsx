/// <reference types="bun-types" />
/// <reference lib="dom" />

import { resolve } from "path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const apiGet = mock(async (): Promise<any> => ({
  user_id: 1,
  username: "alice",
  full_name: "Alice",
  email: "alice@example.com",
  role: "Student",
  created_at: "2026-03-08T00:00:00Z",
  must_change_password: false,
}));

let experimentValue = {
  ui: {
    isTrainingLocked: false,
  },
};

const confirmMock = mock(async () => false);

mock.module(r("../../../utils/apiClient.ts"), () => ({
  apiClient: {
    get: apiGet,
  },
}));

mock.module(
  r("../contexts/ExperimentContext.zustand.tsx"),
  () => ({
    useExperiment: () => experimentValue,
  }),
);

mock.module(
  r("../shared/contexts/ConfirmContext.tsx"),
  () => ({
    useConfirm: () => ({ confirm: confirmMock }),
  }),
);

const renderHeader = async (initialEntry = "/industry") => {
  const modulePath = "./Header?header-component-test";
  const { default: Header } = await import(modulePath) as typeof import("./Header");
  let view!: ReturnType<typeof render>;

  await act(async () => {
    view = render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Header />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return view;
};

describe("Header", () => {
  beforeEach(() => {
    experimentValue = {
      ui: {
        isTrainingLocked: false,
      },
    };
    apiGet.mockReset();
    apiGet.mockResolvedValue({
      user_id: 1,
      username: "alice",
      full_name: "Alice",
      email: "alice@example.com",
      role: "Student",
      created_at: "2026-03-08T00:00:00Z",
      must_change_password: false,
    });
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(false);
  });

  afterEach(() => {
    mock.clearAllMocks();
  });

  it("loads the current user and shows the password-change prompt when required", async () => {
    apiGet.mockResolvedValueOnce({
      user_id: 1,
      username: "alice",
      full_name: "Alice",
      email: "alice@example.com",
      role: "Student",
      created_at: "2026-03-08T00:00:00Z",
      must_change_password: true,
    });

    const view = await renderHeader("/model?tab=metrics#summary");

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/users/me");
    });
    await waitFor(() => {
      expect(view.getByText("alice").textContent).toBe("alice");
    });

    expect(view.getByText("学生").textContent).toBe("学生");
    expect(view.getByText("请尽快修改初始密码").textContent).toBe("请尽快修改初始密码");
  });

  it("prevents navigation and logout while training is locked", async () => {
    experimentValue = {
      ui: {
        isTrainingLocked: true,
      },
    };

    const view = await renderHeader();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/users/me");
    });

    const introLink = view.getByRole("link", { name: "实验介绍" });
    const logoutButton = view.getByRole("button");

    expect(introLink.getAttribute("aria-disabled")).toBe("true");
    expect(introLink.getAttribute("title")).toContain("模型训练进行中");
    expect((logoutButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(logoutButton);

    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("asks for confirmation before logging out when training is not locked", async () => {
    const view = await renderHeader();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/users/me");
    });

    const logoutButton = view.getByRole("button");

    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledTimes(1);
    });

    expect(confirmMock).toHaveBeenCalledWith({
      title: "确认退出",
      message: "您确定要退出系统吗？未保存的实验进度可能会丢失。",
      confirmText: "退出",
      cancelText: "取消",
      variant: "danger",
    });
  });
});
