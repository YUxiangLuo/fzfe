import React, { useState } from 'react';
import { Edit2, Save, X, Phone, Mail, Calendar, Users } from 'lucide-react';
import { User } from '../../types';

const PersonalInfo: React.FC = () => {
  const [user, setUser] = useState<User>({
    id: '1',
    name: '张教授',
    phone: '13800138000',
    email: 'zhang.prof@university.edu.cn',
    registeredAt: '2024-01-15',
    managedClasses: ['软件工程2022级', '计算机科学2023级']
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const handleSave = (field: string) => {
    setUser(prev => ({
      ...prev,
      [field]: field === 'managedClasses' ? tempValue.split(',').map(s => s.trim()) : tempValue
    }));
    setEditingField(null);
    setTempValue('');
  };

  const handleCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">个人信息管理</h1>
          <p className="text-gray-600 mt-1">管理您的个人资料和基本信息</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-4 h-4 text-white" />
            </div>
            基本信息
          </h2>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 姓名 */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">姓名</p>
                  <p className="font-bold text-gray-900 text-lg">{user.name}</p>
                </div>
              </div>
            </div>

            {/* 手机号码 */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">手机号码</p>
                  {editingField === 'phone' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleSave('phone')}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <p className="font-bold text-gray-900 text-lg">{user.phone}</p>
                  )}
                </div>
              </div>
              {editingField !== 'phone' && (
                <button
                  onClick={() => handleEdit('phone', user.phone)}
                  className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-all duration-200 hover:scale-110"
                >
                  <Edit2 size={18} />
                </button>
              )}
            </div>

            {/* 邮箱 */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">邮箱</p>
                  <p className="font-bold text-gray-900 text-lg">{user.email}</p>
                </div>
              </div>
            </div>

            {/* 注册时间 */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">注册时间</p>
                  <p className="font-bold text-gray-900 text-lg">{user.registeredAt}</p>
                </div>
              </div>
            </div>

            {/* 管理的班级 */}
            <div className="md:col-span-2">
              <div className="flex items-start justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 hover:shadow-md transition-all duration-200">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mt-1">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-2">管理的班级</p>
                    {editingField === 'managedClasses' ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          placeholder="请用逗号分隔多个班级"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSave('managedClasses')}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {user.managedClasses.map((className, index) => (
                          <span
                            key={index}
                            className="inline-block px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm rounded-xl mr-2 mb-2 font-medium shadow-sm"
                          >
                            {className}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {editingField !== 'managedClasses' && (
                  <button
                    onClick={() => handleEdit('managedClasses', user.managedClasses.join(', '))}
                    className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg ml-2 transition-all duration-200 hover:scale-110"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;