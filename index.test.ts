import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import net from 'net';
import type { Application } from 'express';

const mockRequest = vi.fn();

vi.mock('request', () => {
  return { default: mockRequest };
});

describe('Vegan Alcohol Checker', () => {
  let server: Application;
  let searchForMatchingProducts: (text: string) => string[];
  let http: any;
  let index: any;
  let requestCallCount: number;

  beforeEach(async () => {
    vi.resetModules();
    requestCallCount = 0;
    const originalListen = net.Server.prototype.listen;
    net.Server.prototype.listen = function(this: any, ...args: any[]) {
      const callback = typeof args[1] === 'function' ? args[1] : (typeof args[0] === 'function' ? args[0] : undefined);
      if (callback) callback();
      return this;
    };
    mockRequest.mockClear();
    mockRequest.mockImplementation((_options: any, callback: any) => {
      requestCallCount++;
      callback(null, { statusCode: 200, body: {} }, {});
    });
    index = await import('./index.ts');
    server = index.server;
    net.Server.prototype.listen = originalListen;
    searchForMatchingProducts = index.searchForMatchingProducts;
    http = require('supertest')(server);
    (global as any).loadedProducts = [];
  });

  describe('GET /', () => {
    it('returns health check message', async () => {
      const response = await http.get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Vegan alcohol checker is up!');
    });
  });

  describe('GET /webhook/', () => {
    it('sends challenge with correct token', async () => {
      const response = await http.get('/webhook/').query({
        'hub.verify_token': 'test-webhook-token',
        'hub.challenge': 'abc123'
      });
      expect(response.status).toBe(200);
      expect(response.text).toBe('abc123');
    });

    it('returns error with wrong token', async () => {
      const response = await http.get('/webhook/').query({
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'abc123'
      });
      expect(response.status).toBe(200);
      expect(response.text).toBe('Error, wrong token');
    });

    it('returns error with missing token', async () => {
      const response = await http.get('/webhook/').query({
        'hub.challenge': 'abc123'
      });
      expect(response.status).toBe(200);
      expect(response.text).toBe('Error, wrong token');
    });

    it('returns error with missing challenge', async () => {
      const response = await http.get('/webhook/').query({
        'hub.verify_token': 'wrong-token'
      });
      expect(response.status).toBe(200);
      expect(response.text).toBe('Error, wrong token');
    });
  });

  describe('POST /webhook/', () => {
    it('returns 200 for valid event', async () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Guinness', status: 'Not Vegan', country: 'Ireland' }]
      ];
      const response = await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'is guinness vegan?' }
          }]
        }]
      });
      expect(response.status).toBe(200);
    });

    it('throws TypeError with missing entry', () => {
      const req = { body: { entry: null } } as any;
      const res = { sendStatus: vi.fn() } as any;
      expect(() => index.handleWebhookPost(req, res)).toThrow(TypeError);
    });

    it('returns 500 with missing entry via Express', async () => {
      const response = await http.post('/webhook/').send({
        object: 'page',
        entry: null
      });
      expect(response.status).toBe(500);
    });

    it('throws TypeError with empty entry', () => {
      const req = { body: { entry: [] } } as any;
      const res = { sendStatus: vi.fn() } as any;
      expect(() => index.handleWebhookPost(req, res)).toThrow(TypeError);
    });

    it('returns 500 with empty entry via Express', async () => {
      const response = await http.post('/webhook/').send({
        object: 'page',
        entry: []
      });
      expect(response.status).toBe(500);
    });

    it('returns 200 with empty messaging', async () => {
      const response = await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: []
        }]
      });
      expect(response.status).toBe(200);
    });

    it('returns 200 with no text field', async () => {
      const response = await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { attachments: [] }
          }]
        }]
      });
      expect(response.status).toBe(200);
    });

    it('sends one weblink for over 20 matches', async () => {
      (global as any).loadedProducts = Array.from({ length: 21 }, (_, i) => [
        { product_name: 'TestBeer' + i, status: 'Vegan Friendly', country: 'USA' }
      ]);
      const response = await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'testbeer' }
          }]
        }]
      });
      expect(response.status).toBe(200);
      expect(mockRequest).toHaveBeenCalledTimes(1);
      const callArgs = mockRequest.mock.calls[0];
      expect((callArgs[0] as any).url).toBe('https://graph.facebook.com/v2.6/me/messages');
      expect((callArgs[0] as any).json.message.text).toContain('www.vacfb.site/a?n=');
      expect((callArgs[0] as any).json.message.text).toContain('testbeer');
    });

    it('sends one message per result for 20 or fewer matches', async () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Beer1', status: 'Vegan Friendly', country: 'USA' }],
        [{ product_name: 'Beer2', status: 'Vegan Friendly', country: 'USA' }],
      ];
      const response = await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'beer' }
          }]
        }]
      });
      expect(response.status).toBe(200);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('strips "is " prefix', async () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Mead', status: 'Vegan Friendly', country: '' }]
      ];
      await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'is mead vegan?' }
          }]
        }]
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          json: expect.objectContaining({
            message: expect.objectContaining({
              text: expect.stringContaining('Mead')
            })
          })
        }),
        expect.any(Function)
      );
    });

    it('rewrites guiness to guinness', async () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Guinness', status: 'Not Vegan', country: 'Ireland' }]
      ];
      await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'is guiness vegan?' }
          }]
        }]
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          json: expect.objectContaining({
            message: expect.objectContaining({
              text: expect.stringContaining('Guinness')
            })
          })
        }),
        expect.any(Function)
      );
    });

    it('rewrites absolute vodka to absolut vodka', async () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Absolut Vodka', status: 'Vegan Friendly', country: 'Sweden' }]
      ];
      await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'is absolute vodka vegan?' }
          }]
        }]
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          json: expect.objectContaining({
            message: expect.objectContaining({
              text: expect.stringContaining('Absolut Vodka')
            })
          })
        }),
        expect.any(Function)
      );
    });

    it('logs send error on request failure', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callback(new Error('send failed'), null, null);
      });
      (global as any).loadedProducts = [
        [{ product_name: 'Beer', status: 'Vegan Friendly', country: 'USA' }]
      ];
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'beer' }
          }]
        }]
      });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error sending messages: ', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('logs api error on response error', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callback(null, { statusCode: 200, body: { error: 'api error' } }, null);
      });
      (global as any).loadedProducts = [
        [{ product_name: 'Beer', status: 'Vegan Friendly', country: 'USA' }]
      ];
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await http.post('/webhook/').send({
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'USER_ID' },
            message: { text: 'beer' }
          }]
        }]
      });
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error: ', 'api error');
      consoleSpy.mockRestore();
    });
  });

  describe('searchForMatchingProducts', () => {
    it('is case-insensitive', () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Guinness', status: 'Not Vegan', country: 'Ireland' }]
      ];
      const results = searchForMatchingProducts('GUINNESS');
      expect(results.some((r: string) => r.includes('Guinness') || r.includes('guinness'))).toBe(true);
    });

    it('strips punctuation and spaces', () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Guinness Draught', status: 'Not Vegan', country: 'Ireland' }]
      ];
      const results = searchForMatchingProducts('guinness,draught');
      expect(results.some((r: string) => r.includes('Guinness Draught'))).toBe(true);
    });

    it('suppresses duplicates', () => {
      (global as any).loadedProducts = [
        [{ product_name: 'Beer', status: 'Vegan Friendly', country: 'USA' }],
        [{ product_name: 'Beer', status: 'Vegan Friendly', country: 'USA' }],
      ];
      const results = searchForMatchingProducts('beer');
      const beerResults = results.filter((r: string) => r.includes('Beer'));
      expect(beerResults).toHaveLength(1);
    });

    it('returns apology for unknown term', () => {
      (global as any).loadedProducts = [];
      const results = searchForMatchingProducts('zzzz-not-a-product');
      expect(results).toEqual([
        "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."
      ]);
    });

    it('matches all products in a group', () => {
      (global as any).loadedProducts = [
        [
          { product_name: 'Beer1', status: 'Vegan Friendly', country: 'USA' },
          { product_name: 'Beer2', status: 'Vegan Friendly', country: 'USA' },
        ]
      ];
      const results = searchForMatchingProducts('beer');
      expect(results).toHaveLength(2);
    });
  });

  describe('stripText', () => {
    it('strips "hey, is " prefix', () => {
      expect((index as any).stripText('hey, is beer vegan?')).toBe('beer ');
    });

    it('strips "Hey, is " prefix', () => {
      expect((index as any).stripText('Hey, is wine vegan?')).toBe('wine ');
    });

    it('strips "hey is " prefix', () => {
      expect((index as any).stripText('hey is cider vegan?')).toBe('cider ');
    });

    it('strips "Hey is " prefix', () => {
      expect((index as any).stripText('Hey is lager vegan?')).toBe('lager ');
    });

    it('strips "is " prefix', () => {
      expect((index as any).stripText('is mead vegan?')).toBe('mead ');
    });

    it('strips "Is " prefix', () => {
      expect((index as any).stripText('Is mead vegan?')).toBe('mead ');
    });

    it('strips "IS " prefix', () => {
      expect((index as any).stripText('IS mead vegan?')).toBe('mead ');
    });

    it('strips "are " prefix', () => {
      expect((index as any).stripText('are there vegan wines?')).toBe('there vegan wines?');
    });

    it('strips "Are " prefix', () => {
      expect((index as any).stripText('Are there vegan wines?')).toBe('there vegan wines?');
    });

    it('strips "ARE " prefix', () => {
      expect((index as any).stripText('ARE there vegan wines?')).toBe('there vegan wines?');
    });

    it('strips "what about " prefix', () => {
      expect((index as any).stripText('what about sake?')).toBe('sake?');
    });

    it('strips "vegan?" suffix', () => {
      expect((index as any).stripText('is tequila vegan?')).toBe('tequila ');
    });

    it('strips "Vegan?" suffix', () => {
      expect((index as any).stripText('is tequila Vegan?')).toBe('tequila ');
    });

    it('rewrites "guiness" to "guinness"', () => {
      expect((index as any).stripText('is guiness vegan?')).toContain('guinness');
    });

    it('rewrites "Guiness" to "guinness"', () => {
      expect((index as any).stripText('is Guiness vegan?')).toContain('guinness');
    });

    it('rewrites "absolute vodka" to "absolut vodka"', () => {
      expect((index as any).stripText('is absolute vodka vegan?')).toContain('absolut vodka');
    });
  });

  describe('Barnivore refresh', () => {
    it('getCompanyJson handles error response', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callback(new Error('network error'), null, null);
      });
      const req = await import('./index.ts');
      req.getCompanyJson(['http://example.com/1.json']);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('getCompanyJson skips non-200 response', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callback(null, { statusCode: 404 }, null);
      });
      const req = await import('./index.ts');
      req.getCompanyJson(['http://example.com/1.json']);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('getCompanyJson recurses with remaining urls', async () => {
      let callCount = 0;
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callCount++;
        if (callCount <= 2) {
          callback(null, { statusCode: 200 }, [{ company: { id: callCount } }]);
        } else {
          callback(null, { statusCode: 200 }, {
            company: {
              products: [
                { product_name: 'Test', status: 'Vegan', country: 'USA' }
              ]
            }
          });
        }
      });
      const req = await import('./index.ts');
      req.getCompanyJson(['http://example.com/1.json', 'http://example.com/2.json']);
      expect(mockRequest).toHaveBeenCalledTimes(4);
    });

    it('getProductJson handles error response', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callback(new Error('network error'), null, null);
      });
      const req = await import('./index.ts');
      req.getProductJson(['http://example.com/1.json']);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('getProductJson skips non-200 response', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callback(null, { statusCode: 404 }, null);
      });
      const req = await import('./index.ts');
      req.getProductJson(['http://example.com/1.json']);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('getProductJson recurses with remaining urls', async () => {
      let callCount = 0;
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callCount++;
        callback(null, { statusCode: 200 }, {
          company: {
            products: [
              { product_name: 'Test' + callCount, status: 'Vegan', country: 'USA' }
            ]
          }
        });
      });
      const req = await import('./index.ts');
      req.getProductJson(['http://example.com/1.json', 'http://example.com/2.json']);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it('getProductJson processes product data', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        callback(null, { statusCode: 200 }, {
          company: {
            products: [
              { product_name: 'Test', status: 'Vegan', country: 'USA' }
            ]
          }
        });
      });
      const req = await import('./index.ts');
      req.getProductJson(['http://example.com/1.json']);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('startServer', () => {
    it('calls listen with callback', () => {
      const listenSpy = vi.spyOn(server as any, 'listen').mockImplementation((_port: any, callback: any) => {
        if (callback) callback();
        return server;
      });
      index.startServer();
      expect(listenSpy).toHaveBeenCalled();
    });
  });
});
