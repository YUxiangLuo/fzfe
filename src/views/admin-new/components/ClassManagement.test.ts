/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { formatNullableClassText, matchesClassSearch } from "./ClassManagement";

describe("admin ClassManagement search helpers", () => {
  it("handles classes with a null class code without crashing", () => {
    const classInfo = {
      class_name: "QA空编号班级",
      class_code: null,
    };

    expect(matchesClassSearch(classInfo, "QA")).toBe(true);
    expect(matchesClassSearch(classInfo, "ZZZ")).toBe(false);
  });

  it("matches class code when present and treats empty search as all classes", () => {
    const classInfo = {
      class_name: "并发实验测试班",
      class_code: "PARALLEL-SHIYAN-2026",
    };

    expect(matchesClassSearch(classInfo, "shiyan")).toBe(true);
    expect(matchesClassSearch(classInfo, "  ")).toBe(true);
  });

  it("formats missing class code as a dash", () => {
    expect(formatNullableClassText(null)).toBe("-");
    expect(formatNullableClassText("   ")).toBe("-");
    expect(formatNullableClassText("A-001")).toBe("A-001");
  });
});
