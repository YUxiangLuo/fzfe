/// <reference types="bun-types" />

import { describe, expect, it, mock } from 'bun:test';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';
import { ensureStackingPreflight } from './stackingPreflight';

const sessionWithPrepareStatus = (status: 'active' | 'completed'): GuidedTrainingSession => ({
  session_id: 'stacking-session',
  experiment_id: 12,
  model_type: 'stacking',
  status: 'ready',
  current_step_id: status === 'active' ? 'prepare_data' : 'split_levels',
  next_step_id: status === 'active' ? 'prepare_data' : 'split_levels',
  steps: [{
    id: 'prepare_data',
    label: '确认 Stacking 材料',
    description: '校验材料',
    actionLabel: '校验数据',
    status,
  }],
  step_outputs: {},
  result: null,
  error_message: null,
});

describe('ensureStackingPreflight', () => {
  it('executes prepare_data and preserves its failure result before navigation', async () => {
    const runNextStep = mock(async () => false);

    expect(await ensureStackingPreflight(sessionWithPrepareStatus('active'), runNextStep)).toBe(false);
    expect(runNextStep).toHaveBeenCalledTimes(1);
  });

  it('reuses a completed prepare_data step without advancing another stage', async () => {
    const runNextStep = mock(async () => true);

    expect(await ensureStackingPreflight(sessionWithPrepareStatus('completed'), runNextStep)).toBe(true);
    expect(runNextStep).not.toHaveBeenCalled();
  });
});
