import React, { useState } from 'react';
import { Eye, Trash2, Users } from 'lucide-react';
import { Class } from '../types';
import { mockClasses } from '../data/mockData';

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>(mockClasses);

  const handleViewDetails = (classInfo: Class) => {
    alert(`查看班级详情：${classInfo.className}\n班级编号：${classInfo.classNumber}\n任课教师：${classInfo.teacher}\n学生人数：${classInfo.studentCount}`);
  };

  const handleDismissClass = (id: string) => {
    const classInfo = classes.find(c => c.id === id);
    if (confirm(`确定要解散班级 "${classInfo?.className}" 吗？此操作不可撤销。`)) {
      setClasses(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">班级管理</h2>
        </div>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          共 {classes.length} 个班级
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">班级编号</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">班级名称</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">所属教师</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">创建时间</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">班级人数</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.map((classInfo) => (
              <tr key={classInfo.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{classInfo.classNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{classInfo.className}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{classInfo.teacher}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{classInfo.createTime}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 font-semibold">
                    {classInfo.studentCount} 人
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleViewDetails(classInfo)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="查看详情"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDismissClass(classInfo.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="解散班级"
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
  );
};

export default ClassManagement;