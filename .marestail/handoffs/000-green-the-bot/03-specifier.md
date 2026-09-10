## Specifier Handoff: Facebook Chatbot Gate

### What was done
- Fixed features/facebook-chatbot.feature scenarios that incorrectly claimed "guinness" matches "Ørbæk IPA" (it does not, substring matching won't find it)
- Updated scenarios to use actual products from slimProducts.js like "Ørbæk IPA" and "Ægir"
- Added missing prefix-stripping scenarios for "Hey, is", "Hey is", "Is ", "IS ", "Are ", "ARE ", and "Vegan?"
- Made "Duplicate products appear once" scenario concrete by using "Wynkoop Rocky Mountain Oyster Stout" which has duplicates in the database

### What is left
- Code implementation to satisfy the specification (tests, refactor, TypeScript, etc.)
- Mock `request` calls in vitest tests to avoid network calls
- Reduce CRAP scores to 4 or below
- TypeScript type checking via allowJs/checkJs
- Dependency cycle prevention via .dependency-cruiser.cjs

### What the next role must know
- Do not change endpoint paths, input signatures, or output formats
- The gate tests must mock `request` - no actual Facebook/Barnivore calls
- slimProducts.js is the source of truth for product data; only its comments are in scope
- secretConstants.js provides token fallbacks; do not commit real tokens
- Keep node_modules/ and TLS files out of scope

### Config change
None required.