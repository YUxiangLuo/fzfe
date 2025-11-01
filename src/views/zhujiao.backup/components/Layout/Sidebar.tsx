import React from 'react';
import { 
  UserCog,
  GraduationCap, 
  Activity,
  FileText,
  History,
  BarChart3,
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

  const menuItems = [
    { key: 'account-personal', label: '个人信息', icon: UserCog, description: '查看和编辑个人资料' },
    { key: 'student-management', label: '学生管理', icon: GraduationCap, description: '查看学生信息' },
    { key: 'experiment-progress', label: '实验进度', icon: Activity, description: '监控学生实验进度' },
    { key: 'experiment-reports', label: '实验报告', icon: FileText, description: '批阅实验报告' },
    { key: 'experiment-logs', label: '实验日志', icon: History, description: '查看实验操作记录' },
    { key: 'assessment-grades', label: '成绩概览', icon: BarChart3, description: '查看成绩统计' },
  ];

  return (
    <aside className="w-80 bg-gradient-to-b from-slate-50 to-white shadow-2xl transition-all duration-300 flex flex-col border-r border-gray-200/50">
      <nav className="flex-1 py-6 px-4 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.key}
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
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;