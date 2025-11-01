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
      <div className="flex pt-16">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main className="flex-1 overflow-auto bg-gray-50 ml-80" style={{ height: 'calc(100vh - 5rem)' }}>
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;