import React, { useState, useEffect } from "react";
import { Edit, Loader, AlertTriangle, Trash2 } from "lucide-react";
import type { User } from "../types";
import { apiClient } from "../../../utils/apiClient";
import { decodeToken } from "../../../utils/auth";
import Modal from "./Modal";
import Pagination from "./Pagination";

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
  const PAGE_LIMIT = 10;

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);

  const roleLabels: { [key: string]: string } = {
    student: "学生",
    teacher: "教师",
    assistant: "助教",
    admin: "管理员",
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) setCurrentAdminId(decoded.sub);
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(
          `/users?page=${currentPage}&limit=${PAGE_LIMIT}`,
        );
        setUsers(response.data || []);
        setPaginationInfo(response.pagination);
      } catch (err: any) {
        setError(err.message || "获取用户数据失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage]);

  const handlePasswordConfirm = async () => {
    if (newPassword !== confirmPassword) return alert("两次输入的密码不一致！");
    if (newPassword.length < 6) return alert("密码长度至少为6位！");
    if (!selectedUser) return;

    try {
      await apiClient.put(`/users/${selectedUser.user_id}/password`, {
        newPassword,
      });
      alert(`已成功为用户 ${selectedUser.full_name} 重置密码`);
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      alert(`密码重置失败: ${error.message}`);
    }
  };

  const handleDelete = async (userToDelete: User) => {
    if (window.confirm(`确定要删除用户 "${userToDelete.full_name}" 吗？`)) {
      try {
        await apiClient.delete(`/users/${userToDelete.user_id}`);
        if (users.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          const response = await apiClient.get(
            `/users?page=${currentPage}&limit=${PAGE_LIMIT}`,
          );
          setUsers(response.data || []);
          setPaginationInfo(response.pagination);
        }
        alert("用户删除成功！");
      } catch (err: any) {
        alert(`删除失败: ${err.message}`);
      }
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
            {new Date(user.created_at).toLocaleDateString()}
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedUser(user);
                  setIsPasswordModalOpen(true);
                }}
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
      <div className="space-y-6">
        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
          {paginationInfo && (
            <Pagination
              currentPage={paginationInfo.currentPage}
              totalPages={paginationInfo.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
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
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handlePasswordConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default UserManagement;
