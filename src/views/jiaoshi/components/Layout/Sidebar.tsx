import React, { useState } from 'react';
import { 
  User, 
  Users, 
  GraduationCap, 
  FlaskConical, 
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  UserCog,
  School,
  Activity,
  FileText,
  History,
  Brain,
  Settings,
  BarChart3,
  Home,
  Sparkles
} from 'lucide-react';
import type { MenuItem } from '../../types';

interface SidebarProps {
  activeMenuItem: MenuItem;
  onMenuItemClick: (item: MenuItem) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeMenuItem, 
  onMenuItemClick
}) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    const parentMenu = activeMenuItem.split('-')[0];
    if (parentMenu && ['account', 'experiment', 'assessment'].includes(parentMenu)) {
      return [parentMenu];
    }
    return ['account'];
  });

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => 
      prev.includes(menu) 
        ? prev.filter(m => m !== menu)
        : [...prev, menu]
    );
  };

  const menuItems = [
    {
      key: 'account',
      label: '账号管理',
      icon: User,
      description: '个人与助教管理',
      children: [
        { key: 'account-personal', label: '个人信息管理', icon: UserCog, description: '查看和编辑个人资料' },
        { key: 'account-assistant', label: '助教管理', icon: Users, description: '管理助教账户' },
      ]
    },
    {
      key: 'class-management',
      label: '班级管理',
      icon: School,
      description: '创建和管理班级'
    },
    {
      key: 'student-management',
      label: '学生管理',
      icon: GraduationCap,
      description: '学生信息管理'
    },
    {
      key: 'experiment',
      label: '实验管理',
      icon: FlaskConical,
      description: '实验进度与报告',
      children: [
        { key: 'experiment-progress', label: '实验进度', icon: Activity, description: '监控学生实验进度' },
        { key: 'experiment-reports', label: '实验报告', icon: FileText, description: '批阅实验报告' },
        { key: 'experiment-logs', label: '实验日志', icon: History, description: '查看实验操作记录' },
      ]
    },
    {
      key: 'assessment',
      label: '考评管理',
      icon: ClipboardCheck,
      description: '题库与成绩管理',
      children: [
        { key: 'assessment-questions', label: '题库管理', icon: Brain, description: '管理考试题目' },
        { key: 'assessment-weights', label: '成绩权重', icon: Settings, description: '设置评分权重' },
        { key: 'assessment-grades', label: '成绩概览', icon: BarChart3, description: '查看成绩统计' },
      ]
    },
  ];

  return (
    <aside className="w-80 bg-gradient-to-b from-slate-50 to-white shadow-2xl transition-all duration-300 flex flex-col border-r border-gray-200/50">
      
      <nav className="flex-1 py-6 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.key} className="mb-2 px-4">
            {item.children ? (
              <>
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={`flex items-center w-full px-4 py-4 text-left rounded-2xl transition-all duration-200 group ${
                    expandedMenus.includes(item.key) 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-200 ${
                    expandedMenus.includes(item.key) 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}>
                    <item.icon size={20} className="flex-shrink-0" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                  <div className={`transition-transform duration-200 ${expandedMenus.includes(item.key) ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </button>
                {expandedMenus.includes(item.key) && (
                  <div className="mt-2 ml-4 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        onClick={() => onMenuItemClick(child.key as MenuItem)}
                        className={`flex items-center w-full px-4 py-3 text-sm text-left rounded-xl transition-all duration-200 group ${
                          activeMenuItem === child.key
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-[1.02]'
                            : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                          activeMenuItem === child.key
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                        }`}>
                          <child.icon size={16} className="flex-shrink-0" />
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{child.label}</p>
                          <p className={`text-xs mt-0.5 ${
                            activeMenuItem === child.key ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            {child.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => onMenuItemClick(item.key as MenuItem)}
                className={`flex items-center w-full px-4 py-4 text-left rounded-2xl transition-all duration-200 group ${
                  activeMenuItem === item.key
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-[1.02]'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${
                  activeMenuItem === item.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }`}>
                  <item.icon size={20} className="flex-shrink-0" />
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className={`text-xs mt-0.5 ${
                    activeMenuItem === item.key ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {item.description}
                  </p>
                </div>
              </button>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;