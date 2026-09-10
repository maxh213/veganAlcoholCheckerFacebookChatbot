# QA: green-the-bot

Start with `PORT=3000 WEBHOOK_TOKEN=test-webhook-token FB_PAGE_TOKEN=test-page-token node index.js`.
Open GET URLs in a browser. For chat, POST JSON to `http://localhost:3000/webhook/` with header `Content-Type: application/json` (curl, a REST client, or the Facebook page). Envelope:

`{"entry":[{"messaging":[{"sender":{"id":"111"},"message":{"text":"REPLACE"}}]}]}`

Every chat POST must return HTTP 200. Replies are outbound POST `https://graph.facebook.com/v2.6/me/messages?access_token=test-page-token` with `recipient.id` `111`. Intercept `request` or the Graph call; do not need Facebook to answer. Product replies end with a period and a space.

1. Browser `http://localhost:3000/`  
   Expected: `Vegan alcohol checker is up!`

2. Browser `http://localhost:3000/webhook/?hub.verify_token=test-webhook-token&hub.challenge=abc123`  
   Expected: `abc123`

3. Browser `http://localhost:3000/webhook/?hub.verify_token=wrong&hub.challenge=abc123`  
   Expected: `Error, wrong token` and not `abc123`

4. POST text `Widmer`  
   Expected: one Graph text `Widmer is Vegan Friendly. `

5. POST text `Wickwar Beer`  
   Expected: one Graph text `Wickwar Beer made in England is Not Vegan Friendly. `

6. POST text `WIDMER`, then `wid mer`, then `Guinness (brewed in Australia)`, then `WickwarBeer`  
   Expected: `Widmer is Vegan Friendly. `; same again; `Guinness (brewed in Australia) is Vegan Friendly. `; `Wickwar Beer made in England is Not Vegan Friendly. `

7. POST text `xyzzynotadrink`  
   Expected: `Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.`

8. POST text `Wynkoop Rocky Mountain Oyster Stout`  
   Expected: exactly one Graph text `Wynkoop Rocky Mountain Oyster Stout made in USA is Not Vegan Friendly. `

9. POST text `Carling Black Label`  
   Expected: two Graph texts: `Carling Black Label made in South Africa is Vegan Friendly. ` and `Carling Black Label made in England is Not Vegan Friendly. `

10. POST text `hey, is arrington vegan?`  
    Expected: one Graph text `I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=hey, is arrington vegan?`

11. POST text `alpine`  
    Expected: exactly 20 Graph texts, none containing `www.vacfb.site/a?n=`

12. POST text `guinness`  
    Expected: 9 Graph texts, first `Guinness is Not Vegan Friendly. `, including `Guinness (brewed in Australia) is Vegan Friendly. `, last `Guinness The 1759 is Not Vegan Friendly. `

13. POST each of: `hey, is Widmer vegan?`, `Hey, is Widmer vegan?`, `hey is Widmer vegan?`, `Hey is Widmer vegan?`, `is Widmer vegan?`, `Is Widmer vegan?`, `IS Widmer vegan?`, `Are Widmer vegan?`, `are Widmer vegan?`, `ARE Widmer vegan?`, `what about Widmer vegan?`, `Widmer vegan?`, `Widmer Vegan?`  
    Expected: each sends one Graph text `Widmer is Vegan Friendly. `

14. POST text `guiness`, then `Guiness`  
    Expected: each sends the same 9 Guinness Graph texts as step 12, not the unknown-drink sentence

15. POST text `absolute vodka`  
    Expected: `Absolut Vodka made in Sweden is Vegan Friendly. `

16. POST `{"entry":[{"messaging":[{"sender":{"id":"111"},"delivery":{"mids":["m1"]}}]}]}`  
    Expected: HTTP 200 and no Graph message

17. With Graph returning an error, POST text `Widmer` again  
    Expected: HTTP 200 still
