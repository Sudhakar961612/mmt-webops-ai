import { describe, it, expect } from 'vitest';
import { buildFallbackInsight } from '../../src/services/agent/reasonerService.js';

const task = { name: 'Flight monitor', type: 'flight_monitor' };

describe('reasoner fallback', () => {
  it('reports no changes when the change list is empty', () => {
    const insight = buildFallbackInsight(task, [], {});
    expect(insight.hasChanges).toBe(false);
    expect(insight.changeCount).toBe(0);
    expect(insight.summary).toContain('no changes');
  });

  it('summarises a price increase with a delta', () => {
    const changes = [
      {
        type: 'MODIFIED',
        field: 'price_CD123',
        previousValue: 5000,
        currentValue: 5400,
        severity: 'high',
      },
    ];
    const insight = buildFallbackInsight(task, changes, {});
    expect(insight.hasChanges).toBe(true);
    expect(insight.changeCount).toBe(1);
    expect(insight.summary).toContain('1 change');
    expect(insight.insights).toHaveLength(1);
    expect(insight.insights[0].delta).toContain('₹400');
  });

  it('lists added/removed changes', () => {
    const changes = [{ type: 'ADDED', field: 'new_route', previousValue: null, currentValue: 'CD', severity: 'low' }];
    const insight = buildFallbackInsight(task, changes, {});
    expect(insight.changeCount).toBe(1);
    expect(insight.reasoning).toContain('added');
  });

  it('produces element-level deltas from array changes', () => {
    const changes = [
      {
        type: 'MODIFIED',
        field: 'flights',
        previousValue: [
          { flightNo: 'UK 861', priceValue: 5000, seatsAvailable: 6 },
          { flightNo: '6E 2342', priceValue: 4000, seatsAvailable: 1 },
        ],
        currentValue: [
          { flightNo: 'UK 861', priceValue: 5500, seatsAvailable: 6 },
          { flightNo: '6E 2342', priceValue: 4000, seatsAvailable: 3 },
        ],
        severity: 'high',
      },
    ];
    const insight = buildFallbackInsight(task, changes, {});
    expect(insight.hasChanges).toBe(true);
    expect(insight.insights).toHaveLength(1);
    const items = insight.insights[0].items;
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('UK 861');
    expect(items[0].direction).toContain('increased');
    expect(items[1].note).toContain('availability seats 3');
  });
});
