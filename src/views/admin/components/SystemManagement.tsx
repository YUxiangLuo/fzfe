import React, { useState } from 'react';
import { Users, GraduationCap } from 'lucide-react';
import UserManagement from './UserManagement';
import ClassManagement from './ClassManagement';

const SystemManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'classes'>('users');

  const tabs = [
    {
      id: 'users' as const,
      label: '用户管理',
      icon: Users,
      component: UserManagement
    },
    {
      id: 'classes' as const,
      label: '班级管理',
      icon: GraduationCap,
      component: ClassManagement
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || UserManagement;

  return (
    <div>
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">系统管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统用户账户和班级信息，提供密码重置等管理功能</p>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-200 p-1 shadow-sm">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-6 font-medium text-sm transition-all duration-200 rounded-xl ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default SystemManagement;