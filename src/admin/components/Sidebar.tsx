import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FlaskConical, 
  Settings, 
  BookOpen, 
  Database 
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['experiment']);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const menuItems = [
    {
      id: 'experiment',
      label: '实验管理',
      icon: FlaskConical,
      children: [
        { id: 'experiment-manual', label: '实验手册管理', icon: BookOpen },
        { id: 'experiment-data', label: '实验数据管理', icon: Database }
      ]
    },
    {
      id: 'system',
      label: '系统管理',
      icon: Settings
    }
  ];

  return (
    <aside className="bg-white border-r border-gray-200 w-64 fixed left-0 top-16 bottom-0 z-30 overflow-y-auto shadow-sm">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors duration-200">
                        <item.icon size={18} className="text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="w-6 h-6 bg-gray-100 group-hover:bg-gray-200 rounded-md flex items-center justify-center transition-colors duration-200">
                      {expandedMenus.includes(item.id) ? (
                        <ChevronDown size={14} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-500" />
                      )}
                    </div>
                  </button>
                  
                  {expandedMenus.includes(item.id) && (
                    <ul className="mt-2 ml-4 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <button
                            onClick={() => onViewChange(child.id)}
                            className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left text-sm rounded-lg transition-all duration-200 group ${
                              activeView === child.id
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-200 ${
                              activeView === child.id
                                ? 'bg-blue-100'
                                : 'bg-gray-100 group-hover:bg-gray-200'
                            }`}>
                              <child.icon size={14} className={
                                activeView === child.id ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                              } />
                            </div>
                            <span className="font-medium">{child.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-xl transition-all duration-200 group ${
                    activeView === item.id
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                    activeView === item.id
                      ? 'bg-blue-100'
                      : 'bg-gray-100 group-hover:bg-blue-100'
                  }`}>
                    <item.icon size={18} className={
                      activeView === item.id ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'
                    } />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;