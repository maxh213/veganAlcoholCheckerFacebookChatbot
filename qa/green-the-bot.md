# QA Procedure: Green the Facebook Chatbot

## Assumptions
- No changes to slimProducts.js data records (only header comments are in scope)
- secretConstants.js uses environment variables with test fallbacks
- All tests mock the request module to avoid external calls

## Test Steps

1. **GET / health check**
   - Action: `curl -i http://localhost:80/`
   - Expected: Status 200, body "Vegan alcohol checker is up!"

2. **GET /webhook/ with correct token**
   - Action: `curl -i "http://localhost:80/webhook/?hub.verify_token=test-webhook-token&hub.challenge=challenge"`
   - Expected: Status 200, body "challenge"

3. **GET /webhook/ with wrong token**
   - Action: `curl -i "http://localhost:80/webhook/?hub.verify_token=wrong&hub.challenge=challenge"`
   - Expected: Status 200, body "Error, wrong token"

4. **POST /webhook/ envelope handling**
   - Action: POST Facebook messaging envelope with text "test"
   - Expected: Status 200

5. **Case-insensitive search**
   - Action: Send "IS RBÆK" via POST /webhook/
   - Expected: Response contains "Ørbæk"

6. **Punctuation and space stripping**
   - Action: Send "rbæk!" or "rb æk" via POST /webhook/
   - Expected: Response contains "Ørbæk"

7. **Duplicate suppression**
   - Action: Search for product with duplicate records in slimProducts.js
   - Expected: Each unique (name, status, country) appears once

8. **Unknown name apology**
   - Action: Send "unicorn-beer" via POST /webhook/
   - Expected: Response contains "Unfortunately I cannot find the name..."

9. **Weblink for >20 matches**
   - Action: Send "a" via POST /webhook/
   - Expected: Response contains "www.vacfb.site/a?n=" and original text

10. **Individual messages for ≤20 matches**
    - Action: Send "Ørbæk" via POST /webhook/
    - Expected: Each result as separate message with country when present

11. **Prefix stripping**
    - Action: Send "hey, is Ørbæk", "IS ØRBÆK", "are Ørbæk", "what about Ørbæk"
    - Expected: All search for "Ørbæk"

12. **Suffix stripping**
    - Action: Send "Ørbæk vegan?"
    - Expected: Searches for "Ørbæk"

13. **Typo correction**
    - Action: Send "guiness" and "absolute vodka"
    - Expected: Searches for "guinness" and "absolut vodka"

14. **Gate pass**
    - Action: Run `marestail gate --tier full`
    - Expected: Output shows "GATE PASSED"

## Notes
- Tests mock `request` module (no Facebook/Barnivore calls)
- slimProducts.js stays unchanged (only comments in scope)
- secretConstants.js test fallbacks: WEBHOOK_TOKEN="test-webhook-token", FB_PAGE_TOKEN="test-page-token"
