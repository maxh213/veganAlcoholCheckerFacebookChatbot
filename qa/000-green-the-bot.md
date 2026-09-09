# QA Procedure — 000-green-the-bot

Prerequisites: app running locally on port 3000 (or set `PORT=3000`). `FB_PAGE_TOKEN` not required (defaults to `test-page-token`). Facebook app review and real Messenger events are out of scope.

## 1. Health-check endpoint

1. Open a terminal and run: `curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/`
2. **Expected:** body is exactly `Vegan alcohol checker is up!` followed by `HTTP 200`.

## 2. Webhook verification — correct token

1. Run: `curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/webhook/?hub.verify_token=test-webhook-token&hub.challenge=abc123"`
2. **Expected:** body is exactly `abc123` followed by `HTTP 200`.

## 3. Webhook verification — wrong token

1. Run: `curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/webhook/?hub.verify_token=wrong-token&hub.challenge=abc123"`
2. **Expected:** body is exactly `Error, wrong token` followed by `HTTP 200`.

## 4. Webhook verification — missing token

1. Run: `curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/webhook/?hub.challenge=abc123"`
2. **Expected:** body is exactly `Error, wrong token` followed by `HTTP 200`.

## 5. POST /webhook/ always returns 200

1. Start a listener on a free port to catch the Facebook Graph call: `python3 -m http.server 8765 &` (or any tool that records requests).
2. Run:
   ```bash
   curl -s -X POST http://localhost:3000/webhook/ \
     -H "Content-Type: application/json" \
     -d '{"object":"page","entry":[{"messaging":[{"sender":{"id":"UID123"},"message":{"text":"is guinness vegan?"}}]}]}'
   ```
3. **Expected:** `HTTP 200` in the response, no stack trace in the app terminal.

## 6. Search — unknown product returns apology

1. From the app root, run: `node -e "require('./index.js'); require('./slimProducts.js'); console.log(require('./index.js').searchForMatchingProducts('zzzz-not-a-product'))"`  
   *(Requires the server to be running so `loadedProducts` is populated, or call the function directly after requiring slimProducts.js.)*
2. **Expected:** array with one element: `"Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."`

## 7. Search — case-insensitive

1. In node REPL with the app loaded, call `searchForMatchingProducts('GUINNESS')`.
2. **Expected:** at least one result with product_name matching "Guinness".

## 8. Search — punctuation and spaces ignored

1. Call `searchForMatchingProducts('guinness,draught')` (or `'Guinness Draught'`).
2. **Expected:** results include the Guinness Draught product.

## 9. Search — duplicates suppressed

1. Call `searchForMatchingProducts('Ørbæk Black')`.
2. **Expected:** result array contains each unique (product_name, status, country) tuple at most once.

## 10. Over-20-match weblink

1. Use a term like `"a"` or `"e"` that is known to return > 20 results from slimProducts.js.
2. Send it as a POST to /webhook/ as in step 5.
3. **Expected:** exactly one outbound POST to `graph.facebook.com`, message text starts with `I know a lot of drinks with that name so I made a weblink for you `, contains `www.vacfb.site/a?n=`, and ends with the original raw message text.

## 11. 20-or-fewer-match individual messages

1. Send a POST to /webhook/ with text `"is guinness vegan?"` (this yields ≤ 20 results).
2. **Expected:** one outbound POST per result; each call to `graph.facebook.com` has `recipient.id = "UID123"` and `message.text` equal to the corresponding search result string.

## 12. Prefix stripping

1. For each of these messages sent as POST /webhook/, verify via a mocked `sendTextMessage` or by inspecting the app console that the search term passed to `searchForMatchingProducts` has the prefix removed:

   | Raw message text | Expected search term |
   |---|---|
   | `hey, is beer vegan?` | `beer vegan?` |
   | `Hey, is wine vegan?` | `wine vegan?` |
   | `hey is cider vegan?` | `cider vegan?` |
   | `Hey is lager vegan?` | `lager vegan?` |
   | `is mead vegan?` | `mead vegan?` |
   | `Is mead vegan?` | `mead vegan?` |
   | `IS mead vegan?` | `mead vegan?` |
   | `are there vegan wines?` | `there vegan wines?` |
   | `Are there vegan wines?` | `there vegan wines?` |
   | `ARE there vegan wines?` | `there vegan wines?` |
   | `what about sake?` | `sake?` |
   | `is tequila vegan?` | `is tequila` |
   | `is tequila Vegan?` | `is tequila` |

## 13. Spell corrections

1. Send `is guiness vegan?` as POST /webhook/.
   **Expected:** search runs against a term containing `guinness`.
2. Send `is Guiness vegan?` as POST /webhook/.
   **Expected:** search runs against a term containing `guinness` (lower-cased).
3. Send `is absolute vodka vegan?` as POST /webhook/.
   **Expected:** search runs against a term containing `absolut vodka`.

## 14. Gate checks (automated — no UI)

1. Run `npx vitest run --coverage` and confirm 100% line and branch coverage on `index.js`.
2. Run `npx stryker run` and confirm every mutant in `index.js` is killed.
3. Run `npx tsc --noEmit -p tsconfig.app.json` — expect zero errors.
4. Run `npx eslint index.js` — expect zero errors.
5. Run `npx knip` — expect no unused exports, files, or types in production code.
6. Run `npx depcruise --config .dependency-cruiser.cjs index.js` — expect no circular dependencies.
7. Run `marestail gate --tier full` — expect `GATE PASSED`.
