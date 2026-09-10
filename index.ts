import express from 'express';
import bodyParser from 'body-parser';
import request from 'request';
import { WEBHOOK_TOKEN, token } from './secretConstants.js';
import * as slimProducts from './slimProducts.js';
const loadedProducts: Product[][] = slimProducts.loadedProducts as Product[][];

interface Product {
  product_name: string;
  status: string;
  country?: string;
}

const app = express();
const URL_PREFIX = 'www.vacfb.site/a?n=';

app.set('port', process.env.PORT || 80);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const getProducts = () => loadedProducts as Product[][];

const routeGetRoot = (req: Record<string, unknown>, res: { send: (v: string) => void }): void => {
  res.send('Vegan alcohol checker is up!');
};

const routeGetWebhook = (req: { query: Record<string, string> }, res: { send: (v: string) => void }): void => {
  const query = req.query as Record<string, string>;
  if (query['hub.verify_token'] === WEBHOOK_TOKEN) {
    res.send(query['hub.challenge']);
    return;
  }
  res.send('Error, wrong token');
};

const getText = (text: string): string => {
  let result = text;
  result = result.replace('hey, is ', '');
  result = result.replace('Hey, is ', '');
  result = result.replace('hey is ', '');
  result = result.replace('Hey is ', '');
  result = result.replace('is ', '');
  result = result.replace('Is ', '');
  result = result.replace('IS ', '');
  result = result.replace('Are ', '');
  result = result.replace('are ', '');
  result = result.replace('ARE ', '');
  result = result.replace('what about ', '');
  result = result.replace(' vegan?', '');
  result = result.replace(' Vegan?', '');
  result = result.replace('guiness', 'guinness');
  result = result.replace('Guiness', 'guinness');
  result = result.replace('absolute vodka', 'absolut vodka');
  return result;
};

const cleanString = (str: string): string => {
  const lower = str.toLowerCase();
  const noPunct = lower.replace(/[.,\/#!$%\^&\*;:{}=\-_'~()]/g, '');
  return noPunct.replace(/\s/g, '');
};

const doStringsMatch = (p1: string, p2: string): boolean => {
  const s1 = cleanString(p1);
  const s2 = cleanString(p2);
  return s1.indexOf(s2) > -1;
};

const sameProduct = (p1: Product, p2: Product): boolean => {
  if (p1.product_name !== p2.product_name) return false;
  if (p1.status !== p2.status) return false;
  return p1.country === p2.country;
};

const isDuplicate = (cleanResponseData: Product[], product: Product): boolean => {
  return cleanResponseData.some((p) => sameProduct(p, product));
};

const filterResponseData = (responseData: Product[]): Product[] => {
  const cleanResponseData: Product[] = [];
  for (let i = 0; i < responseData.length; i++) {
    if (!isDuplicate(cleanResponseData, responseData[i])) {
      cleanResponseData.push(responseData[i]);
    }
  }
  return cleanResponseData;
};

const buildProductString = (product: Product): string => {
  if (!product.country || product.country === '') {
    return product.product_name + ' is ' + product.status + '. ';
  }
  return product.product_name + ' made in ' + product.country + ' is ' + product.status + '. ';
};

const generateResponseString = (responseData: Product[]): string[] => {
  const response: string[] = [];
  for (let i = 0; i < responseData.length; i++) {
    response.push(buildProductString(responseData[i]));
  }
  if (response.length === 0) {
    response.push('Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.');
  }
  return response;
};

const findMatches = (products: Product[], text: string): Product[] => {
  const results: Product[] = [];
  for (let j = 0; j < products.length; j++) {
    if (doStringsMatch(products[j].product_name, text)) {
      results.push(products[j]);
    }
  }
  return results;
};

const processProduct = (prod: Product[], text: string): Product[] => {
  if (prod.length === 1) {
    return doStringsMatch(prod[0].product_name, text) ? [prod[0]] : [];
  }
  return findMatches(prod, text);
};

const searchInProductsGroup = (loadedProducts: Product[][], text: string): Product[] => {
  const allMatches: Product[] = [];
  for (let i = 0; i < loadedProducts.length; i++) {
    const matches = processProduct(loadedProducts[i], text);
    allMatches.push(...matches);
  }
  return allMatches;
};

const searchForMatchingProducts = (loadedProducts: Product[][], text: string): string[] => {
  const allMatches = searchInProductsGroup(loadedProducts, text);
  const cleaned = filterResponseData(allMatches);
  return generateResponseString(cleaned);
};

const buildWeblinkResponse = (originalText: string): string => {
  return 'I know a lot of drinks with that name so I made a weblink for you ' + URL_PREFIX + originalText;
};

const logMessageError = (errorMsg: string): void => {
  console.log('Error: ', errorMsg);
};

const sendTextMessage = (sender: string, text: string): void => {
  const messageData = {
    text: text
  };
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: token },
    method: 'POST',
    json: {
      recipient: { id: sender },
      message: messageData
    }
  }, function (error: any, response: any) {
    if (response && response.body) {
      logMessageError(response.body.error);
    }
  });
};

