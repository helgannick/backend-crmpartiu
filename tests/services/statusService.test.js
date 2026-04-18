import { describe, it, expect } from '@jest/globals';
import { calculateStatus } from '../../src/services/statusService.js';

describe('calculateStatus', () => {
  it('returns "novo" for 0 interactions', () => {
    expect(calculateStatus(0)).toBe('novo');
  });

  it('returns "engajando" for 1 interaction', () => {
    expect(calculateStatus(1)).toBe('engajando');
  });

  it('returns "engajando" for 4 interactions', () => {
    expect(calculateStatus(4)).toBe('engajando');
  });

  it('returns "recorrente" for 5 interactions', () => {
    expect(calculateStatus(5)).toBe('recorrente');
  });

  it('returns "recorrente" for 9 interactions', () => {
    expect(calculateStatus(9)).toBe('recorrente');
  });

  it('returns "vip" for 10 interactions', () => {
    expect(calculateStatus(10)).toBe('vip');
  });

  it('returns "vip" for 100 interactions', () => {
    expect(calculateStatus(100)).toBe('vip');
  });
});
