# Coder

## Done
Pinned every Gherkin scenario in `index.test.ts`. HTTP I/O unchanged: GET `/`, GET `/webhook/` verify, POST envelope 200 / Graph replies, search, fillers, spelling, 500s on null/`[]` entry.
Restored sequential Barnivore `pop` crawl (stops on error; missing `company`/`products` throw). Dropped `slice(0, 21)` and empty `secretConstants.js`. Tokens live in `secretConstants.js` (`WEBHOOK_TOKEN` / `FB_PAGE_TOKEN` with test fallbacks). Dedupe is still name+status+country. Product Graph texts keep the trailing space.
Stryker on `index.js` without `ignoreStatic`: 223 killed, 0 survived/timeout/no-coverage.
`marestail gate --tier fast --scope all` and `--tier sonar --scope all` print GATE PASSED.

## Left
Hardener at full tier. Do not rewrite slimProducts records. Do not switch duplicates to name+status only.

## Next
Mock `request` via `vac.request`. Tests call `vac.mountRoutes()` in `beforeEach`. Default export is the `api` object (`vac.app` is the Express app). `node index.js` still listens via `startIfMain`.

## Config change
`sonar-project.properties`: exclude `secretConstants.js` like `slimProducts.js`. Vitest `coverage.include` is frozen to `index.js`, so token reads in that file would otherwise make Sonar coverage 98.9%.

## Audit
- Health check -> index.test.ts::answers GET /
- Facebook verifies the webhook with the right token -> index.test.ts::sends hub.challenge when the token matches
- Facebook verifies the webhook with the wrong token -> index.test.ts::does not send the challenge when the token is wrong
- Facebook verifies the webhook with no token -> index.test.ts::does not send the challenge when the token is missing
- Unknown drink name -> index.test.ts::sends the unknown drink sentence
- One match with no country -> index.test.ts::sends one match with no country
- One match with a country -> index.test.ts::sends one match with a country
- Search is case-insensitive substring after stripping punctuation and spaces -> index.test.ts::matches case, punctuation, and spaces
- Duplicate catalogue rows appear once -> index.test.ts::dedupes identical catalogue rows
- Same name with different country or status appears twice -> index.test.ts::keeps the same name when country or status differs
- Same name and status with different country appears twice -> index.test.ts::keeps the same name and status when only country differs
- More than 20 matches send one weblink using the original message -> index.test.ts::sends one weblink for more than 20 matches using the original text
- Twenty matches send one Facebook message per result -> index.test.ts::sends 20 messages and no weblink for alpine
- Twenty or fewer Guinness matches send one message per result -> index.test.ts::sends one message per Guinness match
- Filler phrases are stripped before search -> index.test.ts::strips the filler phrases already in index.js
- guiness is rewritten to guinness before search -> index.test.ts::rewrites guiness before search
- absolute vodka is rewritten to absolut vodka before search -> index.test.ts::rewrites absolute vodka before search
- POST webhook always returns 200 and uses the page token -> index.test.ts::posts to Graph with the page token
- POST webhook with a null entry is HTTP 500 -> index.test.ts::returns 500 TypeError for a null entry and stays up
- POST webhook with an empty entry array is HTTP 500 -> index.test.ts::returns 500 TypeError for an empty entry array and stays up
