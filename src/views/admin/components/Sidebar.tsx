import React from "react";
import {
  BookOpen,
  Database,
  Users,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const menuItems = [
    {
      id: "experiment-manual",
      label: "实验手册管理",
      icon: BookOpen,
    },
    {
      id: "experiment-data",
      label: "实验数据管理",
      icon: Database,
    },
    {
      id: "user-management",
      label: "用户管理",
      icon: Users,
    },
    {
      id: "class-management",
      label: "班级管理",
      icon: GraduationCap,
    },
  ];

  return (
    <aside className="w-80 bg-card border-r border-border fixed left-0 top-16 bottom-0 z-30 overflow-y-auto">
      <nav className="flex-1 p-6 pt-8">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <div key={item.id}>
              <Button
                onClick={() => onViewChange(item.id)}
                variant={activeView === item.id ? "secondary" : "ghost"}
                className="w-full justify-start px-3 py-3 text-left cursor-pointer"
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <div className="ml-3">
                  <p className="font-medium text-sm">{item.label}</p>
                </div>
              </Button>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
