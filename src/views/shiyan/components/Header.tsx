import React, { useEffect, useState } from "react";
import { LogOut, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiClient } from "../../../utils/apiClient";
import { getRoleByBackendValue } from "../../../config/roles";
import { ROUTES, getLogoutRedirectPath } from "../constants/routes";
import { useConfirm } from "../../../shared/contexts/ConfirmContext";

interface UserSummary {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  phone_number?: string | null;
  created_at: string;
  must_change_password?: boolean;
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
  const { confirm } = useConfirm();

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

    void fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "确认退出",
      message: "您确定要退出系统吗？未保存的实验进度可能会丢失。",
      confirmText: "退出",
      cancelText: "取消",
      variant: "danger",
    });

    if (!isConfirmed) return;

    try {
      localStorage.removeItem("token");
    } catch (error) {
      console.error("Failed to remove token from localStorage:", error);
    }
    window.location.href = getLogoutRedirectPath();
  };

  const roleDisplay = user
    ? getRoleByBackendValue(user.role)?.displayName ?? user.role
    : null;

  // 获取显示名称
  const displayName = user?.username || "未知用户";

  // 获取头像首字符
  const getAvatarInitial = () => {
    if (user?.full_name) {
      return user.full_name.charAt(0);
    }
    if (user?.username) {
      return user.username.charAt(0);
    }
    return "?";
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
            to={ROUTES.INTRODUCTION}
            state={introductionState}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            实验介绍
          </Link>

          <Link
            to={ROUTES.PROFILE}
            state={profileState}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            个人信息
          </Link>

          {!loading && user?.must_change_password && (
            <Link
              to={ROUTES.PROFILE}
              state={profileState}
              className="flex items-center space-x-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-800">
                请尽快修改初始密码
              </span>
            </Link>
          )}

          <div className="flex items-center space-x-3 border-l pl-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {loading ? "?" : getAvatarInitial()}
                </span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {loading ? "正在加载..." : displayName}
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
