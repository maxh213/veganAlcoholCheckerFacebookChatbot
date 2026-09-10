import express from "express";
import bodyParser from "body-parser";
import request from "request";

import { WEBHOOK_TOKEN, FB_PAGE_TOKEN } from "./secretConstants.cjs";
import { loadedProducts } from "./slimProducts.cjs";

const URL = "www.vacfb.site/a?n=";

const app = express();

app.set("port", process.env.PORT || 80);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (_req: any, res: any) => {
  res.send("Vegan alcohol checker is up!");
});

app.get("/webhook/", (req: any, res: any) => {
  if (req.query.hub_verify_token === WEBHOOK_TOKEN) {
    res.send(req.query.hub_challenge);
  }
  res.send("Error, wrong token");
});

function normalizeProductText(text: string): string {
  return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_'~()]/g, "").replace(/\s/g, "");
}

function matches(productName: string, searchName: string): boolean {
  const normalizedProduct = normalizeProductText(productName);
  const normalizedSearch = normalizeProductText(searchName);
  return normalizedProduct.indexOf(normalizedSearch) > -1;
}

function normalizeSearch(text: string): string {
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

function productKey(product: any): string {
  return `${product.product_name}|${product.status}|${product.country}`;
}

function filterResponseData(responseData: any[]): any[] {
  const cleanResponseData = new Set<string>();
  const result: any[] = [];
  for (let i = 0; i < responseData.length; i++) {
    const key = productKey(responseData[i]);
    if (!cleanResponseData.has(key)) {
      cleanResponseData.add(key);
      result.push(responseData[i]);
    }
  }
  return result;
}

function formatProductResponse(product: any): string {
  if (!product.country || product.country === "") {
    return `${product.product_name} is ${product.status}. `;
  }
  return `${product.product_name} made in ${product.country} is ${product.status}. `;
}

function generateResponseArray(responseData: any[]): string[] {
  const response: string[] = [];
  for (let i = 0; i < responseData.length; i++) {
    response.push(formatProductResponse(responseData[i]));
  }
  if (response.length === 0) {
    response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
  }
  return response;
}

function searchForMatchingProducts(text: string): string[] {
  const responseData: any[] = [];
  for (let i = 0; i < loadedProducts.length; i++) {
    for (let j = 0; j < loadedProducts[i].length; j++) {
      if (matches(loadedProducts[i][j].product_name, text)) {
        responseData.push(loadedProducts[i][j]);
      }
    }
  }
  const filtered = filterResponseData(responseData);
  return generateResponseArray(filtered);
}

function sendTextMessage(sender: string, text: string): void {
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

function sendWeblinkResponse(sender: string, originalText: string): void {
  const messageResponse = `I know a lot of drinks with that name so I made a weblink for you ${URL}${originalText}`;
  sendTextMessage(sender, messageResponse);
}

function sendMultipleResponses(sender: string, responses: string[]): void {
  for (let i = 0; i < responses.length; i++) {
    sendTextMessage(sender, responses[i]);
  }
}

function getTextFromEvent(event: any): string {
  if (!event.message) return "";
  return event.message.text || "";
}

function handleWebhookMessage(event: any, sender: string): void {
  const text = normalizeSearch(getTextFromEvent(event));
  const responses = searchForMatchingProducts(text);
  if (responses.length > 20) {
    sendWeblinkResponse(sender, getTextFromEvent(event));
    return;
  }
  sendMultipleResponses(sender, responses);
}

function extractSender(event: any): string | undefined {
  if (!event?.sender) return undefined;
  return event.sender.id;
}

function extractMessageText(event: any): string | undefined {
  if (!event?.message) return undefined;
  return event.message.text;
}

function processEvent(event: any): void {
  const sender = extractSender(event);
  if (!sender) return;
  const text = extractMessageText(event);
  if (!text) return;
  handleWebhookMessage(event, sender);
}

function extractEvents(body: any): any[] {
  const entry = body.entry;
  if (!entry) return [];
  const first = entry[0];
  if (!first) return [];
  return first.messaging || [];
}

app.post("/webhook/", (req: any, res: any) => {
  const events = extractEvents(req.body);
  events.forEach(processEvent);
  res.sendStatus(200);
});

export { app, getTextFromEvent, handleWebhookMessage };
export default app;
