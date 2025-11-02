import React, { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { decodeToken, type DecodedToken } from '../../../../utils/auth';
import { getRoleByBackendValue } from '../../../../config/roles';

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

  const roleDisplay = currentUser
    ? getRoleByBackendValue(currentUser.role)?.displayName ?? currentUser.role
    : null;

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">
            面向企业多源需求融合的生产计划决策虚拟仿真系统
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 pl-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {currentUser?.full_name || currentUser?.username || "未知用户"}
                </p>
                <p className="text-gray-500">
                  {roleDisplay || ""}
                </p>
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
