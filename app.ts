import type { Application, Request, Response } from 'express';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
import { WEBHOOK_TOKEN, token } from './secretConstants.js';
require('./slimProducts.js'); import './tsx-cjs.d.ts'; require('./tsx-cjs.d.ts');

declare global {
  var loadedProducts: any[][];
  var WEBHOOK_TOKEN: string;
  var token: string;
}

const beerURL = "https://www.barnivore.com/beer.json";
const wineURL = "https://barnivore.com/wine.json";
const liquorURL = "https://barnivore.com/liquor.json";
const URL = 'www.vacfb.site/a?n=';
let companyURLs: string[] = [];
let products: any[][] = [];

export function createApp(): Application {
  const app = express();
  app.set('port', (process.env.PORT || 80));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.get('/', (req: Request, res: Response) => {
    res.send('Vegan alcohol checker is up!');
  });
  app.get('/webhook/', handleWebhookVerify);
  app.post('/webhook/', handleWebhookPost);
  return app;
}

export const server = createApp();

export function startServer(): void {
  server.listen(server.get('port'), () => {
    console.log('running on port', server.get('port'));
  });
}

startServer();

export function handleWebhookVerify(req: Request, res: Response): void {
  if (req.query['hub.verify_token'] === WEBHOOK_TOKEN) {
    res.send(req.query['hub.challenge']);
  }
  res.send('Error, wrong token');
}

function handleCompanyJsonResponse(urls: string[], url: string) {
  return function (error: any, response: any, body: any): void {
    if (error) {
      console.log(error);
      return;
    }
    if (response.statusCode !== 200) return;
    processCompanyResponse(urls, url, body);
  };
}

function processCompanyResponse(urls: string[], url: string, body: any): void {
  console.log(url + " loaded!");
  for (const item of body) {
      companyURLs.push('https://www.barnivore.com/company/' + item.company.id + '.json');
  }
  if (urls.length === 0) {
    getProductJson(companyURLs);
  } else {
    getCompanyJson(urls);
  }
}

export function getCompanyJson(urls: string[]): void {
  const url = urls.pop()!;
  request({ url, json: true }, handleCompanyJsonResponse(urls, url));
}

function handleProductJsonResponse(url: string, urls: string[]) {
  return function (error: any, response: any, body: any): void {
    if (error) {
      console.log(error);
      return;
    }
    if (response.statusCode !== 200) return;
    processProductResponse(url, urls, body);
  };
}

function processProductResponse(url: string, urls: string[], body: any): void {
  console.log(url + " loaded!");
  const companyProducts = extractCompanyProducts(body);
  products.push(companyProducts);
  if (urls.length === 0) {
    console.log("Product load complete.");
    console.log(products);
    (global as any).loading = false;
  } else {
    getProductJson(urls);
  }
}

function extractCompanyProducts(body: any): any[] {
  const companyProducts: any[] = [];
  for (const item of body.company.products) {
    companyProducts.push({
      product_name: item.product_name,
      status: item.status,
      country: item.country
    });
  }
  return companyProducts;
}

export function getProductJson(urls: string[]): void {
  const url = urls.pop()!;
  request({ url, json: true }, handleProductJsonResponse(url, urls));
}

export function searchForMatchingProducts(text: string): string[] {
  const responseData = collectMatchingProducts(text);
  const cleanResponseData = filterResponseData(responseData);
  return generateResponseString(cleanResponseData);
}

function collectMatchingProducts(text: string): any[] {
  const responseData: any[] = [];
  for (const productGroup of loadedProducts) {
    addProductMatch(responseData, productGroup, text);
  }
  return responseData;
}

function addProductMatch(responseData: any[], productGroup: any[], text: string): void {
  if (productGroup.length === 1) {
    addSingleProductMatch(responseData, productGroup[0], text);
  } else {
    addMultipleProductMatches(responseData, productGroup, text);
  }
}

function addSingleProductMatch(responseData: any[], product: any, text: string): void {
  if (matches(product.product_name, text)) {
    responseData.push(product);
  }
}

function addMultipleProductMatches(responseData: any[], productGroup: any[], text: string): void {
  for (const product of productGroup) {
    if (matches(product.product_name, text)) {
      responseData.push(product);
    }
  }
}

function generateResponseString(responseData: any[]): string[] {
  const response = responseData.map(item => formatProductResponse(item));
  if (response.length === 0) {
    response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
  }
  return response;
}

function formatProductResponse(item: any): string {
  if (item.country === '' || !item.country) {
    return item.product_name + " is " + item.status + ". ";
  }
  return item.product_name + " made in " + item.country + " is " + item.status + ". ";
}

function filterResponseData(responseData: any[]): any[] {
  const cleanResponseData: any[] = [];
  for (const item of responseData) {
    if (!isDuplicate(cleanResponseData, item)) {
      cleanResponseData.push(item);
    }
  }
  return cleanResponseData;
}

function isDuplicate(cleanResponseData: any[], responseData: any): boolean {
  return cleanResponseData.some(item =>
    item.product_name === responseData.product_name
    && item.status === responseData.status
    && item.country === responseData.country
  );
}

function matches(productName: string, searchName: string): boolean {
  productName = productName.toLowerCase();
  searchName = searchName.toLowerCase();
  productName = productName.replace(/[.,/#!$%^&*;:{}=\-_'~()]/g, "");
  productName = productName.replace(/\s/g, '');
  searchName = searchName.replace(/[.,/#!$%^&*;:{}=\-_'~()]/g, '');
  searchName = searchName.replace(/\s/g, '');
  return productName.includes(searchName);
}

export function stripText(text: string): string {
  text = text.replace('hey, is ', '');
  text = text.replace('Hey, is ', '');
  text = text.replace('hey is ', '');
  text = text.replace('Hey is ', '');
  text = text.replace('is ', '');
  text = text.replace('Is ', '');
  text = text.replace('IS ', '');
  text = text.replace('Are ', '');
  text = text.replace('are ', '');
  text = text.replace('ARE ', '');
  text = text.replace('what about ', '');
  text = text.replace('vegan?', '');
  text = text.replace('Vegan?', '');
  text = text.replace('guiness', 'guinness');
  text = text.replace('Guiness', 'guinness');
  text = text.replace('absolute vodka', 'absolut vodka');
  return text;
}

export function handleWebhookPost(req: Request, res: Response): void {
  const messaging_events = req.body.entry[0].messaging;
  for (let i = 0; i < messaging_events.length; i++) {
    handleMessagingEvent(req, i);
  }
  res.sendStatus(200);
}

function handleMessagingEvent(req: Request, i: number): void {
  const event = req.body.entry[0].messaging[i];
  const sender = event.sender.id;
  if (event.message?.text) {
    handleMessageText(sender, event.message.text);
  }
}

function handleMessageText(sender: string, text: string): void {
  const strippedText = stripText(text);
  const response = searchForMatchingProducts(strippedText);
  console.log(response.length);
  if (response.length > 20) {
    const messageResponse = "I know a lot of drinks with that name so I made a weblink for you " + URL + text;
    sendTextMessage(sender, messageResponse);
  } else {
    for (const item of response) {
      sendTextMessage(sender, item);
    }
  }
}

function sendTextMessage(sender: string, text: string): void {
  const messageData = { text };
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: token },
    method: 'POST',
    json: {
      recipient: { id: sender },
      message: messageData,
    }
  }, handleSendMessageResponse);
}

function handleSendMessageResponse(error: any, response: any, body: any): void {
  if (error) {
    console.log('Error sending messages: ', error);
  } else if (response.body?.error) {
    console.log('Error: ', response.body.error);
  }
}
