import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    expect(normalizeProductText("TEST")).toBe("test");
  });

  it("removes punctuation", () => {
    expect(normalizeProductText("hello!")).toBe("hello");
  });

  it("removes spaces", () => {
    expect(normalizeProductText("hello world")).toBe("helloworld");
  });

  it("handles empty string", () => {
    expect(normalizeProductText("")).toBe("");
  });

  it("handles special chars", () => {
    expect(normalizeProductText("test@email.com!")).toBe("test@emailcom");
  });
});

describe("normalizeSearch", () => {
  it("strips 'hey, is ' prefix", () => {
    expect(normalizeSearch("hey, is guinness")).toBe("guinness");
  });

  it("strips 'Hey, is ' prefix", () => {
    expect(normalizeSearch("Hey, is guinness")).toBe("guinness");
  });

  it("strips 'hey is ' prefix", () => {
    expect(normalizeSearch("hey is guinness")).toBe("guinness");
  });

  it("strips 'Hey is ' prefix", () => {
    expect(normalizeSearch("Hey is guinness")).toBe("guinness");
  });

  it("strips 'is ' prefix", () => {
    expect(normalizeSearch("is guinness")).toBe("guinness");
  });

  it("strips 'Is ' prefix", () => {
    expect(normalizeSearch("Is guinness")).toBe("guinness");
  });

  it("strips 'IS ' prefix", () => {
    expect(normalizeSearch("IS guinness")).toBe("guinness");
  });

  it("strips 'Are ' prefix", () => {
    expect(normalizeSearch("Are beers")).toBe("beers");
  });

  it("strips 'are ' prefix", () => {
    expect(normalizeSearch("are beers")).toBe("beers");
  });

  it("strips 'ARE ' prefix", () => {
    expect(normalizeSearch("ARE beers")).toBe("beers");
  });

  it("strips 'what about ' prefix", () => {
    expect(normalizeSearch("what about guinness")).toBe("guinness");
  });

  it("strips 'vegan?' suffix", () => {
    expect(normalizeSearch("guinnessvegan?")).toBe("guinness");
  });

  it("strips 'Vegan?' suffix", () => {
    expect(normalizeSearch("guinnessVegan?")).toBe("guinness");
  });

  it("corrects 'guiness' to 'guinness'", () => {
    expect(normalizeSearch("guiness")).toBe("guinness");
  });

  it("corrects 'Guiness' to 'guinness'", () => {
    expect(normalizeSearch("Guiness")).toBe("guinness");
  });

  it("corrects 'absolute vodka' to 'absolut vodka'", () => {
    expect(normalizeSearch("absolute vodka")).toBe("absolut vodka");
  });
});

describe("matches", () => {
  it("matches case-insensitively", () => {
    expect(matches("Guinness", "guinness")).toBe(true);
  });

  it("returns false for no match", () => {
    expect(matches("Guinness", "beer")).toBe(false);
  });

  it("matches substring", () => {
    expect(matches("Guinness Extra Stout", "stout")).toBe(true);
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
    expect(productKey({ product_name: "test", status: "vegan", country: "USA" })).toBe("test|vegan|USA");
  });
});

describe("filterResponseData", () => {
  it("removes duplicates", () => {
    const input = [
      { product_name: "test", status: "vegan", country: "USA" },
      { product_name: "test", status: "vegan", country: "USA" },
      { product_name: "test", status: "vegan", country: "UK" }
    ];
    expect(filterResponseData(input)).toHaveLength(2);
  });
});

describe("formatProductResponse", () => {
  it("formats product without country", () => {
    expect(formatProductResponse({ product_name: "test", status: "vegan" })).toBe("test is vegan. ");
  });

  it("formats product with empty country", () => {
    expect(formatProductResponse({ product_name: "test", status: "vegan", country: "" })).toBe("test is vegan. ");
  });

  it("formats product with country", () => {
    expect(formatProductResponse({ product_name: "test", status: "vegan", country: "USA" })).toBe("test made in USA is vegan. ");
  });
});

describe("generateResponseArray", () => {
  it("formats products", () => {
    const input = [{ product_name: "test", status: "vegan" }];
    expect(generateResponseArray(input)).toHaveLength(1);
  });

  it("returns apology when no products", () => {
    const result = generateResponseArray([]);
    expect(result[0]).toContain("cannot find");
  });
});

describe("searchForMatchingProducts", () => {
  it("finds matching products", () => {
    expect(Array.isArray(searchForMatchingProducts("guinness"))).toBe(true);
  });
});
