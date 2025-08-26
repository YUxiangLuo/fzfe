import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ExperimentManualView from './ExperimentManual';
import ExperimentDataView from './ExperimentData';
import SystemManagement from './SystemManagement';

const Layout: React.FC = () => {
  const [activeView, setActiveView] = useState('experiment-manual');

  const renderContent = () => {
    switch (activeView) {
      case 'experiment-manual':
        return <ExperimentManualView />;
      case 'experiment-data':
        return <ExperimentDataView />;
      case 'system':
        return <SystemManagement />;
      default:
        return <ExperimentManualView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="ml-64 pt-16 min-h-screen">
        <div className="h-full p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Layout;