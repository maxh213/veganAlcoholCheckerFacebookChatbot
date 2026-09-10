## Specifier Handoff: Facebook Chatbot Gate

### What was done
- Created `features/facebook-chatbot.feature` with 18 Gherkin scenarios covering:
  - All HTTP endpoints (GET /, GET /webhook/, POST /webhook/)
  - Token verification success and failure paths
  - Search case-insensitivity and punctuation/space stripping
  - Duplicate product handling
  - Unknown name error message
  - 20+ matches returning weblink vs 20 or fewer returning individual messages
  - Text prefix stripping (hey, is / is / are / what about / vegan?)
  - Spelling corrections (guiness→guinness, absolute vodka→absolut vodka)
- Created `qa/facebook-chatbot.md` with 18 numbered steps a human can follow to verify

### What is left
- Code implementation to satisfy the specification
- Tests to mock `request` and verify index.js without network calls
- Refactor to reduce CRAP scores to 4 or below
- TypeScript type checking via allowJs/checkJs
- Dependency cycle prevention via .dependency-cruiser.cjs

### What the next role must know
- Do not change endpoint paths, input signatures, or output formats
- The gate tests must mock `request` - no actual Facebook/Barnivore calls
- slimProducts.js is the source of truth for product data; only its comments are in scope
- secretConstants.js provides token fallbacks; do not commit real tokens
- Keep node_modules/ and TLS files out of scope

## Config change
None required. Existing tooling (vitest, eslint, knip, Stryker) should work with the current configuration.
