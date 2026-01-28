import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader, AlertTriangle, Mail, Phone, User as UserIcon, UserPlus, ListPlus } from 'lucide-react';
import type { Student, Class } from '@/views/teacher/types';
import Modal from '@/views/teacher/components/shadcn/TeacherModal';
import Button from '@/views/teacher/components/shadcn/TeacherButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/utils/apiClient';
import { decodeToken } from '@/utils/auth';
import { validateFullName, validateEmail, validatePhone, validatePassword } from '@/views/teacher/utils/validation';
import SelectStudentModal from './SelectStudentModal';
import ResetPasswordModal from './ResetPasswordModal';
import { useToast } from '@/views/teacher/hooks/useToast';

interface NewStudentForm {
  username: string;
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
}

const INITIAL_NEW_STUDENT: NewStudentForm = {
  username: '',
  full_name: '',
  email: '',
  phone_number: '',
  password: '',
};

const StudentManagement: React.FC = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [shouldRefreshAfterSelectModal, setShouldRefreshAfterSelectModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudent, setNewStudent] = useState<NewStudentForm>(INITIAL_NEW_STUDENT);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('未找到登录凭据，请重新登录。');
      setIsLoadingClasses(false);
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      setError('登录信息已失效，请重新登录。');
      setIsLoadingClasses(false);
      return;
    }

    setTeacherId(decoded.sub);
  }, []);

  useEffect(() => {
    if (teacherId === null) return;

    const controller = new AbortController();

    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      setError(null);
      try {
        const response = await apiClient.get(`/teachers/${teacherId}/classes`, { signal: controller.signal });

        if (!controller.signal.aborted) {
          const list = Array.isArray(response) ? response : [];
          setClasses(list);
          if (list.length > 0) {
            setSelectedClassId(String(list[0].class_id));
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        if (!controller.signal.aborted) {
          setError(err.message || '获取班级列表失败');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingClasses(false);
        }
      }
    };

    fetchClasses();

    return () => {
      controller.abort();
    };
  }, [teacherId]);

  const loadStudents = useCallback(async (classId: string, signal?: AbortSignal) => {
    setIsLoadingStudents(true);
    setError(null);
    try {
      const response = await apiClient.get(`/classes/${classId}/students`, { signal });

      if (!signal?.aborted) {
        const list = Array.isArray(response) ? response : [];
        const sorted = [...list].sort((a, b) => {
          const numA = Number(a.username);
          const numB = Number(b.username);
          if (Number.isNaN(numA) || Number.isNaN(numB)) {
            return a.username.localeCompare(b.username);
          }
          return numA - numB;
        });
        setStudents(sorted);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      if (!signal?.aborted) {
        setError(err.message || '获取学生列表失败');
        setStudents([]);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingStudents(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    const controller = new AbortController();
    void loadStudents(selectedClassId, controller.signal);

    return () => {
      controller.abort();
    };
  }, [selectedClassId, loadStudents]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [searchTerm]);

  const colorPalette = useMemo(() => [
    'from-primary to-primary/80',
    'from-success to-success/80',
    'from-accent to-accent/80',
    'from-warning to-warning/80',
    'from-info to-info/80',
  ], []);

  const getInitial = (fullName?: string | null, fallback?: string) => {
    const source = fullName?.trim() || fallback || '';
    if (!source) return '学';
    return source.charAt(0).toUpperCase();
  };

  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return students;
    const query = debouncedSearchTerm.toLowerCase();
    return students.filter(student =>
      student.username.toLowerCase().includes(query) ||
      student.full_name.toLowerCase().includes(query),
    );
  }, [students, debouncedSearchTerm]);

  const currentClassName = useMemo(() => {
    if (!selectedClassId) return '—';
    return classes.find(cls => String(cls.class_id) === selectedClassId)?.class_name ?? '—';
  }, [classes, selectedClassId]);

  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isProcessingRemoval, setIsProcessingRemoval] = useState(false);
  const [studentForPasswordReset, setStudentForPasswordReset] = useState<Student | null>(null);

  const handleCloseRemoveStudentModal = useCallback(() => {
    if (isProcessingRemoval) return;
    setStudentToRemove(null);
  }, [isProcessingRemoval]);

  const handleClosePasswordResetModal = useCallback(() => {
    setStudentForPasswordReset(null);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewStudent(INITIAL_NEW_STUDENT);
    setIsSubmitting(false);
  }, []);

  const handleCloseSelectModal = useCallback(() => {
    setShowSelectModal(false);
    if (shouldRefreshAfterSelectModal && selectedClassId) {
      void loadStudents(selectedClassId);
      setShouldRefreshAfterSelectModal(false);
    }
  }, [shouldRefreshAfterSelectModal, selectedClassId, loadStudents]);

  const handleResetPassword = (student: Student) => {
    setStudentForPasswordReset(student);
  };

  const handleOpenAddModal = () => {
    if (!selectedClassId) {
      showToast('请先选择一个班级', 'error');
      return;
    }
    setNewStudent({
      username: '',
      full_name: '',
      email: '',
      phone_number: '',
      password: '',
    });
    setShowAddModal(true);
  };

  const handleAddStudent = async () => {
    if (!selectedClassId) {
      showToast('请先选择一个班级', 'error');
      return;
    }

    const trimmedUsername = newStudent.username.trim();
    if (!/^\d{8,}$/.test(trimmedUsername)) {
      showToast('学号必须为至少8位的纯数字', 'error');
      return;
    }

    // 验证姓名
    const nameValidation = validateFullName(newStudent.full_name);
    if (!nameValidation.valid) {
      showToast(nameValidation.error || '姓名格式不正确', 'error');
      return;
    }

    // 验证密码
    const passwordValidation = validatePassword(newStudent.password, { minLength: 6, requireMixed: false });
    if (!passwordValidation.valid) {
      showToast(passwordValidation.error || '密码格式不正确', 'error');
      return;
    }

    // 验证邮箱（可选）
    if (newStudent.email.trim()) {
      const emailValidation = validateEmail(newStudent.email, false);
      if (!emailValidation.valid) {
        showToast(emailValidation.error || '邮箱格式不正确', 'error');
        return;
      }
    }

    // 验证手机号（可选）
    if (newStudent.phone_number.trim()) {
      const phoneValidation = validatePhone(newStudent.phone_number, false);
      if (!phoneValidation.valid) {
        showToast(phoneValidation.error || '手机号格式不正确', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 创建学生
      const payload: any = {
        username: trimmedUsername,
        full_name: newStudent.full_name.trim(),
        password: newStudent.password,
      };

      if (newStudent.email.trim()) {
        payload.email = newStudent.email.trim();
      }

      if (newStudent.phone_number.trim()) {
        payload.phone_number = newStudent.phone_number.trim();
      }

      const createdStudent = await apiClient.post<Student>(`/classes/${selectedClassId}/students`, payload);

      // 更新学生列表
      setStudents(prev => [...prev, createdStudent]);

      // 关闭modal并显示成功提示
      handleCloseAddModal();
      showToast('学生添加成功', 'success');
    } catch (err: any) {
      if (err.message.includes('409') || err.message.includes('已存在')) {
        showToast('学号或邮箱已存在，请检查后重试', 'error');
      } else {
        showToast(`添加学生失败: ${err.message}`, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove || !selectedClassId) return;

    setIsProcessingRemoval(true);
    try {
      await apiClient.delete(`/classes/${selectedClassId}/students/${studentToRemove.user_id}`);
      setStudents(prev => prev.filter(student => student.user_id !== studentToRemove.user_id));
      setStudentToRemove(null);
      showToast('学生已成功移除', 'success');
    } catch (err: any) {
      showToast(`移除学生失败: ${err.message}`, 'error');
    } finally {
      setIsProcessingRemoval(false);
    }
  };

  const renderTableBody = () => {
    if (!selectedClassId) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
            请先选择一个班级查看学生列表。
          </TableCell>
        </TableRow>
      );
    }

    if (isLoadingStudents) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="animate-spin" size={18} />
              <span>正在加载学生数据...</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (filteredStudents.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
            {students.length === 0 ? '该班级暂无学生。' : '未找到符合条件的学生。'}
          </TableCell>
        </TableRow>
      );
    }

    return filteredStudents.map((student, index) => (
      <TableRow key={student.user_id}>
        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{index + 1}</TableCell>
        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">{student.username}</TableCell>
        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorPalette[index % colorPalette.length]} flex items-center justify-center text-primary-foreground text-sm font-semibold`}>
              {getInitial(student.full_name, student.username)}
            </div>
            <div>
              <p className="font-medium text-foreground">{student.full_name}</p>
              <p className="text-xs text-muted-foreground">学号 {student.username}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
          <div className="flex items-center space-x-2">
            <Mail size={14} className="text-primary" />
            <span>{student.email ?? '—'}</span>
          </div>
        </TableCell>
        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
          <div className="flex items-center space-x-2">
            <Phone size={14} className="text-success" />
            <span>{student.phone_number ?? '—'}</span>
          </div>
        </TableCell>
        
        <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleResetPassword(student)}
              size="sm"
              title="重置学生密码"
              disabled={false}
            >
              设置新密码
            </Button>
            <Button
              onClick={() => setStudentToRemove(student)}
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive focus:ring-destructive/40"
              title="从班级移除学生"
            >
              移除
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">学生管理</h1>
          {selectedClassId && (
            <p className="text-sm text-muted-foreground mt-1">当前班级：{currentClassName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedClassId) {
                showToast('请先选择一个班级', 'error');
                return;
              }
              setShowSelectModal(true);
            }}
          >
            <ListPlus size={16} className="mr-2" />
            从学生库中添加
          </Button>
          <Button onClick={handleOpenAddModal} className="bg-success hover:bg-success/90">
            <UserPlus size={16} className="mr-2" />
            添加学生
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-foreground mb-2">选择班级</Label>
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={isLoadingClasses}
            >
              <SelectTrigger className="w-full" aria-label="选择班级">
                <SelectValue placeholder={isLoadingClasses ? '加载中...' : '请选择班级'} />
              </SelectTrigger>
              <SelectContent>
                {classes.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    {isLoadingClasses ? '加载中...' : '暂无班级'}
                  </SelectItem>
                ) : (
                  classes.map(cls => (
                    <SelectItem key={cls.class_id} value={String(cls.class_id)}>
                      {cls.class_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-foreground mb-2">按学号/姓名搜索</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入学号或姓名"
                className="pl-10 pr-4 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">学生列表</h2>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">序号</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">学号</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">学生姓名</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">邮箱</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">手机号码</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">
              {renderTableBody()}
            </TableBody>
          </Table>
        </div>
      </div>
      <Modal
        isOpen={!!studentToRemove}
        onClose={handleCloseRemoveStudentModal}
        title="确认移除学生"
        size="small"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                确认将学生 <span className="font-medium text-foreground">{studentToRemove?.full_name}</span> ({studentToRemove?.username}) 从班级
                <span className="font-medium text-foreground"> {currentClassName}</span> 中移除吗？
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseRemoveStudentModal} disabled={isProcessingRemoval}>
              取消
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleRemoveStudent}
              disabled={isProcessingRemoval}
            >
              {isProcessingRemoval ? '移除中...' : '确认移除'}
            </Button>
          </div>
        </div>
      </Modal>

      <ResetPasswordModal
        isOpen={!!studentForPasswordReset}
        onClose={handleClosePasswordResetModal}
        student={studentForPasswordReset}
        showToast={showToast}
      />

      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title="添加学生"
      >
        <div className="space-y-4">
          <div>
            <Label className="text-foreground mb-2">
              学号 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              value={newStudent.username}
              onChange={(e) => setNewStudent(prev => ({ ...prev, username: e.target.value }))}
              className="rounded-lg"
              placeholder="例如：20210001"
              minLength={8}
              maxLength={20}
              pattern="\\d{8,}"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              仅支持数字，至少8位
            </p>
          </div>

          <div>
            <Label className="text-foreground mb-2">
              姓名 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={newStudent.full_name}
              onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
              className="rounded-lg"
              placeholder="例如：张三"
              minLength={2}
              maxLength={20}
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              2-20个字符，允许中文和英文
            </p>
          </div>

          <div>
            <Label className="text-foreground mb-2">
              初始密码 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              value={newStudent.password}
              onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
              className="rounded-lg"
              placeholder="至少6个字符，可为纯数字"
              minLength={6}
              maxLength={20}
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              6-20个字符
            </p>
          </div>

          <div>
            <Label className="text-foreground mb-2">
              邮箱（可选）
            </Label>
            <Input
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
              className="rounded-lg"
              placeholder="例如：zhangsan@example.com"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              未填写时系统将自动生成邮箱
            </p>
          </div>

          <div>
            <Label className="text-foreground mb-2">
              手机号（可选）
            </Label>
            <Input
              type="tel"
              value={newStudent.phone_number}
              onChange={(e) => setNewStudent(prev => ({ ...prev, phone_number: e.target.value }))}
              className="rounded-lg"
              placeholder="例如：13800138000"
              pattern="1[3-9]\d{9}"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              请输入11位中国大陆手机号
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-primary">
              <strong>提示：</strong>学生将被添加到当前选择的班级 <span className="font-semibold">{currentClassName}</span>
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseAddModal}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={isSubmitting}
              className="bg-success hover:bg-success/90"
            >
              {isSubmitting ? '添加中...' : '确认添加'}
            </Button>
          </div>
        </div>
      </Modal>

      <SelectStudentModal
        isOpen={showSelectModal}
        onClose={handleCloseSelectModal}
        classId={selectedClassId}
        onStudentEnrolled={() => {
          setShouldRefreshAfterSelectModal(true);
        }}
        showToast={showToast}
      />

      
    </div>
  );
};

export default StudentManagement;
