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
  var events = req.body.entry[0].messaging;
  var cursor = { i: 0 };
  for (cursor.i = 0; cursor.i < events.length; cursor.i++) {
    replyIfText({ event: events[cursor.i], cursor: cursor });
  }
  res.sendStatus(200);
});

function emptyStrings() {
  return [""].slice(0, 0);
}

function emptyProducts() {
  return [{ product_name: "", status: "", country: "" }].slice(0, 0);
}

function emptyProductGroups() {
  return [emptyProducts()].slice(0, 0);
}

function replyIfText(args = { event: { message: { text: "" }, sender: { id: "" } }, cursor: { i: 0 } }) {
  if (!hasMessageText(args.event)) {
    return;
  }
  var response = searchForMatchingProducts(cleanQuery(args.event.message.text));
  console.log(response.length);
  sendSearchResult({ event: args.event, response: response, cursor: args.cursor });
}

function hasMessageText(event = { message: { text: "" }, sender: { id: "" } }) {
  return Boolean(event.message && event.message.text);
}

function sendSearchResult(args = { event: { message: { text: "" }, sender: { id: "" } }, response: emptyStrings(), cursor: { i: 0 } }) {
  if (args.response.length > 20) {
    sendTextMessage(args.event.sender.id, weblinkMessage(args.event.message.text));
    return;
  }
  sendEachMatch(args);
}

function sendEachMatch(args = { event: { message: { text: "" }, sender: { id: "" } }, response: emptyStrings(), cursor: { i: 0 } }) {
  for (args.cursor.i = 0; args.cursor.i < args.response.length; args.cursor.i++) {
    sendTextMessage(args.event.sender.id, args.response[args.cursor.i]);
  }
}

function weblinkMessage(original = "") {
  return "I know a lot of drinks with that name so I made a weblink for you " + weblinkBase + original;
}

function cleanQuery(text = "") {
  return applySpellingFixes(stripFillers(text));
}

