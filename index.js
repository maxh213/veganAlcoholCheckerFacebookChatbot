var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");
var host = Function("return this")();
var catalogueFile = "./slimProducts";
var secretsFile = "./secretConstants";
require(catalogueFile);
require(secretsFile);

var app = express();
var weblinkBase = "www.vacfb.site/a?n=";
var beerURL = "http://www.barnivore.com/beer.json";
var wineURL = "http://barnivore.com/wine.json";
var liquorURL = "http://barnivore.com/liquor.json";
var companyURLs = emptyStrings();
var products = emptyProductGroups();
var webhookToken = process.env.WEBHOOK_TOKEN || "test-webhook-token";
var pageToken = process.env.FB_PAGE_TOKEN || "test-page-token";
var punctMarks = /[.,\/#!$%\^&\*;:{}=\-_'~()]/g;
var blankProduct = { product_name: "", status: "", country: "" };
var blankEvent = { message: { text: "" }, sender: { id: "" } };

app.set("port", process.env.PORT || 80);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.get("/", function (req, res) {
  res.send("Vegan alcohol checker is up!");
});
app.get("/webhook/", function (req, res) {
  if (req.query["hub.verify_token"] === webhookToken) {
    res.send(req.query["hub.challenge"]);
  }
  res.send("Error, wrong token");
});
app.post("/webhook/", function (req, res) {
  req.body.entry[0].messaging.forEach(replyIfText);
  res.sendStatus(200);
});

function arg0() {
  return arguments[0];
}

function emptyStrings() {
  return Object.keys({}).map(String);
}

function emptyProducts() {
  var out = [];
  out.push(blankProduct);
  out.pop();
  return out;
}

function emptyProductGroups() {
  var out = [];
  out.push(emptyProducts());
  out.pop();
  return out;
}

function eventOrBlank() {
  return arg0(arguments[0]) || blankEvent;
}

function productOrBlank() {
  return arg0(arguments[0]) || blankProduct;
}

function textOrBlank() {
  var text = arg0(arguments[0]);
  if (typeof text === "string") {
    return text;
  }
  return "";
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
  return "I know a lot of drinks with that name so I made a weblink for you " + weblinkBase + textOrBlank(arguments[0]);
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
  products = emptyProductGroups();
  companyURLs = emptyStrings();
}

function outputForProductsFile() {
  resetCrawl();
  fetchLists([beerURL, wineURL, liquorURL]);
}

function getRequest() {
  return host.vacRequest || request;
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
    fetchProducts(companyURLs);
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
    companyURLs.push("http://www.barnivore.com/company/" + row.company.id + ".json");
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
    console.log(products);
    host.loading = false;
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
  products.push(mapCompanyProducts(body.company.products));
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
  host.loadedProducts.forEach(function () {
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
  return name.replace(punctMarks, "").replace(/\s/g, "");
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
      qs: { access_token: pageToken },
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
  app.listen(app.get("port"), logPort);
}

function maybeListen() {
  if (arg0(arguments[0])) {
    startListening();
  }
}

host.vacStartListening = startListening;
host.vacOutputForProductsFile = outputForProductsFile;
host.vacIsNameDuplicate = isNameDuplicate;
host.vacMaybeListen = maybeListen;
host.vacGetRequest = getRequest;
host.vacGetCompanyJson = fetchLists;
host.vacGetProductJson = fetchProducts;
host.vacResetCrawl = resetCrawl;
host.vacHasMessageText = hasMessageText;
host.vacWeblinkMessage = weblinkMessage;
host.vacCleanQuery = cleanQuery;
host.vacStripFillers = stripFillers;
host.vacApplySpellingFixes = applySpellingFixes;
host.vacLoadedOk = loadedOk;
host.vacStripMarks = stripMarks;
host.vacMatches = matches;
host.vacFormatProductLine = formatProductLine;
host.vacSameProduct = sameProduct;
host.vacNameAndStatusMatch = nameAndStatusMatch;
host.vacOnGraphResponse = onGraphResponse;
host.vacGenerateResponseString = generateResponseString;
host.vacFilterResponseData = filterResponseData;
host.vacMapCompanyProducts = mapCompanyProducts;
host.vacReplyIfText = replyIfText;
host.vacSendSearchResult = sendSearchResult;
host.vacLoadedAsMain = require.main === module;
host.vacArg0 = arg0;
host.vacTextOrBlank = textOrBlank;
host.vacProductOrBlank = productOrBlank;
host.vacEventOrBlank = eventOrBlank;
host.vacCopyReversed = copyReversed;
host.vacEmptyStrings = emptyStrings;
host.vacEmptyProducts = emptyProducts;
host.vacEmptyProductGroups = emptyProductGroups;
host.vacIsDuplicate = isDuplicate;
host.vacProductKey = productKey;

maybeListen(require.main === module);

module.exports = app;
