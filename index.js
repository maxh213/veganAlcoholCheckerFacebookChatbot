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

function emptyStrings() {
  return [];
}

function emptyProducts() {
  const out = [];
  out.push(blankProduct());
  out.pop();
  return out;
}

function emptyProductGroups() {
  const out = [];
  out.push(emptyProducts());
  out.pop();
  return out;
}

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

function blankProduct() {
  return { product_name: "", status: "", country: "" };
}

function blankEvent() {
  return { message: { text: "" }, sender: { id: "" } };
}

function eventOrBlank() {
  return arg0(arguments[0]) || blankEvent();
}

function productOrBlank() {
  return arg0(arguments[0]) || blankProduct();
}

function textOrBlank() {
  let text = arg0(arguments[0]);
  if (typeof text === "string") {
    return text;
  }
  return "";
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
  return process.env.PORT || 80;
}

function urlencodedOptions() {
  return { extended: false };
}

function jsonBodyOptions() {
  return { limit: "100kb" };
}

function formBodyOptions() {
  return { extended: urlencodedOptions().extended, limit: jsonBodyOptions().limit };
}

function weblinkBase() {
  return ["www.vacfb.site", "a?n="].join("/");
}

function httpUrl() {
  return ["http:", "", textOrBlank(arguments[0]), textOrBlank(arguments[1])].join("/");
}

function catalogueUrls() {
  return [httpUrl("www.barnivore.com", "beer.json"), httpUrl("barnivore.com", "wine.json"), httpUrl("barnivore.com", "liquor.json")];
}

function companyJsonUrl() {
  return httpUrl("www.barnivore.com", "company/" + arg0(arguments[0]) + ".json");
}

