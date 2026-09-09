# Bring the Facebook chatbot through the gate

Nothing about the bot's behaviour may change. Every HTTP route, its inputs, and its outputs stay exactly as they are; the Gherkin scenarios must pin them down before any code moves.

This is a refactor task, not a feature slice.

The app is CommonJS JavaScript (`index.js`). The TypeScript gates still apply: they parse `.js` through the TypeScript toolchain (`allowJs` / `checkJs`, vitest, eslint, knip, Stryker). Convert to `.ts` if that makes the gates pass more honestly; keep the runtime behaviour identical.

Make `marestail gate --tier full` pass for the JS/TS side:

- 100% line and branch coverage of `index.js`. Use vitest. Mock `request` and do not call Facebook, Barnivore, or any other network. `slimProducts.js` is the in-memory catalogue: do not rewrite product records, and do not try to cover that file.
- Every function at CRAP 4 or below.
- No comments or docstrings in application code. The three comments at the top of `slimProducts.js` count. Where a comment carries knowledge, turn it into a name, a small function, or a test.
- `tsc --noEmit -p tsconfig.app.json` and eslint are clean. Fix the code; do not widen ignores.
- Dependency direction: no import cycles. Encode any tightening in `.dependency-cruiser.cjs`.
- No unused files, exports or types (knip). Do not delete live webhook or search behaviour to satisfy deadcode.
- Every mutant in `index.js` killed (Stryker).
- Sonar: quality gate green, zero open issues, zero hotspots to review, zero duplication.

Pin at least these behaviours in Gherkin before moving code:

- `GET /` responds `Vegan alcohol checker is up!`
- `GET /webhook/` with `hub.verify_token` equal to `WEBHOOK_TOKEN` sends `hub.challenge`
- `GET /webhook/` with a wrong token does not send the challenge as the successful verification body
- `POST /webhook/` with a Facebook messaging envelope replies using the page token, always HTTP 200
- Search is case-insensitive substring after stripping punctuation and spaces
- Duplicate products (same name, status, country) appear once
- Unknown names get `Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.`
- More than 20 matches send one weblink `www.vacfb.site/a?n=` plus the original message text
- 20 or fewer matches send one Facebook message per result, including country when present
- Incoming text has `hey, is ` / `is ` / `are ` / `what about ` / `vegan?` stripped (the casings already in `index.js`)
- `guiness` is rewritten to `guinness` and `absolute vodka` to `absolut vodka` before search

`node_modules/` and the TLS key/pem files are out of scope. `slimProducts.js` stays the catalogue; only its comments are in scope. `secretConstants.js` reads `WEBHOOK_TOKEN` and `FB_PAGE_TOKEN` from the environment with test fallbacks; do not put real tokens in git.

Out of scope: Facebook app review, certificates, the privacy policy HTML, Barnivore refresh (`outputForProductsFile` / the JSON crawler), and dependency upgrades beyond what the gate tools need.
