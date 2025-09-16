import React from 'react';
import { GraduationCap, Users, UserCheck, Shield } from 'lucide-react';
import { ROLES } from '../../../config/roles'; // 导入新的角色配置

interface RoleUI {
  icon: React.ComponentType<any>;
  description: string;
  color: string;
}

interface RoleSelectorProps {
  selectedRole: string;
  onRoleSelect: (roleId: string) => void;
}

// 将UI相关的配置与核心的角色定义结合起来
const rolesData = ROLES.map(role => {
  const uiConfig: Omit<RoleUI, 'id' | 'name'> = {
    student: {
      icon: GraduationCap,
      description: '访问学习资源和实验',
      color: 'from-blue-500 to-cyan-500',
    },
    teacher: {
      icon: Users,
      description: '管理课程和评估',
      color: 'from-green-500 to-emerald-500',
    },
    assistant: {
      icon: UserCheck,
      description: '协助教学和答疑',
      color: 'from-purple-500 to-violet-500',
    },
    admin: {
      icon: Shield,
      description: '系统配置和管理',
      color: 'from-orange-500 to-red-500',
    },
  }[role.id];

  return { ...role, ...uiConfig };
});

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
}) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4 text-center">
        请选择您的身份
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {rolesData.map((role) => {
          const IconComponent = role.icon;
          const isSelected = selectedRole === role.id;

          return (
            <button
              key={role.id}
              onClick={() => onRoleSelect(role.id)}
              className={`
                relative p-4 rounded-xl transition-all duration-300 group
                ${
                  isSelected
                    ? 'bg-white/20 scale-105 shadow-lg'
                    : 'bg-white/10 hover:bg-white/15 hover:scale-102'
                }
                backdrop-blur-sm border border-white/20
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                <div
                  className={`
                    p-3 rounded-lg bg-gradient-to-br ${role.color}
                    transition-transform duration-300
                    ${isSelected ? 'scale-110' : 'group-hover:scale-105'}
                  `}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium text-sm">{role.displayName}</p>
                  <p className="text-white/70 text-xs mt-1 hidden sm:block">
                    {role.description}
                  </p>
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute inset-0 rounded-xl border-2 border-white/40 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
