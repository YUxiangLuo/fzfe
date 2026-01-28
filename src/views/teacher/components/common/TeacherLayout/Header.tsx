import React, { useState, useEffect } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { decodeToken, type DecodedToken } from '@/utils/auth';
import { getRoleByBackendValue } from '@/config/roles';
import { useConfirm } from '@/views/teacher/hooks/useConfirm';
import { ConfirmDialog } from '@/views/teacher/components/shadcn/TeacherConfirmDialog';
import { apiClient } from '@/utils/apiClient';

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

interface HeaderProps {
  getLogoutRedirectPath: () => string;
}

const Header: React.FC<HeaderProps> = ({ getLogoutRedirectPath }) => {
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      localStorage.removeItem("token");
      setLoading(false);
      return;
    }

    setCurrentUser(decoded);

    // Then fetch full user profile from API
    let active = true;
    const fetchProfile = async () => {
      try {
        const profile = await apiClient.get<UserSummary>("/users/me");
        if (!active) return;
        setUser(profile);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load user profile", err);
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
    const confirmed = await confirm.showConfirm(
      '退出登录',
      '确定要退出登录吗？退出后需要重新登录才能继续操作。',
      'danger'
    );
    if (!confirmed) return;

    try {
      localStorage.removeItem("token");
    } catch (error) {
      console.error('Failed to remove token:', error);
      return;
    }
    window.location.href = getLogoutRedirectPath();
  };

  const roleDisplay = currentUser
    ? getRoleByBackendValue(currentUser.role)?.displayName ?? currentUser.role
    : null;

  // 获取显示名称（优先使用API返回的数据）
  const displayName = user?.username || currentUser?.username || "未知用户";

  // 获取头像首字符
  const getAvatarInitial = () => {
    if (user?.full_name) {
      return user.full_name.charAt(0);
    }
    if (currentUser?.full_name) {
      return currentUser.full_name.charAt(0);
    }
    if (currentUser?.username) {
      return currentUser.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  return (
    <>
      <header className="w-full bg-card border-b border-border shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-foreground">
              面向企业多源需求融合的生产计划决策虚拟仿真系统
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {!loading && user?.must_change_password && (
              <Link
                to="/account-personal"
                className="flex items-center space-x-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg hover:bg-warning/10 transition-colors"
              >
                <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                <span className="text-sm font-medium text-warning">
                  请尽快修改初始密码
                </span>
              </Link>
            )}

            <div className="flex items-center space-x-3 pl-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-semibold">
                    {getAvatarInitial()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {displayName}
                  </p>
                  <p className="text-muted-foreground">
                    {roleDisplay || ""}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </>
  );
};

export default Header;
