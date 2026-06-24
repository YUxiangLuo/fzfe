export type ProgressStatus = "Not Started" | "In Progress" | "Completed";
export type SortOrder = "ascend" | "descend" | null | undefined;

export const compareNaturalText = (
  a: string | null | undefined,
  b: string | null | undefined,
): number => (a ?? "").localeCompare(b ?? "", undefined, {
  numeric: true,
  sensitivity: "base",
});

const PROGRESS_STATUS_ORDER: Record<ProgressStatus, number> = {
  "Not Started": 0,
  "In Progress": 1,
  Completed: 2,
};

export const compareNullableNumber = (
  a: number | null | undefined,
  b: number | null | undefined,
  sortOrder?: SortOrder,
): number => {
  if (a === null || a === undefined) {
    if (b === null || b === undefined) {
      return 0;
    }
    return sortOrder === "descend" ? -1 : 1;
  }
  if (b === null || b === undefined) {
    return sortOrder === "descend" ? 1 : -1;
  }
  return a - b;
};

export const normalizeProgressStatus = (
  status: string | null | undefined,
): ProgressStatus => {
  if (status === "Completed" || status === "In Progress" || status === "Not Started") {
    return status;
  }

  return "Not Started";
};

export const compareProgressStatus = (
  a: string | null | undefined,
  b: string | null | undefined,
): number => {
  return PROGRESS_STATUS_ORDER[normalizeProgressStatus(a)] - PROGRESS_STATUS_ORDER[normalizeProgressStatus(b)];
};
