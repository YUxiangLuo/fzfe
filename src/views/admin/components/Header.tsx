import React, { useState, useEffect } from "react";
import { LogOut, User } from "lucide-react";
import { decodeToken, type DecodedToken } from "../../../utils/auth";
import { getRoleByBackendValue } from "../../../config/roles";
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from './ConfirmDialog';
import { Button } from "@/components/ui/button";

const Header: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);
  const { confirmState, showConfirm, hideConfirm } = useConfirm();

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        setCurrentUser(decodeToken(token));
      }
    } catch (err) {
      console.error('Failed to read token from localStorage:', err);
    }
  }, []);

  const handleLogout = () => {
    showConfirm(
      '确定要退出登录吗？退出后需要重新登录才能继续操作。',
      () => {
        try {
          localStorage.removeItem("token");
        } catch (err) {
          console.error('Failed to remove token from localStorage:', err);
        }
        window.location.href = "/login";
      },
      { title: '退出登录', variant: 'danger' }
    );
  };

  const roleDisplay = currentUser
    ? getRoleByBackendValue(currentUser.role)?.displayName ?? currentUser.role
    : null;

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
            <div className="flex items-center space-x-3 pl-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {currentUser?.username || "未知用户"}
                  </p>
                  <p className="text-muted-foreground">
                    {roleDisplay || ""}
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="退出登录">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={() => { hideConfirm(); confirmState.onConfirm(); }}
        onCancel={hideConfirm}
      />
    </>
  );
};

export default Header;
