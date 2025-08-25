import React, { useState } from "react";
import { Search, Edit2, Trash2, RotateCcw, Users } from "lucide-react";
import type { Student } from "../../types";
import Modal from "../Common/Modal";
import Button from "../Common/Button";

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([
    {
      id: "1",
      studentId: "2022001",
      name: "张三",
      classId: "1",
      className: "软件工程2022级",
      phone: "13800138001",
      email: "zhangsan@student.edu.cn",
      status: "active",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      studentId: "2022002",
      name: "李四",
      classId: "1",
      className: "软件工程2022级",
      phone: "13800138002",
      email: "lisi@student.edu.cn",
      status: "active",
      createdAt: "2024-01-16",
    },
    {
      id: "3",
      studentId: "2023001",
      name: "王五",
      classId: "2",
      className: "计算机科学2023级",
      phone: "13800138003",
      email: "wangwu@student.edu.cn",
      status: "active",
      createdAt: "2024-02-20",
    },
  ]);

  const [filteredStudents, setFilteredStudents] = useState(students);
  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    classId: "",
  });

  const classes = [
    { id: "1", name: "软件工程2022级" },
    { id: "2", name: "计算机科学2023级" },
  ];

  // 筛选功能
  React.useEffect(() => {
    let filtered = students;

    if (selectedClass) {
      filtered = filtered.filter(
        (student) => student.classId === selectedClass,
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.studentId.includes(searchTerm) ||
          student.name.includes(searchTerm),
      );
    }

    setFilteredStudents(filtered);
  }, [students, selectedClass, searchTerm]);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      phone: student.phone,
      email: student.email,
      classId: student.classId,
    });
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingStudent) return;

    setStudents((prev) =>
      prev.map((student) =>
        student.id === editingStudent.id
          ? {
              ...student,
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              classId: formData.classId,
              className:
                classes.find((c) => c.id === formData.classId)?.name ||
                student.className,
            }
          : student,
      ),
    );
    setShowEditModal(false);
    setEditingStudent(null);
    setFormData({ name: "", phone: "", email: "", classId: "" });
  };

  const handleDelete = (id: string) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
  };

  const handleResetPassword = (studentId: string) => {
    alert(`学生 ${studentId} 的密码已重置为默认密码`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">学生管理</h1>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择班级
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部班级</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              按学号/姓名搜索
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入学号或姓名"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总学生数</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">活跃学生</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter((s) => s.status === "active").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">筛选结果</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredStudents.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 学生列表 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">学生列表</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学生姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  班级
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  手机号码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  邮箱
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
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {student.className}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        student.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {student.status === "active" ? "活跃" : "停用"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-blue-600 hover:text-blue-800"
                        title="修改信息"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(student.studentId)}
                        className="text-orange-600 hover:text-orange-800"
                        title="重置密码"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-800"
                        title="删除学生"
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

      {/* 编辑学生模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingStudent(null);
          setFormData({ name: "", phone: "", email: "", classId: "" });
        }}
        title="修改学生信息"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学生姓名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手机号码
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班级
            </label>
            <select
              value={formData.classId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, classId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800 font-medium">密码重置</p>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              如需重置学生密码，请在保存后使用重置密码功能
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingStudent(null);
                setFormData({ name: "", phone: "", email: "", classId: "" });
              }}
            >
              取消
            </Button>
            <Button onClick={handleUpdate}>保存修改</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentManagement;
