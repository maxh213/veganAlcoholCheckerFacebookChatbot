VERDICT: BOUNCE

1. features/facebook-chatbot.feature: Multiple scenarios are not verifiable from the UI (cannot observe internal normalization or search inputs):
   - "Search is case-insensitive substring matching" - no observable endpoint, no concrete expected response
   - "Search strips punctuation and spaces" - no observable endpoint, no concrete expected response
   - "Duplicate products appear once" - no observable endpoint, "one result" is vague
   - "Unknown name returns apology message" - no observable endpoint
   - "More than 20 matches sends weblink" - no observable endpoint
   - "20 or fewer matches sends Facebook messages with country" - no observable endpoint
   - "Incoming text normalization strips..." (5 scenarios) - cannot observe "search receives" value
   - Typo correction scenarios (2) - cannot observe "search receives" value

   Fix: Replace non-observable scenarios with concrete POST /webhook/ calls showing expected Facebook response bodies.

2. features/facebook-chatbot.feature: Scenario "Webhook verification with correct token" uses "correct_token" as placeholder value, not the actual WEBHOOK_TOKEN from secretConstants.js.

   Fix: Use the actual token value that the code expects (test fallback from secretConstants.js).

3. qa/facebook-chatbot.md: Steps 6-15 have vague expected results like "Response mentions Guinness" instead of exact text.

   Fix: Replace with exact expected response strings matching the code output (e.g., "Guinness is not vegan. ")

4. QA steps 6-12, 14-15 use messages sent via what interface? Unclear how to "send message" without Facebook Messenger connection.

   Fix: Specify HTTP POST /webhook/ curl commands matching steps 5 format.
