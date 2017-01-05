var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
require("./slimProducts");
require("./secretConstants")
var fs = require('fs')
    app = express();

app.set('port', (process.env.PORT || 80))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('Vegan alcohol checker is up!');
})

// for facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === WEBHOOK_TOKEN) {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})

var beerURL = "http://www.barnivore.com/beer.json";
var wineURL = "http://barnivore.com/wine.json";
var liquorURL = "http://barnivore.com/liquor.json";
var companyURLs = [];
var products = [];
//outputForProductsFile();

/**
	This function is used to refresh the products file
**/
function outputForProductsFile() {
	products = []
	companyURLs = [];
	getCompanyJson([beerURL, wineURL, liquorURL]);
}

function getCompanyJson(urls) {
	var url = urls.pop();
	request({
    url: url,
    json: true
	}, function (error, response, body) {
		if (error) console.log(error);
		if (!error && response.statusCode === 200) {
			console.log(url + " loaded!");
			for (var i = 0; i < body.length; i++) {
				companyURLs.push('http://www.barnivore.com/company/' + body[i].company.id + '.json');
			}
			if (urls.length === 0) {
				getProductJson(companyURLs);
			} else {
				getCompanyJson(urls);
			}
		}
	});
}

function getProductJson(urls) {
	var url = urls.pop();
	request({
    url: url,
    json: true
	}, function (error, response, body) {
		if (error) console.log(error);
		if (!error && response.statusCode === 200) {
			console.log(url + " loaded!");
			companyProducts = [];
			for (var i = 0; i < body.company.products.length; i++) {
				companyProducts.push(
					{
						"product_name":body.company.products[i].product_name,
						"status":body.company.products[i].status,
						"country":body.company.products[i].country
					}
				);
			}
			products.push(companyProducts);
			if (urls.length === 0) {
				console.log("Product load complete.");
				console.log(products); 
				loading = false;
			} else {
				getProductJson(urls);
			}
		}
	});
}
/**
	end of functions used for refreshing the data
**/

function searchForMatchingProducts(text) {
	var responseData = [];
	for (var i = 0; i < loadedProducts.length; i++) {
		if (loadedProducts[i].length === 1) {
			if (matches(loadedProducts[i][0].product_name, text)) {
				responseData.push(loadedProducts[i][0]);
			}
		} else {
			for (j = 0; j < loadedProducts[i].length; j++) {
				if (matches(loadedProducts[i][j].product_name, text)) {
					responseData.push(loadedProducts[i][j]);
				}
			}
		}
	}
	responseData = filterResponseData(responseData);
	var response = generateResponseString(responseData);
	return response;
}

function generateResponseString(responseData) {
	var response = [];
	for (var i = 0; i < responseData.length; i++) {
		if (responseData[i].country === '' || !responseData[i].country) {
			response.push(responseData[i].product_name + " is " + responseData[i].status + ". ");
		} else {
			response.push(responseData[i].product_name + " made in " + responseData[i].country + " is " + responseData[i].status + ". ");
		}
	}
	if (response.length === 0) {
		response.push("Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.");
	}
	return response;
}

function filterResponseData(responseData) {
	var cleanResponseData = [];
	for (var i = 0; i < responseData.length; i++) {
		if (!isDuplicate(cleanResponseData, responseData[i].id)) {
			cleanResponseData.push(responseData[i]);
		}
	}
	return cleanResponseData;
}

function isDuplicate(cleanResponseData, responseDataId) {
	for (var i = 0; i < cleanResponseData.length; i++) {
		if (cleanResponseData[i].id === responseDataId) return true;
	}
	return false;
}

function isNameDuplicate(cleanResponseData, responseData) {
	for (var i = 0; i < cleanResponseData.length; i++) {
		if (cleanResponseData[i].product_name === responseData.product_name
			&& cleanResponseData[i].status === responseData.status) 
			return true;
	}
	return false;
}

function matches(productName, searchName) {
	productName = productName.toLowerCase();
	searchName = searchName.toLowerCase();
	//get rid of punction and spaces
	productName = productName.replace(/[.,\/#!$%\^&\*;:{}=\-_'~()]/g,""); 
	productName = productName.replace(/\s/g, '');
	searchName = searchName.replace(/[.,\/#!$%\^&\*;:{}=\-_'~()]/g,""); 
	searchName = searchName.replace(/\s/g, '');
	return (productName.indexOf(searchName) > -1);
}

// to post data
app.post('/webhook/', function (req, res) {
	messaging_events = req.body.entry[0].messaging;
	for (i = 0; i < messaging_events.length; i++) {
		event = req.body.entry[0].messaging[i];
		sender = event.sender.id;
		if (event.message && event.message.text) {
			text = event.message.text;
			text = text.replace('hey, is ','');
			text = text.replace('Hey, is ','');
			text = text.replace('hey is ','');
			text = text.replace('Hey is ','');
			text = text.replace('is ','');
			text = text.replace('Is ','');
			text = text.replace('IS ','');
			text = text.replace('Are ','');
			text = text.replace('are ','');
			text = text.replace('ARE ','');
			text = text.replace('what about ','');
			text = text.replace('vegan?','');
			text = text.replace('Vegan?','');
			text = text.replace('guiness','guinness');
			text = text.replace('Guiness','guinness');
			text = text.replace('absolute vodka','absolut vodka');
			var response = searchForMatchingProducts(text);
			console.log(response.length)
			if (response.length > 20) {
				sendTextMessage(sender, "Sorry but I know a lot of alcohol with that in the name, could you be more specific?");
			} else {
				for (var i = 0; i < response.length; i++) sendTextMessage(sender, response[i]);
			} 
		}
	}
	res.sendStatus(200);
})

function sendTextMessage(sender, text) {
	messageData = {
		text:text
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		console.log(response);
		console.log(body);
		console.log("message sent fail " + error);
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

app.listen(app.get('port'), function(){
    console.log('running on port', app.get('port'))
});

