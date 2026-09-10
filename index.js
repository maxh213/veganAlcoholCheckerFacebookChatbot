const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");

const app = express();
const api = Object.create(null);
var i = 0;

function cataloguePath() {
  return "./slimProducts";
}

function secretsPath() {
  return "./secretConstants";
}

function loadCatalogue() {
  require(cataloguePath());
}

function secrets() {
  return require(secretsPath());
}

function webhookToken() {
  return secrets().readWebhookToken();
}

function pageToken() {
  return secrets().readPageToken();
}

function catalogueGlobal() {
  return "loadedProducts";
}

function loadedCatalogue() {
  loadCatalogue();
  return Object(globalThis)[catalogueGlobal()];
}

function httpUrl() {
  return ["http:", "", arguments[0], arguments[1]].join("/");
}

function catalogueUrls() {
  return [httpUrl("www.barnivore.com", "beer.json"), httpUrl("barnivore.com", "wine.json"), httpUrl("barnivore.com", "liquor.json")];
}

function companyJsonUrl() {
  return httpUrl("www.barnivore.com", "company/" + arguments[0] + ".json");
}

function urlencodedOptions() {
  return { extended: false };
}

function healthPath() {
  return String.fromCodePoint(47);
}

function webhookPath() {
  return healthPath() + "webhook" + healthPath();
}

function weblinkBase() {
  return "www.vacfb.site/a?n=";
}

