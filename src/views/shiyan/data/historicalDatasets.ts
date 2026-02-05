export interface MonthlySalesRecord {
  month: string;
  sales: number | null;
}

export interface HistoricalDatasetMeta {
  industry: string;
  company: string;
  product: string;
  name: string;
  description: string;
  unit: string;
}

export interface HistoricalDataset {
  meta: HistoricalDatasetMeta;
  monthlySales: MonthlySalesRecord[];
}

const createSeries = (
  baseYear: number,
  baseMonth: number,
  values: number[],
): MonthlySalesRecord[] => {
  let year = baseYear;
  let month = baseMonth;
  return values.map((sales) => {
    const label = `${year}-${String(month).padStart(2, "0")}`;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return { month: label, sales };
  });
};

const DATASETS = {
  'apparel|yunshang|silkdress': {
    meta: {
      industry: 'apparel',
      company: 'yunshang',
      product: 'silkdress',
      name: '云裳真丝连衣裙',
      description: '融合传统刺绣工艺的高端真丝连衣裙，用于春夏换季主题活动。',
      unit: '件',
    },
    monthlySales: createSeries(2023, 1, [
      980, 1120, 1280, 1360, 1520, 1650,
      1720, 1600, 1480, 1890, 2150, 2240,
      1380, 1420, 1580, 1710, 1860, 2140,
      2280, 2210, 2090, 2360, 2540, 2680,
    ]),
  },
  'automotive|xunchi|e-stream': {
    meta: {
      industry: 'automotive',
      company: 'xunchi',
      product: 'e-stream',
      name: '迅驰E-Stream电动SUV',
      description: '主打城市通勤的电动SUV，配备 500 公里续航与车联网服务。',
      unit: '台',
    },
    monthlySales: createSeries(2023, 1, [
      620, 680, 790, 820, 910, 980,
      1020, 980, 940, 1100, 1250, 1310,
      890, 950, 1040, 1110, 1180, 1240,
      1320, 1400, 1460, 1550, 1680, 1740,
    ]),
  },
  'electronics|zhixin|smartlens': {
    meta: {
      industry: 'electronics',
      company: 'zhixin',
      product: 'smartlens',
      name: '智芯SmartLens AR眼镜',
      description: '定位远程协作与沉浸体验的 AR 智能眼镜，支持导航及虚拟会议。',
      unit: '台',
    },
    monthlySales: createSeries(2023, 1, [
      420, 460, 520, 580, 640, 720,
      760, 810, 840, 920, 990, 1080,
      930, 970, 1010, 1150, 1240, 1350,
      1400, 1450, 1510, 1620, 1760, 1880,
    ]),
  },
  default: {
    meta: {
      industry: 'general',
      company: 'sample-co',
      product: 'sample-product',
      name: '选定产品',
      description: '根据您的选择进行需求预测分析的目标产品。',
      unit: '件',
    },
    monthlySales: createSeries(2023, 1, [
      720, 680, 750, 810, 830, 890,
      910, 870, 840, 900, 960, 980,
      860, 880, 940, 990, 1050, 1090,
      1130, 1180, 1210, 1260, 1320, 1380,
    ]),
  },
} satisfies Record<string, HistoricalDataset>;

export const buildDatasetKey = (
  industry: string | null,
  company: string | null,
  product: string | null,
) => [industry, company, product].filter(Boolean).join('|') || 'default';

export const getHistoricalDataset = (
  industry: string | null,
  company: string | null,
  product: string | null,
): HistoricalDataset => {
  const key = buildDatasetKey(industry, company, product);
  const dataset = DATASETS[key as DatasetKey];
  if (dataset) {
    return dataset;
  }
  return DATASETS.default;
};

export type DatasetKey = keyof typeof DATASETS;
