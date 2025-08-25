import React, { useState } from 'react';
import { RoleSelector } from './RoleSelector';
import { LoginForm } from './LoginForm';
import { Monitor, Wifi } from 'lucide-react';

export const LoginContainer: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState('');

  const handleLogin = (credentials: { username: string; password: string }) => {
    console.log('登录信息:', { ...credentials, role: selectedRole });
    alert(`登录成功！\n身份: ${getRoleName(selectedRole)}\n用户名: ${credentials.username}`);
  };

  const getRoleName = (roleId: string): string => {
    const roleNames = {
      student: '学生',
      teacher: '教师',
      assistant: '助教',
      admin: '管理员',
    };
    return roleNames[roleId as keyof typeof roleNames] || '';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 系统标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Monitor className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">
              虚拟仿真系统
            </h1>
          </div>
        </div>

        {/* 登录容器 */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <RoleSelector 
            selectedRole={selectedRole}
            onRoleSelect={setSelectedRole}
          />
          
          <LoginForm 
            selectedRole={selectedRole}
            onSubmit={handleLogin}
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