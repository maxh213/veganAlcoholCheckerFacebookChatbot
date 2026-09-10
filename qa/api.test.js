import { describe, test, expect } from 'vitest';

describe('API routes', () => {
  test('getProducts exports exist', async () => {
    const { getProducts } = await import('../index.js');
    expect(getProducts).toBeDefined();
  });
});
