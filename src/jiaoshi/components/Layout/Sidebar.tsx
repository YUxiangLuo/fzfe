import React, { useState } from "react";
import {
  User,
  Users,
  GraduationCap,
  FlaskConical,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  UserCog,
  School,
  Activity,
  FileText,
  History,
  Brain,
  Settings,
  BarChart3,
} from "lucide-react";
import type { MenuItem } from "../../types";

interface SidebarProps {
  activeMenuItem: MenuItem;
  onMenuItemClick: (item: MenuItem) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeMenuItem,
  onMenuItemClick,
  collapsed,
  onToggleCollapse,
}) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    "account",
    "experiment",
    "assessment",
  ]);

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu],
    );
  };

  const menuItems = [
    {
      key: "account",
      label: "账号管理",
      icon: User,
      children: [
        { key: "account-personal", label: "个人信息管理", icon: UserCog },
        { key: "account-assistant", label: "助教管理", icon: Users },
      ],
    },
    {
      key: "class-management",
      label: "班级管理",
      icon: School,
    },
    {
      key: "student-management",
      label: "学生管理",
      icon: GraduationCap,
    },
    {
      key: "experiment",
      label: "实验管理",
      icon: FlaskConical,
      children: [
        { key: "experiment-progress", label: "实验进度", icon: Activity },
        { key: "experiment-reports", label: "实验报告", icon: FileText },
        { key: "experiment-logs", label: "实验日志", icon: History },
      ],
    },
    {
      key: "assessment",
      label: "考评管理",
      icon: ClipboardCheck,
      children: [
        { key: "assessment-questions", label: "题库管理", icon: Brain },
        { key: "assessment-weights", label: "成绩权重", icon: Settings },
        { key: "assessment-grades", label: "成绩概览", icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-64"} bg-white shadow-lg transition-all duration-300 flex flex-col`}
    >
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.key} className="mb-1">
            {item.children ? (
              <>
                <button
                  onClick={() => !collapsed && toggleMenu(item.key)}
                  className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="ml-3 flex-1">{item.label}</span>
                      {expandedMenus.includes(item.key) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </>
                  )}
                </button>
                {!collapsed && expandedMenus.includes(item.key) && (
                  <div className="bg-gray-50">
                    {item.children.map((child) => (
                      <button
                        key={child.key}
                        onClick={() => onMenuItemClick(child.key as MenuItem)}
                        className={`flex items-center w-full px-8 py-2 text-sm text-left transition-colors ${
                          activeMenuItem === child.key
                            ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <child.icon size={16} className="flex-shrink-0" />
                        <span className="ml-2">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => onMenuItemClick(item.key as MenuItem)}
                className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
                  activeMenuItem === item.key
                    ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </button>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
