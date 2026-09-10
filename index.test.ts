import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import supertest from "supertest";

vi.mock("request", () => ({
  default: vi.fn((_options, callback) => callback(null, {}, {})),
}));

let app: any;
let server: any;
let getTextFromEvent: any;
let handleWebhookMessage: any;

beforeAll(async () => {
  const mod = await import("./index.js");
  app = mod.default;
  getTextFromEvent = mod.getTextFromEvent;
  handleWebhookMessage = mod.handleWebhookMessage;
  server = app.listen(0);
});

afterAll(() => {
  if (server) server.close();
});

describe("index", () => {
  describe("Health check", () => {
    it("GET / responds with expected message", async () => {
      const agent = supertest(app);
      const res = await agent.get("/");
      expect(res.text).toBe("Vegan alcohol checker is up!");
    });
  });

  describe("Webhook verification", () => {
    it("GET /webhook/ with correct token returns hub.challenge", async () => {
      const agent = supertest(app);
      const res = await agent.get("/webhook/").query({
        hub_verify_token: "test-webhook-token",
        hub_challenge: "12345",
      });
      expect(res.text).toBe("12345");
    });

    it("GET /webhook/ with wrong token does not return hub.challenge", async () => {
      const agent = supertest(app);
      const res = await agent.get("/webhook/").query({
        hub_verify_token: "wrong_token",
        hub_challenge: "12345",
      });
      expect(res.text).not.toBe("12345");
    });
  });

  describe("Facebook webhook", () => {
    it("POST /webhook/ with Facebook envelope returns 200", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "guinness" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Text normalization", () => {
    it("getTextFromEvent returns empty string for event without message", () => {
      expect(getTextFromEvent({})).toBe("");
    });

    it("getTextFromEvent returns empty string for message without text", () => {
      expect(getTextFromEvent({ message: {} })).toBe("");
    });

    it("getTextFromEvent returns text when present", () => {
      expect(getTextFromEvent({ message: { text: "hello" } })).toBe("hello");
    });

    it("strips 'hey, is ' prefix", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "hey, is guinness" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("strips 'is ' prefix", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "is guinness" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("strips 'are ' prefix", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "are guinness vegan" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("strips 'what about ' prefix", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "what about guinness" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("strips 'vegan?' suffix", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "guinness vegan?" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("corrects 'guiness' to 'guinness'", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "guiness" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("corrects 'absolute vodka' to 'absolut vodka'", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "absolute vodka" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Search behavior", () => {
    it("matches case-insensitively", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "Guinness" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("strips punctuation and spaces", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "Ørbæk!" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("removes duplicate products", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "Wynkoop Rocky Mountain Oyster Stout" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("returns apology for unknown products", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "nonexistentalcoholxyz" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("includes country in response when present", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "wynkoop" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("returns weblink for more than 20 matches", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [
          {
            messaging: [
              {
                sender: { id: "user123" },
                message: { text: "e" },
              },
            ],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("handles webhook with no messaging events", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({ entry: [] });
      expect(res.status).toBe(200);
    });

    it("handles webhook with empty entry array", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({});
      expect(res.status).toBe(200);
    });

    it("handles webhook with no body", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/");
      expect(res.status).toBe(200);
    });

    it("handles webhook with entry but no messaging", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({ entry: [{}] });
      expect(res.status).toBe(200);
    });

    it("handles webhook with no sender", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [{ messaging: [{ message: { text: "test" } }] }],
      });
      expect(res.status).toBe(200);
    });

    it("handles webhook with no message", async () => {
      const agent = supertest(app);
      const res = await agent.post("/webhook/").send({
        entry: [{ messaging: [{ sender: { id: "user123" } }] }],
      });
      expect(res.status).toBe(200);
    });
  });
});
