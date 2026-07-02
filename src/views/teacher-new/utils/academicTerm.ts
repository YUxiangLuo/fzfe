import type { Class } from '../types';

export interface AcademicTerm {
  academic_year_start: number;
  semester: number;
}

export const getAcademicTermKey = (term: AcademicTerm): string =>
  `${term.academic_year_start}-${term.semester}`;

export const parseAcademicTermKey = (key: string): AcademicTerm | null => {
  const [yearText, semesterText] = key.split('-');
  const academic_year_start = Number(yearText);
  const semester = Number(semesterText);
  if (!Number.isInteger(academic_year_start) || !Number.isInteger(semester)) return null;
  if (academic_year_start < 2000 || academic_year_start > 2100) return null;
  if (semester !== 1 && semester !== 2) return null;
  return { academic_year_start, semester };
};

export const formatAcademicYear = (academicYearStart: number): string =>
  `${academicYearStart}-${academicYearStart + 1}`;

export const formatAcademicTerm = (term: AcademicTerm): string =>
  `${formatAcademicYear(term.academic_year_start)} 学年第 ${term.semester} 学期`;

export const getClassAcademicTerm = (classItem: Pick<Class, 'academic_year_start' | 'semester'>): AcademicTerm | null => {
  const academicYearStart = Number(classItem.academic_year_start);
  const semester = Number(classItem.semester);
  if (!Number.isInteger(academicYearStart) || !Number.isInteger(semester)) return null;
  if (semester !== 1 && semester !== 2) return null;
  return { academic_year_start: academicYearStart, semester };
};

export const deriveAcademicTerms = (classes: Class[]): AcademicTerm[] => {
  const termsByKey = new Map<string, AcademicTerm>();
  classes.forEach((classItem) => {
    const term = getClassAcademicTerm(classItem);
    if (!term) return;
    termsByKey.set(getAcademicTermKey(term), term);
  });

  return Array.from(termsByKey.values()).sort((a, b) => {
    if (a.academic_year_start !== b.academic_year_start) {
      return b.academic_year_start - a.academic_year_start;
    }
    return b.semester - a.semester;
  });
};
