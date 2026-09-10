var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");

var app = express();
var api = Object.create(null);
var mounted = 0;

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
  var out = [];
  out.push(blankProduct());
  out.pop();
  return out;
}

function emptyProductGroups() {
  var out = [];
  out.push(emptyProducts());
  out.pop();
  return out;
}

function cataloguePath() {
  return "./slimProducts";
}

function secretsPath() {
  return "./secretConstants";
}

function loadCatalogue() {
  require(cataloguePath());
}

function loadSecrets() {
  require(secretsPath());
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
  var text = arg0(arguments[0]);
  if (typeof text === "string") {
    return text;
  }
  return "";
}

function webhookToken() {
  return process.env.WEBHOOK_TOKEN || "test-webhook-token";
}

function pageToken() {
  return process.env.FB_PAGE_TOKEN || "test-page-token";
}

function listenPort() {
  return process.env.PORT || 80;
}

function urlencodedOptions() {
  return { extended: false };
}

function weblinkBase() {
  return "www.vacfb.site/a?n=";
}

function catalogueUrls() {
  return ["http://www.barnivore.com/beer.json", "http://barnivore.com/wine.json", "http://barnivore.com/liquor.json"];
}

function punctMarks() {
  return /[.,\/#!$%\^&\*;:{}=\-_'~()]/g;
}

function loadedCatalogue() {
  loadCatalogue();
  return asAny(globalThis).loadedProducts;
}

function mountRoutes() {
  if (mounted !== 0) {
    return app;
  }
  mounted = 1;
  loadSecrets();
  loadCatalogue();
  app.set("port", listenPort());
  app.use(bodyParser.urlencoded(urlencodedOptions()));
  app.use(bodyParser.json());
  app.get("/", function (req, res) {
    res.send("Vegan alcohol checker is up!");
  });
  app.get("/webhook/", function (req, res) {
    if (req.query["hub.verify_token"] === webhookToken()) {
      res.send(req.query["hub.challenge"]);
    }
    res.send("Error, wrong token");
  });
  app.post("/webhook/", function (req, res) {
    req.body.entry[0].messaging.forEach(replyIfText);
    res.sendStatus(200);
  });
  return app;
}

function replyIfText() {
  var event = eventOrBlank(arguments[0]);
  if (!hasMessageText(event)) {
    return;
  }
  var response = searchForMatchingProducts(cleanQuery(event.message.text));
  console.log(response.length);
  sendSearchResult(event, response);
}

function hasMessageText() {
  var event = arg0(arguments[0]);
  return Boolean(event && event.message && event.message.text);
}

function sendSearchResult() {
  var event = eventOrBlank(arguments[0]);
  var response = arg0(arguments[1]);
  if (response.length > 20) {
    sendTextMessage(event.sender.id, weblinkMessage(event.message.text));
    return;
  }
  sendEachMatch(event, response);
}

function sendEachMatch() {
  var event = eventOrBlank(arguments[0]);
  var response = arg0(arguments[1]);
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

function stripFillers() {
  var text = textOrBlank(arguments[0]);
  text = text.replace("hey, is ", "");
  text = text.replace("Hey, is ", "");
  text = text.replace("hey is ", "");
  text = text.replace("Hey is ", "");
  text = text.replace("is ", "");
  text = text.replace("Is ", "");
  text = text.replace("IS ", "");
  text = text.replace("Are ", "");
  text = text.replace("are ", "");
  text = text.replace("ARE ", "");
  text = text.replace("what about ", "");
  text = text.replace("vegan?", "");
  text = text.replace("Vegan?", "");
  return text;
}

function applySpellingFixes() {
  var text = textOrBlank(arguments[0]);
  text = text.replace("guiness", "guinness");
  text = text.replace("Guiness", "guinness");
  text = text.replace("absolute vodka", "absolut vodka");
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
  var urls = arg0(arguments[0]);
  return urls.slice().reverse();
}

function fetchLists() {
  var urls = arg0(arguments[0]);
  var failed = [0];
  copyReversed(urls).forEach(function () {
    fetchList(arguments[0], failed);
  });
  if (failed[0] === 0) {
    fetchProducts(api.companyURLs);
  }
}

function fetchList() {
  var url = textOrBlank(arguments[0]);
  var failed = arg0(arguments[1]);
  if (failed[0] !== 0) {
    return;
  }
  getRequest()({ url: url, json: true }, function () {
    onListResponse(arguments[0], arguments[1], arguments[2], url, failed);
  });
}

function loadedOk() {
  var error = arg0(arguments[0]);
  var response = arg0(arguments[1]);
  if (error) {
    console.log(error);
    return false;
  }
  return response.statusCode === 200;
}

function onListResponse() {
  var error = arg0(arguments[0]);
  var response = arg0(arguments[1]);
  var body = arg0(arguments[2]);
  var url = textOrBlank(arguments[3]);
  var failed = arg0(arguments[4]);
  if (!loadedOk(error, response)) {
    failed[0] = 1;
    return;
  }
  console.log(url + " loaded!");
  pushCompanyUrls(body);
}

function pushCompanyUrls() {
  var body = arg0(arguments[0]);
  body.forEach(function () {
    var row = arguments[0];
    api.companyURLs.push("http://www.barnivore.com/company/" + row.company.id + ".json");
  });
}

function fetchProducts() {
  var urls = arg0(arguments[0]);
  var failed = [0];
  copyReversed(urls).forEach(function () {
    fetchProduct(arguments[0], failed);
  });
  if (failed[0] === 0) {
    console.log("Product load complete.");
    console.log(api.products);
    api.loading = false;
  }
}

function fetchProduct() {
  var url = textOrBlank(arguments[0]);
  var failed = arg0(arguments[1]);
  if (failed[0] !== 0) {
    return;
  }
  getRequest()({ url: url, json: true }, function () {
    onProductResponse(arguments[0], arguments[1], arguments[2], url, failed);
  });
}

function onProductResponse() {
  var error = arg0(arguments[0]);
  var response = arg0(arguments[1]);
  var body = arg0(arguments[2]);
  var url = textOrBlank(arguments[3]);
  var failed = arg0(arguments[4]);
  if (!loadedOk(error, response)) {
    failed[0] = 1;
    return;
  }
  console.log(url + " loaded!");
  api.products.push(mapCompanyProducts(body.company.products));
}

function mapCompanyProducts() {
  var list = arg0(arguments[0]);
  return list.map(function () {
    var item = productOrBlank(arguments[0]);
    return { product_name: item.product_name, status: item.status, country: item.country };
  });
}

function searchForMatchingProducts() {
  var text = textOrBlank(arguments[0]);
  var responseData = emptyProducts();
  loadedCatalogue().forEach(function () {
    pushMatching(arguments[0], text, responseData);
  });
  return generateResponseString(filterResponseData(responseData).slice(0, 21));
}

function pushMatching() {
  var company = arg0(arguments[0]);
  var text = textOrBlank(arguments[1]);
  var responseData = arg0(arguments[2]);
  company.forEach(function () {
    var item = productOrBlank(arguments[0]);
    if (matches(item.product_name, text)) {
      responseData.push(item);
    }
  });
}

function generateResponseString() {
  var responseData = arg0(arguments[0]);
  var response = responseData.map(formatProductLine);
  if (response.length === 0) {
    response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
  }
  return response;
}

function formatProductLine() {
  var item = productOrBlank(arguments[0]);
  if (!item.country) {
    return item.product_name + " is " + item.status + ". ";
  }
  return item.product_name + " made in " + item.country + " is " + item.status + ". ";
}

function productKey() {
  var item = productOrBlank(arguments[0]);
  return item.product_name + "\t" + item.status + "\t" + item.country;
}

function filterResponseData() {
  var responseData = arg0(arguments[0]);
  var seen = arg0({});
  var cleanResponseData = emptyProducts();
  responseData.forEach(function () {
    var item = productOrBlank(arguments[0]);
    var key = productKey(item);
    if (seen[key]) {
      return;
    }
    seen[key] = 1;
    cleanResponseData.push(item);
  });
  return cleanResponseData;
}

function isDuplicate() {
  var clean = arg0(arguments[0]);
  var item = productOrBlank(arguments[1]);
  return clean.some(function () {
    return sameProduct(arguments[0], item);
  });
}

function sameProduct() {
  var left = productOrBlank(arguments[0]);
  var right = productOrBlank(arguments[1]);
  return left.product_name === right.product_name && left.status === right.status && left.country === right.country;
}

function isNameDuplicate() {
  var clean = arg0(arguments[0]);
  var item = productOrBlank(arguments[1]);
  return clean.some(function () {
    return nameAndStatusMatch(arguments[0], item);
  });
}

function nameAndStatusMatch() {
  var left = productOrBlank(arguments[0]);
  var right = productOrBlank(arguments[1]);
  return left.product_name === right.product_name && left.status === right.status;
}

function stripMarks() {
  var name = textOrBlank(arguments[0]);
  return name.replace(punctMarks(), "").replace(/\s/g, "");
}

function matches() {
  var productName = textOrBlank(arguments[0]);
  var searchName = textOrBlank(arguments[1]);
  return stripMarks(productName).toLowerCase().includes(stripMarks(searchName).toLowerCase());
}

function onGraphResponse() {
  var error = arg0(arguments[0]);
  var response = arg0(arguments[1]);
  if (error) {
    console.log("Error sending messages: ", error);
    return;
  }
  if (response.body.error) {
    console.log("Error: ", response.body.error);
  }
}

function sendTextMessage() {
  var sender = textOrBlank(arguments[0]);
  var text = textOrBlank(arguments[1]);
  getRequest()(
    {
      url: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: pageToken() },
      method: "POST",
      json: { recipient: { id: sender }, message: { text: text } },
    },
    function () {
      onGraphResponse(arguments[0], arguments[1]);
    },
  );
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
api.startIfMain = require("./startIfMain");
api.loadedCatalogue = loadedCatalogue;
api.cataloguePath = cataloguePath;
api.secretsPath = secretsPath;
api.loadCatalogue = loadCatalogue;
api.loadSecrets = loadSecrets;

require("./startIfMain")(require.main, module, startListening);

module.exports = api;
