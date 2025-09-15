export interface User {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: 'Student' | 'Teacher' | 'Assistant' | 'Admin';
  created_at: string;
  phone_number?: string | null;
  status?: 'active' | 'inactive'; 
}

export interface ExperimentManual {
  id: string;
  name: string;
  version: string;
  uploadTime: string;
  status: 'enabled' | 'disabled';
  filename: string;
}

export interface ExperimentData {
  id: string;
  name: string;
  industry: string;
  enterprise: string;
  version: string;
  lastUpdated: string;
}

// Updated Student type to match the new API response
export interface Student {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
}

// Updated Class type to include the optional students array
export interface Class {
  class_id: number;
  class_name: string;
  class_code: string;
  teacher_id: number;
  teacher_name: string;
  students?: Student[];
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  children?: MenuItem[];
}