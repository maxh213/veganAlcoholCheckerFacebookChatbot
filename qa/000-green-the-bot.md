# QA Procedure — 000-green-the-bot

Prerequisites: app running locally on port 3000 (or set `PORT=3000`). `FB_PAGE_TOKEN` defaults to `test-page-token`. A tool to inspect outbound HTTP requests (e.g. `python3 -m http.server 8765` pointed at the FB graph URL via a proxy, or a mock server) is needed for steps that assert on outbound messages.

## 1. Health-check endpoint

1. Run: `curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/`
2. **Expected:** body is exactly `Vegan alcohol checker is up!` followed by `HTTP 200`.

## 2. Webhook verification — correct token (current buggy behaviour)

1. Run: `curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/webhook/?hub.verify_token=test-webhook-token&hub.challenge=abc123"`
2. **Expected:** `HTTP 500` (Express throws "Can't set headers after they are sent" due to the double-send bug).

## 3. Webhook verification — wrong token

1. Run: `curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/webhook/?hub.verify_token=wrong-token&hub.challenge=abc123"`
2. **Expected:** body is exactly `Error, wrong token` followed by `HTTP 200`.

## 4. Webhook verification — missing token

1. Run: `curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/webhook/?hub.challenge=abc123"`
2. **Expected:** body is exactly `Error, wrong token` followed by `HTTP 200`.

## 5. Webhook verification — missing challenge

1. Run: `curl -s -w "\nHTTP %{http_code}\n" "http://localhost:3000/webhook/?hub.verify_token=wrong-token"`
2. **Expected:** body is exactly `Error, wrong token` followed by `HTTP 200`.

## 6. POST /webhook/ — missing entry crashes with 500

1. Run:
   ```bash
   curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/webhook/ \
     -H "Content-Type: application/json" \
     -d '{"object":"page","entry":null}'
   ```
2. **Expected:** `HTTP 500` with the Node process exiting (uncaught TypeError from `req.body.entry[0]` crashes the process).

## 7. POST /webhook/ — empty entry array crashes with 500

1. Run:
   ```bash
   curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/webhook/ \
     -H "Content-Type: application/json" \
     -d '{"object":"page","entry":[]}'
   ```
2. **Expected:** `HTTP 500`.

## 8. POST /webhook/ — normal event returns 200

1. Run:
   ```bash
   curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/webhook/ \
     -H "Content-Type: application/json" \
     -d '{"object":"page","entry":[{"messaging":[{"sender":{"id":"UID123"},"message":{"text":"is guinness vegan?"}}]}]}'
   ```
2. **Expected:** `HTTP 200`. One outbound POST to `graph.facebook.com` with `message.text` containing a Guinness result.

## 9. Search behaviour (automated)

1. Run `npx vitest run`.
2. **Expected:** all tests pass, covering:
   - Unknown product returns the apology string
   - Search is case-insensitive
   - Punctuation and spaces are stripped
   - Duplicates (same name, status, country) appear once
   - More than 20 matches sends one weblink message
   - 20 or fewer matches sends one message per result
   - Prefix stripping: `hey, is `, `Hey, is `, `hey is `, `Hey is `, `is `, `Is `, `IS `, `are `, `Are `, `ARE `, `what about `, `vegan?`, `Vegan?`
   - Spell corrections: `guiness` -> `guinness`, `Guiness` -> `guinness`, `absolute vodka` -> `absolut vodka`

## 10. Gate checks (automated)

1. Run `npx vitest run --coverage` and confirm 100% line and branch coverage on `index.js`.
2. Run `npx stryker run` and confirm every mutant in `index.js` is killed.
3. Run `npx tsc --noEmit -p tsconfig.app.json` — expect zero errors.
4. Run `npx eslint index.js` — expect zero errors.
5. Run `npx knip` — expect no unused exports, files, or types in production code.
6. Run `npx depcruise --config .dependency-cruiser.cjs index.js` — expect no circular dependencies.
7. Run `marestail gate --tier full` — expect `GATE PASSED`.
