import { beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";

const { requestMock } = vi.hoisted(function () {
  return { requestMock: vi.fn() };
});

vi.mock("request", function () {
  return requestMock;
});

import app from "./index.js";

const host = Function("return this")();
const webhookToken = process.env.WEBHOOK_TOKEN || "test-webhook-token";
const pageToken = process.env.FB_PAGE_TOKEN || "test-page-token";

function graphCalls() {
  return requestMock.mock.calls
    .map(function (call = []) {
      return call[0];
    })
    .filter(function (opts = { url: "" }) {
      return Boolean(opts && opts.url && String(opts.url).indexOf("graph.facebook.com") > -1);
    });
}

function graphTexts() {
  return graphCalls().map(function (call = { json: { message: { text: "" } } }) {
    return call.json.message.text;
  });
}

function emptyCb(_e = null, _r = {}, _b = {}) {}

function cbFrom(args = host.cbArgs) {
  if (args && args.length > 1) {
    return args[1];
  }
  return emptyCb;
}

function defaultRequestImpl(opts = { url: "" }) {
  var cb = cbFrom(arguments);
  const url = opts.url || "";
  if (url.indexOf("graph.facebook.com") > -1) {
    cb(null, { statusCode: 200, body: {} }, {});
    return;
  }
  cb(null, { statusCode: 200, body: [] }, []);
}

beforeEach(function () {
  host.vacRequest = requestMock;
  requestMock.mockReset();
  requestMock.mockImplementation(defaultRequestImpl);
});

function postText(text = "", sender = "111") {
  return supertest(app)
    .post("/webhook/")
    .send({ entry: [{ messaging: [{ sender: { id: sender }, message: { text: text } }] }] });
}

describe("health and webhook verify", function () {
  it("answers GET /", async function () {
    const res = await supertest(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Vegan alcohol checker is up!");
  });

  it("sends hub.challenge when the token matches", async function () {
    const res = await supertest(app).get("/webhook/").query({
      "hub.verify_token": webhookToken,
      "hub.challenge": "abc123",
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe("abc123");
  });

  it("does not send the challenge when the token is wrong", async function () {
    const res = await supertest(app).get("/webhook/").query({
      "hub.verify_token": "wrong",
      "hub.challenge": "abc123",
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe("Error, wrong token");
    expect(res.text).not.toBe("abc123");
  });

  it("does not send the challenge when the token is missing", async function () {
    const res = await supertest(app).get("/webhook/").query({
      "hub.challenge": "abc123",
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe("Error, wrong token");
    expect(res.text).not.toBe("abc123");
  });
});

describe("search replies", function () {
  it("sends the unknown drink sentence", async function () {
    const res = await postText("xyzzynotadrink");
    expect(res.status).toBe(200);
    expect(graphTexts()).toEqual([
      "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.",
    ]);
  });

  it("sends one match with no country", async function () {
    const res = await postText("Widmer");
    expect(res.status).toBe(200);
    expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
  });

  it("sends one match with a country", async function () {
    const res = await postText("Wickwar Beer");
    expect(res.status).toBe(200);
    expect(graphTexts()).toEqual(["Wickwar Beer made in England is Not Vegan Friendly. "]);
  });

  it("treats missing country like an empty country", async function () {
    await postText("Tafel Beers");
    expect(graphTexts()).toEqual(["Tafel Beers is Vegan Friendly. "]);
  });

  it("matches case, punctuation, and spaces", async function () {
    await postText("WIDMER");
    expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    requestMock.mockClear();
    await postText("wid mer");
    expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    requestMock.mockClear();
    await postText("Guinness (brewed in Australia)");
    expect(graphTexts()).toEqual(["Guinness (brewed in Australia) is Vegan Friendly. "]);
    requestMock.mockClear();
    await postText("WickwarBeer");
    expect(graphTexts()).toEqual(["Wickwar Beer made in England is Not Vegan Friendly. "]);
    requestMock.mockClear();
    await postText("Widmer!");
    expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    requestMock.mockClear();
    await postText("Wickwar.Beer");
    expect(graphTexts()).toEqual(["Wickwar Beer made in England is Not Vegan Friendly. "]);
    requestMock.mockClear();
    await postText("idmer");
    expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    const marks = [".", ",", "/", "#", "!", "$", "%", "^", "&", "*", ";", ":", "{", "}", "=", "-", "_", "'", "~", "(", ")"];
    for (const mark of marks) {
      requestMock.mockClear();
      await postText("Widmer" + mark);
      expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    }
  });

  it("dedupes identical catalogue rows", async function () {
    await postText("Wynkoop Rocky Mountain Oyster Stout");
    expect(graphTexts()).toEqual(["Wynkoop Rocky Mountain Oyster Stout made in USA is Not Vegan Friendly. "]);
  });

  it("keeps the same name when country or status differs", async function () {
    await postText("Carling Black Label");
    expect(graphTexts()).toEqual([
      "Carling Black Label made in South Africa is Vegan Friendly. ",
      "Carling Black Label made in England is Not Vegan Friendly. ",
    ]);
  });

  it("keeps the same name and status when only country differs", async function () {
    await postText("Peroni Nastro Azzurro");
    expect(graphTexts()).toEqual([
      "Peroni Nastro Azzurro made in South Africa is Vegan Friendly. ",
      "Peroni Nastro Azzurro made in USA is Vegan Friendly. ",
    ]);
  });

  it("slices over-limit matches to 21 before weblink", async function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    const res = await postText("lager");
    expect(res.status).toBe(200);
    expect(graphTexts()).toHaveLength(1);
    expect(graphTexts()[0]).toContain("www.vacfb.site/a?n=lager");
    expect(log).toHaveBeenCalledWith(21);
    log.mockRestore();
  });

  it("sends one weblink for more than 20 matches using the original text", async function () {
    const res = await postText("hey, is arrington vegan?");
    expect(res.status).toBe(200);
    expect(graphTexts()).toEqual([
      "I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=hey, is arrington vegan?",
    ]);
  });

  it("sends 20 messages and no weblink for alpine", async function () {
    const res = await postText("alpine");
    expect(res.status).toBe(200);
    expect(graphTexts()).toHaveLength(20);
    expect(graphTexts().join("")).not.toContain("www.vacfb.site/a?n=");
    expect(graphTexts().every(function (line = "") {
      return line.indexOf(" is ") > -1 && line.charAt(line.length - 1) === " ";
    })).toBe(true);
  });

  it("sends one message per Guinness match", async function () {
    const res = await postText("guinness");
    expect(res.status).toBe(200);
    expect(graphTexts()).toEqual([
      "Guinness is Not Vegan Friendly. ",
      "Guinness (brewed in Australia) is Vegan Friendly. ",
      "Guinness Black Lager is Not Vegan Friendly. ",
      "Guinness Blonde American Lager is Vegan Friendly. ",
      "Guinness Extra Stout - Canadian brewed and bottled is Not Vegan Friendly. ",
      "Guinness Extra Stout - UK is Not Vegan Friendly. ",
      "Guinness Foreign Extra Stout is Not Vegan Friendly. ",
      "Guinness Porter is Not Vegan Friendly. ",
      "Guinness The 1759 is Not Vegan Friendly. ",
    ]);
  });

  it("strips the filler phrases already in index.js", async function () {
    const phrases = [
      "hey, is Widmer vegan?",
      "Hey, is Widmer vegan?",
      "hey is Widmer vegan?",
      "Hey is Widmer vegan?",
      "is Widmer vegan?",
      "Is Widmer vegan?",
      "IS Widmer vegan?",
      "Are Widmer vegan?",
      "are Widmer vegan?",
      "ARE Widmer vegan?",
      "what about Widmer vegan?",
      "Widmer vegan?",
      "Widmer Vegan?",
    ];
    for (const text of phrases) {
      requestMock.mockClear();
      const res = await postText(text);
      expect(res.status).toBe(200);
      expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    }
  });

  it("rewrites guiness before search", async function () {
    const unknown = "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.";
    await postText("guiness");
    expect(graphTexts()).toHaveLength(9);
    expect(graphTexts()[0]).toBe("Guinness is Not Vegan Friendly. ");
    expect(graphTexts()).not.toContain(unknown);
    requestMock.mockClear();
    await postText("Guiness");
    expect(graphTexts()).toHaveLength(9);
    expect(graphTexts()[0]).toBe("Guinness is Not Vegan Friendly. ");
    expect(graphTexts()).not.toContain(unknown);
  });

  it("rewrites absolute vodka before search", async function () {
    await postText("absolute vodka");
    expect(graphTexts()).toEqual(["Absolut Vodka made in Sweden is Vegan Friendly. "]);
  });

  it("posts to Graph with the page token", async function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    const res = await postText("Widmer");
    expect(res.status).toBe(200);
    const call = graphCalls()[0];
    expect(call.url).toBe("https://graph.facebook.com/v2.6/me/messages");
    expect(call.method).toBe("POST");
    expect(call.qs.access_token).toBe(pageToken);
    expect(call.json.recipient.id).toBe("111");
    expect(call.json.message.text).toBe("Widmer is Vegan Friendly. ");
    expect(log.mock.calls.some(function (call = []) {
      return call[0] === "Error: ";
    })).toBe(false);
    log.mockRestore();
  });

  it("returns 200 and sends nothing for a delivery event", async function () {
    const res = await supertest(app)
      .post("/webhook/")
      .send({ entry: [{ messaging: [{ sender: { id: "111" }, delivery: { mids: ["m1"] } }] }] });
    expect(res.status).toBe(200);
    expect(graphCalls()).toHaveLength(0);
  });

  it("returns 200 and sends nothing for empty messaging", async function () {
    const res = await supertest(app)
      .post("/webhook/")
      .send({ entry: [{ messaging: [] }] });
    expect(res.status).toBe(200);
    expect(graphCalls()).toHaveLength(0);
  });

  it("returns 200 and sends nothing when the message has no text", async function () {
    const res = await supertest(app)
      .post("/webhook/")
      .send({ entry: [{ messaging: [{ sender: { id: "111" }, message: {} }] }] });
    expect(res.status).toBe(200);
    expect(graphCalls()).toHaveLength(0);
  });

  it("returns 200 when Graph errors", async function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(new Error("network"), { statusCode: 500, body: {} }, {});
    });
    const res = await postText("Widmer");
    expect(res.status).toBe(200);
    expect(log).toHaveBeenCalledWith("Error sending messages: ", expect.any(Error));
    log.mockRestore();
  });

  it("returns 200 when Graph returns an error body", async function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(null, { statusCode: 200, body: { error: "bad" } }, { error: "bad" });
    });
    const res = await postText("Widmer");
    expect(res.status).toBe(200);
    expect(log).toHaveBeenCalledWith("Error: ", "bad");
    log.mockRestore();
  });

  it("returns 500 TypeError for a null entry and stays up", async function () {
    const res = await supertest(app).post("/webhook/").send({ object: "page", entry: null });
    expect(res.status).toBe(500);
    expect(res.text).toContain("TypeError");
    const health = await supertest(app).get("/");
    expect(health.status).toBe(200);
    expect(health.text).toBe("Vegan alcohol checker is up!");
  });

  it("returns 500 TypeError for an empty entry array and stays up", async function () {
    const res = await supertest(app).post("/webhook/").send({ object: "page", entry: [] });
    expect(res.status).toBe(500);
    expect(res.text).toContain("TypeError");
    const health = await supertest(app).get("/");
    expect(health.status).toBe(200);
    expect(health.text).toBe("Vegan alcohol checker is up!");
  });
});

