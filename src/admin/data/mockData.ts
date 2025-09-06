import type { User, ExperimentManual, ExperimentData, Class } from "../types";

export const mockUsers: User[] = [
  {
    id: "1",
    account: "admin001",
    name: "张管理员",
    role: "teacher",
    phone: "13800138001",
    email: "admin@school.edu.cn",
    registerTime: "2024-01-15 09:30:00",
    status: "active",
  },
  {
    id: "2",
    account: "teacher001",
    name: "李教授",
    role: "teacher",
    phone: "13800138002",
    email: "li.prof@school.edu.cn",
    registerTime: "2024-01-20 14:20:00",
    status: "active",
  },
  {
    id: "3",
    account: "student001",
    name: "王小明",
    role: "student",
    phone: "13800138003",
    email: "wang.xiaoming@student.edu.cn",
    registerTime: "2024-02-01 16:45:00",
    status: "active",
  },
  {
    id: "4",
    account: "assistant001",
    name: "刘助教",
    role: "assistant",
    phone: "13800138004",
    email: "liu.assistant@school.edu.cn",
    registerTime: "2024-01-25 11:15:00",
    status: "active",
  },
];

export const mockManuals: ExperimentManual[] = [
  {
    id: "1",
    name: "基础虚拟仿真实验手册",
    version: "v2.1.0",
    uploadTime: "2024-01-15 10:30:00",
    status: "enabled",
    filename: "basic_simulation_manual_v2.1.0.pdf",
  },
  {
    id: "2",
    name: "高级仿真实验指导",
    version: "v1.5.2",
    uploadTime: "2024-01-10 15:20:00",
    status: "disabled",
    filename: "advanced_simulation_guide_v1.5.2.pdf",
  },
  {
    id: "3",
    name: "系统操作手册",
    version: "v3.0.1",
    uploadTime: "2024-01-05 09:45:00",
    status: "disabled",
    filename: "system_operation_manual_v3.0.1.pdf",
  },
];

export const mockExperimentData: ExperimentData[] = [
  {
    id: "1",
    name: "苹果手机销售数据集",
    industry: "消费电子",
    enterprise: "苹果公司",
    version: "v1.2.0",
    lastUpdated: "2024-01-20 14:30:00",
  },
  {
    id: "2",
    name: "特斯拉汽车销售历史",
    industry: "汽车制造",
    enterprise: "特斯拉公司",
    version: "v2.1.3",
    lastUpdated: "2024-01-18 16:20:00",
  },
  {
    id: "3",
    name: "星巴克咖啡销售记录",
    industry: "餐饮连锁",
    enterprise: "星巴克公司",
    version: "v1.5.7",
    lastUpdated: "2024-01-25 11:45:00",
  },
  {
    id: "4",
    name: "耐克运动鞋销售数据",
    industry: "体育用品",
    enterprise: "耐克公司",
    version: "v3.0.1",
    lastUpdated: "2024-01-22 09:15:00",
  },
  {
    id: "5",
    name: "华为手机市场表现",
    industry: "通信设备",
    enterprise: "华为技术有限公司",
    version: "v2.4.2",
    lastUpdated: "2024-01-19 11:30:00",
  },
];

export const mockClasses: Class[] = [
  {
    id: "1",
    classNumber: "CS2024001",
    className: "计算机科学与技术2024级1班",
    teacher: "李教授",
    createTime: "2024-02-01 09:00:00",
    studentCount: 45,
  },
  {
    id: "2",
    classNumber: "EE2024001",
    className: "电子工程2024级1班",
    teacher: "王副教授",
    createTime: "2024-02-01 10:30:00",
    studentCount: 38,
  },
  {
    id: "3",
    classNumber: "ME2024001",
    className: "机械工程2024级1班",
    teacher: "张讲师",
    createTime: "2024-02-01 11:15:00",
    studentCount: 52,
  },
];
