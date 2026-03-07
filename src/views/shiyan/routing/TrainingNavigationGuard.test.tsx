/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

let experimentValue = {
  ui: {
    isTrainingLocked: false,
    trainingLockPath: null as string | null,
  },
};

mock.module(
  '/home/alice/pros/fangzhen/fe/src/views/shiyan/contexts/ExperimentContext.zustand.tsx',
  () => ({
    useExperiment: () => experimentValue,
  }),
);

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderGuard = async (initialEntry: string) => {
  const { TrainingNavigationGuard } = await import('./TrainingNavigationGuard');

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TrainingNavigationGuard>
        <div>guarded content</div>
      </TrainingNavigationGuard>
      <LocationDisplay />
    </MemoryRouter>,
  );
};

const createBeforeUnloadEvent = () => {
  const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  Object.defineProperty(event, 'returnValue', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: undefined,
  });
  return event;
};

describe('TrainingNavigationGuard', () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    experimentValue = {
      ui: {
        isTrainingLocked: false,
        trainingLockPath: null,
      },
    };
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it('renders children and does not block beforeunload when training is unlocked', async () => {
    view = await renderGuard('/model');

    expect(view.getByText('guarded content')).toBeDefined();
    expect(view.getByTestId('location-display').textContent).toBe('/model');

    const event = createBeforeUnloadEvent();
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(event.returnValue).toBeUndefined();
  });

  it('redirects to the locked training path when navigating away during training', async () => {
    experimentValue = {
      ui: {
        isTrainingLocked: true,
        trainingLockPath: '/model',
      },
    };

    view = await renderGuard('/evaluation');

    await waitFor(() => {
      expect(view!.getByTestId('location-display').textContent).toBe('/model');
    });
    expect(view.getByText('guarded content')).toBeDefined();
  });

  it('keeps the user on the locked path and cleans up the beforeunload listener on unmount', async () => {
    experimentValue = {
      ui: {
        isTrainingLocked: true,
        trainingLockPath: '/model',
      },
    };

    view = await renderGuard('/model/');

    expect(view.getByText('guarded content')).toBeDefined();
    expect(view.getByTestId('location-display').textContent).toContain('/model');

    const activeEvent = createBeforeUnloadEvent();
    window.dispatchEvent(activeEvent);

    expect(activeEvent.defaultPrevented).toBe(true);
    expect(activeEvent.returnValue).toBe('');

    view.unmount();
    view = null;

    const afterUnmountEvent = createBeforeUnloadEvent();
    window.dispatchEvent(afterUnmountEvent);

    expect(afterUnmountEvent.defaultPrevented).toBe(false);
    expect(afterUnmountEvent.returnValue).toBeUndefined();
  });
});