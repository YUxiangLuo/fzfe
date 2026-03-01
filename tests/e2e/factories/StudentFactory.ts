/**
 * Student Factory
 * 
 * 生成测试用的学生数据，支持前后端共享类型
 */

import { STUDENTS, CLASSES, type StudentId, type StudentStatus } from "../fixtures";

export interface StudentData {
  username: string;
  classId: number;
  experimentId: number;
  status: StudentStatus;
  tags?: string[];
}

export interface StudentQuery {
  status?: StudentStatus;
  tags?: string[];
  classId?: number;
  limit?: number;
}

export class StudentFactory {
  private static usernameCounter = 20249999;

  /**
   * 生成一个新的唯一学生ID
   */
  static generateId(): string {
    this.usernameCounter--;
    return String(this.usernameCounter);
  }

  /**
   * 创建学生数据（用于 API 创建）
   */
  static create(overrides?: Partial<StudentData>): StudentData {
    return {
      username: this.generateId(),
      classId: CLASSES.teacher.id,
      experimentId: 900000 + Math.floor(Math.random() * 100000),
      status: "not_started",
      ...overrides,
    };
  }

  /**
   * 查询种子数据中的学生
   */
  static query(query: StudentQuery): string[] {
    const results: string[] = [];
    
    // 合并两个班级的学生
    const allStudents = {
      ...STUDENTS.teacherClass,
      ...STUDENTS.assistantClass,
    };

    for (const [id, data] of Object.entries(allStudents)) {
      // 状态过滤
      if (query.status && data.status !== query.status) continue;
      
      // 标签过滤
      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some(tag => data.tags?.includes(tag));
        if (!hasTag) continue;
      }

      results.push(id);
      
      // 数量限制
      if (query.limit && results.length >= query.limit) break;
    }

    return results;
  }

  /**
   * 获取特定状态的学生（简化查询）
   */
  static byStatus(status: StudentStatus, limit?: number): string[] {
    return this.query({ status, limit });
  }

  /**
   * 获取特定标签的学生
   */
  static byTag(tag: string, limit?: number): string[] {
    return this.query({ tags: [tag], limit });
  }

  /**
   * 获取指定班级的学生
   */
  static byClass(classId: number, limit?: number): string[] {
    const classKey = classId === CLASSES.teacher.id ? "teacherClass" : "assistantClass";
    const students = Object.keys(STUDENTS[classKey]);
    return limit ? students.slice(0, limit) : students;
  }

  /**
   * 获取待评阅的学生（跨班级）
   */
  static getPendingReviews(limit = 2): string[] {
    return this.query({ status: "pending_review", limit });
  }

  /**
   * 验证学生ID是否存在于种子数据中
   */
  static exists(studentId: string): boolean {
    return studentId in STUDENTS.teacherClass || studentId in STUDENTS.assistantClass;
  }

  /**
   * 获取学生详细信息
   */
  static getInfo(studentId: string): { status: StudentStatus; classId: number; tags?: string[] } | null {
    if (studentId in STUDENTS.teacherClass) {
      return { ...STUDENTS.teacherClass[studentId as keyof typeof STUDENTS.teacherClass], classId: CLASSES.teacher.id };
    }
    if (studentId in STUDENTS.assistantClass) {
      return { ...STUDENTS.assistantClass[studentId as keyof typeof STUDENTS.assistantClass], classId: CLASSES.assistant.id };
    }
    return null;
  }
}
