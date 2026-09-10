import { describe, test, expect, vi } from 'vitest';

describe('processText', () => {
  test('strips hey, is prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('hey, is Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips Hey, is prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('Hey, is Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips hey is prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('hey is Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips Hey is prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('Hey is Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips is prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('is Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips Is prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('Is Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips IS prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('IS Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips Are prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('Are Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips are prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('are Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips ARE prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('ARE Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips what about prefix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('what about Ørbæk');
    expect(result).toBe('Ørbæk');
  });

  test('strips vegan? suffix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('Ørbæk vegan?');
    expect(result).toBe('Ørbæk');
  });

  test('strips Vegan? suffix', async () => {
    const { processText } = await import('../index.js');
    const result = processText('Ørbæk Vegan?');
    expect(result).toBe('Ørbæk');
  });

  test('fixes guiness to guinness', async () => {
    const { processText } = await import('../index.js');
    const result = processText('guiness');
    expect(result).toBe('guinness');
  });

  test('fixes Guiness to guinness', async () => {
    const { processText } = await import('../index.js');
    const result = processText('Guiness');
    expect(result).toBe('guinness');
  });

  test('fixes absolute vodka to absolut vodka', async () => {
    const { processText } = await import('../index.js');
    const result = processText('absolute vodka');
    expect(result).toBe('absolut vodka');
  });

  test('returns text unchanged when no patterns match', async () => {
    const { processText } = await import('../index.js');
    const result = processText('some random text');
    expect(result).toBe('some random text');
  });
});

describe('getSearchInput', () => {
  test('processes message text correctly', async () => {
    const { getSearchInput } = await import('../index.js');
    const message = { text: 'hey, is Ørbæk' };
    const result = getSearchInput(message);
    expect(result).toBe('Ørbæk');
  });
});

describe('matches', () => {
  test('is case insensitive', async () => {
    const { matches } = await import('../index.js');
    const result = matches('Ørbæk IPA', 'IPA');
    expect(result).toBe(true);
  });

  test('strips punctuation from product name', async () => {
    const { matches } = await import('../index.js');
    const result = matches('Ægir!', 'Ægir');
    expect(result).toBe(true);
  });

  test('strips spaces from product name', async () => {
    const { matches } = await import('../index.js');
    const result = matches('York Beers', 'Y o r k');
    expect(result).toBe(true);
  });

  test('returns false for non-matches', async () => {
    const { matches } = await import('../index.js');
    const result = matches('Test', 'NotFound');
    expect(result).toBe(false);
  });

  test('strips punctuation from search term', async () => {
    const { matches } = await import('../index.js');
    const result = matches('Test Product', 'Test!');
    expect(result).toBe(true);
  });

  test('strips spaces from search term', async () => {
    const { matches } = await import('../index.js');
    const result = matches('Test Product', 'T e s t');
    expect(result).toBe(true);
  });
});

describe('isDuplicate', () => {
  test('returns true for same name, status, and country', async () => {
    const { isDuplicate } = await import('../index.js');
    const cleanData = [{ product_name: 'Test', status: 'Vegan', country: 'Denmark' }];
    const product = { product_name: 'Test', status: 'Vegan', country: 'Denmark' };
    const result = isDuplicate(cleanData, product);
    expect(result).toBe(true);
  });

  test('returns false for different country', async () => {
    const { isDuplicate } = await import('../index.js');
    const cleanData = [{ product_name: 'Test', status: 'Vegan', country: 'Denmark' }];
    const product = { product_name: 'Test', status: 'Vegan', country: 'Norway' };
    const result = isDuplicate(cleanData, product);
    expect(result).toBe(false);
  });

  test('returns false for different status', async () => {
    const { isDuplicate } = await import('../index.js');
    const cleanData = [{ product_name: 'Test', status: 'Vegan', country: 'Denmark' }];
    const product = { product_name: 'Test', status: 'Not Vegan', country: 'Denmark' };
    const result = isDuplicate(cleanData, product);
    expect(result).toBe(false);
  });

  test('returns false for empty clean data', async () => {
    const { isDuplicate } = await import('../index.js');
    const result = isDuplicate([], { product_name: 'Test', status: 'Vegan', country: 'Denmark' });
    expect(result).toBe(false);
  });
});

describe('filterResponseData', () => {
  test('removes duplicate products', async () => {
    const { filterResponseData } = await import('../index.js');
    const data = [
      { product_name: 'Test', status: 'Vegan', country: 'Denmark' },
      { product_name: 'Test', status: 'Vegan', country: 'Denmark' },
    ];
    const result = filterResponseData(data);
    expect(result.length).toBe(1);
  });

  test('keeps products with different country', async () => {
    const { filterResponseData } = await import('../index.js');
    const data = [
      { product_name: 'Test', status: 'Vegan', country: 'Denmark' },
      { product_name: 'Test', status: 'Vegan', country: 'Norway' },
    ];
    const result = filterResponseData(data);
    expect(result.length).toBe(2);
  });

  test('returns empty array for empty input', async () => {
    const { filterResponseData } = await import('../index.js');
    const result = filterResponseData([]);
    expect(result.length).toBe(0);
  });
});

describe('generateResponseString', () => {
  test('returns error message when no results', async () => {
    const { generateResponseString } = await import('../index.js');
    const result = generateResponseString([]);
    expect(result.length).toBe(1);
    expect(result[0]).toContain('Unfortunately I cannot find');
  });

  test('includes country when present', async () => {
    const { generateResponseString } = await import('../index.js');
    const result = generateResponseString([{ product_name: 'Test', status: 'Vegan', country: 'Denmark' }]);
    expect(result[0]).toContain('made in Denmark');
  });

  test('excludes country when empty string', async () => {
    const { generateResponseString } = await import('../index.js');
    const result = generateResponseString([{ product_name: 'Test', status: 'Vegan', country: '' }]);
    expect(result[0]).not.toContain('made in');
  });

  test('excludes country when undefined', async () => {
    const { generateResponseString } = await import('../index.js');
    const result = generateResponseString([{ product_name: 'Test', status: 'Vegan', country: undefined }]);
    expect(result[0]).not.toContain('made in');
  });

  test('includes country when truthy', async () => {
    const { generateResponseString } = await import('../index.js');
    const result = generateResponseString([{ product_name: 'Test', status: 'Vegan', country: 'Denmark' }]);
    expect(result[0]).toContain('made in Denmark');
  });
});

describe('searchForMatchingProducts', () => {
  test('returns empty array when no products match', async () => {
    const { searchForMatchingProducts } = await import('../index.js');
    const loadedProducts = [];
    const result = searchForMatchingProducts(loadedProducts, 'test');
    expect(result.length).toBe(1);
    expect(result[0]).toContain('Unfortunately I cannot find');
  });

  test('returns matched single products', async () => {
    const { searchForMatchingProducts } = await import('../index.js');
    const loadedProducts= [[{ product_name: 'Test Product', status: 'Vegan' }]];
    const result = searchForMatchingProducts(loadedProducts, 'test');
    expect(result.length).toBe(1);
    expect(result[0]).toContain('is Vegan');
  });

  test('returns matched products from multi-product arrays', async () => {
    const { searchForMatchingProducts } = await import('../index.js');
    const loadedProducts= [[{ product_name: 'Test Product', status: 'Vegan' }]];
    const result = searchForMatchingProducts(loadedProducts, 'test');
    expect(result.length).toBe(1);
  });

  test('filters duplicates before generating response', async () => {
    const { searchForMatchingProducts } = await import('../index.js');
    const loadedProducts= [
      [
        { product_name: 'Test Product', status: 'Vegan', country: 'Denmark' },
        { product_name: 'Test Product', status: 'Vegan', country: 'Denmark' },
      ],
    ];
    const result = searchForMatchingProducts(loadedProducts, 'test');
    expect(result.length).toBe(1);
  });

  test('includes country in response when present', async () => {
    const { searchForMatchingProducts } = await import('../index.js');
    const loadedProducts= [[{ product_name: 'Test Product', status: 'Vegan', country: 'Denmark' }]];
    const result = searchForMatchingProducts(loadedProducts, 'test');
    expect(result[0]).toContain('made in Denmark');
  });
});

describe('buildProductString', () => {
  test('includes country when present', async () => {
    const { buildProductString } = await import('../index.js');
    const result = buildProductString({ product_name: 'Test', status: 'Vegan', country: 'Denmark' });
    expect(result).toContain('Test made in Denmark is Vegan');
  });

  test('excludes country when empty string', async () => {
    const { buildProductString } = await import('../index.js');
    const result = buildProductString({ product_name: 'Test', status: 'Vegan', country: '' });
    expect(result).toContain('Test is Vegan');
  });

  test('excludes country when undefined', async () => {
    const { buildProductString } = await import('../index.js');
    const result = buildProductString({ product_name: 'Test', status: 'Vegan', country: undefined });
    expect(result).toContain('Test is Vegan');
  });
});

describe('findMatches', () => {
  test('returns empty array when no matches', async () => {
    const { findMatches } = await import('../index.js');
    const products = [{ product_name: 'Test', status: 'Vegan' }];
    const result = findMatches(products, 'nonexistent');
    expect(result.length).toBe(0);
  });

  test('returns matching products', async () => {
    const { findMatches } = await import('../index.js');
    const products = [{ product_name: 'Test Product', status: 'Vegan' }];
    const result = findMatches(products, 'test');
    expect(result.length).toBe(1);
  });

  test('is case insensitive', async () => {
    const { findMatches } = await import('../index.js');
    const products = [{ product_name: 'Test Product', status: 'Vegan' }];
    const result = findMatches(products, 'TEST');
    expect(result.length).toBe(1);
  });
});

describe('processProduct', () => {
  test('returns matching product from single item array', async () => {
    const { processProduct } = await import('../index.js');
    const prod = [{ product_name: 'Test Product', status: 'Vegan' }];
    const result = processProduct(prod, 'test');
    expect(result.length).toBe(1);
  });

  test('returns empty array when no match in single item array', async () => {
    const { processProduct } = await import('../index.js');
    const prod = [{ product_name: 'Test Product', status: 'Vegan' }];
    const result = processProduct(prod, 'nonexistent');
    expect(result.length).toBe(0);
  });

  test('returns matches from multi-product array', async () => {
    const { processProduct } = await import('../index.js');
    const prod = [
      { product_name: 'Test Product', status: 'Vegan' },
      { product_name: 'Other Product', status: 'Not Vegan' }
    ];
    const result = processProduct(prod, 'test');
    expect(result.length).toBe(1);
  });

  test('returns empty array for empty product array', async () => {
    const { processProduct } = await import('../index.js');
    const prod = [];
    const result = processProduct(prod, 'test');
    expect(result.length).toBe(0);
  });
});

describe('searchInProductsGroup', () => {
  test('returns empty array when no matches', async () => {
    const { searchInProductsGroup } = await import('../index.js');
    const loadedProducts = [[{ product_name: 'Test', status: 'Vegan' }]];
    const result = searchInProductsGroup(loadedProducts, 'nonexistent');
    expect(result.length).toBe(0);
  });

  test('returns matches from single group', async () => {
    const { searchInProductsGroup } = await import('../index.js');
    const loadedProducts = [[{ product_name: 'Test Product', status: 'Vegan' }]];
    const result = searchInProductsGroup(loadedProducts, 'test');
    expect(result.length).toBe(1);
  });

  test('returns matches from multiple groups', async () => {
    const { searchInProductsGroup } = await import('../index.js');
    const loadedProducts = [
      [{ product_name: 'Test Product', status: 'Vegan' }],
      [{ product_name: 'Another Test', status: 'Vegan' }]
    ];
    const result = searchInProductsGroup(loadedProducts, 'test');
    expect(result.length).toBe(2);
  });
});

describe('buildWeblinkResponse', () => {
  test('includes URL prefix and original text', async () => {
    const { buildWeblinkResponse } = await import('../index.js');
    const result = buildWeblinkResponse('beer');
    expect(result).toContain('www.vacfb.site/a?n=');
    expect(result).toContain('beer');
  });

  test('includes full original text', async () => {
    const { buildWeblinkResponse } = await import('../index.js');
    const result = buildWeblinkResponse('what is this drink');
    expect(result).toContain('what is this drink');
  });
});

describe('logMessageError', () => {
  test('logs error message', async () => {
    const { logMessageError } = await import('../index.js');
    const consoleLog = vi.spyOn(console, 'log').mockImplementation();
    logMessageError('test error');
    expect(consoleLog).toHaveBeenCalledWith('Error: ', 'test error');
    consoleLog.mockRestore();
  });
});

