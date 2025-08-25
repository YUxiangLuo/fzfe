import React, { useState } from "react";
import { Plus, Upload, Edit2, Trash2, Users } from "lucide-react";
import type { Class } from "../../types";
import Modal from "../Common/Modal";
import Button from "../Common/Button";

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([
    {
      id: "1",
      name: "软件工程2022级",
      code: "SE2022",
      status: "active",
      createdAt: "2024-01-15",
      studentCount: 45,
    },
    {
      id: "2",
      name: "计算机科学2023级",
      code: "CS2023",
      status: "active",
      createdAt: "2024-02-20",
      studentCount: 52,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayOrder: "1",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedClassForImport, setSelectedClassForImport] = useState("");

  const handleCreate = () => {
    const newClass: Class = {
      id: Date.now().toString(),
      name: formData.name,
      code: `CLS${Date.now().toString().slice(-6)}`,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
      studentCount: 0,
    };
    setClasses((prev) => [...prev, newClass]);
    setShowCreateModal(false);
    setFormData({ name: "", displayOrder: "1" });
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      displayOrder: "1",
    });
    setShowCreateModal(true);
  };

  const handleUpdate = () => {
    if (!editingClass) return;

    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === editingClass.id ? { ...cls, name: formData.name } : cls,
      ),
    );
    setShowCreateModal(false);
    setEditingClass(null);
    setFormData({ name: "", displayOrder: "1" });
  };

  const handleDelete = (id: string) => {
    setClasses((prev) => prev.filter((cls) => cls.id !== id));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = () => {
    if (!selectedFile || !selectedClassForImport) return;

    // 模拟批量导入
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === selectedClassForImport
          ? {
              ...cls,
              studentCount:
                cls.studentCount + Math.floor(Math.random() * 30) + 10,
            }
          : cls,
      ),
    );

    setShowImportModal(false);
    setSelectedFile(null);
    setSelectedClassForImport("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">班级管理</h1>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            新增班级
          </Button>
          <Button onClick={() => setShowImportModal(true)} variant="outline">
            <Upload size={16} className="mr-2" />
            批量导入学生
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">班级列表</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  班级名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  班级编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学生人数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((classItem) => (
                <tr key={classItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">
                        {classItem.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {classItem.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {classItem.studentCount} 人
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        classItem.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {classItem.status === "active" ? "活跃" : "停用"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {classItem.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(classItem)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(classItem.id)}
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

      {/* 创建/编辑班级模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingClass(null);
          setFormData({ name: "", displayOrder: "1" });
        }}
        title={editingClass ? "编辑班级" : "新增班级"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班级名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入班级名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              显示排序
            </label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  displayOrder: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入排序数字"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingClass(null);
                setFormData({ name: "", displayOrder: "1" });
              }}
            >
              取消
            </Button>
            <Button onClick={editingClass ? handleUpdate : handleCreate}>
              {editingClass ? "更新" : "创建"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 批量导入学生模态框 */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedFile(null);
          setSelectedClassForImport("");
        }}
        title="批量导入学生"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择班级
            </label>
            <select
              value={selectedClassForImport}
              onChange={(e) => setSelectedClassForImport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择班级</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传文件
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  点击上传或拖拽文件到此区域
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  支持 Excel (.xlsx, .xls) 和 CSV 格式
                </p>
              </label>
              {selectedFile && (
                <p className="mt-2 text-sm text-green-600">
                  已选择文件: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-1">
              文件格式说明：
            </p>
            <p className="text-xs text-blue-700">
              Excel/CSV 文件应包含以下列：学号、姓名、手机号、邮箱
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setSelectedFile(null);
                setSelectedClassForImport("");
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || !selectedClassForImport}
            >
              导入
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClassManagement;
