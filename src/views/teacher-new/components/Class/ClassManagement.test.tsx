/// <reference types="bun-types" />
/// <reference lib="dom" />

import { resolve } from "node:path";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Modal } from "antd";
import type { Class } from "../../types";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const managedClasses: Class[] = [
  {
    class_id: 501,
    class_name: "供应链管理 2025 春",
    class_code: "SCM-2025-S",
    academic_year_start: 2025,
    semester: 2,
    teacher_id: 42,
    teacher_name: "王老师",
    created_at: "2026-03-01T00:00:00Z",
    assistants: [],
  },
];

const apiDelete = mock(async () => ({ message: "班级删除成功" }));
const listManagedClasses = mock(async () => managedClasses);
const refreshTerms = mock(() => {});
const confirmMock = mock((options: { onOk?: () => void | Promise<void> }) => {
  void options.onOk?.();
  return { destroy() {}, update() {} };
});

mock.module(r("../../../../utils/apiClient.ts"), () => ({
  apiClient: {
    delete: apiDelete,
    get: mock(async () => ({})),
    postFormData: mock(async () => ({})),
    put: mock(async () => ({})),
  },
}));

mock.module(r("../../utils/portalApi.ts"), () => ({
  getTeacherPortalUserOrThrow: () => ({
    sub: 42,
    username: "teacher42",
    role: "Teacher",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  }),
  isAssistantTeacherPortalUser: () => false,
  listManagedClasses,
}));

mock.module(r("../../contexts/AcademicTermContext.tsx"), () => ({
  useAcademicTerm: () => ({
    availableTerms: [{ academic_year_start: 2025, semester: 2 }],
    selectedTerm: { academic_year_start: 2025, semester: 2 },
    selectedTermKey: "2025-2",
    setSelectedTermKey: mock(() => {}),
    isLoadingTerms: false,
    refreshTerms,
  }),
}));

const loadClassManagement = async () => {
  (Modal as unknown as { confirm: typeof confirmMock }).confirm = confirmMock;
  const { default: ClassManagement } = await import(`${r("./ClassManagement.tsx")}?class-management-delete-refresh-test`);
  return ClassManagement;
};

describe("teacher ClassManagement academic term refresh", () => {
  beforeEach(() => {
    apiDelete.mockReset();
    apiDelete.mockResolvedValue({ message: "班级删除成功" });
    listManagedClasses.mockReset();
    listManagedClasses.mockResolvedValue(managedClasses);
    refreshTerms.mockClear();
    confirmMock.mockClear();
  });

  it("refreshes the global academic-term selector after deleting a class", async () => {
    const ClassManagement = await loadClassManagement();
    let view!: ReturnType<typeof render>;

    await act(async () => {
      view = render(<ClassManagement />);
    });

    await waitFor(() => {
      expect(view.getByText("供应链管理 2025 春")).toBeTruthy();
    });

    fireEvent.click(view.getByRole("button", { name: /删除/ }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(apiDelete).toHaveBeenCalledWith("/classes/501");
      expect(refreshTerms).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(view.queryByText("供应链管理 2025 春")).toBeNull();
    });
  });
});
