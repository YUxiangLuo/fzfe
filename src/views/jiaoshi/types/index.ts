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
  experimentProcess: number;
  knowledgeTest: number;
  modelSelection: number;
  experimentReport: number;
}

export interface StudentGrade {
  studentId: string;
  studentName: string;
  experimentProcess: number;
  knowledgeTest: number;
  modelSelection: number;
  experimentReport: number;
  totalScore: number;
}

export interface Question {
  id: string;
  content: string;
  type: 'single' | 'multiple' | 'boolean';
  knowledgePoint: string;
  options?: string[];
  correctAnswer: string | string[];
}

export interface ExperimentReport {
  id: string;
  studentId: string;
  studentName: string;
  fileName: string;
  submittedAt: string;
  status: 'unreviewed' | 'reviewed';
  score?: number;
  comments?: string;
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