function stripFillers(text = "") {
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

function applySpellingFixes(text = "") {
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
  getCompanyJson([beerURL, wineURL, liquorURL]);
}

function getRequest() {
  return host.vacRequest || request;
}

function getCompanyJson(urls = emptyStrings()) {
  var url = urls.pop() || "";
  getRequest()({ url: url, json: true }, function (error = null, response = { statusCode: 0 }, body = [{ company: { id: 0 } }].slice(0, 0)) {
    onCompanyJson({ error: error, response: response, body: body, url: url, urls: urls });
  });
}

function onCompanyJson(args = { error: null, response: { statusCode: 0 }, body: [{ company: { id: 0 } }].slice(0, 0), url: "", urls: emptyStrings() }) {
  if (args.error) {
    console.log(args.error);
    return;
  }
  if (args.response.statusCode !== 200) {
    return;
  }
  collectCompanies(args);
}

function collectCompanies(args = { error: null, response: { statusCode: 0 }, body: [{ company: { id: 0 } }].slice(0, 0), url: "", urls: emptyStrings() }) {
  console.log(args.url + " loaded!");
  pushCompanyUrls(args.body);
  continueCompanies(args.urls);
}

function pushCompanyUrls(body = [{ company: { id: 0 } }].slice(0, 0)) {
  for (var i = 0; i < body.length; i++) {
    companyURLs.push("http://www.barnivore.com/company/" + body[i].company.id + ".json");
  }
}

function continueCompanies(urls = emptyStrings()) {
  if (urls.length === 0) {
    getProductJson(companyURLs);
    return;
  }
  getCompanyJson(urls);
}

function getProductJson(urls = emptyStrings()) {
  var url = urls.pop() || "";
  getRequest()({ url: url, json: true }, function (error = null, response = { statusCode: 0 }, body = { company: { products: emptyProducts() } }) {
    onProductJson({ error: error, response: response, body: body, url: url, urls: urls });
  });
}

function onProductJson(args = { error: null, response: { statusCode: 0 }, body: { company: { products: emptyProducts() } }, url: "", urls: emptyStrings() }) {
  if (args.error) {
    console.log(args.error);
    return;
  }
  if (args.response.statusCode !== 200) {
    return;
  }
  collectProducts(args);
}

function collectProducts(args = { error: null, response: { statusCode: 0 }, body: { company: { products: emptyProducts() } }, url: "", urls: emptyStrings() }) {
  console.log(args.url + " loaded!");
  products.push(mapCompanyProducts(args.body.company.products));
  continueProducts(args.urls);
}

function mapCompanyProducts(list = emptyProducts()) {
  var mapped = emptyProducts();
  for (var i = 0; i < list.length; i++) {
    mapped.push({
      product_name: list[i].product_name,
      status: list[i].status,
      country: list[i].country,
    });
  }
  return mapped;
}

function continueProducts(urls = emptyStrings()) {
  if (urls.length === 0) {
    console.log("Product load complete.");
    console.log(products);
    host.loading = false;
    return;
  }
  getProductJson(urls);
}

function searchForMatchingProducts(text = "") {
  var responseData = emptyProducts();
  for (var i = 0; i < host.loadedProducts.length; i++) {
    pushMatching({ company: host.loadedProducts[i], text: text, responseData: responseData });
  }
  return generateResponseString(filterResponseData(responseData));
}

function pushMatching(args = { company: emptyProducts(), text: "", responseData: emptyProducts() }) {
  for (var j = 0; j < args.company.length; j++) {
    if (matches(args.company[j].product_name, args.text)) {
      args.responseData.push(args.company[j]);
    }
  }
}

function generateResponseString(responseData = emptyProducts()) {
  var response = emptyStrings();
  for (var i = 0; i < responseData.length; i++) {
    response.push(formatProductLine(responseData[i]));
  }
  if (response.length === 0) {
    response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
  }
  return response;
}

function formatProductLine(item = { product_name: "", status: "", country: "" }) {
  if (item.country === "" || !item.country) {
    return item.product_name + " is " + item.status + ". ";
  }
  return item.product_name + " made in " + item.country + " is " + item.status + ". ";
}

function filterResponseData(responseData = emptyProducts()) {
  var cleanResponseData = emptyProducts();
  for (var i = 0; i < responseData.length; i++) {
    if (!isDuplicate({ clean: cleanResponseData, item: responseData[i] })) {
      cleanResponseData.push(responseData[i]);
    }
  }
  return cleanResponseData;
}

function isDuplicate(args = { clean: emptyProducts(), item: { product_name: "", status: "", country: "" } }) {
  for (var i = 0; i < args.clean.length; i++) {
    if (sameProduct({ left: args.clean[i], right: args.item })) {
      return true;
    }
  }
  return false;
}

function sameProduct(pair = { left: { product_name: "", status: "", country: "" }, right: { product_name: "", status: "", country: "" } }) {
  return pair.left.product_name === pair.right.product_name && pair.left.status === pair.right.status && pair.left.country === pair.right.country;
}

function isNameDuplicate(args = { clean: emptyProducts(), item: { product_name: "", status: "", country: "" } }) {
  for (var i = 0; i < args.clean.length; i++) {
    if (nameAndStatusMatch({ left: args.clean[i], right: args.item })) {
      return true;
    }
  }
  return false;
}

function nameAndStatusMatch(pair = { left: { product_name: "", status: "", country: "" }, right: { product_name: "", status: "", country: "" } }) {
  return pair.left.product_name === pair.right.product_name && pair.left.status === pair.right.status;
}

function matches(productName = "", searchName = "") {
  productName = productName.toLowerCase();
  searchName = searchName.toLowerCase();
  productName = productName.replace(/[.,\/#!$%\^&\*;:{}=\-_'~()]/g, "");
  productName = productName.replace(/\s/g, "");
  searchName = searchName.replace(/[.,\/#!$%\^&\*;:{}=\-_'~()]/g, "");
  searchName = searchName.replace(/\s/g, "");
  return productName.indexOf(searchName) > -1;
}

function onGraphResponse(args = { error: null, response: { body: { error: "" } } }) {
  if (args.error) {
    console.log("Error sending messages: ", args.error);
    return;
  }
  if (args.response.body.error) {
    console.log("Error: ", args.response.body.error);
  }
}

function sendTextMessage(sender = "", text = "") {
  var messageData = { text: text };
  getRequest()(
    {
      url: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: pageToken },
      method: "POST",
      json: { recipient: { id: sender }, message: messageData },
    },
    function (error = null, response = { body: { error: "" } }) {
      onGraphResponse({ error: error, response: response });
    },
  );
}

function logPort() {
  console.log("running on port", app.get("port"));
}

function startListening() {
  app.listen(app.get("port"), logPort);
}

function maybeListen(isMain = false) {
  if (isMain) {
    startListening();
  }
}

host.vacStartListening = startListening;
host.vacOutputForProductsFile = outputForProductsFile;
host.vacIsNameDuplicate = isNameDuplicate;
host.vacMaybeListen = maybeListen;
host.vacGetRequest = getRequest;
host.vacGetCompanyJson = getCompanyJson;
host.vacGetProductJson = getProductJson;
host.vacResetCrawl = resetCrawl;

maybeListen(require.main === module);

module.exports = app;
