import React, { useState } from "react";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import MainContent from "./components/Layout/MainContent";
import type { MenuItem } from "./types";

function App() {
  const [activeMenuItem, setActiveMenuItem] =
    useState<MenuItem>("account-personal");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar
          activeMenuItem={activeMenuItem}
          onMenuItemClick={setActiveMenuItem}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <MainContent
          activeMenuItem={activeMenuItem}
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>
    </div>
  );
}

export default App;
