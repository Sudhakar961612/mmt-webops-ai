import { describe, it, expect } from 'vitest';
import { buildFallbackPlan } from '../../src/services/agent/plannerService.js';

describe('fallback planner', () => {
  it('builds a complete ordered plan', () => {
    const task = { type: 'flight_monitor', target: 'demo:flights' };
    const resolution = { url: 'http://localhost:5000/demo/flights.html', fields: ['flights'] };
    const plan = buildFallbackPlan(task, resolution);
    const actions = plan.map((s) => s.action);
    expect(actions).toContain('navigate');
    expect(actions).toContain('extract');
    expect(actions).toContain('screenshot');
    expect(actions).toContain('compare');
    expect(actions).toContain('reason');
    expect(actions).toContain('notify');
    // orders are sequential
    plan.forEach((s, i) => expect(s.order).toBe(i + 1));
    expect(plan[0].url).toBe(resolution.url);
  });
});
