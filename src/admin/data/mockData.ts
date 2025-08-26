import { User, ExperimentManual, ExperimentData, Class } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    account: 'admin001',
    name: '张管理员',
    role: 'teacher',
    phone: '13800138001',
    email: 'admin@school.edu.cn',
    registerTime: '2024-01-15 09:30:00',
    status: 'active'
  },
  {
    id: '2',
    account: 'teacher001',
    name: '李教授',
    role: 'teacher',
    phone: '13800138002',
    email: 'li.prof@school.edu.cn',
    registerTime: '2024-01-20 14:20:00',
    status: 'active'
  },
  {
    id: '3',
    account: 'student001',
    name: '王小明',
    role: 'student',
    phone: '13800138003',
    email: 'wang.xiaoming@student.edu.cn',
    registerTime: '2024-02-01 16:45:00',
    status: 'active'
  },
  {
    id: '4',
    account: 'assistant001',
    name: '刘助教',
    role: 'assistant',
    phone: '13800138004',
    email: 'liu.assistant@school.edu.cn',
    registerTime: '2024-01-25 11:15:00',
    status: 'active'
  }
];

export const mockManuals: ExperimentManual[] = [
  {
    id: '1',
    name: '基础虚拟仿真实验手册',
    version: 'v2.1.0',
    uploadTime: '2024-01-15 10:30:00',
    status: 'enabled',
    filename: 'basic_simulation_manual_v2.1.0.pdf'
  },
  {
    id: '2',
    name: '高级仿真实验指导',
    version: 'v1.5.2',
    uploadTime: '2024-01-10 15:20:00',
    status: 'disabled',
    filename: 'advanced_simulation_guide_v1.5.2.pdf'
  },
  {
    id: '3',
    name: '系统操作手册',
    version: 'v3.0.1',
    uploadTime: '2024-01-05 09:45:00',
    status: 'disabled',
    filename: 'system_operation_manual_v3.0.1.pdf'
  }
];

export const mockExperimentData: ExperimentData[] = [
  {
    id: '1',
    name: '工业控制系统数据集',
    industry: '制造业',
    enterprise: '智能制造有限公司',
    version: 'v2.3.0',
    lastUpdated: '2024-01-20 14:30:00'
  },
  {
    id: '2',
    name: '化工流程仿真参数',
    industry: '化工',
    enterprise: '石化集团',
    version: 'v1.8.5',
    lastUpdated: '2024-01-18 16:20:00'
  },
  {
    id: '3',
    name: '电力系统运行数据',
    industry: '能源',
    enterprise: '国家电网',
    version: 'v4.1.2',
    lastUpdated: '2024-01-25 11:45:00'
  }
];

export const mockClasses: Class[] = [
  {
    id: '1',
    classNumber: 'CS2024001',
    className: '计算机科学与技术2024级1班',
    teacher: '李教授',
    createTime: '2024-02-01 09:00:00',
    studentCount: 45
  },
  {
    id: '2',
    classNumber: 'EE2024001',
    className: '电子工程2024级1班',
    teacher: '王副教授',
    createTime: '2024-02-01 10:30:00',
    studentCount: 38
  },
  {
    id: '3',
    classNumber: 'ME2024001',
    className: '机械工程2024级1班',
    teacher: '张讲师',
    createTime: '2024-02-01 11:15:00',
    studentCount: 52
  }
];