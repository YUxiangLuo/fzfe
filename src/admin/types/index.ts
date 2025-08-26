export interface User {
  id: string;
  account: string;
  name: string;
  role: 'student' | 'teacher' | 'assistant';
  phone: string;
  email: string;
  registerTime: string;
  status: 'active' | 'inactive';
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

export interface Class {
  id: string;
  classNumber: string;
  className: string;
  teacher: string;
  createTime: string;
  studentCount: number;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  children?: MenuItem[];
}