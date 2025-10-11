import React, { useMemo, useState } from 'react';
import { useExperiment, type ModelMetrics, type SelectedBestModel } from '../contexts/ExperimentContext';
import { FileText, Bold, Italic, Underline, List, ListOrdered, Save } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center space-x-3">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded ${editor.isActive('bold') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        <Bold className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded ${editor.isActive('italic') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        <Italic className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded ${editor.isActive('underline') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        <Underline className="w-5 h-5" />
      </button>
      <div className="w-px h-6 bg-gray-200"></div>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        <List className="w-5 h-5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        <ListOrdered className="w-5 h-5" />
      </button>
    </div>
  );
};

const ExperimentReport: React.FC = () => {
  const { state } = useExperiment();
  const [title, setTitle] = useState(`关于 ${state.selected_product || '产品'} 的需求预测与生产计划实验报告`);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: '<p>在此处开始撰写您的实验报告正文...</p>',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
      },
    },
  });

  const bestModelLabel = useMemo(() => {
    const labels: Record<SelectedBestModel, string> = {
      ma: '移动平均法',
      exp: '指数平滑法',
      arima: 'ARIMA模型',
      lstm: 'LSTM神经网络',
      ensemble_weighted: '加权平均融合',
      ensemble_boosting: 'Boosting融合',
      ensemble_stacking: 'Stacking融合',
    };
    return state.selected_best_model ? labels[state.selected_best_model] : null;
  }, [state.selected_best_model]);

  const bestModelMetrics: ModelMetrics | null = useMemo(() => {
    switch (state.selected_best_model) {
      case 'ma':
        return {
          rmse: state.moving_average_metrics_rmse,
          mae: state.moving_average_metrics_mae,
          r2: state.moving_average_metrics_r2,
        };
      case 'exp':
        return {
          rmse: state.exponential_smoothing_metrics_rmse,
          mae: state.exponential_smoothing_metrics_mae,
          r2: state.exponential_smoothing_metrics_r2,
        };
      case 'arima':
        return {
          rmse: state.arima_metrics_rmse,
          mae: state.arima_metrics_mae,
          r2: state.arima_metrics_r2,
        };
      case 'lstm':
        return {
          rmse: state.lstm_metrics_rmse,
          mae: state.lstm_metrics_mae,
          r2: state.lstm_metrics_r2,
        };
      case 'ensemble_weighted':
        return {
          rmse: state.ensemble_weighted_metrics_rmse,
          mae: state.ensemble_weighted_metrics_mae,
          r2: state.ensemble_weighted_metrics_r2,
        };
      case 'ensemble_boosting':
        return {
          rmse: state.ensemble_boosting_metrics_rmse,
          mae: state.ensemble_boosting_metrics_mae,
          r2: state.ensemble_boosting_metrics_r2,
        };
      case 'ensemble_stacking':
        return {
          rmse: state.ensemble_stacking_metrics_rmse,
          mae: state.ensemble_stacking_metrics_mae,
          r2: state.ensemble_stacking_metrics_r2,
        };
      default:
        return null;
    }
  }, [
    state.selected_best_model,
    state.moving_average_metrics_rmse,
    state.moving_average_metrics_mae,
    state.moving_average_metrics_r2,
    state.exponential_smoothing_metrics_rmse,
    state.exponential_smoothing_metrics_mae,
    state.exponential_smoothing_metrics_r2,
    state.arima_metrics_rmse,
    state.arima_metrics_mae,
    state.arima_metrics_r2,
    state.lstm_metrics_rmse,
    state.lstm_metrics_mae,
    state.lstm_metrics_r2,
    state.ensemble_weighted_metrics_rmse,
    state.ensemble_weighted_metrics_mae,
    state.ensemble_weighted_metrics_r2,
    state.ensemble_boosting_metrics_rmse,
    state.ensemble_boosting_metrics_mae,
    state.ensemble_boosting_metrics_r2,
    state.ensemble_stacking_metrics_rmse,
    state.ensemble_stacking_metrics_mae,
    state.ensemble_stacking_metrics_r2,
  ]);

  return (
    <div className="p-8">
      <div className="w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            撰写实验报告
          </h1>
          <p className="text-lg text-gray-600">
            恭喜您完成所有实验步骤！现在，请根据侧边栏的参考数据，撰写您的实验总结报告。
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Data Reference Sidebar */}
          <aside className="w-full lg:w-80 bg-gray-50 rounded-xl border border-gray-200 p-6 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">实验数据参考</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-500">实验选择</h3>
                <div className="mt-2 space-y-1 text-gray-800">
                  <p><strong>行业:</strong> {state.selected_industry || 'N/A'}</p>
                  <p><strong>公司:</strong> {state.selected_company || 'N/A'}</p>
                  <p><strong>产品:</strong> {state.selected_product || 'N/A'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-500">最优模型</h3>
                <div className="mt-2 space-y-1 text-gray-800">
                  <p><strong>模型:</strong> <span className="font-semibold text-blue-600">{bestModelLabel || 'N/A'}</span></p>
                  {bestModelMetrics && (
                    <>
                      <p><strong>RMSE:</strong> {bestModelMetrics.rmse !== null ? bestModelMetrics.rmse.toFixed(2) : 'N/A'}</p>
                      <p><strong>R²:</strong> {bestModelMetrics.r2 !== null ? bestModelMetrics.r2.toFixed(2) : 'N/A'}</p>
                      <p><strong>MAE:</strong> {bestModelMetrics.mae !== null ? bestModelMetrics.mae.toFixed(2) : 'N/A'}</p>
                    </>
                  )}
                </div>
              </div>
               <div className="border-t pt-4">
                <h3 className="font-medium text-gray-500">完成情况</h3>
                <div className="mt-2 space-y-1 text-gray-800">
                    <p>模型测验: <span className={state.quiz_about_model_completed ? 'text-green-600' : 'text-red-600'}>{state.quiz_about_model_completed ? '已完成' : '未完成'}</span></p>
                    <p>计划测验: <span className={state.quiz_about_plan_completed ? 'text-green-600' : 'text-red-600'}>{state.quiz_about_plan_completed ? '已完成' : '未完成'}</span></p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Editor */}
          <main className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入报告标题"
                className="w-full text-2xl font-semibold text-gray-900 border-none focus:ring-0 p-0"
              />
            </div>
            
            <MenuBar editor={editor} />

            <EditorContent editor={editor} />
          </main>
        </div>

        <footer className="mt-8 flex justify-end">
            <button
                // onClick={handleSaveReport} // Logic to be implemented
                className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
                <Save className="w-5 h-5 mr-2" />
                保存并提交报告
            </button>
        </footer>
      </div>
    </div>
  );
};

export default ExperimentReport;
