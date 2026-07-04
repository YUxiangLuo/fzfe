import React from 'react';
import { QuizPage } from './QuizPage';

const ModelQuiz: React.FC = () => (
  <QuizPage
    kind="model"
    title="预测模型知识测验"
    description="在制定生产计划前，请完成以下测验，确保您已充分理解预测模型的基本原理。"
    accent="blue"
    questionsEndpoint="/quizzes/model/questions"
    submitButtonLabel="提交答案，查看答题结果"
    continueButtonLabel="进入生产计划"
    continuePath="/production"
    completedPatch={{ quiz_about_model_completed: true }}
  />
);

export default ModelQuiz;
