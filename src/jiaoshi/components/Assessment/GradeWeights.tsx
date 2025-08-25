import React, { useState } from "react";
import { Settings, Save, RotateCcw } from "lucide-react";
import type { GradeWeights as Weights } from "../../types";
import Modal from "../Common/Modal";
import Button from "../Common/Button";

const GradeWeights: React.FC = () => {
  const [weights, setWeights] = useState<Weights>({
    experimentProcess: 40,
    knowledgeTest: 25,
    modelSelection: 15,
    experimentReport: 20,
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processDetails, setProcessDetails] = useState({
    dataPreparation: 15,
    descriptiveStatistics: 20,
    productionPlan: 30,
    resultAnalysis: 25,
    report: 10,
  });

  const [tempWeights, setTempWeights] = useState(weights);
  const [tempProcessDetails, setTempProcessDetails] = useState(processDetails);

  const handleWeightChange = (field: keyof Weights, value: number) => {
    setTempWeights((prev) => ({ ...prev, [field]: value }));
  };

  const handleProcessDetailChange = (field: string, value: number) => {
    setTempProcessDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const total = Object.values(tempWeights).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      alert("权重总和必须为100%");
      return;
    }
    setWeights(tempWeights);
    alert("权重设置已保存");
  };

  const handleSaveDetails = () => {
    const total = Object.values(tempProcessDetails).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (total !== 100) {
      alert("明细权重总和必须为100%");
      return;
    }
    setProcessDetails(tempProcessDetails);
    setShowDetailModal(false);
    alert("明细权重已保存");
  };

  const handleReset = () => {
    const defaultWeights = {
      experimentProcess: 40,
      knowledgeTest: 25,
      modelSelection: 15,
      experimentReport: 20,
    };
    setTempWeights(defaultWeights);
    setWeights(defaultWeights);
  };

  const handleResetDetails = () => {
    const defaultDetails = {
      dataPreparation: 15,
      descriptiveStatistics: 20,
      productionPlan: 30,
      resultAnalysis: 25,
      report: 10,
    };
    setTempProcessDetails(defaultDetails);
  };

  const totalWeight = Object.values(tempWeights).reduce(
    (sum, val) => sum + val,
    0,
  );
  const totalDetailWeight = Object.values(tempProcessDetails).reduce(
    (sum, val) => sum + val,
    0,
  );

  const getWeightColor = (weight: number) => {
    if (weight >= 30) return "text-blue-600";
    if (weight >= 20) return "text-green-600";
    if (weight >= 10) return "text-yellow-600";
    return "text-gray-600";
  };

  const getBarColor = (weight: number) => {
    if (weight >= 30) return "bg-blue-500";
    if (weight >= 20) return "bg-green-500";
    if (weight >= 10) return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">成绩权重</h1>
        <div className="flex space-x-3">
          <Button onClick={handleReset} variant="outline">
            <RotateCcw size={16} className="mr-2" />
            重置默认
          </Button>
          <Button onClick={handleSave}>
            <Save size={16} className="mr-2" />
            保存设置
          </Button>
        </div>
      </div>

      {/* 权重总览 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              成绩组成权重
            </h2>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                totalWeight === 100
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              总权重: {totalWeight}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: "experimentProcess", label: "实验流程", icon: "🔬" },
              { key: "knowledgeTest", label: "知识点测试", icon: "📝" },
              { key: "modelSelection", label: "模型选择", icon: "🎯" },
              { key: "experimentReport", label: "实验报告", icon: "📄" },
            ].map((item) => (
              <div key={item.key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-gray-900">
                      {item.label}
                    </span>
                  </div>
                  {item.key === "experimentProcess" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDetailModal(true)}
                    >
                      <Settings size={14} className="mr-1" />
                      明细分配
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tempWeights[item.key as keyof Weights]}
                      onChange={(e) =>
                        handleWeightChange(
                          item.key as keyof Weights,
                          parseInt(e.target.value),
                        )
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tempWeights[item.key as keyof Weights]}
                        onChange={(e) =>
                          handleWeightChange(
                            item.key as keyof Weights,
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getBarColor(tempWeights[item.key as keyof Weights])}`}
                      style={{
                        width: `${tempWeights[item.key as keyof Weights]}%`,
                      }}
                    ></div>
                  </div>

                  <div className="text-center">
                    <span
                      className={`text-xl font-bold ${getWeightColor(tempWeights[item.key as keyof Weights])}`}
                    >
                      {tempWeights[item.key as keyof Weights]}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 当前权重分布可视化 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          权重分布图表
        </h3>
        <div className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden flex">
            <div
              className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${weights.experimentProcess}%` }}
            >
              实验流程 {weights.experimentProcess}%
            </div>
            <div
              className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${weights.knowledgeTest}%` }}
            >
              知识测试 {weights.knowledgeTest}%
            </div>
            <div
              className="bg-yellow-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${weights.modelSelection}%` }}
            >
              模型选择 {weights.modelSelection}%
            </div>
            <div
              className="bg-purple-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${weights.experimentReport}%` }}
            >
              实验报告 {weights.experimentReport}%
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="w-4 h-4 bg-blue-500 rounded mx-auto mb-1"></div>
              <p className="text-sm text-gray-600">实验流程</p>
              <p className="font-bold text-blue-600">
                {weights.experimentProcess}%
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
              <p className="text-sm text-gray-600">知识点测试</p>
              <p className="font-bold text-green-600">
                {weights.knowledgeTest}%
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="w-4 h-4 bg-yellow-500 rounded mx-auto mb-1"></div>
              <p className="text-sm text-gray-600">模型选择</p>
              <p className="font-bold text-yellow-600">
                {weights.modelSelection}%
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="w-4 h-4 bg-purple-500 rounded mx-auto mb-1"></div>
              <p className="text-sm text-gray-600">实验报告</p>
              <p className="font-bold text-purple-600">
                {weights.experimentReport}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 实验流程明细权重模态框 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="实验流程明细权重分配"
        size="large"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">为实验流程的各个步骤分配权重</p>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                totalDetailWeight === 100
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              总权重: {totalDetailWeight}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "dataPreparation", label: "数据准备", icon: "📊" },
              { key: "descriptiveStatistics", label: "描述性统计", icon: "📈" },
              { key: "productionPlan", label: "制定生产计划", icon: "🏭" },
              { key: "resultAnalysis", label: "结果分析", icon: "🔍" },
              { key: "report", label: "报告撰写", icon: "📝" },
            ].map((item) => (
              <div key={item.key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-gray-900">
                    {item.label}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={
                        tempProcessDetails[
                          item.key as keyof typeof tempProcessDetails
                        ]
                      }
                      onChange={(e) =>
                        handleProcessDetailChange(
                          item.key,
                          parseInt(e.target.value),
                        )
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          tempProcessDetails[
                            item.key as keyof typeof tempProcessDetails
                          ]
                        }
                        onChange={(e) =>
                          handleProcessDetailChange(
                            item.key,
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getBarColor(tempProcessDetails[item.key as keyof typeof tempProcessDetails])}`}
                      style={{
                        width: `${tempProcessDetails[item.key as keyof typeof tempProcessDetails]}%`,
                      }}
                    ></div>
                  </div>

                  <div className="text-center">
                    <span
                      className={`text-lg font-bold ${getWeightColor(tempProcessDetails[item.key as keyof typeof tempProcessDetails])}`}
                    >
                      {
                        tempProcessDetails[
                          item.key as keyof typeof tempProcessDetails
                        ]
                      }
                      %
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleResetDetails}>
              <RotateCcw size={16} className="mr-2" />
              重置
            </Button>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              取消
            </Button>
            <Button onClick={handleSaveDetails}>
              <Save size={16} className="mr-2" />
              保存明细
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GradeWeights;
