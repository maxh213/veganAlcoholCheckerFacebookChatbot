# Handoff: Specifier

## What I did
- Fixed `features/facebook-chatbot.feature` to make all scenarios observable via POST /webhook/
- Replaced non-observable "search receives" scenarios with concrete POST /webhook/ calls
- Used actual token values from secretConstants.js test fallbacks
- Updated `qa/facebook-chatbot.md` with exact expected response strings
- All QA steps now use curl POST commands instead of vague "send message" instructions

## What is left
- The code refactor is untouched; `index.js` remains in CommonJS
- TypeScript gates (vitest, eslint, knip, Stryker, Sonar) have not been run yet
- A developer must now implement tests and refactor the code to pass the gates

## What the next role must know
- Feature file scenarios pin exact expected response strings for each scenario
- Test suite must mock `request` and never call Facebook, Barnivore, or external APIs
- `slimProducts.js` is the in-memory catalogue; do not rewrite product records there
- The webhook verification uses WEBHOOK_TOKEN="test-webhook-token" from secretConstants.js

## Config change
none
