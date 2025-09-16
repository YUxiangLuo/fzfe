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

export interface Student {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
}

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
