import React, { useState, useEffect } from 'react';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import MainContent from './components/Layout/MainContent';
import type { MenuItem } from './types';

const STORAGE_KEY = 'zhujiao_active_menu';
const DEFAULT_MENU: MenuItem = 'experiment-progress';

function App() {
  // 从 localStorage 读取上次访问的菜单项，如果没有则使用默认值
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as MenuItem) || DEFAULT_MENU;
    } catch {
      return DEFAULT_MENU;
    }
  });

  // 每次菜单项变化时保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeMenuItem);
    } catch (error) {
      console.error('Failed to save menu item to localStorage:', error);
    }
  }, [activeMenuItem]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar
          activeMenuItem={activeMenuItem}
          onMenuItemClick={setActiveMenuItem}
        />
        <MainContent
          activeMenuItem={activeMenuItem}
        />
      </div>
    </div>
  );
}

export default App;