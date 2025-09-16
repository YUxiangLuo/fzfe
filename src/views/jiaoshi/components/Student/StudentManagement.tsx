import React, { useState } from 'react';
import { Search, Edit2, Users, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { Student } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([
    {
      id: '1',
      studentId: '2022001',
      name: '张三',
      classId: '1',
      className: '软件工程2022级',
      phone: '13800138001',
      email: 'zhangsan@student.edu.cn',
      status: 'active',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      studentId: '2022002',
      name: '李四',
      classId: '1',
      className: '软件工程2022级',
      phone: '13800138002',
      email: 'lisi@student.edu.cn',
      status: 'active',
      createdAt: '2024-01-16'
    },
    {
      id: '3',
      studentId: '2023001',
      name: '王五',
      classId: '2',
      className: '计算机科学2023级',
      phone: '13800138003',
      email: 'wangwu@student.edu.cn',
      status: 'active',
      createdAt: '2024-02-20'
    }
  ]);

  const [filteredStudents, setFilteredStudents] = useState(students);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'delete' | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    classId: ''
  });

  const classes = [
    { id: '1', name: '软件工程2022级' },
    { id: '2', name: '计算机科学2023级' }
  ];

  // 筛选功能
  React.useEffect(() => {
    let filtered = students;

    if (selectedClass) {
      filtered = filtered.filter(student => student.classId === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.studentId.includes(searchTerm) || 
        student.name.includes(searchTerm)
      );
    }

    setFilteredStudents(filtered);
  }, [students, selectedClass, searchTerm]);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      phone: student.phone,
      email: student.email,
      classId: student.classId
    });
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingStudent) return;

    setStudents(prev => prev.map(student => 
      student.id === editingStudent.id
        ? {
            ...student,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            classId: formData.classId,
            className: classes.find(c => c.id === formData.classId)?.name || student.className
          }
        : student
    ));
    closeEditModal();
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingStudent(null);
    setFormData({ name: '', phone: '', email: '', classId: '' });
  };

  const handleConfirmAction = (action: 'reset' | 'delete') => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const executeConfirmAction = () => {
    if (!editingStudent || !confirmAction) return;

    if (confirmAction === 'reset') {
      alert(`学生 ${editingStudent.studentId} 的密码已重置为默认密码`);
    } else if (confirmAction === 'delete') {
      setStudents(prev => prev.filter(student => student.id !== editingStudent.id));
      closeEditModal();
    }

    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const cancelConfirmAction = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">学生管理</h1>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择班级</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部班级</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">按学号/姓名搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入学号或姓名"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总学生数</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">活跃学生</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">筛选结果</p>
              <p className="text-2xl font-bold text-gray-900">{filteredStudents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 学生列表 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">学生列表</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号码</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {student.className}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      student.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.status === 'active' ? '活跃' : '停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => handleEdit(student)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                      title="修改学生信息"
                    >
                      <Edit2 size={14} className="mr-1" />
                      修改
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑学生模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={closeEditModal}
        title="修改学生信息"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">学生姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">手机号码</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">班级</label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          
          {/* 危险操作区域 */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
              危险操作
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div>
                  <p className="text-sm font-medium text-orange-800">重置密码</p>
                  <p className="text-xs text-orange-600 mt-1">将学生密码重置为默认密码</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConfirmAction('reset')}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <RotateCcw size={14} className="mr-1" />
                  重置
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <p className="text-sm font-medium text-red-800">删除学生</p>
                  <p className="text-xs text-red-600 mt-1">从班级中永久移除该学生</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConfirmAction('delete')}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={14} className="mr-1" />
                  删除
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={closeEditModal}
            >
              取消
            </Button>
            <Button onClick={handleUpdate}>
              保存修改
            </Button>
          </div>
        </div>
      </Modal>

      {/* 确认操作模态框 */}
      <Modal
        isOpen={showConfirmModal}
        onClose={cancelConfirmAction}
        title="确认操作"
        size="small"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              confirmAction === 'delete' ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                confirmAction === 'delete' ? 'text-red-600' : 'text-orange-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {confirmAction === 'delete' ? '确认删除学生' : '确认重置密码'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {confirmAction === 'delete' 
                  ? `确定要删除学生 "${editingStudent?.studentName}" 吗？此操作不可撤销。`
                  : `确定要重置学生 "${editingStudent?.studentName}" 的密码吗？`
                }
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={cancelConfirmAction}>取消</Button>
            <Button 
              onClick={executeConfirmAction}
              className={confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {confirmAction === 'delete' ? '确认删除' : '确认重置'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentManagement;