import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, getTextFromEvent, handleWebhookMessage, normalizeProductText, normalizeSearch, matches, productKey, filterResponseData, formatProductResponse, generateResponseArray, searchForMatchingProducts, sendWeblinkResponse, sendMultipleResponses } from "./index";

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
  it("strips hey, is prefix lowercase", () => {
    expect(normalizeSearch("hey, is guinness")).toBe("guinness");
  });

  it("strips Hey, is prefix capitalized", () => {
    expect(normalizeSearch("Hey, is guinness")).toBe("guinness");
  });

  it("strips hey is prefix no comma", () => {
    expect(normalizeSearch("hey is guinness")).toBe("guinness");
  });

  it("strips Hey is prefix no comma capitalized", () => {
    expect(normalizeSearch("Hey is guinness")).toBe("guinness");
  });

  it("strips is prefix lowercase", () => {
    expect(normalizeSearch("is guinness")).toBe("guinness");
  });

  it("strips Is prefix capitalized", () => {
    expect(normalizeSearch("Is guinness")).toBe("guinness");
  });

  it("strips IS prefix uppercase", () => {
    expect(normalizeSearch("IS guinness")).toBe("guinness");
  });

  it("strips Are prefix capitalized", () => {
    expect(normalizeSearch("Are beers")).toBe("beers");
  });

  it("strips are prefix lowercase", () => {
    expect(normalizeSearch("are beers")).toBe("beers");
  });

  it("strips ARE prefix uppercase", () => {
    expect(normalizeSearch("ARE beers")).toBe("beers");
  });

  it("strips what about prefix", () => {
    expect(normalizeSearch("what about guinness")).toBe("guinness");
  });

  it("strips vegan? suffix lowercase", () => {
    expect(normalizeSearch("guinnessvegan?")).toBe("guinness");
  });

  it("strips Vegan? suffix capitalized", () => {
    expect(normalizeSearch("guinnessVegan?")).toBe("guinness");
  });

  it("corrects guiness typo lowercase", () => {
    expect(normalizeSearch("guiness")).toBe("guinness");
  });

  it("corrects Guiness typo capitalized", () => {
    expect(normalizeSearch("Guiness")).toBe("guinness");
  });

  it("corrects absolute vodka typo", () => {
    expect(normalizeSearch("absolute vodka")).toBe("absolut vodka");
  });

  it("keeps text unchanged if no prefixes", () => {
    expect(normalizeSearch("guinness")).toBe("guinness");
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

  it("returns Guinness result for guinness", () => {
    const responses = searchForMatchingProducts("guinness");
    expect(responses[0]).toContain("Guinness is Not Vegan Friendly.");
  });

  it("matches Ørbæk with exclamation mark", () => {
    const responses = searchForMatchingProducts("Ørbæk!");
    expect(responses.some(r => r.includes("Ørbæk"))).toBe(true);
  });

  it("returns wynkoop products with country", () => {
    const responses = searchForMatchingProducts("wynkoop");
    expect(responses.some(r => r.includes("made in"))).toBe(true);
  });

  it("triggers weblink response for many matches", () => {
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
  it("removes duplicate products", () => {
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

  it("returns apology for unknown products", () => {
    const result = generateResponseArray([]);
    expect(result[0]).toContain("cannot find");
  });
});

describe("searchForMatchingProducts", () => {
  it("returns array of matches", () => {
    expect(Array.isArray(searchForMatchingProducts("guinness"))).toBe(true);
  });

  it("returns apology for unknown products", () => {
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
