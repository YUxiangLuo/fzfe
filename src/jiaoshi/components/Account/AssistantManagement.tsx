import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus } from 'lucide-react';
import { Assistant } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';

const AssistantManagement: React.FC = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([
    {
      id: '1',
      name: '李助教',
      phone: '13900139001',
      email: 'li.assistant@university.edu.cn',
      managedClasses: ['软件工程2022级'],
      status: 'active'
    },
    {
      id: '2',
      name: '王助教',
      phone: '13900139002',
      email: 'wang.assistant@university.edu.cn',
      managedClasses: ['计算机科学2023级'],
      status: 'active'
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    managedClasses: ''
  });

  const handleCreate = () => {
    const newAssistant: Assistant = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      managedClasses: formData.managedClasses.split(',').map(s => s.trim()),
      status: 'active'
    };
    setAssistants(prev => [...prev, newAssistant]);
    setShowCreateModal(false);
    setFormData({ name: '', phone: '', email: '', password: '', managedClasses: '' });
  };

  const handleEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setFormData({
      name: assistant.name,
      phone: assistant.phone,
      email: assistant.email,
      password: '',
      managedClasses: assistant.managedClasses.join(', ')
    });
    setShowCreateModal(true);
  };

  const handleUpdate = () => {
    if (!editingAssistant) return;
    
    setAssistants(prev => prev.map(assistant => 
      assistant.id === editingAssistant.id
        ? {
            ...assistant,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            managedClasses: formData.managedClasses.split(',').map(s => s.trim())
          }
        : assistant
    ));
    setShowCreateModal(false);
    setEditingAssistant(null);
    setFormData({ name: '', phone: '', email: '', password: '', managedClasses: '' });
  };

  const handleDelete = (id: string) => {
    setAssistants(prev => prev.filter(assistant => assistant.id !== id));
  };

  const existingTeachers = [
    { id: '3', name: '陈老师', email: 'chen@university.edu.cn', phone: '13900139003' },
    { id: '4', name: '刘老师', email: 'liu@university.edu.cn', phone: '13900139004' },
  ];

  const handleSelectFromLibrary = (teacher: any) => {
    const newAssistant: Assistant = {
      id: teacher.id,
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      managedClasses: [],
      status: 'active'
    };
    setAssistants(prev => [...prev, newAssistant]);
    setShowSelectModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">助教管理</h1>
        <div className="flex space-x-3">
          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={16} className="mr-2" />
            创建助教
          </Button>
          <Button onClick={() => setShowSelectModal(true)} variant="outline">
            <UserPlus size={16} className="mr-2" />
            从库中选择
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="搜索助教..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">管理的班级</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assistants.map((assistant, index) => (
                <tr key={assistant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {assistant.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assistant.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {assistant.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex flex-wrap gap-1">
                      {assistant.managedClasses.map((className, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {className}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      assistant.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {assistant.status === 'active' ? '活跃' : '停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(assistant)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(assistant.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 创建/编辑助教模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingAssistant(null);
          setFormData({ name: '', phone: '', email: '', password: '', managedClasses: '' });
        }}
        title={editingAssistant ? '编辑助教' : '创建助教'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入手机号"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入邮箱"
            />
          </div>
          {!editingAssistant && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">初始密码</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入初始密码"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">管理的班级</label>
            <input
              type="text"
              value={formData.managedClasses}
              onChange={(e) => setFormData(prev => ({ ...prev, managedClasses: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请用逗号分隔多个班级"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingAssistant(null);
                setFormData({ name: '', phone: '', email: '', password: '', managedClasses: '' });
              }}
            >
              取消
            </Button>
            <Button onClick={editingAssistant ? handleUpdate : handleCreate}>
              {editingAssistant ? '更新' : '创建'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 从库中选择模态框 */}
      <Modal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        title="从库中选择助教"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">手机号</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {existingTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{teacher.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{teacher.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{teacher.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      <Button
                        size="sm"
                        onClick={() => handleSelectFromLibrary(teacher)}
                      >
                        选择
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowSelectModal(false)}>
              取消
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AssistantManagement;