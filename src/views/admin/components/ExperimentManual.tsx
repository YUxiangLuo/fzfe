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
import { Switch } from "@/components/ui/switch";

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
  const { showToast } = useToast();
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
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center">
            <Loader className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </TableCell>
        </TableRow>
      );
    if (error)
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-destructive">
            <AlertTriangle className="mx-auto h-5 w-5" />
            <p className="mt-2">{error}</p>
          </TableCell>
        </TableRow>
      );
    if (manuals.length === 0)
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
            暂无实验手册
          </TableCell>
        </TableRow>
      );

    return manuals.map((manual) => (
      <TableRow key={manual.manual_id}>
        <TableCell className="font-medium">{manual.file_name}</TableCell>
        <TableCell className="text-muted-foreground">
          {manual.description || "-"}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {manual.uploader_name}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDateTime(manual.uploaded_at)}
        </TableCell>
        <TableCell>
          <Switch
            checked={manual.is_active === 1}
            onCheckedChange={() => handleStatusToggle(manual)}
            aria-label={
              manual.is_active === 1 ? "启用中 - 点击禁用" : "已禁用 - 点击启用"
            }
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditingManual({ ...manual });
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
              onClick={() => handleDelete(manual.manual_id)}
              title="删除"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDownload(manual.file_path)}
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
          <h1 className="text-2xl font-bold text-foreground">实验手册管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理学生端显示的实验手册，支持上传、更新和启用/禁用操作
          </p>
        </div>
        <Button onClick={openUploadModal}>
          <Plus className="mr-2 h-4 w-4" />
          新增
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>手册名称</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>上传者</TableHead>
              <TableHead>上传时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={resetUploadModal}
        title="新增实验手册"
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="manual-name" className="mb-2">
              手册名称
            </Label>
            <Input
              type="text"
              id="manual-name"
              value={manualName}
              onChange={(e) => handleManualNameChange(e.target.value)}
              placeholder="例如：生产决策仿真实验手册"
            />
            {uploadErrors.name && (
              <p className="mt-1 text-xs text-destructive">{uploadErrors.name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="manual-notes" className="mb-2">
              备注 (可选)
            </Label>
            <Textarea
              id="manual-notes"
              value={manualNotes}
              onChange={(e) => handleManualNotesChange(e.target.value)}
              rows={3}
              placeholder="例如：适用于2025春季学期"
            />
            {uploadErrors.notes && (
              <p className="mt-1 text-xs text-destructive">{uploadErrors.notes}</p>
            )}
          </div>
          <div>
            <Label htmlFor="file-upload" className="mb-2">
              上传PDF文件
            </Label>
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary"
            >
              <Upload size={48} className="mx-auto text-muted-foreground mb-4" />
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleManualFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <p className="text-primary font-medium">点击或拖拽文件到此处</p>
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
        title="修改实验手册"
      >
        {editingManual && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2">
                手册名称
              </Label>
              <Input
                type="text"
                value={editingManual.file_name}
                onChange={(e) => handleEditManualNameChange(e.target.value)}
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
                value={editingManual.description || ""}
                onChange={(e) => handleEditManualNotesChange(e.target.value)}
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
