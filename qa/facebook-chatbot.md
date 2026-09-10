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
   - Action: POST /webhook/ with body: {"entry": [{"messaging": [{"sender": {"id": "test123"}, "message": {"text": "test"}}]}]}
   - Expected: Status code 200

5. **Search matches products case-insensitively**
   - Action: POST /webhook/ with message "ØRBAEK IPA"
   - Expected: Matches products containing "Ørbæk IPA"

6. **Search strips punctuation**
   - Action: POST /webhook/ with message "Ægir!"
   - Expected: Matches products containing "Ægir"

7. **Search strips spaces**
   - Action: POST /webhook/ with message "Y o r k"
   - Expected: Matches products containing "York"

8. **Duplicate products appear once**
   - Action: POST /webhook/ with message "Wynkoop Rocky Mountain Oyster Stout"
   - Expected: Only one result shown even though duplicates exist in database

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
    - Action: POST /webhook/ with message "hey, is Ørbæk"
    - Expected: Matches products containing "Ørbæk"

13. **Prefix stripping: Hey, is**
    - Action: POST /webhook/ with message "Hey, is Ørbæk"
    - Expected: Matches products containing "Ørbæk"

14. **Prefix stripping: hey is**
    - Action: POST /webhook/ with message "hey is Ørbæk"
    - Expected: Matches products containing "Ørbæk"

15. **Prefix stripping: Hey is**
    - Action: POST /webhook/ with message "Hey is Ørbæk"
    - Expected: Matches products containing "Ørbæk"

16. **Prefix stripping: is**
    - Action: POST /webhook/ with message "is Ørbæk"
    - Expected: Matches products containing "Ørbæk"

17. **Prefix stripping: Is**
    - Action: POST /webhook/ with message "Is Ørbæk"
    - Expected: Matches products containing "Ørbæk"

18. **Prefix stripping: IS**
    - Action: POST /webhook/ with message "IS Ørbæk"
    - Expected: Matches products containing "Ørbæk"

19. **Prefix stripping: Are**
    - Action: POST /webhook/ with message "Are Ørbæk"
    - Expected: Matches products containing "Ørbæk"

20. **Prefix stripping: are**
    - Action: POST /webhook/ with message "are Ørbæk"
    - Expected: Matches products containing "Ørbæk"

21. **Prefix stripping: ARE**
    - Action: POST /webhook/ with message "ARE Ørbæk"
    - Expected: Matches products containing "Ørbæk"

22. **Prefix stripping: what about**
    - Action: POST /webhook/ with message "what about Ørbæk"
    - Expected: Matches products containing "Ørbæk"

23. **Prefix stripping: vegan?**
    - Action: POST /webhook/ with message "Ørbæk vegan?"
    - Expected: Matches products containing "Ørbæk"

24. **Prefix stripping: Vegan?**
    - Action: POST /webhook/ with message "Ørbæk Vegan?"
    - Expected: Matches products containing "Ørbæk"

25. **Spelling fix: guiness**
    - Action: POST /webhook/ with message "guiness"
    - Expected: Search uses "guinness"

26. **Spelling fix: absolute vodka**
    - Action: POST /webhook/ with message "absolute vodka"
    - Expected: Search uses "absolut vodka"