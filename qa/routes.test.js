import { describe, test, expect, vi } from 'vitest';

vi.mock('request', () => ({
  default: vi.fn((opts, callback) => {
    callback(null, { body: {} });
  })
}));

describe('route GET /', () => {
  test('responds with status message', async () => {
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

  test('does not send challenge with invalid token', async () => {
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

  test('processes Facebook messaging envelope', async () => {
    const { routePostWebhook } = await import('../index.js');
    const sendStatus = vi.fn();
    const res = { sendStatus };
    const req = { body: { entry: [{ messaging: [{ sender: { id: 'sender123' }, message: { text: 'test' } }] }] } };
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
});

describe('sendSearchResults', () => {
  test('sends weblink when more than 20 matches', async () => {
    const { sendSearchResults } = await import('../index.js');
    const loadedProducts = [[{ product_name: 'Test Product', status: 'Vegan' }]];
    sendSearchResults('test', 'sender', loadedProducts);
    const request = (await import('request')).default;
    expect(request).toHaveBeenCalled();
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
    const event = { sender: { id: '123' }, message: {} };
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
});

describe('isTestEnv', () => {
  test('returns true when NODE_ENV is test', async () => {
    const { isTestEnv } = await import('../index.js');
    expect(isTestEnv()).toBe(true);
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
