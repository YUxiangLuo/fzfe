import React, { useState } from "react";
import { Upload, Edit, Eye, Trash2 } from "lucide-react";
import { ExperimentData } from "../types";
import { mockExperimentData } from "../data/mockData";
import Modal from "./Modal";

const ExperimentDataView: React.FC = () => {
  const [experimentData, setExperimentData] =
    useState<ExperimentData[]>(mockExperimentData);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ExperimentData | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleEdit = (data: ExperimentData) => {
    setEditingData(data);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingData) {
      setExperimentData((prev) =>
        prev.map((data) =>
          data.id === editingData.id
            ? {
                ...editingData,
                lastUpdated: new Date().toLocaleString("zh-CN"),
              }
            : data,
        ),
      );
      setIsEditModalOpen(false);
      setEditingData(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除此实验数据吗？")) {
      setExperimentData((prev) => prev.filter((data) => data.id !== id));
    }
  };

  const handleView = (data: ExperimentData) => {
    alert(
      `查看实验数据详情：${data.name}\n所属行业：${data.industry}\n所属企业：${data.enterprise}\n版本：${data.version}`,
    );
  };

  const handleUpload = () => {
    if (uploadFile) {
      const newData: ExperimentData = {
        id: Date.now().toString(),
        name: uploadFile.name.replace(".csv", ""),
        industry: "待分类",
        enterprise: "待确认",
        version: "v1.0.0",
        lastUpdated: new Date().toLocaleString("zh-CN"),
      };
      const formData = new FormData();
      formData.append("file", uploadFile);
      fetch("http://localhost:3001/api/upload/dataset", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          setExperimentData((prev) => [...prev, newData]);
          setUploadFile(null);
          setIsUploadModalOpen(false);
          alert("CSV文件上传成功！");
        })
        .catch((error) => {
          console.error("上传失败", error);
          alert("CSV文件上传失败！");
        });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验数据管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理企业产品销售数据集，为虚拟仿真实验提供真实的商业数据支持
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Upload size={18} />
            <span>上传数据</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                数据集名称
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                所属行业
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                所属企业
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                版本
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                最后更新时间
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {experimentData.map((data) => (
              <tr
                key={data.id}
                className="hover:bg-blue-50/30 transition-colors duration-200"
              >
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {data.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {data.industry}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {data.enterprise}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 font-semibold">
                    {data.version}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {data.lastUpdated}
                </td>
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

      {/* CSV上传模态框 */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadFile(null);
        }}
        title="上传销售数据集"
        maxWidth="max-w-lg"
      >
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              数据格式要求
            </h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 仅支持 CSV 格式文件</li>
              <li>• 建议包含：产品名称、销售日期、销售数量、销售金额等字段</li>
              <li>• 文件大小不超过 50MB</li>
              <li>• 确保数据完整性和准确性</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择CSV文件
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
                  <Upload size={24} className="text-white" />
                </div>
                <div className="text-blue-600 hover:text-blue-700 font-semibold text-lg">
                  点击选择CSV文件
                </div>
              </label>
              <p className="text-sm text-gray-500 mt-2">或将文件拖拽到此区域</p>
              {uploadFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ 已选择文件
                  </p>
                  <p className="text-sm text-green-600">{uploadFile.name}</p>
                  <p className="text-xs text-green-500 mt-1">
                    文件大小: {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFile(null);
              }}
              className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium"
            >
              取消
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              确认上传
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
        title="编辑数据集信息"
        maxWidth="max-w-lg"
      >
        {editingData && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据集名称
              </label>
              <input
                type="text"
                value={editingData.name}
                onChange={(e) =>
                  setEditingData((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所属行业
              </label>
              <input
                type="text"
                value={editingData.industry}
                onChange={(e) =>
                  setEditingData((prev) =>
                    prev ? { ...prev, industry: e.target.value } : null,
                  )
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所属企业
              </label>
              <input
                type="text"
                value={editingData.enterprise}
                onChange={(e) =>
                  setEditingData((prev) =>
                    prev ? { ...prev, enterprise: e.target.value } : null,
                  )
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                版本
              </label>
              <input
                type="text"
                value={editingData.version}
                onChange={(e) =>
                  setEditingData((prev) =>
                    prev ? { ...prev, version: e.target.value } : null,
                  )
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingData(null);
                }}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
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
