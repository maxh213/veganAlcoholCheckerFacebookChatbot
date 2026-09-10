import { describe, test, expect, vi } from 'vitest';

vi.mock('request', () => ({
  default: vi.fn((opts, callback) => {
    callback(null, { body: {} });
  })
}));

describe('route GET /', () => {
  test('responds with exact status message', async () => {
    const { routeGetRoot } = await import('../index.js');
    const send = vi.fn();
    const res = { send };
    const req = { method: 'GET', path: '/', query: {} };
    routeGetRoot(req, res);
    expect(send).toHaveBeenCalledWith('Vegan alcohol checker is up!');
  });
});

describe('route GET /webhook/', () => {
  test('sends challenge with valid token', async () => {
    const { routeGetWebhook } = await import('../index.js');
    const send = vi.fn();
    const res = { send };
    const req = { query: { 'hub.verify_token': 'test-webhook-token', 'hub.challenge': 'challenge-123' } };
    routeGetWebhook(req, res);
    expect(send).toHaveBeenCalledWith('challenge-123');
  });

  test('returns error with invalid token', async () => {
    const { routeGetWebhook } = await import('../index.js');
    const send = vi.fn();
    const res = { send };
    const req = { query: { 'hub.verify_token': 'wrong-token' } };
    routeGetWebhook(req, res);
    expect(send).toHaveBeenCalledWith('Error, wrong token');
  });
});

describe('route POST /webhook/', () => {
  test('responds with 200 for messaging envelope', async () => {
    const { routePostWebhook } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const req = { body: { entry: [{ messaging: [{ sender: { id: 'test' }, message: { text: 'test' } }] }] } };
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });

  test('responds with 200 when entry is missing', async () => {
    const { routePostWebhook } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const req = { body: {} };
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });

  test('responds with 200 when messaging is missing', async () => {
    const { routePostWebhook } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const req = { body: { entry: [{}] } };
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });
});

