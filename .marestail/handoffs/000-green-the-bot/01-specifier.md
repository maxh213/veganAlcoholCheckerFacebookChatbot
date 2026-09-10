# Handoff: Specifier

## What I did
- Created `features/facebook-chatbot.feature` with Gherkin scenarios covering:
  - Health check endpoint (`GET /`)
  - Webhook verification with valid and invalid tokens (`GET /webhook/`)
  - Facebook messaging webhook acceptance (`POST /webhook/`)
  - Search behavior: case-insensitive, punctuation-stripping, duplicate filtering
  - Response modes: weblink for >20 matches, individual messages for ≤20
  - Text normalization: prefix stripping, guiness→guinness, absolute vodka→absolut vodka
  - Unknown product apology response
- Created `qa/facebook-chatbot.md` with 17 numbered QA steps for UI verification
- Committed both files

## What is left
- The code refactor is untouched; `index.js` remains in CommonJS
- The TypeScript gates (vitest, eslint, knip, Stryker, Sonar) have not been run yet
- A developer must now implement tests and refactor the code to pass the gates

## What the next role must know
- The feature file pins exact expected behaviors (responses, message content, search semantics)
- Do not change any endpoint paths, response strings, or search logic while refactoring
- The test suite must mock `request` and never call Facebook, Barnivore, or external APIs
- slimProducts.js is the in-memory catalogue; do not rewrite product records there

## Config change
none
