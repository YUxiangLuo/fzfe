// Represents a generic user across the application
export interface User {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  managedClasses?: string[];
}

// Represents a class, matching the database table structure
export interface Class {
  class_id: number;
  class_name: string;
  class_code: string | null;
  teacher_id: number;
  teacher_name?: string | null;
  created_at?: string;
}

export interface Student extends User {}

export interface Assistant {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
}

// For sidebar navigation
export type MenuItem = 
  | 'account-personal' 
  | 'account-assistant' 
  | 'class-management' 
  | 'student-management'
  | 'experiment-progress'
  | 'experiment-reports'
  | 'experiment-logs'
  | 'assessment-questions'
  | 'assessment-weights'
  | 'assessment-grades';

export interface GradeWeights {
  exp_flow: number;
  exp_flow_demand_data_preparation: number;
  exp_flow_demand_descriptive_stats: number;
  exp_flow_demand_model_selection: number;
  exp_flow_demand_generate_results: number;
  exp_flow_production_inventory_calc: number;
  exp_flow_production_service_level: number;
  exp_flow_production_variable_calc: number;
  exp_flow_production_plan_creation: number;
  exp_flow_report_submission: number;
  knowledge_test: number;
  model_quality: number;
  report_quality: number;
}

export interface StudentGrade {
  studentId: string;
  studentName: string;
  exp_flow: number;
  knowledge_test: number;
  model_quality: number;
  report_quality: number;
  total_score: number;
  created_at?: string;
  experiment_id?: number;
  grade_id?: number;
}

export type QuestionTypeApi = 'Single Choice' | 'Multiple Choice' | 'True/False';

export interface Question {
  question_id: number;
  knowledge_point: string | null;
  question_type: QuestionTypeApi;
  question_text: string;
  options?: Record<string, string> | string[] | null;
  correct_answers: string[];
  creator_id?: number | null;
  creator_name?: string | null;
}

export interface ExperimentReport {
  report_id: number;
  experiment_id: number;
  student_id: number;
  student_username: string;
  student_full_name: string;
  report_content: string | null;
  pdf_file_path: string | null;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  graded_by: number | null;
  graded_by_full_name: string | null;
  experiment_status: string | null;
  selected_industry: string | null;
  selected_company: string | null;
  selected_product: string | null;
}

export interface ClassExperimentStatus {
  experiment_id: number;
  student_id: number;
  student_username: string;
  student_full_name: string;
  start_time: string | null;
  completion_time: string | null;
  last_activity_at: string | null;
  status: 'Not Started' | 'In Progress' | 'Completed';
  selected_industry: string | null;
  selected_company: string | null;
  selected_product: string | null;
  best_model?: string | null;
}

// Represents a student's progress event, matching the backend API structure
export interface StepEvent {
  event_id: number;
  experiment_id: number;
  student_id: number;
  step_order: number;
  event_type: 'STARTED' | 'COMPLETED';
  event_timestamp: string;
}

// Represents a step event within the context of a class, including student info
export interface ClassStepEvent extends StepEvent {
  class_id: number;
  username: string;
  full_name: string;
}
