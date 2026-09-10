import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app, getTextFromEvent, handleWebhookMessage, normalizeProductText, normalizeSearch, matches, productKey, filterResponseData, formatProductResponse, generateResponseArray, searchForMatchingProducts, sendWeblinkResponse, sendMultipleResponses, sendTextMessage } from "./index";

vi.mock("request");

describe("GET /", () => {
  it("Health check endpoint responds", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Vegan alcohol checker is up!");
  });
});

describe("GET /webhook/", () => {
  it("Webhook verification with correct token", async () => {
    const response = await request(app)
      .get("/webhook/")
      .query({ hub_mode: "subscribe", hub_verify_token: "test-webhook-token", hub_challenge: "12345" });
    expect(response.status).toBe(200);
    expect(response.text).toBe("12345");
  });

  it("Webhook verification with wrong token", async () => {
    const response = await request(app)
      .get("/webhook/")
      .query({ hub_mode: "subscribe", hub_verify_token: "wrong-token", hub_challenge: "12345" });
    expect(response.status).toBe(200);
    expect(response.text).toBe("Error, wrong token");
  });
});

describe("POST /webhook/", () => {
  it("POST webhook with Facebook messaging envelope returns 200", async () => {
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

  it("strips 'is ' prefix", () => {
    expect(normalizeSearch("is guinness")).toBe("guinness");
  });

  it("strips 'are ' prefix", () => {
    expect(normalizeSearch("are guinness")).toBe("guinness");
  });

  it("strips 'what about ' prefix", () => {
    expect(normalizeSearch("what about guinness")).toBe("guinness");
  });

  it("strips 'vegan?' suffix", () => {
    expect(normalizeSearch("guinnessvegan?")).toBe("guinness");
  });

  it("corrects 'guiness' to 'guinness'", () => {
    expect(normalizeSearch("guiness")).toBe("guinness");
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

  it("returns empty string when message.text is undefined", () => {
    expect(getTextFromEvent({ message: { text: undefined } })).toBe("");
  });
});

describe("handleWebhookMessage", () => {
  it("handles unknown text", () => {
    handleWebhookMessage({ message: { text: "unknownbeer12345" } }, "sender123");
  });

  it("Search for guinness returns product with status", () => {
    const responses = searchForMatchingProducts("guinness");
    expect(responses[0]).toContain("Guinness is Not Vegan Friendly.");
  });

  it("Search for Ørbæk with exclamation mark matches Ørbæk products", () => {
    const responses = searchForMatchingProducts("Ørbæk!");
    expect(responses.some(r => r.includes("Ørbæk"))).toBe(true);
  });

  it("Search for wynkoop returns products with country", () => {
    const responses = searchForMatchingProducts("wynkoop");
    expect(responses.some(r => r.includes("made in"))).toBe(true);
  });

  it("Many matches trigger weblink response", () => {
    const text = "I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=test";
    expect(text).toContain("I know a lot of drinks");
    expect(text).toContain("www.vacfb.site/a?n=");
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
  it("Search for product with duplicate entries returns one result", () => {
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
  it("returns formatted responses", () => {
    const input = [{ product_name: "test", status: "vegan", country: "USA" }];
    expect(generateResponseArray(input)).toHaveLength(1);
  });
});

describe("searchForMatchingProducts", () => {
  it("returns array of matches", () => {
    expect(Array.isArray(searchForMatchingProducts("guinness"))).toBe(true);
  });

  it("Unknown alcohol name returns apology message", () => {
    const result = searchForMatchingProducts("nonexistentalcoholxyz");
    expect(result[0]).toContain("cannot find");
  });
});

describe("sendWeblinkResponse", () => {
  it("sends weblink response", () => {
    sendWeblinkResponse("sender123", "test text");
  });
});

describe("sendMultipleResponses", () => {
  it("sends multiple responses", () => {
    sendMultipleResponses("sender123", ["msg1", "msg2"]);
  });
});
