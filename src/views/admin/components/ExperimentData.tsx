import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Loader,
  AlertTriangle,
} from "lucide-react";
import type { ExperimentData } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { DOWNLOAD_SERVER_BASE_URL } from "../../../config/appConfig";
import Modal from "./Modal";

const ExperimentDataView: React.FC = () => {
  const [datasets, setDatasets] = useState<ExperimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ExperimentData | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [datasetNotes, setDatasetNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get("/datasets");
        setDatasets(data || []);
      } catch (err: any) {
        setError(err.message || "获取数据集失败");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  const handleDelete = async (datasetId: number) => {
    if (confirm("确定要删除此数据集吗？此操作会删除服务器上的文件。")) {
      try {
        await apiClient.delete(`/datasets/${datasetId}`);
        setDatasets((prev) => prev.filter((d) => d.dataset_id !== datasetId));
      } catch (err: any) {
        alert(`删除失败: ${err.message}`);
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !datasetName) {
      alert("请填写数据集名称并选择文件");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("data_name", datasetName);
    formData.append("description", datasetNotes);

    try {
      const newDataset = await apiClient.postFormData("/datasets", formData);
      setDatasets((prev) => [newDataset, ...prev]);
      resetUploadModal();
    } catch (err: any) {
      alert(`上传失败: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingData) return;
    try {
      const updatedDataset = await apiClient.put(
        `/datasets/${editingData.dataset_id}`,
        {
          data_name: editingData.data_name,
          description: editingData.description,
        },
      );
      setDatasets((prev) =>
        prev.map((d) =>
          d.dataset_id === updatedDataset.dataset_id ? updatedDataset : d,
        ),
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    }
  };

  const handleDownload = (filePath: string) => {
    console.log(filePath);
    const filename = filePath.split("/").pop();
    const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/datasets/${filename}`;
    window.open(fullUrl, "_blank");
  };

  const resetUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setDatasetName("");
    setDatasetNotes("");
  };

  const renderTableBody = () => {
    if (isLoading)
      return (
        <tr>
          <td colSpan={4} className="text-center py-12">
            <Loader className="animate-spin mx-auto text-gray-400" />
          </td>
        </tr>
      );
    if (error)
      return (
        <tr>
          <td colSpan={4} className="text-center py-12 text-red-500">
            <AlertTriangle className="mx-auto" />
            <p className="mt-2">{error}</p>
          </td>
        </tr>
      );
    if (datasets.length === 0)
      return (
        <tr>
          <td colSpan={4} className="text-center py-12 text-gray-500">
            暂无实验数据
          </td>
        </tr>
      );

    return datasets.map((data) => (
      <tr
        key={data.dataset_id}
        className="hover:bg-blue-50/30 transition-colors duration-200"
      >
        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
          {data.data_name}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {data.description || "-"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {new Date(data.uploaded_at).toLocaleString("zh-CN")}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setEditingData(data);
                setIsEditModalOpen(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
              title="修改"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleDelete(data.dataset_id)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
              title="删除"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => handleDownload(data.file_path)}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
              title="下载"
            >
              <Download size={16} />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实验数据管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理实验所需的基础数据集，支持上传、更新操作
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg"
        >
          <Plus size={18} />
          <span>新增数据</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                数据集名称
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                备注
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                上传时间
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {renderTableBody()}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={resetUploadModal}
        title="新增实验数据"
      >
        <div className="space-y-6">
          <div>
            <label
              htmlFor="dataset-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              数据集名称
            </label>
            <input
              type="text"
              id="dataset-name"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如：苹果公司2023年销售数据"
            />
          </div>
          <div>
            <label
              htmlFor="dataset-notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              备注 (可选)
            </label>
            <textarea
              id="dataset-notes"
              value={datasetNotes}
              onChange={(e) => setDatasetNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如：包含了iPhone, iPad等产品的季度销售数据"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数据格式要求
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">
                请确保上传的CSV或Excel文件包含以下列标题：
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <code className="bg-blue-100 px-1 rounded">年份</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">月份</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">销售数量</code>
                </li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传数据文件
            </label>
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept=".csv, .xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <p className="text-blue-600 font-medium">点击或拖拽文件到此处</p>
              <p className="text-sm text-gray-500 mt-2">
                支持CSV, Excel等格式，文件大小不超过20MB
              </p>
              {uploadFile && (
                <p className="text-sm text-green-600 mt-2 font-semibold">
                  已选择: {uploadFile.name}
                </p>
              )}
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={resetUploadModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || !datasetName || isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isUploading && (
                <Loader className="animate-spin mr-2" size={16} />
              )}
              {isUploading ? "上传中..." : "确认上传"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="修改实验数据"
      >
        {editingData && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据集名称
              </label>
              <input
                type="text"
                value={editingData.data_name}
                onChange={(e) =>
                  setEditingData((prev) =>
                    prev ? { ...prev, data_name: e.target.value } : null,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注
              </label>
              <textarea
                rows={3}
                value={editingData.description || ""}
                onChange={(e) =>
                  setEditingData((prev) =>
                    prev ? { ...prev, description: e.target.value } : null,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
