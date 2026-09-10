import { beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";

const { requestMock, loadListen } = vi.hoisted(function () {
  const loadListen = { count: 0 };
  const mod = process.getBuiltinModule("module") as { createRequire: (p: string) => NodeRequire };
  const req = mod.createRequire(process.cwd() + "/package.json");
  const express = req("express");
  express.application.listen = function () {
    loadListen.count += 1;
    const last = arguments[arguments.length - 1];
    if (typeof last === "function") {
      last();
    }
    return this;
  };
  return { requestMock: vi.fn(), loadListen: loadListen };
});

vi.mock("request", function () {
  return requestMock;
});

import vac from "./index.js";

const app = vac.app;
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

function emptyCb(_e: unknown = null, _r: unknown = {}, _b: unknown = {}) {}

function cbFrom(args: unknown = []) {
  const list = args as unknown[];
  if (list && list.length > 1) {
    return list[1] as typeof emptyCb;
  }
  return emptyCb;
}

let requestCalls = 0;

function defaultRequestImpl(opts = { url: "" }) {
  requestCalls += 1;
  if (requestCalls > 50) {
    throw new Error("too many request calls");
  }
  var cb = cbFrom(arguments);
  const url = opts.url || "";
  if (url.indexOf("graph.facebook.com") > -1) {
    cb(null, { statusCode: 200, body: {} }, {});
    return;
  }
  cb(null, { statusCode: 200, body: [] }, []);
}

beforeEach(function () {
  if (loadListen.count !== 0) {
    throw new Error("should not listen when required as a library");
  }
  Function("a, l", "a.listen = l")(app, function (port: unknown = 0, cb: unknown = emptyCb) {
    if (typeof port === "boolean" || !port) {
      throw new Error("missing port");
    }
    if (typeof cb !== "function") {
      throw new Error("missing listen callback");
    }
    const log = console.log;
    let logged = false;
    console.log = function () {
      if (arguments[0] === "running on port" && arguments[1]) {
        logged = true;
      }
      return Function("l, a", "return l.apply(console, a)")(log, arguments);
    };
    try {
      cb();
    } finally {
      console.log = log;
    }
    if (!logged) {
      throw new Error("listen callback did not log port");
    }
  });
  const prevPort = process.env.PORT;
  delete process.env.PORT;
  vac.startIfMain("lib", "main", vac.startListening);
  vac.startIfMain("main", "main", vac.startListening);
  process.env.PORT = "3000";
  vac.startIfMain("main", "main", vac.startListening);
  if (prevPort === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = prevPort;
  }
  vac.request = requestMock;
  requestMock.mockReset();
  requestCalls = 0;
  requestMock.mockImplementation(defaultRequestImpl);
});

function postText(text = "", sender = "111") {
  return supertest(app)
    .post("/webhook/")
    .send({ entry: [{ messaging: [{ sender: { id: sender }, message: { text: text } }] }] });
}

function crawlUrls() {
  return requestMock.mock.calls.map(function (call = []) {
    return (call[0] || {}).url;
  });
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

  it("keeps the same name and country when only status differs", async function () {
    const host = globalThis as unknown as { loadedProducts: unknown };
    const prev = host.loadedProducts;
    host.loadedProducts = [
      [
        { product_name: "Zed Ale", status: "Vegan Friendly", country: "USA" },
        { product_name: "Zed Ale", status: "Not Vegan Friendly", country: "USA" },
      ],
    ];
    try {
      await postText("Zed Ale");
      expect(graphTexts()).toEqual([
        "Zed Ale made in USA is Vegan Friendly. ",
        "Zed Ale made in USA is Not Vegan Friendly. ",
      ]);
    } finally {
      host.loadedProducts = prev;
    }
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
    expect(
      graphTexts().every(function (line = "") {
        return line.indexOf(" is ") > -1 && line.charAt(line.length - 1) === " ";
      }),
    ).toBe(true);
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
    expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    const call = graphCalls()[0];
    expect(call.url).toBe("https://graph.facebook.com/v2.6/me/messages");
    expect(call.method).toBe("POST");
    expect(call.qs.access_token).toBe(pageToken);
    expect(call.json.recipient.id).toBe("111");
    expect(call.json.message.text).toBe("Widmer is Vegan Friendly. ");
    expect(
      log.mock.calls.some(function (call = []) {
        return call[0] === "Error: ";
      }),
    ).toBe(false);
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

  it("returns 500 TypeError for a null messaging item and stays up", async function () {
    const res = await supertest(app)
      .post("/webhook/")
      .send({ entry: [{ messaging: [null] }] });
    expect(res.status).toBe(500);
    expect(res.text).toContain("TypeError");
    const health = await supertest(app).get("/");
    expect(health.status).toBe(200);
    expect(health.text).toBe("Vegan alcohol checker is up!");
  });

  it("skips later envelope items after a 1-20 match reply", async function () {
    const res = await supertest(app)
      .post("/webhook/")
      .send({
        entry: [{
          messaging: [
            { sender: { id: "111" }, message: { text: "Widmer" } },
            { sender: { id: "222" }, message: { text: "Wickwar Beer" } },
          ],
        }],
      });
    expect(res.status).toBe(200);
    expect(graphTexts()).toEqual(["Widmer is Vegan Friendly. "]);
    expect(graphCalls()[0].json.recipient.id).toBe("111");
  });

  it("replies to later envelope items after a weblink reply", async function () {
    const res = await supertest(app)
      .post("/webhook/")
      .send({
        entry: [{
          messaging: [
            { sender: { id: "111" }, message: { text: "arrington" } },
            { sender: { id: "222" }, message: { text: "Widmer" } },
          ],
        }],
      });
    expect(res.status).toBe(200);
    expect(graphTexts()).toEqual([
      "I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=arrington",
      "Widmer is Vegan Friendly. ",
    ]);
    expect(graphCalls()[1].json.recipient.id).toBe("222");
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

  it("rejects nested urlencoded webhook bodies", async function () {
    vac.mountRoutes();
    const res = await supertest(app)
      .post("/webhook/")
      .type("form")
      .send("entry[0][messaging][0][sender][id]=111&entry[0][messaging][0][message][text]=Widmer");
    expect(res.status).toBe(500);
    expect(res.text).toContain("TypeError");
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
    vac.outputForProductsFile();
    expect(vac.loading).toBe(false);
    const urls = crawlUrls();
    expect(urls).toHaveLength(6);
    expect(urls[0]).toBe("http://barnivore.com/liquor.json");
    expect(urls[1]).toBe("http://barnivore.com/wine.json");
    expect(urls[2]).toBe("http://www.barnivore.com/beer.json");
    expect(urls).toContain("http://www.barnivore.com/company/9.json");
    requestMock.mock.calls.forEach(function (call = []) {
      expect(call[0].json).toBe(true);
    });
    expect(log).toHaveBeenCalledWith("Product load complete.");
    expect(log).toHaveBeenCalledWith("http://barnivore.com/liquor.json loaded!");
    expect(log).toHaveBeenCalledWith("http://www.barnivore.com/company/9.json loaded!");
    expect(JSON.stringify(log.mock.calls)).toContain("product_name");
    expect(vac.products).toHaveLength(3);
    expect(vac.products[0][0].product_name).toBe("X");
    log.mockRestore();
  });

  it("waits for each Barnivore list before requesting the next", function () {
    const pending: { opts: { url: string }; cb: Function }[] = [];
    requestMock.mockImplementation(function (opts = { url: "" }) {
      pending.push({ opts: opts, cb: cbFrom(arguments) });
    });
    vac.outputForProductsFile();
    expect(pending).toHaveLength(1);
    expect(pending[0].opts.url).toBe("http://barnivore.com/liquor.json");
    pending[0].cb(null, { statusCode: 200, body: [{ company: { id: 1 } }] }, [{ company: { id: 1 } }]);
    expect(pending).toHaveLength(2);
    expect(pending[1].opts.url).toBe("http://barnivore.com/wine.json");
    pending[1].cb(null, { statusCode: 200, body: [] }, []);
    expect(pending).toHaveLength(3);
    expect(pending[2].opts.url).toBe("http://www.barnivore.com/beer.json");
    pending[2].cb(null, { statusCode: 200, body: [] }, []);
    expect(pending).toHaveLength(4);
    expect(pending[3].opts.url).toBe("http://www.barnivore.com/company/1.json");
  });

  it("clears leftover products before a crawl that errors", function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    vac.products = ["leftover"];
    requestMock.mockImplementation(function () {
      cbFrom(arguments)(new Error("fail"), { statusCode: 0, body: {} }, {});
    });
    vac.outputForProductsFile();
    expect(vac.products).toEqual([]);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.any(Error));
    log.mockRestore();
  });

  it("logs company request errors", function () {
    const log = vi.spyOn(console, "log").mockImplementation(function () {});
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(new Error("company fail"), { statusCode: 200, body: [{ company: { id: 9 } }] }, [{ company: { id: 9 } }]);
    });
    vac.loading = true;
    vac.outputForProductsFile();
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(vac.loading).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.any(Error));
    log.mockRestore();
  });

  it("ignores non-200 company responses", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(null, { statusCode: 500, body: [] }, []);
    });
    vac.outputForProductsFile();
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
    vac.loading = true;
    vac.outputForProductsFile();
    expect(requestMock).toHaveBeenCalledTimes(4);
    expect(vac.loading).toBe(true);
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
    vac.loading = true;
    vac.outputForProductsFile();
    expect(requestMock).toHaveBeenCalledTimes(4);
    expect(vac.loading).toBe(true);
  });

  it("throws when a company list row has no company", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(null, { statusCode: 200, body: [{}] }, [{}]);
    });
    expect(function () {
      vac.outputForProductsFile();
    }).toThrow();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("throws when a company payload has no products list", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      var cb = cbFrom(arguments);
      const url = opts.url || "";
      if (url.indexOf("company") > -1) {
        cb(null, { statusCode: 200, body: { company: {} } }, { company: {} });
        return;
      }
      cb(null, { statusCode: 200, body: [{ company: { id: 8 } }] }, [{ company: { id: 8 } }]);
    });
    expect(function () {
      vac.outputForProductsFile();
    }).toThrow();
  });

  it("requests a product url after empty company lists", function () {
    requestMock.mockImplementation(function (opts = { url: "" }) {
      cbFrom(arguments)(null, { statusCode: 200, body: [] }, []);
    });
    expect(function () {
      vac.outputForProductsFile();
    }).toThrow();
    expect(requestMock).toHaveBeenCalledTimes(4);
    expect(crawlUrls()[3]).toBeUndefined();
  });
});

