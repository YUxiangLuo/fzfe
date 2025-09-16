import React, { useState } from 'react';
import { Plus, Eye, Edit2, Trash2, Search } from 'lucide-react';
import type { Question } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';

const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      content: '在生产计划决策中，哪个因素最重要？',
      type: 'single',
      knowledgePoint: '生产计划基础',
      options: ['需求预测', '库存管理', '成本控制', '质量管理'],
      correctAnswer: '需求预测'
    },
    {
      id: '2',
      content: '以下哪些属于生产计划的主要约束条件？',
      type: 'multiple',
      knowledgePoint: '约束理论',
      options: ['产能限制', '原材料供应', '人力资源', '市场需求'],
      correctAnswer: ['产能限制', '原材料供应', '人力资源']
    },
    {
      id: '3',
      content: '准时化生产(JIT)可以减少库存成本。',
      type: 'boolean',
      knowledgePoint: '生产模式',
      correctAnswer: 'true'
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    content: '',
    type: 'single' as 'single' | 'multiple' | 'boolean',
    knowledgePoint: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const knowledgePoints = [
    '生产计划基础',
    '约束理论',
    '生产模式',
    '需求预测',
    '库存管理',
    '成本控制'
  ];

  const filteredQuestions = questions.filter(q => 
    q.content.includes(searchTerm) ||
    q.knowledgePoint.includes(searchTerm)
  );

  const handleCreate = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      content: formData.content,
      type: formData.type,
      knowledgePoint: formData.knowledgePoint,
      options: formData.type === 'boolean' ? undefined : formData.options.filter(opt => opt.trim()),
      correctAnswer: formData.type === 'multiple' ? formData.correctAnswer.split(',').map(s => s.trim()) : formData.correctAnswer
    };
    setQuestions(prev => [...prev, newQuestion]);
    resetForm();
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      content: question.content,
      type: question.type,
      knowledgePoint: question.knowledgePoint,
      options: question.options ? [...question.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correctAnswer: Array.isArray(question.correctAnswer) 
        ? question.correctAnswer.join(', ') 
        : question.correctAnswer.toString()
    });
    setShowCreateModal(true);
  };

  const handleUpdate = () => {
    if (!editingQuestion) return;
    
    setQuestions(prev => prev.map(q => 
      q.id === editingQuestion.id
        ? {
            ...q,
            content: formData.content,
            type: formData.type,
            knowledgePoint: formData.knowledgePoint,
            options: formData.type === 'boolean' ? undefined : formData.options.filter(opt => opt.trim()),
            correctAnswer: formData.type === 'multiple' ? formData.correctAnswer.split(',').map(s => s.trim()) : formData.correctAnswer
          }
        : q
    ));
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这道题目吗？')) {
      setQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  const handlePreview = (question: Question) => {
    setSelectedQuestion(question);
    setShowPreviewModal(true);
  };

  const resetForm = () => {
    setShowCreateModal(false);
    setEditingQuestion(null);
    setFormData({
      content: '',
      type: 'single',
      knowledgePoint: '',
      options: ['', '', '', ''],
      correctAnswer: ''
    });
  };

  const getTypeText = (type: string) => {
    const typeMap = {
      single: '单选题',
      multiple: '多选题',
      boolean: '判断题'
    };
    return typeMap[type as keyof typeof typeMap];
  };

  const getTypeColor = (type: string) => {
    const colorMap = {
      single: 'bg-blue-100 text-blue-800',
      multiple: 'bg-green-100 text-green-800',
      boolean: 'bg-orange-100 text-orange-800'
    };
    return colorMap[type as keyof typeof colorMap];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">题库管理</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          创建试题
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索题目内容或知识点..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{questions.length}</p>
            <p className="text-sm text-gray-600">总题目数</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{questions.filter(q => q.type === 'single').length}</p>
            <p className="text-sm text-gray-600">单选题</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{questions.filter(q => q.type === 'multiple').length}</p>
            <p className="text-sm text-gray-600">多选题</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{questions.filter(q => q.type === 'boolean').length}</p>
            <p className="text-sm text-gray-600">判断题</p>
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">题目列表</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题目内容</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关联知识点</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuestions.map((question) => (
                <tr key={question.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-md">
                      <p className="truncate">{question.content}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(question.type)}`}>
                      {getTypeText(question.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      {question.knowledgePoint}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePreview(question)}
                        className="text-blue-600 hover:text-blue-800"
                        title="预览"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(question)}
                        className="text-green-600 hover:text-green-800"
                        title="修改"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="text-red-600 hover:text-red-800"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 创建/编辑题目模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={resetForm}
        title={editingQuestion ? '编辑题目' : '创建题目'}
        size="large"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">题目内容</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="请输入题目内容"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">题目类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="single">单选题</option>
                <option value="multiple">多选题</option>
                <option value="boolean">判断题</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">知识点</label>
              <select
                value={formData.knowledgePoint}
                onChange={(e) => setFormData(prev => ({ ...prev, knowledgePoint: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择知识点</option>
                {knowledgePoints.map((point) => (
                  <option key={point} value={point}>{point}</option>
                ))}
              </select>
            </div>
          </div>
          
          {formData.type !== 'boolean' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选项</label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...formData.options];
                      newOptions[index] = e.target.value;
                      setFormData(prev => ({ ...prev, options: newOptions }));
                    }}
                    placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              正确答案
              {formData.type === 'multiple' && <span className="text-sm text-gray-500 ml-1">(多个答案用逗号分隔)</span>}
            </label>
            {formData.type === 'boolean' ? (
              <select
                value={formData.correctAnswer}
                onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择</option>
                <option value="true">正确</option>
                <option value="false">错误</option>
              </select>
            ) : (
              <input
                type="text"
                value={formData.correctAnswer}
                onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                placeholder={formData.type === 'multiple' ? "输入正确答案，多个答案用逗号分隔" : "输入正确答案"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={resetForm}>
              取消
            </Button>
            <Button onClick={editingQuestion ? handleUpdate : handleCreate}>
              {editingQuestion ? '更新' : '创建'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="题目预览"
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(selectedQuestion.type)}`}>
                  {getTypeText(selectedQuestion.type)}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                  {selectedQuestion.knowledgePoint}
                </span>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-4">{selectedQuestion.content}</p>
              
              {selectedQuestion.type !== 'boolean' && selectedQuestion.options && (
                <div className="space-y-2">
                  {selectedQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-1">正确答案:</p>
                <p className="text-green-700">
                  {selectedQuestion.type === 'boolean' 
                    ? (selectedQuestion.correctAnswer === 'true' ? '正确' : '错误')
                    : Array.isArray(selectedQuestion.correctAnswer)
                      ? selectedQuestion.correctAnswer.join(', ')
                      : selectedQuestion.correctAnswer
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuestionBank;