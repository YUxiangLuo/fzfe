import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Prediction {
  date: string;
  actual: number;
  predicted: number | null;
}

interface PredictionChartProps {
  data: Prediction[];
}

const PredictionChart: React.FC<PredictionChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line strokeWidth={4} type="monotone" dataKey="actual" name="真实值" stroke="#8884d8" activeDot={{ r: 8 }} />
          <Line strokeWidth={4} type="monotone" dataKey="predicted" name="预测值" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PredictionChart;
