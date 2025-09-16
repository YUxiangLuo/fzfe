import React, { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { decodeToken, type DecodedToken } from '../../../../utils/auth';

const Header: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setCurrentUser(decodeToken(token));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = '/login';
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: '系统管理员',
      teacher: '教师',
      assistant: '助教',
      student: '学生',
    };
    return roleMap[role.toLowerCase()] || '未知角色';
  };

  return (
    <header className="h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl border-b border-white/10">
      <div className="flex items-center justify-between h-full px-6">
        {/* Restructured Title */}
        <div className="flex-1 flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              虚拟仿真系统
            </h1>
            <p className="text-xs text-blue-200/70 -mt-1">教师端</p>
          </div>
        </div>
        
        {/* User Info and Logout */}
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-white/5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">{currentUser.full_name || currentUser.username}</p>
                <p className="text-xs text-blue-200/70">{getRoleDisplayName(currentUser.role)}</p>
              </div>
            </div>
          ) : (
            // Placeholder while loading
            <div className="w-40 h-10 bg-white/5 rounded-xl animate-pulse"></div>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 group"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">退出</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
