import React from 'react';
import type { MenuItem } from '../../types';
import PersonalInfo from '../Account/PersonalInfo';
import StudentManagement from '../Student/StudentManagement';
import ExperimentProgress from '../Experiment/ExperimentProgress';
import ExperimentReports from '../Experiment/ExperimentReports';
import ExperimentLogs from '../Experiment/ExperimentLogs';
import GradesOverview from '../Assessment/GradesOverview';

interface MainContentProps {
  activeMenuItem: MenuItem;
}

const MainContent: React.FC<MainContentProps> = ({ activeMenuItem }) => {
  const renderContent = () => {
    switch (activeMenuItem) {
      case 'account-personal':
        return <PersonalInfo />;
      case 'student-management':
        return <StudentManagement />;
      case 'experiment-progress':
        return <ExperimentProgress />;
      case 'experiment-reports':
        return <ExperimentReports />;
      case 'experiment-logs':
        return <ExperimentLogs />;
      case 'assessment-grades':
        return <GradesOverview />;
      default:
        return <PersonalInfo />;
    }
  };

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </main>
  );
};

export default MainContent;