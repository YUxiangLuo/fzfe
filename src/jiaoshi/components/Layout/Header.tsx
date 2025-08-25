import React from 'react';
import { User, LogOut, Bell, Settings2 } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl border-b border-white/10">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1 flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              虚拟仿真实验管理系统
            </h1>
            <p className="text-sm text-blue-200 opacity-90">
              面向企业多源需求融合预测的生产计划决策
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="relative p-3 rounded-xl hover:bg-white/10 transition-all duration-200 group">
            <Bell size={20} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-medium">3</span>
          </button>
          <div className="w-px h-8 bg-white/20 mx-2"></div>
          <button className="flex items-center space-x-3 px-4 py-2 rounded-xl hover:bg-white/10 transition-all duration-200 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">张教授</p>
              <p className="text-xs text-blue-200">个人信息</p>
            </div>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 group">
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">退出</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;