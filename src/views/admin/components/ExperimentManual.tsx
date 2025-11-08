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
import type { ExperimentManual } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { DOWNLOAD_SERVER_BASE_URL } from "../../../config/appConfig"; // Import the new config value
import Modal from "./Modal";
import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";

const MAX_MANUAL_NAME_LENGTH = 100;
const MANUAL_NAME_MIN_LENGTH = 2;
const MAX_MANUAL_NOTES_LENGTH = 200;
const MAX_MANUAL_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const getManualNameError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "手册名称不能为空";
  if (trimmed.length < MANUAL_NAME_MIN_LENGTH)
    return `手册名称至少需要${MANUAL_NAME_MIN_LENGTH}个字符`;
  if (trimmed.length > MAX_MANUAL_NAME_LENGTH)
    return `手册名称不能超过${MAX_MANUAL_NAME_LENGTH}个字符`;
  return "";
};

const getManualNotesError = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX_MANUAL_NOTES_LENGTH)
    return `备注不能超过${MAX_MANUAL_NOTES_LENGTH}个字符`;
  return "";
};

const getManualFileError = (file: File | null) => {
  if (!file) return "请上传PDF文件";
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "仅支持上传PDF格式文件";
  if (file.size > MAX_MANUAL_FILE_SIZE)
    return "文件大小不能超过20MB";
  return "";
};

type ManualUploadErrors = {
  name: string;
  notes: string;
  file: string;
};

type ManualEditErrors = {
  name: string;
  notes: string;
};

const INITIAL_UPLOAD_ERRORS: ManualUploadErrors = {
  name: "",
  notes: "",
  file: "",
};

const INITIAL_EDIT_ERRORS: ManualEditErrors = {
  name: "",
  notes: "",
};

