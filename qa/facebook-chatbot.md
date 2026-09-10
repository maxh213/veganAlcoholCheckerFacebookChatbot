# QA Procedure for Facebook Chatbot

## Setup
1. Set environment variables: WEBHOOK_TOKEN=test-webhook-token, FB_PAGE_TOKEN=test-page-token
2. Start the server: npm start

## Tests

1. **Root endpoint**
   - Action: GET /
   - Expected: Response body is "Vegan alcohol checker is up!"

2. **Webhook verification with valid token**
   - Action: GET /webhook/?hub.verify_token=test-webhook-token&hub.challenge=challenge-123
   - Expected: Response body is "challenge-123"

3. **Webhook verification with invalid token**
   - Action: GET /webhook/?hub.verify_token=wrong-token&hub.challenge=challenge-123
   - Expected: Response body is "Error, wrong token" (not the challenge)

4. **Facebook webhook posts**
   - Action: POST /webhook/ with body: {"entry": [{"messaging": [{"sender": {"id": "test123"}, "message": {"text": "guinness"}}]}]}
   - Expected: Status code 200

5. **Search is case-insensitive**
   - Action: POST /webhook/ with message "GUINNESS"
   - Expected: Matches products containing "guinness"

6. **Search strips punctuation**
   - Action: POST /webhook/ with message "guinness!"
   - Expected: Matches products containing "guinness"

7. **Search strips spaces**
   - Action: POST /webhook/ with message "guin ness"
   - Expected: Matches products containing "guinness"

8. **Duplicate products appear once**
   - Action: Search for a product with duplicates in the database
   - Expected: Only one result shown

9. **Unknown name returns error**
   - Action: POST /webhook/ with message "unknowndrinkxyz123"
   - Expected: Response is "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

10. **More than 20 matches**
    - Action: POST /webhook/ with message "beer"
    - Expected: Response contains weblink "www.vacfb.site/a?n=" plus original text

11. **Twenty or fewer matches**
    - Action: POST /webhook/ with message "Ægir"
    - Expected: Individual message per result with country when present

12. **Prefix stripping: hey, is**
    - Action: POST /webhook/ with message "hey, is guiness"
    - Expected: Search uses "guinness"

13. **Prefix stripping: is**
    - Action: POST /webhook/ with message "is guiness"
    - Expected: Search uses "guinness"

14. **Prefix stripping: are**
    - Action: POST /webhook/ with message "are guiness"
    - Expected: Search uses "guinness"

15. **Prefix stripping: what about**
    - Action: POST /webhook/ with message "what about guiness"
    - Expected: Search uses "guinness"

16. **Prefix stripping: vegan?**
    - Action: POST /webhook/ with message "guinness vegan?"
    - Expected: Search uses "guinness"

17. **Spelling fix: guiness**
    - Action: POST /webhook/ with message "guiness"
    - Expected: Search uses "guinness"

18. **Spelling fix: absolute vodka**
    - Action: POST /webhook/ with message "absolute vodka"
    - Expected: Search uses "absolut vodka"
