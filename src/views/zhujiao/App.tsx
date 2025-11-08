import React, { useState, useEffect } from 'react';
import Header from '../../shared/components/TeacherLayout/Header';
import Sidebar from './components/Layout/Sidebar';
import MainContent from './components/Layout/MainContent';
import { ErrorBoundaryWrapper } from '../../shared/components/ErrorBoundary';
import { createMenuStorage } from '../../shared/utils/menuStorage';
import { getLogoutRedirectPath } from './constants/routes';
import type { MenuItem } from './types';

// P0-2: Create type-safe menu storage with runtime validation
const VALID_MENU_ITEMS = new Set<MenuItem>([
  'account-personal',
  'class-management',
  'student-management',
  'experiment-progress',
  'experiment-reports',
  'experiment-logs',
  'assessment-questions',
  'assessment-weights',
  'assessment-grades',
]);

const DEFAULT_MENU: MenuItem = 'experiment-progress';

const menuStorage = createMenuStorage({
  storageKey: 'zhujiao_active_menu',
  validMenuItems: VALID_MENU_ITEMS,
  defaultMenuItem: DEFAULT_MENU,
});

function App() {
  // P0-2: Use type-safe menu storage
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>(() => {
    return menuStorage.getMenuItem();
  });

  // 每次菜单项变化时保存到 localStorage
  useEffect(() => {
    menuStorage.setMenuItem(activeMenuItem);
  }, [activeMenuItem]);

  return (
    <ErrorBoundaryWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header getLogoutRedirectPath={getLogoutRedirectPath} />
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
    </ErrorBoundaryWrapper>
  );
}

export default App;