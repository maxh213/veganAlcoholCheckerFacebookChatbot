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
  return `${product.product_name}|${product.status}|${product.country}`;
}

function filterResponseData(responseData) {
  const cleanResponseData = [];
  const result = [];
  for (let i = 0; i < responseData.length; i++) {
    const key = productKey(responseData[i]);
    if (!cleanResponseData.includes(key)) {
      cleanResponseData.push(key);
      result.push(responseData[i]);
    }
  }
  return result;
}

function formatProductResponse(product) {
  if (!product.country || product.country === "") {
    return `${product.product_name} is ${product.status}. `;
  }
  return `${product.product_name} made in ${product.country} is ${product.status}. `;
}

function generateResponseString(responseData) {
  const response = [];
  for (let i = 0; i < responseData.length; i++) {
    response.push(formatProductResponse(responseData[i]));
  }
  if (response.length === 0) {
    response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
  }
  return response;
}

function searchForMatchingProducts(text) {
  const responseData = [];
  for (let i = 0; i < loadedProducts.length; i++) {
    for (let j = 0; j < loadedProducts[i].length; j++) {
      if (matches(loadedProducts[i][j].product_name, text)) {
        responseData.push(loadedProducts[i][j]);
      }
    }
  }
  const filtered = filterResponseData(responseData);
  return generateResponseString(filtered);
}

function sendTextMessage(sender, text) {
  const messageData = { text };
  request(
    {
      url: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: FB_PAGE_TOKEN },
      method: "POST",
      json: {
        recipient: { id: sender },
        message: messageData,
      },
    },
    (_error, _response, _body) => {}
  );
}

function sendWeblinkResponse(sender, originalText) {
  const messageResponse = `I know a lot of drinks with that name so I made a weblink for you ${URL}${originalText}`;
  sendTextMessage(sender, messageResponse);
}

function sendMultipleResponses(sender, responses) {
  for (let i = 0; i < responses.length; i++) {
    sendTextMessage(sender, responses[i]);
  }
}

function handleWebhookMessage(event, sender) {
  const text = normalizeSearch(event.message.text);
  const response = searchForMatchingProducts(text);
  if (response.length > 20) {
    sendWeblinkResponse(sender, event.message.text);
  } else {
    sendMultipleResponses(sender, response);
  }
}

function extractSender(event) {
  if (!event?.sender) return undefined;
  return event.sender.id;
}

function extractMessageText(event) {
  if (!event?.message) return undefined;
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
  events.forEach(processEvent);
  res.sendStatus(200);
});

module.exports = app;
