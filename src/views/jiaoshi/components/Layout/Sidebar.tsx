import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  GraduationCap,
  FlaskConical,
  ClipboardCheck,
  ChevronDown,
  UserCog,
  School,
  Activity,
  FileText,
  History,
  Brain,
  Settings,
  BarChart3
} from 'lucide-react';
import type { MenuItem } from '../../types';

interface SidebarProps {
  activeMenuItem: MenuItem;
  onMenuItemClick: (item: MenuItem) => void;
}

const EXPANDED_MENUS_KEY = 'jiaoshi_expanded_menus';

const Sidebar: React.FC<SidebarProps> = ({
  activeMenuItem,
  onMenuItemClick
}) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // 尝试从 localStorage 读取
    try {
      const stored = localStorage.getItem(EXPANDED_MENUS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load expanded menus from localStorage:', error);
    }

    // 如果没有存储，则根据当前菜单项设置默认值
    const parentMenu = activeMenuItem.split('-')[0];
    if (parentMenu && ['account', 'experiment', 'assessment'].includes(parentMenu)) {
      return [parentMenu];
    }
    return ['account'];
  });

  // 持久化展开状态到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_MENUS_KEY, JSON.stringify(expandedMenus));
    } catch (error) {
      console.error('Failed to save expanded menus to localStorage:', error);
    }
  }, [expandedMenus]);

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
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">

      <nav className="flex-1 p-6 pt-8 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <div key={item.key}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={`flex items-center w-full px-3 py-3 text-left rounded-lg transition-colors ${
                      expandedMenus.includes(item.key)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-sm">{item.label}</p>
                    </div>
                    <div className={`transition-transform duration-200 ${expandedMenus.includes(item.key) ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>
                  {expandedMenus.includes(item.key) && (
                    <div className="mt-1 ml-8 space-y-1">
                      {item.children.map((child) => (
                        <button
                          key={child.key}
                          onClick={() => onMenuItemClick(child.key as MenuItem)}
                          className={`flex items-center w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                            activeMenuItem === child.key
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <child.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="ml-2 font-medium">{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => onMenuItemClick(item.key as MenuItem)}
                  className={`flex items-center w-full px-3 py-3 text-left rounded-lg transition-colors ${
                    activeMenuItem === item.key
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="font-medium text-sm">{item.label}</p>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;