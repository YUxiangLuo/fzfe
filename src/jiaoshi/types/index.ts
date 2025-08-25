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

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  registeredAt: string;
  managedClasses: string[];
}

export interface Assistant {
  id: string;
  name: string;
  phone: string;
  email: string;
  managedClasses: string[];
  status: 'active' | 'inactive';
}

export interface Class {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  createdAt: string;
  studentCount: number;
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  classId: string;
  className: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface ExperimentProgress {
  studentId: string;
  studentName: string;
  progress: number;
  stayTime: number;
  startTime: string;
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

export interface Question {
  id: string;
  content: string;
  type: 'single' | 'multiple' | 'boolean';
  knowledgePoint: string;
  options?: string[];
  correctAnswer: string | string[];
}

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