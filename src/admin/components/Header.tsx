import React from "react";
import { LogOut, User, Shield } from "lucide-react";

const Header: React.FC = () => {
  const handleLogout = () => {
    // 这里可以添加退出登录逻辑
    window.location.href = "/login";
    console.log("退出登录");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-40">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">虚拟仿真系统</h1>
              <p className="text-xs text-gray-500 -mt-1">管理员端</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">管理员</p>
              <p className="text-xs text-gray-500">系统管理员</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-gray-200 hover:border-red-200"
          >
            <LogOut size={16} />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
