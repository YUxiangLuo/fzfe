import React from 'react';
import { User, LogOut, Settings } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="h-16 bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1">
          <h1 className="text-lg font-semibold leading-tight">
            面向企业多源需求融合预测的生产计划决策虚拟仿真系统
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
            <User size={18} />
            <span className="text-sm">个人信息</span>
          </button>
          <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
            <LogOut size={18} />
            <span className="text-sm">退出登录</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;