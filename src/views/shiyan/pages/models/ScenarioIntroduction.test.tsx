/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from 'react';
import { describe, expect, it } from 'bun:test';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ScenarioIntroduction from './ScenarioIntroduction';

describe('ScenarioIntroduction accessibility', () => {
  it('exposes one active teaching page and keyboard-operable labeled pagination', async () => {
    const view = render(
      <MemoryRouter>
        <ScenarioIntroduction />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const carousel = view.getByRole('region', { name: '模型实验情境介绍' });
      expect(carousel.getAttribute('aria-roledescription')).toBe('教学内容轮播');
    });

    const pageButtons = view.getAllByRole('button', { name: /转到第 \d+ 教学页/ });
    expect(pageButtons).toHaveLength(3);
    expect(pageButtons[0]!.getAttribute('tabindex')).toBe('0');
    expect(pageButtons[0]!.getAttribute('aria-current')).toBe('true');

    expect(view.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(
      view.getByRole('heading', { level: 2, name: '用需求预测支持生产与库存决策' }),
    ).toBeDefined();

    const slides = view.container.querySelectorAll('.swiper-slide');
    expect(slides).toHaveLength(3);
    expect(view.container.querySelectorAll('.swiper-slide[aria-hidden="false"]')).toHaveLength(1);
    expect(view.container.querySelectorAll('.swiper-slide[aria-hidden="true"]')).toHaveLength(2);

    fireEvent.keyDown(pageButtons[1]!, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      charCode: 13,
    });

    await waitFor(() => {
      expect(
        view.getByRole('heading', {
          level: 2,
          name: '训练区间与独立评估区间都来自历史数据',
        }),
      ).toBeDefined();
    });
    expect(view.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(pageButtons[1]!.getAttribute('aria-current')).toBe('true');
  });
});