describe("catalogue refresh", function () {
  it("walks beer wine liquor then company products", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      var cb = cbFrom(arguments);
      const url = opts.url || "";
      if (url.indexOf("company") > -1) {
        var payload = {
          company: { products: [{ product_name: "X", status: "Vegan Friendly", country: "USA" }] },
        };
        cb(null, { statusCode: 200, body: payload }, payload);
        return;
      }
      cb(null, { statusCode: 200, body: [{ company: { id: 9 } }] }, [{ company: { id: 9 } }]);
    });
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    host.vacOutputForProductsFile();
    expect(host.loading).toBe(false);
    const urls = requestMock.mock.calls.map(function (call = []) {
      return (call[0] || {}).url;
    });
    expect(urls).toHaveLength(6);
    expect(urls[0]).toBe("http://barnivore.com/liquor.json");
    expect(urls).toContain("http://www.barnivore.com/beer.json");
    expect(urls).toContain("http://barnivore.com/wine.json");
    expect(urls).toContain("http://barnivore.com/liquor.json");
    expect(urls).toContain("http://www.barnivore.com/company/9.json");
    requestMock.mock.calls.forEach(function (call = []) {
      expect(call[0].json).toBe(true);
    });
    expect(log).toHaveBeenCalledWith("Product load complete.");
    expect(log).toHaveBeenCalledWith("http://barnivore.com/liquor.json loaded!");
    expect(log).toHaveBeenCalledWith("http://www.barnivore.com/company/9.json loaded!");
    expect(JSON.stringify(log.mock.calls)).toContain("product_name");
    log.mockRestore();
  });

  it("logs company request errors", function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(new Error("company fail"), { statusCode: 200, body: [{ company: { id: 9 } }] }, [{ company: { id: 9 } }]);
    });
    host.loading = true;
    host.vacOutputForProductsFile();
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(host.loading).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.any(Error));
    log.mockRestore();
  });

  it("ignores non-200 company responses", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(null, { statusCode: 500, body: [] }, []);
    });
    host.vacOutputForProductsFile();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("logs product request errors after companies load", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      var cb = cbFrom(arguments);
      const url = opts.url || "";
      if (url.indexOf("company") > -1) {
        cb(new Error("product fail"), { statusCode: 0, body: {} }, {});
        return;
      }
      cb(null, { statusCode: 200, body: [{ company: { id: 3 } }] }, [{ company: { id: 3 } }]);
    });
    host.loading = true;
    host.vacOutputForProductsFile();
    expect(requestMock).toHaveBeenCalledTimes(4);
    expect(host.loading).toBe(true);
  });

  it("ignores non-200 product responses after companies load", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      var cb = cbFrom(arguments);
      const url = opts.url || "";
      if (url.indexOf("company") > -1) {
        cb(null, { statusCode: 404, body: {} }, {});
        return;
      }
      cb(null, { statusCode: 200, body: [{ company: { id: 4 } }] }, [{ company: { id: 4 } }]);
    });
    host.loading = true;
    host.vacOutputForProductsFile();
    expect(requestMock).toHaveBeenCalledTimes(4);
    expect(host.loading).toBe(true);
  });
});