function punctMarks() {
  return /[.,/#!$%^&*;:{}=\-_'~()]/g;
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
  if (mounted !== 0) {
    return app;
  }
  mounted = 1;
  loadSecrets();
  loadCatalogue();
  app.set("port", listenPort());
  app.use(bodyParser.urlencoded(formBodyOptions()));
  app.use(bodyParser.json(jsonBodyOptions()));
  app.get("/", sendHealth);
  app.get("/webhook/", verifyWebhook);
  app.post("/webhook/", receiveWebhook);
  return app;
}

function replyIfText() {
  const event = eventOrBlank(arguments[0]);
  if (!hasMessageText(event)) {
    return;
  }
  const response = searchForMatchingProducts(cleanQuery(event.message.text));
  console.log(response.length);
  sendSearchResult(event, response);
}

function hasMessageText() {
  const event = arg0(arguments[0]);
  return Boolean(event?.message?.text);
}

function sendSearchResult() {
  const event = eventOrBlank(arguments[0]);
  const response = arg0(arguments[1]);
  if (response.length > 20) {
    sendTextMessage(event.sender.id, weblinkMessage(event.message.text));
    return;
  }
  sendEachMatch(event, response);
}

function sendEachMatch() {
  const event = eventOrBlank(arguments[0]);
  const response = arg0(arguments[1]);
  response.forEach(function () {
    sendTextMessage(event.sender.id, arguments[0]);
  });
}

function weblinkMessage() {
  return "I know a lot of drinks with that name so I made a weblink for you " + weblinkBase() + textOrBlank(arguments[0]);
}

function cleanQuery() {
  return applySpellingFixes(stripFillers(textOrBlank(arguments[0])));
}

function fillerPhrases() {
  return ["hey, is ", "Hey, is ", "hey is ", "Hey is ", "is ", "Is ", "IS ", "Are ", "are ", "ARE ", "what about ", "vegan?", "Vegan?"];
}

function stripFillers() {
  let text = textOrBlank(arguments[0]);
  fillerPhrases().forEach(function () {
    text = text.replace(arguments[0], "");
  });
  return text;
}

function spellingFixes() {
  return [
    ["guiness", "guinness"],
    ["Guiness", "guinness"],
    ["absolute vodka", "absolut vodka"],
  ];
}

function applySpellingFixes() {
  let text = textOrBlank(arguments[0]);
  spellingFixes().forEach(function () {
    const pair = arguments[0];
    text = text.replace(pair[0], pair[1]);
  });
  return text;
}

function resetCrawl() {
  api.products = emptyProductGroups();
  api.companyURLs = emptyStrings();
}

function outputForProductsFile() {
  resetCrawl();
  fetchLists(catalogueUrls());
}

function getRequest() {
  return api.request || request;
}

function copyReversed() {
  const urls = arg0(arguments[0]);
  return urls.slice().reverse();
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

function fetchLists() {
  walkUrls(arg0(arguments[0]), fetchList, function () {
    fetchProducts(api.companyURLs);
  });
}

function fetchProducts() {
  walkUrls(arg0(arguments[0]), fetchProduct, function () {
    console.log("Product load complete.");
    console.log(api.products);
    api.loading = false;
  });
}

function fetchJson() {
  const url = textOrBlank(arguments[0]);
  const failed = arg0(arguments[1]);
  const onBody = arg0(arguments[2]);
  if (failed[0] !== 0) {
    return;
  }
  getRequest()({ url: url, json: true }, function () {
    if (!loadedOk(arguments[0], arguments[1])) {
      failed[0] = 1;
      return;
    }
    console.log(url + " loaded!");
    onBody(arguments[2]);
  });
}

function fetchList() {
  fetchJson(textOrBlank(arguments[0]), arg0(arguments[1]), pushCompanyUrls);
}

function fetchProduct() {
  fetchJson(textOrBlank(arguments[0]), arg0(arguments[1]), pushCompanyProducts);
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

function pushCompanyUrls() {
  arg0(arguments[0]).forEach(function () {
    const row = arguments[0];
    api.companyURLs.push(companyJsonUrl(row.company.id));
  });
}

function pushCompanyProducts() {
  api.products.push(mapCompanyProducts(arg0(arguments[0]).company.products));
}

function mapCompanyProducts() {
  const list = arg0(arguments[0]);
  return list.map(function () {
    const item = productOrBlank(arguments[0]);
    return { product_name: item.product_name, status: item.status, country: item.country };
  });
}

function searchForMatchingProducts() {
  let text = textOrBlank(arguments[0]);
  const responseData = emptyProducts();
  loadedCatalogue().forEach(function () {
    pushMatching(arguments[0], text, responseData);
  });
  return generateResponseString(filterResponseData(responseData).slice(0, 21));
}

function pushMatching() {
  const company = arg0(arguments[0]);
  let text = textOrBlank(arguments[1]);
  const responseData = arg0(arguments[2]);
  company.forEach(function () {
    const item = productOrBlank(arguments[0]);
    if (matches(item.product_name, text)) {
      responseData.push(item);
    }
  });
}

function generateResponseString() {
  const responseData = arg0(arguments[0]);
  const response = responseData.map(formatProductLine);
  if (response.length === 0) {
    response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
  }
  return response;
}

function formatProductLine() {
  const item = productOrBlank(arguments[0]);
  if (!item.country) {
    return item.product_name + " is " + item.status + ". ";
  }
  return item.product_name + " made in " + item.country + " is " + item.status + ". ";
}

function productKey() {
  const item = productOrBlank(arguments[0]);
  return item.product_name + "\t" + item.status + "\t" + item.country;
}

function filterResponseData() {
  const responseData = arg0(arguments[0]);
  const seen = arg0({});
  const cleanResponseData = emptyProducts();
  responseData.forEach(function () {
    const item = productOrBlank(arguments[0]);
    const key = productKey(item);
    if (seen[key]) {
      return;
    }
    seen[key] = 1;
    cleanResponseData.push(item);
  });
  return cleanResponseData;
}

function isDuplicate() {
  const clean = arg0(arguments[0]);
  const item = productOrBlank(arguments[1]);
  return clean.some(function () {
    return sameProduct(arguments[0], item);
  });
}

function sameProduct() {
  const left = productOrBlank(arguments[0]);
  const right = productOrBlank(arguments[1]);
  return left.product_name === right.product_name && left.status === right.status && left.country === right.country;
}

function isNameDuplicate() {
  const clean = arg0(arguments[0]);
  const item = productOrBlank(arguments[1]);
  return clean.some(function () {
    return nameAndStatusMatch(arguments[0], item);
  });
}

function nameAndStatusMatch() {
  const left = productOrBlank(arguments[0]);
  const right = productOrBlank(arguments[1]);
  return left.product_name === right.product_name && left.status === right.status;
}

function stripMarks() {
  const name = textOrBlank(arguments[0]);
  return name.replace(punctMarks(), "").replace(/\s/g, "");
}

function matches() {
  const productName = textOrBlank(arguments[0]);
  const searchName = textOrBlank(arguments[1]);
  return stripMarks(productName).toLowerCase().includes(stripMarks(searchName).toLowerCase());
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
api.isNameDuplicate = isNameDuplicate;
api.maybeListen = maybeListen;
api.getRequest = getRequest;
api.getCompanyJson = fetchLists;
api.getProductJson = fetchProducts;
api.resetCrawl = resetCrawl;
api.hasMessageText = hasMessageText;
api.weblinkMessage = weblinkMessage;
api.cleanQuery = cleanQuery;
api.stripFillers = stripFillers;
api.applySpellingFixes = applySpellingFixes;
api.loadedOk = loadedOk;
api.stripMarks = stripMarks;
api.matches = matches;
api.formatProductLine = formatProductLine;
api.sameProduct = sameProduct;
api.nameAndStatusMatch = nameAndStatusMatch;
api.onGraphResponse = onGraphResponse;
api.generateResponseString = generateResponseString;
api.filterResponseData = filterResponseData;
api.mapCompanyProducts = mapCompanyProducts;
api.replyIfText = replyIfText;
api.sendSearchResult = sendSearchResult;
api.loadedAsMain = Object.is(require.main, module);
api.arg0 = arg0;
api.textOrBlank = textOrBlank;
api.productOrBlank = productOrBlank;
api.eventOrBlank = eventOrBlank;
api.copyReversed = copyReversed;
api.emptyStrings = emptyStrings;
api.emptyProducts = emptyProducts;
api.emptyProductGroups = emptyProductGroups;
api.isDuplicate = isDuplicate;
api.productKey = productKey;
api.webhookToken = webhookToken;
api.pageToken = pageToken;
api.listenPort = listenPort;
api.urlencodedOptions = urlencodedOptions;
api.blankProduct = blankProduct;
api.blankEvent = blankEvent;
api.catalogueUrls = catalogueUrls;
api.weblinkBase = weblinkBase;
api.punctMarks = punctMarks;
api.asAny = asAny;
api.startIfMain = startIfMain;
api.loadedCatalogue = loadedCatalogue;
api.cataloguePath = cataloguePath;
api.secretsPath = secretsPath;
api.loadCatalogue = loadCatalogue;
api.loadSecrets = loadSecrets;

startIfMain(require.main, module, startListening);

module.exports = api;
