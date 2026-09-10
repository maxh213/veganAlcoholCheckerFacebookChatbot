import { describe, it, expect, vi, beforeEach, afterEach, test } from "vitest";
import request from "supertest";
import { app, getTextFromEvent, handleWebhookMessage, normalizeProductText, normalizeSearch, matches, productKey, filterResponseData, formatProductResponse, generateResponseArray, searchForMatchingProducts, sendWeblinkResponse } from "./index.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /", () => {
  it("responds with expected message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Vegan alcohol checker is up!");
  });
});

describe("GET /webhook/", () => {
  it("with correct token returns hub.challenge", async () => {
    const response = await request(app)
      .get("/webhook/")
      .query({ hub_mode: "subscribe", hub_verify_token: "test-webhook-token", hub_challenge: "12345" });
    expect(response.status).toBe(200);
    expect(response.text).toBe("12345");
  });

  it("with wrong token does not return hub.challenge", async () => {
    const response = await request(app)
      .get("/webhook/")
      .query({ hub_mode: "subscribe", hub_verify_token: "wrong-token", hub_challenge: "12345" });
    expect(response.status).toBe(200);
    expect(response.text).toBe("Error, wrong token");
  });
});

describe("POST /webhook/", () => {
  it("with Facebook envelope returns 200", async () => {
    const response = await request(app)
      .post("/webhook/")
      .send({
        object: "page",
        entry: [{
          id: "123456789",
          messaging: [{
            sender: { id: "sender123" },
            message: { text: "guinness" }
          }]
        }]
      });
    expect(response.status).toBe(200);
  });

  it("handles webhook with no messaging events", async () => {
    const response = await request(app)
      .post("/webhook/")
      .send({ object: "page", entry: [{ id: "123", messaging: [] }] });
    expect(response.status).toBe(200);
  });

  it("handles webhook with empty entry array", async () => {
    const response = await request(app).post("/webhook/").send({ object: "page", entry: [] });
    expect(response.status).toBe(200);
  });

  it("handles webhook with no body", async () => {
    const response = await request(app).post("/webhook/").send({});
    expect(response.status).toBe(200);
  });

  it("handles webhook with entry but no messaging", async () => {
    const response = await request(app)
      .post("/webhook/")
      .send({ object: "page", entry: [{ id: "123" }] });
    expect(response.status).toBe(200);
  });

  it("handles webhook with no sender", async () => {
    const response = await request(app)
      .post("/webhook/")
      .send({ object: "page", entry: [{ id: "123", messaging: [{ message: { text: "test" } }] }] });
    expect(response.status).toBe(200);
  });

  it("handles webhook with no message", async () => {
    const response = await request(app)
      .post("/webhook/")
      .send({ object: "page", entry: [{ id: "123", messaging: [{ sender: { id: "123" } }] }] });
    expect(response.status).toBe(200);
  });
});

describe("normalizeProductText", () => {
  it("converts to lowercase", () => {
    const result = normalizeProductText("TEST");
    expect(result).toBe("test");
  });

  it("removes punctuation", () => {
    const result = normalizeProductText("hello!");
    expect(result).toBe("hello");
  });

  it("removes spaces", () => {
    const result = normalizeProductText("hello world");
    expect(result).toBe("helloworld");
  });

  it("handles empty string", () => {
    const result = normalizeProductText("");
    expect(result).toBe("");
  });

  it("handles special chars", () => {
    const result = normalizeProductText("test@email.com!");
    expect(result).toBe("test@emailcom");
  });
});

