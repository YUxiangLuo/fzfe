/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import {
  deriveAcademicTerms,
  formatAcademicTerm,
  formatAcademicYear,
  getAcademicTermKey,
  getClassAcademicTerm,
  parseAcademicTermKey,
} from "./academicTerm";
import type { Class } from "../types";

const classItem = (overrides: Partial<Class>): Class => ({
  class_id: 1,
  class_name: "测试班级",
  class_code: "TEST-001",
  academic_year_start: 2025,
  semester: 1,
  teacher_id: 42,
  ...overrides,
});

describe("academic term utilities", () => {
  it("formats academic year and term labels consistently with selector values", () => {
    const term = { academic_year_start: 2025, semester: 2 };

    expect(formatAcademicYear(2025)).toBe("2025-2026");
    expect(getAcademicTermKey(term)).toBe("2025-2");
    expect(formatAcademicTerm(term)).toBe("2025-2026 学年第 2 学期");
  });

  it("parses persisted academic term keys and rejects malformed or unsupported keys", () => {
    expect(parseAcademicTermKey("2026-1")).toEqual({ academic_year_start: 2026, semester: 1 });

    expect(parseAcademicTermKey("2026")).toBeNull();
    expect(parseAcademicTermKey("abc-1")).toBeNull();
    expect(parseAcademicTermKey("1999-1")).toBeNull();
    expect(parseAcademicTermKey("2101-1")).toBeNull();
    expect(parseAcademicTermKey("2026-3")).toBeNull();
  });

  it("normalizes class rows into academic terms and ignores invalid semester values", () => {
    expect(getClassAcademicTerm(classItem({ academic_year_start: 2024, semester: 1 }))).toEqual({
      academic_year_start: 2024,
      semester: 1,
    });
    expect(getClassAcademicTerm(classItem({ semester: 3 }))).toBeNull();
  });

  it("deduplicates class terms and sorts newest academic year and semester first", () => {
    const terms = deriveAcademicTerms([
      classItem({ class_id: 1, academic_year_start: 2024, semester: 1 }),
      classItem({ class_id: 2, academic_year_start: 2025, semester: 1 }),
      classItem({ class_id: 3, academic_year_start: 2025, semester: 2 }),
      classItem({ class_id: 4, academic_year_start: 2025, semester: 2 }),
      classItem({ class_id: 5, academic_year_start: 2026, semester: 1 }),
      classItem({ class_id: 6, academic_year_start: 2026, semester: 3 }),
    ]);

    expect(terms).toEqual([
      { academic_year_start: 2026, semester: 1 },
      { academic_year_start: 2025, semester: 2 },
      { academic_year_start: 2025, semester: 1 },
      { academic_year_start: 2024, semester: 1 },
    ]);
  });
});
