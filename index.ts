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

app.get("/", (_req: unknown, res: unknown) => {
  (res as { send: (msg: string) => void }).send("Vegan alcohol checker is up!");
});

app.get("/webhook/", (req: { query: { hub_verify_token?: string; hub_challenge?: string } }, res: unknown) => {
  if ((req.query.hub_verify_token) === WEBHOOK_TOKEN) {
    (res as { send: (msg: string) => void }).send(req.query.hub_challenge as string);
  }
  (res as { send: (msg: string) => void }).send("Error, wrong token");
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

function productKey(product: { product_name: string; status: string; country?: string }): string {
  return product.product_name + "|" + product.status + "|" + product.country;
}

function filterResponseData(responseData: { product_name: string; status: string; country?: string }[]): { product_name: string; status: string; country?: string }[] {
  const seen = new Set<string>();
  const result: { product_name: string; status: string; country?: string }[] = [];
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

function formatProductResponse(product: { product_name: string; status: string; country?: string }): string {
  if (!product.country) {
    return product.product_name + " is " + product.status + ". ";
  }
  return product.product_name + " made in " + product.country + " is " + product.status + ". ";
}

function generateResponseArray(responseData: { product_name: string; status: string; country?: string }[]): string[] {
  const response: string[] = [];
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

function searchForMatchingProducts(text: string): string[] {
  const responseData: { product_name: string; status: string; country?: string }[] = [];
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

function sendTextMessage(sender: string, text: string): void {
  request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: { access_token: FB_PAGE_TOKEN },
    method: "POST",
    json: {
      recipient: { id: sender },
      message: { text },
    },
  }, function(_error, _response, _body) {});
}

function sendWeblinkResponse(sender: string, originalText: string): void {
  const messageResponse = "I know a lot of drinks with that name so I made a weblink for you " + URL + originalText;
  sendTextMessage(sender, messageResponse);
}

function sendMultipleResponses(sender: string, responses: string[]): void {
  let i = 0;
  while (i < responses.length) {
    sendTextMessage(sender, responses[i]);
    i++;
  }
}

function getTextFromEvent(event: { message?: { text?: string } }): string {
  if (!event.message) return "";
  return event.message.text || "";
}

function handleWebhookMessage(event: { message?: { text?: string } }, sender: string): void {
  const text = normalizeSearch(getTextFromEvent(event));
  const responses = searchForMatchingProducts(text);
  if (responses.length > 20) {
    sendWeblinkResponse(sender, getTextFromEvent(event));
    return;
  }
  sendMultipleResponses(sender, responses);
}

function extractSender(event: { sender?: { id: string } }): string | undefined {
  if (!event || !event.sender) return undefined;
  return event.sender.id;
}

function extractMessageText(event: { message?: { text?: string } }): string | undefined {
  if (!event || !event.message) return undefined;
  return event.message.text;
}

function processEvent(event: { sender?: { id: string }; message?: { text?: string } }): void {
  const sender = extractSender(event);
  if (!sender) return;
  const text = extractMessageText(event);
  if (!text) return;
  handleWebhookMessage(event, sender);
}

function extractEvents(body: { entry?: Array<{ messaging?: Array<{ sender?: { id: string }; message?: { text?: string } }> }> }): Array<{ sender?: { id: string }; message?: { text?: string } }> {
  const entry = body.entry;
  if (!entry) return [];
  const first = entry[0];
  if (!first) return [];
  return first.messaging || [];
}

app.post("/webhook/", (req: { body: { entry?: Array<{ messaging?: Array<{ sender?: { id: string }; message?: { text?: string } }> }> } }, res: { sendStatus: (code: number) => void }) => {
  const events = extractEvents(req.body);
  let i = 0;
  while (i < events.length) {
    processEvent(events[i]);
    i++;
  }
  res.sendStatus(200);
});

export { app, getTextFromEvent, handleWebhookMessage, normalizeProductText, normalizeSearch, matches, productKey, filterResponseData, formatProductResponse, generateResponseArray, searchForMatchingProducts, sendTextMessage, sendWeblinkResponse, sendMultipleResponses };
export default app;
