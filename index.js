const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const { WEBHOOK_TOKEN, FB_PAGE_TOKEN } = require("./secretConstants.cjs");
const { loadedProducts } = require("./slimProducts.cjs");

const URL = "www.vacfb.site/a?n=";

const app = express();

app.set("port", process.env.PORT || 80);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (_req, res) => {
  res.send("Vegan alcohol checker is up!");
});

app.get("/webhook/", (req, res) => {
  if (req.query.hub_verify_token === WEBHOOK_TOKEN) {
    res.send(req.query.hub_challenge);
  }
  res.send("Error, wrong token");
});

function normalizeProductText(text) {
  return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_'~()]/g, "").replace(/\s/g, "");
}

function matches(productName, searchName) {
  const normalizedProduct = normalizeProductText(productName);
  const normalizedSearch = normalizeProductText(searchName);
  return normalizedProduct.indexOf(normalizedSearch) > -1;
}

function normalizeSearch(text) {
  return text
    .replace("hey, is ", "")
    .replace("Hey, is ", "")
    .replace("hey is ", "")
    .replace("Hey is ", "")
    .replace("is ", "")
    .replace("Is ", "")
    .replace("IS ", "")
    .replace("Are ", "")
    .replace("are ", "")
    .replace("ARE ", "")
    .replace("what about ", "")
    .replace("vegan?", "")
    .replace("Vegan?", "")
    .replace("guiness", "guinness")
    .replace("Guiness", "guinness")
    .replace("absolute vodka", "absolut vodka");
}

function productKey(product) {
  return product.product_name + "|" + product.status + "|" + product.country;
}

function filterResponseData(responseData) {
  const seen = new Set();
  const result = [];
  let i = 0;
  while (i < responseData.length) {
    const key = productKey(responseData[i]);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(responseData[i]);
    }
    i++;
  }
  return result;
}

function formatProductResponse(product) {
  if (!product.country) {
    return product.product_name + " is " + product.status + ". ";
  }
  return product.product_name + " made in " + product.country + " is " + product.status + ". ";
}

function generateResponseArray(responseData) {
  const response = [];
  let i = 0;
  while (i < responseData.length) {
    response.push(formatProductResponse(responseData[i]));
    i++;
  }
  if (response.length === 0) {
    response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
  }
  return response;
}

function searchForMatchingProducts(text) {
  const responseData = [];
  let i = 0;
  while (i < loadedProducts.length) {
    let j = 0;
    while (j < loadedProducts[i].length) {
      if (matches(loadedProducts[i][j].product_name, text)) {
        responseData.push(loadedProducts[i][j]);
      }
      j++;
    }
    i++;
  }
  const filtered = filterResponseData(responseData);
  return generateResponseArray(filtered);
}

function sendTextMessage(sender, text) {
  request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: { access_token: FB_PAGE_TOKEN },
    method: "POST",
    json: {
      recipient: { id: sender },
      message: { text },
    },
  },
  function(_error, _response, _body) {});
}

function sendWeblinkResponse(sender, originalText) {
  const messageResponse = "I know a lot of drinks with that name so I made a weblink for you " + URL + originalText;
  sendTextMessage(sender, messageResponse);
}

function sendMultipleResponses(sender, responses) {
  let i = 0;
  while (i < responses.length) {
    sendTextMessage(sender, responses[i]);
    i++;
  }
}

function getTextFromEvent(event) {
  if (!event.message) return "";
  return event.message.text || "";
}

function handleWebhookMessage(event, sender) {
  const text = normalizeSearch(getTextFromEvent(event));
  const responses = searchForMatchingProducts(text);
  if (responses.length > 20) {
    sendWeblinkResponse(sender, getTextFromEvent(event));
    return;
  }
  sendMultipleResponses(sender, responses);
}

function extractSender(event) {
  if (!event || !event.sender) return undefined;
  return event.sender.id;
}

function extractMessageText(event) {
  if (!event || !event.message) return undefined;
  return event.message.text;
}

function processEvent(event) {
  const sender = extractSender(event);
  if (!sender) return;
  const text = extractMessageText(event);
  if (!text) return;
  handleWebhookMessage(event, sender);
}

function extractEvents(body) {
  const entry = body.entry;
  if (!entry) return [];
  const first = entry[0];
  if (!first) return [];
  return first.messaging || [];
}

app.post("/webhook/", (req, res) => {
  const events = extractEvents(req.body);
  let i = 0;
  while (i < events.length) {
    processEvent(events[i]);
    i++;
  }
  res.sendStatus(200);
});

module.exports = { app, getTextFromEvent, handleWebhookMessage, normalizeProductText, normalizeSearch, matches, productKey, filterResponseData, formatProductResponse, generateResponseArray, searchForMatchingProducts, sendTextMessage, sendWeblinkResponse, sendMultipleResponses };
module.exports.default = app;
