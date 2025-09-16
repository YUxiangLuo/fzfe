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
  class_code: string;
  teacher_id: number;
}

// Represents a student within a class context
export interface Student {
  // This will be defined later
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
