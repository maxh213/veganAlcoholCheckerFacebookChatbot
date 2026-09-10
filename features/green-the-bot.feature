Feature: Facebook chatbot vegan alcohol checker

  As a Facebook user
  I want to check if alcoholic drinks are vegan
  So that I can make informed choices

  Scenario: GET / returns health check
    When I GET /
    Then the response status is 200
    And the response body is "Vegan alcohol checker is up!"

  Scenario: GET /webhook/ with correct token returns challenge
    When I GET /webhook/?hub.verify_token=test-webhook-token&hub.challenge=test-challenge
    Then the response status is 200
    And the response body is "test-challenge"

  Scenario: GET /webhook/ with wrong token does not return challenge
    When I GET /webhook/?hub.verify_token=wrong-token&hub.challenge=test-challenge
    Then the response status is 200
    And the response body is not "test-challenge"

  Scenario: POST /webhook/ with Facebook envelope returns 200
    Given the request body is:
      """
      {
        "entry": [{
          "messaging": [{
            "sender": {"id": "user123"},
            "message": {"text": "test message"}
          }]
        }]
      }
      """
    When I POST /webhook/
    Then the response status is 200

  Scenario: Search is case-insensitive
    Given I send text "IS GUINNESS"
    When the bot processes the message
    Then it searches for "guinness" case-insensitively

  Scenario: Search strips punctuation and spaces
    Given I send text "guin ness!"
    When the bot processes the message
    Then it searches for "guinness" without punctuation or spaces

  Scenario: Duplicate products appear once
    Given loadedProducts contains records with same name, status, and country
    When I search for a matching product
    Then each duplicate combination appears only once in results

  Scenario: Unknown alcohol returns apology
    When I send "unicorn-beer"
    Then the response contains "Unfortunately I cannot find the name of the alcohol you specified in my database, apologies."

  Scenario: More than 20 matches return weblink
    Given search returns 25 matching products
    When I send text "a"
    Then the response contains "www.vacfb.site/a?n=" followed by the original message text

  Scenario: 20 or fewer matches return individual messages
    Given search returns 5 matching products
    When I send text "guinness"
    Then the bot sends 5 separate Facebook messages

  Scenario: Country appears when present
    Given a product has country "Denmark"
    When that product matches a search
    Then the response contains "made in Denmark"

  Scenario: Prefixes are stripped from queries
    When I send "hey, is guinness", "IS GUINNESS", "are guinness", or "what about guinness"
    Then the bot searches for "guinness"

  Scenario: Suffix vegan? is stripped
    When I send "guinness vegan?" or "guinness Vegan?"
    Then the bot searches for "guinness"

  Scenario: Guiness typo is corrected
    When I send "guiness" or "Guiness"
    Then the bot searches for "guinness"

  Scenario: Absolute vodka typo is corrected
    When I send "absolute vodka"
    Then the bot searches for "absolut vodka"
