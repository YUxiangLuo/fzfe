import React from "react";
import type { MenuItem } from "../../types";
import PersonalInfo from "../Account/PersonalInfo";
import AssistantManagement from "../Account/AssistantManagement";
import ClassManagement from "../Class/ClassManagement";
import StudentManagement from "../Student/StudentManagement";
import ExperimentProgress from "../Experiment/ExperimentProgress";
import ExperimentReports from "../Experiment/ExperimentReports";
import ExperimentLogs from "../Experiment/ExperimentLogs";
import QuestionBank from "../Assessment/QuestionBank";
import GradeWeights from "../Assessment/GradeWeights";
import GradesOverview from "../Assessment/GradesOverview";

interface MainContentProps {
  activeMenuItem: MenuItem;
  sidebarCollapsed: boolean;
}

const MainContent: React.FC<MainContentProps> = ({
  activeMenuItem,
  sidebarCollapsed,
}) => {
  const renderContent = () => {
    switch (activeMenuItem) {
      case "account-personal":
        return <PersonalInfo />;
      case "account-assistant":
        return <AssistantManagement />;
      case "class-management":
        return <ClassManagement />;
      case "student-management":
        return <StudentManagement />;
      case "experiment-progress":
        return <ExperimentProgress />;
      case "experiment-reports":
        return <ExperimentReports />;
      case "experiment-logs":
        return <ExperimentLogs />;
      case "assessment-questions":
        return <QuestionBank />;
      case "assessment-weights":
        return <GradeWeights />;
      case "assessment-grades":
        return <GradesOverview />;
      default:
        return <PersonalInfo />;
    }
  };

  return (
    <main
      className={`flex-1 p-6 overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? "ml-0" : "ml-0"}`}
    >
      <div className="max-w-7xl mx-auto">{renderContent()}</div>
    </main>
  );
};

export default MainContent;
