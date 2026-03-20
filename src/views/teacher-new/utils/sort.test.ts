import { describe, expect, it } from "bun:test";

import {
  compareNullableNumber,
  compareProgressStatus,
  normalizeProgressStatus,
} from "./sort";

describe("compareNullableNumber", () => {
  it("keeps real zero scores ahead of null values in ascending order", () => {
    const sorted = [null, 0, 80, null, 60].sort(compareNullableNumber);

    expect(sorted).toEqual([0, 60, 80, null, null]);
  });

  it("keeps null values at the end in descending order with Ant Design sorter semantics", () => {
    const sorted = [null, 0, 80, null, 60].sort((a, b) =>
      -compareNullableNumber(a, b, "descend"),
    );

    expect(sorted).toEqual([80, 60, 0, null, null]);
  });

  it("treats two null values as equal", () => {
    expect(compareNullableNumber(null, null)).toBe(0);
  });
});

describe("normalizeProgressStatus", () => {
  it("maps null status to Not Started", () => {
    expect(normalizeProgressStatus(null)).toBe("Not Started");
  });

  it("preserves known status values", () => {
    expect(normalizeProgressStatus("In Progress")).toBe("In Progress");
    expect(normalizeProgressStatus("Completed")).toBe("Completed");
  });
});

describe("compareProgressStatus", () => {
  it("treats null and explicit Not Started as the same status bucket", () => {
    expect(compareProgressStatus(null, "Not Started")).toBe(0);
  });

  it("orders Not Started before In Progress and Completed", () => {
    expect(compareProgressStatus(null, "In Progress")).toBeLessThan(0);
    expect(compareProgressStatus("Not Started", "Completed")).toBeLessThan(0);
  });
});
