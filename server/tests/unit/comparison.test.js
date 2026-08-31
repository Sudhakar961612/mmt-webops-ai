import { describe, it, expect } from 'vitest';
import { diffSnapshots } from '../../src/services/comparisonService.js';

describe('diffSnapshots', () => {
  it('returns empty array for identical snapshots', () => {
    const data = { flights: [{ price: 100, seats: 3 }], currency: 'INR' };
    expect(diffSnapshots(data, JSON.parse(JSON.stringify(data)))).toEqual([]);
  });

  it('detects a modified scalar', () => {
    const changes = diffSnapshots({ price: 100 }, { price: 150 });
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('MODIFIED');
    expect(changes[0].field).toBe('price');
    expect(changes[0].previousValue).toBe(100);
    expect(changes[0].currentValue).toBe(150);
    expect(changes[0].severity).toBe('high'); // price-like field
  });

  it('detects added and removed keys', () => {
    const changes = diffSnapshots({ a: 1 }, { b: 2 });
    const types = changes.map((c) => c.type).sort();
    expect(types).toEqual(['ADDED', 'REMOVED']);
  });

  it('detects nested object changes', () => {
    const changes = diffSnapshots({ hotel: { rate: 500 } }, { hotel: { rate: 520 } });
    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe('hotel.rate');
  });

  it('treats arrays that differ as one MODIFIED change', () => {
    const changes = diffSnapshots({ flights: [{ price: 100 }] }, { flights: [{ price: 100 }, { price: 200 }] });
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('MODIFIED');
  });

  it('handles empty / null input', () => {
    expect(diffSnapshots(null, null)).toEqual([]);
    expect(diffSnapshots({}, {})).toEqual([]);
  });
});
