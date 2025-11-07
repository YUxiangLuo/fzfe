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

const DATASET_NAME_MIN_LENGTH = 2;
const MAX_DATASET_NAME_LENGTH = 100;
const MAX_DATASET_NOTES_LENGTH = 200;
const MAX_DATASET_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_DATASET_EXTENSIONS = [".csv"];

const getDatasetNameError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "数据集名称不能为空";
  if (trimmed.length < DATASET_NAME_MIN_LENGTH)
    return `数据集名称至少需要${DATASET_NAME_MIN_LENGTH}个字符`;
  if (trimmed.length > MAX_DATASET_NAME_LENGTH)
    return `数据集名称不能超过${MAX_DATASET_NAME_LENGTH}个字符`;
  return "";
};

const getDatasetNotesError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX_DATASET_NOTES_LENGTH)
    return `备注不能超过${MAX_DATASET_NOTES_LENGTH}个字符`;
  return "";
};

const getDatasetFileError = (file: File | null) => {
  if (!file) return "请上传数据文件";
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (extension && !ALLOWED_DATASET_EXTENSIONS.includes(extension)) {
    return "仅支持上传CSV文件";
  }
  if (file.size > MAX_DATASET_FILE_SIZE) {
    return "文件大小不能超过50MB";
  }
  return "";
};

type DatasetUploadErrors = {
  name: string;
  notes: string;
  file: string;
};

type DatasetEditErrors = {
  name: string;
  notes: string;
};

const INITIAL_UPLOAD_ERRORS: DatasetUploadErrors = {
  name: "",
  notes: "",
  file: "",
};

const INITIAL_EDIT_ERRORS: DatasetEditErrors = {
  name: "",
  notes: "",
};

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
  const [uploadErrors, setUploadErrors] = useState<DatasetUploadErrors>(
    INITIAL_UPLOAD_ERRORS,
  );
  const [editErrors, setEditErrors] = useState<DatasetEditErrors>(
    INITIAL_EDIT_ERRORS,
  );

  const handleDatasetNameChange = (value: string) => {
    setDatasetName(value);
    setUploadErrors((prev) => ({
      ...prev,
      name: getDatasetNameError(value),
    }));
  };

  const handleDatasetNotesChange = (value: string) => {
    setDatasetNotes(value);
    setUploadErrors((prev) => ({
      ...prev,
      notes: getDatasetNotesError(value),
    }));
  };

  const handleDatasetFileChange = (file: File | null) => {
    setUploadFile(file);
    setUploadErrors((prev) => ({
      ...prev,
      file: getDatasetFileError(file),
    }));
  };

  const handleEditDatasetNameChange = (value: string) => {
    setEditingData((prev) => (prev ? { ...prev, data_name: value } : null));
    setEditErrors((prev) => ({
      ...prev,
      name: getDatasetNameError(value),
    }));
  };

  const handleEditDatasetNotesChange = (value: string) => {
    setEditingData((prev) => (prev ? { ...prev, description: value } : null));
    setEditErrors((prev) => ({
      ...prev,
      notes: getDatasetNotesError(value),
    }));
  };

  const isUploadFormValid =
    datasetName.trim() !== "" &&
    uploadFile !== null &&
    Object.values(uploadErrors).every((error) => error === "");

  const isEditFormValid =
    !!editingData &&
    editingData.data_name.trim() !== "" &&
    Object.values(editErrors).every((error) => error === "");

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
    const nameError = getDatasetNameError(datasetName);
    const fileError = getDatasetFileError(uploadFile);
    const notesError = getDatasetNotesError(datasetNotes);

    setUploadErrors({ name: nameError, file: fileError, notes: notesError });

    if (nameError || fileError || notesError) {
      return;
    }

    if (!uploadFile) {
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("data_name", datasetName.trim());
    formData.append("description", datasetNotes.trim());

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
    const nameError = getDatasetNameError(editingData.data_name);
    const notesError = getDatasetNotesError(editingData.description || "");
    setEditErrors({ name: nameError, notes: notesError });
    if (nameError || notesError) return;
    try {
      const updatedDataset = await apiClient.put(
        `/datasets/${editingData.dataset_id}`,
        {
          data_name: editingData.data_name.trim(),
          description: (editingData.description || "").trim(),
        },
      );
      setDatasets((prev) =>
        prev.map((d) =>
          d.dataset_id === updatedDataset.dataset_id ? updatedDataset : d,
        ),
      );
      closeEditModal();
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
    setUploadErrors({ ...INITIAL_UPLOAD_ERRORS });
  };

  const openUploadModal = () => {
    setDatasetName("");
    setDatasetNotes("");
    setUploadFile(null);
    setUploadErrors({ ...INITIAL_UPLOAD_ERRORS });
    setIsUploadModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingData(null);
    setEditErrors({ ...INITIAL_EDIT_ERRORS });
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
          {formatDateTime(data.uploaded_at)}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setEditingData({ ...data });
                setEditErrors({ ...INITIAL_EDIT_ERRORS });
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
          onClick={openUploadModal}
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
              onChange={(e) => handleDatasetNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：苹果公司2023年销售数据"
            />
            {uploadErrors.name && (
              <p className="mt-1 text-xs text-red-500">{uploadErrors.name}</p>
            )}
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
              onChange={(e) => handleDatasetNotesChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如：包含了iPhone, iPad等产品的季度销售数据"
            ></textarea>
            {uploadErrors.notes && (
              <p className="mt-1 text-xs text-red-500">{uploadErrors.notes}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数据格式要求
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">
                请确保上传的CSV文件包含以下列标题：
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <code className="bg-blue-100 px-1 rounded">行业名称</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">公司名称</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">产品名称</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">年份</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">月份</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">销售数量</code>
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">数量单位</code>
                </li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传数据文件
            </label>
            <label
              htmlFor="dataset-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept={ALLOWED_DATASET_EXTENSIONS.join(",")}
                onChange={(e) => handleDatasetFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="dataset-file-upload"
              />
              <p className="text-blue-600 font-medium">点击或拖拽文件到此处</p>
              <p className="text-sm text-gray-500 mt-2">
                仅支持CSV格式，文件大小不超过50MB
              </p>
              {uploadFile && (
                <p className="text-sm text-green-600 mt-2 font-semibold">
                  已选择: {uploadFile.name}
                </p>
              )}
            </label>
            {uploadErrors.file && (
              <p className="mt-2 text-xs text-red-500">{uploadErrors.file}</p>
            )}
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
              disabled={!isUploadFormValid || isUploading}
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
        onClose={closeEditModal}
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
                onChange={(e) => handleEditDatasetNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {editErrors.name && (
                <p className="mt-1 text-xs text-red-500">{editErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注
              </label>
              <textarea
                rows={3}
                value={editingData.description || ""}
                onChange={(e) => handleEditDatasetNotesChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
              {editErrors.notes && (
                <p className="mt-1 text-xs text-red-500">{editErrors.notes}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!isEditFormValid}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};
