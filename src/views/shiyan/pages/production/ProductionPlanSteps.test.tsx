/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from 'path';
import { describe, expect, it, mock } from 'bun:test';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

mock.restore();

const modulePath = (relativePath: string) => resolve(import.meta.dir, relativePath);
const experimentContextModulePath = modulePath('../../contexts/ExperimentContext.zustand.tsx');
const productionContextModulePath = modulePath('./ProductionPlanContextV2.tsx');

let experimentValue = {
  state: {
    selected_best_model: null as null | 'ma',
  },
  ui: {
    isLoadingSales: false,
  },
  productSalesData: {
    meta: { name: '测试产品', unit: '件' },
    monthlySales: [
      { month: '2025-01', sales: 100 },
      { month: '2025-02', sales: 120 },
    ],
  },
};

mock.module(experimentContextModulePath, () => ({
  useExperiment: () => experimentValue,
}));

mock.module(productionContextModulePath, () => ({
  ProductionPlanProvider: ({ avgDemand }: { children: ReactNode; avgDemand: number }) => (
    <div data-testid="production-provider">{avgDemand}</div>
  ),
  useProductionPlan: () => {
    throw new Error('ProductionPlanContent should be replaced by the provider test double');
  },
}));

describe('ProductionPlanSteps hook ordering', () => {
  it('can gain a selected model without changing the component hook order', async () => {
    const { ProductionPlanSteps } = await import('./ProductionPlanSteps');
    const view = render(
      <MemoryRouter>
        <ProductionPlanSteps />
      </MemoryRouter>,
    );

    expect(view.getByText('请先完成最佳模型选择')).toBeDefined();

    experimentValue = {
      ...experimentValue,
      state: { selected_best_model: 'ma' },
    };
    await act(async () => {
      view.rerender(
        <MemoryRouter>
          <ProductionPlanSteps />
        </MemoryRouter>,
      );
    });

    expect(view.getByTestId('production-provider').textContent).toBe('110');
    view.unmount();
  });
});
