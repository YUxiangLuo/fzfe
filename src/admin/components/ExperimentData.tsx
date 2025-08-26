import React, { useState } from 'react';
import { Plus, Upload, Download, Edit, Eye, Trash2 } from 'lucide-react';
import { ExperimentData } from '../types';
import { mockExperimentData } from '../data/mockData';
import Modal from './Modal';

const ExperimentDataView: React.FC = () => {
  const [experimentData, setExperimentData] = useState<ExperimentData[]>(mockExperimentData);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ExperimentData | null>(null);
  const [newData, setNewData] = useState<Partial<ExperimentData>>({
    name: '',
    industry: '',
    enterprise: '',
    version: ''
  });

  const handleAdd = () => {
    if (newData.name && newData.industry && newData.enterprise && newData.version) {
      const data: ExperimentData = {
        id: Date.now().toString(),
        name: newData.name,
        industry: newData.industry,
        enterprise: newData.enterprise,
        version: newData.version,
        lastUpdated: new Date().toLocaleString('zh-CN')
      };
      setExperimentData(prev => [...prev, data]);
      setNewData({ name: '', industry: '', enterprise: '', version: '' });
      setIsAddModalOpen(false);
    }
  };

  const handleEdit = (data: ExperimentData) => {
    setEditingData(data);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingData) {
      setExperimentData(prev => prev.map(data => 
        data.id === editingData.id ? {
          ...editingData,
          lastUpdated: new Date().toLocaleString('zh-CN')
        } : data
      ));
      setIsEditModalOpen(false);
      setEditingData(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此实验数据吗？')) {
      setExperimentData(prev => prev.filter(data => data.id !== id));
    }
  };

  const handleView = (data: ExperimentData) => {
    alert(`查看实验数据详情：${data.name}`);
  };

  const handleExport = () => {
    console.log('导出所有实验数据');
    alert('开始导出实验数据...');
  };

  const handleBatchUpload = () => {
    console.log('批量上传实验数据');
    alert('打开批量上传界面...');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验数据管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理和校对实验中使用的核心数据，确保数据的准确性</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBatchUpload}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2.5 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Upload size={18} />
            <span>上传</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2.5 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Download size={18} />
            <span>导出</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus size={18} />
            <span>新增</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">数据名称</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">所属行业</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">所属企业</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">版本</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">最后更新时间</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {experimentData.map((data) => (
              <tr key={data.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{data.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{data.industry}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{data.enterprise}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{data.version}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{data.lastUpdated}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(data)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="编辑"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleView(data)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="查看详情"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(data.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="删除"
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

      {/* 新增模态框 */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNewData({ name: '', industry: '', enterprise: '', version: '' });
        }}
        title="新增实验数据"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">数据名称</label>
            <input
              type="text"
              value={newData.name || ''}
              onChange={(e) => setNewData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              placeholder="请输入数据名称"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">所属行业</label>
            <input
              type="text"
              value={newData.industry || ''}
              onChange={(e) => setNewData(prev => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              placeholder="请输入所属行业"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">所属企业</label>
            <input
              type="text"
              value={newData.enterprise || ''}
              onChange={(e) => setNewData(prev => ({ ...prev, enterprise: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              placeholder="请输入所属企业"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">版本</label>
            <input
              type="text"
              value={newData.version || ''}
              onChange={(e) => setNewData(prev => ({ ...prev, version: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              placeholder="请输入版本号"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setNewData({ name: '', industry: '', enterprise: '', version: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-150"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-150"
            >
              确认新增
            </button>
          </div>
        </div>
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingData(null);
        }}
        title="编辑实验数据"
        maxWidth="max-w-lg"
      >
        {editingData && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">数据名称</label>
              <input
                type="text"
                value={editingData.name}
                onChange={(e) => setEditingData(prev => 
                  prev ? { ...prev, name: e.target.value } : null
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">所属行业</label>
              <input
                type="text"
                value={editingData.industry}
                onChange={(e) => setEditingData(prev => 
                  prev ? { ...prev, industry: e.target.value } : null
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">所属企业</label>
              <input
                type="text"
                value={editingData.enterprise}
                onChange={(e) => setEditingData(prev => 
                  prev ? { ...prev, enterprise: e.target.value } : null
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">版本</label>
              <input
                type="text"
                value={editingData.version}
                onChange={(e) => setEditingData(prev => 
                  prev ? { ...prev, version: e.target.value } : null
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingData(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-150"
              >
                保存修改
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExperimentDataView;