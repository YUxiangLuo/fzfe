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
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  // Toast and Confirm hooks
  const { showToast } = useToast();
  const { confirmState, showConfirm, hideConfirm } = useConfirm();

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
    showConfirm(
      "确定要删除此数据集吗？此操作会删除服务器上的文件且不可恢复。",
      async () => {
        try {
          await apiClient.delete(`/datasets/${datasetId}`);
          setDatasets((prev) => prev.filter((d) => d.dataset_id !== datasetId));
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
      showToast('上传成功', 'success');
    } catch (err: any) {
      showToast(`上传失败: ${err.message}`, 'error');
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
      showToast('保存成功', 'success');
    } catch (err: any) {
      showToast(`保存失败: ${err.message}`, 'error');
    }
  };

  const handleDownload = (filePath: string) => {
    console.log(filePath);
    const filename = filePath.split("/").pop();
    const fullUrl = `${DOWNLOAD_SERVER_BASE_URL}/datasets/${filename}`;
    window.open(fullUrl, "_blank");
  };

  const handleDownloadTemplate = () => {
    const headers = ['行业名称', '公司名称', '产品名称', '年份', '月份', '销售数量', '数量单位'];
    const examples = [
      ['电子行业', '示例科技', '智能手机', '2023', '1', '1200', '部'],
      ['电子行业', '示例科技', '智能手机', '2023', '2', '1350', '部']
    ];

    const csvContent = [
      headers.join(','),
      ...examples.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '实验数据导入模板.csv';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <TableRow>
          <TableCell colSpan={4} className="py-12 text-center">
            <Loader className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </TableCell>
        </TableRow>
      );
    if (error)
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-12 text-center text-destructive">
            <AlertTriangle className="mx-auto h-5 w-5" />
            <p className="mt-2">{error}</p>
          </TableCell>
        </TableRow>
      );
    if (datasets.length === 0)
      return (
        <TableRow>
          <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
            暂无实验数据
          </TableCell>
        </TableRow>
      );

    return datasets.map((data) => (
      <TableRow key={data.dataset_id}>
        <TableCell className="font-medium">{data.data_name}</TableCell>
        <TableCell className="text-muted-foreground">
          {data.description || "-"}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDateTime(data.uploaded_at)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditingData({ ...data });
                setEditErrors({ ...INITIAL_EDIT_ERRORS });
                setIsEditModalOpen(true);
              }}
              title="修改"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(data.dataset_id)}
              title="删除"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDownload(data.file_path)}
              title="下载"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">实验数据管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理实验所需的基础数据集，支持上传、更新操作
          </p>
        </div>
        <Button onClick={openUploadModal}>
          <Plus className="mr-2 h-4 w-4" />
          新增数据
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>数据集名称</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>上传时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={resetUploadModal}
        title="新增实验数据"
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="dataset-name" className="mb-2">
              数据集名称
            </Label>
            <Input
              type="text"
              id="dataset-name"
              value={datasetName}
              onChange={(e) => handleDatasetNameChange(e.target.value)}
              placeholder="例如：苹果公司2023年销售数据"
            />
            {uploadErrors.name && (
              <p className="mt-1 text-xs text-destructive">{uploadErrors.name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="dataset-notes" className="mb-2">
              备注 (可选)
            </Label>
            <Textarea
              id="dataset-notes"
              value={datasetNotes}
              onChange={(e) => handleDatasetNotesChange(e.target.value)}
              rows={3}
              placeholder="例如：包含了iPhone, iPad等产品的季度销售数据"
            />
            {uploadErrors.notes && (
              <p className="mt-1 text-xs text-destructive">{uploadErrors.notes}</p>
            )}
          </div>
          <div>
            <Label className="mb-2">
              数据格式要求
            </Label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold">
                  请确保上传的CSV文件包含以下列标题：
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="mr-1 h-3 w-3" />
                  下载模板
                </Button>
              </div>
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
            <Label className="mb-2">
              上传数据文件
            </Label>
            <label
              htmlFor="dataset-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary"
            >
              <Upload size={48} className="mx-auto text-muted-foreground mb-4" />
              <input
                type="file"
                accept={ALLOWED_DATASET_EXTENSIONS.join(",")}
                onChange={(e) => handleDatasetFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="dataset-file-upload"
              />
              <p className="text-primary font-medium">点击或拖拽文件到此处</p>
              <p className="text-sm text-muted-foreground mt-2">
                仅支持CSV格式，文件大小不超过50MB
              </p>
              {uploadFile && (
                <p className="text-sm text-emerald-600 mt-2 font-semibold">
                  已选择: {uploadFile.name}
                </p>
              )}
            </label>
            {uploadErrors.file && (
              <p className="mt-2 text-xs text-destructive">{uploadErrors.file}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={resetUploadModal}>
              取消
            </Button>
            <Button onClick={handleUpload} disabled={!isUploadFormValid || isUploading}>
              {isUploading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? "上传中..." : "确认上传"}
            </Button>
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
              <Label className="mb-2">
                数据集名称
              </Label>
              <Input
                type="text"
                value={editingData.data_name}
                onChange={(e) => handleEditDatasetNameChange(e.target.value)}
              />
              {editErrors.name && (
                <p className="mt-1 text-xs text-destructive">{editErrors.name}</p>
              )}
            </div>
            <div>
              <Label className="mb-2">
                备注
              </Label>
              <Textarea
                rows={3}
                value={editingData.description || ""}
                onChange={(e) => handleEditDatasetNotesChange(e.target.value)}
              />
              {editErrors.notes && (
                <p className="mt-1 text-xs text-destructive">{editErrors.notes}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeEditModal}>
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={!isEditFormValid}>
                保存修改
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
