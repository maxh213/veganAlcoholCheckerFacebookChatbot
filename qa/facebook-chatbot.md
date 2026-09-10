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
   - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"hey, is guinness"}}]}]}'`
   - Expected: Response contains `Guinness is not vegan.`

7. Test search normalization - "is " prefix:
   - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"is guinness"}}]}]}'`
   - Expected: Response contains `Guinness is not vegan.`

8. Test search normalization - "are " prefix:
   - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"are guinness vegan"}}]}]}'`
   - Expected: Response contains `Guinness is not vegan.`

9. Test search normalization - "what about " prefix:
   - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"what about guinness"}}]}]}'`
   - Expected: Response contains `Guinness is not vegan.`

10. Test search normalization - "vegan?" suffix:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"guinness vegan?"}}]}]}'`
    - Expected: Response contains `Guinness is not vegan.`

11. Test typo correction - guiness:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"guiness"}}]}]}'`
    - Expected: Response contains `Guinness is not vegan.`

12. Test typo correction - absolute vodka:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"absolute vodka"}}]}]}'`
    - Expected: Response contains `Absolut`

13. Test unknown name:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"nonexistentalcoholxyz"}}]}]}'`
    - Expected: Response is `Unfortunately I cannot find the name of the alcohol you specified in my database, apologies.`

14. Test duplicate deduplication:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"Wynkoop Rocky Mountain Oyster Stout"}}]}]}'`
    - Expected: Response contains `Wynkoop Rocky Mountain Oyster Stout is Not Vegan Friendly.`

15. Test response includes country:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"wynkoop"}}]}]}'`
    - Expected: Response contains `made in`

16. Test punctuation stripping:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"Ørbæk!"}}]}]}'`
    - Expected: Response contains `Ørbæk`

17. Test >20 matches trigger weblink:
    - Run `curl -X POST http://localhost:80/webhook/ -H "Content-Type: application/json" -d '{"entry":[{"messaging":[{"sender":{"id":"user123"},"message":{"text":"e"}}]}]}'`
    - Expected: Response contains `I know a lot of drinks with that name so I made a weblink for you www.vacfb.site/a?n=e`