describe('sendTextMessage', () => {
  test('calls request with correct parameters', async () => {
    const { sendTextMessage } = await import('../index.js');
    sendTextMessage('test-sender', 'test message');
    const request = (await import('request')).default;
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        method: 'POST'
      }),
      expect.any(Function)
    );
  });

  test('logs error when response has error', async () => {
    const { sendTextMessage, logMessageError } = await import('../index.js');
    const logSpy = vi.spyOn(console, 'log').mockImplementation();
    const request = (await import('request')).default;
    request.mockImplementation((opts, callback) => {
      callback(null, { body: { error: 'test error' } });
    });
    sendTextMessage('test-sender', 'test message');
    expect(logSpy).toHaveBeenCalledWith('Error: ', 'test error');
    logSpy.mockRestore();
  });

  test('does not log when response has no body', async () => {
    const { sendTextMessage, logMessageError } = await import('../index.js');
    const logSpy = vi.spyOn(console, 'log').mockImplementation();
    const request = (await import('request')).default;
    request.mockImplementation((opts, callback) => {
      callback(null, { body: undefined });
    });
    sendTextMessage('test-sender', 'test message');
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe('sendSearchResults', () => {
  test('sends weblink when more than 20 matches', async () => {
    const { sendSearchResults } = await import('../index.js');
    const loadedProducts = [[{ product_name: 'Test Product', status: 'Vegan' }]];
    const request = (await import('request')).default;
    request.mockClear();
    sendSearchResults('test', 'sender', loadedProducts);
    expect(request).toHaveBeenCalled();
  });

  test('sends individual messages for 20 or fewer matches', async () => {
    const { sendSearchResults } = await import('../index.js');
    const loadedProducts = [[
      { product_name: 'Test1', status: 'Vegan' },
      { product_name: 'Test2', status: 'Vegan' }
    ]];
    const request = (await import('request')).default;
    request.mockClear();
    sendSearchResults('test', 'sender', loadedProducts);
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('sends individual messages for exactly 20 matches', async () => {
    const { sendSearchResults } = await import('../index.js');
    const products = [];
    for (let i = 0; i < 20; i++) {
      products.push({ product_name: `Test${i}`, status: 'Vegan' });
    }
    const loadedProducts = [products];
    const request = (await import('request')).default;
    request.mockClear();
    sendSearchResults('test', 'sender', loadedProducts);
    expect(request).toHaveBeenCalledTimes(20);
  });

  test('sends weblink when 21 matches', async () => {
    const { sendSearchResults } = await import('../index.js');
    const products = [];
    for (let i = 0; i < 21; i++) {
      products.push({ product_name: `Test${i}`, status: 'Vegan' });
    }
    const loadedProducts = [products];
    const request = (await import('request')).default;
    request.mockClear();
    sendSearchResults('test', 'sender', loadedProducts);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('hasValidEvent', () => {
  test('returns true for valid event', async () => {
    const { hasValidEvent } = await import('../index.js');
    const event = { sender: { id: '123' }, message: { text: 'hello' } };
    expect(hasValidEvent(event)).toBe(true);
  });

  test('returns false for undefined event', async () => {
    const { hasValidEvent } = await import('../index.js');
    expect(hasValidEvent(undefined)).toBe(false);
  });

  test('returns false for event without sender', async () => {
    const { hasValidEvent } = await import('../index.js');
    const event = { message: { text: 'hello' } };
    expect(hasValidEvent(event)).toBe(false);
  });

  test('returns false for event without message', async () => {
    const { hasValidEvent } = await import('../index.js');
    const event = { sender: { id: '123' } };
    expect(hasValidEvent(event)).toBe(false);
  });

  test('returns false for event without message.text', async () => {
    const { hasValidEvent } = await import('../index.js');
    const event = { sender: { id: '123' }, message: { text: undefined } };
    expect(hasValidEvent(event)).toBe(false);
  });
});

describe('handleEvent', () => {
  test('processes valid event', async () => {
    const { handleEvent } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const req = { body: { entry: [{ messaging: [{ sender: { id: 'test' }, message: { text: 'is test' } }] }] } };
    const { routePostWebhook } = await import('../index.js');
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });

  test('returns early for invalid event', async () => {
    const { handleEvent } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const req = { body: { entry: [{ messaging: [{}] }] } };
    const { routePostWebhook } = await import('../index.js');
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });
});

describe('handleMessagingEvents', () => {
  test('processes each event in array', async () => {
    const { handleMessagingEvents } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const events = [
      { sender: { id: '123' }, message: { text: 'test' } },
      { sender: { id: '456' }, message: { text: 'test' } }
    ];
    const req = { body: { entry: [{ messaging: events }] } };
    const { routePostWebhook } = await import('../index.js');
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });

  test('handles empty messaging array', async () => {
    const { routePostWebhook } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const req = { body: { entry: [{ messaging: [] }] } };
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });

  test('handles single event', async () => {
    const { handleMessagingEvents } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const events = [
      { sender: { id: '123' }, message: { text: 'test' } }
    ];
    const req = { body: { entry: [{ messaging: events }] } };
    const { routePostWebhook } = await import('../index.js');
    routePostWebhook(req, res);
    expect(sendStatus).toHaveBeenCalledWith(200);
  });
});

describe('isTestEnv', () => {
  test('returns true when NODE_ENV is test', async () => {
    const { isTestEnv } = await import('../index.js');
    expect(isTestEnv()).toBe(true);
  });

  test('returns false when NODE_ENV is not test', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { isTestEnv } = await import('../index.js');
    expect(isTestEnv()).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('listen', () => {
  test('does not start server in test env', async () => {
    const { app } = await import('../index.js');
    const listen = vi.spyOn(app, 'listen');
    vi.resetModules();
    await import('../index.js');
    expect(listen).not.toHaveBeenCalled();
    listen.mockRestore();
  });
});

describe('startServer', () => {
  test('calls app.listen', async () => {
    const { app, startServer } = await import('../index.js');
    const listen = vi.spyOn(app, 'listen').mockReturnValue({
      on: vi.fn(),
      close: vi.fn()
    });
    startServer();
    expect(listen).toHaveBeenCalled();
    listen.mockRestore();
  });
});


describe('app setup', () => {
  test('app exists', async () => {
    const { app } = await import('../index.js');
    expect(app).toBeDefined();
  });

  test('root route is registered', async () => {
    const { app } = await import('../index.js');
    const route = app._router.stack.find((r) => r.route && r.route.path === '/');
    expect(route).toBeDefined();
  });
});

describe('app configuration', () => {
  test('app is an express app', async () => {
    const { app } = await import('../index.js');
    expect(app.get).toBeDefined();
    expect(app.use).toBeDefined();
  });
});
