import React, { useState } from "react";
import { Plus, Edit, Trash2, Download, Upload } from "lucide-react";
import type { ExperimentManual } from "../types";
import { mockManuals } from "../data/mockData";
import Modal from "./Modal";

const ExperimentManualView: React.FC = () => {
  const [manuals, setManuals] = useState<ExperimentManual[]>(mockManuals);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<ExperimentManual | null>(
    null,
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleStatusToggle = (id: string) => {
    setManuals((prev) =>
      prev.map((manual) => ({
        ...manual,
        status:
          manual.id === id
            ? manual.status === "enabled"
              ? "disabled"
              : "enabled"
            : manual.id === id && manual.status === "disabled"
              ? "enabled"
              : "disabled",
      })),
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除此实验手册吗？")) {
      setManuals((prev) => prev.filter((manual) => manual.id !== id));
    }
  };

  const handleUpload = () => {
    if (!uploadFile) {
      alert("请选择文件");
      return;
    }
    const newManual: ExperimentManual = {
      id: Date.now().toString(),
      name: uploadFile.name.replace(".pdf", ""),
      version: "v1.0.0",
      uploadTime: new Date().toLocaleString("zh-CN"),
      status: "disabled",
      filename: uploadFile.name,
    };

    const formData = new FormData();
    formData.append("file", uploadFile);
    fetch("http://localhost:3001/manuals", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data.message === "Manual uploaded successfully") {
          setManuals((prev) => [...prev, newManual]);
        }
        setUploadFile(null);
        setIsUploadModalOpen(false);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleEdit = (manual: ExperimentManual) => {
    setEditingManual(manual);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingManual) {
      setManuals((prev) =>
        prev.map((manual) =>
          manual.id === editingManual.id ? editingManual : manual,
        ),
      );
      setIsEditModalOpen(false);
      setEditingManual(null);
    }
  };

  const handleDownload = (filename: string) => {
    // 模拟下载功能
    console.log(`下载文件: ${filename}`);
    alert(`开始下载: ${filename}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验手册管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理学生端显示的实验手册，支持上传、更新和启用/禁用操作
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus size={18} />
          <span>新增</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                手册名称
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                版本号
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                上传时间
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                状态
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {manuals.map((manual) => (
              <tr
                key={manual.id}
                className="hover:bg-blue-50/30 transition-colors duration-200"
              >
                <td className="px-6 py-4 text-sm text-gray-900">
                  {manual.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {manual.version}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {manual.uploadTime}
                </td>
                <td className="px-6 py-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manual.status === "enabled"}
                      onChange={() => handleStatusToggle(manual.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                        manual.status === "enabled"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                          manual.status === "enabled"
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        } mt-0.5`}
                      ></div>
                    </div>
                    <span
                      className={`ml-3 text-sm ${
                        manual.status === "enabled"
                          ? "text-green-600 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      {manual.status === "enabled" ? "启用" : "禁用"}
                    </span>
                  </label>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(manual)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="修改"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(manual.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(manual.filename)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
                      title="导出"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 上传模态框 */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadFile(null);
        }}
        title="新增实验手册"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传PDF文件
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors duration-150">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
              >
                点击选择文件
              </label>
              <p className="text-sm text-gray-500 mt-2">
                支持PDF格式，文件大小不超过10MB
              </p>
              {uploadFile && (
                <p className="text-sm text-green-600 mt-2">
                  已选择: {uploadFile.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFile(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-150"
            >
              取消
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
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
          setEditingManual(null);
        }}
        title="修改实验手册"
      >
        {editingManual && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手册名称
              </label>
              <input
                type="text"
                value={editingManual.name}
                onChange={(e) =>
                  setEditingManual((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                版本号
              </label>
              <input
                type="text"
                value={editingManual.version}
                onChange={(e) =>
                  setEditingManual((prev) =>
                    prev ? { ...prev, version: e.target.value } : null,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingManual(null);
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

export default ExperimentManualView;
