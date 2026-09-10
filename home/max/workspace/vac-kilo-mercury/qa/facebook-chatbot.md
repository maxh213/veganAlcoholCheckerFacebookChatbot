# QA Procedure: Facebook Chatbot

1. **Health check endpoint**
   - Open browser and navigate to `http://localhost:80/`
   - Expected: Page displays "Vegan alcohol checker is up!"

2. **Webhook verification with valid token**
   - Open browser and navigate to `http://localhost:80/webhook/?hub.verify_token=test-webhook-token&hub.challenge=hello`
   - Expected: Page displays "hello"

3. **Webhook verification with invalid token**
   - Open browser and navigate to `http://localhost:80/webhook/?hub.verify_token=wrong-token&hub.challenge=hello`
   - Expected: Page displays "Error, wrong token"

4. **Facebook messaging webhook**
   - Send a POST request to `http://localhost:80/webhook/` with a valid Facebook messaging envelope (mock with curl or Postman)
   - Expected: Response status code is 200

5. **Search case-insensitivity**
   - Send "VODKA" as a Facebook message to the bot
   - Expected: Results include "Absolut Vodka", "Deep Eddy Vodka", etc.

6. **Search with punctuation**
   - Send "deep-eddy" as a Facebook message
   - Expected: Results include "Deep Eddy Vodka"

7. **Duplicate product handling**
   - Check the product catalogue for any duplicate entries (same name, status, country)
   - Search for one of those products
   - Expected: Only one result returned per duplicate product

8. **Unknown product search**
   - Send "xyzzy non-existent drink" as a Facebook message
   - Expected: Response is "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

9. **Many results (over 20)**
   - Send a single letter "a" as a Facebook message
   - Expected: Response is a weblink "www.vacfb.site/a?n=" followed by the original message text

10. **Few results (20 or fewer)**
    - Send "absolut vodka" as a Facebook message
    - Expected: One message per result, with country included (e.g., "Absolut Vodka made in Sweden is Vegan Friendly.")

11. **Prefix stripping: "hey, is"**
    - Send "hey, is Absolut Vodka" as a Facebook message
    - Expected: Search behaves as if you sent "Absolut Vodka"

12. **Prefix stripping: "is"**
    - Send "is Absolut Vodka" as a Facebook message
    - Expected: Search behaves as if you sent "Absolut Vodka"

13. **Prefix stripping: "are"**
    - Send "are Absolut Vodka" as a Facebook message
    - Expected: Search behaves as if you sent "Absolut Vodka"

14. **Prefix stripping: "what about"**
    - Send "what about Absolut Vodka" as a Facebook message
    - Expected: Search behaves as if you sent "Absolut Vodka"

15. **Prefix stripping: "vegan?"**
    - Send "Absolut Vodka vegan?" as a Facebook message
    - Expected: Search behaves as if you sent "Absolut Vodka"

16. **Name correction: guiness**
    - Send "guiness" as a Facebook message
    - Expected: Search behaves as if you sent "guinness"

17. **Name correction: absolute vodka**
    - Send "absolute vodka" as a Facebook message
    - Expected: Search behaves as if you sent "absolut vodka"
