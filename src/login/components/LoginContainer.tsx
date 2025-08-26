import React, { useState } from "react";
import { RoleSelector } from "./RoleSelector";
import { LoginForm } from "./LoginForm";

export const LoginContainer: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState("");

  const handleLogin = async (username: string, password: string) => {
    fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data.token);
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
      })
      .catch((error) => {
        console.error("login error:", error);
      })
      .finally(() => {
        switch (selectedRole) {
          case "student":
            window.location.href = "/shiyan";
            break;
          case "teacher":
            window.location.href = "/jiaoshi";
            break;
          case "assistant":
            window.location.href = "/jiaoshi";
            break;
          case "admin":
            window.location.href = "/admin";
            break;
        }
      });
  };

  const getRoleName = (roleId: string): string => {
    const roleNames = {
      student: "学生",
      teacher: "教师",
      assistant: "助教",
      admin: "管理员",
    };
    return roleNames[roleId as keyof typeof roleNames] || "";
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

          <LoginForm selectedRole={selectedRole} onSubmit={handleLogin} />
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