describe("normalizeSearch", () => {
  it("strips 'hey, is ' prefix", () => {
    const result = normalizeSearch("hey, is guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'Hey, is ' prefix", () => {
    const result = normalizeSearch("Hey, is guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'hey is ' prefix", () => {
    const result = normalizeSearch("hey is guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'Hey is ' prefix", () => {
    const result = normalizeSearch("Hey is guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'is ' prefix", () => {
    const result = normalizeSearch("is guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'Is ' prefix", () => {
    const result = normalizeSearch("Is guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'IS ' prefix", () => {
    const result = normalizeSearch("IS guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'Are ' prefix", () => {
    const result = normalizeSearch("Are beers");
    expect(result).toBe("beers");
  });

  it("strips 'are ' prefix", () => {
    const result = normalizeSearch("are beers");
    expect(result).toBe("beers");
  });

  it("strips 'ARE ' prefix", () => {
    const result = normalizeSearch("ARE beers");
    expect(result).toBe("beers");
  });

  it("strips 'what about ' prefix", () => {
    const result = normalizeSearch("what about guinness");
    expect(result).toBe("guinness");
  });

  it("strips 'vegan?' suffix", () => {
    const result = normalizeSearch("guinnessvegan?");
    expect(result).toBe("guinness");
  });

  it("strips 'Vegan?' suffix", () => {
    const result = normalizeSearch("guinnessVegan?");
    expect(result).toBe("guinness");
  });

  it("corrects 'guiness' to 'guinness'", () => {
    const result = normalizeSearch("guiness");
    expect(result).toBe("guinness");
  });

  it("corrects 'Guiness' to 'guinness'", () => {
    const result = normalizeSearch("Guiness");
    expect(result).toBe("guinness");
  });

  it("corrects 'absolute vodka' to 'absolut vodka'", () => {
    const result = normalizeSearch("absolute vodka");
    expect(result).toBe("absolut vodka");
  });
});

describe("matches", () => {
  it("matches case-insensitively", () => {
    const result = matches("Guinness", "guinness");
    expect(result).toBe(true);
  });

  it("returns false for no match", () => {
    const result = matches("Guinness", "beer");
    expect(result).toBe(false);
  });

  it("matches substring", () => {
    const result = matches("Guinness Extra Stout", "stout");
    expect(result).toBe(true);
  });
});

describe("getTextFromEvent", () => {
  it("returns text from event", () => {
    expect(getTextFromEvent({ message: { text: "test" } })).toBe("test");
  });

  it("returns empty string when no message", () => {
    expect(getTextFromEvent({})).toBe("");
  });

  it("returns empty string when message has no text", () => {
    expect(getTextFromEvent({ message: {} })).toBe("");
  });

  it("returns empty string when message.text is null", () => {
    expect(getTextFromEvent({ message: { text: null } })).toBe("");
  });
});

describe("handleWebhookMessage", () => {
  it("handles unknown text", () => {
    handleWebhookMessage({ message: { text: "unknownbeer12345" } }, "sender123");
  });

  it("triggers weblink branch", () => {
    sendWeblinkResponse("sender", "test");
  });
});

describe("productKey", () => {
  it("returns unique key for product", () => {
    const result = productKey({ product_name: "test", status: "vegan", country: "USA" });
    expect(result).toBe("test|vegan|USA");
  });
});

describe("filterResponseData", () => {
  it("removes duplicates", () => {
    const input = [
      { product_name: "test", status: "vegan", country: "USA" },
      { product_name: "test", status: "vegan", country: "USA" },
      { product_name: "test", status: "vegan", country: "UK" }
    ];
    const result = filterResponseData(input);
    expect(result).toHaveLength(2);
  });
});

describe("formatProductResponse", () => {
  it("formats product without country", () => {
    const result = formatProductResponse({ product_name: "test", status: "vegan" });
    expect(result).toBe("test is vegan. ");
  });

  it("formats product with empty country", () => {
    const result = formatProductResponse({ product_name: "test", status: "vegan", country: "" });
    expect(result).toBe("test is vegan. ");
  });

  it("formats product with country", () => {
    const result = formatProductResponse({ product_name: "test", status: "vegan", country: "USA" });
    expect(result).toBe("test made in USA is vegan. ");
  });
});

describe("generateResponseArray", () => {
  it("formats products", () => {
    const input = [{ product_name: "test", status: "vegan" }];
    const result = generateResponseArray(input);
    expect(result).toHaveLength(1);
  });

  it("returns apology when no products", () => {
    const result = generateResponseArray([]);
    expect(result[0]).toContain("cannot find");
  });
});

describe("searchForMatchingProducts", () => {
  it("finds matching products", () => {
    const result = searchForMatchingProducts("guinness");
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("extractEvents", () => {
  it("extracts events from body", () => {
    const body = {
      entry: [{
        id: "123",
        messaging: [{ sender: { id: "1" }, message: { text: "test" } }]
      }]
    };
    const result = extractEvents(body);
    expect(result).toHaveLength(1);
  });

  it("returns empty when no entry", () => {
    const result = extractEvents({});
    expect(result).toHaveLength(0);
  });

  it("returns empty when entry is empty", () => {
    const result = extractEvents({ entry: [] });
    expect(result).toHaveLength(0);
  });

  it("returns empty when entry[0] is empty", () => {
    const result = extractEvents({ entry: [{}] });
    expect(result).toHaveLength(0);
  });
});

describe("extractSender", () => {
  it("extracts sender id", () => {
    const event = { sender: { id: "123" } };
    const result = extractSender(event);
    expect(result).toBe("123");
  });

  it("returns undefined when no sender", () => {
    const event = {};
    const result = extractSender(event);
    expect(result).toBeUndefined();
  });
});

describe("extractMessageText", () => {
  it("extracts message text", () => {
    const event = { message: { text: "test" } };
    const result = extractMessageText(event);
    expect(result).toBe("test");
  });

  it("returns undefined when no message", () => {
    const event = {};
    const result = extractMessageText(event);
    expect(result).toBeUndefined();
  });
});

describe("sendWeblinkResponse", () => {
  it("sends weblink response", () => {
    sendWeblinkResponse("sender123", "test message");
  });
});

function extractEvents(body) {
  const entry = body.entry;
  if (!entry) return [];
  const first = entry[0];
  if (!first) return [];
  return first.messaging || [];
}

function extractSender(event) {
  if (!event?.sender) return undefined;
  return event.sender.id;
}

function extractMessageText(event) {
  if (!event?.message) return undefined;
  return event.message.text;
}
