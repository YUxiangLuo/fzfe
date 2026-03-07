/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

let experimentValue = {
  ui: {
    loading: false,
  },
  isStepUnlocked: (_step: number) => true,
};

mock.module(
  '/home/alice/pros/fangzhen/fe/src/views/shiyan/contexts/ExperimentContext.zustand.tsx',
  () => ({
    useExperiment: () => experimentValue,
  }),
);

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/components/Header.tsx', () => ({
  default: () => <div data-testid="header">header</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/components/Sidebar.tsx', () => ({
  default: () => <div data-testid="sidebar">sidebar</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/pages/IndustrySelection.tsx', () => ({
  default: () => <div>industry page</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/pages/CompanySelection.tsx', () => ({
  default: () => <div>company page</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/pages/ProductSelection.tsx', () => ({
  default: () => <div>product page</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/pages/HistoricalData.tsx', () => ({
  default: () => <div>data page</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/pages/ModelBuilding.tsx', () => ({
  default: () => <div>model page</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/pages/ResultEvaluation.tsx', () => ({
  default: () => <div>evaluation page</div>,
}));

mock.module('/home/alice/pros/fangzhen/fe/src/views/shiyan/pages/production/ProductionPlanPageV2.tsx', () => ({
  default: () => <div>production page</div>,
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderMainLayout = async (initialEntry: string) => {
  const { MainLayout } = await import('./MainLayout');

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <>
        <Routes>
          <Route path="/*" element={<MainLayout />} />
        </Routes>
        <LocationDisplay />
      </>
    </MemoryRouter>,
  );
};

describe('MainLayout', () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    experimentValue = {
      ui: {
        loading: false,
      },
      isStepUnlocked: () => true,
    };
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it('shows the experiment loading state before the main shell renders', async () => {
    experimentValue = {
      ...experimentValue,
      ui: {
        loading: true,
      },
    };

    view = await renderMainLayout('/industry');

    expect(view.getByText('正在加载实验数据...')).toBeDefined();
    expect(view.queryByTestId('header')).toBeNull();
    expect(view.queryByTestId('sidebar')).toBeNull();
  });

  it('renders the shared shell and sidebar on regular experiment routes', async () => {
    view = await renderMainLayout('/industry');

    expect(view.getByTestId('header')).toBeDefined();
    expect(view.getByTestId('sidebar')).toBeDefined();

    await waitFor(() => {
      expect(view!.getByText('industry page')).toBeDefined();
    });
  });

  it('hides the sidebar on production routes while still rendering the route content', async () => {
    view = await renderMainLayout('/production/plan');

    expect(view.getByTestId('header')).toBeDefined();
    expect(view.queryByTestId('sidebar')).toBeNull();

    await waitFor(() => {
      expect(view!.getByText('production page')).toBeDefined();
    });
  });

  it('redirects locked step routes back to industry inside the shared shell', async () => {
    experimentValue = {
      ...experimentValue,
      isStepUnlocked: (step: number) => step < 6,
    };

    view = await renderMainLayout('/evaluation');

    expect(view.getByTestId('header')).toBeDefined();
    expect(view.getByTestId('sidebar')).toBeDefined();

    await waitFor(() => {
      expect(view!.getByTestId('location-display').textContent).toBe('/industry');
    });
    expect(view.queryByText('evaluation page')).toBeNull();
    expect(view.getByText('industry page')).toBeDefined();
  });
});