function punctMarks() {
  return /[.,/#!$%^&*;:{}=\-_'~()]/g;
}

function fillerPhrases() {
  return ["hey, is ", "Hey, is ", "hey is ", "Hey is ", "is ", "Is ", "IS ", "Are ", "are ", "ARE ", "what about ", "vegan?", "Vegan?"];
}

function spellingFixes() {
  return [
    ["guiness", "guinness"],
    ["Guiness", "guinness"],
    ["absolute vodka", "absolut vodka"],
  ];
}

function unknownDrink() {
  return "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.";
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
  const messaging = arguments[0].body.entry[0].messaging;
  for (i = 0; i < messaging.length; i++) {
    replyToEvent(messaging[i]);
  }
  arguments[1].sendStatus(200);
}

function mountRoutes() {
  app.set("port", process.env.PORT || 80);
  const form = urlencodedOptions();
  const health = healthPath();
  const hook = webhookPath();
  loadCatalogue();
  app.use(bodyParser.urlencoded(form));
  app.use(bodyParser.json());
  app.get(health, sendHealth);
  app.get(hook, verifyWebhook);
  app.post(hook, receiveWebhook);
  return app;
}

function onFetched() {
  const error = arguments[0];
  const response = arguments[1];
  const body = arguments[2];
  const url = arguments[3];
  const onBody = arguments[4];
  if (error) {
    console.log(error);
    return;
  }
  if (response.statusCode !== 200) {
    return;
  }
  console.log(url + " loaded!");
  onBody(body);
}

function fetchJson() {
  const url = arguments[0];
  const onBody = arguments[1];
  api.request({ url: url, json: true }, function () {
    onFetched(arguments[0], arguments[1], arguments[2], url, onBody);
  });
}

function pushCompanyRow() {
  const row = arguments[0];
  api.companyURLs.push(companyJsonUrl(row.company.id));
}

function pushCompanyRows() {
  arguments[0].forEach(pushCompanyRow);
}

function fetchLists() {
  const urls = catalogueUrls();
  fetchJson(urls.pop(), function () {
    pushCompanyRows(arguments[0]);
    fetchJson(urls.pop(), function () {
      pushCompanyRows(arguments[0]);
      fetchJson(urls.pop(), function () {
        pushCompanyRows(arguments[0]);
        getProductJson(api.companyURLs);
      });
    });
  });
}

function mapCompanyProducts() {
  return arguments[0].map(function () {
    const item = arguments[0];
    return { product_name: item.product_name, status: item.status, country: item.country };
  });
}

function finishProducts() {
  console.log("Product load complete.");
  console.log(api.products);
  api.loading = false;
}

function nextProduct() {
  const urls = arguments[0];
  if (urls.length === 0) {
    finishProducts();
    return;
  }
  getProductJson(urls);
}

function takeProductBody() {
  const body = arguments[0];
  api.products.push(mapCompanyProducts(body.company.products));
  nextProduct(arguments[1]);
}

function getProductJson() {
  const urls = arguments[0];
  const url = urls.pop();
  fetchJson(url, function () {
    takeProductBody(arguments[0], urls);
  });
}

function outputForProductsFile() {
  api.products = [];
  api.companyURLs = [];
  fetchLists();
}

function stripFillers() {
  let out = arguments[0];
  fillerPhrases().forEach(function () {
    out = out.replace(arguments[0], "");
  });
  return out;
}

function applySpellingFixes() {
  let out = arguments[0];
  spellingFixes().forEach(function () {
    const pair = arguments[0];
    out = out.replace(pair[0], pair[1]);
  });
  return out;
}

function cleanQuery() {
  return applySpellingFixes(stripFillers(arguments[0]));
}

function stripMarks() {
  return arguments[0].replace(punctMarks(), "").replace(/\s/g, "");
}

function matches() {
  return stripMarks(arguments[0]).toLowerCase().includes(stripMarks(arguments[1]).toLowerCase());
}

function collectMatches() {
  const companies = arguments[0];
  const text = arguments[1];
  const found = companies.slice(0, 0);
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

function sameProduct() {
  const left = arguments[0];
  const right = arguments[1];
  if (left.product_name !== right.product_name) {
    return false;
  }
  if (left.status !== right.status) {
    return false;
  }
  return left.country === right.country;
}

function isDuplicate() {
  const item = arguments[1];
  return arguments[0].some(function () {
    return sameProduct(arguments[0], item);
  });
}

function uniqueProducts() {
  const rows = arguments[0];
  const clean = rows.slice(0, 0);
  rows.forEach(function () {
    const item = arguments[0];
    if (isDuplicate(clean, item)) {
      return;
    }
    clean.push(item);
  });
  return clean;
}

function formatProductLine() {
  const row = arguments[0];
  if (!row.country) {
    return row.product_name + " is " + row.status + ". ";
  }
  return row.product_name + " made in " + row.country + " is " + row.status + ". ";
}

function generateResponseString() {
  const response = arguments[0].map(formatProductLine);
  if (response.length === 0) {
    response.push(unknownDrink());
  }
  return response;
}

function repliesFor() {
  const query = cleanQuery(arguments[0]);
  const found = uniqueProducts(collectMatches(arguments[1], query));
  return generateResponseString(found);
}

function weblinkMessage() {
  return "I know a lot of drinks with that name so I made a weblink for you " + weblinkBase() + arguments[0];
}

function sendEachMatch() {
  const sender = arguments[0];
  const lines = arguments[1];
  for (i = 0; i < lines.length; i++) {
    sendTextMessage(sender, lines[i]);
  }
}

function sendSearchResult() {
  const sender = arguments[0];
  const event = arguments[1];
  const response = repliesFor(event.message.text, loadedCatalogue());
  console.log(response.length);
  if (response.length > 20) {
    sendTextMessage(sender, weblinkMessage(event.message.text));
    return;
  }
  sendEachMatch(sender, response);
}

function replyToEvent() {
  const event = arguments[0];
  const sender = event.sender.id;
  if (event.message && event.message.text) {
    sendSearchResult(sender, event);
  }
}

function onGraphResponse() {
  const error = arguments[0];
  const response = arguments[1];
  if (error) {
    console.log("Error sending messages: ", error);
    return;
  }
  if (response.body.error) {
    console.log("Error: ", response.body.error);
  }
}

function sendTextMessage() {
  const sender = arguments[0];
  const text = arguments[1];
  api.request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: { access_token: pageToken() },
    method: "POST",
    json: { recipient: { id: sender }, message: { text: text } },
  }, function () {
    onGraphResponse(arguments[0], arguments[1]);
  });
}

function logPort() {
  console.log("running on port", app.get("port"));
}

function startListening() {
  mountRoutes();
  app.listen(app.get("port"), logPort);
}

function startIfMain() {
  if (arguments[0] === arguments[1]) {
    arguments[2]();
  }
}

api.app = app;
api.request = request;
api.mountRoutes = mountRoutes;
api.startListening = startListening;
api.outputForProductsFile = outputForProductsFile;
api.startIfMain = startIfMain;

startIfMain(require.main, module, startListening);

module.exports = api;
