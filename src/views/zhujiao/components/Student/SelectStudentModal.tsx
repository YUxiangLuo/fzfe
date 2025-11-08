import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../../../shared/components/Modal';
import Button from '../../../../shared/components/Button';
import { apiClient } from '../../../../utils/apiClient';
import type { Student } from '../../types';
import { Loader, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SelectStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  onStudentEnrolled: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface EnrollState {
  [studentId: number]: 'idle' | 'loading' | 'success' | 'error';
}

const SelectStudentModal: React.FC<SelectStudentModalProps> = ({
  isOpen,
  onClose,
  classId,
  onStudentEnrolled,
  showToast,
}) => {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [enrollState, setEnrollState] = useState<EnrollState>({});

  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchStudents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get('/students/unenrolled');
        setAllStudents(Array.isArray(data) ? data : []);
        setEnrollState({});
      } catch (err: any) {
        setError(err.message || '获取未分配学生列表失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [isOpen]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return allStudents;
    const query = debouncedSearchTerm.toLowerCase();
    return allStudents.filter((student) => student.username.toLowerCase().includes(query));
  }, [allStudents, debouncedSearchTerm]);

  const handleEnroll = async (student: Student) => {
    setEnrollState((prev) => ({ ...prev, [student.user_id]: 'loading' }));
    try {
      await apiClient.post(`/classes/${classId}/enroll`, {
        student_id: student.user_id,
      });
      setEnrollState((prev) => ({ ...prev, [student.user_id]: 'success' }));
      onStudentEnrolled();
      showToast('学生添加成功', 'success');
    } catch (err: any) {
      setEnrollState((prev) => ({ ...prev, [student.user_id]: 'error' }));
      showToast(err.message || '添加学生失败', 'error');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      );
    }

    if (filteredStudents.length === 0) {
      return <p className="text-sm text-gray-500 text-center py-8">暂无可加入的学生</p>;
    }

    return (
      <div className="max-h-[360px] overflow-y-auto space-y-3">
        {filteredStudents.map((student) => {
          const state = enrollState[student.user_id] ?? 'idle';
          const isLoading = state === 'loading';
          const isSuccess = state === 'success';
          return (
            <div
              key={student.user_id}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{student.full_name}</p>
                <p className="text-xs text-gray-500">学号：{student.username}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleEnroll(student)}
                disabled={isLoading || isSuccess}
                className={isSuccess ? 'bg-green-600 hover:bg-green-600' : undefined}
              >
                {isLoading ? (
                  <Loader className="animate-spin mr-2" size={16} />
                ) : isSuccess ? (
                  <CheckCircle2 className="mr-2" size={16} />
                ) : null}
                {isSuccess ? '已添加' : '添加到班级'}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="从学生库中添加">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="按学号搜索（至少两位）"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {renderContent()}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SelectStudentModal;
