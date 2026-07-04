import React from 'react';
import { QuizPage } from './QuizPage';

const PlanQuiz: React.FC = () => (
  <QuizPage
    kind="plan"
    title="生产计划知识测验"
    description="在撰写实验报告前，请完成最后的测验，检验您对生产计划核心概念的理解。"
    accent="green"
    questionsEndpoint="/quizzes/plan/questions"
    submitButtonLabel="提交答案，查看答题结果"
    continueButtonLabel="进入实验报告"
    continuePath="/report"
    completedPatch={{ quiz_about_plan_completed: true }}
  />
);

export default PlanQuiz;
