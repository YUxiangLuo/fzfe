import React from "react";
import { User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  const handleLogout = () => {
    // Implement logout logic here
    window.location.href = "/";
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">
            面向企业多源需求融合预测的生产计划决策虚拟仿真系统
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            to="/introduction"
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            实验介绍
          </Link>

          <Link
            to="/profile"
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            个人信息
          </Link>

          <div className="flex items-center space-x-3 border-l pl-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">张同学</p>
                <p className="text-gray-500">学生</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
