/**
 * Shared TypeScript types for E2E tests
 */

import type { Page } from "@playwright/test";

// ===== API Response Types =====

export interface ApiResponse<T> {
  data: T;
  message?: string;
  code?: number;
}

export interface CurrentUserProfile {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
}

export interface ManagedClassRecord {
  class_id: number;
  class_name: string;
  class_code: string | null;
  term_id?: number;
  term_label?: string;
  academic_year?: string;
  semester?: 1 | 2;
  is_current_term?: boolean;
}

export interface AcademicTermRecord {
  term_id: number;
  academic_year: string;
  semester: 1 | 2;
  term_label: string;
  is_active: boolean;
  class_count?: number;
}

// ===== Teacher/Class Types =====

export interface TeacherClassSummary {
  class_id: number;
  class_name: string;
  total_students: number;
  graded_count: number;
  submitted_count: number;
  rejected_count: number;
  not_submitted_count: number;
  average_score: number | null;
}

export interface GradeSummaryRow {
  username: string;
  full_name: string;
  final_score: number | null;
  report_status?: string | null;
}

// ===== Experiment Types =====

export interface ExperimentReport {
  user_id: number;
  username: string;
  full_name: string;
  report_id: number | null;
  experiment_id: number | null;
  status?: "submitted" | "graded" | "rejected";
  submitted_at: string | null;
  pdf_file_path: string | null;
  grade: number | null;
  feedback: string | null;
  grader_name: string | null;
}

export interface ExperimentProgress {
  student_id: number;
  username: string;
  full_name: string;
  experiment_id: number | null;
  status: string;
  current_step: number | null;
  highest_completed_step: number | null;
  start_time: string | null;
  last_activity_at: string | null;
  completion_time: string | null;
}

// ===== Grade Types =====

export interface GradeBreakdownEntry {
  field: string;
  score: number | null;
  weight: number;
  weighted_score: number | null;
}

export interface FinalScoreBreakdownNode {
  score: number | null;
  weight: number;
  weighted_score: number | null;
}

export interface FinalScoreBreakdown {
  exp_flow?: FinalScoreBreakdownNode | null;
  knowledge_test?: FinalScoreBreakdownNode | null;
  model_quality?: FinalScoreBreakdownNode | null;
  report_quality?: FinalScoreBreakdownNode | null;
}

export interface StudentGradeOverview {
  student_id: number;
  username: string;
  full_name: string;
  experiment_id: number | null;
  exp_flow_score: number | null;
  model_quality: number | null;
  knowledge_test: number | null;
  report_quality: number | null;
  final_score: number | null;
  report_status?: "submitted" | "graded" | "rejected" | null;
  report_feedback?: string | null;
  exp_flow_breakdown?: GradeBreakdownEntry[] | null;
  final_score_breakdown?: FinalScoreBreakdown | null;
}

// ===== Test Context Types =====

export interface TestCredentials {
  username: string;
  password: string;
}

export interface CsvUploadPart {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export interface TempStudentSeed {
  studentId: string;
  fullName: string;
  upload: CsvUploadPart;
}

export interface TestUser {
  id: number;
  username: string;
  fullName: string;
  role: "teacher" | "assistant" | "student";
  classId?: number;
  className?: string;
}

// ===== Page Helper Types =====

export type PageAction = (page: Page) => Promise<void>;

export interface NavigationPath {
  menu?: string;
  subMenu?: string;
  heading: string;
}