describe("helpers and listen", function () {
  it("detects name duplicates without using country", function () {
    const item = { product_name: "A", status: "S", country: "C" };
    expect(host.vacIsNameDuplicate([], item)).toBe(false);
    expect(host.vacIsNameDuplicate([{ product_name: "A", status: "S", country: "X" }], item)).toBe(true);
    expect(host.vacIsNameDuplicate([{ product_name: "A", status: "T", country: "C" }], item)).toBe(false);
    expect(host.vacIsNameDuplicate([{ product_name: "B", status: "S", country: "C" }], item)).toBe(false);
    expect(host.vacNameAndStatusMatch(item, { product_name: "B", status: "S", country: "C" })).toBe(false);
    expect(host.vacSameProduct(item, { product_name: "A", status: "T", country: "C" })).toBe(false);
    expect(host.vacSameProduct(item, { product_name: "B", status: "S", country: "C" })).toBe(false);
    expect(host.vacSameProduct(item, { product_name: "A", status: "S", country: "Z" })).toBe(false);
    expect(host.vacSameProduct(item, item)).toBe(true);
    expect(host.vacIsDuplicate([], item)).toBe(false);
    expect(host.vacIsDuplicate([item], item)).toBe(true);
    expect(host.vacProductKey(item)).toBe("A\tS\tC");
  });

  it("starts the HTTP listener", function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    const listen = vi.fn(function (_port = 0, cb = emptyCb) {
      cb();
    });
    Function("a, l", "a.listen = l")(app, listen);
    host.vacStartListening();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(listen.mock.calls[0][0]).toBe(80);
    expect(log).toHaveBeenCalledWith("running on port", 80);
    listen.mockClear();
    host.vacMaybeListen(true);
    expect(listen).toHaveBeenCalledTimes(1);
    listen.mockClear();
    host.vacMaybeListen(false);
    expect(listen).toHaveBeenCalledTimes(0);
    expect(host.vacLoadedAsMain).toBe(false);
    host.vacRequest = null;
    expect(typeof host.vacGetRequest()).toBe("function");
    host.vacRequest = requestMock;
    host.vacResetCrawl();
    host.vacGetCompanyJson([]);
    expect(host.loading).toBe(false);
    log.mockRestore();
  });

  it("covers helper defaults and folding", function () {
    expect(host.vacHasMessageText()).toBe(false);
    expect(host.vacHasMessageText(null)).toBe(false);
    expect(host.vacArg0("x")).toBe("x");
    expect(host.vacTextOrBlank()).toBe("");
    expect(host.vacTextOrBlank(3)).toBe("");
    expect(host.vacStripFillers()).toBe("");
    expect(host.vacApplySpellingFixes()).toBe("");
    expect(host.vacCleanQuery()).toBe("");
    expect(host.vacStripMarks("Widmer!")).toBe("Widmer");
    expect(host.vacMatches("Widmer", "WID MER")).toBe(true);
    expect(host.vacMatches("Widmer", "idmer")).toBe(true);
    expect(host.vacMatches()).toBe(true);
    expect(host.vacFormatProductLine()).toBe(" is . ");
    expect(host.vacFormatProductLine({ product_name: "A", status: "S", country: "" })).toBe("A is S. ");
    expect(host.vacWeblinkMessage()).toContain("www.vacfb.site/a?n=");
    expect(host.vacGenerateResponseString([])).toEqual([
      "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.",
    ]);
    expect(host.vacFilterResponseData([])).toEqual([]);
    expect(host.vacMapCompanyProducts([])).toEqual([]);
    expect(host.vacLoadedOk(null, { statusCode: 200 })).toBe(true);
    expect(host.vacLoadedOk(null, { statusCode: 404 })).toBe(false);
    expect(host.vacProductOrBlank().product_name).toBe("");
    expect(host.vacEventOrBlank().message.text).toBe("");
    const src = ["a", "b"];
    expect(host.vacCopyReversed(src)).toEqual(["b", "a"]);
    expect(src).toEqual(["a", "b"]);
    expect(host.vacEmptyStrings()).toEqual([]);
    expect(host.vacEmptyProducts()).toEqual([]);
    expect(host.vacEmptyProductGroups()).toEqual([]);
    host.vacReplyIfText();
    expect(graphCalls()).toHaveLength(0);
    host.vacSendSearchResult({ message: { text: "" }, sender: { id: "" } }, []);
    host.vacOnGraphResponse(null, { body: {} });
  });
});