const ExperimentManualView: React.FC = () => {
  const [manuals, setManuals] = useState<ExperimentManual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<ExperimentManual | null>(
    null,
  );

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<ManualUploadErrors>(
    INITIAL_UPLOAD_ERRORS,
  );
  const [editErrors, setEditErrors] = useState<ManualEditErrors>(
    INITIAL_EDIT_ERRORS,
  );

  // Toast and Confirm hooks
  const { toast, showToast, hideToast } = useToast();
  const { confirmState, showConfirm, hideConfirm } = useConfirm();

  const handleManualNameChange = (value: string) => {
    setManualName(value);
    setUploadErrors((prev) => ({
      ...prev,
      name: getManualNameError(value),
    }));
  };

  const handleManualNotesChange = (value: string) => {
    setManualNotes(value);
    setUploadErrors((prev) => ({
      ...prev,
      notes: getManualNotesError(value),
    }));
  };

  const handleManualFileChange = (file: File | null) => {
    setUploadFile(file);
    setUploadErrors((prev) => ({
      ...prev,
      file: getManualFileError(file),
    }));
  };

  const handleEditManualNameChange = (value: string) => {
    setEditingManual((prev) => (prev ? { ...prev, file_name: value } : null));
    setEditErrors((prev) => ({
      ...prev,
      name: getManualNameError(value),
    }));
  };

  const handleEditManualNotesChange = (value: string) => {
    setEditingManual((prev) => (prev ? { ...prev, description: value } : null));
    setEditErrors((prev) => ({
      ...prev,
      notes: getManualNotesError(value),
    }));
  };

  const isUploadFormValid =
    manualName.trim() !== "" &&
    uploadFile !== null &&
    Object.values(uploadErrors).every((error) => error === "");

  const isEditFormValid =
    !!editingManual &&
    editingManual.file_name.trim() !== "" &&
    Object.values(editErrors).every((error) => error === "");

  useEffect(() => {
    const fetchManuals = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient.get("/manuals");
        setManuals(data || []);
      } catch (err: any) {
        setError(err.message || "获取实验手册失败");
      } finally {
        setIsLoading(false);
      }
    };
    fetchManuals();
  }, []);

  const handleStatusToggle = async (manualToToggle: ExperimentManual) => {
    const newStatusBoolean = manualToToggle.is_active !== 1;
    try {
      const updatedManual = await apiClient.put(
        `/manuals/${manualToToggle.manual_id}`,
        { is_active: newStatusBoolean },
      );

      setManuals((prevManuals) => {
        if (updatedManual.is_active === 1) {
          return prevManuals.map((m) =>
            m.manual_id === updatedManual.manual_id
              ? updatedManual
              : { ...m, is_active: 0 },
          );
        } else {
          return prevManuals.map((m) =>
            m.manual_id === updatedManual.manual_id ? updatedManual : m,
          );
        }
      });
      showToast('状态更新成功', 'success');
    } catch (err: any) {
      showToast(`状态更新失败: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (manualId: number) => {
    showConfirm(
      "确定要删除此实验手册吗？此操作不可恢复。",
      async () => {
        try {
          await apiClient.delete(`/manuals/${manualId}`);
          setManuals(manuals.filter((m) => m.manual_id !== manualId));
          showToast('删除成功', 'success');
        } catch (err: any) {
          showToast(`删除失败: ${err.message}`, 'error');
        }
      },
      {
        title: '确认删除',
        confirmText: '删除',
        cancelText: '取消',
        variant: 'danger',
      }
    );
  };

  const handleUpload = async () => {
    const nameError = getManualNameError(manualName);
    const fileError = getManualFileError(uploadFile);
    const notesError = getManualNotesError(manualNotes);

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
    formData.append("file_name", manualName.trim());
    formData.append("description", manualNotes.trim());

    try {
      const newManualFromServer = await apiClient.postFormData(
        "/manuals",
        formData,
      );
      setManuals((prev) => [newManualFromServer, ...prev]);
      resetUploadModal();
      showToast('上传成功', 'success');
    } catch (err: any) {
      showToast(`上传失败: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingManual(null);
    setEditErrors({ ...INITIAL_EDIT_ERRORS });
  };

  const handleSaveEdit = async () => {
    if (!editingManual) return;
    const nameError = getManualNameError(editingManual.file_name);
    const notesError = getManualNotesError(editingManual.description || "");
    setEditErrors({ name: nameError, notes: notesError });
    if (nameError || notesError) return;
    try {
      const updatedManual = await apiClient.put(
        `/manuals/${editingManual.manual_id}`,
        {
          file_name: editingManual.file_name.trim(),
          description: (editingManual.description || "").trim(),
        },
      );
      setManuals(
        manuals.map((m) =>
          m.manual_id === updatedManual.manual_id ? updatedManual : m,
        ),
      );
      closeEditModal();
      showToast('保存成功', 'success');
    } catch (err: any) {
      showToast(`保存失败: ${err.message}`, 'error');
    }
  };

  const handleDownload = (filePath: string) => {
    // Extract the filename from the full path (e.g., "/uploads/manuals/file.pdf" -> "file.pdf")
    const filename = filePath.split("/").pop();
    const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/manuals/${filename}`;
    window.open(fullUrl, "_blank");
  };

  const resetUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setManualName("");
    setManualNotes("");
    setUploadErrors({ ...INITIAL_UPLOAD_ERRORS });
  };

  const openUploadModal = () => {
    setManualName("");
    setManualNotes("");
    setUploadFile(null);
    setUploadErrors({ ...INITIAL_UPLOAD_ERRORS });
    setIsUploadModalOpen(true);
  };

  const renderTableBody = () => {
    if (isLoading)
      return (
        <tr>
          <td colSpan={6} className="text-center py-12">
            <Loader className="animate-spin mx-auto text-gray-400" />
          </td>
        </tr>
      );
    if (error)
      return (
        <tr>
          <td colSpan={6} className="text-center py-12 text-red-500">
            <AlertTriangle className="mx-auto" />
            <p className="mt-2">{error}</p>
          </td>
        </tr>
      );
    if (manuals.length === 0)
      return (
        <tr>
          <td colSpan={6} className="text-center py-12 text-gray-500">
            暂无实验手册
          </td>
        </tr>
      );

    return manuals.map((manual) => (
      <tr
        key={manual.manual_id}
        className="hover:bg-blue-50/30 transition-colors duration-200"
      >
        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
          {manual.file_name}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {manual.description || "-"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {manual.uploader_name}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {formatDateTime(manual.uploaded_at)}
        </td>
        <td className="px-6 py-4">
          <label
            className="relative inline-flex items-center cursor-pointer"
            title={manual.is_active === 1 ? "启用中 - 点击禁用" : "已禁用 - 点击启用"}
          >
            <input
              type="checkbox"
              checked={manual.is_active === 1}
              onChange={() => handleStatusToggle(manual)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setEditingManual({ ...manual });
                setEditErrors({ ...INITIAL_EDIT_ERRORS });
                setIsEditModalOpen(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
              title="修改"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => handleDelete(manual.manual_id)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
              title="删除"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => handleDownload(manual.file_path)}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
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
          <h1 className="text-2xl font-bold text-gray-900">实验手册管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理学生端显示的实验手册，支持上传、更新和启用/禁用操作
          </p>
        </div>
        <button
          onClick={openUploadModal}
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
                备注
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                上传者
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
            {renderTableBody()}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={resetUploadModal}
        title="新增实验手册"
      >
        <div className="space-y-6">
          <div>
            <label
              htmlFor="manual-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              手册名称
            </label>
            <input
              type="text"
              id="manual-name"
              value={manualName}
              onChange={(e) => handleManualNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：生产决策仿真实验手册"
            />
            {uploadErrors.name && (
              <p className="mt-1 text-xs text-red-500">{uploadErrors.name}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="manual-notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              备注 (可选)
            </label>
            <textarea
              id="manual-notes"
              value={manualNotes}
              onChange={(e) => handleManualNotesChange(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：适用于2025春季学期"
            ></textarea>
            {uploadErrors.notes && (
              <p className="mt-1 text-xs text-red-500">{uploadErrors.notes}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传PDF文件
            </label>
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleManualFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <p className="text-blue-600 font-medium">点击或拖拽文件到此处</p>
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
          <div className="flex justify-end space-x-3 pt-4 border-gray-200">
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
                value={editingManual.file_name}
                onChange={(e) => handleEditManualNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                value={editingManual.description || ""}
                onChange={(e) => handleEditManualNotesChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              ></textarea>
              {editErrors.notes && (
                <p className="mt-1 text-xs text-red-500">{editErrors.notes}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-gray-200">
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

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirm}
      />
    </div>
  );
};

export default ExperimentManualView;
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
