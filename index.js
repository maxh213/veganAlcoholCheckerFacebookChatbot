const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");

const app = express();
const api = Object.create(null);
let mounted = 0;

function asAny() {
  return arguments[0];
}

function arg0() {
  return arguments[0];
}

function textOrBlank() {
  let text = arg0(arguments[0]);
  if (typeof text === "string") {
    return text;
  }
  return "";
}

function blankProduct() {
  return { product_name: "", status: "", country: "" };
}

function asList() {
  const value = arg0(arguments[0]);
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

const repliesFor = (function () {
  function noProducts() {
    return [blankProduct()].slice(0, 0);
  }

  function fillerPhrases() {
    return ["hey, is ", "Hey, is ", "hey is ", "Hey is ", "is ", "Is ", "IS ", "Are ", "are ", "ARE ", "what about ", "vegan?", "Vegan?"];
  }

  function stripFillers() {
    let out = textOrBlank(arguments[0]);
    fillerPhrases().forEach(function () {
      out = out.replace(arguments[0], "");
    });
    return out;
  }

  function spellingFixes() {
    return [
      ["guiness", "guinness"],
      ["Guiness", "guinness"],
      ["absolute vodka", "absolut vodka"],
    ];
  }

  function applySpellingFixes() {
    let out = textOrBlank(arguments[0]);
    spellingFixes().forEach(function () {
      const pair = arguments[0];
      out = out.replace(pair[0], pair[1]);
    });
    return out;
  }

  function cleanQuery() {
    return applySpellingFixes(stripFillers(textOrBlank(arguments[0])));
  }

  function punctMarks() {
    return /[.,/#!$%^&*;:{}=\-_'~()]/g;
  }

  function stripMarks() {
    return textOrBlank(arguments[0]).replace(punctMarks(), "").replace(/\s/g, "");
  }

  function matches() {
    return stripMarks(arguments[0]).toLowerCase().includes(stripMarks(arguments[1]).toLowerCase());
  }

  function collectMatches() {
    const companies = arg0(arguments[0]);
    const text = textOrBlank(arguments[1]);
    const found = noProducts();
    companies.forEach(function () {
      arguments[0].forEach(function () {
        const item = arguments[0];
        if (matches(item.product_name, text)) {
          found.push(item);
        }
      });
    });
    return found;
  }

  function productKey() {
    const row = arg0(arguments[0]);
    return row.product_name + "\t" + row.status + "\t" + row.country;
  }

  function uniqueProducts() {
    const seen = Object.create(null);
    const clean = noProducts();
    asList(arguments[0]).forEach(function () {
      const item = arg0(arguments[0]);
      const key = productKey(item);
      if (seen[key]) {
        return;
      }
      seen[key] = 1;
      clean.push(item);
    });
    return clean;
  }

  function formatProductLine() {
    const row = arg0(arguments[0]);
    if (!row.country) {
      return row.product_name + " is " + row.status + ". ";
    }
    return row.product_name + " made in " + row.country + " is " + row.status + ". ";
  }

  function unknownDrink() {
    return "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.";
  }

  function generateResponseString() {
    const response = asList(arguments[0]).map(formatProductLine);
    if (response.length === 0) {
      response.push(unknownDrink());
    }
    return response;
  }

  return function repliesFor() {
    const query = cleanQuery(arguments[0]);
    const found = uniqueProducts(collectMatches(arguments[1], query)).slice(0, 21);
    return generateResponseString(found);
  };
})();

const refreshCatalogue = (function () {
  function httpUrl() {
    return ["http:", "", textOrBlank(arguments[0]), textOrBlank(arguments[1])].join("/");
  }

  function catalogueUrls() {
    return [httpUrl("www.barnivore.com", "beer.json"), httpUrl("barnivore.com", "wine.json"), httpUrl("barnivore.com", "liquor.json")];
  }

  function companyJsonUrl() {
    return httpUrl("www.barnivore.com", "company/" + arguments[0] + ".json");
  }

  function copyReversed() {
    return asList(arguments[0]).slice().reverse();
  }

  function mapCompanyProducts() {
    return asList(arguments[0]).map(function () {
      const item = arg0(arguments[0]);
      return { product_name: item.product_name, status: item.status, country: item.country };
    });
  }

  function loadedOk() {
    const error = arg0(arguments[0]);
    const response = arg0(arguments[1]);
    if (error) {
      console.log(error);
      return false;
    }
    return response.statusCode === 200;
  }

  function walkUrls() {
    const urls = arg0(arguments[0]);
    const each = arg0(arguments[1]);
    const whenOk = arg0(arguments[2]);
    const failed = [0];
    copyReversed(urls).forEach(function () {
      each(arguments[0], failed);
    });
    if (failed[0] === 0) {
      whenOk();
    }
  }

  function fetchJson() {
    const http = arg0(arguments[0]);
    const url = textOrBlank(arguments[1]);
    const failed = arg0(arguments[2]);
    const onBody = arg0(arguments[3]);
    if (failed[0] !== 0) {
      return;
    }
    http({ url: url, json: true }, function () {
      if (!loadedOk(arguments[0], arguments[1])) {
        failed[0] = 1;
        return;
      }
      console.log(url + " loaded!");
      onBody(arguments[2]);
    });
  }

  function pushCompanyUrls() {
    const host = arg0(arguments[0]);
    asList(arguments[1]).forEach(function () {
      const row = arg0(arguments[0]);
      const company = row?.company ?? { id: "" };
      host.companyURLs.push(companyJsonUrl(company.id));
    });
  }

  function pushCompanyProducts() {
    const host = arg0(arguments[0]);
    const body = arg0(arguments[1]);
    const company = body?.company ?? { products: [] };
    host.products.push(mapCompanyProducts(company.products));
  }

  function fetchLists() {
    const http = arg0(arguments[0]);
    const host = arg0(arguments[1]);
    walkUrls(arguments[2], function () {
      fetchJson(http, arguments[0], arguments[1], function () {
        pushCompanyUrls(host, arguments[0]);
      });
    }, function () {
      fetchProducts(http, host, host.companyURLs);
    });
  }

  function fetchProducts() {
    const http = arg0(arguments[0]);
    const host = arg0(arguments[1]);
    walkUrls(arguments[2], function () {
      fetchJson(http, arguments[0], arguments[1], function () {
        pushCompanyProducts(host, arguments[0]);
      });
    }, function () {
      console.log("Product load complete.");
      console.log(host.products);
      host.loading = false;
    });
  }

  return function refreshCatalogue() {
    const http = arg0(arguments[0]);
    const host = arg0(arguments[1]);
    host.products = [];
    host.companyURLs = [];
    fetchLists(http, host, catalogueUrls());
  };
})();

function cataloguePath() {
  return [".", "slimProducts"].join("/");
}

function secretsPath() {
  return [".", "secretConstants"].join("/");
}

function loadCatalogue() {
  require(cataloguePath());
}

function loadSecrets() {
  require(secretsPath());
  asAny(globalThis).WEBHOOK_TOKEN = webhookToken();
  asAny(globalThis).token = pageToken();
}

function envOrJoined() {
  return process.env[textOrBlank(arguments[0])] || arg0(arguments[1]).join("-");
}

function webhookToken() {
  return envOrJoined("WEBHOOK_TOKEN", ["test", "webhook", "token"]);
}

function pageToken() {
  return envOrJoined("FB_PAGE_TOKEN", ["test", "page", "token"]);
}

function listenPort() {
  return textOrBlank(process.env.PORT) || 80;
}

function jsonBodyOptions() {
  return { limit: "100kb" };
}

function formBodyOptions() {
  return { extended: false, limit: jsonBodyOptions().limit };
}

function weblinkBase() {
  return ["www.vacfb.site", "a?n="].join("/");
}

function loadedCatalogue() {
  loadCatalogue();
  return asAny(globalThis).loadedProducts;
}

function sendHealth() {
  arguments[1].send("Vegan alcohol checker is up!");
}

function verifyWebhook() {
  const req = arguments[0];
  const res = arguments[1];
  if (req.query["hub.verify_token"] === webhookToken()) {
    res.send(req.query["hub.challenge"]);
  }
  res.send("Error, wrong token");
}

function receiveWebhook() {
  arguments[0].body.entry[0].messaging.forEach(replyIfText);
  arguments[1].sendStatus(200);
}

function mountRoutes() {
  app.set("port", listenPort());
  if (mounted !== 0) {
    return app;
  }
  mounted = 1;
  loadSecrets();
  loadCatalogue();
  app.use(bodyParser.urlencoded(formBodyOptions()));
  app.use(bodyParser.json(jsonBodyOptions()));
  app.get("/", sendHealth);
  app.get("/webhook/", verifyWebhook);
  app.post("/webhook/", receiveWebhook);
  return app;
}

function hasMessageText() {
  const event = arg0(arguments[0]);
  return Boolean(event?.message?.text);
}

function replyIfText() {
  const event = arg0(arguments[0]);
  if (!hasMessageText(event)) {
    return;
  }
  const response = repliesFor(event.message.text, loadedCatalogue());
  console.log(response.length);
  sendSearchResult(event, response);
}

function weblinkMessage() {
  return "I know a lot of drinks with that name so I made a weblink for you " + weblinkBase() + textOrBlank(arguments[0]);
}

function sendSearchResult() {
  const event = arg0(arguments[0]);
  const response = arg0(arguments[1]);
  if (response.length > 20) {
    sendTextMessage(event.sender.id, weblinkMessage(event.message.text));
    return;
  }
  sendEachMatch(event, response);
}

function sendEachMatch() {
  const event = arg0(arguments[0]);
  const response = arg0(arguments[1]);
  response.forEach(function () {
    sendTextMessage(event.sender.id, arguments[0]);
  });
}

function getRequest() {
  return api.request || request;
}

function graphBodyError() {
  const response = arg0(arguments[0]);
  return Boolean(response?.body?.error);
}

function onGraphResponse() {
  const error = arg0(arguments[0]);
  const response = arg0(arguments[1]);
  if (error) {
    console.log("Error sending messages: ", error);
    return;
  }
  if (graphBodyError(response)) {
    console.log("Error: ", response.body.error);
  }
}

function sendTextMessage() {
  const sender = textOrBlank(arguments[0]);
  let text = textOrBlank(arguments[1]);
  getRequest()({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: { access_token: pageToken() },
    method: "POST",
    json: { recipient: { id: sender }, message: { text: text } },
  }, function () {
    onGraphResponse(arguments[0], arguments[1]);
  });
}

function outputForProductsFile() {
  refreshCatalogue(getRequest(), api);
}

function logPort() {
  console.log("running on port", app.get("port"));
}

function startListening() {
  mountRoutes();
  app.listen(app.get("port"), logPort);
}

function maybeListen() {
  if (arg0(arguments[0])) {
    startListening();
  }
}

function startIfMain() {
  if (arguments[0] === arguments[1]) {
    arguments[2]();
  }
}

api.app = app;
api.mountRoutes = mountRoutes;
api.startListening = startListening;
api.outputForProductsFile = outputForProductsFile;
api.maybeListen = maybeListen;
api.startIfMain = startIfMain;
api.getRequest = getRequest;
api.loadedAsMain = Object.is(require.main, module);

startIfMain(require.main, module, startListening);

module.exports = api;
