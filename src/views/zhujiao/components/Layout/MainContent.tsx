import React from 'react';
import type { MenuItem } from '../../types';
import PersonalInfo from '../Account/PersonalInfo';
import ClassManagement from '../Class/ClassManagement';
import StudentManagement from '../Student/StudentManagement';
import ExperimentProgress from '../Experiment/ExperimentProgress';
import ExperimentReports from '../Experiment/ExperimentReports';
import ExperimentLogs from '../Experiment/ExperimentLogs';
import QuestionBank from '../Assessment/QuestionBank';
import GradeWeights from '../Assessment/GradeWeights';
import GradesOverview from '../Assessment/GradesOverview';

interface MainContentProps {
  activeMenuItem: MenuItem;
}

const MainContent: React.FC<MainContentProps> = ({ activeMenuItem }) => {
  const renderContent = () => {
    switch (activeMenuItem) {
      case 'account-personal':
        return <PersonalInfo />;
      case 'class-management':
        return <ClassManagement />;
      case 'student-management':
        return <StudentManagement />;
      case 'experiment-progress':
        return <ExperimentProgress />;
      case 'experiment-reports':
        return <ExperimentReports />;
      case 'experiment-logs':
        return <ExperimentLogs />;
      case 'assessment-questions':
        return <QuestionBank />;
      case 'assessment-weights':
        return <GradeWeights />;
      case 'assessment-grades':
        return <GradesOverview />;
      default:
        return <PersonalInfo />;
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-gray-50" style={{ height: 'calc(100vh - 5rem)' }}>
      <div className="p-6">
        {renderContent()}
      </div>
    </main>
  );
};

export default MainContent;