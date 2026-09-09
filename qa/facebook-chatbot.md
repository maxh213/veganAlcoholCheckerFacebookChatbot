# QA Procedure for Facebook Chatbot

1. Start the server with `npm start` and verify it runs without errors.

2. Test health check:
   - Run `curl http://localhost:80/`
   - Expected: Response body is `Vegan alcohol checker is up!`

3. Test webhook verification with correct token:
   - Run `curl "http://localhost:80/webhook/?hub.verify_token=test-webhook-token&hub.challenge=12345"`
   - Expected: Response body is `12345`

4. Test webhook verification with wrong token:
   - Run `curl "http://localhost:80/webhook/?hub.verify_token=wrong&hub.challenge=12345"`
   - Expected: Response does NOT contain `12345`

5. Test POST webhook with Facebook envelope:
   - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"guinness"}}]}]}'`
   - Expected: HTTP status 200

6. Test search normalization - "hey, is " prefix:
   - Send message `hey, is guinness`
   - Expected: Response mentions Guinness

7. Test search normalization - "is " prefix:
   - Send message `is guinness`
   - Expected: Response mentions Guinness

8. Test search normalization - "are " prefix:
   - Send message `are guinness vegan`
   - Expected: Response mentions Guinness

9. Test search normalization - "what about " prefix:
   - Send message `what about guinness`
   - Expected: Response mentions Guinness

10. Test search normalization - "vegan?" suffix:
    - Send message `guinness vegan?`
    - Expected: Response mentions Guinness

11. Test typo correction - guiness:
    - Send message `guiness`
    - Expected: Response mentions Guinness

12. Test typo correction - absolute vodka:
    - Send message `absolute vodka`
    - Expected: Response mentions Absolut

13. Test unknown name:
    - Send message `nonexistentalcoholxyz`
    - Expected: Response is `Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.`

14. Test duplicate deduplication:
    - Send message `Wynkoop Rocky Mountain Oyster Stout`
    - Expected: One result for this product

15. Test response includes country:
    - Send message `guinness`
    - Expected: Each result message includes the country when present
