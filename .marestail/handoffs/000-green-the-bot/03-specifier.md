# 03-specifier — 000-green-the-bot

## What I did

- Verified `features/000-green-the-bot.feature` already pins the double-send bug on `GET /webhook/` (HTTP 500 with correct token) and includes scenarios for POST with missing/empty `entry`, empty `messaging`, and missing `message.text`.
- Verified `qa/000-green-the-bot.md` uses `npx vitest run` for search-behaviour validation instead of calling unexported functions, and does not instruct the operator to inspect the console for the search term.
- No code changes were made; this is a specifier-only handoff.

## What is left

- Implementer must convert `index.js` to TypeScript or refactor in-place to satisfy `marestail gate --tier full` while keeping every route, input, and output byte-identical to what the Gherkin scenarios specify.

## What the next role must know

- The Gherkin scenarios intentionally pin the current buggy behaviour (e.g. the double-send on `GET /webhook/` returns HTTP 500, not 200 with the challenge). The implementer must preserve this behaviour unless the task explicitly says otherwise.
- `searchForMatchingProducts` is not exported from `index.js`; tests must access it through the module's exported interface or by requiring the file and reading the global.
- `slimProducts.js` data and `secretConstants.js` must not be touched.
- The webhook verification bug means Facebook's actual verification handshake will fail in production; fixing it is out of scope for this refactor task.

## Config change

None needed. Existing gate configs are sufficient.

## Audit

Not required.
