import React, { useState } from "react";
import { RoleSelector } from "./RoleSelector";
import { LoginForm } from "./LoginForm";
import { API_BASE_URL } from "../../../utils/apiClient";

export const LoginContainer: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState("student");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "登录失败，请检查您的凭据");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        switch (selectedRole) {
          case "student":
            window.location.href = "/shiyan";
            break;
          case "teacher":
            window.location.href = "/jiaoshi";
            break;
          case "assistant":
            window.location.href = "/zhujiao";
            break;
          case "admin":
            window.location.href = "/admin";
            break;
          default:
            window.location.href = "/shiyan";
            break;
        }
      } else {
        throw new Error("登录失败，未能获取到Token");
      }
    } catch (error: any) {
      // 翻译后端错误信息为用户友好的中文提示
      if (error.message === "Invalid credentials") {
        setError("用户名或密码错误");
      } else {
        setError(error.message || "发生未知错误，请稍后再试");
      }
      console.error("Login error:", error);
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
              面向企业多源需求融合的生产计划决策虚拟仿真系统
            </h1>
          </div>
        </div>

        {/* 登录容器 */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <RoleSelector
            selectedRole={selectedRole}
            onRoleSelect={setSelectedRole}
          />

          <LoginForm
            selectedRole={selectedRole}
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
          />
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-6">
          <p className="text-white/50 text-xs">
            © 2025 学校虚拟仿真教学平台 | 技术支持：教育技术中心
          </p>
        </div>
      </div>
    </div>
  );
};
