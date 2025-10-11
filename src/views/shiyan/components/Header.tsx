import React, { useEffect, useState } from "react";
import { User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiClient } from "../../../utils/apiClient";
import { getRoleByBackendValue } from "../../../config/roles";

interface UserSummary {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  phone_number?: string | null;
  created_at: string;
}

const Header: React.FC = () => {
  const location = useLocation();
  const currentPath =
    location.pathname + (location.search || "") + (location.hash || "");
  const introductionState =
    location.pathname === "/introduction" ? undefined : { from: currentPath };
  const profileState =
    location.pathname === "/profile" ? undefined : { from: currentPath };
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      try {
        const profile = await apiClient.get<UserSummary>("/users/me");
        if (!active) return;
        setUser(profile);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load user profile", err);
        setError(err instanceof Error ? err.message : "获取用户信息失败");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const roleDisplay = user
    ? getRoleByBackendValue(user.role)?.displayName ?? user.role
    : null;

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
            state={introductionState}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            实验介绍
          </Link>

          <Link
            to="/profile"
            state={profileState}
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
                <p className="font-medium text-gray-900">
                  {loading ? "正在加载..." : user?.full_name || user?.username || "未知用户"}
                </p>
                <p className="text-gray-500">
                  {loading ? "" : roleDisplay || ""}
                </p>
                {error && !loading && (
                  <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
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
