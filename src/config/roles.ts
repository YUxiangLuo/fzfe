export interface Role {
  /** 前端内部使用的唯一ID (小写) */
  id: 'student' | 'teacher' | 'assistant' | 'admin';
  /** 后端数据库/API对应的值 (首字母大写) */
  backendValue: 'Student' | 'Teacher' | 'Assistant' | 'Admin';
  /** 在UI中显示的中文名称 */
  displayName: string;
}

export const ROLES: Role[] = [
  { id: 'student', backendValue: 'Student', displayName: '学生' },
  { id: 'teacher', backendValue: 'Teacher', displayName: '教师' },
  { id: 'assistant', backendValue: 'Assistant', displayName: '助教' },
  { id: 'admin', backendValue: 'Admin', displayName: '管理员' },
];

/**
 * 根据前端ID查找角色对象
 * @param id 角色ID (e.g., 'student')
 * @returns 完整的角色对象或undefined
 */
export const getRoleById = (id: string): Role | undefined => ROLES.find(r => r.id === id);

/**
 * 根据后端值查找角色对象
 * @param backendValue 角色后端值 (e.g., 'Student')
 * @returns 完整的角色对象或undefined
 */
export const getRoleByBackendValue = (backendValue: string): Role | undefined => ROLES.find(r => r.backendValue === backendValue);
