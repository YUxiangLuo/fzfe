import React from 'react';

const Intro: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">移动平均法 - 方法步骤</h3>
      <p>这里是移动平均法一般步骤的介绍文本。</p>
      <p>1) 取长度为窗口数n的时间序列值的均值作为预测值...</p>
      <p>2) 在原始数据表的末尾添加移动平均预测值...</p>
    </div>
  );
};

export default Intro;