describe("process and env", function () {
  it("reads token fallbacks from the environment", async function () {
    const prevHook = process.env.WEBHOOK_TOKEN;
    const prevPage = process.env.FB_PAGE_TOKEN;
    try {
      delete process.env.WEBHOOK_TOKEN;
      const missing = await supertest(app).get("/webhook/").query({
        "hub.verify_token": "test-webhook-token",
        "hub.challenge": "from-fallback",
      });
      expect(missing.text).toBe("from-fallback");
      process.env.WEBHOOK_TOKEN = "custom-hook";
      const customHook = await supertest(app).get("/webhook/").query({
        "hub.verify_token": "custom-hook",
        "hub.challenge": "xyz",
      });
      expect(customHook.text).toBe("xyz");
      delete process.env.FB_PAGE_TOKEN;
      await postText("Widmer");
      expect(graphCalls()[0].qs.access_token).toBe("test-page-token");
      requestMock.mockClear();
      process.env.FB_PAGE_TOKEN = "custom-page";
      await postText("Widmer");
      expect(graphCalls()[0].qs.access_token).toBe("custom-page");
    } finally {
      if (prevHook === undefined) {
        delete process.env.WEBHOOK_TOKEN;
      } else {
        process.env.WEBHOOK_TOKEN = prevHook;
      }
      if (prevPage === undefined) {
        delete process.env.FB_PAGE_TOKEN;
      } else {
        process.env.FB_PAGE_TOKEN = prevPage;
      }
    }
  });
});

