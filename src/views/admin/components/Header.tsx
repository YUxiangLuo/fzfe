import React, { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { decodeToken } from "../../../utils/auth";
import type { DecodedToken } from "../../../utils/auth";

const Header: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeToken(token);
      setCurrentUser(decoded);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: "系统管理员",
      teacher: "教师",
      assistant: "助教",
      student: "学生",
    };
    return roleMap[role.toLowerCase()] || "未知角色";
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-40">
      <div className="flex items-center justify-between h-full px-6">
        {/* 保留的标题和副标题 */}
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">虚拟仿真系统</h1>
            <p className="text-xs text-gray-500 -mt-1">管理员端</p>
          </div>
        </div>

        {/* 用户信息和退出登录按钮 */}
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {currentUser.full_name || currentUser.username}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleDisplayName(currentUser.role)}
                </p>
              </div>
            </div>
          ) : (
            // Token不存在或解码失败时的占位符
            <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="text-sm space-y-1">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="h-3 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          )}

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
