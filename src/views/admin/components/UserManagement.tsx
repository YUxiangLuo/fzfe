import React, { useState, useEffect, useCallback } from "react";
import { Edit, Loader, AlertTriangle, Trash2, Upload, Search } from "lucide-react";
import type { User } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { decodeToken } from "../../../utils/auth";
import Modal from "./Modal";
import Pagination from "./Pagination";
import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "../hooks/useToast";
import { useConfirm } from "../hooks/useConfirm";
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
  validateUsername,
} from "@/shared/utils/validation";

const PAGE_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 400;

type UserForm = {
  username: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
};

type UserFormErrors = Record<keyof UserForm, string>;

type PasswordErrors = {
  newPassword: string;
  confirmPassword: string;
};

const INITIAL_USER_FORM: UserForm = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  password: "",
};

const INITIAL_USER_FORM_ERRORS: UserFormErrors = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  password: "",
};

const INITIAL_PASSWORD_ERRORS: PasswordErrors = {
  newPassword: "",
  confirmPassword: "",
};

type BatchErrors = {
  file: string;
};

const INITIAL_BATCH_ERRORS: BatchErrors = {
  file: "",
};

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(
    null,
  );

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] =
    useState<PasswordErrors>(INITIAL_PASSWORD_ERRORS);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Teacher states
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isTeacherSubmitting, setIsTeacherSubmitting] = useState(false);
  const [newTeacherData, setNewTeacherData] =
    useState<UserForm>(INITIAL_USER_FORM);
  const [teacherErrors, setTeacherErrors] =
    useState<UserFormErrors>(INITIAL_USER_FORM_ERRORS);
  const [isBatchTeacherModalOpen, setIsBatchTeacherModalOpen] = useState(false);
  const [batchTeacherFile, setBatchTeacherFile] = useState<File | null>(null);
  const [batchTeacherErrors, setBatchTeacherErrors] = useState<BatchErrors>({
    ...INITIAL_BATCH_ERRORS,
  });
  const [isBatchTeacherSubmitting, setIsBatchTeacherSubmitting] = useState(false);

  // Assistant states
  const [isAddAssistantModalOpen, setIsAddAssistantModalOpen] = useState(false);
  const [isAssistantSubmitting, setIsAssistantSubmitting] = useState(false);
  const [newAssistantData, setNewAssistantData] =
    useState<UserForm>(INITIAL_USER_FORM);
  const [assistantErrors, setAssistantErrors] =
    useState<UserFormErrors>(INITIAL_USER_FORM_ERRORS);
  const [isBatchAssistantModalOpen, setIsBatchAssistantModalOpen] = useState(false);
  const [batchAssistantFile, setBatchAssistantFile] = useState<File | null>(null);
  const [batchAssistantErrors, setBatchAssistantErrors] = useState<BatchErrors>({
    ...INITIAL_BATCH_ERRORS,
  });
  const [isBatchAssistantSubmitting, setIsBatchAssistantSubmitting] = useState(false);

  // Toast and Confirm hooks
  const { toast, showToast, hideToast } = useToast();
  const { confirmState, showConfirm, hideConfirm } = useConfirm();

  const roleLabels: { [key: string]: string } = {
    student: "学生",
    teacher: "教师",
    assistant: "助教",
    admin: "管理员",
  };

  const fetchUsers = useCallback(
    async (targetPage: number, query: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const endpoint = query
          ? `/users/search?q=${encodeURIComponent(query)}&page=${targetPage}&limit=${PAGE_LIMIT}`
          : `/users?page=${targetPage}&limit=${PAGE_LIMIT}`;
        const response = await apiClient.get(endpoint);
        setUsers(response.data || []);
        setPaginationInfo(response.pagination);
      } catch (err: any) {
        setError(err.message || "获取用户数据失败");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getUserFieldError = (
    field: keyof typeof INITIAL_USER_FORM,
    value: string,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) {
      switch (field) {
        case "username":
          return "请输入用户名";
        case "full_name":
          return "请输入姓名";
        case "email":
          return "请输入邮箱";
        case "phone":
          return "请输入手机号";
        case "password":
          return "请输入密码";
        default:
          return "请输入必填信息";
      }
    }

    switch (field) {
      case "username": {
        const result = validateUsername(trimmed);
        return result.valid ? "" : result.error ?? "用户名格式不正确";
      }
      case "full_name": {
        const result = validateFullName(trimmed);
        return result.valid ? "" : result.error ?? "姓名格式不正确";
      }
      case "email": {
        const result = validateEmail(trimmed, true);
        return result.valid ? "" : result.error ?? "邮箱格式不正确";
      }
      case "phone": {
        const result = validatePhone(trimmed, true);
        return result.valid ? "" : result.error ?? "手机号格式不正确";
      }
      case "password": {
        const result = validatePassword(trimmed, { minLength: 6, requireMixed: false });
        return result.valid ? "" : result.error ?? "密码至少需要6个字符";
      }
      default:
        return "";
    }
  };

  const handleTeacherFieldChange = (
    field: keyof typeof INITIAL_USER_FORM,
    value: string,
  ) => {
    setNewTeacherData((prev) => ({ ...prev, [field]: value }));
    setTeacherErrors((prev) => ({
      ...prev,
      [field]: getUserFieldError(field, value),
    }));
  };

  const handleAssistantFieldChange = (
    field: keyof typeof INITIAL_USER_FORM,
    value: string,
  ) => {
    setNewAssistantData((prev) => ({ ...prev, [field]: value }));
    setAssistantErrors((prev) => ({
      ...prev,
      [field]: getUserFieldError(field, value),
    }));
  };

  const getNewPasswordError = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "请输入新密码";
    const result = validatePassword(trimmed, { minLength: 6 });
    return result.valid ? "" : result.error ?? "密码至少需要6位";
  };

  const getConfirmPasswordError = (confirmValue: string, password: string) => {
    const trimmed = confirmValue.trim();
    if (!trimmed) return "请再次输入新密码";
    if (trimmed !== password.trim()) return "两次输入的密码不一致";
    return "";
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    const newPasswordError = getNewPasswordError(value);
    const confirmError = getConfirmPasswordError(confirmPassword, value);
    setPasswordErrors({ newPassword: newPasswordError, confirmPassword: confirmError });
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setPasswordErrors((prev) => ({
      ...prev,
      confirmPassword: getConfirmPasswordError(value, newPassword),
    }));
  };

  const resetPasswordForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({ ...INITIAL_PASSWORD_ERRORS });
    setIsSavingPassword(false);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    resetPasswordForm();
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    resetPasswordForm();
    setSelectedUser(null);
    setIsPasswordModalOpen(false);
  };

  // Teacher modal handlers
  const openAddTeacherModal = () => {
    setNewTeacherData({ ...INITIAL_USER_FORM });
    setTeacherErrors({ ...INITIAL_USER_FORM_ERRORS });
    setIsAddTeacherModalOpen(true);
  };

  const closeAddTeacherModal = () => {
    setIsAddTeacherModalOpen(false);
    setIsTeacherSubmitting(false);
    setNewTeacherData({ ...INITIAL_USER_FORM });
    setTeacherErrors({ ...INITIAL_USER_FORM_ERRORS });
  };

  // Assistant modal handlers
  const openAddAssistantModal = () => {
    setNewAssistantData({ ...INITIAL_USER_FORM });
    setAssistantErrors({ ...INITIAL_USER_FORM_ERRORS });
    setIsAddAssistantModalOpen(true);
  };

  const closeAddAssistantModal = () => {
    setIsAddAssistantModalOpen(false);
    setIsAssistantSubmitting(false);
    setNewAssistantData({ ...INITIAL_USER_FORM });
    setAssistantErrors({ ...INITIAL_USER_FORM_ERRORS });
  };

  const isTeacherFormValid =
    newTeacherData.username.trim() !== "" &&
    newTeacherData.full_name.trim() !== "" &&
    newTeacherData.email.trim() !== "" &&
    newTeacherData.phone.trim() !== "" &&
    newTeacherData.password.trim() !== "" &&
    Object.values(teacherErrors).every((error) => error === "");

  const isAssistantFormValid =
    newAssistantData.username.trim() !== "" &&
    newAssistantData.full_name.trim() !== "" &&
    newAssistantData.email.trim() !== "" &&
    newAssistantData.phone.trim() !== "" &&
    newAssistantData.password.trim() !== "" &&
    Object.values(assistantErrors).every((error) => error === "");

  const isPasswordFormValid =
    newPassword.trim() !== "" &&
    confirmPassword.trim() !== "" &&
    passwordErrors.newPassword === "" &&
    passwordErrors.confirmPassword === "";

  useEffect(() => {
    const handler = window.setTimeout(() => {
      const trimmed = searchTerm.trim();
      setDebouncedSearchTerm(trimmed);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  // Batch teacher modal handlers
  const openBatchTeacherModal = () => {
    setBatchTeacherFile(null);
    setBatchTeacherErrors({ ...INITIAL_BATCH_ERRORS });
    setIsBatchTeacherModalOpen(true);
  };

  const closeBatchTeacherModal = () => {
    setIsBatchTeacherModalOpen(false);
    setIsBatchTeacherSubmitting(false);
    setBatchTeacherFile(null);
    setBatchTeacherErrors({ ...INITIAL_BATCH_ERRORS });
  };

  const handleBatchTeacherFileChange = (file: File | null) => {
    setBatchTeacherFile(file);
    setBatchTeacherErrors((prev) => ({
      ...prev,
      file: !file
        ? "请上传CSV文件"
        : file.name.toLowerCase().endsWith(".csv")
        ? ""
        : "仅支持上传CSV格式文件",
    }));
  };

  const isBatchTeacherFormValid =
    batchTeacherFile !== null &&
    batchTeacherErrors.file === "";

  // Batch assistant modal handlers
  const openBatchAssistantModal = () => {
    setBatchAssistantFile(null);
    setBatchAssistantErrors({ ...INITIAL_BATCH_ERRORS });
    setIsBatchAssistantModalOpen(true);
  };

  const closeBatchAssistantModal = () => {
    setIsBatchAssistantModalOpen(false);
    setIsBatchAssistantSubmitting(false);
    setBatchAssistantFile(null);
    setBatchAssistantErrors({ ...INITIAL_BATCH_ERRORS });
  };

  const handleBatchAssistantFileChange = (file: File | null) => {
    setBatchAssistantFile(file);
    setBatchAssistantErrors((prev) => ({
      ...prev,
      file: !file
        ? "请上传CSV文件"
        : file.name.toLowerCase().endsWith(".csv")
        ? ""
        : "仅支持上传CSV格式文件",
    }));
  };

  const isBatchAssistantFormValid =
    batchAssistantFile !== null &&
    batchAssistantErrors.file === "";

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const decoded = decodeToken(token);
        if (decoded) setCurrentAdminId(decoded.sub);
      }
    } catch (err) {
      console.error('Failed to read token from localStorage:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearchTerm);
  }, [currentPage, debouncedSearchTerm, fetchUsers]);

  const handlePasswordConfirm = async () => {
    const newPasswordError = getNewPasswordError(newPassword);
    const confirmError = getConfirmPasswordError(confirmPassword, newPassword);
    setPasswordErrors({ newPassword: newPasswordError, confirmPassword: confirmError });

    if (newPasswordError || confirmError) return;
    if (!selectedUser) return;

    try {
      setIsSavingPassword(true);
      await apiClient.put(`/users/${selectedUser.user_id}/password`, {
        newPassword: newPassword.trim(),
      });
      showToast(`已成功为用户 ${selectedUser.full_name} 重置密码`, 'success');
      closePasswordModal();
    } catch (error: any) {
      showToast(`密码重置失败: ${error.message}`, 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDelete = async (userToDelete: User) => {
    showConfirm(
      `确定要删除用户 "${userToDelete.full_name}" 吗？此操作不可恢复。`,
      async () => {
        try {
          await apiClient.delete(`/users/${userToDelete.user_id}`);
          if (users.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
          } else {
            await fetchUsers(currentPage, debouncedSearchTerm);
          }
          showToast('用户删除成功', 'success');
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

  const handleCreateTeacher = async () => {
    const usernameError = getUserFieldError("username", newTeacherData.username);
    const fullNameError = getUserFieldError("full_name", newTeacherData.full_name);
    const emailError = getUserFieldError("email", newTeacherData.email);
    const phoneError = getUserFieldError("phone", newTeacherData.phone);
    const passwordError = getUserFieldError("password", newTeacherData.password);

    setTeacherErrors({
      username: usernameError,
      full_name: fullNameError,
      email: emailError,
      phone: phoneError,
      password: passwordError,
    });

    if (usernameError || fullNameError || emailError || phoneError || passwordError) {
      return;
    }

    setIsTeacherSubmitting(true);
    try {
      await apiClient.post<User>("/users/teachers", {
        username: newTeacherData.username.trim(),
        full_name: newTeacherData.full_name.trim(),
        email: newTeacherData.email.trim(),
        phone: newTeacherData.phone.trim(),
        password: newTeacherData.password.trim(),
      });
      showToast('教师添加成功', 'success');
      closeAddTeacherModal();
      await fetchUsers(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      showToast(`添加教师失败: ${err.message}`, 'error');
    } finally {
      setIsTeacherSubmitting(false);
    }
  };

  const handleCreateAssistant = async () => {
    const usernameError = getUserFieldError("username", newAssistantData.username);
    const fullNameError = getUserFieldError("full_name", newAssistantData.full_name);
    const emailError = getUserFieldError("email", newAssistantData.email);
    const phoneError = getUserFieldError("phone", newAssistantData.phone);
    const passwordError = getUserFieldError("password", newAssistantData.password);

    setAssistantErrors({
      username: usernameError,
      full_name: fullNameError,
      email: emailError,
      phone: phoneError,
      password: passwordError,
    });

    if (usernameError || fullNameError || emailError || phoneError || passwordError) {
      return;
    }

    setIsAssistantSubmitting(true);
    try {
      await apiClient.post<User>("/users/assistants", {
        username: newAssistantData.username.trim(),
        full_name: newAssistantData.full_name.trim(),
        email: newAssistantData.email.trim(),
        phone: newAssistantData.phone.trim(),
        password: newAssistantData.password.trim(),
      });
      showToast('助教添加成功', 'success');
      closeAddAssistantModal();
      await fetchUsers(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      showToast(`添加助教失败: ${err.message}`, 'error');
    } finally {
      setIsAssistantSubmitting(false);
    }
  };

  const handleBatchTeacherSubmit = async () => {
    if (!batchTeacherFile) {
      setBatchTeacherErrors((prev) => ({ ...prev, file: "请上传CSV文件" }));
      return;
    }

    const fileName = batchTeacherFile.name.toLowerCase();
    if (!fileName.endsWith(".csv")) {
      setBatchTeacherErrors((prev) => ({ ...prev, file: "仅支持上传CSV格式文件" }));
      return;
    }

    const formData = new FormData();
    formData.append("file", batchTeacherFile);

    try {
      setIsBatchTeacherSubmitting(true);
      await apiClient.postFormData("/users/teachers/batch", formData);
      showToast('批量添加教师成功', 'success');
      closeBatchTeacherModal();
      await fetchUsers(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      showToast(`批量添加失败: ${err.message}`, 'error');
    } finally {
      setIsBatchTeacherSubmitting(false);
    }
  };

  const handleBatchAssistantSubmit = async () => {
    if (!batchAssistantFile) {
      setBatchAssistantErrors((prev) => ({ ...prev, file: "请上传CSV文件" }));
      return;
    }

    const fileName = batchAssistantFile.name.toLowerCase();
    if (!fileName.endsWith(".csv")) {
      setBatchAssistantErrors((prev) => ({ ...prev, file: "仅支持上传CSV格式文件" }));
      return;
    }

    const formData = new FormData();
    formData.append("file", batchAssistantFile);

    try {
      setIsBatchAssistantSubmitting(true);
      await apiClient.postFormData("/users/assistants/batch", formData);
      showToast('批量添加助教成功', 'success');
      closeBatchAssistantModal();
      await fetchUsers(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      showToast(`批量添加失败: ${err.message}`, 'error');
    } finally {
      setIsBatchAssistantSubmitting(false);
    }
  };

  const renderTableContent = () => {
    if (isLoading)
      return (
        <tr>
          <td colSpan={6} className="text-center py-12">
            <div className="flex justify-center items-center space-x-2 text-gray-500">
              <Loader className="animate-spin" size={20} />
              <span>正在加载...</span>
            </div>
          </td>
        </tr>
      );
    if (error)
      return (
        <tr>
          <td colSpan={6} className="text-center py-12">
            <div className="flex flex-col items-center space-y-2 text-red-500">
              <AlertTriangle size={24} />
              <span>加载失败: {error}</span>
            </div>
          </td>
        </tr>
      );
    if (users.length === 0)
      return (
        <tr>
          <td colSpan={6} className="text-center py-12 text-gray-500">
            未找到用户。
          </td>
        </tr>
      );

    return users.map((user) => {
      const isCurrentUser = user.user_id === currentAdminId;
      return (
        <tr
          key={user.user_id}
          className="hover:bg-blue-50/30 transition-colors duration-200"
        >
          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
            {user.username}
          </td>
          <td className="px-6 py-4 text-sm text-gray-900">{user.full_name}</td>
          <td className="px-6 py-4">
            <span
              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${user.role.toLowerCase() === "teacher" ? "bg-purple-100 text-purple-800" : user.role.toLowerCase() === "assistant" ? "bg-blue-100 text-blue-800" : user.role.toLowerCase() === "admin" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
            >
              {roleLabels[user.role.toLowerCase()]}
            </span>
          </td>
          <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
          <td className="px-6 py-4 text-sm text-gray-600">
            {formatDateTime(user.created_at)}
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openPasswordModal(user)}
                disabled={isCurrentUser}
                title={isCurrentUser ? "不能在此处修改自己的密码" : "修改密码"}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${isCurrentUser ? "text-gray-400 bg-gray-100 cursor-not-allowed" : "text-blue-600 hover:bg-blue-100"}`}
              >
                <Edit size={14} />
                <span>修改密码</span>
              </button>
              <button
                onClick={() => handleDelete(user)}
                disabled={isCurrentUser}
                title={isCurrentUser ? "不能删除自己的账户" : "删除用户"}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${isCurrentUser ? "text-gray-400 bg-gray-100 cursor-not-allowed" : "text-red-600 hover:bg-red-100"}`}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">用户列表</h2>
                <p className="text-sm text-gray-500 mt-1">
                  查看系统用户，并支持新增、重置密码与删除操作
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openAddTeacherModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Edit size={16} />
                  <span>添加教师</span>
                </button>
                <button
                  onClick={openBatchTeacherModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Upload size={16} />
                  <span>批量添加教师</span>
                </button>
                <button
                  onClick={openAddAssistantModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Edit size={16} />
                  <span>添加助教</span>
                </button>
                <button
                  onClick={openBatchAssistantModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                >
                  <Upload size={16} />
                  <span>批量添加助教</span>
                </button>
              </div>
            </div>
            <div className="relative max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="输入关键字搜索"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  账号
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  姓名
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  角色
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  邮箱
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  注册时间
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {renderTableContent()}
            </tbody>
          </table>
        </div>

        {paginationInfo && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Pagination
              currentPage={paginationInfo.currentPage}
              totalPages={paginationInfo.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={closePasswordModal}
        title="修改用户密码"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                为用户{" "}
                <span className="font-medium text-gray-900">
                  {selectedUser.full_name}
                </span>{" "}
                ({selectedUser.username}) 重置密码
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新密码
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                placeholder="请输入新密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={closePasswordModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handlePasswordConfirm}
                disabled={!isPasswordFormValid || isSavingPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSavingPassword && (
                  <Loader className="animate-spin mr-2" size={16} />
                )}
                确认
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Teacher Modal */}
      <Modal
        isOpen={isAddTeacherModalOpen}
        onClose={closeAddTeacherModal}
        title="添加新教师"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={newTeacherData.username}
              onChange={(e) => handleTeacherFieldChange("username", e.target.value)}
              placeholder="教师的登录账号"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isTeacherSubmitting}
            />
            {teacherErrors.username && (
              <p className="mt-1 text-xs text-red-500">{teacherErrors.username}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              type="text"
              value={newTeacherData.full_name}
              onChange={(e) => handleTeacherFieldChange("full_name", e.target.value)}
              placeholder="教师的真实姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isTeacherSubmitting}
            />
            {teacherErrors.full_name && (
              <p className="mt-1 text-xs text-red-500">{teacherErrors.full_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              value={newTeacherData.email}
              onChange={(e) => handleTeacherFieldChange("email", e.target.value)}
              placeholder="教师的联系邮箱"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isTeacherSubmitting}
            />
            {teacherErrors.email && (
              <p className="mt-1 text-xs text-red-500">{teacherErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={newTeacherData.phone}
              onChange={(e) => handleTeacherFieldChange("phone", e.target.value)}
              placeholder="请输入1开头的11位手机号码"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isTeacherSubmitting}
            />
            {teacherErrors.phone && (
              <p className="mt-1 text-xs text-red-500">{teacherErrors.phone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">初始密码</label>
            <input
              type="password"
              value={newTeacherData.password}
              onChange={(e) => handleTeacherFieldChange("password", e.target.value)}
              placeholder="至少6位，可为纯数字"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isTeacherSubmitting}
            />
            {teacherErrors.password && (
              <p className="mt-1 text-xs text-red-500">{teacherErrors.password}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={closeAddTeacherModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isTeacherSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleCreateTeacher}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isTeacherSubmitting || !isTeacherFormValid}
            >
              {isTeacherSubmitting ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Batch Teacher Upload Modal */}
      <Modal
        isOpen={isBatchTeacherModalOpen}
        onClose={closeBatchTeacherModal}
        title="批量添加教师"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-semibold">CSV 格式要求</p>
            <p className="mt-1">请确保表头至少包含以下列：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>姓名</li>
              <li>手机号</li>
            </ul>
          </div>

          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-900">
                账号和密码规则
              </p>
              <p className="text-xs text-amber-700 mt-1">
                批量创建的教师账号，其登录用户名为 <span className="font-semibold">prof_手机号</span>，初始密码为 <span className="font-semibold">手机号</span>。请提醒教师首次登录后及时修改密码。
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传CSV文件
            </label>
            <label
              htmlFor="batch-teacher-upload"
              className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleBatchTeacherFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="batch-teacher-upload"
              />
              <p className="text-blue-600 font-medium">点击或拖拽文件到此处</p>
              {batchTeacherFile && (
                <p className="text-sm text-green-600 mt-2 font-semibold">
                  已选择: {batchTeacherFile.name}
                </p>
              )}
            </label>
            {batchTeacherErrors.file && (
              <p className="mt-2 text-xs text-red-500">{batchTeacherErrors.file}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={closeBatchTeacherModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isBatchTeacherSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleBatchTeacherSubmit}
              disabled={!isBatchTeacherFormValid || isBatchTeacherSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {isBatchTeacherSubmitting && (
                <Loader className="animate-spin mr-2" size={16} />
              )}
              {isBatchTeacherSubmitting ? "上传中..." : "开始导入"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Assistant Modal */}
      <Modal
        isOpen={isAddAssistantModalOpen}
        onClose={closeAddAssistantModal}
        title="添加新助教"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={newAssistantData.username}
              onChange={(e) => handleAssistantFieldChange("username", e.target.value)}
              placeholder="助教的登录账号"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isAssistantSubmitting}
            />
            {assistantErrors.username && (
              <p className="mt-1 text-xs text-red-500">{assistantErrors.username}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              type="text"
              value={newAssistantData.full_name}
              onChange={(e) => handleAssistantFieldChange("full_name", e.target.value)}
              placeholder="助教的真实姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isAssistantSubmitting}
            />
            {assistantErrors.full_name && (
              <p className="mt-1 text-xs text-red-500">{assistantErrors.full_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              type="email"
              value={newAssistantData.email}
              onChange={(e) => handleAssistantFieldChange("email", e.target.value)}
              placeholder="助教的联系邮箱"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isAssistantSubmitting}
            />
            {assistantErrors.email && (
              <p className="mt-1 text-xs text-red-500">{assistantErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={newAssistantData.phone}
              onChange={(e) => handleAssistantFieldChange("phone", e.target.value)}
              placeholder="请输入1开头的11位手机号码"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isAssistantSubmitting}
            />
            {assistantErrors.phone && (
              <p className="mt-1 text-xs text-red-500">{assistantErrors.phone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">初始密码</label>
            <input
              type="password"
              value={newAssistantData.password}
              onChange={(e) => handleAssistantFieldChange("password", e.target.value)}
              placeholder="至少6位，可为纯数字"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isAssistantSubmitting}
            />
            {assistantErrors.password && (
              <p className="mt-1 text-xs text-red-500">{assistantErrors.password}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={closeAddAssistantModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isAssistantSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleCreateAssistant}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              disabled={isAssistantSubmitting || !isAssistantFormValid}
            >
              {isAssistantSubmitting ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Batch Assistant Upload Modal */}
      <Modal
        isOpen={isBatchAssistantModalOpen}
        onClose={closeBatchAssistantModal}
        title="批量添加助教"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-semibold">CSV 格式要求</p>
            <p className="mt-1">请确保表头至少包含以下列：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>姓名</li>
              <li>手机号</li>
            </ul>
          </div>

          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-900">
                账号和密码规则
              </p>
              <p className="text-xs text-amber-700 mt-1">
                批量创建的助教账号，其登录用户名为 <span className="font-semibold">ta_手机号</span>，初始密码为 <span className="font-semibold">手机号</span>。请提醒助教首次登录后及时修改密码。
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传CSV文件
            </label>
            <label
              htmlFor="batch-assistant-upload"
              className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleBatchAssistantFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="batch-assistant-upload"
              />
              <p className="text-blue-600 font-medium">点击或拖拽文件到此处</p>
              {batchAssistantFile && (
                <p className="text-sm text-green-600 mt-2 font-semibold">
                  已选择: {batchAssistantFile.name}
                </p>
              )}
            </label>
            {batchAssistantErrors.file && (
              <p className="mt-2 text-xs text-red-500">{batchAssistantErrors.file}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={closeBatchAssistantModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isBatchAssistantSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleBatchAssistantSubmit}
              disabled={!isBatchAssistantFormValid || isBatchAssistantSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center"
            >
              {isBatchAssistantSubmitting && (
                <Loader className="animate-spin mr-2" size={16} />
              )}
              {isBatchAssistantSubmitting ? "上传中..." : "开始导入"}
            </button>
          </div>
        </div>
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
    </>
  );
};

export default UserManagement;
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
