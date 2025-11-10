import React from 'react';

const Formula: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">移动平均法 - 计算公式</h3>
      <p>这里是移动平均法计算公式的介绍文本。</p>
      <div className="p-4 bg-gray-100 rounded-md">
        <code>
          M(t) = (Y(t-1) + Y(t-2) + ... + Y(t-n)) / n
        </code>
      </div>
    </div>
  );
};

export default Formula;
