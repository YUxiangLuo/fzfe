import React, { useState } from "react";
import { Edit2, Save, X, Phone, Mail, Calendar, Users } from "lucide-react";
import type { User } from "../../types";

const PersonalInfo: React.FC = () => {
  const [user, setUser] = useState<User>({
    id: "1",
    name: "张教授",
    phone: "13800138000",
    email: "zhang.prof@university.edu.cn",
    registeredAt: "2024-01-15",
    managedClasses: ["软件工程2022级", "计算机科学2023级"],
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const handleSave = (field: string) => {
    setUser((prev) => ({
      ...prev,
      [field]:
        field === "managedClasses"
          ? tempValue.split(",").map((s) => s.trim())
          : tempValue,
    }));
    setEditingField(null);
    setTempValue("");
  };

  const handleCancel = () => {
    setEditingField(null);
    setTempValue("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">个人信息管理</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 姓名 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">姓名</p>
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
              </div>
            </div>

            {/* 手机号码 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">手机号码</p>
                  {editingField === "phone" ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                      />
                      <button
                        onClick={() => handleSave("phone")}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900">{user.phone}</p>
                  )}
                </div>
              </div>
              {editingField !== "phone" && (
                <button
                  onClick={() => handleEdit("phone", user.phone)}
                  className="text-blue-600 hover:bg-blue-100 p-1 rounded"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>

            {/* 邮箱 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">邮箱</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
              </div>
            </div>

            {/* 注册时间 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">注册时间</p>
                  <p className="font-medium text-gray-900">
                    {user.registeredAt}
                  </p>
                </div>
              </div>
            </div>

            {/* 管理的班级 */}
            <div className="md:col-span-2">
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-3 flex-1">
                  <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">管理的班级</p>
                    {editingField === "managedClasses" ? (
                      <div className="space-y-2">
                        <textarea
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          placeholder="请用逗号分隔多个班级"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none"
                          rows={3}
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSave("managedClasses")}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {user.managedClasses.map((className, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded mr-2"
                          >
                            {className}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {editingField !== "managedClasses" && (
                  <button
                    onClick={() =>
                      handleEdit(
                        "managedClasses",
                        user.managedClasses.join(", "),
                      )
                    }
                    className="text-blue-600 hover:bg-blue-100 p-1 rounded ml-2"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;
