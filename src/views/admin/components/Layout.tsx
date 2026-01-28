import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ExperimentManualView from "./ExperimentManual";
import ExperimentDataView from "./ExperimentData";
import UserManagement from "./UserManagement";
import ClassManagement from "./ClassManagement";
import Toast from "./Toast";

const Layout: React.FC = () => {
  const [activeView, setActiveView] = useState("experiment-data");

  const renderContent = () => {
    switch (activeView) {
      case "experiment-manual":
        return <ExperimentManualView />;
      case "experiment-data":
        return <ExperimentDataView />;
      case "user-management":
        return <UserManagement />;
      case "class-management":
        return <ClassManagement />;
      default:
        return <ExperimentDataView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Toast />
      <div className="flex pt-16">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <main
          className="flex-1 overflow-auto bg-muted/20 ml-80"
          style={{ height: "calc(100vh - 5rem)" }}
        >
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
