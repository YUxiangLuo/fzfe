import React, { useState } from "react";
import {
  ChevronDown,
  FlaskConical,
  Settings,
  BookOpen,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["experiment"]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId],
    );
  };

  const menuItems = [
    {
      id: "experiment",
      label: "实验管理",
      icon: FlaskConical,
      children: [
        { id: "experiment-manual", label: "实验手册管理", icon: BookOpen },
        { id: "experiment-data", label: "实验数据管理", icon: Database },
      ],
    },
    {
      id: "system",
      label: "系统管理",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-80 bg-card border-r border-border fixed left-0 top-16 bottom-0 z-30 overflow-y-auto">
      <nav className="flex-1 p-6 pt-8">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <div key={item.id}>
              {item.children ? (
                <>
                  <Button
                    onClick={() => toggleMenu(item.id)}
                    variant={expandedMenus.includes(item.id) ? "secondary" : "ghost"}
                    className="w-full justify-start px-3 py-3 text-left"
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-sm">{item.label}</p>
                    </div>
                    <div
                      className={`transition-transform duration-200 ${
                        expandedMenus.includes(item.id) ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </Button>
                  {expandedMenus.includes(item.id) && (
                    <div className="mt-1 ml-8 space-y-1">
                      {item.children.map((child) => (
                        <Button
                          key={child.id}
                          onClick={() => onViewChange(child.id)}
                          variant={activeView === child.id ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start px-3"
                        >
                          <child.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="ml-2 font-medium">{child.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => onViewChange(item.id)}
                  variant={activeView === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start px-3 py-3 text-left"
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="font-medium text-sm">{item.label}</p>
                  </div>
                </Button>
              )}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
