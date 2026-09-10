# Handoff: Specifier

## What I did
- Created `features/facebook-chatbot.feature` with Gherkin scenarios for all endpoints:
  - `GET /` health check
  - `GET /webhook/` verification (valid and invalid tokens)
  - `POST /webhook/` Facebook messaging envelope handling
  - Search behavior (case-insensitive, punctuation stripping, duplicate filtering)
  - Response modes (>20 matches = weblink, ≤20 = individual messages)
  - Text normalization (prefix stripping, typo corrections)
- Created `qa/facebook-chatbot.md` with 17 numbered QA steps for UI verification
- Committed both files

## What is left
- The code refactor is untouched; `index.js` remains in CommonJS
- TypeScript gates (vitest, eslint, knip, Stryker, Sonar) have not been run yet
- A developer must now implement tests and refactor the code to pass the gates

## What the next role must know
- Feature file pins exact expected behaviors (responses, message content, search semantics)
- Do not change any endpoint paths, response strings, or search logic while refactoring
- Test suite must mock `request` and never call Facebook, Barnivore, or external APIs
- `slimProducts.js` is the in-memory catalogue; do not rewrite product records there

## Config change
none
