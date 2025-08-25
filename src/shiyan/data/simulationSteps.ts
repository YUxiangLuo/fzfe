import { BookOpen, Building2, Factory, Package, BarChart3, Brain, Target, Cog, FileText, DivideIcon as LucideIcon } from 'lucide-react';

export interface SimulationStep {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  icon: LucideIcon;
}

export const simulationSteps: SimulationStep[] = [
  {
    id: 'introduction',
    title: '系统介绍',
    subtitle: '欢迎使用仿真系统',
    description: '学习需求预测和生产计划的基础知识',
    category: '入门指南',
    icon: BookOpen
  },
  {
    id: 'industry-selection',
    title: '行业选择',
    subtitle: '选择您的行业',
    description: '选择您想要在此仿真中分析的行业部门',
    category: '设置',
    icon: Building2
  },
  {
    id: 'company-selection',
    title: '公司选择',
    subtitle: '选择一家公司',
    description: '在您选择的行业中选择一家具体的公司',
    category: '设置',
    icon: Factory
  },
  {
    id: 'product-selection',
    title: '产品选择',
    subtitle: '选择产品',
    description: '选择您想要分析和预测的产品',
    category: '设置',
    icon: Package
  },
  {
    id: 'data-preview',
    title: '数据预览',
    subtitle: '探索历史数据',
    description: '查看和理解您选择产品的历史需求数据',
    category: '分析',
    icon: BarChart3
  },
  {
    id: 'forecast-model',
    title: '预测模型选择',
    subtitle: '选择您的算法',
    description: '选择和配置预测模型，包括移动平均、ARIMA、LSTM和集成方法',
    category: '建模',
    icon: Brain
  },
  {
    id: 'result-evaluation',
    title: '预测结果评估',
    subtitle: '分析准确性',
    description: '使用RMSE、MAE和R²等指标评估预测准确性',
    category: '评估',
    icon: Target
  },
  {
    id: 'production-planning',
    title: '生产计划',
    subtitle: '制定生产计划',
    description: '基于您的预测和业务约束创建生产计划',
    category: '规划',
    icon: Cog
  },
  {
    id: 'final-report',
    title: '最终报告与测试',
    subtitle: '完成仿真',
    description: '生成您的最终报告并完成评估测试',
    category: '完成',
    icon: FileText
  }
];