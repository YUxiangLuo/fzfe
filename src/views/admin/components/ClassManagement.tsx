import React, { useState, useEffect } from 'react';
import { Search, Eye, Loader, AlertTriangle } from 'lucide-react';
import { Class } from '../../../types';
import { apiClient } from '../../../utils/apiClient';
import { ClassDetailsModal } from './ClassDetailsModal'; // 引入新的弹窗组件

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新增状态来管理弹窗
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get('/classes');
        setClasses(data || []);
        setFilteredClasses(data || []);
      } catch (err: any) {
        setError(err.message || '获取班级数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    let filtered = classes;
    if (searchTerm) {
      filtered = classes.filter(c =>
        c.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.class_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredClasses(filtered);
  }, [searchTerm, classes]);

  // 打开弹窗的处理函数
  const handleViewDetails = (classInfo: Class) => {
    setSelectedClass(classInfo);
    setIsDetailsModalOpen(true);
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={4} className="text-center py-12">
            <div className="flex justify-center items-center space-x-2 text-gray-500">
              <Loader className="animate-spin" size={20} />
              <span>正在加载班级数据...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={4} className="text-center py-12">
            <div className="flex flex-col justify-center items-center space-y-2 text-red-500">
              <AlertTriangle size={24} />
              <span>加载失败: {error}</span>
            </div>
          </td>
        </tr>
      );
    }

    if (filteredClasses.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="text-center py-12 text-gray-500">
            未找到符合条件的班级。
          </td>
        </tr>
      );
    }

    return filteredClasses.map((classInfo) => (
      <tr key={classInfo.class_id} className="hover:bg-blue-50/30 transition-colors duration-200">
        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{classInfo.class_code}</td>
        <td className="px-6 py-4 text-sm text-gray-900">{classInfo.class_name}</td>
        <td className="px-6 py-4 text-sm text-gray-600">{classInfo.teacher_name}</td>
        <td className="px-6 py-4">
          <button
            onClick={() => handleViewDetails(classInfo)}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
            title="查看班级详情"
          >
            <Eye size={16} />
            <span>查看班级详情</span>
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <>
      <div className="space-y-6">
        {/* 筛选器 */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-2xl border border-gray-200 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-3">班级名称/编号搜索</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="请输入班级名称或编号"
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 班级列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">班级编号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">班级名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">所属教师</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {renderTableContent()}
            </tbody>
          </table>
        </div>
      </div>

      {/* 渲染弹窗组件 */}
      <ClassDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        classInfo={selectedClass}
      />
    </>
  );
};

export default ClassManagement;
