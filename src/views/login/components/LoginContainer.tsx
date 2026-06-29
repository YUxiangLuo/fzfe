import React, { useState } from "react";
import { RoleSelector } from "./RoleSelector";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import type { RegisterFormData } from "./RegisterForm";
import { Toast } from "./Toast";
import { API_BASE_URL } from "../../../utils/apiClient";
import { getRedirectPath } from "../constants/routes";
import { useToast } from "../hooks/useToast";
import { persistSession, type SessionPortal } from "../../../utils/session";

export const LoginContainer: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState("student");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const { toast, showToast, hideToast } = useToast();

  const roleMap: Record<string, string> = {
    student: "Student",
    teacher: "Teacher",
    assistant: "Assistant",
    admin: "Admin",
  };

  const sessionPortalMap: Record<string, SessionPortal> = {
    student: "student",
    teacher: "teacher",
    assistant: "teacher",
    admin: "admin",
  };

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      const role = roleMap[selectedRole] ?? "Student";
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, role }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        // 根据状态码设置不同的错误消息
        let errorMessage = "登录失败，请稍后再试";
        switch (response.status) {
          case 401:
            errorMessage = "用户名或密码错误";
            break;
          case 403:
            errorMessage = "您没有权限访问该系统";
            break;
          case 429:
            errorMessage = "登录尝试次数过多，请稍后再试";
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = "服务器错误，请稍后再试";
            break;
          default:
            errorMessage = data.error || "登录失败，请检查您的凭据";
        }
        throw new Error(errorMessage);
      }

      const token = typeof data?.data?.token === "string"
        ? data.data.token
        : (typeof data?.token === "string" ? data.token : null);

      if (token) {
        const sessionPortal = sessionPortalMap[selectedRole];
        if (!sessionPortal) {
          throw new Error("当前登录角色未配置对应的会话门户，请联系管理员");
        }

        persistSession(
          token,
          selectedRole === "teacher" || selectedRole === "assistant" ? selectedRole : null,
          sessionPortal,
        );
        const redirectPath = getRedirectPath(selectedRole as any);
        window.location.href = redirectPath;
      } else {
        throw new Error("登录失败，未能获取到Token");
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      let errorMessage = "发生未知错误，请稍后再试";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "请求超时，请检查网络连接";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (formData: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      if (selectedRole !== "student") {
        throw new Error("仅学生账号支持自助注册");
      }

      // 将角色 ID 转换为首字母大写的格式（student -> Student）
      const role = roleMap[selectedRole];
      if (!role) {
        throw new Error("无效的角色类型");
      }

      const response = await fetch(`${API_BASE_URL}/users/register/${role}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        // 根据状态码设置不同的错误消息
        let errorMessage = "注册失败，请稍后再试";
        switch (response.status) {
          case 400:
            errorMessage = data.error || "提交的信息有误，请检查";
            break;
          case 409:
            errorMessage = "该账号已被注册，请使用其他账号";
            break;
          case 429:
            errorMessage = "注册请求过于频繁，请稍后再试";
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = "服务器错误，请稍后再试";
            break;
          default:
            errorMessage = data.error || "注册失败，请检查您的信息";
        }
        throw new Error(errorMessage);
      }

      // 注册成功，使用 Toast 提示用户并切换到登录模式
      showToast("注册成功！请使用您的账号登录", "success");
      setMode("login");
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      let errorMessage = "注册失败，请稍后再试";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "请求超时，请检查网络连接";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
      console.error("Register error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full flex flex-col items-center justify-center">
        {/* 系统标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <h1 className="text-4xl font-bold text-white">
              面向企业的需求预测与生产计划决策虚拟仿真系统
            </h1>
          </div>
        </div>

        {/* 登录/注册容器 */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <RoleSelector
            selectedRole={selectedRole}
            onRoleSelect={(role) => {
              setSelectedRole(role);
              setError(null); // 切换角色时清除错误
            }}
            mode={mode}
          />

          {mode === "login" ? (
            <LoginForm
              selectedRole={selectedRole}
              onSubmit={handleLogin}
              onSwitchToRegister={() => {
                setMode("register");
                setError(null);
                // 仅学生允许自助注册；教师/助教账号由管理端创建。
                setSelectedRole("student");
              }}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <RegisterForm
              selectedRole={selectedRole}
              onSubmit={handleRegister}
              onBackToLogin={() => {
                setMode("login");
                setError(null);
              }}
              isLoading={isLoading}
              error={error}
            />
          )}
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-6">
          <p className="text-white/50 text-xs">
            © 2025 学校虚拟仿真教学平台
          </p>
        </div>
      </div>

      {/* Toast 通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};
