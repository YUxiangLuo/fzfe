import React, { useState, useEffect, useCallback } from "react";
import { Edit, Loader, AlertTriangle, Trash2, Upload, Search } from "lucide-react";
import type { User } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { decodeToken } from "../../../utils/auth";
import Modal from "./Modal";
import Pagination from "./Pagination";
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validateUsername,
} from "../../jiaoshi/utils/validation";

const PAGE_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 400;

const INITIAL_TEACHER_FORM = {
  username: "",
  full_name: "",
  email: "",
} as const;

const INITIAL_TEACHER_ERRORS = {
  username: "",
  full_name: "",
  email: "",
} as const;

const INITIAL_PASSWORD_ERRORS = {
  newPassword: "",
  confirmPassword: "",
} as const;

const INITIAL_BATCH_ERRORS = {
  file: "",
} as const;

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
  const [passwordErrors, setPasswordErrors] = useState({
    ...INITIAL_PASSWORD_ERRORS,
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTeacherData, setNewTeacherData] = useState({
    ...INITIAL_TEACHER_FORM,
  });
  const [teacherErrors, setTeacherErrors] = useState({
    ...INITIAL_TEACHER_ERRORS,
  });
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchErrors, setBatchErrors] = useState({ ...INITIAL_BATCH_ERRORS });
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

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

  const getTeacherFieldError = (
    field: keyof typeof INITIAL_TEACHER_FORM,
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
        default:
          return "请输入邮箱";
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
      case "email":
      default: {
        const result = validateEmail(trimmed, true);
        return result.valid ? "" : result.error ?? "邮箱格式不正确";
      }
    }
  };

  const handleTeacherFieldChange = (
    field: keyof typeof INITIAL_TEACHER_FORM,
    value: string,
  ) => {
    setNewTeacherData((prev) => ({ ...prev, [field]: value }));
    setTeacherErrors((prev) => ({
      ...prev,
      [field]: getTeacherFieldError(field, value),
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

  const openAddTeacherModal = () => {
    setNewTeacherData({ ...INITIAL_TEACHER_FORM });
    setTeacherErrors({ ...INITIAL_TEACHER_ERRORS });
    setIsAddTeacherModalOpen(true);
  };

  const closeAddTeacherModal = () => {
    setIsAddTeacherModalOpen(false);
    setIsSubmitting(false);
    setNewTeacherData({ ...INITIAL_TEACHER_FORM });
    setTeacherErrors({ ...INITIAL_TEACHER_ERRORS });
  };

  const isTeacherFormValid =
    newTeacherData.username.trim() !== "" &&
    newTeacherData.full_name.trim() !== "" &&
    newTeacherData.email.trim() !== "" &&
    Object.values(teacherErrors).every((error) => error === "");

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

  const openBatchModal = () => {
    setBatchFile(null);
    setBatchErrors({ ...INITIAL_BATCH_ERRORS });
    setIsBatchModalOpen(true);
  };

  const closeBatchModal = () => {
    setIsBatchModalOpen(false);
    setIsBatchSubmitting(false);
    setBatchFile(null);
    setBatchErrors({ ...INITIAL_BATCH_ERRORS });
  };

  const handleBatchFileChange = (file: File | null) => {
    setBatchFile(file);
    setBatchErrors({
      file: !file
        ? "请上传CSV文件"
        : file.name.toLowerCase().endsWith('.csv')
        ? ""
        : "仅支持上传CSV格式文件",
    });
  };

  const isBatchFormValid = batchFile !== null && batchErrors.file === "";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) setCurrentAdminId(decoded.sub);
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
      alert(`已成功为用户 ${selectedUser.full_name} 重置密码`);
      closePasswordModal();
    } catch (error: any) {
      alert(`密码重置失败: ${error.message}`);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDelete = async (userToDelete: User) => {
    if (window.confirm(`确定要删除用户 "${userToDelete.full_name}" 吗？`)) {
      try {
        await apiClient.delete(`/users/${userToDelete.user_id}`);
        if (users.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          await fetchUsers(currentPage, debouncedSearchTerm);
        }
        alert("用户删除成功！");
      } catch (err: any) {
        alert(`删除失败: ${err.message}`);
      }
    }
  };

  const handleCreateTeacher = async () => {
    const usernameError = getTeacherFieldError("username", newTeacherData.username);
    const fullNameError = getTeacherFieldError("full_name", newTeacherData.full_name);
    const emailError = getTeacherFieldError("email", newTeacherData.email);

    setTeacherErrors({
      username: usernameError,
      full_name: fullNameError,
      email: emailError,
    });

    if (usernameError || fullNameError || emailError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post<User>("/users/teachers", {
        username: newTeacherData.username.trim(),
        full_name: newTeacherData.full_name.trim(),
        email: newTeacherData.email.trim(),
      });
      alert("教师添加成功！");
      closeAddTeacherModal();
      await fetchUsers(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      alert(`添加教师失败: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!batchFile) {
      setBatchErrors({ file: "请上传CSV文件" });
      return;
    }

    const fileName = batchFile.name.toLowerCase();
    if (!fileName.endsWith(".csv")) {
      setBatchErrors({ file: "仅支持上传CSV格式文件" });
      return;
    }

    const formData = new FormData();
    formData.append("file", batchFile);

    try {
      setIsBatchSubmitting(true);
      await apiClient.postFormData("/users/teachers/batch", formData);
      alert("批量添加教师成功！");
      closeBatchModal();
      await fetchUsers(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      alert(`批量添加失败: ${err.message}`);
    } finally {
      setIsBatchSubmitting(false);
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
                  查看系统用户，并支持新增教师、重置密码与删除操作
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-3">
                <button
                  onClick={openAddTeacherModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Edit size={16} />
                  <span>添加教师</span>
                </button>
                <button
                  onClick={openBatchModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Upload size={16} />
                  <span>批量添加教师</span>
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            {teacherErrors.email && (
              <p className="mt-1 text-xs text-red-500">{teacherErrors.email}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={closeAddTeacherModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleCreateTeacher}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || !isTeacherFormValid}
            >
              {isSubmitting ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Batch Upload Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={closeBatchModal}
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
            <p className="mt-2 text-xs text-blue-500">
              可选列：邮箱、角色等。若未提供邮箱，系统会自动生成临时账号信息。
            </p>
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
                onChange={(e) => handleBatchFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="batch-teacher-upload"
              />
              <p className="text-blue-600 font-medium">点击或拖拽文件到此处</p>
              {batchFile && (
                <p className="text-sm text-green-600 mt-2 font-semibold">
                  已选择: {batchFile.name}
                </p>
              )}
            </label>
            {batchErrors.file && (
              <p className="mt-2 text-xs text-red-500">{batchErrors.file}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={closeBatchModal}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={isBatchSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleBatchSubmit}
              disabled={!isBatchFormValid || isBatchSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {isBatchSubmitting && (
                <Loader className="animate-spin mr-2" size={16} />
              )}
              {isBatchSubmitting ? "上传中..." : "开始导入"}
            </button>
          </div>
        </div>
      </Modal>
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
