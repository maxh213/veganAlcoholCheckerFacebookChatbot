Feature: Vegan Alcohol Checker Facebook Chatbot

  Background:
    Given the app is running
    And secretConstants.js supplies WEBHOOK_TOKEN = "test-webhook-token" and FB_PAGE_TOKEN = "test-page-token" in test mode

  # --- GET / ---
  Scenario: Health check
    When a client sends GET /
    Then the response status is 200
    And the response body is exactly "Vegan alcohol checker is up!"

  # --- GET /webhook/ ---
  Scenario: Webhook verification with correct token triggers double-send bug returning HTTP 500
    When a client sends GET /webhook/?hub.verify_token=test-webhook-token&hub.challenge=abc123
    Then the response status is 500

  Scenario: Webhook verification fails with wrong token
    When a client sends GET /webhook/?hub.verify_token=wrong-token&hub.challenge=abc123
    Then the response status is 200
    And the response body is exactly "Error, wrong token"

  Scenario: Webhook verification fails with missing token
    When a client sends GET /webhook/?hub.challenge=abc123
    Then the response status is 200
    And the response body is exactly "Error, wrong token"

  Scenario: Webhook verification fails with missing challenge
    When a client sends GET /webhook/?hub.verify_token=wrong-token
    Then the response status is 200
    And the response body is exactly "Error, wrong token"

  # --- POST /webhook/ ---
  Scenario: Messenger event always returns HTTP 200
    When a client sends POST /webhook/ with body:
      """
      {
        "object": "page",
        "entry": [{
          "messaging": [{
            "sender": {"id": "USER_ID"},
            "message": {"text": "is guinness vegan?"}
          }]
        }]
      }
      """
    Then the response status is 200

  Scenario: POST /webhook/ with missing entry returns HTTP 500
    When a client sends POST /webhook/ with body:
      """
      {
        "object": "page",
        "entry": null
      }
      """
    Then the response status is 500

  Scenario: POST /webhook/ with empty entry array returns HTTP 500
    When a client sends POST /webhook/ with body:
      """
      {
        "object": "page",
        "entry": []
      }
      """
    Then the response status is 500

  Scenario: POST /webhook/ with empty messaging array returns 200
    When a client sends POST /webhook/ with body:
      """
      {
        "object": "page",
        "entry": [{
          "messaging": []
        }]
      }
      """
    Then the response status is 200

  Scenario: POST /webhook/ with no text field returns 200
    When a client sends POST /webhook/ with body:
      """
      {
        "object": "page",
        "entry": [{
          "messaging": [{
            "sender": {"id": "USER_ID"},
            "message": {"attachments": []}
          }]
        }]
      }
      """
    Then the response status is 200

  # --- Search normalization ---
  Scenario: Search is case-insensitive
    When searchForMatchingProducts is called with "GUINNESS"
    Then results include a product named "Guinness" or "guinness"

  Scenario: Search strips punctuation and spaces
    When searchForMatchingProducts is called with "guinness,draught"
    Then results include products whose normalised name contains "guinnessdraught"

  # --- Duplicate suppression ---
  Scenario: Products with same name, status and country appear once
    When searchForMatchingProducts is called with a term that matches two entries with identical product_name, status and country
    Then the result array contains that entry exactly once

  # --- No-match response ---
  Scenario: Unknown search term returns apology
    When searchForMatchingProducts is called with "zzzz-not-a-product"
    Then the result array has exactly one element
    And that element is "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

  # --- Over-20-match response ---
  Scenario: More than 20 matches sends one weblink message
    When a client sends POST /webhook/ with a text that yields more than 20 search results
    Then exactly one request is made to https://graph.facebook.com/v2.6/me/messages
    And the message text starts with "I know a lot of drinks with that name so I made a weblink for you "
    And the message text contains "www.vacfb.site/a?n="
    And the message text ends with the original raw message text

  # --- 20-or-fewer-match response ---
  Scenario: 20 or fewer matches sends one message per result
    When a client sends POST /webhook/ with a text that yields 1 to 20 search results
    Then one request is made to https://graph.facebook.com/v2.6/me/messages per result
    And each message body contains recipient.id equal to the sender id from the event
    And each message body contains message.text equal to the corresponding search result string

  # --- Prefix stripping ---
  Scenario: "hey, is " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "hey, is beer vegan?"
    Then the search term passed to searchForMatchingProducts is "beer vegan?"

  Scenario: "Hey, is " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "Hey, is wine vegan?"
    Then the search term passed to searchForMatchingProducts is "wine vegan?"

  Scenario: "hey is " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "hey is cider vegan?"
    Then the search term passed to searchForMatchingProducts is "cider vegan?"

  Scenario: "Hey is " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "Hey is lager vegan?"
    Then the search term passed to searchForMatchingProducts is "lager vegan?"

  Scenario: "is " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "is mead vegan?"
    Then the search term passed to searchForMatchingProducts is "mead vegan?"

  Scenario: "Is " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "Is mead vegan?"
    Then the search term passed to searchForMatchingProducts is "mead vegan?"

  Scenario: "IS " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "IS mead vegan?"
    Then the search term passed to searchForMatchingProducts is "mead vegan?"

  Scenario: "are " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "are there vegan wines?"
    Then the search term passed to searchForMatchingProducts is "there vegan wines?"

  Scenario: "Are " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "Are there vegan wines?"
    Then the search term passed to searchForMatchingProducts is "there vegan wines?"

  Scenario: "ARE " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "ARE there vegan wines?"
    Then the search term passed to searchForMatchingProducts is "there vegan wines?"

  Scenario: "what about " prefix is stripped
    When searchForMatchingProducts is called with the text derived from message "what about sake?"
    Then the search term passed to searchForMatchingProducts is "sake?"

  Scenario: "vegan?" suffix is stripped
    When searchForMatchingProducts is called with the text derived from message "is tequila vegan?"
    Then the search term passed to searchForMatchingProducts is "tequila "

  Scenario: "Vegan?" suffix is stripped
    When searchForMatchingProducts is called with the text derived from message "is tequila Vegan?"
    Then the search term passed to searchForMatchingProducts is "tequila "

  # --- Spell corrections ---
  Scenario: "guiness" is rewritten to "guinness" before search
    When searchForMatchingProducts is called with the text derived from message "is guiness vegan?"
    Then the search term passed to searchForMatchingProducts contains "guinness"

  Scenario: "Guiness" is rewritten to "guinness" before search
    When searchForMatchingProducts is called with the text derived from message "is Guiness vegan?"
    Then the search term passed to searchForMatchingProducts contains "guinness"

  Scenario: "absolute vodka" is rewritten to "absolut vodka" before search
    When searchForMatchingProducts is called with the text derived from message "is absolute vodka vegan?"
    Then the search term passed to searchForMatchingProducts contains "absolut vodka"
