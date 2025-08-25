import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import MainContent from './components/Layout/MainContent';
import { MenuItem } from './types';

function App() {
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>('experiment-progress');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <Header />
      <div className="flex h-[calc(100vh-80px)]">
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