const sendSearchResults = (text: string, sender: string, loadedProducts: Product[][]): void => {
  const response = searchForMatchingProducts(loadedProducts, text);
  if (response.length > 20) {
    const messageResponse = buildWeblinkResponse(text);
    sendTextMessage(sender, messageResponse);
    return;
  }
  for (let i = 0; i < response.length; i++) {
    sendTextMessage(sender, response[i]);
  }
};

interface Event {
  sender?: { id: string };
  message?: { text: string };
}

const hasValidEvent = (event: Event | undefined): boolean => {
  if (!event) return false;
  if (!event.sender) return false;
  if (!event.message) return false;
  return event.message.text !== undefined;
};

const handleEvent = (event: Event, loadedProducts: Product[][]): void => {
  if (!hasValidEvent(event)) {
    return;
  }
  const sender = (event.sender as { id: string }).id;
  const text = getText((event.message as { text: string }).text);
  sendSearchResults(text, sender, loadedProducts);
};

const handleMessagingEvents = (messagingEvents: Event[], loadedProducts: Product[][]): void => {
  for (let i = 0; i < messagingEvents.length; i++) {
    handleEvent(messagingEvents[i], loadedProducts);
  }
};

const routePostWebhook = (req: { body: { entry: { messaging?: unknown[] }[] } }, res: { sendStatus: (code: number) => void }): void => {
  const entry = req.body.entry;
  if (entry && entry[0] && entry[0].messaging) {
    handleMessagingEvents(entry[0].messaging as Event[], loadedProducts);
  }
  res.sendStatus(200);
};

app.get('/', routeGetRoot as (req: unknown, res: unknown) => void);
app.get('/webhook/', routeGetWebhook as (req: unknown, res: unknown) => void);
app.post('/webhook/', routePostWebhook as (req: unknown, res: unknown) => void);

interface Message {
  text: string;
}

const getSearchInput = (message: Message): string => {
  return getText(message.text);
};

export { getProducts };
export { getText as processText };
export { getSearchInput };
export { doStringsMatch as matches };
export { isDuplicate };
export { filterResponseData };
export { generateResponseString };
export { searchForMatchingProducts };
export { buildWeblinkResponse };
export { hasValidEvent };
export { handleEvent };
export { handleMessagingEvents };
export { sendTextMessage };
export { sendSearchResults };
export { routeGetRoot };
export { routeGetWebhook };
export { routePostWebhook };
export { app };
export { logMessageError };
export { isTestEnv };

const isTestEnv = () => process.env.NODE_ENV === 'test';

if (!isTestEnv()) {
  app.listen(app.get('port'), function () {
    console.log('running on port', app.get('port'));
  });
}
